import assert from 'node:assert/strict';
import {test} from 'node:test';
import {applyGameAction, type ActionContext} from '../src/lib/game-actions.ts';
import {newPlayer, previousDay, publicState, type Player, type Puzzle} from '../src/lib/tower.ts';

const initial:ActionContext={secret:'test-puzzle-key',uid:'anonymous-reviewer',day:'2026-10-13',now:1000};
function act(p:Player,action:string,props:Record<string,unknown>={},ctx:ActionContext=initial){
  applyGameAction(p,{action,...props},ctx);
  return publicState(p,ctx.day);
}
function solution(p:Puzzle):unknown {
  switch(p.kind){
    case 'cipher':return p.secret;
    case 'ghost':return p.path;
    case 'shift':return p.changed;
    case 'circuit':return Array(9).fill(0);
    case 'lightning':return p.numbers.map((_,i)=>i).sort((a,b)=>p.numbers[a]-p.numbers[b]);
    case 'forge':return p.rounds.map(round=>{for(let i=0;i<6;i++)for(let j=i+1;j<6;j++)if(round.stones[i]+round.stones[j]===round.target)return [i,j];throw Error('Unsolvable sum');});
  }
}
function wrong(p:Puzzle):unknown {
  if(p.kind==='cipher')return [...p.secret].reverse();
  if(p.kind==='ghost')return [0,0,0,0,0].every((v,i)=>v===p.path[i])?[1,1,1,1,1]:[0,0,0,0,0];
  if(p.kind==='shift')return (p.changed+1)%9;
  if(p.kind==='circuit')return p.tiles.map(t=>t.rotation); // Server guarantees unsolved start.
  if(p.kind==='lightning')return p.numbers.map((_,i)=>i); // May equal solution: swap first two if so.
  if(p.kind==='forge')return [[0,0],[0,0],[0,0]]; // Invalid answers must be rejected, never counted.
}
const later=(ctx:ActionContext,ms=9000):ActionContext=>({...ctx,now:ctx.now+ms});

test('spin flow requires resolving first trial, selects distinct games and caps at two',()=>{
  const player=newPlayer();
  const first=act(player,'spin');
  assert.equal(first.spins,1);
  assert.equal(first.games.length,1);
  assert.throws(()=>act(player,'spin'),/Finish the first trial/);
  const firstPuzzle=player.days[initial.day].trials[0].puzzle;
  const afterWin=act(player,'submit',{answer:solution(firstPuzzle)},later(initial));
  assert.equal(afterWin.xp,40);
  const second=act(player,'spin',{},later(initial,10000));
  assert.equal(second.spins,2);
  assert.notEqual(second.games[0].game,second.games[1].game);
  assert.throws(()=>act(player,'spin'),/Both spins/);
  assert.equal(second.xp,40);
  assert.equal(second.floorsCleared,0);
});

test('full daily floor awards exactly 100 XP and replay cannot mint XP',()=>{
  const player=newPlayer();act(player,'spin');
  act(player,'submit',{answer:solution(player.days[initial.day].trials[0].puzzle)},later(initial));
  act(player,'spin');
  const solution2=solution(player.days[initial.day].trials[1].puzzle);
  const done=act(player,'submit',{answer:solution2},later(initial));
  assert.equal(done.xp,100);
  assert.equal(done.floorsCleared,1);
  assert.equal(done.floor,2);
  assert.equal(done.cleared,true);
  assert.equal(done.streak,1);
  for(let i=0;i<5;i++)assert.equal(act(player,'submit',{answer:solution2},later(initial)).xp,100);
  assert.equal(player.days[initial.day].trials.filter(t=>t.rewarded).length,2);
});

test('retry uses a fresh puzzle; third failure seals trial but spin two is allowed',()=>{
  const player=newPlayer();
  act(player,'spin');
  let trial=player.days[initial.day].trials[0];
  const original=trial.puzzle;
  for(let attempt=1;attempt<=3;attempt++){
    trial=player.days[initial.day].trials[0];
    const puzzle=trial.puzzle;
    // Guaranteed incorrect (or structurally invalid, which must not consume an attempt).
    let answer=wrong(puzzle);
    if(puzzle.kind==='lightning'){
      answer=solution(puzzle) as number[];
      answer=[...(answer as number[])];
      [(answer as number[])[0],(answer as number[])[1]]=[(answer as number[])[1],(answer as number[])[0]];
    }
    if(puzzle.kind==='forge')answer=[[0,1],[0,1],[0,1]];
    if(puzzle.kind==='forge' && player.days[initial.day].trials[0].game==='forge'){
      // Choose one valid-looking answer and ensure it does not solve all three rounds.
      if((puzzle.rounds.every(r=>r.stones[0]+r.stones[1]===r.target)))answer=[[1,2],[0,1],[0,1]];
    }
    const outcome=act(player,'submit',{answer},later(initial,12000+attempt*1000));
    assert.equal(outcome.games[0].status,attempt===3?'lost':'retry');
    if(attempt<3){act(player,'retry',{},later(initial,18000+attempt*1000));assert.notDeepEqual(player.days[initial.day].trials[0].puzzle,puzzle);}
  }
  assert.notDeepEqual(trial.puzzle,original);
  assert.throws(()=>act(player,'retry'),/Retry is not available/);
  const second=act(player,'spin');
  assert.equal(second.spins,2);
  assert.equal(second.xp,0);
});

test('practice never increments spins, floors, streak or XP',()=>{
  const player=newPlayer();
  for(const game of ['cipher','ghost','shift','circuit','lightning','forge'] as const){
    act(player,'practice-start',{game});
    const response=act(player,'submit',{practice:true,answer:solution(player.practice!.puzzle)},later(initial));
    assert.equal(response.practice?.status,'won');
    assert.equal(response.xp,0);
    assert.equal(response.spins,0);
    assert.equal(response.floorsCleared,0);
    assert.equal(response.streak,0);
  }
});

test('UTC day change creates a new assignment while keeping previous clears and XP',()=>{
  const player=newPlayer();
  act(player,'spin');
  act(player,'submit',{answer:solution(player.days[initial.day].trials[0].puzzle)},later(initial));
  act(player,'spin');
  act(player,'submit',{answer:solution(player.days[initial.day].trials[1].puzzle)},later(initial));
  const tomorrow={...initial,day:'2026-10-14',now:initial.now+86_400_000};
  const newDay=publicState(player,tomorrow.day);
  assert.equal(newDay.spins,0);
  assert.equal(newDay.xp,100);
  assert.equal(newDay.floorsCleared,1);
  assert.equal(newDay.streak,1);
  act(player,'spin',{},tomorrow);
  const yesterday=player.days[initial.day].pair.slice().sort().join();
  const today=player.days[tomorrow.day].pair.slice().sort().join();
  assert.notEqual(yesterday,today);
  assert.equal(player.days[tomorrow.day].spins,1);
  const missed={...initial,day:'2026-10-16',now:initial.now+3*86_400_000};
  assert.equal(publicState(player,missed.day).streak,0);
  assert.equal(publicState(player,missed.day).floorsCleared,1);
  assert.equal(previousDay(missed.day),'2026-10-15');
});
