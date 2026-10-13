'use client';
import {useCallback,useEffect,useRef,useState,type CSSProperties,type TransitionEvent} from 'react';
import GameStage from '@/components/GameStage';
import AudioControls from '@/components/AudioControls';
import TowerEnding from '@/components/TowerEnding';
import {useTowerAudio} from '@/hooks/useTowerAudio';
import {endingForFloor,storyTitleForFloor} from '@/lib/story';
import { CHAPTERS, GAME_META, GAMES, chapterFor, type GameId, type PublicState, type PublicTrial } from '@/lib/tower';

type View='home'|'trial'|'practice'|'story';
const TRIAL_DESCRIPTIONS:Record<GameId,string>={
 cipher:'A hidden code guards the first gate.',
 ghost:'A glowing path vanishes into the mist.',
 shift:'One symbol changes when you look away.',
 circuit:'Awaken an ancient path of energy.',
 lightning:'Nine sigils. One perfect sequence.',
 forge:'Two stones must forge the right sum.',
};
const COLORS=['#d5a965','#b9a1df','#86babc','#dd968b','#b5c77d','#a6c1e5'];
export default function Home(){
 const [state,setState]=useState<PublicState|null>(null);
 const [view,setView]=useState<View>('home');
 const [demo,setDemo]=useState(false);
 const [storyFloor,setStoryFloor]=useState(1);
 const [practiceMode,setPracticeMode]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [spinning,setSpinning]=useState(false);
 const [wheelAngle,setWheelAngle]=useState(0);
 const [reveal,setReveal]=useState('');
 const [previewGame,setPreviewGame]=useState<GameId|null>(null);
 const [endingFloor,setEndingFloor]=useState<number|null>(null);
 const [endingReplay,setEndingReplay]=useState(false);
 const [endingDemo,setEndingDemo]=useState(false);
 const [showIntro,setShowIntro]=useState(false);
 const queuedEnding=useRef<number|null>(null);
 const introTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const {musicEnabled,sfxEnabled,audioError,resumeAvailable,toggleMusic,toggleSfx,playSfx}=useTowerAudio();
 const spinLock=useRef(false);
 const spinTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const finishWheel=useRef<(()=>void)|null>(null);
 const alive=useRef(true);
 useEffect(()=>{alive.current=true;setDemo(new URLSearchParams(window.location.search).get('demo')==='1');
  fetch('/api/game',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(alive.current)setState(d.state);}).catch(e=>{if(alive.current)setError(e.message);});
  try{
   const introSeen=sessionStorage.getItem('tower-v15-intro')==='seen';
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   if(!introSeen&&!reduced){
    setShowIntro(true);
    introTimer.current=setTimeout(()=>{if(alive.current){setShowIntro(false);try{sessionStorage.setItem('tower-v15-intro','seen');}catch{}}},3100);
   }
  }catch{}
  return ()=>{alive.current=false;if(spinTimer.current)clearTimeout(spinTimer.current);if(introTimer.current)clearTimeout(introTimer.current);finishWheel.current=null;};
 },[]);
 // A tab left open across 00:00 UTC must not display yesterday's spins.
 // Reconcile only when idle, so a real wheel reveal is never interrupted.
 useEffect(()=>{
  if(!state?.day)return;
  let checking=false;
  const refreshDay=async()=>{
   if(checking||document.hidden||busy||spinning||spinLock.current)return;
   if(new Date().toISOString().slice(0,10)===state.day)return;
   checking=true;
   try {
    const response=await fetch('/api/game',{cache:'no-store'});
    if(!response.ok)throw new Error('The tower could not refresh its daily challenge.');
    const data=await response.json() as {state:PublicState};
    if(!alive.current||spinLock.current)return;
    setState(data.state);
    setReveal('');setPreviewGame(null);
    if(view==='trial'&&!practiceMode)setView('home');
   }catch {if(alive.current)setError('Unable to refresh the daily challenge. Please reload.');}
   finally {checking=false;}
  };
  const interval=setInterval(()=>void refreshDay(),60_000);
  window.addEventListener('focus',refreshDay);
  document.addEventListener('visibilitychange',refreshDay);
  void refreshDay();
  return ()=>{clearInterval(interval);window.removeEventListener('focus',refreshDay);document.removeEventListener('visibilitychange',refreshDay);};
 },[state?.day,busy,spinning,view,practiceMode]);
 const post=useCallback(async(body:Record<string,unknown>,applyImmediately=true):Promise<PublicState>=>{
  setBusy(true);setError('');
  try {const r=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
    const data=await r.json();if(!r.ok)throw Error(data.error??'The request could not be completed.');
    if(alive.current&&applyImmediately)setState(data.state);return data.state as PublicState;
  }catch(e){if(alive.current)setError(e instanceof Error?e.message:'Something went wrong');throw e;}
  finally{if(alive.current)setBusy(false);}
 },[]);
 const latest=state?.games.at(-1);
 const current=practiceMode?state?.practice:latest;
 // The server commits the assigned game immediately, but we deliberately hold the
 // new public state until the wheel has stopped. No game name can leak into the
 // mission panel or CTA midway through the animation.
 const completeWheel=useCallback(()=>{
  if(spinTimer.current){clearTimeout(spinTimer.current);spinTimer.current=null;}
  const callback=finishWheel.current;
  finishWheel.current=null;
  if(alive.current)callback?.();
 },[]);
 const animateTo=useCallback((game:GameId,afterSpin:()=>void)=>{
  const index=GAMES.indexOf(game);
  const aim=-index*60;
  finishWheel.current=afterSpin;
  setWheelAngle(old=>Math.ceil((old-aim)/360)*360+aim+1800);
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The actual transitionend reveals the result. The timeout is only a fallback
  // for reduced motion or environments which don't deliver transition events.
  spinTimer.current=setTimeout(completeWheel,reducedMotion?120:3200);
 },[completeWheel]);
 const onWheelTransitionEnd=(event:TransitionEvent<HTMLDivElement>)=>{
  if(event.currentTarget===event.target&&event.propertyName==='transform'&&finishWheel.current)completeWheel();
 };
 const spin=async()=>{
  if(!state||busy||spinning||spinLock.current||state.spins>=2||!canSpin)return;
  spinLock.current=true;
  playSfx('spinStart');
  setSpinning(true);
  setPreviewGame(null);
  setReveal('');
  try {
   const updated=await post({action:'spin'},false);
   const trial=updated.games.at(-1);
   if(!trial)throw Error('No trial was assigned.');
   animateTo(trial.game,()=>{
    setState(updated);
    setSpinning(false);
    setReveal(GAME_META[trial.game].name);
    playSfx('land');
    spinLock.current=false;
   });
  }catch{spinLock.current=false;setSpinning(false);}
 };
 const previewSpin=()=>{
  if(!demo||spinning||busy||spinLock.current)return;
  spinLock.current=true;
  playSfx('spinStart');
  setSpinning(true);setReveal('');setPreviewGame(null);
  // Reviewer-only animation; no POST, reward or change to daily progress.
  const game=GAMES[Math.floor(Math.random()*GAMES.length)];
  animateTo(game,()=>{
   setPreviewGame(game);
   setReveal(GAME_META[game].name);
   playSfx('land');
   setSpinning(false);
   spinLock.current=false;
  });
 };
 const navigate=(target:View)=>{
  if(spinning||spinLock.current)return;
  setView(target);
  window.scrollTo({top:0,behavior:'auto'});
 };
 const playLatest=()=>{if(latest&&!spinning){setPracticeMode(false);navigate('trial');setReveal('');}};
 const practice=async(game:GameId)=>{
  if(spinning)return;
  try{await post({action:'practice-start',game});setPracticeMode(true);navigate('trial');setReveal('');setPreviewGame(null);}catch{}
 };
 const submit=async(answer:unknown)=>{
  const wasCleared=state?.cleared??false;
  const wasTrial=practiceMode?state?.practice:state?.games.at(-1);
  try {
   const next=await post({action:'submit',answer,practice:practiceMode});
   const updated=practiceMode?next.practice:next.games.at(-1);
   if(updated?.status==='won'&&wasTrial?.status!=='won')playSfx('correct');
   else if((updated?.status==='retry'||updated?.status==='lost')&&wasTrial?.status!==updated.status)playSfx('wrong');
   if(!practiceMode&&!wasCleared&&next.cleared){queuedEnding.current=Math.max(1,next.floor-1);}
  }catch{}
 };
 const retry=async()=>{try{await post({action:'retry',practice:practiceMode});}catch{}};
 const closeEnding=useCallback(()=>setEndingFloor(null),[]);
 const dismissIntro=useCallback(()=>{if(introTimer.current)clearTimeout(introTimer.current);setShowIntro(false);try{sessionStorage.setItem('tower-v15-intro','seen');}catch{}},[]);
 useEffect(()=>{
  if(!showIntro)return;
  const oldFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const oldOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const button=document.querySelector<HTMLButtonElement>('.arrival-skip');button?.focus();
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')dismissIntro();};
  document.addEventListener('keydown',onKey);
  return ()=>{document.body.style.overflow=oldOverflow;document.removeEventListener('keydown',onKey);oldFocus?.focus();};
 },[showIntro,dismissIntro]);
 const returnHome=()=>{
  navigate(practiceMode?'practice':'home');
  if(!practiceMode&&queuedEnding.current!==null){
   const floor=queuedEnding.current;queuedEnding.current=null;
   // This key only tracks whether the ceremony was displayed, never rewards.
   try{localStorage.setItem(`tower-ending-shown-${state?.day}-${floor}`,'yes');}catch{}
   setEndingReplay(false);setEndingDemo(false);setEndingFloor(floor);playSfx('floorClear');
  }
  setPracticeMode(false);
 };
 const showReplay=()=>{if(!state?.cleared)return;setEndingDemo(false);setEndingReplay(true);setEndingFloor(Math.max(1,state.floor-1));playSfx('floorClear');};
 const previewEnding=()=>{if(!demo)return;setEndingDemo(true);setEndingReplay(true);setEndingFloor(Math.max(1,state?.floorsCleared??1));playSfx('floorClear');};
 const openEndingChronicle=()=>{
  if(endingFloor!==null)setStoryFloor(endingFloor);
  setEndingFloor(null);navigate('story');
 };
 const won=state?.games.filter(g=>g.status==='won').length??0;
 const canSpin=!!state&&state.spins<2&&(state.spins===0||!!latest&&['won','lost'].includes(latest.status));
 const dateLabel=state?new Date(state.day+'T12:00:00Z').toLocaleDateString('en-US',{day:'numeric',month:'short',timeZone:'UTC'}):'';
 const shownFloor=state?(state.cleared?Math.max(1,state.floor-1):state.floor):1;
 const chapter=chapterFor(shownFloor);
 return <div className="app-shell">
  <div className="tot-world" aria-hidden="true"><div className="tot-world-art"/><div className="tot-world-veils"/><div className="tot-firefly one"/><div className="tot-firefly two"/><div className="tot-firefly three"/></div>
  {showIntro&&<div className="arrival" role="dialog" aria-modal="true" aria-label="Entering Tower of Trials">
   <div className="arrival-scene" aria-hidden="true"/>
   <div className="arrival-vignette" aria-hidden="true"/>
   <div className="arrival-gate" aria-hidden="true"><div className="arrival-door left"><span className="arrival-door-ring"/></div><div className="arrival-door right"><span className="arrival-door-ring"/></div></div>
   <div className="arrival-copy"><div className="arrival-sigil">✧</div><p className="arrival-kicker">THE FORGOTTEN GATE HAS AWAKENED</p><h1>Tower <em>of</em> Trials</h1><p>Enter the tower. Face two trials. Climb higher.</p><div className="arrival-progress"><span/></div></div>
   <button className="arrival-skip" onClick={dismissIntro}>Begin the ascent <span aria-hidden="true">↗</span></button>
  </div>}
  <header className="site-header"><button className="brand" disabled={spinning} onClick={()=>navigate('home')} aria-label="Tower of Trials home"><span className="brand-icon">♜</span><span>TOWER <i>OF</i> TRIALS</span></button>
   <div className="header-links"><button disabled={spinning} className={view==='home'?'active':''} onClick={()=>navigate('home')}>Tower</button><button disabled={spinning} className={view==='practice'?'active':''} onClick={()=>navigate('practice')}>Practice Hall</button><button disabled={spinning} className={view==='story'?'active':''} onClick={()=>{navigate('story');setStoryFloor(Math.max(1,state?.floorsCleared??1));}}>Story</button></div>
   <div className="header-progress"><span>✦ {state?.xp??0} XP</span><span>♨ {state?.streak??0} {state?.streak===1?'day':'days'}</span></div>

  </header>
   <AudioControls musicEnabled={musicEnabled} sfxEnabled={sfxEnabled} audioError={audioError} resumeAvailable={resumeAvailable} toggleMusic={toggleMusic} toggleSfx={toggleSfx}/>
  <main className="main-shell">
  {error&&<div className="error-banner" role="alert"><span>{error}</span><button onClick={()=>setError('')}>Dismiss</button></div>}
  {!state? <div className="loading-screen"><div className="loading-symbol">♜</div><p>{error?'The tower could not connect. Check your connection and try again.':'The tower is waking…'}</p><button className="outline-button" onClick={()=>window.location.reload()}>Try again</button></div> : <>
   {view==='home'&&<div className="home-screen">
    <div className="scene-eyebrow"><span className="dot"/> THE DAILY ASCENT <span className="scene-date">{dateLabel} · RESETS 00:00 UTC</span></div>
    <section className="hero-card"><div className="hero-text"><div className="mini-label"><span className="hero-rune">✧</span> CHAPTER {CHAPTERS.indexOf(chapter)+1} <span className="hero-dot">·</span> FLOOR {shownFloor.toString().padStart(2,'0')}</div><h1>{state.cleared?<>The gate <em>opens.</em></>:<>The tower <em>calls you.</em></>}</h1><p>{state.cleared?'The tower yields another secret. Above you, the next staircase waits in silence.':state.spins===0?'Beyond the gates, two trials guard your ascent. Spin the ancient wheel and face what awaits.':'One step closer to the heart of the tower. Finish today’s trials to unlock its secret.'}</p><div className="hero-chips"><span>✧ {chapter.name}</span><span>◎ {state.floorsCleared} {state.floorsCleared===1?'floor':'floors'} cleared</span></div></div><div className="hero-art"><div className="hero-art-scene" aria-hidden="true"/><div className="hero-art-glow" aria-hidden="true"/><button className="hero-story-hotspot" onClick={()=>navigate('story')} aria-label="Explore the tower Chronicle"><span aria-hidden="true">✧</span><small>THE CHRONICLE ↗</small></button><span className="hero-art-engraving" aria-hidden="true">THE ASCENT BEGINS</span></div></section>
    <div className="dashboard-grid"><section className="wheel-card"><div className="section-top"><div><div className="eyebrow">THE ORACLE WHEEL</div><h2>A trial awaits.</h2></div><span className="small-tag">{Math.max(0,2-state.spins)} SPINS LEFT</span></div>
      <p className="wheel-intro">A turn of fate reveals the next guardian.</p>
      <div className="wheel-area"><div className="altar-torch altar-torch-left" aria-hidden="true"/><div className="altar-torch altar-torch-right" aria-hidden="true"/><div className="wheel-pointer" aria-hidden="true"/><div className={`wheel ${spinning?'spinning':''}`} onTransitionEnd={onWheelTransitionEnd} style={{transform:`rotate(${wheelAngle}deg)`}} aria-label="Wheel with six games">
      {GAMES.map((g,i)=><div key={g} className="wheel-segment-label" style={{transform:`rotate(${i*60}deg) translateY(var(--label-shift)) rotate(${-i*60}deg)`}}><span>{GAME_META[g].glyph}</span><small>{GAME_META[g].name.split(' ')[0]}</small></div>)}<div className="wheel-hub">✧</div>
      </div></div>
      {spinning?<div className="status-panel" role="status">{busy?'Preparing your trial…':'The wheel is turning…'}</div>:reveal?<div className="result-preview" role="status"><span>{previewGame?'PRACTICE PREVIEW · NO XP':'TRIAL REVEALED'}</span><strong>{reveal}</strong><p>{reveal?TRIAL_DESCRIPTIONS[previewGame??latest?.game??'cipher']:''}</p><button className="action-button" onClick={()=>previewGame?void practice(previewGame):playLatest()}>{previewGame?'Practice this game →':'Enter trial →'}</button></div>:state.cleared?<div className="result-preview cleared-preview"><span>FLOOR {shownFloor} CLEARED ✧</span><strong>The gate opens.</strong><p>A hidden staircase rises from the shadows. Floor {state.floor} awaits tomorrow.</p><button className="outline-button" onClick={showReplay}>Replay ending · Read your story fragment ↗</button></div>:<>
       {canSpin?<button className="action-button full" onClick={spin} disabled={busy}>Spin the Wheel of Fate <span>✧</span></button>:
        latest?.status==='active'||latest?.status==='retry'?<button className="action-button full" onClick={playLatest}>Continue {GAME_META[latest.game].name} <span>→</span></button>:
        state.spins===2?<div className="status-panel"><strong>The tower rests for today.</strong><p>Your cleared floors are safe. Return after the daily reset to try again.</p></div>:<div className="status-panel">Your first trial must finish before spin two.</div>}
       <p className="microcopy">Two spins. Two unique trials. No rerolls.</p></>}
      {demo&&!spinning&&<div className="demo-actions"><button className="demo-spin" disabled={busy} onClick={previewSpin}>↻ Preview wheel spin · no XP</button><button className="demo-spin" disabled={busy} onClick={previewEnding}>✧ Preview floor ending · no XP</button></div>}
     </section>
     <section className="mission-card"><div className="section-top"><div><div className="eyebrow">TODAY’S MISSION · FLOOR {shownFloor.toString().padStart(2,'0')}</div><h2>Conquer two trials</h2></div><div className="completion-circle">{won}/2</div></div>
     <div className="mission-progress" role="progressbar" aria-label="Completed daily trials" aria-valuenow={won} aria-valuemin={0} aria-valuemax={2}><div style={{width:`${won*50}%`}}/></div>
     {[0,1].map(i=>{const t=state.games[i];return <div className="mission-row" key={i}><span className={`mission-number ${t?.status==='won'?'done':''}`}>{t?.status==='won'?'✓':i+1}</span><div className="mission-description"><strong>{t?GAME_META[t.game].name:`Trial ${i+1}`}</strong><small>{t?t.status==='won'?'Conquered · +40 XP':t.status==='lost'?'Sealed for today · 0 XP':t.status==='retry'?'New attempt ready':'In progress':'Awaiting the wheel'}</small></div><span className="mission-symbol">{t?GAME_META[t.game].glyph:'⌁'}</span></div>;})}
     <div className="reward-strip"><span><strong>+40 XP</strong> per trial<br/><strong>+20 XP</strong> floor bonus</span><div><span>UP TO</span><strong>100 XP</strong></div></div>
     <p className="mission-note">{state.cleared?'✦ The tower recognizes your victory.':state.spins===2&&state.games.some(t=>t.status==='lost')?'A failed floor remains unfinished. Your previous floors are safe.':'Clear both trials to climb one floor. Your streak needs a full clear.'}</p>
     </section></div>
     <section className="bottom-band"><div><div className="eyebrow">BEYOND THE WHEEL</div><h2>Train in the Practice Hall.</h2><p>All six trials are open. Practice without using spins or XP.</p></div><button className="outline-button" onClick={()=>navigate('practice')}>Explore six trials ↗</button></section>
   </div>}
   {view==='practice'&&<section className="library-page practice-world"><div className="environment-banner practice-banner"><div className="environment-banner-art" aria-hidden="true"/><div className="environment-banner-copy"><div className="eyebrow">THE PRACTICE HALL</div><h1>Master the six trials<span className="gold-mark">.</span></h1><p className="page-intro">Train freely. No spins, XP, or streaks are affected.</p></div></div><div className="game-collection">{GAMES.map((g,i)=><article className="game-tile" key={g} style={{'--game-accent':COLORS[i]} as CSSProperties}><div className="game-tile-art" style={{backgroundImage:`linear-gradient(0deg,#071321 0%,transparent 62%),url(/art/trial-${g}.webp)`}} aria-hidden="true"/><div className="game-tile-header"><span className="game-tile-icon">{GAME_META[g].glyph}</span><span className="skill">{GAME_META[g].skill}</span></div><h2>{GAME_META[g].name}</h2><p>{TRIAL_DESCRIPTIONS[g]}</p><button className="tile-button" disabled={busy} onClick={()=>void practice(g)}>Practice this trial <span>↗</span></button></article>)}</div><p className="practice-note">Practice is for discovery. Daily rewards come only from the Wheel of Fate.</p></section>}
   {view==='story'&&<section className="library-page story-page"><div className="environment-banner chronicle-banner"><div className="environment-banner-art" aria-hidden="true"/><div className="environment-banner-copy"><div className="eyebrow">THE CHRONICLE</div><h1>The tower remembers<span className="gold-mark">.</span></h1><p className="page-intro">Every cleared floor reveals a fragment of the tower’s forgotten history.</p></div></div>
    <button className="replay-entrance" onClick={()=>{setShowIntro(true);if(introTimer.current)clearTimeout(introTimer.current);introTimer.current=setTimeout(()=>setShowIntro(false),3100);}}>✧ Replay the gate opening</button>
    <div className="story-layout"><div className="story-list">{CHAPTERS.map((c,i)=>{const locked=!demo&&state.floorsCleared<c.start;return <button key={c.name} className={`chapter-select ${storyFloor>=c.start&&storyFloor<=c.end?'selected':''}`} disabled={locked&&i!==0} onClick={()=>setStoryFloor(c.start)}><span className="chapter-thumbnail" aria-hidden="true"/><span>CHAPTER {i+1}</span><strong>{c.name}</strong><small>Floors {c.start}–{c.end} · {locked?'SEALED':'REVEALED'}</small></button>;})}</div>
    <article className="story-content"><div className="story-paper-seal" aria-hidden="true">✧</div><div className="mini-label">{demo?'STORY PREVIEW · NO PROGRESS CHANGES':`FLOOR ${storyFloor.toString().padStart(2,'0')}`}</div><h2>{storyTitleForFloor(storyFloor)}</h2><div className="story-emblem" aria-hidden="true">♜</div>
    {demo||storyFloor<=state.floorsCleared?<><p className="chronicle-story">“{endingForFloor(storyFloor)}”</p><span className="story-badge">✧ REVEALED</span></>:<><p className="chronicle-story locked-story">Clear this floor to reveal its story.</p><span className="story-badge">⌁ SEALED</span></>}
    <div className="story-nav"><button className="outline-button" onClick={()=>setStoryFloor(f=>Math.max(1,f-1))} disabled={storyFloor<=1}>← Previous floor</button><button className="outline-button" onClick={()=>setStoryFloor(f=>Math.min(demo?25:Math.max(1,state.floorsCleared+1),f+1))} disabled={storyFloor>=(demo?25:Math.max(1,state.floorsCleared+1))}>Next floor →</button></div>{demo&&<p className="demo-note">This is a preview. It cannot unlock floors or award XP.</p>}</article></div>
   </section>}
   {view==='trial'&&current&&<GameStage key={`${practiceMode?'practice':'daily'}-${current.game}-${current.attempt}-${state.day}`} trial={current} practice={practiceMode} pending={busy} onSubmit={submit} onRetry={retry} onPracticeAgain={()=>practice(current.game)} onBack={returnHome}/>}
   {view==='trial'&&!current&&<button onClick={()=>setView('home')}>Return to tower</button>}
  </>}
  </main>
  {endingFloor!==null&&state&&<TowerEnding floor={endingFloor} xp={state.xp} streak={state.streak} isReplay={endingReplay} isPreview={endingDemo} onClose={closeEnding} onOpenStory={openEndingChronicle}/>}
  <footer className="site-footer"><span>♜ TOWER OF TRIALS</span><span>XP and stars are virtual achievements, not money.</span><span>Built for the everyday climb.</span></footer>
 </div>;
}
