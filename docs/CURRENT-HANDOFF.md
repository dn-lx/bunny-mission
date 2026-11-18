# Current handoff

The invitation uses the nine native Google Flow Nibbles clips in `public/video/flow/manifest.json`. Each clip keeps Flow's gentle voice and mouth movement together in its MP4. The media remains unchanged in this update.

The app now feathers the video edges into the warm cream and blush page background on Safari and Chromium, and fades between speaking clips to soften scene changes. The Yes/No invitation uses expressive emoji plus visible labels, centered over Nibbles on mobile and desktop. Supporting copy, the brand label, step counter, transcript disclosure, and replay triangle are hidden through the question screens. The choice area has no shared white panel; individual controls stay visible and accessible. Declining shows only “No worries at all” and has no extra button.

Server-side password unlock, personalized guest and sender names, voluntary response submission, activity choices, and date planning still use the existing invitation flow. Continue work on `develop`; `main` is production and requires an explicit release request.

## Bunny Studio on develop

The owner signs in with the existing Me+ account. The Netlify Functions environment needs the develop-only secret `BUNNY_STUDIO_MEPLUS_AUTH` with `url`, `key` (the publishable key), `uid` (the approved owner) and `sessionSecret` (32 random bytes as hex). Keep the values in Netlify.

Under Personal invitations, edit the name and leave the guest password blank to keep it. The invitation and story editor saves a shared workflow for all invitations. You can reorder or skip the activity, follow-up, area and calendar steps, and place extra questions among them. The activity follow-up requires the activity first. New guest sessions obtain this configuration after the invitation password is verified. Existing settings are read from the prior record until the first save. Custom questions use device speech unless a matching recording is available for that scene.


## Portrait version 2 in progress

The original public resources from commit `9785cf6d7ee076f3403a97e7a19d90f989bae88e` are preserved byte for byte under `public/resources/v1`. The new portrait preview is available using `?version=2`. It uses a full-body Nibbles reference with warm sage background (#DDE7DC), forest-green and cream controls over the lower portrait, and version-specific media paths. It currently shows a still reference, not a generated LongCat video.

The free official Qwen demo generated a soft American feminine voice reference and matching password and outing recordings. Anonymous Qwen quota was then exhausted. LongCat Video Avatar 1.5 rejected its declared 480-second GPU request as exceeding this session's maximum. No completed LongCat video exists yet. Version 2 generation settings, remaining lines and exact blockers are in `public/resources/v2/generation.json`. A signed-in Hugging Face session is the next step to inspect available allowance. Keep all new output under version 2.

Browser sign-in was attempted through the secure prompt. CloudFront returned 403 Request blocked, and a fresh homepage still showed signed out. Local unit checks pass (33/33). Local Chromium browser checks are blocked by the container socket restriction. Check the GitHub Actions browser run after publishing.
