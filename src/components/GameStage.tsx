'use client';
import {useEffect,useState} from 'react';
import { GAME_META, SYMBOLS, type PublicTrial, type PublicPuzzle } from '@/lib/tower';

const INSTRUCTIONS={
 cipher:'Choose four different symbols. Green means the right spot; gold means the wrong spot.',
 ghost:'Watch five tiles light up. Tap them back in the same order.',
 shift:'Study the nine symbols. When they shift, tap the one that changed.',
 circuit:'Tap to rotate tiles. Connect the left gate to the right gate.',
 lightning:'Tap the numbers from 1 to 9 in order. Accuracy comes first.',
 forge:'Choose two stones that add up to the target. Complete three sums.',
} as const;

type Props={trial:PublicTrial;practice:boolean;pending:boolean;onSubmit:(answer:unknown)=>Promise<void>;onRetry:()=>Promise<void>;onPracticeAgain:()=>Promise<void>;onBack:()=>void};

export default function GameStage({trial,practice,pending,onSubmit,onRetry,onPracticeAgain,onBack}:Props){
 const meta=GAME_META[trial.game];
 return <section className="trial-page" aria-label={meta.name}>
  <div className="trail-nav"><button className="text-button" onClick={onBack}>← {practice?'Practice Hall':'Back to tower'}</button><span className="pill">{practice?'PRACTICE · NO XP':`ATTEMPT ${trial.attempt} OF 3`}</span></div>
  <div className="trial-heading"><div className="trial-glyph" aria-hidden="true">{meta.glyph}</div><div><div className="eyebrow">{meta.skill} TRIAL</div><h1>{meta.name}</h1><p>{INSTRUCTIONS[trial.game]}</p></div></div>
  <div className={`game-panel ${pending?'game-panel-pending':''}`} aria-busy={pending}>
   {pending&&<div className="trial-verify-strip" role="status" aria-live="polite"><span className="trial-verify-spinner" aria-hidden="true"/><div><strong>{trial.status==='active'?'Checking your answer…':'Preparing your next puzzle…'}</strong><small>The tower is verifying your trial.</small></div></div>}
   {trial.status==='active' ? <>
    {trial.puzzle.kind==='cipher'&&<Cipher key={trial.attempt} puzzle={trial.puzzle} pending={pending} onSubmit={onSubmit}/>}
    {trial.puzzle.kind==='ghost'&&<Ghost key={trial.attempt} puzzle={trial.puzzle} pending={pending} onSubmit={onSubmit}/>}
    {trial.puzzle.kind==='shift'&&<Shift key={trial.attempt} puzzle={trial.puzzle} pending={pending} onSubmit={onSubmit}/>}
    {trial.puzzle.kind==='circuit'&&<Circuit key={trial.attempt} puzzle={trial.puzzle} pending={pending} onSubmit={onSubmit}/>}
    {trial.puzzle.kind==='lightning'&&<Lightning key={trial.attempt} puzzle={trial.puzzle} pending={pending} onSubmit={onSubmit}/>}
    {trial.puzzle.kind==='forge'&&<Forge key={trial.attempt} puzzle={trial.puzzle} pending={pending} onSubmit={onSubmit}/>}
   </> : <div className="outcome" data-status={trial.status} aria-live="polite"><span className="outcome-icon" aria-hidden="true">{trial.status==='won'?'✧':trial.status==='retry'?'↻':'✕'}</span>
     <div className="eyebrow">{trial.status==='won'?'THE TOWER RECOGNIZES YOU':trial.status==='retry'?'A NEW CHANCE AWAITS':'THE GATE IS SEALED'}</div>
     <h2>{trial.status==='won'?'Trial conquered.':trial.status==='lost'?'The door is sealed.':'The trial resists you.'}</h2>
     <p>{trial.status==='won'?(practice?'Your skill grows stronger.':'The tower recognizes your victory.'):trial.status==='lost'?'No attempts remain for this trial today. Your earlier progress is safe.':'The chamber reforms. A different puzzle awaits.'}</p>
     <div className="outcome-reward">{trial.status==='won'?(practice?'Practice complete · No XP awarded.':'+40 XP secured.'):(trial.status==='retry'?`${Math.max(0,3-trial.attempt)} attempts left.`:'The next spin is still available if you have one left.')}</div>
     {trial.status==='won'&&!practice&&<div className="cosmetic-stars" aria-label={`${trial.stars??1} of 3 cosmetic stars`}>{'★'.repeat(trial.stars??1)}{'☆'.repeat(3-(trial.stars??1))}<small>Stars mark performance. They do not change XP.</small></div>}
     {trial.status==='retry'&&<button disabled={pending} className="action-button" onClick={onRetry}>Try a new puzzle →</button>}
     {trial.status==='won'&&practice&&<button disabled={pending} className="action-button" onClick={onPracticeAgain}>Practice again ↗</button>}
     {trial.status==='lost'&&practice&&<button disabled={pending} className="action-button" onClick={onPracticeAgain}>Start a new practice ↗</button>}
     <button className="outline-button" disabled={pending} onClick={onBack}>Return {practice?'to Practice Hall':'to tower'}</button>
    </div>}
  </div>
  <p className="fineprint">{practice?'Practice attempts are unlimited and never affect your daily rewards.':'Complete the trial within three attempts. Points are issued by the server only once.'}</p>
 </section>;
}

type SubProps<T extends PublicPuzzle>={puzzle:T;pending:boolean;onSubmit:(answer:unknown)=>Promise<void>};
function Cipher({puzzle,pending,onSubmit}:SubProps<Extract<PublicPuzzle,{kind:'cipher'}>>){
 const [guess,setGuess]=useState<number[]>([]);
 const add=(i:number)=>setGuess(g=>g.length<4&&!g.includes(i)?[...g,i]:g);
 const submit=()=>{if(guess.length===4&&!pending){setGuess([]);void onSubmit(guess);}};
 return <div className="game-inner"><div className="game-caption"><span>SECRET CODE</span><span>{puzzle.guesses.length}/6 GUESSES</span></div>
 <div className="guess-grid">{Array.from({length:6},(_,row)=>{
   const existing=puzzle.guesses[row];const values=existing?.values??(row===puzzle.guesses.length?guess:[]);
   return <div className="guess-row" key={row}>{Array.from({length:4},(_,i)=><div className={`guess-cell ${existing?.feedback[i]??(values[i]!==undefined?'selected':'')}`} key={i}>{values[i]!==undefined?SYMBOLS[values[i]]:''}</div>)}</div>
 })}</div>
 <div className="symbol-picker" aria-label="Choose four distinct symbols">{puzzle.symbols.map((symbol,i)=><button aria-label={`Add symbol ${symbol}`} className="symbol-button" key={i} onClick={()=>add(i)} disabled={pending||guess.includes(i)}>{symbol}</button>)}</div>
 <div className="game-actions"><button className="outline-button" disabled={pending||!guess.length} onClick={()=>setGuess(g=>g.slice(0,-1))}>Undo</button><button className="action-button" disabled={pending||guess.length!==4} onClick={submit}>Check code →</button></div>
 <p className="game-hint"><b className="legend-dot exact"/> right position <b className="legend-dot present"/> wrong position <b className="legend-dot absent"/> not in code</p></div>;
}
function Ghost({puzzle,pending,onSubmit}:SubProps<Extract<PublicPuzzle,{kind:'ghost'}>>){
 const [phase,setPhase]=useState<'ready'|'show'|'input'>('ready');const [lit,setLit]=useState(-1);const [entered,setEntered]=useState<number[]>([]);
 useEffect(()=>{if(phase!=='show')return;const timers:ReturnType<typeof setTimeout>[]=[];
  puzzle.path.forEach((cell,i)=>{timers.push(setTimeout(()=>setLit(cell),400+i*670));timers.push(setTimeout(()=>setLit(-1),900+i*670));});
  timers.push(setTimeout(()=>{setLit(-1);setPhase('input');},650+puzzle.path.length*670));return ()=>timers.forEach(clearTimeout);
 },[phase,puzzle.path]);
 const tap=(i:number)=>{if(phase!=='input'||pending||entered.includes(i))return;const path=[...entered,i];setEntered(path);if(path.length===puzzle.path.length)void onSubmit(path);};
 return <div className="game-inner"><div className="game-caption"><span>THE VANISHING PATH</span><span>{phase==='input'?`${entered.length} / ${puzzle.path.length} STEPS`:'4 × 4 GRID'}</span></div>
 <div className="memory-grid">{Array.from({length:16},(_,i)=><button key={i} type="button" disabled={phase!=='input'||pending||entered.includes(i)} aria-label={`Path tile ${i+1}`} onClick={()=>tap(i)} className={`memory-cell ${lit===i?'lit':''} ${entered.includes(i)?'chosen':''}`}><span>{entered.includes(i)?entered.indexOf(i)+1:lit===i?'✧':'·'}</span></button>)}</div>
 <div className="game-actions centered">{phase==='ready'&&<button className="action-button" onClick={()=>setPhase('show')}>Reveal the trail →</button>}{phase==='show'&&<div className="status-label">Watch the glowing stones…</div>}{phase==='input'&&<div className="status-label">Follow the path in the exact order</div>}</div></div>;
}
function Shift({puzzle,pending,onSubmit}:SubProps<Extract<PublicPuzzle,{kind:'shift'}>>){
 const [phase,setPhase]=useState<'ready'|'study'|'pick'>('ready');
 useEffect(()=>{if(phase!=='study')return;const t=setTimeout(()=>setPhase('pick'),3200);return ()=>clearTimeout(t);},[phase]);
 const shown=phase==='pick'?puzzle.after:puzzle.before;
 return <div className="game-inner"><div className="game-caption"><span>THE CHANGING CHAMBER</span><span>{phase==='study'?'MEMORIZE':phase==='pick'?'FIND THE CHANGE':'READY'}</span></div>
 <div className="observation-grid">{shown.map((shape,i)=><button className="observation-cell" type="button" key={i} disabled={phase!=='pick'||pending} aria-label={`Symbol in position ${i+1}`} onClick={()=>void onSubmit(i)}>{SYMBOLS[shape]}</button>)}</div>
 <div className="game-actions centered">{phase==='ready'&&<button className="action-button" onClick={()=>setPhase('study')}>Study the symbols →</button>}{phase==='study'&&<div className="status-label">Remember this board. One symbol will change.</div>}{phase==='pick'&&<div className="status-label">Tap the one tile that changed.</div>}</div></div>;
}
function tileGlyph(ports:number[],rotation:number){const p=ports.map(x=>(x+rotation)%4).sort().join(',');return ({'0,2':'│','1,3':'─','0,1':'└','1,2':'┌','2,3':'┐','0,3':'┘'} as Record<string,string>)[p]??'╋';}
function Circuit({puzzle,pending,onSubmit}:SubProps<Extract<PublicPuzzle,{kind:'circuit'}>>){
 const [rotations,setRotations]=useState(puzzle.tiles.map(t=>t.rotation));
 const rotate=(i:number)=>setRotations(r=>r.map((v,j)=>j===i?(v+1)%4:v));
 return <div className="game-inner"><div className="game-caption"><span>REPAIR THE ENERGY PATH</span><span>TAP TO ROTATE</span></div><div className="circuit-wrapper"><span className="connector left">IN →</span><div className="circuit-grid">{puzzle.tiles.map((tile,i)=><button key={i} type="button" disabled={pending} aria-label={`Rotate circuit tile ${i+1}`} className="circuit-cell" onClick={()=>rotate(i)}>{tileGlyph(tile.ports,rotations[i])}</button>)}</div><span className="connector right">→ OUT</span></div>
 <p className="game-hint">Connect the left gate to the right gate through matching rune ends.</p><div className="game-actions"><button className="outline-button" disabled={pending} onClick={()=>setRotations(puzzle.tiles.map(t=>t.rotation))}>Reset</button><button className="action-button" disabled={pending} onClick={()=>void onSubmit(rotations)}>Activate circuit →</button></div></div>;
}
function Lightning({puzzle,pending,onSubmit}:SubProps<Extract<PublicPuzzle,{kind:'lightning'}>>){
 const [selected,setSelected]=useState<number[]>([]);
 const tap=(i:number)=>{if(pending||selected.includes(i))return;const next=[...selected,i];setSelected(next);
  if(puzzle.numbers[i]!==next.length||next.length===9){const others=Array.from({length:9},(_,k)=>k).filter(k=>!next.includes(k));void onSubmit([...next,...others]);}
 };
 return <div className="game-inner"><div className="game-caption"><span>FAST HANDS, SHARP EYES</span><span>{selected.length}/9 TAPPED</span></div><div className="number-grid">{puzzle.numbers.map((n,i)=><button key={i} disabled={pending||selected.includes(i)} className={`number-cell ${selected.includes(i)?'chosen':''}`} onClick={()=>tap(i)}>{n}</button>)}</div><p className="game-hint">Tap 1, then 2, then 3 — all the way to 9. A wrong tap ends this attempt.</p></div>;
}
function Forge({puzzle,pending,onSubmit}:SubProps<Extract<PublicPuzzle,{kind:'forge'}>>){
 const [round,setRound]=useState(0);const [selected,setSelected]=useState<number[]>([]);const [answers,setAnswers]=useState<number[][]>([]);
 const pick=(i:number)=>{if(pending||selected.includes(i))return;
  if(selected.length===0){setSelected([i]);return;}
  const pair=[selected[0],i],next=[...answers,pair];setAnswers(next);setSelected([]);
  if(round===2)void onSubmit(next);else setRound(r=>r+1);
 };
 return <div className="game-inner"><div className="game-caption"><span>FORGE THE KEY</span><span>ROUND {round+1}/3</span></div><div className="forge-target"><span>TARGET SUM</span><strong>{puzzle.rounds[round].target}</strong></div><div className="stone-grid">{puzzle.rounds[round].stones.map((n,i)=><button key={`${round}-${i}`} disabled={pending||selected.includes(i)} onClick={()=>pick(i)} className={`stone ${selected.includes(i)?'picked':''}`}>{n}</button>)}</div><p className="game-hint">Pick two stones that add up to the target. Solve three sums to forge your key.</p></div>;
}
