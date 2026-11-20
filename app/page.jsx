import Invitation from "./invitation";

export const dynamic = "force-static";

export default function HomePage() {
  return (
    <>
      <Invitation />
      <form
        name="going-out-develop"
        method="POST"
        data-netlify="true"
        netlify-honeypot="bot-field"
        hidden
        aria-hidden="true"
      >
        <input type="hidden" name="form-name" value="going-out-develop" />
        <input type="text" name="bot-field" />
        <textarea name="mission_note" defaultValue="" />
        <input type="hidden" name="decision" />
        <input type="hidden" name="subject" value="Alex received a bunny invitation response" />
      </form>
    </>
  );
}
