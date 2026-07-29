import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'invite@relateflows.com';

let resend = null;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
}

export async function sendInviteEmail({ name, email, invitedByName, companyName }) {
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping email send');
    return;
  }
  // Dev mode: override recipient to your own email (Resend sandbox limitation)
  const devTo = process.env.DEV_EMAIL_TO;
  const to = (process.env.NODE_ENV === 'development' && devTo) ? devTo : email;
  if (to !== email) {
    console.log(`[Dev] Override recipient: original=${email} → actual=${to}`);
  }
  try {
    const appUrl = process.env.APP_URL || 'http://localhost:8080';
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `${invitedByName} invited you to ${companyName}`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#4f46e5">You've been invited!</h2>
        <p style="color:#374151;font-size:14px;line-height:1.6">
          <strong>${invitedByName}</strong> has invited you to join <strong>${companyName}</strong> on RelateFlows.
        </p>
        <p style="color:#374151;font-size:14px;line-height:1.6">
          Click the button below to sign in with your Google account and get started.
        </p>
        <a href="${appUrl}/login"
           style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 28px;border-radius:12px;text-decoration:none;font-size:14px;font-weight:600;margin:16px 0">
          Accept Invitation
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          If you weren't expecting this invitation, you can ignore this email.
        </p>
      </div>`,
    });
    console.log(`Invite email sent to ${email}`);
  } catch (err) {
    console.error('Failed to send invite email:', err.message);
  }
}
