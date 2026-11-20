import Invitation from "./invitation";

export const dynamic = "force-static";

export default function HomePage() {
  return (
    <>
      <Invitation />
      <form
        name="bunny-mission-replies"
        method="POST"
        data-netlify="true"
        netlify-honeypot="bot-field"
        hidden
        aria-hidden="true"
      >
        <input type="hidden" name="form-name" value="bunny-mission-replies" />
        <input type="text" name="bot-field" />
        <input type="hidden" name="request_id" />
        <input type="hidden" name="email_kind" value="bunny-mission-replies-v1" />
        <input type="hidden" name="guest" />
        <input type="hidden" name="invite" />
        <textarea name="mission_note" defaultValue="" />
        <input type="hidden" name="decision" />
        <input type="hidden" name="outing" />
        <input type="hidden" name="when" />
        <textarea name="extra_answers" defaultValue="" />
        <input type="hidden" name="subject" value="Alex received a bunny invitation response" />
      </form>
    </>
  );
}
