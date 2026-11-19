import gc
import json
import os
import time
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel

OUTPUT = Path('/mnt/data/child-voice-v2')
DESCRIPTION = (
    'A small American girl, five to seven years old, speaking English. '
    'A very soft, sweet, delicate child voice with naturally high pitch and small, '
    'light vocal resonance. Gentle rounded vowels and clear childlike diction. '
    'Slow, tender, shy and reassuring, like a little cartoon bunny speaking kindly. '
    'Standard American English accent. Quiet clean studio speech with natural pauses. '
    'No music, no laughter, no sound effects, no background noise.'
)
REFERENCE_TEXT = 'Hi! I am Nibbles. Would you like to go out with Alex?'
LINES = {
    'greeting': 'Hi there, how are you?',
    'password': 'Enter your invitation password.',
    'password-error': 'Oops! Please try your invitation password again.',
    'intro': "Hi there, how are you? I am Nibbles. I have a tiny question.",
    'ask': 'Would you like to go out with Alex?',
    'yes': 'Oh, lovely!',
    'outing': 'What would you like to do together?',
    'detail': 'What sounds most like you?',
    'detail-coffee': 'What kind of coffee stop?',
    'detail-walk': 'Where should we wander?',
    'detail-food': 'What food sounds good?',
    'detail-sweet': 'Which sweet treat?',
    'detail-surprise': 'What should the surprise feel like?',
    'area': 'Where would you like to meet?',
    'schedule': 'Which available day works for you?',
    'success': 'Lovely! Send your choices to Alex.',
    'decline': 'No worries at all.',
    'secret': 'I have a tiny secret. Carrots make me very happy.'
}

def load_model(name):
    print('Loading', name, flush=True)
    model = Qwen3TTSModel.from_pretrained(
        'Qwen/' + name, device_map='cpu', dtype=torch.bfloat16,
        attn_implementation='sdpa', low_cpu_mem_usage=True,
    )
    # Quantize one linear layer at a time to keep peak RAM bounded on CPU.
    # Remaining embeddings, normalization and codec layers use float32.
    def quantize_children(parent):
        for name, child in list(parent.named_children()):
            if isinstance(child, torch.nn.Linear):
                wrapper = torch.nn.Sequential(child.float())
                converted = torch.ao.quantization.quantize_dynamic(
                    wrapper, {torch.nn.Linear}, dtype=torch.qint8, inplace=True,
                )
                setattr(parent, name, converted[0])
            else:
                quantize_children(child)
    quantize_children(model.model)
    model.model.float()
    print('CPU int8 model ready', flush=True)
    return model


def save_wave(path, audio, sample_rate):
    samples = np.asarray(audio, dtype=np.float32).reshape(-1)
    if not np.all(np.isfinite(samples)) or np.max(np.abs(samples)) < .01:
        raise ValueError('Invalid or silent recording')
    sf.write(path, samples, sample_rate, subtype='PCM_16')
    print(path.name, round(len(samples)/sample_rate, 2), 'seconds', flush=True)


def main():
    torch.set_num_threads(4)
    torch.set_num_interop_threads(1)
    torch.manual_seed(7312)
    reference = OUTPUT/'voice-reference.wav'
    if not reference.exists():
        model = load_model('Qwen3-TTS-12Hz-1.7B-VoiceDesign')
        start=time.monotonic()
        print('Generating child girl reference',flush=True)
        with torch.inference_mode():
            waves, sample_rate = model.generate_voice_design(
                text=REFERENCE_TEXT, language='English', instruct=DESCRIPTION,
                max_new_tokens=600, do_sample=True, top_p=.9, temperature=.8,
            )
        save_wave(reference, waves[0], sample_rate)
        print('Reference generated in', round(time.monotonic()-start), 'seconds',flush=True)
        del model, waves
        gc.collect()
    model = load_model('Qwen3-TTS-12Hz-1.7B-Base')
    print('Creating shared child voice prompt',flush=True)
    prompt=model.create_voice_clone_prompt(ref_audio=str(reference),ref_text=REFERENCE_TEXT,x_vector_only_mode=False)
    for key, text in LINES.items():
        target=OUTPUT/(key+'.wav')
        if target.exists():
            continue
        print('Generating',key,flush=True)
        with torch.inference_mode():
            waves, sample_rate=model.generate_voice_clone(
                text=text,language='English',voice_clone_prompt=prompt,
                max_new_tokens=600,do_sample=True,top_p=.9,temperature=.7,
            )
        save_wave(target,waves[0],sample_rate)
    (OUTPUT/'lines.json').write_text(json.dumps(LINES,indent=2)+'\n')
    (OUTPUT/'voice.json').write_text(json.dumps({'description':DESCRIPTION,'referenceText':REFERENCE_TEXT,'seed':7312},indent=2)+'\n')
    print('COMPLETE',len(LINES),'recordings',flush=True)

if __name__=='__main__':
    main()
