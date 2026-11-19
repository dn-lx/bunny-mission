# Bunny Mission 🐰

Bunny Mission is a private, mobile-friendly invitation for Alex and a guest. The guest enters an invitation code, answers a short Yes/No question, chooses “Something simple” or “Surprise me,” answers any owner-configured follow-up questions, and can select an available day and time.

## Current product and branches

- GitHub source: https://github.com/dn-lx/bunny-mission.
- `develop` is the active testing branch. `main` is production and requires an explicit release request.
- The product is named **Bunny Mission**. The invitation copy may still ask, “Would you like to go out with Alex?”
- Netlify uses a site slug independent of the GitHub repository name. Existing repository notes contain the legacy `go-out-with-alex` slug; confirm the current project and deploy URL in Netlify before sharing a link.
- The V1 update simplifies pages and reply handling only. Existing Nibbles media is unchanged; no flower-offer clip is included.

## V1 guest flow

1. **Welcome and code entry:** one screen shows “A little surprise for you” with the invitation-code field and unlock action. Invalid codes can be corrected without starting the invitation again. Fullscreen is requested after an eligible user action; there is no separate fullscreen continuation page.
2. **Invitation:** after code verification, show the guest’s name and the personalized invitation question with clear Yes and No choices. The playful No button dodges up to three times, then remains selectable. Keyboard and reduced-motion use stay accessible.
3. **Outing choice:** show only “Something simple” and “Surprise me.” Insert optional questions configured by Alex only when they exist; skip empty question steps.
4. **Calendar:** dates and Morning, Afternoon, and Evening begin unavailable. Guests can select only a time Alex has opened. They can send an available selection with “Send my choices to Alex” or choose “Choose a day together later.”
5. **Replies:** a Yes reply is sent when the guest submits the calendar step. A No reply submits `decision=no` when the decline is accepted. Both use the existing `going-out-develop` Netlify Form and its owner notification. Failed submissions can be retried.

## Email and privacy

The `going-out-develop` form notification must be configured in Netlify for Alex. Keep the notification address, invitation codes, credentials, and other private details out of Git. Do not put a raw invitation password in `lib/invites.cjs` or public files; store only its supported hash entry.

## Netlify deployment

- The build publishes `public`; serverless functions come from `netlify/functions`, as declared in `netlify.toml`.
- Keep `develop` as the preview branch and `main` as production. Verify the actual branch deployment is Ready in Netlify before calling it live.
- Use the existing Netlify project connection and check its current site slug; renaming the GitHub repository does not automatically rename the Netlify site.
- Do not use a static-only drag-and-drop of `public`; it would omit the password function.

## Customize invitations

Edit `lib/invites.cjs` to replace the temporary guest and invitation entry. To generate a new private code on a trusted machine, run:

```bash
node scripts/new-invite.cjs invite-2 "Guest name"
```

Add only the generated hash entry to `lib/invites.cjs`; never commit or paste the raw code into GitHub. Give each guest a unique invitation ID, name, and hash.

## Checks and project notes

Run `npm test` for the unlock and UI contract checks. Real-device speech, fullscreen, keyboard behavior, and Netlify form delivery require separate browser/deploy verification.

- Current V1 state: `docs/CURRENT-HANDOFF.md`.
- V2 remains paused for planning: `docs/VERSION-2-PLAN.md`.
- The guest-facing page script is in `QUIZ-SCRIPT.md`.