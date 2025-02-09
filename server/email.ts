import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendFamilyInviteEmail(
  inviteEmail: string,
  familyName: string,
  inviteToken: string
): Promise<boolean> {
  const appUrl = process.env.APP_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  const inviteUrl = `${appUrl}/auth?invite=${inviteToken}`;

  try {
    await mailService.send({
      to: inviteEmail,
      from: 'noreply@familyactivity.com',
      subject: `You've been invited to join ${familyName}`,
      html: `
        <h2>Family Activity Manager Invitation</h2>
        <p>You've been invited to join the family "${familyName}" on Family Activity Manager.</p>
        <p>Click the link below to accept the invitation:</p>
        <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#0070f3;color:white;text-decoration:none;border-radius:5px;">
          Accept Invitation
        </a>
        <p>If you can't click the button, copy and paste this URL into your browser:</p>
        <p>${inviteUrl}</p>
      `,
    });
    return true;
  } catch (error) {
    console.error('Failed to send invite email:', error);
    return false;
  }
}
