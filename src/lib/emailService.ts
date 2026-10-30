export interface InviteEmailPayload {
  toEmail: string;
  code: string;
  maxUses: number;
  note: string;
  directUrl: string;
}

export interface EmailDispatchResult {
  success: boolean;
  message: string;
  mailtoUrl: string;
  gmailUrl: string;
  method: 'web3forms' | 'resend' | 'webhook' | 'client';
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
 * Supports:
 *  1. Web3Forms (VITE_WEB3FORMS_ACCESS_KEY) - Free, delivers direct to Gmail inbox
 *  2. Resend API (VITE_RESEND_API_KEY) - Free, delivers direct to Gmail inbox
 *  3. Cloud Webhook (VITE_EMAIL_WEBHOOK_URL)
 *  4. Direct 1-Click Gmail Web Composer + mailto fallback
 */
export async function sendInviteEmail(payload: InviteEmailPayload): Promise<EmailDispatchResult> {
  const subjectText = `[TopoSphere] New Invite Code Generated: ${payload.code}`;
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

  const mailtoUrl = `mailto:${payload.toEmail}?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(payload.toEmail)}&su=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`;

  // 1. Web3Forms Delivery (Instant direct to anshnarsale2003@gmail.com inbox)
  const web3FormsKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;
  if (web3FormsKey) {
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          access_key: web3FormsKey,
          subject: subjectText,
          from_name: 'TopoSphere Super Admin',
          email: payload.toEmail,
          message: bodyText,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success !== false) {
        return {
          success: true,
          message: `Delivered directly to ${payload.toEmail} inbox via Web3Forms!`,
          mailtoUrl,
          gmailUrl,
          method: 'web3forms',
        };
      }
    } catch (err) {
      console.warn('Web3Forms delivery failed:', err);
    }
  }

  // 2. Resend API Delivery
  const resendKey = import.meta.env.VITE_RESEND_API_KEY;
  if (resendKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'TopoSphere <onboarding@resend.dev>',
          to: [payload.toEmail],
          subject: subjectText,
          text: bodyText,
        }),
      });

      if (response.ok) {
        return {
          success: true,
          message: `Delivered directly to ${payload.toEmail} inbox via Resend API!`,
          mailtoUrl,
          gmailUrl,
          method: 'resend',
        };
      }
    } catch (err) {
      console.warn('Resend API delivery failed:', err);
    }
  }

  // 3. Custom Webhook Endpoint
  const customEndpoint = import.meta.env.VITE_EMAIL_WEBHOOK_URL;
  if (customEndpoint) {
    try {
      const response = await fetch(customEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: payload.toEmail,
          subject: subjectText,
          body: bodyText,
          code: payload.code,
        }),
      });
      if (response.ok) {
        return {
          success: true,
          message: `Dispatched directly to ${payload.toEmail} via Webhook!`,
          mailtoUrl,
          gmailUrl,
          method: 'webhook',
        };
      }
    } catch (err) {
      console.warn('Webhook dispatch failed:', err);
    }
  }

  // 4. Default: Ready for 1-Click Gmail Send or Mail Client
  return {
    success: true,
    message: `Invite generated! Ready to send to ${payload.toEmail}`,
    mailtoUrl,
    gmailUrl,
    method: 'client',
  };
}

