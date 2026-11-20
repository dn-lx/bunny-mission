# Bunny Mission current handoff

## Female child narration in the existing app (20 November 2026)

The owner explicitly rejected the added voice comparison interface and asked
for a softer female child voice directly in the existing app. The comparison
page and two review samples were removed; its old URL redirects to the app.
There are no additional voice selection controls or guest pages.

All nine standard scenes now use a single new Qwen VoiceDesign recording with
explicit soft female child character direction and gentle expression. The
manifest selects `-girl.mp4` files; animation packets and speech windows are
retained. Source audio and timing metadata are stored for reproduction.
Original Flow and the previously accepted Qwen files remain available for
internal rollback. Custom edited questions retain their device-speech fallback.

Work is restricted to develop. Invitation data and owner settings are unchanged.
See `docs/QWEN-VOICE-TRIAL.md` for media details and verification commands.

## Next.js migration on develop

The active guest route on develop is a Next.js App Router app using React 19.3.1 and Next.js 16.4.6. The migration preserves the existing V1 page flow, Flow video files, unlock function, owner dashboard, and Netlify response form.

- The new root route is in app/page.jsx and app/invitation.jsx.
- public/index.html was removed from the deploy root so Netlify cannot serve the old static page in place of the Next.js route.
- The complete former root page is preserved at public/version-1.html. Archived V1 and V2 resources remain unchanged.
- public/__forms.html is the static form blueprint for Netlify's form detection. The guest page sends URL-encoded AJAX submissions to /__forms.html for the going-out-develop form.
- Invitation codes are still verified by /.netlify/functions/unlock. The Yes flow fetches the current public availability again immediately before sending.
- Bunny Studio stays at /admin.html. The existing owner and unlock functions remain under netlify/functions.
- The guest page uses a static Next.js export. `next.config.mjs` sets `output: "export"`; `npm run build` writes the site to `out/`, which Netlify publishes.
- `NETLIFY_NEXT_PLUGIN_SKIP=true` prevents a server runtime from intercepting the static root route. Password checks and owner actions continue through the existing Netlify Functions.
- The first Netlify Next deploy was marked ready but both the branch alias and deploy URL returned Netlify's generic 404. Its deploy summary showed no Next server handler and no root page. The app does not need SSR, so the root now ships as a static export while the protected functions remain separate.

The Next.js migration is committed to develop only; main remains on the pre-migration app. Netlify's develop root now loads the invitation code screen in the browser. No real invitation code or guest reply was submitted.

## Version 1 page behavior

Bunny Mission uses the nine native Google Flow Nibbles clips in public/video/flow/manifest.json. Each clip keeps Flow's gentle voice and mouth movement together in its MP4. The media remains unchanged.

The welcome/code screen uses “A little surprise for you.” and stays on the same screen after an invalid code. The question screen uses the guest name and the personalized Yes/No invitation. The playful No button moves up to three times. Keyboard and reduced-motion users can select immediately.

The Yes path offers “Something simple” and “Surprise me,” followed by optional admin-enabled questions and the calendar. Dates are closed by default; Alex opens each date by selecting Morning, Afternoon, and/or Evening. Guests can submit an open date and time or choose to decide on a day together later. A fresh unlock request checks the selected time before the Netlify form submission. The existing Flow media is unchanged.

A No reply submits decision=no to the existing going-out-develop Netlify form and shows “No worries at all.” only after the reply succeeds. Both Yes and No use the configured owner notification. No flower scene or clip was added.

## Bunny Studio on develop

The owner signs in with the existing Me+ account. The Netlify Functions environment needs the develop-only secret BUNNY_STUDIO_MEPLUS_AUTH with url, key (the publishable key), uid (the approved owner) and sessionSecret (32 random bytes as hex). Keep the values in Netlify.

Under Personal invitations, edit the name and leave the guest password blank to keep it. The invitation and story editor saves a shared workflow for all invitations. You can reorder or skip the outing preference and optional custom questions before the calendar. The activity follow-up requires the activity first. New guest sessions obtain this configuration after the invitation password is verified. Existing settings are read from the prior record until the first save. Custom questions use device speech unless a matching recording is available for that scene.

## Version 1 restored; version 2 paused

At the owner's request, version 1 is active again. The early preview script sets media version 1 and changes legacy ?version=2 links to ?version=1 while preserving other invitation parameters and the hash. Native Flow videos and existing application/owner behavior remain in place. No backend or invitation data rollback was performed.

All V1 archived resources and V2 draft assets remain untouched. The revised greeting/detail integration is preserved as a patch, and the unverified local Qwen CPU generator as a draft, in docs/v2-drafts. There are no completed LongCat videos or verified new child-voice recordings. Existing V2 audio was rejected as too adult. The latest LongCat retry reported exhausted ZeroGPU allowance (480 seconds requested, -240 remaining). Media work is paused; do not resume generation without a new request.

The execution plan and acceptance criteria are in docs/VERSION-2-PLAN.md. Start with proof of free GPU access and one voice/video sample before batching all scenes. Verify a successful develop deployment and inspect the Next.js UI before calling it live.


## Mobile decision and reply fixes (19 November 2026)

Current develop uses visualViewport resize/scroll state to fit the welcome form above the mobile keyboard. Nibbles stays centered at one responsive size on every step, and each step's main copy stays in the top area.

Yes and No each show a facial emoji with a visible word label and accessible names. The default No face is 🤭, followed by 😏 and 🙃; tongue-out faces are not used. The shared note says “Press and hold the button of your choice for 2 seconds.” A rotating ring and “Next page is loading…” appear during a hold; early release cancels. Yes advances after two seconds. No moves immediately on touch up to three times, then accepts a complete hold. Keyboard and reduced-motion use the complete hold without escapes. No dodge instructions are shown to guests.

The existing going-out-develop form and its notification configuration remain in use. Active form payloads now contain a readable reply summary plus the decision and subject, removing empty obsolete fields and JSON from new Next guest replies. No new email service was introduced; this is a plain-text notification summary. The preserved version-1.html still has its historical payload.

## Cleaner response email on develop (20 November 2026)

The existing Netlify Form notification stays in place. Its note field is now
labelled `mission_note` and uses a compact, friendly summary: a clear Yes/No
line, outing and time for Yes replies, optional answers, and the invitation
reference. Decision and dynamic subject fields remain for inbox scanning and
submission records. Netlify's built-in notification body is plain text; rich
HTML would require configuring a separate supported email API/provider, so no
new paid service or credentials were introduced.

Local Next production build and all seven unlock tests passed. Local Chromium smoke execution was blocked by the runtime denying socket creation, so the committed browser smoke covers keyboard-sized viewports, early cancellation, the two-second Yes hold, bounded No escapes, decline video visibility and readable Yes/No reply bodies in CI. No real guest response or test email was sent.

