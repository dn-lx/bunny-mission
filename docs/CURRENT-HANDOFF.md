# Bunny Mission current handoff

## Next.js migration on develop

The active guest route on develop is a Next.js App Router app using React 19.3.1 and Next.js 16.4.6. The migration preserves the existing V1 page flow, Flow video files, unlock function, owner dashboard, and Netlify response form.

- The new root route is in app/page.jsx and app/invitation.jsx.
- public/index.html was removed from the deploy root so Netlify cannot serve the old static page in place of the Next.js route.
- The complete former root page is preserved at public/version-1.html. Archived V1 and V2 resources remain unchanged.
- public/__forms.html is the static form blueprint for Netlify's form detection. The guest page sends URL-encoded AJAX submissions to /__forms.html for the going-out-develop form.
- Invitation codes are still verified by /.netlify/functions/unlock. The Yes flow fetches the current public availability again immediately before sending.
- Bunny Studio stays at /admin.html. The existing owner and unlock functions remain under netlify/functions.
- Netlify uses its managed OpenNext adapter; no adapter version is pinned. The build command is npm run build, the publish directory is .next, and custom functions remain configured.

The Next.js migration was committed to develop only. The merge to main happened before the migration; main remains on the pre-migration app. No Next.js build, browser inspection, form delivery, or Netlify deployment check has been run for this migration. Treat the develop implementation as pending those checks; do not call it live until the branch deployment is Ready.

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
