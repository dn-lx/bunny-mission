# Bunny Mission V1 guest flow

Bunny Mission is the product name. The invitation itself may still ask the guest whether she would like to go out with Alex. This is the current page flow and response behavior; the page update does not change any clips.

## 1. Welcome and invitation code

Show one simple welcome and code-entry screen with “A little surprise for you,” an invitation-code field, and an unlock action. Keep a code error on the invitation screen so the guest can correct it. Request fullscreen after an eligible user action; do not add a separate fullscreen continuation page.

## 2. The invitation question

After the code is verified, show the guest’s name and the personalized question: “Would you like to go out with Alex?” Use clear Yes and No choices with the existing emoji treatment.

The No button may playfully dodge up to three times, then stays selectable. Touch, keyboard, and reduced-motion users must retain a usable path. When No is accepted, show only “No worries at all” on the goodbye screen.

## 3. Choose the outing

Offer exactly two primary choices:

- Something simple
- Surprise me

Show only the follow-up questions Alex has configured. If none are configured, go straight to the calendar without an empty question page.

## 4. Choose a time

Dates and dayparts start closed. Only dates and Morning, Afternoon, or Evening slots opened by Alex are selectable. Show the selected day and time in the calendar step.

Provide two clear actions:

- “Send my choices to Alex” submits the selected open time.
- “Choose a day together later” lets the guest send that preference without selecting a date or time.

## 5. Send the reply

A Yes reply is submitted when the guest sends her calendar choice. A No reply is submitted when she accepts the decline action. Both use the existing `going-out-develop` Netlify Form so the configured owner email notification fires for either response. If submission fails, retain the guest’s choices and let her retry.

## Media scope

Keep all existing Nibbles voice and video files and manifests unchanged for this page update. Do not create, replace, or edit clips. The Nibbles flower-offer clip is unavailable and is not part of the flow.