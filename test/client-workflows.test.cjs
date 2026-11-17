const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const filters=require('../public/event-filters');
function client(hash='') {
 const handlers={},nodes=new Map(),calls=[],storage=new Map();
 const node=key=>{if(!nodes.has(key))nodes.set(key,{innerHTML:'',textContent:'',dataset:{},isConnected:true,addEventListener(){},setAttribute(){},focus(){},getClientRects:()=>[{}],querySelector:sel=>node(sel)});return nodes.get(key);};
 const app=node('#app'),modal=node('#modal-root');
 const location={hash,pathname:'/',search:''};
 const document={querySelector:node,addEventListener:(key,fn)=>handlers[key]=fn,activeElement:node('focus'),documentElement:{clientWidth:1280},body:{style:{paddingRight:''},classList:{add(){},remove(){},toggle(){}}}};
 const context=vm.createContext({document,location,history:{pushState(_,__,url){location.hash=url.includes('#')?'#'+url.split('#')[1]:'';}},window:{innerWidth:1280,EventlyFilters:filters,addEventListener(){},scrollTo(){}},localStorage:{getItem:k=>storage.get(k)||'',setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},requestAnimationFrame(){},getComputedStyle:()=>({paddingRight:'0'}),setTimeout:()=>0,clearTimeout(){},fetch:async(_,request)=>{const input=JSON.parse(request.body);calls.push(input);return {status:200,json:async()=>({ok:true,data:input.action==='inbox'?{invitations:[]}:[]})};}});
 vm.runInContext(fs.readFileSync('public/app.js','utf8').replace(/\ninit\(\);\s*$/,'')+'\nglobalThis.ui={state,detailModal,createModal,inviteModal,activityPage,routeURL,api};',context);
 const ui=context.ui;ui.state.user={id:'me',name:'Minh',email:'me@example.test'};ui.state.token='session';
 return {...ui,context,modal,app,calls,location,click:(action,extra={})=>handlers.click({target:{closest:()=>({dataset:{action,...extra},setAttribute(){}})}})};
}
test('owner can create, edit, delete and invite; guest, joined and pending viewers get appropriate actions',()=>{
 const c=client(),event={id:'event',title:'Meetup',owner:'me',ownerName:'Minh',startsAt:new Date(Date.now()+86400000).toISOString(),attendees:['me'],visibility:'public'};
 c.state.events=[event];c.detailModal(event);assert.match(c.modal.innerHTML,/data-action="edit-event"/);assert.match(c.modal.innerHTML,/data-action="invite-friend"/);
 c.createModal(event);for(const name of ['title','startsAt','location','visibility','description'])assert.match(c.modal.innerHTML,new RegExp(`name="${name}"`));assert.match(c.modal.innerHTML,/data-action="delete-event"/);
 c.state.friends=[{id:'friend',name:'An',email:'an@example.test'}];c.inviteModal('event');assert.match(c.modal.innerHTML,/data-action="send-invite"/);
 event.owner='other';c.detailModal(event);assert.match(c.modal.innerHTML,/data-action="join"/);
 event.request='pending';c.detailModal(event);assert.match(c.modal.innerHTML,/disabled>Đã gửi yêu cầu/);
 event.joined=true;c.detailModal(event);assert.doesNotMatch(c.modal.innerHTML,/data-action="join"/);
 c.state.invitations=[{id:'invitation',eventId:'event'}];event.joined=false;c.detailModal(event);assert.match(c.modal.innerHTML,/data-action="invite-accept"/);
});
test('client participation, friendship and deletion controls send the corresponding API requests',async()=>{
 const cases=[['friend-add','friend-request',{userId:'target'}],['friend-accept','friend-respond',{requestId:'target',accept:true}],['friend-reject','friend-respond',{requestId:'target',accept:false}],['unfriend-confirm','friend-remove',{userId:'target'}],['invite-accept','invitation-respond',{invitationId:'target',accept:true}],['invite-reject','invitation-respond',{invitationId:'target',accept:false}],['join','join-request',{eventId:'target'}],['join-accept','join-respond',{requestId:'target',accept:true}],['join-reject','join-respond',{requestId:'target',accept:false}],['delete-confirm','event-delete',{id:'target'}],['send-invite','invite',{eventId:'event',userId:'target'}]];
 for(const [action,endpoint,payload]of cases){const c=client();await c.click(action,{id:'target',event:'event'});assert.deepEqual(c.calls[0],{action:endpoint,payload});}
});
test('activity history paginates and filters, and all member pages survive deep links',()=>{
 const c=client('#inbox');assert.equal(c.state.page,'inbox');
 c.state.activity=Array.from({length:45},(_,i)=>({action:i<25?'event.create':'friend.accept',at:new Date().toISOString()}));
 let html=c.activityPage();assert.equal((html.match(/<li>/g)||[]).length,20);assert.match(html,/1 \/ 3/);
 c.state.activityPage=3;c.state.activityFilter='friend.';html=c.activityPage();assert.equal(c.state.activityPage,1);assert.equal((html.match(/<li>/g)||[]).length,20);
 for(const page of ['friends','inbox','profile','events','activity']){c.routeURL(page);assert.equal(c.location.hash,'#'+page);}
});
test('expired session clears local authentication and opens sign-in instead of leaving member UI active',async()=>{
 const c=client();c.context.fetch=async()=>({status:401,json:async()=>({ok:false,error:'Phiên hết hạn'})});
 await assert.rejects(c.api('events'),/Phiên hết hạn/);assert.equal(c.state.token,'');assert.equal(c.state.user,null);assert.equal(c.state.authOpen,true);assert.equal(c.state.page,'events');assert.match(c.modal.innerHTML,/id="auth-form"/);
});
