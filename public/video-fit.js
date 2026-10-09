import {parseRatio,frameSize} from './video-layout.js';
const grid=document.querySelector('#grid'),bindings=new Map();
const defaults=()=>({ratio:'auto',fit:'cover'});
let preferences=Array.from({length:9},defaults);
try{
  const saved=JSON.parse(localStorage.getItem('quad-live:video-fit:v1'));
  if(Array.isArray(saved)&&saved.length>=1&&saved.length<=9)preferences=saved.map(value=>{try{parseRatio(value.ratio);return {ratio:value.ratio,fit:value.fit==='contain'?'contain':'cover',paneFit:value.paneFit===true};}catch{return defaults();}}).concat(Array.from({length:9-saved.length},defaults));
}catch{}
function persist(){try{localStorage.setItem('quad-live:video-fit:v1',JSON.stringify(preferences));}catch{}}
function bind(){
  for(const [card,binding] of bindings)if(!grid.contains(card)){binding.observer.disconnect();bindings.delete(card);}
  [...grid.querySelectorAll('.card')].forEach(card=>{
    const index=Number(card.dataset.slot);
    const frame=card.querySelector('.player-viewport iframe'),previous=bindings.get(card);
    if(previous?.frame===frame)return;
    if(previous){previous.observer.disconnect();bindings.delete(card);}
    if(!frame)return;
    const viewport=frame.parentElement,settings=document.createElement('div');settings.className='video-settings';
    const ratio=document.createElement('select');ratio.setAttribute('aria-label',`방송 ${index+1} 영상 비율`);
    const options=[['auto','비율: 자동'],['16:9','가로 16:9'],['9:16','세로 9:16'],['1:1','정사각 1:1'],['4:3','가로 4:3'],['21:9','와이드 21:9'],['custom','직접 입력']];
    for(const [value,label] of options){const option=document.createElement('option');option.value=value;option.textContent=label;ratio.append(option);}
    const custom=document.createElement('input');custom.type='text';custom.placeholder='9:16';custom.setAttribute('aria-label',`방송 ${index+1} 사용자 비율`);custom.title='너비:높이 (예: 9:16)';custom.className='custom-ratio';
    const fit=document.createElement('button');fit.type='button';fit.title='영상 비율에 맞춰 방송 칸의 너비를 조절합니다. 자동 비율은 세로 9:16 기준입니다.';
    const crop=document.createElement('button');crop.type='button';crop.title='영상을 확대해 칸을 채웁니다. 일부 영상과 플레이어 버튼이 잘릴 수 있습니다.';
    const error=document.createElement('span');error.className='ratio-error';error.setAttribute('role','alert');
    let config=preferences[index];
    const known=options.some(([value])=>value===config.ratio);
    ratio.value=known?config.ratio:'custom';custom.value=config.ratio==='auto'?'9:16':config.ratio;
    custom.hidden=ratio.value!=='custom';
    function apply(){
      const {width,height}=viewport.getBoundingClientRect();
      const size=frameSize(width,height,parseRatio(config.ratio),config.fit);
      frame.style.width=size.width+'px';frame.style.height=size.height+'px';
      frame.style.left='50%';frame.style.top='50%';frame.style.transform='translate(-50%,-50%)';
      fit.textContent=config.paneFit?'여백 적용됨':'여백 제거';fit.setAttribute('aria-pressed',String(!!config.paneFit));
      crop.textContent=config.fit==='cover'&&config.ratio!=='auto'?'전체 보기':'확대 채우기';crop.disabled=config.ratio==='auto';crop.setAttribute('aria-pressed',String(config.fit==='cover'&&config.ratio!=='auto'));
    }
    function change(){
      try{const value=ratio.value==='custom'?custom.value:ratio.value;parseRatio(value);config={ratio:value,fit:'contain',paneFit:false};window.dispatchEvent(new CustomEvent('quad:unfit-pane',{detail:{slot:index}}));preferences[index]=config;custom.hidden=ratio.value!=='custom';error.textContent='';apply();persist();}
      catch(e){custom.hidden=false;error.textContent=e.message;}
    }
    ratio.onchange=change;custom.onchange=change;
    fit.onclick=()=>{if(config.ratio==='auto'){config.ratio='9:16';ratio.value='9:16';custom.hidden=true;}config.fit='contain';config.paneFit=true;preferences[index]=config;apply();persist();window.dispatchEvent(new CustomEvent('quad:fit-pane',{detail:{slot:index,ratio:parseRatio(config.ratio)}}));};
    crop.onclick=()=>{config.paneFit=false;window.dispatchEvent(new CustomEvent('quad:unfit-pane',{detail:{slot:index}}));config.fit=config.fit==='cover'?'contain':'cover';preferences[index]=config;apply();persist();};
    settings.append(ratio,custom,fit,crop,error);card.querySelector('.bar').append(settings);
    const observer=new ResizeObserver(apply);observer.observe(viewport);bindings.set(card,{frame,observer,apply});apply();if(config.paneFit)requestAnimationFrame(()=>window.dispatchEvent(new CustomEvent('quad:fit-pane',{detail:{slot:index,ratio:parseRatio(config.ratio)}})));
  });
}
new MutationObserver(bind).observe(grid,{childList:true,subtree:true});
bind();

window.addEventListener('quad:reset-fit',()=>{preferences.forEach(config=>config.paneFit=false);bindings.forEach(binding=>binding.apply());persist();});

window.addEventListener('quad:restore-fit',event=>{
 if(!Array.isArray(event.detail)||event.detail.length<1||event.detail.length>9)return;
 preferences=event.detail.map(value=>{try{parseRatio(value.ratio);return {ratio:value.ratio,fit:value.fit==='contain'?'contain':'cover',paneFit:value.paneFit===true};}catch{return defaults();}}).concat(Array.from({length:9-event.detail.length},defaults));
 bindings.forEach(binding=>binding.observer.disconnect());bindings.clear();grid.querySelectorAll('.video-settings').forEach(settings=>settings.remove());persist();bind();
});
