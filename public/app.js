import {parseSource} from './sources.js';
const grid=document.querySelector('#grid');
const state=Array(9).fill('');
const cards=Array(9).fill(null);
let order=[];
function activeSlots(){return order.filter(index=>cards[index]);}
function syncCount(){const slots=activeSlots(),count=slots.length;slots.forEach((index,position)=>{const label=cards[index].children[0].children[0];label.textContent=label.textContent.replace(/^\d+/,String(position+1).padStart(2,'0'));});try{localStorage.setItem('quad-live:count:v1',String(count));}catch{}document.querySelector('#pane-count').value=String(count);document.querySelector('#add-pane').disabled=count===9;document.querySelector('#remove-pane').disabled=count===1;}
function removePane(index){if(activeSlots().length===1){notify('최소 한 칸은 유지해야 합니다.');return;}state[index]='';cards[index].remove();cards[index]=null;order=order.filter(slot=>slot!==index);grid.classList.remove('focused');cards.filter(Boolean).forEach(card=>card.classList.remove('expanded'));syncCount();}
function changeCount(count){if(!Number.isInteger(count)||count<1||count>9)return;while(activeSlots().length<count){const index=cards.findIndex(card=>!card);render(index);}
while(activeSlots().length>count){const slots=activeSlots();const empty=slots.filter(index=>!state[index]);removePane((empty.length?empty:slots).at(-1));}syncCount();}
// Only initialize SOOP frames created by this app, from the expected origin.
window.addEventListener('message',event=>{
  if(event.origin!=='https://play.sooplive.com'||!event.data||event.data.cmd!=='PonReady')return;
  const frame=[...grid.querySelectorAll('iframe')].find(frame=>frame.contentWindow===event.source&&frame.dataset.platform==='SOOP');
  if(!frame)return;
  frame.contentWindow.postMessage({cmd:'Pload',id:frame.dataset.channelId,mutePlay:true,showChat:false,autoPlay:true,isAdShow:true,showQualityBox:true,fromApi:'1'},'https://play.sooplive.com');
});
function notify(message){const toast=document.querySelector('#toast');toast.textContent=message;toast.classList.add('visible');clearTimeout(notify.timer);notify.timer=setTimeout(()=>toast.classList.remove('visible'),3500);}
function render(index,source=''){
  let card=cards[index];
  if(!card){card=document.createElement('section');card.className='card';card.dataset.slot=String(index);cards[index]=card;order.push(index);grid.append(card);}
  card.replaceChildren();
  const bar=document.createElement('div');bar.className='bar';
  const title=document.createElement('span');title.textContent=`${String(index+1).padStart(2,'0')} / 방송 추가`;bar.append(title);
  const actions=document.createElement('div');bar.append(actions);card.append(bar);
  const removeSlot=document.createElement('button');removeSlot.textContent='칸 제거';removeSlot.onclick=()=>removePane(index);actions.append(removeSlot);
  if(source){
    const data=parseSource(source);title.textContent=`${String(index+1).padStart(2,'0')} / ${data.platform}${data.experimental?' · 실험적':''}`;
    const link=document.createElement('a');link.href=data.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='원본 열기';actions.append(link);
    const popup=document.createElement('button');popup.textContent='시청 창';popup.title='별도 창으로 열기 (외부 재생 제한 시 사용)';popup.onclick=()=>{
      const slots=activeSlots(),position=slots.indexOf(index),columns=slots.length===1?1:slots.length<=4?2:3,rows=Math.ceil(slots.length/columns);
      const width=Math.max(320,Math.floor(screen.availWidth/columns)),height=Math.max(240,Math.floor(screen.availHeight/rows));
      const left=(screen.availLeft||0)+(position%columns)*width,top=(screen.availTop||0)+Math.floor(position/columns)*height;
      window.open(data.url,'_blank',`popup=yes,width=${width},height=${height},left=${left},top=${top},noopener,noreferrer`);
      // noopener can return null even when the window opened.
      notify('시청 창을 요청했어요. 열리지 않으면 브라우저에서 팝업을 허용하세요. 위치는 브라우저 설정에 따라 달라질 수 있어요.');
    };actions.append(popup);
    const expand=document.createElement('button');expand.textContent='확대';expand.onclick=()=>{const on=card.classList.toggle('expanded');grid.classList.toggle('focused',on);expand.textContent=on?'복원':'확대';};actions.append(expand);
    const remove=document.createElement('button');remove.textContent='비우기';remove.onclick=()=>{state[index]='';grid.classList.remove('focused');card.classList.remove('expanded');render(index);};actions.append(remove);
    const iframe=document.createElement('iframe');iframe.src=data.embed;iframe.dataset.platform=data.platform;if(data.channelId)iframe.dataset.channelId=/^\d+$/.test(data.channelId)?'#'+data.channelId:data.channelId;iframe.title=`${data.platform} 방송 ${index+1}`;iframe.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';
    // Delegation allows SOOP to request access; the user still controls consent.
    if(data.platform==='SOOP')iframe.allow+='; local-network-access https://play.sooplive.com; local-network https://play.sooplive.com; loopback-network https://play.sooplive.com';
    iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';const viewport=document.createElement('div');viewport.className='player-viewport';viewport.append(iframe);
    const body=document.createElement('div');body.className='player-body';body.append(viewport);card.append(body);
    const chat=document.createElement('button');chat.textContent=data.platform==='YouTube'?'채팅':'채팅 창';chat.title=data.platform==='YouTube'?'라이브 채팅 패널 열기/닫기':'원본 사이트의 별도 채팅 창 열기';chat.setAttribute('aria-expanded','false');actions.append(chat);
    let chatPanel=null;
    chat.onclick=()=>{
      if(data.platform!=='YouTube'){window.open(data.chat,'_blank','popup=yes,width=420,height=720,noopener,noreferrer');notify('채팅 창을 요청했어요. 열리지 않으면 팝업을 허용하세요. 로그인은 원본 사이트에서 진행하세요.');return;}
      if(chatPanel){chatPanel.remove();chatPanel=null;chat.textContent='채팅';chat.setAttribute('aria-expanded','false');return;}
      if(!location.hostname){notify('유튜브 채팅은 웹사이트 주소에서 사용하세요.');return;}
      chatPanel=document.createElement('aside');chatPanel.className='chat-panel';
      const note=document.createElement('p');note.className='chat-note';note.textContent='라이브 채팅 · 방송자가 채팅을 허용해야 표시됩니다. 채팅 입력은 YouTube 로그인이 필요할 수 있습니다.';
      const chatFrame=document.createElement('iframe');chatFrame.title=`YouTube 방송 ${index+1} 실시간 채팅`;chatFrame.src=`https://www.youtube.com/live_chat?v=${encodeURIComponent(data.videoId)}&embed_domain=${encodeURIComponent(location.hostname)}&dark_theme=1`;chatFrame.referrerPolicy='strict-origin-when-cross-origin';
      chatPanel.append(note,chatFrame);body.append(chatPanel);chat.textContent='채팅 닫기';chat.setAttribute('aria-expanded','true');
    };
    if(data.experimental){const help=document.createElement('p');help.className='player-help';help.textContent=data.platform==='치지직'?'치지직이 외부 삽입을 차단하면 이 칸에서 재생할 수 없습니다. 위의 ‘시청 창’으로 원본 방송을 보세요.':'‘고화질 스트리머 연결 차단’이 뜨면 ‘해결 방법 보기’를 확인하고 브라우저의 로컬 네트워크 권한을 허용한 뒤 새로고침하세요. 허용 항목이 없거나 계속 차단되면 ‘시청 창’에서 원본 방송을 보세요.';card.append(help);}
    syncCount();return;
  }
  const empty=document.createElement('div');empty.className='empty';
  const icon=document.createElement('div');icon.className='screen-icon';icon.textContent='▷';
  const heading=document.createElement('h2');heading.textContent='어떤 방송을 볼까요?';
  const hint=document.createElement('p');hint.textContent='YouTube · SOOP · 치지직 방송 주소';
  const form=document.createElement('form');const input=document.createElement('input');input.type='url';input.required=true;input.placeholder='https://…';input.setAttribute('aria-label',`방송 ${index+1} URL`);
  const submit=document.createElement('button');submit.type='submit';submit.textContent='방송 추가';form.append(input,submit);
  const error=document.createElement('p');error.className='error';error.setAttribute('role','alert');
  form.onsubmit=event=>{event.preventDefault();try{parseSource(input.value);state[index]=input.value.trim();render(index,state[index]);}catch(e){error.textContent=e.message;}};
  empty.append(icon,heading,hint,form,error);card.append(empty);syncCount();
}
let initialCount=4;try{const stored=Number(localStorage.getItem('quad-live:count:v1'));if(Number.isInteger(stored)&&stored>=1&&stored<=9)initialCount=stored;}catch{}
for(let i=0;i<initialCount;i++)render(i);syncCount();
document.querySelector('#add-pane').onclick=()=>changeCount(Math.min(9,activeSlots().length+1));
document.querySelector('#remove-pane').onclick=()=>changeCount(Math.max(1,activeSlots().length-1));
document.querySelector('#pane-count').onchange=event=>changeCount(Number(event.target.value));
document.querySelector('#save').onclick=()=>{try{localStorage.setItem('quad-live:v1',JSON.stringify(activeSlots().map(index=>state[index])));notify('현재 방송 조합을 이 브라우저에 저장했어요.');}catch{notify('브라우저 저장소를 사용할 수 없습니다.');}};
document.querySelector('#load').onclick=()=>{try{const saved=JSON.parse(localStorage.getItem('quad-live:v1'));if(!Array.isArray(saved)||saved.length<1||saved.length>9||!saved.every(x=>typeof x==='string'))throw new Error();saved.filter(Boolean).forEach(parseSource);grid.classList.remove('focused');order=[];cards.forEach((card,index)=>{if(card)card.remove();cards[index]=null;state[index]='';});saved.forEach((x,i)=>{state[i]=x;render(i,x);});syncCount();notify('저장한 조합을 불러왔어요.');}catch{notify('불러올 수 있는 방송 조합이 없습니다.');}};
document.querySelector('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notify('이 브라우저에서는 전체 화면을 사용할 수 없습니다.');}};
if(document.addEventListener)document.addEventListener('fullscreenchange',()=>{document.querySelector('#fullscreen').textContent=document.fullscreenElement?'전체 화면 종료':'전체 화면';});
