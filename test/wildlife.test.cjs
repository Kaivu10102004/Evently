const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/wildlife.js'),'utf8');
function fixture(){
  const callbacks=new Map();let id=0,renders=0,poster;
  const context2d={drawImage(){renders++;},getImageData(x,y,w,h){return {data:new Uint8ClampedArray(w*h*4)};},clearRect(){},save(){},restore(){},translate(){},rotate(){},beginPath(){},ellipse(){},fill(){},moveTo(){},lineTo(){},closePath(){},putImageData(){}};
  const canvas={isConnected:true,getContext:()=>context2d};
  const film={readyState:2,poster:'/assets/meadow-poster.jpg',requestVideoFrameCallback(fn){callbacks.set(++id,fn);return id;},cancelVideoFrameCallback(id){callbacks.delete(id);}};
  const wrap={querySelector:()=>canvas};
  const scope={window:{},document:{createElement:()=>({getContext:()=>context2d})},Image:class{constructor(){poster=this;this.complete=true;this.naturalWidth=1920;}},Uint8ClampedArray};
  vm.runInNewContext(source,scope);
  return {factory:scope.window.EventlyWildlife,canvas,film,wrap,callbacks,renderCount:()=>renders,frame(now){const [id,fn]=callbacks.entries().next().value;callbacks.delete(id);fn(now);},poster:()=>poster};
}
test('wildlife uses one frame callback, cancels while paused and reuses its renderer',()=>{
  const f=fixture(),engine=f.factory.create(f.film,f.wrap);
  assert.equal(f.callbacks.size,0);
  engine.setPaused(false);engine.setPaused(false);assert.equal(f.callbacks.size,1);
  f.frame(1000);f.frame(1042);assert.equal(f.callbacks.size,1);
  engine.setPaused(true);assert.equal(f.callbacks.size,0);
  const frozen=f.renderCount();
  assert.equal(f.factory.create(f.film,f.wrap),engine);
  assert.equal(f.renderCount(),frozen);
  engine.setPaused(false);assert.equal(f.callbacks.size,1);
  f.canvas.isConnected=false;f.frame(2000);assert.equal(f.callbacks.size,0);
});
test('poster supplies the static animal when video has no decoded frame',()=>{
  const f=fixture();f.film.readyState=0;
  const engine=f.factory.create(f.film,f.wrap);
  engine.setPaused(true);assert(f.renderCount()>0);assert.equal(f.callbacks.size,0);
});
test('unavailable canvas does not break the meadow',()=>{
  const f=fixture();const engine=f.factory.create(f.film,{querySelector:()=>null});
  assert.doesNotThrow(()=>engine.setPaused(true));
});
