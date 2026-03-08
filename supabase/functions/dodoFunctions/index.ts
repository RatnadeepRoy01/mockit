import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DodoPayments } from 'https://esm.sh/dodopayments@2.20.0'
import { successEmailTemplate, failedEmailTemplate } from './emailTemplates.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const dodo = new DodoPayments({
    bearerToken: Deno.env.get("DODO_PAYMENTS_SECRET_KEY") || "",
    webhookKey: Deno.env.get('DODO_PAYMENTS_WEBHOOK_KEY') || '',
  })

  const body = await req.text()
  const headers = Object.fromEntries(req.headers.entries())

  try {
    const event = dodo.webhooks.unwrap(body, { headers })
    console.log('Received event:', event.type)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (event.type === 'payment.succeeded') {
      const payment = event.data
      const userId = payment.metadata?.user_id

      if (!userId) {
        console.error('No user_id in payment metadata')
        return new Response(JSON.stringify({ error: 'Missing user_id in metadata' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      const now = new Date()
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      const expiresAtFormatted = expiresAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single()

      const currentCredits = profile?.credits || 0
      const newCredits = currentCredits + 100

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          plan: 'pro',
          credits: newCredits,
          plan_activated_at: now.toISOString(),
          plan_expires_at: expiresAt.toISOString(),
        })
        .eq('id', userId)

      if (updateError) throw updateError

      console.log(`User ${userId} upgraded to pro, expires at ${expiresAt.toISOString()}`)

      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      const email = payment.customer?.email

      if (resendApiKey && email) {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'mockIt <onboarding@resend.dev>',
            to: [email],
            subject: 'Pro Plan Activated! 🚀',
            html: successEmailTemplate({
              paymentId: payment.payment_id,
              expiresAt: expiresAtFormatted,
            }),
          }),
        })

        if (!emailRes.ok) {
          console.error('Failed to send success email:', await emailRes.text())
        }
      }
    }

    if (event.type === 'payment.failed') {
      const payment = event.data
      const userId = payment.metadata?.user_id

      console.warn(`Payment failed for user ${userId}, payment ${payment.payment_id}`)

      // No DB update needed — plan stays as is

      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      const email = payment.customer?.email

      if (resendApiKey && email) {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'mockIt <onboarding@resend.dev>',
            to: [email],
            subject: 'Payment Failed ❌',
            html: failedEmailTemplate({
              paymentId: payment.payment_id,
            }),
          }),
        })

        if (!emailRes.ok) {
          console.error('Failed to send failure email:', await emailRes.text())
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    console.error('Webhook error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    }) 
  }
})