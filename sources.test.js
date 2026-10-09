import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSource} from './public/sources.js';
test('YouTube watch, short and live URLs map to muted official embeds',()=>{
  for(const url of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ','https://youtu.be/dQw4w9WgXcQ','https://youtube.com/live/dQw4w9WgXcQ'])assert.equal(parseSource(url).embed,'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&playsinline=1');
});
test('SOOP and Chzzk are explicitly experimental',()=>{assert.equal(parseSource('https://play.sooplive.co.kr/example/123').experimental,true);assert.equal(parseSource('https://chzzk.naver.com/live/'+'a'.repeat(32)).experimental,true);});
test('reject unsafe protocols, credentials, unsupported hosts and incomplete URLs',()=>{for(const url of ['javascript:alert(1)','http://youtube.com/watch?v=dQw4w9WgXcQ','https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ','https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ','https://youtube.com/@channel','https://chzzk.naver.com/live/123'])assert.throws(()=>parseSource(url));});
