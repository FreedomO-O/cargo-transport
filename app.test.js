import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseSource} from './public/sources.js';

function appHarness(){
  class Element {
    constructor(tag){this.tag=tag;this.parent=null;this.children=[];this.dataset={};this.classList={add(){},remove(){},toggle(){return false;}};if(tag==='iframe')this.contentWindow={messages:[],postMessage(data,origin){this.messages.push({data,origin});}};}
    append(...children){for(const child of children)child.parent=this;this.children.push(...children);}
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
    replaceChildren(){this.children=[];}
    setAttribute(){}
    querySelectorAll(tag){return this.children.flatMap(child=>[...(child.tag===tag?[child]:[]),...child.querySelectorAll(tag)]);}
  }
  const elements=Object.fromEntries(['grid','toast','save','load','fullscreen','pane-count','add-pane','remove-pane'].map(id=>['#'+id,new Element('div')]));
  const events={};const storage=new Map();
  const context={parseSource,location:{hostname:'example.test'},document:{querySelector:id=>elements[id],createElement:tag=>new Element(tag)},window:{addEventListener:(name,handler)=>events[name]=handler},localStorage:{setItem:(key,value)=>storage.set(key,value),getItem:key=>storage.get(key)},setTimeout:()=>1,clearTimeout(){}};
  // Windows checkouts may use CRLF; exercise that form on every platform.
  const source=readFileSync(new URL('./public/app.js',import.meta.url),'utf8').replace(/\r?\n/g,'\r\n');
  vm.runInNewContext(source.replace(/^import [^\r\n]*;\r?\n/,''),context);
  function add(index,url){const form=elements['#grid'].children[index].querySelectorAll('form')[0];form.children[0].value=url;form.onsubmit({preventDefault(){}});}
  return {elements,events,add,storage};
}
test('four panes render, current SOOP URL creates a player and saved combination restores it',()=>{
  const {elements,add}=appHarness();assert.equal(elements['#grid'].children.length,4);
  add(0,'https://play.sooplive.com/lgtwinstv/297709179');
  const frame=elements['#grid'].querySelectorAll('iframe')[0];assert.equal(frame.dataset.channelId,'lgtwinstv');
  elements['#save'].onclick();elements['#load'].onclick();
  assert.equal(elements['#grid'].querySelectorAll('iframe')[0].src,frame.src);
});
test('pane count stays between one and nine and saved combinations restore their count',()=>{
  const {elements,storage}=appHarness();const grid=elements['#grid'];
  elements['#pane-count'].onchange({target:{value:'9'}});assert.equal(grid.children.length,9);
  elements['#add-pane'].onclick();assert.equal(grid.children.length,9);
  elements['#save'].onclick();assert.equal(JSON.parse(storage.get('quad-live:v1')).length,9);
  elements['#pane-count'].onchange({target:{value:'1'}});assert.equal(grid.children.length,1);
  elements['#remove-pane'].onclick();assert.equal(grid.children.length,1);
  elements['#load'].onclick();assert.equal(grid.children.length,9);
});
test('removing a middle pane keeps later player handlers usable',()=>{
  const {elements,add}=appHarness();const grid=elements['#grid'];
  const remove=grid.children[1].querySelectorAll('button').find(button=>button.textContent==='칸 제거');remove.onclick();assert.equal(grid.children.length,3);
  const form=grid.children[1].querySelectorAll('form')[0];form.children[0].value='https://youtube.com/watch?v=dQw4w9WgXcQ';form.onsubmit({preventDefault(){}});
  assert.equal(grid.querySelectorAll('iframe').length,1);
  elements['#add-pane'].onclick();assert.equal(grid.children.length,4);
});
test('YouTube chat opens for the current host and closes without reloading the video',()=>{
  const {elements,add}=appHarness();add(0,'https://youtube.com/watch?v=dQw4w9WgXcQ');
  const card=elements['#grid'].children[0],video=card.querySelectorAll('iframe')[0];
  const toggle=card.querySelectorAll('button').find(button=>button.textContent==='채팅');toggle.onclick();
  const frames=card.querySelectorAll('iframe');assert.equal(frames.length,2);const chat=new URL(frames[1].src);assert.equal(chat.searchParams.get('embed_domain'),'example.test');assert.equal(chat.searchParams.get('v'),'dQw4w9WgXcQ');
  toggle.onclick();assert.equal(card.querySelectorAll('iframe').length,1);assert.equal(card.querySelectorAll('iframe')[0],video);
});
test('SOOP handshake only responds to the exact registered player and origin',()=>{
  const {elements,events,add}=appHarness();add(0,'https://play.sooplive.com/lgtwinstv/297709179');
  const frame=elements['#grid'].querySelectorAll('iframe')[0];
  for(const event of [{origin:'https://evil.test',source:frame.contentWindow,data:{cmd:'PonReady'}},{origin:'https://play.sooplive.com',source:{},data:{cmd:'PonReady'}},{origin:'https://play.sooplive.com',source:frame.contentWindow,data:null}])events.message(event);
  assert.equal(frame.contentWindow.messages.length,0);
  events.message({origin:'https://play.sooplive.com',source:frame.contentWindow,data:{cmd:'PonReady'}});
  assert.equal(frame.contentWindow.messages.length,1);
  const {data,origin}=frame.contentWindow.messages[0];assert.equal(origin,'https://play.sooplive.com');assert.equal(data.cmd,'Pload');assert.equal(data.id,'lgtwinstv');assert.equal(data.autoPlay,true);assert.equal(data.mutePlay,true);
});
test('local network permission delegation is restricted to SOOP players',()=>{
  const {elements,add}=appHarness();
  add(0,'https://play.sooplive.com/lgtwinstv/297709179');
  add(1,'https://youtube.com/watch?v=dQw4w9WgXcQ');
  add(2,'https://chzzk.naver.com/live/'+'a'.repeat(32));
  const [soop,youtube,chzzk]=elements['#grid'].querySelectorAll('iframe');
  for(const feature of ['local-network-access','local-network','loopback-network'])assert.ok(soop.allow.includes(`${feature} https://play.sooplive.com`));
  for(const frame of [youtube,chzzk])assert.ok(!frame.allow.includes('network'));
});
