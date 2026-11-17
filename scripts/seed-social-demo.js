const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {seedDemo}=require('./seed-demo');
async function main(){
if(!process.env.DATA_FILE){
 const running=await new Promise(resolve=>{const socket=require('node:net').createConnection({host:'127.0.0.1',port:Number(process.env.PORT||3000)});const finish=value=>{socket.destroy();resolve(value);};socket.once('connect',()=>finish(true));socket.once('error',()=>finish(false));socket.setTimeout(800,()=>finish(true));});
 if(running)throw Error('Dừng server Evently trước khi thêm dữ liệu mẫu.');
}
const file=process.env.DATA_FILE||path.join(__dirname,'..','data.json');
const original=JSON.parse(fs.readFileSync(file,'utf8'));
const latest=original.sessions.filter(s=>s.expires>Date.now()).at(-1);
const owner=original.users.find(u=>u.id===latest?.userId)||original.users.find(u=>!u.demoHost&&!u.socialDemoKey);
if(!owner)throw Error('Cần có tài khoản người dùng trước khi thêm dữ liệu xã hội.');
const backup=path.join(os.tmpdir(),`evently-before-social-${crypto.randomUUID()}.json`);
fs.copyFileSync(file,backup);fs.chmodSync(backup,0o600);
seedDemo(file);
const db=JSON.parse(fs.readFileSync(file,'utf8'));
const now=new Date();
const stamp=(hours=0)=>new Date(now.getTime()-hours*3600000).toISOString();
const uid=()=>crypto.randomUUID();
const people=[['an','Minh An'],['linh','Thảo Linh'],['khoa','Đăng Khoa'],['mai','Ngọc Mai'],['nam','Hoàng Nam'],['vy','Khánh Vy'],['tung','Sơn Tùng'],['han','Gia Hân']].map(([key,name])=>{
 let u=db.users.find(u=>u.socialDemoKey===key);
 if(!u){const salt=crypto.randomBytes(16).toString('hex');u={id:uid(),name,email:`${key}@demo.evently.example`,salt,hash:crypto.scryptSync(crypto.randomBytes(32),salt,64).toString('hex'),createdAt:stamp(48),socialDemoKey:key};db.users.push(u);}
 return u;
});
const scope=`social-${owner.id}`;
function add(collection,key,row){if(!db[collection].some(x=>x.socialDemoKey===`${scope}-${key}`))db[collection].push({id:uid(),socialDemoKey:`${scope}-${key}`,...row});}
people.slice(0,4).forEach((u,i)=>{const pair=[owner.id,u.id].sort().join(':');if(!db.friends.some(f=>f.pair===pair))add('friends',`friend-${i}`,{pair,at:stamp(36-i)});});
people.slice(4,6).forEach((u,i)=>{if(!db.friendRequests.some(r=>r.from===u.id&&r.to===owner.id))add('friendRequests',`incoming-${i}`,{from:u.id,to:owner.id,at:stamp(i+1)});});
if(!db.friendRequests.some(r=>r.from===owner.id&&r.to===people[6].id))add('friendRequests','outgoing',{from:owner.id,to:people[6].id,at:stamp(3)});
const templates=[
 ['brunch','Brunch cuối tuần','social','Hoàn Kiếm','Bếp nhỏ · Hoàn Kiếm, Hà Nội',2,10,'Một bàn ăn sáng, vài món ngon và thời gian dành cho bạn bè.'],
 ['design','Design & Coffee','work','Ba Đình','Studio 27 · Ba Đình, Hà Nội',3,9,'Mang theo một ý tưởng đang làm và cùng góp ý bên ly cà phê.'],
 ['picnic','Picnic bên hồ','outdoors','Tây Hồ','Bãi cỏ ven Hồ Tây · Hà Nội',5,16,'Một buổi chiều ngoài trời với đồ ăn nhẹ và những trò chơi nhỏ.'],
 ['ceramics','Một chiều làm gốm','creative','Long Biên','Xưởng Mộc · Long Biên, Hà Nội',7,14,'Thử tạo một chiếc cốc của riêng bạn. Vật liệu đã được chuẩn bị.'],
 ['dinner','Bữa tối cùng hội bạn','social','Cầu Giấy','Bếp nhà · Cầu Giấy, Hà Nội',4,19,'Cùng nấu một bữa tối và kể những câu chuyện trong tuần.'],
 ['film','Đêm phim tại nhà','social','Đống Đa','Phòng chiếu nhỏ · Đống Đa, Hà Nội',6,19,'Một bộ phim hay, bỏng ngô và những người bạn thân quen.']
];
const dateBase=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const midnight=new Date(`${dateBase}T00:00:00+07:00`).getTime();
for(const [key,title,category,area,location,day,hour,description]of templates){
 add('events',key,{owner:owner.id,title,category,area,location,description,visibility:key==='dinner'||key==='film'?'private':'public',createdAt:stamp(24),startsAt:new Date(midnight+day*86400000+hour*3600000).toISOString(),attendees:[owner.id,...people.slice(0,key==='brunch'?3:1).map(p=>p.id)],cover:`/assets/events/${key}.svg`});
}
const owned=key=>db.events.find(e=>e.socialDemoKey===`${scope}-${key}`);
// Three pending requests on two events owned by the signed-in user.
[people[4],people[5],people[7]].forEach((u,i)=>add('joinRequests',`join-${i}`,{eventId:owned(i===2?'picnic':'brunch').id,userId:u.id,status:'pending',at:stamp(i+1)}));
people.slice(1,3).forEach((u,i)=>add('invitations',`sent-${i}`,{eventId:owned('dinner').id,userId:u.id,from:owner.id,status:'pending',at:stamp(4+i)}));
for(const [i,key]of ['coffee','painting','acoustic','books'].entries()){
 const e=db.events.find(e=>e.demoKey===key);if(!e)continue;
 if(i<2){add('invitations',`received-${key}`,{eventId:e.id,userId:owner.id,from:e.owner,status:'pending',at:stamp(2+i)});}
 if(i===2&&!e.attendees.includes(owner.id))e.attendees.push(owner.id);
 if(i===3)add('joinRequests','sent-join',{eventId:e.id,userId:owner.id,status:'pending',at:stamp(5)});
}
for(const e of db.events){if(e.demoKey)e.cover=`/assets/events/${e.demoKey}.svg`;}
[['friend.accept',{from:people[0].id}],['event.create',{eventId:owned('brunch').id}],['event.invite',{eventId:owned('dinner').id,userId:people[1].id}],['event.join.request',{eventId:db.events.find(e=>e.demoKey==='books')?.id}]].forEach(([action,detail],i)=>add('logs',`log-${i}`,{actor:owner.id,action,detail:{...detail,demo:true},at:stamp(i+1)}));
db.logs.sort((a,b)=>new Date(b.at)-new Date(a.at));
const temporary=`${file}.${process.pid}.tmp`;
fs.writeFileSync(temporary,JSON.stringify(db,null,2),{mode:0o600});fs.renameSync(temporary,file);
console.log(JSON.stringify({account:owner.name,friends:db.friends.filter(f=>f.pair.split(':').includes(owner.id)).length,friendRequests:db.friendRequests.filter(r=>r.to===owner.id).length,owned:db.events.filter(e=>e.owner===owner.id).length,invitations:db.invitations.filter(i=>i.userId===owner.id&&i.status==='pending').length,joinRequests:db.joinRequests.filter(r=>db.events.some(e=>e.id===r.eventId&&e.owner===owner.id)&&r.status==='pending').length,backup},null,2));

}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
