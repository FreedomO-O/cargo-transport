export function parseRatio(value){
  if(value==='auto')return null;
  if(typeof value!=='string')throw new Error('영상 비율을 9:16처럼 입력하세요.');
  const match=value.trim().match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if(!match)throw new Error('영상 비율을 9:16처럼 입력하세요.');
  const width=Number(match[1]),height=Number(match[2]),ratio=width/height;
  if(width<=0||height<=0||!Number.isFinite(ratio)||ratio<0.1||ratio>10)throw new Error('비율은 1:10에서 10:1 사이로 입력하세요.');
  return ratio;
}
export function frameSize(width,height,ratio,fit){
  if(!ratio||width<=0||height<=0)return {width,height};
  const nextWidth=fit==='contain'?Math.min(width,height*ratio):Math.max(width,height*ratio);
  return {width:nextWidth,height:nextWidth/ratio};
}
