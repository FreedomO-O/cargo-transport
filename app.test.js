import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseSource} from './public/sources.js';

function appHarness(){
  class Element {
    constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.classList={add(){},remove(){},toggle(){return false;}};if(tag==='iframe')this.contentWindow={messages:[],postMessage(data,origin){this.messages.push({data,origin});}};}
    append(...children){this.children.push(...children);}
    replaceChildren(){this.children=[];}
    setAttribute(){}
    querySelectorAll(tag){return this.children.flatMap(child=>[...(child.tag===tag?[child]:[]),...child.querySelectorAll(tag)]);}
  }
  const elements=Object.fromEntries(['grid','toast','save','load','fullscreen'].map(id=>['#'+id,new Element('div')]));
  const events={};const storage=new Map();
  const context={parseSource,document:{querySelector:id=>elements[id],createElement:tag=>new Element(tag)},window:{addEventListener:(name,handler)=>events[name]=handler},localStorage:{setItem:(key,value)=>storage.set(key,value),getItem:key=>storage.get(key)},setTimeout:()=>1,clearTimeout(){}};
  // Windows checkouts may use CRLF; exercise that form on every platform.
  const source=readFileSync(new URL('./public/app.js',import.meta.url),'utf8').replace(/\r?\n/g,'\r\n');
  vm.runInNewContext(source.replace(/^import [^\r\n]*;\r?\n/,''),context);
  function add(index,url){const form=elements['#grid'].children[index].querySelectorAll('form')[0];form.children[0].value=url;form.onsubmit({preventDefault(){}});}
  return {elements,events,add};
}
test('four panes render, current SOOP URL creates a player and saved combination restores it',()=>{
  const {elements,add}=appHarness();assert.equal(elements['#grid'].children.length,4);
  add(0,'https://play.sooplive.com/lgtwinstv/297709179');
  const frame=elements['#grid'].querySelectorAll('iframe')[0];assert.equal(frame.dataset.channelId,'lgtwinstv');
  elements['#save'].onclick();elements['#load'].onclick();
  assert.equal(elements['#grid'].querySelectorAll('iframe')[0].src,frame.src);
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
