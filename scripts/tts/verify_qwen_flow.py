#!/usr/bin/env python3
"""Check Qwen media integrity, original animation, duration and silent endings."""
import array
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def run(*args):
    return subprocess.check_output(args)


def video_packets(path):
    return json.loads(run(
        "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_packets",
        "-show_entries", "packet=pts_time,dts_time,duration_time,size",
        "-of", "json", str(path)
    ))["packets"]


def video_hash(path):
    return run("ffmpeg", "-v", "error", "-i", str(path), "-map", "0:v:0",
               "-c", "copy", "-f", "hash", "-hash", "sha256", "-")


def verify():
    timing = json.loads((ROOT / "scripts/tts/qwen-flow-timing.json").read_text())
    manifest = json.loads((ROOT / "public/video/flow/manifest.json").read_text())
    assert set(timing["clips"]) == set(manifest["clips"])
    candidates = [(key, ROOT / ("public" + path)) for key, path in manifest["clips"].items()]
    expression = ROOT / "scripts/tts/qwen-expression-timing.json"
    if expression.exists():
        samples = json.loads(expression.read_text())
        assert set(samples["clips"]) == {"ask", "yes"}
        for key, clip in samples["clips"].items():
            assert clip["text"] == timing["clips"][key]["text"]
            windows = lambda segments: [(s["targetStart"], s["targetEnd"]) for s in segments]
            assert windows(clip["segments"]) == windows(timing["clips"][key]["segments"])
            candidates.append((key, ROOT / f"public/video/flow/{key}-soft.mp4"))
    for key, candidate in candidates:
        original = ROOT / f"public/video/flow/{key}.mp4"
        assert candidate.name in {key + "-qwen.mp4", key + "-soft.mp4"}
        assert video_hash(original) == video_hash(candidate), f"Video changed: {key}"
        assert video_packets(original) == video_packets(candidate), f"Timing drift: {key}"
        info = json.loads(run("ffprobe", "-v", "error", "-show_streams",
                              "-show_format", "-of", "json", str(candidate)))
        assert {s["codec_name"] for s in info["streams"]} == {"h264", "aac"}
        assert abs(float(info["format"]["duration"]) - 8.042) < .03
        pcm = run("ffmpeg", "-v", "error", "-i", str(candidate), "-vn", "-ar",
                  "16000", "-ac", "1", "-f", "s16le", "-")
        samples = array.array("h")
        samples.frombytes(pcm)
        assert max(abs(x) for x in samples) > 500, f"Missing speech: {key}"
        assert max(abs(x) for x in samples[round(6.6*16000):]) < 66, f"Ending noise: {key}"
        print(f"PASS {candidate.name}: unchanged video and timing, H.264/AAC, speech, silent ending")


if __name__ == "__main__":
    verify()
