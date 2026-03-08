import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { layoutConfigPrompt, systemPrompt, addScreenPrompt } from './prompts.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let projectId: string | undefined
  let jobId: number | undefined
  let attempts = 0

  try {
    const body = await req.json()
    console.log(`[BODY] ${JSON.stringify(body)}`)

    // ── MODE 1: TRIGGER — queue a new job ──────────────────
    if (body.projectId && body.prompt) {
      projectId = body.projectId

      const { data: project } = await supabase
        .from('projects').select('content, processing, user_id').eq('id', projectId).single()

      if (project?.processing) {
        return new Response(
          JSON.stringify({ error: 'Project is already processing' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ✅ FIX 1: Select both 'credits' AND 'plan_expires_at'
      const { data: profile } = await supabase
        .from('profiles').select('credits, plan_expires_at').eq('id', project?.user_id).single()

      if (!profile) {
        return new Response(
          JSON.stringify({ error: 'Profile not found.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (profile.plan_expires_at < new Date().toISOString()) {
        return new Response(
          JSON.stringify({ error: 'Your plan has expired.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (profile.credits < 2) {
        return new Response(
          JSON.stringify({ error: 'Insufficient credits. You need at least 2 credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const type = (project?.content?.html?.length > 0) ? 'add_screen' : 'generate'

      const { data: job, error } = await supabase
        .from('generation_jobs')
        .insert({
          project_id: projectId,
          payload: { type, projectId, prompt: body.prompt, iteration: 0, screens: [] },
        })
        .select().single()

      if (error) throw new Error(`Failed to create job: ${error.message}`)

      await supabase.from('projects').update({
        processing: true,
        content: {
          ...(project?.content || {}),
          prompt: [
            ...(project?.content?.prompt || []),
            { role: 'user', text: body.prompt }
          ]
        }
      }).eq('id', projectId)
      console.log(`[TRIGGER] Job ${job.id} created type=${type}`)

      return new Response(
        JSON.stringify({ queued: true, job_id: job.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── MODE 2: WORKER — process a job ────────────────────
    if (!body.job_id) return new Response('no job_id', { status: 200 })

    jobId = body.job_id

    const { data: claimedJob, error: claimErr } = await supabase
      .rpc('claim_generation_job', { p_job_id: jobId })

    if (claimErr) throw new Error(`Claim error: ${claimErr.message}`)
    if (!claimedJob) return new Response('already claimed', { status: 200 })

    const { payload } = claimedJob
    attempts = claimedJob.attempts
    const { type, projectId: pid, prompt, iteration, screens } = payload
    projectId = pid

    console.log(`[WORKER] job=${jobId} type=${type} attempt=${attempts} iteration=${iteration} screens=${screens?.length}`)

    if (attempts >= 5) {
      await supabase.from('generation_jobs').delete().eq('id', jobId)
      await supabase.from('projects').update({ processing: false }).eq('id', projectId)
      return new Response('max attempts exceeded', { status: 200 })
    }

    // ── Fetch project ──────────────────────────────────────
    const { data: project, error: projectError } = await supabase
      .from('projects').select('*').eq('id', projectId).single()

    if (projectError || !project) throw new Error(`Project not found`)

    // ── Pick system prompt ─────────────────────────────────
    const currentScreen = screens[0] ?? null

    const systemMsg = type === 'fill_screen'
      ? systemPrompt
      : type === 'add_screen'
        ? addScreenPrompt
            .replace('projectVisualDesc', project.project_visual_des)
            .replace('existingScreenNames', project.content.html.map((s: any) => s.name).join(', '))
        : layoutConfigPrompt

    const userMsg = type === 'fill_screen' ? JSON.stringify(currentScreen) : prompt

    // ── Call AI ────────────────────────────────────────────
    const aiController = new AbortController()
    const aiTimeout = setTimeout(() => aiController.abort(), 120_000)

    let res: Response
    try {
      res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          max_tokens: 16000,
          messages: [
            { role: 'system', content: systemMsg.trim() },
            { role: 'user', content: userMsg },
          ],
          response_format: { type: 'json_object' },
        }),
        signal: aiController.signal,
      })
    } catch (err: any) {
      if (err.name === 'AbortError') throw new Error('AI request timed out after 120 seconds')
      throw err
    } finally {
      clearTimeout(aiTimeout)
    }

    if (!res.ok) throw new Error(`AI failed (${res.status}): ${await res.text()}`)

    const aiJson = await res.json()
    const content_raw = aiJson.choices?.[0]?.message?.content
    const finish_reason = aiJson.choices?.[0]?.finish_reason

    console.log(`[AI] model=${aiJson.model} finish=${finish_reason} tokens=${aiJson.usage?.completion_tokens}`)

    if (finish_reason === 'length') throw new Error('AI response truncated')
    if (!content_raw) throw new Error('Empty AI response')

    // ── Parse ──────────────────────────────────────────────
    let parsed: any
    try {
      parsed = JSON.parse(content_raw.replace(/```json|```/g, '').trim())
    } catch (e: any) {
      throw new Error(`JSON parse failed: ${e.message}`)
    }

    const { text, html, structure } = parsed

    // ── Update HTML ────────────────────────────────────────
    const content = project.content || { html: [], prompt: [] }
    let updatedHtml = content.html || []

    if (structure) {
      updatedHtml = [...updatedHtml, ...structure.screens.map((s: any) => ({ name: s.id, code: '' })) ]
    } else if (html && currentScreen) {

      const { data: Profile } = await supabase
        .from('profiles').select('credits').eq('id', project.user_id).single()

      if (!Profile) throw new Error('Profile not found during credit deduction')

      if (Profile.credits < 2) {
        throw new Error(`Insufficient credits. Need 2 but only have ${Profile.credits}.`)
      }
      updatedHtml = updatedHtml.map((item: any) =>
        item.name === currentScreen.id ? { ...item, code: html } : item
      )

      await supabase
        .from('profiles')
        .update({ credits: Profile.credits - 2 })
        .eq('id', project.user_id)
    }

    // ── Queue next iteration or finish ─────────────────────
    const nextScreens = [...(structure?.screens || []), ...screens.slice(1)]
    const shouldContinue = nextScreens.length > 0 && iteration < 4

    await supabase.from('projects').update({
      content: {
        ...content,
        html: updatedHtml,
        prompt: [
          ...(content.prompt || []),
          ...(text ? [{ role: 'ai', text }] : []),
        ],
      },
      ...(structure?.projectVisualDescription ? { project_visual_des: structure.projectVisualDescription } : {}),
      processing: shouldContinue,
    }).eq('id', projectId)

    await supabase.from('generation_jobs').delete().eq('id', jobId)

    if (shouldContinue) {
      const { error: nextErr } = await supabase.from('generation_jobs').insert({
        project_id: projectId,
        payload: { type: 'fill_screen', projectId, prompt: '', iteration: iteration + 1, screens: nextScreens },
      })
      if (nextErr) throw new Error(`Failed to insert next job: ${nextErr.message}`)
    }

    console.log(`[DONE] job=${jobId} iteration=${iteration} final=${!shouldContinue} ✓`)
    return new Response(
      JSON.stringify({ success: true, final: !shouldContinue }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error(`[ERROR] job=${jobId} project=${projectId} ${err.message}`)

    if (jobId) {
      if (attempts < 5) {
        await supabase.from('generation_jobs').update({
          status: 'pending',
          error: err.message,
          updated_at: new Date().toISOString(),
        }).eq('id', jobId)
      } else {
        await supabase.from('generation_jobs').delete().eq('id', jobId)
        if (projectId) await supabase.from('projects').update({ processing: false }).eq('id', projectId)
      }
    } else if (projectId) {
      await supabase.from('projects').update({ processing: false }).eq('id', projectId)
    }

    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})