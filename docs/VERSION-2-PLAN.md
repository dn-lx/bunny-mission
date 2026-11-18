# Bunny Mission version 2 plan

Status: paused for planning at the owner's request, 18 November 2026. Version 1 is the active develop experience, including links previously using `?version=2`. Resume generation only after a new request. Work stays on develop; main requires a separate release request.

## What remains available now

The existing nine Google Flow talking videos remain active, with their original embedded voice and mouth movements. Current invitation authentication, Bunny Studio editing, available-day controls and response submission stay in place. All original public resources remain archived at `public/resources/v1`. Version 2 files are retained separately at `public/resources/v2`; they are drafts, not a finished release.

## Agreed version 2 direction

- Use Qwen3-TTS for one consistent, very soft small-girl cartoon voice with a standard American accent. Quiet, gentle delivery and clear words; no music, sound effects or extra vocal noises.
- Add the exact spoken greeting “Hi there, how are you?” once before the invitation question. Keep the visible invitation text as the personalized question.
- Use LongCat Video Avatar 1.5 for actual talking video with synchronized mouth movements, blinking and subtle natural motion. A still image or CSS movement does not satisfy this requirement.
- Use a 9:16 portrait composition, with the entire bunny's ears and feet visible. Keep the same approved Nibbles appearance, camera, lighting, scale and resting pose across clips. End each clip in the same closed-mouth posture used at its start.
- Continue the warm sage background (#DDE7DC), forest-green text and cream button palette. Match the generated background to the app and feather boundaries without cropping the ears or feet.
- Place individual emoji and text buttons over the lower part of the bunny scene. Keep shared question and choice panels transparent; show only the current question, with “No worries at all” on decline.
- Keep calendar days blocked until Alex releases them. Preserve the existing invitation and owner workflow settings.
- No paid generation, GPU rental, bought credits, API billing or hosting upgrades.

## Current evidence and blockers

The sage portrait reference exists, but no completed LongCat video exists. The three public version 2 Qwen recordings were rejected as too adult and must not become the final voice reference. A revised local Qwen child-voice generator was prepared but produced no verified completed recording. Its draft and the unshipped greeting integration are preserved under `docs/v2-drafts`.

The latest official LongCat access retry failed with: “You have exceeded your ZeroGPU quota (480s requested vs. -240s left).” It requested Hugging Face authentication. A previous secure browser sign-in attempt returned CloudFront 403. These observations establish that access was blocked at that time; they do not guarantee that signing in will provide enough free GPU allowance. Anonymous Qwen demo quota was also exhausted.

## Execution order when resumed

1. **Prove free access first.** Inspect the actual signed-in LongCat allowance and complete one small free test. Do not commit to a full batch until a real video can finish. Keep version 1 active if access remains blocked.
2. **Choose the voice.** Produce a short Qwen sample using the explicit small-girl description, including the greeting and invitation question. Let Alex listen and choose before generating the full set. A high pitch alone is not proof of the desired soft child timbre. Do not pitch-shift the rejected adult samples and call them a new voice.
3. **Prove one complete scene.** Feed the chosen recording and approved portrait to LongCat. Check the actual MP4 for audible clean speech, visible mouth synchronization, full-body framing, natural motion and matching background. Confirm that the first and final poses blend smoothly into a resting loop.
4. **Generate the full set.** Reuse one approved voice reference, image, prompt, framing and generation settings. Produce greeting, password, password-error, intro, ask, yes, outing, detail, detail-coffee, detail-walk, detail-food, detail-sweet, detail-surprise, area, schedule, success, decline and secret scenes. Avoid playing the greeting twice when intro already contains it.
5. **Integrate as an isolated preview.** Use a complete version 2 media manifest, then re-enable the preview intentionally. Keep version 1 and its assets available. Let the playing video drive speech timing and scene transitions. Do not overlay a second audio track on top of embedded speech.
6. **Check the complete flow.** Verify portrait phones including Safari and Android Chrome, fullscreen, audio unlock, mute/replay, every activity branch, back navigation, owner-edited questions, available dates and answer submission. Test slow media loading, failed video and reduced motion. Custom edited questions need matching regenerated media or an explicit fallback; fixed recordings must never read different words from the edited question.
7. **Review and release.** Alex reviews a complete working preview before version 2 becomes active. Keep V1 as a rollback option. A release to main still requires an explicit request.

## Completion criteria

Every published version 2 scene is an actual video, with the approved same-character voice and synchronized speech. No rejected adult recordings are used. The greeting plays exactly once. No extra sound effects are audible. Transitions have no obvious pose jumps or exposed rectangular background edges. The whole bunny fits on a phone with readable questions and tappable lower controls. All branches, owner settings and date restrictions work. Unit and browser checks pass and the develop deployment is Ready.

No new media generation was started as part of this rollback and planning change.
