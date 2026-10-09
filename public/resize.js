import {defaultLayout,validateLayout,moveBoundary} from './pane-layout.js';
const grid=document.querySelector('#grid'),reset=document.querySelector('#reset-layout');
let layouts={};
try{layouts=JSON.parse(localStorage.getItem('quad-live:layouts:v2'))||{};}catch{}
try{if(!layouts[4]){const legacy=JSON.parse(localStorage.getItem('quad-live:layout:v1'));if(legacy)layouts[4]=validateLayout(4,{rows:[0,legacy.row,100],columns:[[0,legacy.top,100],[0,legacy.bottom,100]]});}}catch{}
let cards=[],handles=[],signature='',count=0,current;
grid.classList.add('dynamic-layout');grid.classList.remove('resizable');
function persist(){try{localStorage.setItem('quad-live:layouts:v2',JSON.stringify(layouts));}catch{}}
function apply(){
  if(!current)return;
  const rect=grid.getBoundingClientRect(),gap=document.fullscreenElement?8:10;
  let index=0;
  current.columns.forEach((columns,row)=>{
    const top=rect.height*current.rows[row]/100+(row?gap/2:0);
    const bottom=rect.height*current.rows[row+1]/100-(row<current.columns.length-1?gap/2:0);
    for(let col=0;col<columns.length-1;col++){
      const left=rect.width*columns[col]/100+(col?gap/2:0);
      const right=rect.width*columns[col+1]/100-(col<columns.length-2?gap/2:0);
      const card=cards[index++];
      let finalLeft=left,width=right-left;
      if(columns.length===2&&card.dataset.fitRatio){const ratio=Number(card.dataset.fitRatio);const bodyHeight=Math.max(1,bottom-top-card.querySelector('.bar').getBoundingClientRect().height-2);width=Math.min(width,bodyHeight*ratio+2);finalLeft+=(right-left-width)/2;}
      for(const [key,value] of Object.entries({left:finalLeft,top,width,height:bottom-top}))card.style.setProperty('--pane-'+key,value+'px');
    }
  });
  for(const handle of handles){
    const {axis,row,boundary}=handle.layout;
    const list=axis==='row'?current.rows:current.columns[row];
    handle.setAttribute('aria-valuenow',Math.round(list[boundary]));
    if(axis==='row'){Object.assign(handle.style,{left:'0px',top:(rect.height*list[boundary]/100-gap/2)+'px',width:rect.width+'px',height:gap+'px'});}
    else{const top=rect.height*current.rows[row]/100+(row?gap/2:0),bottom=rect.height*current.rows[row+1]/100-(row<current.columns.length-1?gap/2:0);Object.assign(handle.style,{left:(rect.width*list[boundary]/100-gap/2)+'px',top:top+'px',width:gap+'px',height:(bottom-top)+'px'});}
  }
}
function save(){layouts[count]=current;persist();}
function makeHandle(axis,row,boundary){
  const handle=document.createElement('div');handle.className='resize-handle '+(axis==='row'?'horizontal':'vertical');handle.tabIndex=0;handle.layout={axis,row,boundary};
  handle.setAttribute('role','separator');handle.setAttribute('aria-label',axis==='row'?`${boundary}번째 줄 높이 조절`:`${row+1}번째 줄 ${boundary}번째 경계 너비 조절`);handle.setAttribute('aria-orientation',axis==='row'?'horizontal':'vertical');handle.setAttribute('aria-valuemin','10');handle.setAttribute('aria-valuemax','90');handle.title='드래그 · 방향키로 크기 조절 / 더블클릭으로 균등 배치';
  const list=()=>axis==='row'?current.rows:current.columns[row];
  handle.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();handle.setPointerCapture(event.pointerId);document.body.classList.add('resizing');};
  handle.onpointermove=event=>{if(!handle.hasPointerCapture(event.pointerId))return;const rect=grid.getBoundingClientRect();const size=axis==='row'?rect.height:rect.width;if(size>0){moveBoundary(list(),boundary,100*((axis==='row'?event.clientY-rect.top:event.clientX-rect.left)/size));apply();}};
  const finish=event=>{document.body.classList.remove('resizing');if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);save();};
  handle.onpointerup=finish;handle.onpointercancel=finish;handle.onlostpointercapture=()=>{document.body.classList.remove('resizing');save();};
  handle.ondblclick=()=>{const defaults=defaultLayout(count);const value=axis==='row'?defaults.rows[boundary]:defaults.columns[row][boundary];moveBoundary(list(),boundary,value);apply();save();};
  handle.onkeydown=event=>{const less=axis==='row'?'ArrowUp':'ArrowLeft',more=axis==='row'?'ArrowDown':'ArrowRight';if(event.key===less||event.key===more){event.preventDefault();moveBoundary(list(),boundary,list()[boundary]+(event.key===more?2:-2));apply();save();}};
  handles.push(handle);grid.append(handle);
}
function rebuild(){
  const next=[...grid.querySelectorAll('.card')];const key=next.map(card=>card.dataset.slot).join(',');
  if(key===signature)return;signature=key;cards=next;count=cards.length;if(count<1||count>9)return;
  handles.forEach(handle=>handle.remove());handles=[];document.body.classList.remove('resizing');
  current=validateLayout(count,layouts[count]);layouts[count]=current;
  for(let row=1;row<current.rows.length-1;row++)makeHandle('row',0,row);
  current.columns.forEach((list,row)=>{for(let col=1;col<list.length-1;col++)makeHandle('column',row,col);});
  apply();
}
reset.onclick=()=>{cards.forEach(card=>{delete card.dataset.fitRatio;card.classList.remove('pane-fitted');});current=defaultLayout(count);apply();save();};
function fitPane(slot,ratio,attempt=0){
  if(!Number.isFinite(ratio)||ratio<0.1||ratio>10)return;
  const index=cards.findIndex(card=>Number(card.dataset.slot)===slot);if(index<0)return;
  let offset=0,row=0;
  while(row<current.columns.length&&index>=offset+current.columns[row].length-1){offset+=current.columns[row].length-1;row++;}
  const columns=current.columns[row],col=index-offset,card=cards[index];card.classList.add('pane-fitted');
  const viewport=card.querySelector('.player-viewport');if(!viewport)return;
  if(columns.length===2){card.dataset.fitRatio=String(ratio);apply();if(attempt<4)requestAnimationFrame(()=>fitPane(slot,ratio,attempt+1));return;}
  const rect=grid.getBoundingClientRect(),gap=document.fullscreenElement?8:10;
  const chat=card.querySelector('.chat-panel');
  const desired=viewport.getBoundingClientRect().height*ratio+2+(chat?chat.getBoundingClientRect().width:0);
  const delta=100*(desired+(col?gap/2:0)+(col<columns.length-2?gap/2:0))/rect.width;
  if(col<columns.length-2)moveBoundary(columns,col+1,columns[col]+delta);
  else moveBoundary(columns,col,columns[col+1]-delta);
  apply();save();if(attempt<4)requestAnimationFrame(()=>fitPane(slot,ratio,attempt+1));
}
window.addEventListener('quad:fit-pane',event=>{const {slot,ratio}=event.detail||{};fitPane(slot,ratio);});
new MutationObserver(rebuild).observe(grid,{childList:true});
new ResizeObserver(apply).observe(grid);
document.addEventListener('fullscreenchange',()=>{document.body.classList.remove('resizing');apply();});
rebuild();
