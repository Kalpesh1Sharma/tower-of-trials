/** Non-destructive smoke test for a running Tower of Trials deployment.
 * Usage: node scripts/smoke.mjs https://your-project.vercel.app
 * Creates an anonymous test session and plays Shifting Chamber in PRACTICE only.
 */
import assert from 'node:assert/strict';
import {setTimeout as sleep} from 'node:timers/promises';

const origin=new URL(process.argv[2]??'http://localhost:3000');
let cookie='';
async function call(method,body){
  const res=await fetch(new URL('/api/game',origin),{
    method,redirect:'manual',
    headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json',Origin:origin.origin}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),
    cache:'no-store',
  });
  const header=res.headers.get('set-cookie');
  if(header)cookie=header.split(';')[0];
  const data=await res.json();
  assert.equal(res.status,200,`API ${method} failed: ${JSON.stringify(data)}`);
  return data.state;
}
console.log('Checking',origin.origin);
const before=await call('GET');
assert.ok(cookie.startsWith('tot_session='),'signed session cookie missing');
assert.equal(before.day,new Date().toISOString().slice(0,10));
const startingXP=before.xp,startingFloor=before.floorsCleared,startingSpins=before.spins;
const started=await call('POST',{action:'practice-start',game:'shift'});
assert.equal(started.practice?.game,'shift');
assert.equal(started.practice?.puzzle?.kind,'shift');
const {before:tilesA,after:tilesB}=started.practice.puzzle;
const changed=tilesA.findIndex((tile,i)=>tile!==tilesB[i]);
assert.ok(changed>=0&&changed<9,'invalid practice puzzle');
// A genuine display interval is required by the minimum-duration check.
await sleep(2900);
const finished=await call('POST',{action:'submit',practice:true,answer:changed});
assert.equal(finished.practice?.status,'won');
assert.equal(finished.xp,startingXP);
assert.equal(finished.floorsCleared,startingFloor);
assert.equal(finished.spins,startingSpins);
const replayed=await call('POST',{action:'submit',practice:true,answer:changed});
assert.equal(replayed.xp,startingXP,'duplicate submission awarded XP');
await call('POST',{action:'practice-close'});
const persisted=await call('GET');
assert.equal(persisted.practice,undefined);
assert.equal(persisted.xp,startingXP);
console.log('PASS: cookie, persisted session, issued puzzle, validated practice, duplicate claim protection, no daily spins or XP consumed');
