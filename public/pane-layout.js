export function rowSizes(count,columns){
  if(!Number.isInteger(count)||count<1||count>9)throw new Error('방송 칸은 1~9개여야 합니다.');
  if(columns!==undefined){if(!Number.isInteger(columns)||columns<1||columns>9)throw new Error('열 개수는 1~9여야 합니다.');return Array.from({length:Math.ceil(count/columns)},(_,row)=>Math.min(columns,count-row*columns));}
  const rows=Math.ceil(count/(count<=4?2:3));
  return Array.from({length:rows},(_,row)=>Math.floor(count/rows)+(row<count%rows?1:0));
}
export function defaultLayout(count,columns){const sizes=rowSizes(count,columns);return {rows:Array.from({length:sizes.length+1},(_,i)=>i*100/sizes.length),columns:sizes.map(size=>Array.from({length:size+1},(_,i)=>i*100/size))};}
export function validateLayout(count,value,columns){
  const fallback=defaultLayout(count,columns);
  const valid=(list,length)=>Array.isArray(list)&&list.length===length&&list[0]===0&&list.at(-1)===100&&list.every((n,i)=>Number.isFinite(n)&&(i===0||n-list[i-1]>=10));
  if(!value||!valid(value.rows,fallback.rows.length)||!Array.isArray(value.columns)||value.columns.length!==fallback.columns.length||!value.columns.every((list,i)=>valid(list,fallback.columns[i].length)))return fallback;
  return {rows:[...value.rows],columns:value.columns.map(list=>[...list])};
}
export function moveBoundary(list,index,value){list[index]=Math.max(list[index-1]+10,Math.min(list[index+1]-10,value));}
