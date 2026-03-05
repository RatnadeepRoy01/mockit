// emailTemplates.ts

export function successEmailTemplate({
  paymentId,
  expiresAt,
}: {
  paymentId: string
  expiresAt: string
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#0f0f13;border-radius:16px;border:1px solid #1f1f2e;overflow:hidden;">

          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #1f1f2e;background:linear-gradient(135deg,#13101f,#0f0f13);">
              <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">mock</span>
              <span style="font-size:22px;font-weight:300;font-style:italic;color:#71717a;">It</span>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 40px 0;">
              <div style="width:52px;height:52px;background:linear-gradient(135deg,#7c3aed,#3b82f6);border-radius:14px;margin-bottom:24px;font-size:26px;line-height:52px;text-align:center;">🚀</div>
              <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">You're officially Pro.</h1>
              <p style="margin:0;font-size:15px;color:#71717a;line-height:1.7;">
                Your payment went through. 100 AI generation credits are loaded and ready. Let's build something great.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #1f1f2e;">
                <tr>
                  <td width="50%" style="padding:20px 24px;background:#18181b;border-right:1px solid #1f1f2e;">
                    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#52525b;">AI Credits</p>
                    <p style="margin:0;font-size:28px;font-weight:800;color:#ffffff;">100</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#7c3aed;">generations</p>
                  </td>
                  <td width="50%" style="padding:20px 24px;background:#18181b;">
                    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#52525b;">Valid Until</p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;">${expiresAt}</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#22c55e;">active now</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 40px 0;">
              <p style="margin:0 0 14px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#52525b;">What you unlocked</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:8px 0;"><table cellpadding="0" cellspacing="0"><tr><td style="width:32px;height:32px;background:#18181b;border-radius:8px;border:1px solid #1f1f2e;text-align:center;vertical-align:middle;font-size:14px;color:#7c3aed;">✦</td><td style="padding-left:12px;"><p style="margin:0;font-size:14px;font-weight:600;color:#e4e4e7;">Unlimited AI Generations</p><p style="margin:2px 0 0;font-size:12px;color:#52525b;">100 credits / month</p></td></tr></table></td></tr>
                <tr><td style="padding:8px 0;"><table cellpadding="0" cellspacing="0"><tr><td style="width:32px;height:32px;background:#18181b;border-radius:8px;border:1px solid #1f1f2e;text-align:center;vertical-align:middle;font-size:14px;color:#7c3aed;">⬡</td><td style="padding-left:12px;"><p style="margin:0;font-size:14px;font-weight:600;color:#e4e4e7;">Advanced Element Editor</p><p style="margin:2px 0 0;font-size:12px;color:#52525b;">Full design control</p></td></tr></table></td></tr>
                <tr><td style="padding:8px 0;"><table cellpadding="0" cellspacing="0"><tr><td style="width:32px;height:32px;background:#18181b;border-radius:8px;border:1px solid #1f1f2e;text-align:center;vertical-align:middle;font-size:14px;color:#7c3aed;">⌘</td><td style="padding-left:12px;"><p style="margin:0;font-size:14px;font-weight:600;color:#e4e4e7;">Export to React / Next.js</p><p style="margin:2px 0 0;font-size:12px;color:#52525b;">Production-ready code</p></td></tr></table></td></tr>
                <tr><td style="padding:8px 0;"><table cellpadding="0" cellspacing="0"><tr><td style="width:32px;height:32px;background:#18181b;border-radius:8px;border:1px solid #1f1f2e;text-align:center;vertical-align:middle;font-size:14px;color:#7c3aed;">◈</td><td style="padding-left:12px;"><p style="margin:0;font-size:14px;font-weight:600;color:#e4e4e7;">Custom Themes</p><p style="margin:2px 0 0;font-size:12px;color:#52525b;">Make it yours</p></td></tr></table></td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 40px 32px;">
              <a href="https://yourdomain.com/projects" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#3b82f6);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:0.2px;">
                Start creating →
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:10px;border:1px solid #1f1f2e;">
                <tr>
                  <td style="padding:14px 20px;">
                    <span style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#52525b;">Payment ID</span>
                    <p style="margin:4px 0 0;font-size:12px;font-family:monospace;color:#3f3f46;">${paymentId}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1f1f2e;">
              <p style="margin:0;font-size:12px;color:#3f3f46;">You can recharge anytime before or after expiry. Questions? Just reply to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function failedEmailTemplate({ paymentId }: { paymentId: string }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#0f0f13;border-radius:16px;border:1px solid #1f1f2e;overflow:hidden;">

          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #1f1f2e;">
              <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">mock</span>
              <span style="font-size:22px;font-weight:300;font-style:italic;color:#71717a;">It</span>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 40px 0;">
              <div style="width:52px;height:52px;background:#1c1014;border:1px solid #3f1f1f;border-radius:14px;margin-bottom:24px;font-size:26px;line-height:52px;text-align:center;color:#ef4444;">✗</div>
              <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Payment didn't go through.</h1>
              <p style="margin:0;font-size:15px;color:#71717a;line-height:1.7;">
                Something went wrong while processing your payment. Don't worry — you haven't been charged. Please try again below.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 40px 0;">
              <p style="margin:0 0 14px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#52525b;">Common reasons</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:12px;border:1px solid #1f1f2e;">
                <tr><td style="padding:12px 20px;border-bottom:1px solid #1f1f2e;"><p style="margin:0;font-size:13px;color:#71717a;">— Insufficient funds or card limit reached</p></td></tr>
                <tr><td style="padding:12px 20px;border-bottom:1px solid #1f1f2e;"><p style="margin:0;font-size:13px;color:#71717a;">— Card details entered incorrectly</p></td></tr>
                <tr><td style="padding:12px 20px;border-bottom:1px solid #1f1f2e;"><p style="margin:0;font-size:13px;color:#71717a;">— Bank declined the transaction</p></td></tr>
                <tr><td style="padding:12px 20px;"><p style="margin:0;font-size:13px;color:#71717a;">— Network timeout during payment</p></td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 40px 32px;">
              <a href="https://yourdomain.com/pricing" style="display:inline-block;background:#ef4444;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:0.2px;">
                Try again →
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:10px;border:1px solid #1f1f2e;">
                <tr>
                  <td style="padding:14px 20px;">
                    <span style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#52525b;">Payment ID</span>
                    <p style="margin:4px 0 0;font-size:12px;font-family:monospace;color:#3f3f46;">${paymentId}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1f1f2e;">
              <p style="margin:0;font-size:12px;color:#3f3f46;">If this keeps happening, reply to this email and we'll sort it out.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}