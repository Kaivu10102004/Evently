const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const net = require('node:net');

const templates = [
  ['coffee',0,18,30,'Chút cà phê, chút chuyện trò','Phố Nguyễn Hữu Huân · Hoàn Kiếm, Hà Nội','Một buổi tối ngồi lại cùng nhau, kể vài chuyện nhỏ và làm quen với những người bạn mới.'],
  ['cowork',1,9,0,'Một sáng làm việc cùng nhau','Không gian làm việc · Ba Đình, Hà Nội','Mang theo máy tính và một việc bạn muốn hoàn thành. Cùng tập trung, nghỉ giải lao và chia sẻ một chút cảm hứng.'],
  ['painting',1,18,30,'Vẽ một chiều thật chậm','Góc sáng tạo · Tây Hồ, Hà Nội','Không cần biết vẽ trước. Chọn vài màu bạn thích và dành thời gian cho một bức tranh nhỏ của riêng mình.'],
  ['walk',3,8,0,'Dạo quanh hồ, kể vài câu chuyện','Đường ven Hồ Tây · Hà Nội','Một vòng đi bộ nhẹ nhàng trong không khí buổi sáng. Mang giày thoải mái, nước uống và những câu chuyện bạn muốn kể.'],
  ['acoustic',3,19,30,'Một tối acoustic dưới ánh đèn','Sân nhỏ · Đống Đa, Hà Nội','Một cuộc hẹn với tiếng đàn mộc và những bài hát quen. Bạn có thể mang nhạc cụ hoặc đơn giản là đến nghe.'],
  ['books',5,10,0,'Đổi sách, đổi những góc nhìn','Góc đọc sách · Cầu Giấy, Hà Nội','Mang một cuốn sách bạn yêu thích để giới thiệu, trao đổi và tìm thêm những người bạn cùng sở thích đọc.'],
  ['garden',6,9,30,'Cùng nhau trồng một mầm xanh','Vườn cộng đồng · Long Biên, Hà Nội','Một buổi sáng chăm cây, làm quen với đất và gieo vài hạt giống. Cùng mang một chút màu xanh về nhà.'],
  ['photos',-3,15,0,'Những tấm ảnh của mùa thu','Phố đi bộ quanh Hồ Gươm · Hà Nội','Một buổi dạo phố và ghi lại những góc nhìn quen mà lạ. Điện thoại hay máy ảnh đều có thể kể một câu chuyện.']
];
const metadata={coffee:['social','Hoàn Kiếm'],cowork:['work','Ba Đình'],painting:['creative','Tây Hồ'],walk:['outdoors','Tây Hồ'],acoustic:['music','Đống Đa'],books:['books','Cầu Giấy'],garden:['outdoors','Long Biên'],photos:['creative','Hoàn Kiếm']};
function seedDemo(dataFile, {now = new Date()} = {}) {
  const db = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile,'utf8')) : {};
  for(const key of ['users','sessions','friends','friendRequests','events','invitations','joinRequests','logs']) {
    if(db[key] === undefined) db[key] = [];
    if(!Array.isArray(db[key])) throw new Error(`Dữ liệu ${key} không hợp lệ; chưa thay đổi tệp.`);
  }
  const missing = templates.filter(([key]) => !db.events.some(e => e.demoKey === key));
  const updates=db.events.filter(e=>metadata[e.demoKey]&&(e.category===undefined||e.area===undefined));
  if(!missing.length&&!updates.length) return {added:0,updated:0,total:db.events.length,createdHost:false};
  const backup = fs.existsSync(dataFile) ? path.join(os.tmpdir(),`evently-before-seed-${crypto.randomUUID()}.json`) : null;
  for(const e of updates){const [category,area]=metadata[e.demoKey];if(e.category===undefined)e.category=category;if(e.area===undefined)e.area=area;}
  let host = db.users.find(u => !u.demoHost) || db.users.find(u => u.demoHost === true);
  const createdHost = !host;
  if(!host) {
    const salt = crypto.randomBytes(16).toString('hex');
    host = {id:crypto.randomUUID(),name:'Evently Studio (mẫu)',email:'studio@evently.example',salt,hash:crypto.scryptSync(crypto.randomBytes(32),salt,64).toString('hex'),createdAt:now.toISOString(),demoHost:true};
    db.users.push(host);
  }
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const date = key => parts.find(p => p.type === key).value;
  const midnight = new Date(`${date('year')}-${date('month')}-${date('day')}T00:00:00+07:00`).getTime();
  const day = 86400000;
  // If today's evening has passed, start the upcoming examples tomorrow.
  const shift = now.getTime() >= midnight + (18*60+30)*60000 ? 1 : 0;
  for(const [key,offset,hour,minute,title,location,copy] of missing) {
    const [category,area]=metadata[key];
    const event = {id:crypto.randomUUID(),demoKey:key,category,area,owner:host.id,attendees:[host.id],createdAt:now.toISOString(),title,description:`Sự kiện mẫu để trải nghiệm Evently. ${copy}`,location,startsAt:new Date(midnight + (offset + (offset>=0?shift:0))*day + (hour*60+minute)*60000).toISOString(),visibility:'public'};
    db.events.push(event);
    db.logs.unshift({id:crypto.randomUUID(),actor:host.id,action:'event.create',detail:{eventId:event.id,demo:true},at:now.toISOString()});
  }
  fs.mkdirSync(path.dirname(dataFile),{recursive:true});
  if(backup) {fs.copyFileSync(dataFile,backup);fs.chmodSync(backup,0o600);}
  const temporary = path.join(path.dirname(dataFile),`.evently-seed-${process.pid}-${crypto.randomUUID()}.tmp`);
  try {fs.writeFileSync(temporary,JSON.stringify(db,null,2),{mode:0o600});fs.renameSync(temporary,dataFile);}
  finally {if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
  return {added:missing.length,updated:updates.length,total:db.events.length,createdHost,backup};
}
async function serverIsRunning(port) {
  return new Promise(resolve => {
    const socket=net.createConnection({host:'127.0.0.1',port});
    const finish = result => {socket.destroy();resolve(result);};
    socket.once('connect',()=>finish(true));socket.once('error',()=>finish(false));socket.setTimeout(800,()=>finish(true));
  });
}
if(require.main === module) (async()=>{
  if(await serverIsRunning(Number(process.env.PORT||3000))) throw new Error('Hãy dừng server Evently trước khi tạo dữ liệu mẫu, rồi chạy lại npm start.');
  const result=seedDemo(process.env.DATA_FILE || path.join(__dirname,'..','data.json'));
  console.log(`Đã thêm ${result.added}, bổ sung bộ lọc cho ${result.updated} sự kiện mẫu. Tổng số sự kiện: ${result.total}.`);
  if(result.backup)console.log(`Bản sao dữ liệu trước khi thêm: ${result.backup}`);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={seedDemo};
