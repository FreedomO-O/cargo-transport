import {readSplits,DEFAULT_SPLITS,clampSplit,splitFromPointer} from './resize-layout.js';
const grid=document.querySelector('#grid'),reset=document.querySelector('#reset-layout');
let splits={...DEFAULT_SPLITS};
try{splits=readSplits(JSON.parse(localStorage.getItem('quad-live:layout:v1')));}catch{}
grid.classList.add('resizable');
const handles={};
function persist(){try{localStorage.setItem('quad-live:layout:v1',JSON.stringify(splits));}catch{}}
function apply(){
  for(const axis of Object.keys(splits)){
    grid.style.setProperty('--split-'+axis,splits[axis]+'%');
    handles[axis]?.setAttribute('aria-valuenow',Math.round(splits[axis]));
  }
}
function endDrag(event){
  document.body.classList.remove('resizing');
  if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  persist();
}
for(const axis of ['top','bottom','row']){
  const handle=document.createElement('div');handle.className='resize-handle resize-'+axis;handle.tabIndex=0;
  handle.setAttribute('role','separator');handle.setAttribute('aria-label',axis==='row'?'위아래 방송 높이 조절':`${axis==='top'?'위쪽':'아래쪽'} 두 방송 너비 조절`);
  handle.setAttribute('aria-orientation',axis==='row'?'horizontal':'vertical');handle.setAttribute('aria-valuemin','15');handle.setAttribute('aria-valuemax','85');
  handle.title='드래그로 크기 조절 · 방향키로 미세 조절 · 더블클릭으로 초기화';
  handle.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    event.preventDefault();handle.setPointerCapture(event.pointerId);document.body.classList.add('resizing');
  });
  handle.addEventListener('pointermove',event=>{
    if(!handle.hasPointerCapture(event.pointerId))return;
    splits[axis]=splitFromPointer(axis,grid.getBoundingClientRect(),event.clientX,event.clientY);apply();
  });
  handle.addEventListener('pointerup',endDrag);handle.addEventListener('pointercancel',endDrag);
  handle.addEventListener('lostpointercapture',()=>document.body.classList.remove('resizing'));
  handle.addEventListener('dblclick',()=>{splits[axis]=50;apply();persist();});
  handle.addEventListener('keydown',event=>{
    const less=axis==='row'?'ArrowUp':'ArrowLeft',more=axis==='row'?'ArrowDown':'ArrowRight';
    if(event.key===less||event.key===more){event.preventDefault();splits[axis]=clampSplit(splits[axis]+(event.key===more?2:-2));apply();persist();}
    else if(event.key==='Home'){event.preventDefault();splits[axis]=50;apply();persist();}
  });
  handles[axis]=handle;grid.append(handle);
}
reset.onclick=()=>{splits={...DEFAULT_SPLITS};apply();persist();};
document.addEventListener('fullscreenchange',()=>document.body.classList.remove('resizing'));
apply();
