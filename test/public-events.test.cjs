const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

test('public discovery keeps participation and private data behind authentication', async t => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'evently-public-'));
  const file = path.join(folder, 'data.json');
  const password = 'DisposableTest2026';
  const user = (id, name) => {
    const salt = crypto.randomBytes(16).toString('hex');
    return {id, name, email:`${id}@example.test`, salt, hash:crypto.scryptSync(password,salt,64).toString('hex')};
  };
  fs.writeFileSync(file, JSON.stringify({users:[user('host','Host'),user('visitor','Visitor')],events:[
    {id:'public-event',title:'Public meetup',description:'Visible to guests',location:'Public venue',startsAt:new Date(Date.now()+86400000).toISOString(),visibility:'public',owner:'host',attendees:['host']},
    {id:'private-event',title:'Private dinner',description:'Private details',location:'Private home',startsAt:new Date(Date.now()+86400000).toISOString(),visibility:'private',owner:'host',attendees:['host']}
  ]}));
  process.env.DATA_FILE = file;
  const {api} = require('../src/server.js');
  await new Promise(resolve => api.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${api.address().port}`;
  t.after(async () => {
    await new Promise(resolve => api.close(resolve));
    fs.rmSync(folder,{recursive:true,force:true});
  });
  const call = async (action,payload={},token='') => {
    const response=await fetch(`${base}/api`,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify({action,payload})});
    return {status:response.status,...await response.json()};
  };
  await t.test('guest discovery returns only explicitly public display fields', async () => {
    const before=fs.readFileSync(file,'utf8');
    const response=await call('public-events',{eventId:'private-event'});
    assert.equal(response.status,200);
    assert.equal(response.ok,true);
    assert.equal(response.data.length,1);
    assert.deepEqual(Object.keys(response.data[0]).sort(),['id','title','description','location','startsAt','visibility','category','area','ownerName','attendeeCount'].sort());
    assert.equal(response.data[0].id,'public-event');
    assert.equal(response.data[0].ownerName,'Host');
    assert.equal(response.data[0].attendeeCount,1);
    assert(!JSON.stringify(response.data).includes('Private dinner'));
    assert(!JSON.stringify(response.data).includes('@example.test'));
    assert.equal(fs.readFileSync(file,'utf8'),before);
  });
  await t.test('an invalid session cannot expose members or submit a join request', async () => {
    for(const action of ['events','users','friends','join-request','event-create']){
      const response=await call(action,{eventId:'public-event'},'invalid-session');
      assert.equal(response.status,401,action);
      assert.equal(response.ok,false,action);
    }
    assert.equal((await call('public-events',{},'invalid-session')).status,200);
  });
  const visitor=await call('login',{email:'visitor@example.test',password});
  assert.equal(visitor.status,200);
  await t.test('sign-in does not itself join; submitting a request still requires approval', async () => {
    assert.equal((await call('public-events')).data[0].attendeeCount,1);
    const request=await call('join-request',{eventId:'public-event'},visitor.data.token);
    assert.equal(request.status,200);
    assert.equal(request.data.ok,true);
    assert.equal((await call('public-events')).data[0].attendeeCount,1);
    assert.equal((await call('join-request',{eventId:'private-event'},visitor.data.token)).status,404);
    const host=await call('login',{email:'host@example.test',password});
    const pending=await call('join-requests',{},host.data.token);
    assert.equal(pending.data.length,1);
    assert.equal(pending.data[0].status,'pending');
    const accepted=await call('join-respond',{requestId:pending.data[0].id,accept:true},host.data.token);
    assert.equal(accepted.status,200);
    const publicView=await call('public-events');
    assert.equal(publicView.data[0].attendeeCount,2);
    assert.equal(publicView.data[0].attendees,undefined);
    assert.equal(publicView.data[0].owner,undefined);
  });
  await t.test('event filters use saved metadata and preserve it when other fields change', async()=>{
    const payload={title:'Filter test',description:'A sample',location:'Hà Nội',startsAt:new Date(Date.now()+86400000).toISOString(),visibility:'public',category:'music',area:'Ba Đình'};
    const created=await call('event-create',payload,visitor.data.token);assert.equal(created.status,200);
    let listed=(await call('public-events')).data.find(e=>e.id===created.data.id);
    assert.equal(listed.category,'music');assert.equal(listed.area,'Ba Đình');
    await call('event-update',{id:created.data.id,...payload,category:'books',area:'Cầu Giấy'},visitor.data.token);
    const {category,area,...ordinary}=payload;
    await call('event-update',{id:created.data.id,...ordinary,title:'Renamed event'},visitor.data.token);
    listed=(await call('public-events')).data.find(e=>e.id===created.data.id);
    assert.equal(listed.category,'books');assert.equal(listed.area,'Cầu Giấy');
  });
});
