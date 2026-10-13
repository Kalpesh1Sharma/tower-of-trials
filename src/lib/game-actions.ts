/** Pure, synchronous state transitions used inside an atomic player transaction. */
import { GAMES, applyAnswer, commitWin, makeTrial, pairForDay, previousDay, type GameId, type Player } from './tower.ts';

export class GameRuleError extends Error { name='GameRuleError'; }

export type GameAction = {action?:string;game?:GameId;practice?:boolean;answer?:unknown};
export type ActionContext = {secret:string;uid:string;day:string;now:number};

export function applyGameAction(p:Player,body:GameAction,{secret,uid,day,now}:ActionContext):void {
  let daily=p.days[day];
  const ensureDaily=()=>{
    if(!daily){
      const priorDay=previousDay(day);
      const prior=p.days[priorDay]?.pair??pairForDay(secret,uid,priorDay);
      const pair=pairForDay(secret,uid,day,prior);
      daily={pair,spins:0,trials:[],cleared:false};
      p.days[day]=daily;
    }
    return daily;
  };
  switch(body.action){
    case 'spin':{
      const d=ensureDaily();
      if(d.spins>=2)throw new GameRuleError('Both spins have already been used.');
      if(d.spins===1&&!['won','lost'].includes(d.trials[0]?.status))throw new GameRuleError('Finish the first trial before spinning again.');
      const game=d.pair[d.spins];
      d.trials.push(makeTrial(secret,uid,day,game,1,now));
      d.spins++;
      break;
    }
    case 'practice-start':{
      if(!body.game||!GAMES.includes(body.game))throw new GameRuleError('Unknown practice game.');
      const next=(p.practice?.attempt??0)+1;
      p.practice=makeTrial(secret,uid,'practice:'+day,body.game,next,now);
      break;
    }
    case 'practice-close':{
      delete p.practice;
      break;
    }
    case 'retry':{
      const isPractice=body.practice===true;
      const trial=isPractice?p.practice:p.days[day]?.trials.at(-1);
      if(!trial)throw new GameRuleError('Spin to receive a challenge first.');
      if(trial.status!=='retry'&&!(isPractice&&trial.status==='lost'))throw new GameRuleError('Retry is not available for this trial.');
      if(!isPractice&&trial.attempt>=3)throw new GameRuleError('No attempts remaining.');
      const fresh=makeTrial(secret,uid,isPractice?'practice:'+day:day,trial.game,trial.attempt+1,now);
      if(isPractice)p.practice=fresh;
      else p.days[day].trials[p.days[day].trials.length-1]=fresh;
      break;
    }
    case 'submit':{
      const isPractice=body.practice===true;
      const trial=isPractice?p.practice:p.days[day]?.trials.at(-1);
      if(!trial)throw new GameRuleError('No active challenge.');
      if(trial.status!=='active')return; // Replayed submission cannot mint XP twice.
      let outcome:ReturnType<typeof applyAnswer>;
      try {outcome=applyAnswer(trial,body.answer,now);}
      catch(e){if(e instanceof Error && /^(Invalid answer format|Too fast|This attempt is no longer active)/.test(e.message))throw new GameRuleError(e.message);throw e;}
      if(outcome==='correct')commitWin(p,day,trial,isPractice);
      break;
    }
    default:throw new GameRuleError('Unknown action.');
  }
}
