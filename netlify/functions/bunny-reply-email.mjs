const FORM_NAME = 'bunny-mission-replies';
const OWNER_EMAIL = 'don.alex.perera@gmail.com';

const clean = value => typeof value === 'string' ? value.trim().slice(0, 4000) : '';
const escapeHtml = value => clean(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

function detailsRow(label, value) {
  if (!value) return '';
  return `<tr><td style="padding:12px 0;border-bottom:1px solid #f2e5e8;color:#806d72;font-size:13px;width:100px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:12px 0;border-bottom:1px solid #f2e5e8;color:#382c34;font-size:15px;line-height:1.5;vertical-align:top">${escapeHtml(value).replace(/\n/g, '<br>')}</td></tr>`;
}

function emailContent(data) {
  const decision = clean(data.decision).toLowerCase() === 'yes' ? 'yes' : 'no';
  const guest = clean(data.guest).replace(/[\r\n]+/g, ' ').trim() || 'Your guest';
  const invitation = clean(data.invite) || 'Invitation';
  const subject = decision === 'yes'
    ? `💖 ${guest} said yes to Bunny Mission`
    : `💌 ${guest} replied to Bunny Mission`;
  const headline = decision === 'yes' ? `${guest} said yes!` : `${guest} kindly declined.`;
  const intro = decision === 'yes'
    ? 'A lovely little update has arrived.'
    : 'You received a reply to your invitation.';
  const rows = [
    detailsRow('Decision', decision === 'yes' ? 'Yes 💖' : 'No 💌'),
    detailsRow('Plan', clean(data.outing)),
    detailsRow('When', clean(data.when)),
    detailsRow('More choices', clean(data.extra_answers)),
    detailsRow('Invitation', invitation)
  ].join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"></head><body style="margin:0;background:#fff7f4;font-family:Arial,Helvetica,sans-serif;color:#382c34"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(intro)} — Bunny Mission</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff7f4;padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#fff;border:1px solid #f1e4e5;border-radius:22px;overflow:hidden"><tr><td style="padding:25px 30px;background:linear-gradient(135deg,#fff0e8,#fde7ec)"><div style="font-size:13px;font-weight:bold;letter-spacing:2px;color:#943f58">🐰 BUNNY MISSION</div><h1 style="margin:18px 0 8px;font-family:Georgia,serif;font-size:29px;line-height:1.2;color:#402a32">${escapeHtml(headline)}</h1><p style="margin:0;color:#775e65;font-size:15px;line-height:1.6">${escapeHtml(intro)}</p></td></tr><tr><td style="padding:20px 30px 28px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table><p style="margin:22px 0 0;color:#9b858b;font-size:12px;line-height:1.5">Sent with a little care from Bunny Mission.</p></td></tr></table></td></tr></table></body></html>`;
  const text = [
    '🐰 BUNNY MISSION',
    '',
    headline,
    intro,
    '',
    `Decision: ${decision === 'yes' ? 'Yes 💖' : 'No 💌'}`,
    ...(clean(data.outing) ? [`Plan: ${clean(data.outing)}`] : []),
    ...(clean(data.when) ? [`When: ${clean(data.when)}`] : []),
    ...(clean(data.extra_answers) ? ['', 'More choices:', clean(data.extra_answers)] : []),
    `Invitation: ${invitation}`,
    '',
    'Sent with a little care from Bunny Mission.'
  ].join('\n');
  return { decision, guest, subject, html, text };
}

export default {
  async formSubmitted(event) {
    const data = event?.data || {};
    if (data['form-name'] !== FORM_NAME) return;

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) {
      console.error('Bunny Mission email not sent: configure RESEND_API_KEY and RESEND_FROM_EMAIL.');
      return;
    }

    const email = emailContent(data);
    const requestId = clean(data.request_id);
    const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    if (/^[a-f0-9-]{36}$/i.test(requestId)) headers['Idempotency-Key'] = `bunny-mission-${requestId}`;

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          from,
          to: [process.env.BUNNY_MISSION_EMAIL_TO || OWNER_EMAIL],
          subject: email.subject,
          html: email.html,
          text: email.text
        })
      });
      if (!response.ok) console.error(`Bunny Mission Resend delivery failed with status ${response.status}.`);
    } catch (error) {
      console.error('Bunny Mission Resend request failed:', error?.name || 'unknown error');
    }
  }
};
