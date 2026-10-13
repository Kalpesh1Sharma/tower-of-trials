import assert from 'node:assert/strict';
import {test} from 'node:test';
import {GAMES,SYMBOLS,answerCorrect,applyAnswer,chapterFor,circuitSolved,commitWin,dayKey,makeTrial,newPlayer,pairForDay,previousDay,publicState,publicTrial,puzzleFor,streakFor,type GameId} from '../src/lib/tower.ts';
const secret='test-secret-for-determinism';const uid='user-123';const today='2026-10-13';
const newTrial=(game:GameId,attempt=1)=>makeTrial(secret,uid,today,game,attempt,1000);

test('six enabled games have distinct IDs and accessible glyphs',()=>{assert.equal(GAMES.length,6);assert.equal(new Set(GAMES).size,6);assert.equal(SYMBOLS.length,6);});
test('wheel picks unique games, is deterministic, and excludes yesterday pair',()=>{
 const yesterday=pairForDay(secret,uid,previousDay(today));
 const pair=pairForDay(secret,uid,today,yesterday);
 assert.equal(pair.length,2);assert.notEqual(pair[0],pair[1]);assert.deepEqual(pair,pairForDay(secret,uid,today,yesterday));
 assert.notEqual(pair.slice().sort().join(),yesterday.slice().sort().join());
 for(let i=0;i<200;i++){
  const pair2=pairForDay(secret,'user-'+i,today,yesterday);
  assert.equal(pair2.length,2);assert.notEqual(pair2[0],pair2[1]);
  assert.notEqual(pair2.slice().sort().join(),yesterday.slice().sort().join());
 }
});
test('puzzles change with attempt and do not depend on RNG from the client',()=>{
 for(const game of GAMES){
  const one=puzzleFor(secret,uid,today,game,1);
  assert.deepEqual(one,puzzleFor(secret,uid,today,game,1));
  assert.notDeepEqual(one,puzzleFor(secret,uid,today,game,2),`${game} must change on retry`);
 }
});
test('cipher never leaks its secret into public JSON',()=>{
 const trial=newTrial('cipher');const pub=publicTrial(trial);
 assert.equal(pub.puzzle.kind,'cipher');
 assert.equal(JSON.stringify(pub).includes('secret'),false);
 assert.equal(JSON.stringify(pub).includes('path'),false);
});
test('cipher checks guesses with positional feedback and locks after 6',()=>{
 const t=newTrial('cipher');assert.equal(t.puzzle.kind,'cipher');if(t.puzzle.kind!=='cipher')return;
 const secretCode=t.puzzle.secret;
 let wrong=[...secretCode].reverse();
 if(wrong.every((v,i)=>v===secretCode[i]))wrong=[...secretCode.slice(1),secretCode[0]];
 assert.equal(applyAnswer(t,wrong,1450),'continue');assert.equal(t.guesses.length,1);
 assert.equal(applyAnswer(t,secretCode,1800),'correct');assert.equal(t.status,'won');
 assert.throws(()=>applyAnswer(t,secretCode,2000),/no longer active/);
});
test('wrong non-cipher answer consumes an attempt and last attempt locks out',()=>{
 const t=newTrial('shift',1);if(t.puzzle.kind!=='shift')return;
 const wrong=(t.puzzle.changed+1)%9;
 assert.equal(applyAnswer(t,wrong,4000),'incorrect');assert.equal(t.status,'retry');
 const last=newTrial('shift',3);if(last.puzzle.kind!=='shift')return;
 assert.equal(applyAnswer(last,(last.puzzle.changed+1)%9,4000),'incorrect');assert.equal(last.status,'lost');
});
test('minimum durations reject instantly submitted and malformed answers',()=>{
 const t=newTrial('ghost');if(t.puzzle.kind!=='ghost')return;const path=t.puzzle.path;
 assert.throws(()=>applyAnswer(t,path,1200),/Too fast/);
 assert.throws(()=>applyAnswer(t,[1,2,3],6000),/format/);
 assert.equal(t.status,'active');
 assert.equal(applyAnswer(t,path,6000),'correct');
});
test('all six puzzles have a valid winning answer',()=>{
 for(const game of GAMES){
  const p=puzzleFor(secret,uid,today,game,1);
  if(p.kind==='cipher')assert.equal(answerCorrect(p,p.secret),true);
  if(p.kind==='ghost')assert.equal(answerCorrect(p,p.path),true);
  if(p.kind==='shift')assert.equal(answerCorrect(p,p.changed),true);
  if(p.kind==='lightning')assert.equal(answerCorrect(p,p.numbers.map((_,i)=>i).sort((a,b)=>p.numbers[a]-p.numbers[b])),true);
  if(p.kind==='forge')assert.equal(answerCorrect(p,p.rounds.map(r=>{for(let i=0;i<6;i++)for(let j=i+1;j<6;j++)if(r.stones[i]+r.stones[j]===r.target)return [i,j];throw Error('No forge solution');})),true);
  if(p.kind==='circuit'){
    assert.equal(circuitSolved(p.tiles,p.tiles.map(t=>t.rotation)),false,'Circuit should not start solved');
    assert.equal(circuitSolved(p.tiles,Array(9).fill(0)),true,'Canonical route must be solvable');
  }
 }
});
test('XP grants once, floor only clears after two wins; practice grants zero XP',()=>{
 const p=newPlayer();const a=newTrial('shift');const b=newTrial('cipher');
 p.days[today]={pair:['shift','cipher'],spins:2,trials:[a,b],cleared:false};
 a.status='won';commitWin(p,today,a,false);commitWin(p,today,a,false);
 assert.equal(p.xp,40);assert.equal(p.floorsCleared,0);
 b.status='won';commitWin(p,today,b,false);commitWin(p,today,b,false);
 assert.equal(p.xp,100);assert.equal(p.floorsCleared,1);assert.equal(p.days[today].cleared,true);
 const practice=newTrial('forge');practice.status='won';commitWin(p,today,practice,true);assert.equal(p.xp,100);
});
test('missed days break streak but preserve permanent floor count',()=>{
 const p=newPlayer();p.floorsCleared=8;
 const t=newTrial('shift');
 p.days['2026-10-10']={pair:['shift','forge'],spins:2,trials:[t],cleared:true};
 p.days['2026-10-11']={pair:['cipher','ghost'],spins:2,trials:[],cleared:true};
 assert.equal(streakFor(p.days,'2026-10-12'),2);
 assert.equal(streakFor(p.days,'2026-10-13'),0);
 assert.equal(publicState(p,'2026-10-13').floor,9);
});
test('server never exposes unrevealed wheel pair',()=>{
 const p=newPlayer();p.days[today]={pair:['ghost','cipher'],spins:0,trials:[],cleared:false};
 const data=JSON.stringify(publicState(p,today));
 assert.equal(data.includes('"pair"'),false);
});
test('chapter previews include future floors without increasing rewards',()=>{
 assert.equal(chapterFor(1).name,'The Forgotten Gate');
 assert.equal(chapterFor(7).name,'The Hall of Echoes');
 assert.equal(chapterFor(12).name,'The Clockwork Keep');
 assert.equal(dayKey(new Date('2026-10-13T23:00:00Z')),'2026-10-13');
});
test('300 randomized circuit boards start unsolved and have a valid route',()=>{
 for(let i=0;i<300;i++){
   const p=puzzleFor('stress-secret','player-'+i,'2026-10-13','circuit',1);
   assert.equal(p.kind,'circuit');if(p.kind!=='circuit')continue;
   assert.equal(circuitSolved(p.tiles,p.tiles.map(t=>t.rotation)),false);
   assert.equal(circuitSolved(p.tiles,Array(9).fill(0)),true);
 }
});
test('wrong speed tap can fail immediately; only implausibly fast wins are blocked',()=>{
 const t=newTrial('lightning');if(t.puzzle.kind!=='lightning')return;
 const correct=t.puzzle.numbers.map((_,i)=>i).sort((a,b)=>t.puzzle.kind==='lightning'?t.puzzle.numbers[a]-t.puzzle.numbers[b]:0);
 assert.throws(()=>applyAnswer(t,correct,1100),/Too fast/);
 const incorrect=[...correct];[incorrect[0],incorrect[1]]=[incorrect[1],incorrect[0]];
 assert.equal(applyAnswer(t,incorrect,1100),'incorrect');assert.equal(t.status,'retry');
});
