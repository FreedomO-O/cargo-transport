import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseRatio,frameSize} from './public/video-layout.js';
test('portrait and custom aspect ratios parse without accepting invalid input',()=>{
  assert.equal(parseRatio('9:16'),9/16);assert.equal(parseRatio(' 1.5 : 1 '),1.5);assert.equal(parseRatio('auto'),null);
  for(const ratio of ['0:16','9:0','NaN:1','100:1','<script>',null])assert.throws(()=>parseRatio(ratio));
});
test('portrait cover removes pillarboxing by cropping, while contain preserves full frame',()=>{
  const cover=frameSize(1000,450,9/16,'cover');assert.equal(cover.width,1000);assert.equal(cover.height,1000/(9/16));
  const contain=frameSize(1000,450,9/16,'contain');assert.equal(contain.width,450*9/16);assert.equal(contain.height,450);
  assert.deepEqual(frameSize(400,500,null,'cover'),{width:400,height:500});
});
