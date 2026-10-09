export function parseSource(input) {
  let url;
  try {url=new URL(input.trim());}catch{throw new Error('https://로 시작하는 방송 주소를 입력하세요.');}
  if(url.protocol!=='https:')throw new Error('HTTPS 방송 주소만 사용할 수 있습니다.');
  if(url.username||url.password)throw new Error('인증 정보가 포함된 주소는 사용할 수 없습니다.');
  const host=url.hostname.toLowerCase(), parts=url.pathname.split('/').filter(Boolean);
  if(['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(host)) {
    let id=host==='youtu.be'?parts[0]:url.searchParams.get('v');
    if(['live','shorts','embed'].includes(parts[0]))id=parts[1];
    if(!/^[\w-]{11}$/.test(id||''))throw new Error('유튜브 영상 또는 라이브 방송 주소를 입력하세요. 채널 주소는 지원하지 않습니다.');
    return {platform:'YouTube',url:url.href,embed:`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1`,experimental:false};
  }
  if(['play.sooplive.co.kr','play.afreecatv.com'].includes(host)&&/^[a-zA-Z0-9_]+$/.test(parts[0]||'')) {
    return {platform:'SOOP',url:url.href,embed:`https://player.sooplive.co.kr/${parts[0]}/embed`,experimental:true};
  }
  if(['chzzk.naver.com','www.chzzk.naver.com'].includes(host)&&parts[0]==='live'&&/^[a-f0-9]{32}$/.test(parts[1]||'')) {
    return {platform:'치지직',url:url.href,embed:`https://chzzk.naver.com/embed/live/${parts[1]}`,experimental:true};
  }
  throw new Error('유튜브 영상, SOOP 방송, 치지직 live 주소를 입력하세요.');
}
