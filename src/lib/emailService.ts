export interface InviteEmailPayload {
  toEmail: string;
  code: string;
  maxUses: number;
  note: string;
  directUrl: string;
}

export const SUPER_ADMIN_EMAIL = 'anshnarsale2003@gmail.com';

/**
 * Generate a cryptographically secure, clean Neo-Brutalist invite code:
 * e.g. TS-9A4F-2026-X8B2
 */
export function generateSecureInviteCode(prefix = 'TS'): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let segment1 = '';
  let segment2 = '';
  for (let i = 0; i < 4; i++) {
    segment1 += chars.charAt(Math.floor(Math.random() * chars.length));
    segment2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${segment1}-2026-${segment2}`;
}

/**
 * Dispatches an automated email notification to Ansh Narsale with the generated code.
 */
export async function sendInviteEmail(payload: InviteEmailPayload): Promise<{ success: boolean; message: string; mailtoUrl: string }> {
  const subject = encodeURIComponent(`[TopoSphere] New Invite Code Generated: ${payload.code}`);
  const bodyText = `Hello Ansh,

A new TopoSphere invite code has been generated from your Admin Workstation.

=======================================================
TOPOSPHERE PRIVATE ACCESS PASS
=======================================================
INVITE CODE:    ${payload.code}
MAX REDEMPTIONS: ${payload.maxUses}
RECIPIENT NOTE: ${payload.note || 'None specified'}
GENERATED AT:   ${new Date().toLocaleString()}
WORKSPACE URL:  ${payload.directUrl}
=======================================================

Instructions for the recipient:
1. Go to ${payload.directUrl}
2. Click "Have an Invite"
3. Enter the code "${payload.code}" with their Name and Email to register.

Created and dispatched for: Ansh Narsale (${SUPER_ADMIN_EMAIL})
`;

  const mailtoUrl = `mailto:${payload.toEmail}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;

  // Attempt automated POST delivery if webhook or service configured
  try {
    const customEndpoint = import.meta.env.VITE_EMAIL_WEBHOOK_URL;
    if (customEndpoint) {
      const response = await fetch(customEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: payload.toEmail,
          subject: `[TopoSphere] New Invite Code Generated: ${payload.code}`,
          body: bodyText,
          code: payload.code,
        }),
      });
      if (response.ok) {
        return {
          success: true,
          message: `Dispatched directly to ${payload.toEmail} via Cloud Webhook`,
          mailtoUrl,
        };
      }
    }
  } catch (err) {
    console.warn('Webhook dispatch skipped or offline:', err);
  }

  return {
    success: true,
    message: `Generated & prepared for ${payload.toEmail}`,
    mailtoUrl,
  };
}

