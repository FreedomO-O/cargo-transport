export const DEFAULT_SPLITS={top:50,bottom:50,row:50};
export function clampSplit(value){return Math.max(15,Math.min(85,Number(value)));}
export function readSplits(value){
  const result={...DEFAULT_SPLITS};
  for(const key of Object.keys(result))if(typeof value?.[key]==='number'&&Number.isFinite(value[key]))result[key]=clampSplit(value[key]);
  return result;
}
export function splitFromPointer(axis,rect,x,y){
  const size=axis==='row'?rect.height:rect.width;
  if(size<=0)return 50;
  return clampSplit(100*((axis==='row'?y-rect.top:x-rect.left)/size));
}
