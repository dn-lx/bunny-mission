# Bunny Mission 🐰

Bunny Mission is a private, mobile-friendly invitation for Alex and a guest. The guest enters an invitation code, answers a short Yes/No question, chooses “Something simple” or “Surprise me,” answers any owner-configured follow-up questions, and can select an available day and time.

## Framework and branches

- The active integration app on develop uses the Next.js App Router with React.
- main is production; develop is the integration branch. The Next.js migration is on develop only.
- Netlify's managed OpenNext adapter handles the Next.js build. The existing Netlify Functions remain in netlify/functions.
- The product is named Bunny Mission. The invitation wording may still ask, “Would you like to go out with Alex?”
- The complete pre-migration page is preserved at /version-1.html. The archived V1 and V2 resources remain under public/resources.
- The page flow and Nibbles media are unchanged by the framework migration.

## V1 guest flow

1. Welcome and code entry: one screen shows “A little surprise for you” with the invitation-code field, show/hide control, and unlock action. Invalid codes can be corrected without restarting.
2. Invitation: after server-side code verification, show the guest’s name and the personalized invitation with Yes and No. The playful No button dodges up to three times; keyboard and reduced-motion users can select without waiting.
3. Outing choice: show only “Something simple” and “Surprise me.” Insert optional questions configured by Alex only when they exist.
4. Calendar: guests can select only a date and daypart Alex has opened. They can send an available selection or choose “Choose a day together later.” Availability is checked again immediately before submission.
5. Replies: a Yes reply is sent from the calendar step. A No reply sends the explicit decline. Both use the existing going-out-develop Netlify Form and its owner notification.

## Forms, email, and privacy

The static form blueprint is public/__forms.html, as required for Netlify form detection with Next.js. Client replies use URL-encoded AJAX submissions to /__forms.html, outside the Next.js route handler. Netlify must have form detection enabled and the going-out-develop notification configured for Alex. The site never puts the notification address, invitation codes, credentials, or other private details in Git or public assets.

The invitation code is checked by /.netlify/functions/unlock. The Bunny Studio owner dashboard stays at /admin.html and continues using its existing protected Netlify Function.

## Develop locally

Install the dependencies with npm install. Start the Next.js page with npm run dev. To exercise the Netlify Functions locally too, run the site through Netlify CLI with npx netlify dev and a private local environment file; never commit credentials. Create a production build with npm run build. Run the existing API and V1 contract checks with npm test.

## Netlify deployment

The build runs npm run build, publishes .next, and uses Netlify's managed Next.js adapter. The custom function directory remains netlify/functions. Keep develop as the preview branch and main as production. Verify the actual branch deployment is Ready in Netlify before calling it live.

Do not use a static-only drag-and-drop of public; it would omit the password function.

## Checks and project notes

- Current branch status and migration notes: docs/CURRENT-HANDOFF.md.
- V2 media work remains paused for planning: docs/VERSION-2-PLAN.md.
- Real-device speech, fullscreen, keyboard behavior, form delivery, and Netlify deployment require separate browser/deploy verification.
