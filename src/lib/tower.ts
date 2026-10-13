/** Pure, deterministic gameplay and progression. All reward mutations execute on the server. */
export const GAMES = ['cipher','ghost','shift','circuit','lightning','forge'] as const;
export type GameId = typeof GAMES[number];
export const GAME_META: Record<GameId, { name: string; skill: string; glyph: string; help: string }> = {
  cipher: { name: 'Cipher Lock', skill: 'LOGIC', glyph: '◇', help: 'Guess the four-symbol code in six guesses.' },
  ghost: { name: 'Ghost Trail', skill: 'MEMORY', glyph: '〰', help: 'Remember and repeat the glowing path.' },
  shift: { name: 'Shifting Chamber', skill: 'OBSERVATION', glyph: '✦', help: 'Spot which symbol changed.' },
  circuit: { name: 'Rune Circuit', skill: 'SPATIAL', glyph: '⌁', help: 'Rotate runes to connect the energy gates.' },
  lightning: { name: 'Lightning Order', skill: 'SPEED', glyph: 'ϟ', help: 'Tap the numbers in ascending order.' },
  forge: { name: 'Sum Forge', skill: 'NUMBERS', glyph: '∑', help: 'Find two stones that add to the target.' },
};
export const SYMBOLS = ['◆','●','▲','✦','■','⬡'] as const;
export type Feedback = 'exact' | 'present' | 'absent';
export type Guess = { values: number[]; feedback: Feedback[] };
export type Tile = { ports: number[]; rotation: number };
export type ForgeRound = { stones: number[]; target: number };
export type Puzzle =
  | { kind:'cipher'; secret:number[] }
  | { kind:'ghost'; path:number[] }
  | { kind:'shift'; before:number[]; after:number[]; changed:number }
  | { kind:'circuit'; tiles:Tile[] }
  | { kind:'lightning'; numbers:number[] }
  | { kind:'forge'; rounds:ForgeRound[] };
export type TrialStatus = 'active'|'retry'|'won'|'lost';
export type Trial = { game:GameId; status:TrialStatus; attempt:number; puzzle:Puzzle; startedAt:number; guesses:Guess[]; rewarded?:boolean; stars?:number };
export type Day = { pair:[GameId,GameId]; spins:number; trials:Trial[]; cleared:boolean };
export type Player = { days:Record<string,Day>; xp:number; floorsCleared:number; practice?:Trial };
export type PublicPuzzle =
  | {kind:'cipher'; guesses:Guess[]; symbols:readonly string[]}
  | {kind:'ghost'; path:number[]}
  | {kind:'shift'; before:number[]; after:number[]}
  | {kind:'circuit'; tiles:Tile[]}
  | {kind:'lightning'; numbers:number[]}
  | {kind:'forge'; rounds:ForgeRound[]};
export type PublicTrial = Omit<Trial, 'puzzle'> & {puzzle:PublicPuzzle};
export type PublicState = { day:string; xp:number; floor:number; floorsCleared:number; streak:number; spins:number; games:PublicTrial[]; cleared:boolean; practice?:PublicTrial; history:{day:string; won:boolean}[] };
export const newPlayer = ():Player => ({days:{},xp:0,floorsCleared:0});
export function dayKey(date=new Date()):string {return date.toISOString().slice(0,10);}
export function previousDay(day:string):string {const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);return dayKey(d);}
export function hashSeed(input:string):number {let h=2166136261;for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
export function rng(seed:number):()=>number {let s=seed>>>0;return ()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};}
function shuffle<T>(items:T[],random:()=>number):T[] {for(let i=items.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;}
function sample<T>(values:readonly T[],random:()=>number):T {return values[Math.floor(random()*values.length)];}
const samePair=(a:readonly GameId[],b:readonly GameId[])=>a.slice().sort().join()===b.slice().sort().join();
/** Server-only secret must be supplied by caller; game pair cannot change after it is saved. */
export function pairForDay(secret:string,uid:string,day:string,yesterday?:readonly GameId[]):[GameId,GameId] {
  const random=rng(hashSeed(`${secret}|wheel|${uid}|${day}`));
  const candidates: [GameId,GameId][]=[];
  for(let i=0;i<GAMES.length;i++)for(let j=i+1;j<GAMES.length;j++){
    const pair:[GameId,GameId]=[GAMES[i],GAMES[j]];
    if(!yesterday||!samePair(pair,yesterday))candidates.push(pair);
  }
  return shuffle([...sample(candidates,random)],random) as [GameId,GameId];
}
const DIRECTIONS=[[-1,0],[0,1],[1,0],[0,-1]];
function neighbor(index:number,dir:number,size:number):number {
  const y=Math.floor(index/size)+DIRECTIONS[dir][0],x=index%size+DIRECTIONS[dir][1];
  return y>=0&&x>=0&&y<size&&x<size?y*size+x:-1;
}
function ports(tile:Tile,rotation:number=tile.rotation):number[] {return tile.ports.map(p=>(p+rotation)%4);}
export function circuitSolved(tiles:readonly Tile[],rotations:readonly number[]):boolean {
  if(tiles.length!==9||rotations.length!==9||rotations.some(r=>!Number.isInteger(r)||r<0||r>3))return false;
  const start=3,end=5;
  if(!ports(tiles[start],rotations[start]).includes(3)||!ports(tiles[end],rotations[end]).includes(1))return false;
  const visited=new Set([start]),todo=[start];
  while(todo.length){const i=todo.pop()!;if(i===end)return true;
    for(const dir of ports(tiles[i],rotations[i])){
      const n=neighbor(i,dir,3);
      if(n>=0&&!visited.has(n)&&ports(tiles[n],rotations[n]).includes((dir+2)%4)) {visited.add(n);todo.push(n);}
    }
  }
  return false;
}
const CIRCUIT_ROUTES=[
  [3,4,5],
  [3,0,1,2,5],
  [3,6,7,8,5],
  [3,0,1,4,7,8,5],
];
function makeCircuit(random:()=>number):Tile[] {
  const path=sample(CIRCUIT_ROUTES,random);
  const tiles:Tile[]=Array.from({length:9},()=>({ports:[0,1],rotation:Math.floor(random()*4)}));
  for(let i=0;i<path.length;i++){
    const current=path[i],before=i===0?-1:path[i-1],after=i===path.length-1?-1:path[i+1];
    const dirs=[before<0?3:direction(current,before),after<0?1:direction(current,after)];
    // Rotation-free absolute directions are the canonical solution; randomize the initial rotations later.
    tiles[current]={ports:dirs,rotation:0};
  }
  for(let i=0;i<9;i++)tiles[i].rotation=Math.floor(random()*4);
  if(circuitSolved(tiles,tiles.map(t=>t.rotation))){tiles[path[0]].rotation=(tiles[path[0]].rotation+1)%4;}
  return tiles;
}
function direction(a:number,b:number):number {const dy=Math.floor(b/3)-Math.floor(a/3),dx=b%3-a%3;return DIRECTIONS.findIndex(([y,x])=>y===dy&&x===dx);}
function makeGhost(random:()=>number):number[] {
  const path=[Math.floor(random()*16)];
  while(path.length<5){const current=path[path.length-1];const neighbors=[0,1,2,3].map(d=>neighbor(current,d,4)).filter(n=>n>=0&&!path.includes(n));
    if(!neighbors.length)return makeGhost(random);path.push(sample(neighbors,random));}
  return path;
}
function makeShift(random:()=>number):Puzzle {
  const before=Array.from({length:9},()=>Math.floor(random()*6));const after=[...before];
  const changed=Math.floor(random()*9);after[changed]=(after[changed]+1+Math.floor(random()*5))%6;
  return {kind:'shift',before,after,changed};
}
function makeForge(random:()=>number):ForgeRound[] {return Array.from({length:3},()=>{
  const stones=Array.from({length:6},()=>1+Math.floor(random()*9));const indices=shuffle([0,1,2,3,4,5],random);
  return {stones,target:stones[indices[0]]+stones[indices[1]]};
});}
export function puzzleFor(secret:string,uid:string,day:string,game:GameId,attempt:number):Puzzle {
  const random=rng(hashSeed(`${secret}|puzzle|${uid}|${day}|${game}|${attempt}`));
  switch(game){
    case 'cipher':return {kind:'cipher',secret:shuffle([0,1,2,3,4,5],random).slice(0,4)};
    case 'ghost':return {kind:'ghost',path:makeGhost(random)};
    case 'shift':return makeShift(random);
    case 'circuit':return {kind:'circuit',tiles:makeCircuit(random)};
    case 'lightning':return {kind:'lightning',numbers:shuffle([1,2,3,4,5,6,7,8,9],random)};
    case 'forge':return {kind:'forge',rounds:makeForge(random)};
  }
}
export function publicTrial(trial:Trial):PublicTrial {
  const {puzzle,...rest}=trial;
  let pub:PublicPuzzle;
  switch(puzzle.kind){
    case 'cipher':pub={kind:'cipher',guesses:trial.guesses.map(g=>({values:g.values,feedback:g.feedback})),symbols:SYMBOLS};break;
    case 'ghost':pub={kind:'ghost',path:puzzle.path};break;
    case 'shift':pub={kind:'shift',before:puzzle.before,after:puzzle.after};break;
    case 'circuit':pub={kind:'circuit',tiles:puzzle.tiles};break;
    case 'lightning':pub={kind:'lightning',numbers:puzzle.numbers};break;
    case 'forge':pub={kind:'forge',rounds:puzzle.rounds};break;
  }
  return {...rest,puzzle:pub};
}
export function streakFor(days:Record<string,Day>,today:string):number {
  let cursor=days[today]?.cleared?today:previousDay(today),count=0;
  const max=Object.keys(days).length;
  while(count<max&&days[cursor]?.cleared){count++;cursor=previousDay(cursor);}
  return count;
}
export function publicState(player:Player,today:string):PublicState {
  const d=player.days[today];
  return {day:today,xp:player.xp,floor:player.floorsCleared+1,floorsCleared:player.floorsCleared,streak:streakFor(player.days,today),spins:d?.spins??0,games:d?.trials.map(publicTrial)??[],cleared:d?.cleared??false,practice:player.practice?publicTrial(player.practice):undefined,history:Object.keys(player.days).sort().reverse().slice(0,12).map(day=>({day,won:player.days[day].cleared}))};
}
export function makeTrial(secret:string,uid:string,day:string,game:GameId,attempt:number,now:number):Trial {
  return {game,status:'active',attempt,startedAt:now,guesses:[],puzzle:puzzleFor(secret,uid,day,game,attempt)};
}
export function evaluateCode(secret:readonly number[],guess:readonly number[]):Feedback[] {
  return guess.map((v,i)=>v===secret[i]?'exact':secret.includes(v)?'present':'absent');
}
function isArrayOfInts(a:unknown,length:number,min:number,max:number):a is number[] {
  return Array.isArray(a)&&a.length===length&&a.every(v=>Number.isInteger(v)&&v>=min&&v<=max);
}
export function validAnswer(puzzle:Puzzle,answer:unknown):boolean {
  if(puzzle.kind==='cipher')return isArrayOfInts(answer,4,0,5)&&new Set(answer).size===4;
  if(puzzle.kind==='ghost')return isArrayOfInts(answer,5,0,15);
  if(puzzle.kind==='shift')return Number.isInteger(answer)&&typeof answer==='number'&&answer>=0&&answer<=8;
  if(puzzle.kind==='circuit')return isArrayOfInts(answer,9,0,3);
  if(puzzle.kind==='lightning')return isArrayOfInts(answer,9,0,8)&&new Set(answer).size===9;
  if(puzzle.kind==='forge')return Array.isArray(answer)&&answer.length===3&&answer.every(a=>isArrayOfInts(a,2,0,5)&&a[0]!==a[1]);
  return false;
}
export function answerCorrect(puzzle:Puzzle,answer:unknown):boolean {
  if(!validAnswer(puzzle,answer))return false;
  switch(puzzle.kind){
    case 'cipher':return (answer as number[]).every((v,i)=>v===puzzle.secret[i]);
    case 'ghost':return (answer as number[]).every((v,i)=>v===puzzle.path[i]);
    case 'shift':return answer===puzzle.changed;
    case 'circuit':return circuitSolved(puzzle.tiles,answer as number[]);
    case 'lightning':return (answer as number[]).every((v,i)=>puzzle.numbers[v]===i+1);
    case 'forge':return (answer as number[][]).every(([a,b],i)=>puzzle.rounds[i].stones[a]+puzzle.rounds[i].stones[b]===puzzle.rounds[i].target);
  }
}
const MIN_MS:Record<GameId,number>={cipher:300,ghost:3700,shift:2600,circuit:1100,lightning:950,forge:950};
export function minimumDuration(game:GameId):number{return MIN_MS[game];}
export function applyAnswer(trial:Trial,answer:unknown,now:number):'correct'|'incorrect'|'continue' {
  if(trial.status!=='active')throw new Error('This attempt is no longer active.');
  if(!validAnswer(trial.puzzle,answer))throw new Error('Invalid answer format.');
  // Only implausibly fast *winning* submissions are blocked. A quick wrong tap may still use an attempt.
  if(answerCorrect(trial.puzzle,answer)&&now-trial.startedAt<MIN_MS[trial.game])throw new Error('Too fast. Take a moment to view the puzzle.');
  if(trial.puzzle.kind==='cipher'){
    const values=answer as number[];
    const feedback=evaluateCode(trial.puzzle.secret,values);
    trial.guesses.push({values,feedback});
    if(feedback.every(v=>v==='exact')){trial.status='won';return 'correct';}
    if(trial.guesses.length<6)return 'continue';
  }else if(answerCorrect(trial.puzzle,answer)){
    trial.status='won';return 'correct';
  }
  trial.status=trial.attempt>=3?'lost':'retry';
  return 'incorrect';
}
export function commitWin(player:Player,day:string,trial:Trial,practice:boolean):void {
  if(practice||trial.status!=='won')return;
  const d=player.days[day];
  if(!d||!d.trials.includes(trial))throw new Error('Invalid daily trial.');
  // Row locking plus this flag prevents duplicate rewards even if the caller replays commitWin.
  if(trial.rewarded)return;
  trial.rewarded=true;
  trial.stars=Math.max(1,4-trial.attempt); // Cosmetic only: 3/2/1 based on attempt count.
  player.xp+=40;
  if(!d.cleared&&d.trials.length===2&&d.trials.every(t=>t.status==='won')){
    d.cleared=true;player.xp+=20;player.floorsCleared++;
  }
}
export const CHAPTERS=[
  {name:'The Forgotten Gate',start:1,end:5,story:'The tower has slept for a thousand years. Two trials guard every staircase. The wheel has chosen you.'},
  {name:'The Hall of Echoes',start:6,end:10,story:'Whispers follow your steps. Every solved trial returns another memory to the tower.'},
  {name:'The Clockwork Keep',start:11,end:15,story:'Behind the stone walls, ancient gears turn. Someone built the trials for a reason.'},
  {name:'The Celestial Spire',start:16,end:25,story:'Above the clouds, the final lamps wait to be lit. Keep climbing.'},
];
export function chapterFor(floor:number){return CHAPTERS.find(c=>floor<=c.end)??CHAPTERS[CHAPTERS.length-1];}
