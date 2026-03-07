import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { updateSystemPrompt } from './prompts.ts'

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
  let attempts: number = 0

  try {
    const body = await req.json()
    console.log(`[BODY] ${JSON.stringify(body)}`)
    
    if (body.projectId && body.prompt && body.screenId) {
      projectId = body.projectId
      console.log(`[TRIGGER] Update request projectId=${projectId} screenId=${body.screenId}`)

      const { data: job, error: insertError } = await supabase
        .from('generation_jobs')
        .insert({
          project_id: projectId,
          payload: {
            type: 'update',
            projectId,
            prompt: body.prompt,
            screenId: body.screenId,
          },
        })
        .select()
        .single()

      if (insertError) throw new Error(`Failed to create job: ${insertError.message}`)
      console.log(`[TRIGGER] Job created id=${job.id} — DB trigger firing worker now`)

      const { data: project } = await supabase
        .from('projects').select('content').eq('id', projectId).single()

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

      return new Response(
        JSON.stringify({ queued: true, job_id: job.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ──────────────────────────────────────────────────────
    // MODE 2: WORKER
    // Called by DB trigger with { job_id }
    // ──────────────────────────────────────────────────────
    if (!body.job_id) {
      console.warn(`[WORKER] No job_id in body`)
      return new Response('no job_id', { status: 200 })
    }

    jobId = body.job_id
    console.log(`[WORKER] Attempting to claim job_id=${jobId}`)

    // Atomically claim the job — prevents double processing
    const { data: claimedJob, error: claimErr } = await supabase
      .rpc('claim_generation_job', { p_job_id: jobId })

    if (claimErr) throw new Error(`Claim error: ${claimErr.message}`)
    if (!claimedJob) {
      console.warn(`[WORKER] Job ${jobId} already claimed or not pending — skipping`)
      return new Response('already claimed', { status: 200 })
    }

    const { payload } = claimedJob
    attempts = claimedJob.attempts
    const { projectId: pid, prompt, screenId } = payload
    projectId = pid

    console.log(`[WORKER] Claimed job_id=${jobId} attempt=${attempts} projectId=${projectId} screenId=${screenId}`)

    // Dead letter after 5 attempts — delete job and stop
    if (attempts > 5) {
      console.error(`[WORKER] Job ${jobId} exceeded max attempts — deleting`)
      await supabase.from('generation_jobs').delete().eq('id', jobId)
      await supabase.from('projects').update({ processing: false }).eq('id', projectId)
      return new Response('max attempts exceeded', { status: 200 })
    }

    // ── Fetch project ──────────────────────────────────────
    const { data: project, error: projectError } = await supabase
      .from('projects').select('*').eq('id', projectId).single()

    if (projectError || !project) throw new Error(`Project not found: ${projectError?.message}`)
    console.log(`[DB] Project found: ${project.id}`)

    // ── Get existing screen code ───────────────────────────
    const content = project.content || { html: [], prompt: [] }
    const existingScreen = (content.html || []).find((s: any) => s.name === screenId)

    if (!existingScreen) throw new Error(`Screen '${screenId}' not found in project content`)
    console.log(`[SCREEN] Found screen=${screenId} code length=${existingScreen.code?.length ?? 0}`)

    // ── Single AI Call ─────────────────────────────────────
    const aiStart = Date.now()
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
          model: 'llama-3.3-70b-versatile',
          max_tokens: 16000,
          messages: [
            {
              role: 'system',
              content: updateSystemPrompt.trim(),
            },
            {
              role: 'user',
              content: JSON.stringify({
                currentCode: existingScreen.code,
                updateRequest: prompt,
              }),
            },
          ],
          response_format: { type: 'json_object' },
        }),
        signal: aiController.signal,
      })
    } catch (fetchErr: any) {
      if (fetchErr.name === 'AbortError') {
        throw new Error(`AI request timed out after 120 seconds`)
      }
      throw fetchErr
    } finally {
      clearTimeout(aiTimeout)
    }

    console.log(`[AI] ${Date.now() - aiStart}ms status=${res.status}`)
    if (!res.ok) throw new Error(`AI failed (${res.status}): ${await res.text()}`)

    const aiJson = await res.json()
    const content_raw = aiJson.choices?.[0]?.message?.content
    const finish_reason = aiJson.choices?.[0]?.finish_reason

    console.log(`[AI] model=${aiJson.model} finish_reason=${finish_reason} prompt_tokens=${aiJson.usage?.prompt_tokens} completion_tokens=${aiJson.usage?.completion_tokens}`)
    console.log(`[AI] Raw (first 300): ${content_raw?.slice(0, 300)}`)

    if (finish_reason === 'length') throw new Error('AI response truncated — model hit token limit')
    if (!content_raw) throw new Error('Empty AI response')

    // ── Parse ──────────────────────────────────────────────
    let parsed: any
    try {
      parsed = JSON.parse(
        content_raw
          .replace(/```json|```/g, '')  // strip markdown code fences
          .replace(/"""/g, '"')          // fallback: collapse triple quotes
          .trim()
      )
    } catch (e: any) {
      console.error(`[PARSE] Failed. Raw: ${content_raw.slice(0, 500)}`)
      throw new Error(`JSON parse failed: ${e.message}`)
    }

    const { html, text } = parsed
    if (!html) throw new Error('AI response missing html field')
    console.log(`[PARSE] Updated html length=${html.length}`)

    // ── Update screen code in project ──────────────────────
    const updatedHtml = (content.html || []).map((item: any) =>
      item.name === screenId ? { ...item, code: html } : item
    )

    await supabase.from('projects').update({
      content: {
        ...content,
        html: updatedHtml,
        prompt: [
          ...(content.prompt || []),
          ...(text ? [{ role: 'ai', text }] : []),
        ],
      },
      processing: false,
    }).eq('id', projectId)
    console.log(`[DB] Project updated screen=${screenId}`)

    // ── Delete job ─────────────────────────────────────────
    await supabase.from('generation_jobs').delete().eq('id', jobId)
    console.log(`[WORKER] Job ${jobId} deleted`)

    console.log(`[DONE] job_id=${jobId} screenId=${screenId} ✓`)
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error(`[ERROR] job_id=${jobId} projectId=${projectId} message=${err.message}`)
    console.error(`[ERROR] stack=${err.stack}`)

    if (jobId) {
      if (attempts < 5) {
        await supabase.from('generation_jobs').update({
          status: 'pending',
          error: err.message,
          updated_at: new Date().toISOString(),
        }).eq('id', jobId)
        console.log(`[ERROR] Job ${jobId} reset to pending — will retry (attempt ${attempts}/5)`)
      } else {
        await supabase.from('generation_jobs').delete().eq('id', jobId)
        console.log(`[ERROR] Job ${jobId} deleted after max attempts`)
        if (projectId) await supabase.from('projects').update({ processing: false }).eq('id', projectId)
      }
    } else if (projectId) {
      await supabase.from('projects').update({ processing: false }).eq('id', projectId)
    }

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})