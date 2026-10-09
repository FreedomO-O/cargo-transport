import http from 'node:http';
import {readFile} from 'node:fs/promises';
const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/sources.js':'sources.js','/resize.js':'resize.js','/resize-layout.js':'resize-layout.js','/pane-layout.js':'pane-layout.js','/video-fit.js':'video-fit.js','/video-layout.js':'video-layout.js','/move.js':'move.js'};
const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8'};
http.createServer(async(req,res)=>{
  const file=files[new URL(req.url,'http://localhost').pathname];
  if(!file){res.writeHead(404);return res.end('Not found');}
  try { const data=await readFile(new URL('./public/'+file,import.meta.url));res.writeHead(200,{'Content-Type':types[file.split('.').pop()],'X-Content-Type-Options':'nosniff'});res.end(data); }
  catch {res.writeHead(500);res.end('Server error');}
}).listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Quad Live listening on port '+(process.env.PORT||3000)));
