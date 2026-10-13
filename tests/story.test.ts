import assert from 'node:assert/strict';
import {test} from 'node:test';
import {FLOOR_ENDINGS,endingForFloor,storyTitleForFloor} from '../src/lib/story.ts';

test('all 25 floor endings exist and are distinct',()=>{
 assert.equal(FLOOR_ENDINGS.length,25);
 assert.equal(new Set(FLOOR_ENDINGS).size,25);
 for(let n=1;n<=25;n++)assert.ok(endingForFloor(n).length>50);
});
test('chronicle tracks four chapters with open-ended continuation',()=>{
 assert.equal(storyTitleForFloor(1),'The Forgotten Gate');
 assert.equal(storyTitleForFloor(6),'The Hall of Echoes');
 assert.equal(storyTitleForFloor(11),'The Clockwork Keep');
 assert.equal(storyTitleForFloor(16),'The Celestial Spire');
 assert.equal(storyTitleForFloor(26),'Beyond the Spire');
 assert.match(endingForFloor(40),/new staircases/);
 assert.notEqual(endingForFloor(0),endingForFloor(1));
});
