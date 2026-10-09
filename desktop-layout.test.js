import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {layout}=createRequire(import.meta.url)('./desktop/layout.cjs');
test('native view bounds match UI grid and leave toolbars accessible',()=>{
  for(const [width,height] of [[1440,1000],[1000,760],[1920,1080]]){
    const rects=layout(width,height);
    assert.equal(rects.length,4);
    for(const r of rects){assert.ok(r.x>=12);assert.ok(r.y>=236);assert.ok(r.x+r.width<=width-12);assert.ok(r.y+r.height<=height-12);assert.ok(r.height>0);}
    assert.ok(rects[0].x+rects[0].width<rects[1].x);
    assert.ok(rects[0].y+rects[0].height<rects[2].y);
    const [full]=layout(width,height,1);assert.equal(full.width,width-24);assert.equal(full.height,height-248);
  }
});
