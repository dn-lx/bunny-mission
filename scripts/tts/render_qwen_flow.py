#!/usr/bin/env python3
"""Fit the recorded Qwen phrases to existing Flow speech windows without editing video.

Requires FFmpeg with the rubberband filter. No model, GPU or network call is made.
Original MP4s are retained; outputs use the -qwen suffix for an easy rollback.
"""
import array
import argparse
import json
import re
import subprocess
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TIMING = ROOT / "scripts/tts/qwen-flow-timing.json"
SAMPLE_RATE = 24000


def run(command):
    return subprocess.check_output(command)


def render(timing_path=TIMING):
    timing = json.loads(timing_path.read_text())
    suffix = timing.get("outputSuffix", "-qwen")
    assert re.fullmatch(r"-[a-z-]+", suffix), "Invalid output suffix"
    master = ROOT / timing["master"]
    for key, clip in timing["clips"].items():
        original = ROOT / f"public/video/flow/{key}.mp4"
        destination = original.with_name(f"{key}{suffix}.mp4")
        duration = float(run([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(original)
        ]))
        samples = array.array("h", [0]) * round(duration * SAMPLE_RATE)
        previous_end = 0
        for segment in clip["segments"]:
            start, end = segment["sourceStart"], segment["sourceEnd"]
            target_start, target_end = segment["targetStart"], segment["targetEnd"]
            assert 0 <= start < end
            assert previous_end <= target_start < target_end <= duration
            target_duration = target_end - target_start
            tempo = (end - start) / target_duration
            assert 0.5 <= tempo <= 2, f"Unreasonable tempo for {key}: {tempo}"
            filters = (
                f"atrim=start={start}:end={end},asetpts=PTS-STARTPTS,"
                f"rubberband=tempo={tempo:.9f}:pitch=1,"
                f"apad=whole_dur={target_duration},atrim=duration={target_duration},"
                f"afade=t=in:d=0.003,afade=t=out:st={target_duration-0.003}:d=0.003"
            )
            pcm = run([
                "ffmpeg", "-v", "error", "-i", str(master), "-af", filters,
                "-ar", str(SAMPLE_RATE), "-ac", "1", "-f", "s16le", "-"
            ])
            phrase = array.array("h")
            phrase.frombytes(pcm)
            offset = round(target_start * SAMPLE_RATE)
            length = min(len(phrase), len(samples) - offset)
            samples[offset:offset+length] = phrase[:length]
            previous_end = target_end
        with tempfile.TemporaryDirectory() as temp:
            audio = Path(temp) / f"{key}.wav"
            with wave.open(str(audio), "wb") as output:
                output.setnchannels(1)
                output.setsampwidth(2)
                output.setframerate(SAMPLE_RATE)
                output.writeframes(samples.tobytes())
            subprocess.run([
                "ffmpeg", "-v", "error", "-y", "-i", str(original), "-i", str(audio),
                "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac",
                "-b:a", "128k", "-ar", "48000", "-af", "loudnorm=I=-19:TP=-2:LRA=7",
                "-t", str(duration), "-movflags", "+faststart", str(destination)
            ], check=True)
        print(f"Rendered {key}: {duration:.3f}s; original animation retained", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("timing", nargs="?", type=Path, default=TIMING)
    render(parser.parse_args().timing)
