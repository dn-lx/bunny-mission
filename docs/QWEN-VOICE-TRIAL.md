# Qwen narration in Bunny Mission

The owner requested that voices be added directly to the existing app and
explicitly rejected a separate comparison interface. The former comparison
page and its sample choices are removed. Its old URL redirects to `/`.

## Active voice

The nine normal scenes use one consistent soft female child character voice,
generated on the official `Qwen/Qwen3-TTS` Hugging Face ZeroGPU demo with the
1.7B VoiceDesign model. The instructions request a light, delicate girlish
timbre, smooth soft speech, natural pitch variation, hopeful questions, gentle
delight and reassuring kindness. No personal reference voice is uploaded.
No paid API, credits, upgrade or overage is used.

The manifest at `public/video/flow/manifest.json` selects `-girl.mp4` recordings.
The new master and exact per-phrase timing are in
`public/audio/qwen/female-child-master.flac` and
`scripts/tts/qwen-flow-timing.json`. Each original H.264 video is copied without
changing packets or timestamps; only its soundtrack is replaced with AAC voice.
Pitch-preserving time stretching retains the accepted speech windows and pauses.
The former effects are not mixed in. This retains timing but does not regenerate
mouth shapes. The existing mute and replay controls are used.

Original Flow files and the earlier accepted Qwen assets remain for internal
rollback. Their previous timing metadata is in
`docs/voice-history/qwen-before-female-child.json`. Archived V1/V2 assets and
invitation data are unchanged. User-edited questions keep the existing device
speech fallback, so a fixed clip does not read unrelated custom words.

## Reproduce and verify

```sh
python3 scripts/tts/render_qwen_flow.py
python3 scripts/tts/verify_qwen_flow.py
npm test
npm run build
node scripts/browser-smoke.cjs
```

Rendering requires FFmpeg with the `rubberband` filter. These Python scripts use
the standard library and do not call a model, GPU or external service. Generation
never runs during app build or browser playback. CI verifies media integrity,
the existing invitation flow, active narration and the absence of comparison UI.
