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


Resume from root AGENTS, current handoff, relevant manifests, and tests. Do not claim unobserved media, browser, or deployment checks.
