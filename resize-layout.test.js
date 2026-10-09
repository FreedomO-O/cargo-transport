import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readSplits,splitFromPointer} from './public/resize-layout.js';
test('stored pane splits validate independently and clamp to usable bounds',()=>{
  assert.deepEqual(readSplits({top:65,bottom:30,row:60}),{top:65,bottom:30,row:60});
  assert.deepEqual(readSplits({top:-20,bottom:Infinity,row:'bad'}),{top:15,bottom:50,row:50});
  assert.deepEqual(readSplits(null),{top:50,bottom:50,row:50});
});
test('pointer resizing accounts for grid position and constrains edges',()=>{
  const rect={left:10,top:50,width:1000,height:600};
  assert.equal(splitFromPointer('top',rect,710,300),70);
  assert.equal(splitFromPointer('bottom',rect,310,300),30);
  assert.equal(splitFromPointer('row',rect,10,410),60);
  assert.equal(splitFromPointer('row',rect,10,2000),85);
  assert.equal(splitFromPointer('top',rect,-100,50),15);
});
