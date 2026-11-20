# Bunny Mission Resend email

New guest replies are still captured by Netlify Forms under
`bunny-mission-replies`. A Netlify `formSubmitted` event sends the matching
reply to Resend, which renders the designed HTML and plain-text email. The old
`going-out-develop` form and its notification are retained for historical
submissions; new responses use the new form name so they do not inherit that
plain-text notification. A registered `email_kind` marker scopes the event
handler to this form without depending on Netlify's internal form-name field.

## Configure delivery

1. In Resend, add a domain you control and publish the DNS records Resend
   provides. Wait for the domain to show as verified.
2. Create an API key with email sending access. Keep the key private.
3. In the Bunny Mission Netlify site, add these runtime environment variables
   for both the `develop` branch deploy and production when each should send
   email:
   - `RESEND_API_KEY`: the secret API key.
   - `RESEND_FROM_EMAIL`: a sender on the verified domain, for example
     `Bunny Mission <hello@mail.example.com>`.
   - `BUNNY_MISSION_EMAIL_TO` (optional): override the default owner inbox.
4. Redeploy each branch after changing its environment variables.

Do not paste API keys into chat, commit them, or place them in public build-time
variables. Resend's free transactional tier currently lists 3,000 emails per
month and 100 per day. Keep the account on the free tier and do not enable a
paid plan or paid overages. Limits and pricing can change; check Resend's
current pricing before configuring billing.

Until the API key and verified sender are configured, Netlify still records
guest submissions, but the Resend email is not sent. The event handler writes
only non-sensitive configuration/status details to logs; it does not log the
guest's answers or API key. Resend idempotency keys are derived from the
submission request ID to avoid duplicate messages on retries.

## Email content

The email clearly presents the guest's Yes/No decision. Yes replies include
the selected plan, date/time, any optional answers, and invitation reference.
No replies include the decline and invitation reference without blank outing
fields. All guest-provided values are HTML-escaped before insertion.

## Admin dashboard adjustments

Bunny Studio's existing dashboard now uses consistent button sizing, clearer
spacing, aligned section headings and actions, improved availability rows,
and responsive full-width actions on small screens. Both story save buttons
have the same label and action; no settings or invitation workflow behavior
changed.
