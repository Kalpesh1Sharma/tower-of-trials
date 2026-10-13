import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { dayKey, publicState, type Player } from '@/lib/tower';
import { applyGameAction, GameRuleError, type GameAction } from '@/lib/game-actions';
import { secrets, transact } from '@/lib/store';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const COOKIE='tot_session';
function signature(uid:string,key:string){return createHmac('sha256',key).update(uid).digest('base64url');}
function identity(request:NextRequest,key:string):{uid:string;token:string;newCookie:boolean}{
  const token=request.cookies.get(COOKIE)?.value;
  if(token){const [uid,sig]=token.split('.');
    if(uid&&sig&&/^[a-f0-9]{32}$/.test(uid)){
      const expected=signature(uid,key);
      const a=Buffer.from(sig),b=Buffer.from(expected);
      if(a.length===b.length&&timingSafeEqual(a,b))return {uid,token,newCookie:false};
    }
  }
  const uid=randomBytes(16).toString('hex');return {uid,token:`${uid}.${signature(uid,key)}`,newCookie:true};
}
function response(body:unknown,session:{token:string;newCookie:boolean},status=200):NextResponse {
  const result=NextResponse.json(body,{status,headers:{'Cache-Control':'no-store, private'}});
  if(session.newCookie)result.cookies.set(COOKIE,session.token,{httpOnly:true,secure:!!process.env.VERCEL,sameSite:'lax',path:'/',maxAge:60*60*24*365});
  return result;
}
export async function GET(request:NextRequest){
  try {
    const keys=await secrets();const session=identity(request,keys.session);const day=dayKey();
    const state=await transact(session.uid,p=>publicState(p,day));
    return response({state},session);
  }catch(e){console.error('Game GET:',e);return NextResponse.json({error:'Unable to load progress. Check database configuration.'},{status:500});}
}

export async function POST(request:NextRequest){
  const origin=request.headers.get('origin');
  if(origin&&origin!==request.nextUrl.origin)return NextResponse.json({error:'Cross-origin request denied.'},{status:403});
  let body:GameAction;
  try {const raw=await request.text();if(raw.length>4096)throw new Error('Request too large.');const parsed:unknown=JSON.parse(raw);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Expected a JSON object.');body=parsed as GameAction;}catch{return NextResponse.json({error:'Invalid request.'},{status:400});}
  try {
    const keys=await secrets();const session=identity(request,keys.session);
    const day=dayKey(),now=Date.now();
    const state=await transact(session.uid,(p:Player)=>{
      applyGameAction(p,body,{secret:keys.puzzle,uid:session.uid,day,now});
      return publicState(p,day);
    });
    return response({state},session);
  }catch(e){
    if(e instanceof GameRuleError)return NextResponse.json({error:e.message},{status:400,headers:{'Cache-Control':'no-store'}});
    console.error('Game POST:',e);
    return NextResponse.json({error:'Unable to save progress. Please try again.'},{status:500,headers:{'Cache-Control':'no-store'}});
  }
}
