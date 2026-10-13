'use client';
import {useCallback,useEffect,useRef,useState} from 'react';

export type TowerSound = 'tap'|'spinStart'|'land'|'correct'|'wrong'|'floorClear';
const MUSIC_PREF = 'tower-v14-music';
const SFX_PREF = 'tower-v14-sfx';

type SoundGraph={ctx:AudioContext;master:GainNode;nodes:AudioScheduledSourceNode[];chimeTimer:ReturnType<typeof setTimeout>|null};
const PENTATONIC=[293.66,349.23,392,440,523.25]; // D minor pentatonic. No beat or melody.

function addBell(ctx:AudioContext,destination:AudioNode,frequency:number,volume:number,seconds=2.6){
 const now=ctx.currentTime+.012;
 for(const [ratio,weight] of [[1,1],[2.003,.17],[3.012,.045]] as const){
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.type='sine';o.frequency.setValueAtTime(frequency*ratio,now);
  g.gain.setValueAtTime(0,now);
  g.gain.linearRampToValueAtTime(volume*weight,now+.02);
  g.gain.exponentialRampToValueAtTime(.0001,now+seconds);
  o.connect(g);g.connect(destination);o.start(now);o.stop(now+seconds+.01);
 }
}

function newAmbience():SoundGraph{
 const ctx=new AudioContext();
 const master=ctx.createGain();master.gain.value=0;
 master.connect(ctx.destination);
 const nodes:AudioScheduledSourceNode[]=[];
 const warmth=ctx.createBiquadFilter();warmth.type='lowpass';warmth.frequency.value=440;warmth.Q.value=.2;warmth.connect(master);
 // Quiet, slightly detuned pads. Each stays in D minor pentatonic (D / F / A).
 for(const [freq,volume,detune] of [[73.416,.038,-3],[110,.018,2],[146.83,.016,-2],[174.61,.008,3]] as const){
  const osc=ctx.createOscillator();osc.type='sine';osc.frequency.value=freq;osc.detune.value=detune;
  const gain=ctx.createGain();gain.gain.value=volume;
  osc.connect(gain);gain.connect(warmth);osc.start();nodes.push(osc);
 }
 const slow=ctx.createOscillator(),depth=ctx.createGain();
 slow.type='sine';slow.frequency.value=.035;depth.gain.value=145;
 slow.connect(depth);depth.connect(warmth.frequency);slow.start();nodes.push(slow);
 // Synthesized low wind, generated *after* opt-in. Not a downloaded recording.
 const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
 const samples=buffer.getChannelData(0);
 for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*.17;
 const wind=ctx.createBufferSource();wind.buffer=buffer;wind.loop=true;
 const windFilter=ctx.createBiquadFilter();windFilter.type='lowpass';windFilter.frequency.value=150;
 const windGain=ctx.createGain();windGain.gain.value=.06;
 wind.connect(windFilter);windFilter.connect(windGain);windGain.connect(master);
 wind.start();nodes.push(wind);
 master.gain.setTargetAtTime(.20,ctx.currentTime,.9);
 return {ctx,master,nodes,chimeTimer:null};
}

export function useTowerAudio(){
 const [musicEnabled,setMusicEnabled]=useState(false);
 const [sfxEnabled,setSfxEnabled]=useState(true);
 const [audioError,setAudioError]=useState('');
 const [resumeAvailable,setResumeAvailable]=useState(false);
 const graph=useRef<SoundGraph|null>(null);
 const sfxContext=useRef<AudioContext|null>(null);
 const musicOn=useRef(false);
 const sfxOn=useRef(true);
 const mounted=useRef(true);

 const clearAmbient=useCallback(()=>{
  const current=graph.current;
  graph.current=null;
  if(!current)return;
  if(current.chimeTimer)clearTimeout(current.chimeTimer);
  const {ctx,nodes,master}=current;
  if(ctx.state!=='closed'){
   master.gain.cancelScheduledValues(ctx.currentTime);
   master.gain.setTargetAtTime(0,ctx.currentTime,.1);
   setTimeout(()=>{
    try{for(const node of nodes)node.stop();}catch{}
    void ctx.close().catch(()=>{});
   },500);
  }
 },[]);

 const queueChime=useCallback((current:SoundGraph)=>{
  const schedule=()=>{
   if(graph.current!==current||!musicOn.current)return;
   if(!document.hidden&&current.ctx.state==='running'){
    // One isolated note every 11–18 seconds, with no rhythmic pattern.
    const note=PENTATONIC[Math.floor(Math.random()*PENTATONIC.length)];
    addBell(current.ctx,current.master,note,.013,3.1);
   }
   current.chimeTimer=setTimeout(schedule,11000+Math.random()*7000);
  };
  current.chimeTimer=setTimeout(schedule,6500+Math.random()*3500);
 },[]);

 useEffect(()=>{
  mounted.current=true;
  try{
   sfxOn.current=localStorage.getItem(SFX_PREF)!=='off';
   setSfxEnabled(sfxOn.current);
   // Respect browser autoplay policy: preference is retained, audio is not auto-started.
   setResumeAvailable(localStorage.getItem(MUSIC_PREF)==='on');
  }catch{}
  const onVisibility=()=>{
   const ctx=graph.current?.ctx;
   if(!ctx||!musicOn.current)return;
   if(document.hidden){void ctx.suspend().catch(()=>{});}
   else{void ctx.resume().catch(()=>{if(mounted.current)setAudioError('Tap Music to resume audio.');});}
  };
  document.addEventListener('visibilitychange',onVisibility);
  return ()=>{
   mounted.current=false;
   document.removeEventListener('visibilitychange',onVisibility);
   musicOn.current=false;
   clearAmbient();
   if(sfxContext.current)void sfxContext.current.close().catch(()=>{});
   sfxContext.current=null;
  };
 },[clearAmbient]);

 const toggleMusic=useCallback(()=>{
  setAudioError('');
  if(musicOn.current){
   musicOn.current=false;setMusicEnabled(false);setResumeAvailable(false);
   try{localStorage.setItem(MUSIC_PREF,'off');}catch{}
   clearAmbient();return;
  }
  try{
   const current=newAmbience();graph.current=current;
   musicOn.current=true;setMusicEnabled(true);setResumeAvailable(false);
   try{localStorage.setItem(MUSIC_PREF,'on');}catch{}
   queueChime(current);
   void current.ctx.resume().catch(()=>{
    musicOn.current=false;setMusicEnabled(false);clearAmbient();
    if(mounted.current)setAudioError('Audio was blocked. Tap Music again to retry.');
   });
  }catch{
   musicOn.current=false;setMusicEnabled(false);clearAmbient();
   setAudioError('Web Audio is unavailable in this browser.');
  }
 },[clearAmbient,queueChime]);
 const toggleSfx=useCallback(()=>{
  const next=!sfxOn.current;
  sfxOn.current=next;setSfxEnabled(next);
  try{localStorage.setItem(SFX_PREF,next?'on':'off');}catch{}
 },[]);
 const playSfx=useCallback((kind:TowerSound)=>{
  if(!sfxOn.current||typeof window==='undefined')return;
  try{
   const ctx=sfxContext.current??new AudioContext();sfxContext.current=ctx;
   if(ctx.state==='suspended')void ctx.resume().catch(()=>{});
   const noteSets:Record<TowerSound,Array<[number,number,number]>>={
    tap:[[392,.008,0]],
    spinStart:[[293.66,.012,0],[392,.008,.16]],
    land:[[392,.014,0],[523.25,.012,.16]],
    correct:[[349.23,.013,0],[440,.012,.15]],
    wrong:[[293.66,.009,0]],
    floorClear:[[293.66,.015,0],[349.23,.013,.22],[440,.013,.45]],
   };
   for(const [freq,amp,delay] of noteSets[kind]){
    // Short, restrained rune-bell: soft envelope, no percussion/transients.
    const o=ctx.createOscillator(),g=ctx.createGain();
    const when=ctx.currentTime+.015+delay;o.type='sine';o.frequency.value=freq;
    g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(amp,when+.025);
    g.gain.exponentialRampToValueAtTime(.0001,when+(kind==='floorClear'?1.1:.35));
    o.connect(g);g.connect(ctx.destination);o.start(when);o.stop(when+(kind==='floorClear'?1.15:.4));
   }
  }catch{/* Sound effects are cosmetic; never interrupt the puzzle. */}
 },[]);
 return {musicEnabled,sfxEnabled,audioError,resumeAvailable,toggleMusic,toggleSfx,playSfx};
}
