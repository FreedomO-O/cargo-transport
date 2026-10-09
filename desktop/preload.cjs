const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('quad',{
  command:(action,payload)=>ipcRenderer.invoke('quad:command',action,payload),
  onState:callback=>{ipcRenderer.on('quad:state',(_event,state)=>callback(state));}
});
