import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rowSizes,defaultLayout,validateLayout,moveBoundary} from './public/pane-layout.js';
test('one to nine panes create complete balanced rows without empty slots',()=>{
  for(let count=1;count<=9;count++){const sizes=rowSizes(count);assert.equal(sizes.reduce((a,b)=>a+b,0),count);assert.ok(sizes.every(size=>size>=1&&size<=3));assert.ok(Math.max(...sizes)-Math.min(...sizes)<=1);assert.deepEqual(validateLayout(count,defaultLayout(count)),defaultLayout(count));}
  assert.deepEqual(rowSizes(1),[1]);assert.deepEqual(rowSizes(4),[2,2]);assert.deepEqual(rowSizes(9),[3,3,3]);
  assert.throws(()=>rowSizes(10));assert.throws(()=>rowSizes(0));
});
test('resizing three columns preserves neighboring minimum widths',()=>{
  const boundaries=[0,33,66,100];moveBoundary(boundaries,1,95);assert.equal(boundaries[1],56);moveBoundary(boundaries,2,0);assert.equal(boundaries[2],66);
  assert.deepEqual(validateLayout(9,{rows:[0,0,50,100],columns:[]}),defaultLayout(9));
});
