const grid=document.querySelector('#grid'),mode=document.querySelector('#free-layout');
let free=false,positions={};
try{free=localStorage.getItem('quad-live:free-mode:v1')==='true';positions=JSON.parse(localStorage.getItem('quad-live:free-positions:v1'))||{};}catch{}
function save(){try{localStorage.setItem('quad-live:free-mode:v1',String(free));localStorage.setItem('quad-live:free-positions:v1',JSON.stringify(positions));}catch{}}
function setMode(){grid.classList.toggle('free-layout',free);mode.textContent=free?'격자 배치':'자유 배치';mode.setAttribute('aria-pressed',String(free));window.dispatchEvent(new Event('resize'));}
mode.onclick=()=>{free=!free;setMode();save();};
function allCards(){return [...grid.querySelectorAll('.card')];}
function targetAt(x,y,source){return allCards().find(card=>{if(card===source)return false;const rect=card.getBoundingClientRect();return x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom;});}
function clear(){document.body.classList.remove('moving-pane');allCards().forEach(card=>card.classList.remove('move-target','moving-card'));}
function bind(){
 for(const card of allCards()){
  const slot=Number(card.dataset.slot),handle=card.querySelector('.move-pane');if(!handle||handle.dataset.bound)return;handle.dataset.bound='true';
  const saved=positions[slot];if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)){card.dataset.freeX=String(saved.x);card.dataset.freeY=String(saved.y);}
  let drag=null;
  handle.onpointerdown=event=>{if(event.button!==0||grid.classList.contains('focused'))return;event.preventDefault();const rect=card.getBoundingClientRect(),bounds=grid.getBoundingClientRect();drag={x:event.clientX,y:event.clientY,left:rect.left-bounds.left,top:rect.top-bounds.top,width:rect.width,height:rect.height,target:null};handle.setPointerCapture(event.pointerId);document.body.classList.add('moving-pane');card.classList.add('moving-card');};
  handle.onpointermove=event=>{
   if(!drag||!handle.hasPointerCapture(event.pointerId))return;
   if(free){const bounds=grid.getBoundingClientRect();const x=Math.max(0,Math.min(bounds.width-drag.width,drag.left+event.clientX-drag.x)),y=Math.max(0,Math.min(bounds.height-drag.height,drag.top+event.clientY-drag.y));card.dataset.freeX=String(x/bounds.width);card.dataset.freeY=String(y/bounds.height);card.style.setProperty('--pane-left',x+'px');card.style.setProperty('--pane-top',y+'px');positions[slot]={x:x/bounds.width,y:y/bounds.height};}
   else{allCards().forEach(card=>card.classList.remove('move-target'));drag.target=targetAt(event.clientX,event.clientY,card);drag.target?.classList.add('move-target');}
  };
  handle.onpointerup=event=>{if(!drag)return;const target=drag.target;drag=null;clear();if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);if(!free&&target)window.dispatchEvent(new CustomEvent('quad:swap-panes',{detail:{from:slot,to:Number(target.dataset.slot)}}));save();};
  handle.onpointercancel=()=>{drag=null;clear();};handle.onlostpointercapture=()=>{drag=null;clear();};
  handle.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)||grid.classList.contains('focused'))return;event.preventDefault();
   if(free){const rect=card.getBoundingClientRect(),bounds=grid.getBoundingClientRect();const x=Math.max(0,Math.min(bounds.width-rect.width,rect.left-bounds.left+(event.key==='ArrowLeft'?-20:event.key==='ArrowRight'?20:0))),y=Math.max(0,Math.min(bounds.height-rect.height,rect.top-bounds.top+(event.key==='ArrowUp'?-20:event.key==='ArrowDown'?20:0)));card.dataset.freeX=String(x/bounds.width);card.dataset.freeY=String(y/bounds.height);card.style.setProperty('--pane-left',x+'px');card.style.setProperty('--pane-top',y+'px');positions[slot]={x:x/bounds.width,y:y/bounds.height};save();}
   else{const ordered=allCards().sort((a,b)=>Number(a.dataset.position)-Number(b.dataset.position)),i=ordered.indexOf(card),offset=['ArrowLeft','ArrowUp'].includes(event.key)?-1:1,target=ordered[i+offset];if(target)window.dispatchEvent(new CustomEvent('quad:swap-panes',{detail:{from:slot,to:Number(target.dataset.slot)}}));}
  };
 }
}
new MutationObserver(bind).observe(grid,{childList:true,subtree:true});
setMode();bind();

window.addEventListener('quad:reset-positions',()=>{positions={};free=false;allCards().forEach(card=>{delete card.dataset.freeX;delete card.dataset.freeY;});setMode();save();});
