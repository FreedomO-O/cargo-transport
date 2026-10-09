import {parseSource} from './sources.js';
const grid=document.querySelector('#grid');
const state=Array(4).fill('');
function notify(message){const toast=document.querySelector('#toast');toast.textContent=message;toast.classList.add('visible');clearTimeout(notify.timer);notify.timer=setTimeout(()=>toast.classList.remove('visible'),3500);}
function render(index,source=''){
  let card=grid.children[index];
  if(!card){card=document.createElement('section');card.className='card';grid.append(card);}
  card.replaceChildren();
  const bar=document.createElement('div');bar.className='bar';
  const title=document.createElement('span');title.textContent=`${String(index+1).padStart(2,'0')} / 방송 추가`;bar.append(title);
  const actions=document.createElement('div');bar.append(actions);card.append(bar);
  if(source){
    const data=parseSource(source);title.textContent=`${String(index+1).padStart(2,'0')} / ${data.platform}${data.experimental?' · 실험적':''}`;
    const link=document.createElement('a');link.href=data.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='원본 열기';actions.append(link);
    const expand=document.createElement('button');expand.textContent='확대';expand.onclick=()=>{const on=card.classList.toggle('expanded');grid.classList.toggle('focused',on);expand.textContent=on?'복원':'확대';};actions.append(expand);
    const remove=document.createElement('button');remove.textContent='닫기';remove.onclick=()=>{state[index]='';grid.classList.remove('focused');card.classList.remove('expanded');render(index);};actions.append(remove);
    const iframe=document.createElement('iframe');iframe.src=data.embed;iframe.title=`${data.platform} 방송 ${index+1}`;iframe.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';card.append(iframe);
    return;
  }
  const empty=document.createElement('div');empty.className='empty';
  const icon=document.createElement('div');icon.className='screen-icon';icon.textContent='▷';
  const heading=document.createElement('h2');heading.textContent='어떤 방송을 볼까요?';
  const hint=document.createElement('p');hint.textContent='YouTube · SOOP · 치지직 방송 주소';
  const form=document.createElement('form');const input=document.createElement('input');input.type='url';input.required=true;input.placeholder='https://…';input.setAttribute('aria-label',`방송 ${index+1} URL`);
  const submit=document.createElement('button');submit.type='submit';submit.textContent='방송 추가';form.append(input,submit);
  const error=document.createElement('p');error.className='error';error.setAttribute('role','alert');
  form.onsubmit=event=>{event.preventDefault();try{parseSource(input.value);state[index]=input.value.trim();render(index,state[index]);}catch(e){error.textContent=e.message;}};
  empty.append(icon,heading,hint,form,error);card.append(empty);
}
state.forEach((_,i)=>render(i));
document.querySelector('#save').onclick=()=>{try{localStorage.setItem('quad-live:v1',JSON.stringify(state));notify('현재 방송 조합을 이 브라우저에 저장했어요.');}catch{notify('브라우저 저장소를 사용할 수 없습니다.');}};
document.querySelector('#load').onclick=()=>{try{const saved=JSON.parse(localStorage.getItem('quad-live:v1'));if(!Array.isArray(saved)||saved.length!==4||!saved.every(x=>typeof x==='string'))throw new Error();saved.filter(Boolean).forEach(parseSource);grid.classList.remove('focused');saved.forEach((x,i)=>{state[i]=x;grid.children[i].classList.remove('expanded');render(i,x);});notify('저장한 조합을 불러왔어요.');}catch{notify('불러올 수 있는 방송 조합이 없습니다.');}};
document.querySelector('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notify('이 브라우저에서는 전체 화면을 사용할 수 없습니다.');}};
