import assert from 'node:assert/strict';
import test from 'node:test';
import {alignedVisibleAngle,targetAngle} from '../src/lib/wheel-motion.ts';

test('visible free-spin orientation can be aligned with previous wheel rotation',()=>{
 assert.equal(alignedVisibleAngle(1800,-45),2115);
 assert.equal(alignedVisibleAngle(2700,90),2610);
});

test('wheel landing matches each of six server-selected segments',()=>{
 for(let index=0;index<6;index++)for(const start of [0,45,200,1800,2395]){
  const target=targetAngle(start,index);
  assert.ok(target>=start+720);
  const finish=((target%360)+360)%360;
  assert.equal(finish,((-index*60)%360+360)%360);
 }
});

test('invalid wheel indexes are rejected rather than silently landing elsewhere',()=>{
 assert.throws(()=>targetAngle(10,-1),/Unknown wheel segment/);
 assert.throws(()=>targetAngle(10,6),/Unknown wheel segment/);
});
