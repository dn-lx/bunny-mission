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
        <input type="text" name="invite" />
        <input type="text" name="recipient" />
        <input type="text" name="outing" />
        <input type="text" name="energy" />
        <input type="text" name="timing" />
        <input type="text" name="detail" />
        <input type="text" name="meet_area" />
        <input type="text" name="day" />
        <input type="text" name="time" />
        <input type="text" name="decision" />
        <input type="text" name="extra_answers" />
        <input type="hidden" name="subject" value="Alex received a bunny invitation response" />
      </form>
    </>
  );
}