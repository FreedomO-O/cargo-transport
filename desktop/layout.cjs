const TOP=180, GAP=12, BAR=44;
function layout(width,height,focused=-1){
  const paneWidth=Math.floor((width-3*GAP)/2);
  const paneHeight=Math.floor((height-TOP-3*GAP)/2);
  return Array.from({length:4},(_,i)=>focused<0?
    {x:GAP+(i%2)*(paneWidth+GAP),y:TOP+GAP+Math.floor(i/2)*(paneHeight+GAP)+BAR,width:Math.max(1,paneWidth),height:Math.max(1,paneHeight-BAR)}:
    {x:GAP,y:TOP+GAP+BAR,width:Math.max(1,width-2*GAP),height:Math.max(1,height-TOP-2*GAP-BAR)});
}
module.exports={layout};
