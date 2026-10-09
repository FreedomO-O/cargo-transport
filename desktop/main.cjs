const {app,BrowserWindow,WebContentsView,ipcMain,session,dialog,shell}=require('electron');
const {join}=require('node:path');
const {readFile,writeFile,mkdir}=require('node:fs/promises');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
const {layout}=require('./layout.cjs');
const smoke=process.argv.includes('--smoke-test');
let main,parseSource,focused=-1;
const panes=Array.from({length:4},()=>({url:'',platform:'',muted:true,status:'방송 주소를 입력하세요.',view:null}));
const allowedHost=hostname=>['youtube.com','youtu.be','google.com','googleusercontent.com','naver.com','sooplive.com','sooplive.co.kr','afreecatv.com'].some(domain=>hostname===domain||hostname.endsWith('.'+domain));
function safeRemote(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}}
function broadcast(){if(main&&!main.isDestroyed())main.webContents.send('quad:state',{focused,panes:panes.map(({view,...pane})=>pane)});}
function arrange(){if(!main||main.isDestroyed())return;const [width,height]=main.getContentSize();const rects=layout(width,height,focused);panes.forEach((pane,i)=>{if(pane.view){pane.view.setBounds(rects[i]);pane.view.setVisible(focused<0||focused===i);}});}
function external(url){if(safeRemote(url))shell.openExternal(url).catch(()=>{});}
function protect(contents){
  contents.on('will-navigate',(event,url)=>{if(!safeRemote(url)||!allowedHost(new URL(url).hostname)){event.preventDefault();external(url);}});
  contents.setWindowOpenHandler(({url})=>safeRemote(url)&&allowedHost(new URL(url).hostname)?{action:'allow',overrideBrowserWindowOptions:{width:900,height:750,autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,partition:'persist:quad-live'}}}:{action:'deny'});
  contents.on('did-create-window',child=>protect(child.webContents));
}
function clear(index){const pane=panes[index];if(pane.view){main.contentView.removeChildView(pane.view);pane.view.webContents.close();}panes[index]={url:'',platform:'',muted:true,status:'방송 주소를 입력하세요.',view:null};if(focused===index)focused=-1;arrange();broadcast();}
async function open(index,url){
  const source=parseSource(url);clear(index);
  const view=new WebContentsView({webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,partition:'persist:quad-live'}});
  const pane=panes[index]={url:source.url,platform:source.platform,muted:true,status:'연결 중…',view};
  main.contentView.addChildView(view);view.webContents.setAudioMuted(true);protect(view.webContents);
  view.webContents.on('did-finish-load',()=>{if(panes[index]===pane){pane.status='원본 사이트 · 음소거로 시작';broadcast();}});
  view.webContents.on('did-fail-load',(_event,code,description,_url,isMainFrame)=>{if(isMainFrame&&code!==-3&&panes[index]===pane){pane.status='연결 실패: '+description;broadcast();}});
  view.webContents.on('render-process-gone',()=>{if(panes[index]===pane){pane.status='플레이어가 종료됐습니다. 새로고침하세요.';broadcast();}});
  arrange();broadcast();
  // Smoke mode validates native views locally, without pretending to test live playback.
  await view.webContents.loadURL(smoke?'data:text/html,<h1>Native player smoke test</h1>':source.url).catch(()=>{});
}
async function command(action,payload={}){
  if(action==='state'){broadcast();return;}
  if(action==='save'){const path=join(app.getPath('userData'),'streams.json');await mkdir(app.getPath('userData'),{recursive:true});await writeFile(path,JSON.stringify(panes.map(pane=>pane.url)),{mode:0o600});return;}
  if(action==='load'){
    const saved=JSON.parse(await readFile(join(app.getPath('userData'),'streams.json'),'utf8'));
    if(!Array.isArray(saved)||saved.length!==4||!saved.every(value=>typeof value==='string'))throw new Error('저장된 조합을 읽을 수 없습니다.');
    saved.filter(Boolean).forEach(value=>parseSource(value));
    for(let i=0;i<4;i++){if(saved[i])await open(i,saved[i]);else clear(i);}return;
  }
  if(action==='fullscreen'){main.setFullScreen(!main.isFullScreen());return;}
  const index=payload.index;
  if(!Number.isInteger(index)||index<0||index>3)throw new Error('잘못된 화면 번호입니다.');
  const pane=panes[index];
  if(action==='open'){if(typeof payload.url!=='string')throw new Error('방송 주소를 입력하세요.');await open(index,payload.url);}
  else if(action==='clear')clear(index);
  else if(action==='focus'){focused=focused===index?-1:index;arrange();broadcast();}
  else if(action==='mute'&&pane.view){pane.muted=!pane.muted;pane.view.webContents.setAudioMuted(pane.muted);broadcast();}
  else if(action==='reload'&&pane.view)pane.view.webContents.reload();
  else if(action==='external')external(pane.url);
  else throw new Error('사용할 수 없는 동작입니다.');
}
app.whenReady().then(async()=>{
  if(smoke)app.setPath('userData',join(app.getPath('temp'),'quad-live-smoke-'+process.pid));
  ({parseSource}=await import(pathToFileURL(join(__dirname,'../public/sources.js')).href));
  const playerSession=session.fromPartition('persist:quad-live');
  playerSession.setPermissionCheckHandler((contents,permission,origin)=>{
    if(permission==='fullscreen')return true;
    if(['local-network-access','local-network','loopback-network'].includes(permission))return consent.has(origin);
    return false;
  });
  playerSession.setPermissionRequestHandler(async(contents,permission,callback,details)=>{
    if(permission==='fullscreen'){callback(true);return;}
    const origin=details.requestingUrl||contents.getURL();let host;try{host=new URL(origin).hostname;}catch{callback(false);return;}
    if(!['local-network-access','local-network','loopback-network'].includes(permission)||!(host==='sooplive.com'||host.endsWith('.sooplive.com'))){callback(false);return;}
    try{const result=await dialog.showMessageBox(main,{type:'question',title:'SOOP 고화질 연결 권한',message:'SOOP의 로컬 네트워크 연결을 허용할까요?',detail:'고화질 스트리머 연결에 사용될 수 있습니다. 요청 사이트: '+host,buttons:['차단','허용'],defaultId:0,cancelId:0});if(result.response===1){consent.add(origin);consent.add(new URL(origin).origin);}callback(result.response===1);}catch{callback(false);}
  });
  main=new BrowserWindow({width:1440,height:1000,minWidth:1000,minHeight:760,show:!smoke,title:'Quad Live',autoHideMenuBar:true,webPreferences:{preload:join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
  main.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  main.webContents.on('will-navigate',event=>event.preventDefault());
  main.on('resize',arrange);main.on('closed',()=>{for(const pane of panes)if(pane.view&&!pane.view.webContents.isDestroyed())pane.view.webContents.close();main=null;});
  ipcMain.handle('quad:command',async(event,action,payload)=>{
    if(event.sender!==main?.webContents||event.senderFrame!==main.webContents.mainFrame)throw new Error('허용되지 않은 요청입니다.');
    try{await command(action,payload);return {ok:true};}catch(error){return {ok:false,error:error.message};}
  });
  await main.loadFile(join(__dirname,'index.html'));
  broadcast();
  if(smoke){
    const timer=setTimeout(()=>{console.error('Smoke timed out');app.exit(1);},30000);
    try{
      assert.equal(await main.webContents.executeJavaScript('document.querySelectorAll(".pane").length'),4);
      for(let i=0;i<4;i++)await open(i,i%2?'https://chzzk.naver.com/live/'+'a'.repeat(32):'https://play.sooplive.com/lgtwinstv/297709179');
      assert.equal(main.contentView.children.length,4);
      await command('mute',{index:0});assert.equal(panes[0].view.webContents.isAudioMuted(),false);
      await command('focus',{index:1});assert.equal(panes[0].view.getVisible(),false);assert.equal(panes[1].view.getVisible(),true);
      await command('save');await command('load');assert.equal(main.contentView.children.length,4);
      assert.equal((await main.webContents.executeJavaScript('window.quad.command("clear", {index: 3})')).ok,true);
      assert.equal(main.contentView.children.length,3);
      console.log('Desktop smoke passed: UI, four native views, IPC, mute, focus, save/load, cleanup');clearTimeout(timer);app.exit(0);
    }catch(error){console.error(error);clearTimeout(timer);app.exit(1);}
  }
}).catch(error=>{console.error(error);app.exit(1);});
const consent=new Set();
app.on('window-all-closed',()=>app.quit());
