# JET DRIFT — 8BIT Studio Audio Recipe

Source generator: `yz4git/sound-wave/src/eightbit/`

The game uses the same `sound-wave-eight-bit-v1` event model and the same pulse / triangle / LFSR-noise synthesis model as 8BIT Studio.

## BGM

- kind: `bgm`
- purpose: `battle`
- intensity: `0.68`
- seed: `0x53504143` ("SPAC")
- normal bpm: `132`
- crisis bpm: `164` (TIME <= 2.5s or FUEL <= 12%)
- bars: `4`
- normal loop duration: about `7.27s`
- crisis loop duration: about `5.85s`

The short loop is intentional: JET DRIFT stages are only several seconds long, so the BGM keeps momentum across stage transitions rather than restarting every stage.

## SFX

| Game event | 8BIT Studio purpose | Intensity | Seed |
| --- | --- | ---: | --- |
| Warp entry | magic | 0.88 | 0x57415250 |
| Warp confirmation | critical | 0.72 | 0x434C4541 |
| Explosion / fail | explosion | 0.92 | 0x424F4F4D |
| Fuel pickup | pickup | 0.72 | 0x4655454C |
| TIME / FUEL warning | damage | 0.50 | 0x5741524E |

JET thrust remains a continuous procedural oscillator because 8BIT Studio's exported SFX are one-shot sounds; forcing a one-shot loop onto a held control would add audible seams and hurt control feedback.

## Runtime integration

The compositions are generated deterministically from the settings above at load time and scheduled with:

- PULSE 1
- PULSE 2
- TRIANGLE
- NOISE

No external WAV request is needed, so the audio remains lightweight and offline/PWA friendly.

## Dynamic tempo rule

Both normal and crisis versions use the same seed `0x53504143` and the same generated note/event pattern. Only event timing changes with BPM.

- Normal: 132 BPM
- Red TIME/FUEL crisis: 164 BPM
- Fuel recovery can return to 132 BPM if TIME is not yet critical
