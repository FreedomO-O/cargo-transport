const inputs=document.querySelector('#inputs'),panes=document.querySelector('#panes');
let initialized=false;
const urls=[];
function message(text){document.querySelector('#message').textContent=text;}
async function send(action,payload){const result=await window.quad.command(action,payload);if(!result.ok)message(result.error);else if(action==='save')message('방송 조합을 PC에 저장했습니다.');return result;}
for(let index=0;index<4;index++){
  const form=document.createElement('form'),label=document.createElement('label'),input=document.createElement('input'),button=document.createElement('button');
  label.textContent=String(index+1).padStart(2,'0');label.htmlFor='url-'+index;input.id=label.htmlFor;input.type='url';input.required=true;input.placeholder='YouTube · SOOP · 치지직 방송 URL';input.setAttribute('aria-label',`방송 ${index+1} URL`);button.textContent='열기';form.append(label,input,button);urls.push(input);
  form.onsubmit=event=>{event.preventDefault();send('open',{index,url:input.value.trim()});};inputs.append(form);
  const pane=document.createElement('section');pane.className='pane';panes.append(pane);
}
window.quad.onState(state=>{
  panes.classList.toggle('focused',state.focused>=0);
  state.panes.forEach((pane,index)=>{
    if(!initialized||document.activeElement!==urls[index])urls[index].value=pane.url;
    const node=panes.children[index];node.classList.toggle('focused-pane',state.focused===index);node.replaceChildren();
    const bar=document.createElement('div');bar.className='bar';const title=document.createElement('span');title.textContent=`${index+1} / ${pane.platform||'방송 추가'}`;title.title=pane.status;bar.append(title);
    const actions=document.createElement('div');actions.className='actions';
    for(const [action,text] of [['mute',pane.muted?'소리 켜기':'음소거'],['reload','새로고침'],['focus',state.focused===index?'복원':'확대'],['external','브라우저'],['clear','닫기']]){const button=document.createElement('button');button.textContent=text;button.disabled=!pane.url;button.onclick=()=>send(action,{index});actions.append(button);}bar.append(actions);node.append(bar);
    if(!pane.url){const empty=document.createElement('div');empty.className='empty';const heading=document.createElement('div');heading.textContent='원본 방송을 한 화면에';const hint=document.createElement('p');hint.textContent='위쪽에 방송 주소를 넣어 시작하세요.';empty.append(heading,hint);node.append(empty);}
    if(pane.status.startsWith('연결 실패:'))message(`${index+1}번 방송 ${pane.status}`);
  });initialized=true;
});
document.querySelectorAll('nav button').forEach(button=>button.onclick=()=>send(button.dataset.action));
send('state');
