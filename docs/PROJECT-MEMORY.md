# Bunny Mission project memory

Bunny Mission is a private invitation site with server-side unlock, animated Nibbles, recorded dialogue, and optional outing and date planning. The active integration branch uses the Next.js App Router with React and exports the client-side guest flow as static files; protected operations remain in Netlify Functions. The V1 page and media remain available as a rollback snapshot. A No reply submits decision=no and must notify Alex.

- Product name: Bunny Mission. Invitation wording may still mention Alex.
- Develop is integration; main is production. Do not promote the Next.js migration without an explicit release request.
- The pre-migration page is preserved at public/version-1.html; archived V1 and V2 resources remain under public/resources.
- Netlify publishes the Next.js static export from `out/`; `NETLIFY_NEXT_PLUGIN_SKIP=true` keeps the runtime adapter from taking over the static root.
- Netlify form declarations are preserved in public/__forms.html for framework form detection.
- Keep passwords, credentials, tokens, private invitation data, and notification addresses out of Git, logs, and public assets; preserve server-side authentication.
- Approved Nibbles art only; no personal photos or face.
- Zero added spend: no paid generation, credit purchases, GPU/API billing, hosting upgrade, or overage. Qwen3-TTS remains approved for future media work only when requested.
- Graphify is local tooling and stays out of the deployed app.
- Update Nibbles narration directly in the existing invitation app. The owner
  explicitly rejected a separate comparison interface or additional voice UI.
- Narration should be a soft female child character voice with gentle emotion.
  Keep the existing bunny animation and speech windows; original media remains
  available for rollback. See `docs/QWEN-VOICE-TRIAL.md`.
- Mobile audio: if a browser blocks audible autoplay, the clip pauses at the
  opening frame until the first touch or key starts it with sound. Later
  touches never restart clips; there is no replay control.
- The owner explicitly wants Bunny Studio on `develop` and `main` to share the
  same invitations and settings store. Keep the existing shared owner store;
  do not split production data from develop data.
- Main currently lacks the `BUNNY_STUDIO_MEPLUS_AUTH` production environment
  value, so owner sign-in returns 503 there. The existing secret is scoped to
  the `develop` branch; preserve it in Netlify and enable that same value in
  production only after the owner confirms the production context change.
- New guest replies use a separate `bunny-mission-replies` Netlify form and a
  `formSubmitted` function to send designed Yes/No messages through Resend.
  The legacy `going-out-develop` form remains for historical submissions.
  Resend delivery needs `RESEND_API_KEY` and `RESEND_FROM_EMAIL` as Netlify
  runtime variables on each deploy context. Do not store secrets in Git or
  enable paid plans/overages; see `docs/RESEND-EMAIL-SETUP.md`.
- Bunny Studio UI changes must preserve its current workflow and shared owner
  data. Keep improvements responsive and align admin headings, form controls,
  and actions without adding another dashboard or changing invitation logic.


Resume from root AGENTS, current handoff, relevant manifests, and tests. Do not claim unobserved media, browser, or deployment checks.
