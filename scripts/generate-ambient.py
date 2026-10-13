"""Regenerate the project's original ambient loop.

Optional development tool (not used in npm build): pip install numpy; install ffmpeg.
Run from the repository root: python scripts/generate-ambient.py
Then encode with the ffmpeg commands in README. No external samples used.
"""
from pathlib import Path
import numpy as np, wave
SR=24000; DUR=32; N=SR*DUR
rng=np.random.default_rng(1302)
t=np.arange(N,dtype=np.float64)/SR
# All base harmonic partials use an integer number of cycles per loop.
def periodic(freq, phase=0):
 f=round(freq*DUR)/DUR
 return np.sin(2*np.pi*f*t+phase)
# Soft harmonic drone, evolving pad and gentle stone-bell resonances.
bed=(0.18*periodic(110)+0.115*periodic(164.8,0.4)+0.09*periodic(220,1.1)+0.065*periodic(329.65,1.7))
waveform=bed*(0.72+0.2*np.cos(2*np.pi*t/DUR)+0.07*np.cos(2*np.pi*3*t/DUR))
# Distant, airy breath: shaped, low-passed noise (seeded for reproducibility).
noise=rng.standard_normal(N)
# Smooth with moving average fast via FFT low-pass.
freqs=np.fft.rfftfreq(N,1/SR)
fft=np.fft.rfft(noise)
fft*=np.exp(-(freqs/85)**4)
wind=np.fft.irfft(fft,n=N)
wind/=max(np.std(wind),1e-6)
waveform+=0.02*wind*(0.4+0.6*np.sin(np.pi*t/DUR)**2)
# Chimes fade naturally. Place last chime far from boundary for a clean loop.
for at, pitch, amp in [(3.4, 493.88,.045),(11.7,659.25,.037),(19.6,587.33,.044),(26.2,440,.035)]:
 s=int(at*SR); length=min(int(SR*3.8),N-s)
 tt=np.arange(length)/SR
 bell=(np.sin(2*np.pi*pitch*tt)+.26*np.sin(2*np.pi*pitch*2.013*tt))*np.exp(-tt*1.35)
 attack=np.minimum(1,tt/.035)
 waveform[s:s+length]+=amp*bell*attack
# Loop seam: crossfade 0.7s between end and beginning, keeping amplitude constant.
f=int(.7*SR)
start=waveform[:f].copy(); end=waveform[-f:].copy()
for i in range(f):
 a=i/(f-1)
 mix=(1-a)*end[i]+a*start[i]
 waveform[i]=mix
 waveform[-f+i]=mix
# Compress gently without flattening.
waveform=np.tanh(waveform*1.28)*.68
pcm=np.int16(np.clip(waveform,-1,1)*32767)
out=str(Path(__file__).resolve().parents[1]/'public'/'audio'/'tower-ambient.wav')
with wave.open(out,'wb') as f:
 f.setnchannels(1);f.setsampwidth(2);f.setframerate(SR);f.writeframes(pcm.tobytes())
print('created',out)
