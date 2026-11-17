const http = require('node:http');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');
const eventFilters = require('../public/event-filters');

const PORT = Number(process.env.PORT || 3000);
const SOCKET_PORT = Number(process.env.SOCKET_PORT || 4000);
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, '..', 'data.json');
const WEB = path.join(__dirname, '..', 'public');
const empty = { users: [], sessions: [], friends: [], friendRequests: [], events: [], invitations: [], joinRequests: [], logs: [] };
let db = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : empty;
for (const key of Object.keys(empty)) if (!Array.isArray(db[key])) db[key] = [];
function save() { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2)); }
function id() { return crypto.randomUUID(); }
function log(actor, action, detail = {}) { db.logs.unshift({ id:id(), actor, action, detail, at:new Date().toISOString() }); db.logs = db.logs.slice(0, 500); }
function publicUser(u) { return { id:u.id, name:u.name, email:u.email }; }
function sessionUser(token) { const s=db.sessions.find(x=>x.token===token && x.expires>Date.now()); return s && db.users.find(u=>u.id===s.userId); }
function fail(message, status=400) { const e=new Error(message); e.status=status; throw e; }
function pair(a,b) { return [a,b].sort().join(':'); }
function execute(action, payload={}, token='') {
  let me=sessionUser(token);
  const need=()=>{ if(!me) fail('Vui lòng đăng nhập để tiếp tục.',401); };
  if(action==='register') {
    const {name,email,password}=payload; if(!name?.trim()||!email||!password) fail('Vui lòng nhập đủ thông tin.');
    if(password.length<8) fail('Mật khẩu cần ít nhất 8 ký tự.'); if(db.users.some(u=>u.email===email.toLowerCase())) fail('Email này đã được sử dụng.');
    const salt=crypto.randomBytes(16).toString('hex'); const user={id:id(),name:name.trim(),email:email.toLowerCase(),salt,hash:crypto.scryptSync(password,salt,64).toString('hex'),createdAt:new Date().toISOString()}; db.users.push(user); me=user;
    const s={token:crypto.randomBytes(32).toString('hex'),userId:user.id,expires:Date.now()+30*864e5}; db.sessions.push(s); log(me.id,'account.register'); save(); return {token:s.token,user:publicUser(me)};
  }
  if(action==='login') { const u=db.users.find(x=>x.email===String(payload.email||'').toLowerCase()); if(!u||crypto.scryptSync(String(payload.password||''),u.salt,64).toString('hex')!==u.hash) fail('Email hoặc mật khẩu chưa chính xác.',401); me=u; const s={token:crypto.randomBytes(32).toString('hex'),userId:u.id,expires:Date.now()+30*864e5}; db.sessions.push(s); log(me.id,'auth.login'); save(); return {token:s.token,user:publicUser(me)}; }
  if(action==='logout') { need(); db.sessions=db.sessions.filter(s=>s.token!==token); log(me.id,'auth.logout'); save(); return {ok:true}; }
  // Public discovery exposes only public event details, host display name and headcount.
  if(action==='public-events') return db.events.filter(e=>e.visibility==='public').map(e=>({
    id:e.id,title:e.title,description:e.description,location:e.location,startsAt:e.startsAt,visibility:'public',category:eventFilters.category(e),area:eventFilters.area(e),...(e.cover?{cover:e.cover}:{}),
    ownerName:db.users.find(u=>u.id===e.owner)?.name||'Thành viên Evently',attendeeCount:e.attendees.length
  }));
  if(action==='me') { need(); return {...publicUser(me),bio:me.bio||''}; }
  need();
  if(action==='profile-update') {
    const name=typeof payload.name==='string'?payload.name.trim():'';
    const bio=typeof payload.bio==='string'?payload.bio.trim():'';
    if(!name||name.length>80)fail('Tên cần từ 1 đến 80 ký tự.');
    if(bio.length>200)fail('Giới thiệu tối đa 200 ký tự.');
    Object.assign(me,{name,bio});save();return {...publicUser(me),bio};
  }
  const users=()=>db.users.filter(u=>u.id!==me.id);
  if(action==='users') return users().map(u=>({...publicUser(u), friendship:db.friends.some(f=>f.pair===pair(me.id,u.id))?'friends':db.friendRequests.some(r=>r.from===me.id&&r.to===u.id)?'sent':db.friendRequests.some(r=>r.from===u.id&&r.to===me.id)?'received':'none'}));
  if(action==='friends') return db.friends.filter(f=>f.pair.split(':').includes(me.id)).map(f=>publicUser(db.users.find(u=>u.id===f.pair.split(':').find(x=>x!==me.id)))).filter(Boolean);
  if(action==='friend-requests') return db.friendRequests.filter(r=>r.to===me.id).map(r=>({...r,user:publicUser(db.users.find(u=>u.id===r.from))}));
  if(action==='friend-request') { const target=db.users.find(u=>u.id===payload.userId); if(!target||target.id===me.id) fail('Không tìm thấy người dùng.'); if(db.friends.some(f=>f.pair===pair(me.id,target.id))) fail('Hai bạn đã là bạn bè.'); if(db.friendRequests.some(r=>r.from===me.id&&r.to===target.id)) fail('Lời mời đã được gửi.'); const r={id:id(),from:me.id,to:target.id,at:new Date().toISOString()}; db.friendRequests.push(r); log(me.id,'friend.request',{to:target.id}); save(); return {ok:true}; }
  if(action==='friend-respond') { const r=db.friendRequests.find(x=>x.id===payload.requestId&&x.to===me.id); if(!r) fail('Lời mời không còn tồn tại.',404); db.friendRequests=db.friendRequests.filter(x=>x!==r); if(payload.accept) db.friends.push({pair:pair(r.from,r.to),at:new Date().toISOString()}); log(me.id,payload.accept?'friend.accept':'friend.reject',{from:r.from}); save(); return {ok:true}; }
  if(action==='friend-remove') { const p=pair(me.id,payload.userId); const n=db.friends.length; db.friends=db.friends.filter(f=>f.pair!==p); if(n===db.friends.length) fail('Không tìm thấy bạn bè.',404); log(me.id,'friend.remove',{userId:payload.userId}); save(); return {ok:true}; }
  if(action==='events') { const friends=db.friends.filter(f=>f.pair.split(':').includes(me.id)).map(f=>f.pair.split(':').find(x=>x!==me.id)); return db.events.filter(e=>e.visibility==='public'||e.owner===me.id||friends.includes(e.owner)||db.invitations.some(i=>i.eventId===e.id&&i.userId===me.id)).map(e=>({...e,ownerName:db.users.find(u=>u.id===e.owner)?.name,joined:e.attendees.includes(me.id),invitation:db.invitations.find(i=>i.eventId===e.id&&i.userId===me.id)?.status,request:db.joinRequests.find(i=>i.eventId===e.id&&i.userId===me.id)?.status})); }
  if(action==='event-create'||action==='event-update') { let e; if(action==='event-update'){e=db.events.find(x=>x.id===payload.id&&x.owner===me.id);if(!e)fail('Không tìm thấy sự kiện.',404);} else {e={id:id(),owner:me.id,attendees:[me.id],createdAt:new Date().toISOString()};db.events.unshift(e);} const {title,description,location,startsAt,visibility}=payload; if(!title?.trim()||!location?.trim()||!startsAt) fail('Vui lòng nhập tên, thời gian và địa điểm.'); Object.assign(e,{title:title.trim(),description:(description||'').trim(),location:location.trim(),startsAt,visibility:visibility==='private'?'private':'public',category:eventFilters.category({category:payload.category??e.category}),area:String(payload.area??e.area??'').trim().slice(0,80)}); log(me.id,action==='event-create'?'event.create':'event.update',{eventId:e.id});save();return e; }
  if(action==='event-delete') { const e=db.events.find(x=>x.id===payload.id&&x.owner===me.id);if(!e)fail('Không tìm thấy sự kiện của bạn.',404);db.events=db.events.filter(x=>x!==e);db.invitations=db.invitations.filter(x=>x.eventId!==e.id);db.joinRequests=db.joinRequests.filter(x=>x.eventId!==e.id);log(me.id,'event.delete',{eventId:e.id});save();return {ok:true}; }
  if(action==='invite') { const e=db.events.find(x=>x.id===payload.eventId&&x.owner===me.id);if(!e)fail('Chỉ chủ sự kiện mới có thể gửi lời mời.',403);const f=db.friends.find(x=>x.pair===pair(me.id,payload.userId));if(!f)fail('Bạn chỉ có thể mời bạn bè.');if(db.invitations.some(i=>i.eventId===e.id&&i.userId===payload.userId))fail('Lời mời đã tồn tại.');db.invitations.push({id:id(),eventId:e.id,userId:payload.userId,from:me.id,status:'pending',at:new Date().toISOString()});log(me.id,'event.invite',{eventId:e.id,userId:payload.userId});save();return {ok:true}; }
  if(action==='invitation-respond') { const i=db.invitations.find(x=>x.id===payload.invitationId&&x.userId===me.id);if(!i)fail('Không tìm thấy lời mời.',404);i.status=payload.accept?'accepted':'declined';if(payload.accept){const e=db.events.find(x=>x.id===i.eventId);if(e&&!e.attendees.includes(me.id))e.attendees.push(me.id);}log(me.id,'event.invitation.respond',{invitationId:i.id,status:i.status});save();return {ok:true}; }
  if(action==='join-request') { const e=db.events.find(x=>x.id===payload.eventId&&x.visibility==='public');if(!e)fail('Sự kiện công khai không tồn tại.',404);if(e.attendees.includes(me.id))fail('Bạn đã tham gia sự kiện.');if(db.joinRequests.some(r=>r.eventId===e.id&&r.userId===me.id&&r.status==='pending'))fail('Yêu cầu đang chờ duyệt.');const r={id:id(),eventId:e.id,userId:me.id,status:'pending',at:new Date().toISOString()};db.joinRequests.push(r);log(me.id,'event.join.request',{eventId:e.id});save();return {ok:true}; }
  if(action==='join-requests') { const owned=new Set(db.events.filter(e=>e.owner===me.id).map(e=>e.id));return db.joinRequests.filter(r=>owned.has(r.eventId)&&r.status==='pending').map(r=>({...r,user:publicUser(db.users.find(u=>u.id===r.userId)),event:db.events.find(e=>e.id===r.eventId)})); }
  if(action==='join-respond') { const r=db.joinRequests.find(x=>x.id===payload.requestId);const e=r&&db.events.find(x=>x.id===r.eventId&&x.owner===me.id);if(!e||r.status!=='pending')fail('Yêu cầu không còn tồn tại.',404);r.status=payload.accept?'accepted':'declined';if(payload.accept&&!e.attendees.includes(r.userId))e.attendees.push(r.userId);log(me.id,'event.join.respond',{requestId:r.id,status:r.status});save();return {ok:true}; }
  if(action==='activity') return db.logs.filter(l=>l.actor===me.id).slice(0,100).map(l=>({...l,actorName:me.name}));
  if(action==='inbox') return {invitations:db.invitations.filter(i=>i.userId===me.id&&i.status==='pending').map(i=>({...i,event:db.events.find(e=>e.id===i.eventId),from:publicUser(db.users.find(u=>u.id===i.from))})),friendRequests:db.friendRequests.filter(r=>r.to===me.id).length};
  fail('Thao tác không được hỗ trợ.',404);
}
function response(res, status, data) {
  res.writeHead(status, {'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*'});
  res.end(JSON.stringify(data));
}
const MIME = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml',
  '.jpg':'image/jpeg', '.png':'image/png', '.webp':'image/webp',
  '.mp4':'video/mp4', '.ttf':'font/ttf', '.woff2':'font/woff2'
};
function serveStatic(req, res, pathname) {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405, {Allow:'GET, HEAD'}); res.end(); return; }
  let relative;
  try { relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1)); }
  catch { res.writeHead(400); res.end(); return; }
  const file = path.resolve(WEB, relative);
  if (!file.startsWith(path.resolve(WEB) + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    const headers = {'Content-Type':MIME[path.extname(file)] || 'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache'};
    let start = 0, end = stat.size - 1, status = 200;
    if (req.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!range || (!range[1] && !range[2])) { res.writeHead(416, {'Content-Range':`bytes */${stat.size}`}); res.end(); return; }
      if (!range[1]) start = Math.max(0, stat.size - Number(range[2]));
      else { start = Number(range[1]); if (range[2]) end = Math.min(Number(range[2]), end); }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= stat.size) {
        res.writeHead(416, {'Content-Range':`bytes */${stat.size}`}); res.end(); return;
      }
      status = 206; headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
    }
    headers['Content-Length'] = Math.max(0, end - start + 1);
    res.writeHead(status, headers);
    if (req.method === 'HEAD' || stat.size === 0) { res.end(); return; }
    const stream = fs.createReadStream(file, {start, end});
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  });
}
const api = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {'access-control-allow-origin':'*','access-control-allow-headers':'content-type,authorization','access-control-allow-methods':'GET,POST,OPTIONS'});
    res.end(); return;
  }
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/api') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const input = body ? JSON.parse(body) : {};
        const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || input.token || '';
        response(res, 200, {ok:true, data:execute(input.action, input.payload || {}, token)});
      } catch (error) { response(res, error.status || 400, {ok:false, error:error.message}); }
    });
    return;
  }
  serveStatic(req, res, u.pathname);
});

const socket=net.createServer(conn=>{conn.setEncoding('utf8');let buffer='';conn.on('data',chunk=>{buffer+=chunk;while(buffer.includes('\n')){const i=buffer.indexOf('\n'),line=buffer.slice(0,i).trim();buffer=buffer.slice(i+1);if(!line)continue;try{const m=JSON.parse(line),data=execute(m.action,m.payload||{},m.token||'');conn.write(JSON.stringify({id:m.id||null,ok:true,data})+'\n');}catch(e){conn.write(JSON.stringify({id:null,ok:false,error:e.message})+'\n');}}});});
if(require.main===module){
  api.listen(PORT,()=>console.log(`Evently web: http://localhost:${PORT}`));
  socket.listen(SOCKET_PORT,()=>console.log(`Evently TCP line socket: 127.0.0.1:${SOCKET_PORT}`));
}
module.exports={api,socket,execute};
