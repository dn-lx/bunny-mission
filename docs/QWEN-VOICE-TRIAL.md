# Nibbles Qwen voice trial

The 20 November 2026 trial is active on `develop`. All nine talking scenes
in the Flow manifest use Qwen narration fitted to their existing speech windows.
The invitation's layout and animation frames are unchanged.

## Review

- `/` uses Qwen for the standard recorded scenes.
- `/?voice=original` uses the original embedded Flow soundtracks in the Next.js app.
- `/voice-preview.html` compares all nine Qwen clips with their originals without
  entering an invitation code or submitting a reply.

The original MP4s remain at `/video/flow/{scene}.mp4`; Qwen copies use
`/video/flow/{scene}-qwen.mp4`. Archived V1 and V2 resources are untouched.
Restoring the original manifest and removing the optional query override rolls
back the trial without changing invitation data.

## Voice and timing

Speech was generated on the official `Qwen/Qwen3-TTS` Hugging Face ZeroGPU demo
using the free allowance, with no paid API, credits, upgrades or overage.
The soft childlike reference uses the 1.7B VoiceDesign model; the full batch
uses the 1.7B Base voice clone model with that generated reference. No personal
voice recording was uploaded. The reference, master recording, exact words,
voice direction and source/target timing are retained in `public/audio/qwen/`
and `scripts/tts/qwen-flow-timing.json`.

The generated batch was split into nine scenes and fitted to the original
spoken phrases with FFmpeg's pitch-preserving Rubber Band time stretching.
The original soundtrack is not mixed in, so its chimes and other effects are
removed completely. AAC is muxed with a copy of each original H.264 video
stream. Every video packet and its timestamp are checked against the original.

Lip sync is approximate: phrase starts, lengths and pauses are matched, but
mouth shapes have not been regenerated for the new phonemes. Automated speech
recognition recovered all nine lines. The tiny English recognizer rendered the
calendar's reduced “and” as “in”; a listening review is still needed to judge
pronunciation and voice quality. User-edited questions retain the existing
device-speech fallback so a fixed recording never reads an unrelated question.

## Reproduce and verify

No generation is run during installation, build or browser playback.

```sh
python3 scripts/tts/render_qwen_flow.py
python3 scripts/tts/verify_qwen_flow.py
npm test
npm run build
node scripts/browser-smoke.cjs
```

Rendering needs FFmpeg with the `rubberband` filter. The Python scripts use only
the standard library and make no network, GPU or paid service calls.
