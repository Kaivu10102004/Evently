const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const filters=require('../public/event-filters');

function client(){
  const handlers={},nodes=new Map();let document;
  const node=key=>{
    if(!nodes.has(key))nodes.set(key,{innerHTML:'',textContent:'',dataset:{},isConnected:true,disabled:false,setAttribute(){},focus(){document.activeElement=this;},getClientRects:()=>[{}]});
    return nodes.get(key);
  };
  const app=node('app');app.addEventListener=()=>{};
  const modal=node('modal');modal.querySelector=node;
  document={querySelector:key=>key==='#app'?app:key==='#modal-root'?modal:node(key),addEventListener:(key,fn)=>handlers[key]=fn,activeElement:node('trigger'),documentElement:{clientWidth:1280},body:{style:{paddingRight:''},classList:{add(){},remove(){}}}};
  const context=vm.createContext({document,location:{hash:'#events'},window:{innerWidth:1280,EventlyFilters:filters,addEventListener(){},scrollTo(){}},localStorage:{getItem:()=>'',removeItem(){}},requestAnimationFrame(){},getComputedStyle:()=>({paddingRight:'0'}),setTimeout,clearTimeout});
  const source=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8').replace(/\ninit\(\);\s*$/,'');
  vm.runInContext(source+'\nglobalThis.ui={state,render,eventFilterResults};',context);
  const {state,render,eventFilterResults}=context.ui;
  const startsAt=new Date(Date.now()+86400000).toISOString();
  state.events=[
    {id:'art',title:'Painting',category:'creative',area:'Tây Hồ',visibility:'public',startsAt,owner:'host'},
    {id:'music',title:'Music',category:'music',area:'Đống Đa',visibility:'public',startsAt,owner:'host'},
    {id:'book',title:'Books',category:'books',area:'Tây Hồ',visibility:'public',startsAt,owner:'host'}
  ];
  render();
  const click=(action,extra={})=>handlers.click({target:{closest:()=>({dataset:{action,...extra}})}});
  const check=(group,value,checked=true)=>handlers.change({target:{dataset:{eventFilter:group},value,checked}});
  return {state,render,eventFilterResults,app,modal,click,check,handlers,nodes};
}

test('guest filter drafts preview multiple selections, cancel unchanged, then apply to timeline',async()=>{
  const c=client();await c.click('open-event-filters');
  assert.match(c.modal.innerHTML,/role="tablist"/);assert.match(c.modal.innerHTML,/type="checkbox"/);
  assert(!c.modal.innerHTML.includes('filter-tab-scopes'));
  c.check('categories','creative');c.check('categories','music');
  assert.equal(c.eventFilterResults(c.state.eventFilterDraft).length,2);
  assert.equal(filters.selectionCount(c.state.eventSelection),0);
  await c.click('close-modal');assert.equal(c.state.eventFilterDraft,null);
  await c.click('open-event-filters');assert.equal(filters.selectionCount(c.state.eventFilterDraft),0);
  c.check('categories','creative');c.check('categories','music');
  await c.click('event-filter-group',{group:'areas'});c.check('areas','tay ho');
  assert.equal(c.eventFilterResults(c.state.eventFilterDraft).length,1);
  await c.click('apply-event-filters');assert.equal(c.state.eventFilterDraft,null);
  assert.match(c.app.innerHTML,/event-timeline/);assert.match(c.app.innerHTML,/Painting/);
  assert(!c.app.innerHTML.includes('>Music<'));assert(!c.app.innerHTML.includes('>Books<'));
  assert.equal(filters.selectionCount(c.state.eventSelection),3);
  await c.click('open-event-filters');c.check('categories','creative',false);
  await c.click('reset-event-filter-draft');assert.equal(filters.selectionCount(c.state.eventFilterDraft),0);
  await c.click('close-modal');assert.equal(filters.selectionCount(c.state.eventSelection),3);
  await c.click('clear-event-filters');assert.equal(filters.selectionCount(c.state.eventSelection),0);
  assert.match(c.app.innerHTML,/>Music</);
});

test('member visibility and participation are multi-select and persist through group navigation',async()=>{
  const c=client();c.state.user={id:'me',name:'Me'};
  c.state.events[0].owner='me';c.state.events[0].visibility='private';c.state.events[1].joined=true;
  await c.click('open-event-filters');assert.match(c.modal.innerHTML,/filter-tab-scopes/);
  c.check('scopes','mine');c.check('scopes','joined');
  assert.equal(c.eventFilterResults(c.state.eventFilterDraft).length,2);
  c.check('visibility','private');assert.equal(c.eventFilterResults(c.state.eventFilterDraft).length,1);
  c.check('visibility','public');assert.equal(c.eventFilterResults(c.state.eventFilterDraft).length,2);
  await c.click('event-filter-group',{group:'scopes'});
  assert.equal(c.state.eventFilterDraft.scopes.length,2);
  let prevented=false;
  c.handlers.keydown({key:'Home',target:{closest:()=>({})},preventDefault(){prevented=true;}});
  assert(prevented);assert.equal(c.state.eventFilterGroup,'categories');
  await c.click('apply-event-filters');assert.equal(c.eventFilterResults(c.state.eventSelection).length,2);
});
