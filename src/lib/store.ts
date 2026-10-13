/** Local single-process JSON persistence for development; PostgreSQL for multi-instance production. */
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { newPlayer, type Player } from './tower';

const directory=join(process.cwd(),'.data');
const file=join(directory,'players.json');
let queue:Promise<unknown>=Promise.resolve();
let cachedSecrets:Promise<{session:string;puzzle:string}>|undefined;
const globalForDb=globalThis as typeof globalThis & {towerPool?:Pool};
function pool():Pool {
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required in hosted production.');
  return globalForDb.towerPool??(globalForDb.towerPool=new Pool({connectionString:process.env.DATABASE_URL,max:3}));
}
export function remoteStore():boolean{return !!process.env.DATABASE_URL;}
export async function secrets():Promise<{session:string;puzzle:string}>{
  if(!cachedSecrets)cachedSecrets=(async()=>{
    if((process.env.VERCEL || process.env.REQUIRE_DATABASE==='true')&&(!process.env.DATABASE_URL||!process.env.SESSION_SECRET||!process.env.PUZZLE_SECRET))throw new Error('Configure DATABASE_URL, SESSION_SECRET and PUZZLE_SECRET for deployment.');
    if(process.env.SESSION_SECRET&&process.env.PUZZLE_SECRET)return {session:process.env.SESSION_SECRET,puzzle:process.env.PUZZLE_SECRET};
    await mkdir(directory,{recursive:true});
    const path=join(directory,'secrets.json');
    try {const stored=JSON.parse(await readFile(path,'utf8')) as {session:string;puzzle:string};if(stored.session&&stored.puzzle)return stored;}catch{}
    const generated={session:process.env.SESSION_SECRET??randomBytes(32).toString('hex'),puzzle:process.env.PUZZLE_SECRET??randomBytes(32).toString('hex')};
    await writeFile(path,JSON.stringify(generated),{mode:0o600});return generated;
  })();
  return cachedSecrets;
}
function isPlayer(p:unknown):p is Player {return !!p&&typeof p==='object'&&!!(p as Player).days&&typeof (p as Player).xp==='number'&&typeof (p as Player).floorsCleared==='number';}
async function localTransaction<T>(uid:string,change:(player:Player)=>T):Promise<T> {
  await mkdir(directory,{recursive:true});
  let all:Record<string,Player>={};
  try {all=JSON.parse(await readFile(file,'utf8')) as Record<string,Player>;}catch{}
  const p=isPlayer(all[uid])?all[uid]:newPlayer();
  const result=change(p);
  all[uid]=p;
  const tmp=join(directory,`players.${process.pid}.${randomBytes(5).toString('hex')}.tmp`);
  await writeFile(tmp,JSON.stringify(all),{mode:0o600});
  await rename(tmp,file);
  return result;
}
async function postgresTransaction<T>(uid:string,change:(player:Player)=>T):Promise<T> {
  const connection=await pool().connect();
  try {
    await connection.query('BEGIN');
    await connection.query('INSERT INTO tower_players (id, state) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING',[uid,JSON.stringify(newPlayer())]);
    const result=await connection.query('SELECT state FROM tower_players WHERE id = $1 FOR UPDATE',[uid]);
    const p:Player=isPlayer(result.rows[0]?.state)?result.rows[0].state:newPlayer();
    const value=change(p);
    await connection.query('UPDATE tower_players SET state = $2::jsonb, updated_at = NOW() WHERE id = $1',[uid,JSON.stringify(p)]);
    await connection.query('COMMIT');return value;
  }catch(e){await connection.query('ROLLBACK');throw e;}finally{connection.release();}
}
/** Read existing progress without an UPDATE or row lock.
 * Supabase transaction-pooler connections are relatively expensive on cold starts;
 * a read-only GET must not pay for BEGIN + FOR UPDATE + UPDATE + COMMIT.
 * First-time visitors are inserted once, while all reward mutations continue
 * exclusively through transact()'s locked transaction.
 */
export async function loadPlayer(uid:string):Promise<Player> {
  if(!remoteStore())return transact(uid,p=>p);
  const db=pool();
  const found=await db.query<{state:Player}>('SELECT state FROM tower_players WHERE id = $1',[uid]);
  if(found.rows.length&&isPlayer(found.rows[0].state))return found.rows[0].state;
  const created=await db.query<{state:Player}>(
    'INSERT INTO tower_players (id, state) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING RETURNING state',
    [uid,JSON.stringify(newPlayer())]
  );
  if(created.rows.length&&isPlayer(created.rows[0].state))return created.rows[0].state;
  const concurrent=await db.query<{state:Player}>('SELECT state FROM tower_players WHERE id = $1',[uid]);
  if(concurrent.rows.length&&isPlayer(concurrent.rows[0].state))return concurrent.rows[0].state;
  throw new Error('Player record could not be read.');
}
/** The change callback must be synchronous, so the caller cannot escape the row lock. */
export async function transact<T>(uid:string,change:(player:Player)=>T):Promise<T> {
  if(remoteStore())return postgresTransaction(uid,change);
  // Serialize all JSON writes in one process to avoid lost updates in local development.
  const op=queue.then(()=>localTransaction(uid,change));
  queue=op.then(()=>undefined,()=>undefined);
  return op;
}
