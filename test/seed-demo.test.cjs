const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {seedDemo}=require('../scripts/seed-demo');
test('demo events are dated in Vietnam, grouped across days, and safe to seed twice',t=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'evently-demo-test-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
  const file=path.join(folder,'data.json'),now=new Date('2026-11-11T04:00:00Z');
  const result=seedDemo(file,{now});assert.equal(result.added,8);assert.equal(result.createdHost,true);
  const db=JSON.parse(fs.readFileSync(file));assert.equal(db.users.length,1);assert(db.events.every(e=>e.visibility==='public'&&e.attendees.length===1));
  assert.equal(db.events.filter(e=>new Date(e.startsAt)>now).length,7);assert.equal(db.events.filter(e=>new Date(e.startsAt)<now).length,1);
  assert.equal(db.events.find(e=>e.demoKey==='coffee').startsAt,'2026-11-11T11:30:00.000Z');
  const before=fs.readFileSync(file,'utf8');assert.equal(seedDemo(file,{now}).added,0);assert.equal(fs.readFileSync(file,'utf8'),before);
});
test('seeding preserves existing accounts/events and starts upcoming examples tomorrow after evening',t=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'evently-demo-test-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
  const file=path.join(folder,'data.json'),user={id:'owner',name:'Existing user'},event={id:'private',owner:'owner',title:'Keep this',visibility:'private'};
  fs.writeFileSync(file,JSON.stringify({users:[user],events:[event],sessions:[{token:'test-session'}]}));
  const result=seedDemo(file,{now:new Date('2026-11-11T14:00:00Z')});t.after(()=>fs.rmSync(result.backup,{force:true}));
  const db=JSON.parse(fs.readFileSync(file));assert.equal(result.createdHost,false);assert.deepEqual(db.users,[user]);assert.deepEqual(db.events[0],event);assert.deepEqual(db.sessions,[{token:'test-session'}]);
  assert(db.events.slice(1).every(e=>e.owner==='owner'));assert.equal(db.events.find(e=>e.demoKey==='coffee').startsAt,'2026-11-12T11:30:00.000Z');
  assert.equal(JSON.parse(fs.readFileSync(result.backup)).events.length,1);
});

test('existing sample events receive filter metadata without overwriting edits or duplicating rows',t=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'evently-demo-test-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
  const file=path.join(folder,'data.json'),now=new Date('2026-11-11T04:00:00Z');seedDemo(file,{now});
  const db=JSON.parse(fs.readFileSync(file));const coffee=db.events.find(e=>e.demoKey==='coffee');delete coffee.category;delete coffee.area;
  const art=db.events.find(e=>e.demoKey==='painting');art.category='social';art.area='Custom area';
  fs.writeFileSync(file,JSON.stringify(db));const result=seedDemo(file,{now});t.after(()=>fs.rmSync(result.backup,{force:true}));
  const after=JSON.parse(fs.readFileSync(file));assert.equal(result.added,0);assert.equal(result.updated,1);assert.equal(after.events.length,8);
  assert.equal(after.events.find(e=>e.demoKey==='coffee').category,'social');assert.equal(after.events.find(e=>e.demoKey==='coffee').area,'Hoàn Kiếm');
  assert.equal(after.events.find(e=>e.demoKey==='painting').category,'social');assert.equal(after.events.find(e=>e.demoKey==='painting').area,'Custom area');
});
