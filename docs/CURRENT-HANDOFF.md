# Current handoff

The invitation uses the nine native Google Flow Nibbles clips in `public/video/flow/manifest.json`. Each clip keeps Flow's gentle voice and mouth movement together in its MP4. The media remains unchanged in this update.

The app now feathers the video edges into the warm cream and blush page background on Safari and Chromium, and fades between speaking clips to soften scene changes. The Yes/No invitation uses expressive emoji plus visible labels, centered over Nibbles on mobile and desktop. Supporting copy, the brand label, step counter, transcript disclosure, and replay triangle are hidden through the question screens. The choice area has no shared white panel; individual controls stay visible and accessible. Declining shows only “No worries at all” and has no extra button.

Server-side password unlock, personalized guest and sender names, voluntary response submission, activity choices, and date planning still use the existing invitation flow. Continue work on `develop`; `main` is production and requires an explicit release request.

## Bunny Studio on develop

The owner signs in with the existing Me+ account. The Netlify Functions environment needs the develop-only secret `BUNNY_STUDIO_MEPLUS_AUTH` with `url`, `key` (the publishable key), `uid` (the approved owner) and `sessionSecret` (32 random bytes as hex). Keep the values in Netlify.

Under Personal invitations, edit the name and leave the guest password blank to keep it. The invitation and story editor saves a shared workflow for all invitations. You can reorder or skip the activity, follow-up, area and calendar steps, and place extra questions among them. The activity follow-up requires the activity first. New guest sessions obtain this configuration after the invitation password is verified. Existing settings are read from the prior record until the first save. Custom questions use device speech unless a matching recording is available for that scene.
