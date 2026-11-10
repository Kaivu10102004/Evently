const icons={spark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></svg>',calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6m3-3h-6"/></svg>',bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14"/></svg>',pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m9 18 6-6-6-6"/></svg>',check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m5 12 4 4L19 6"/></svg>',search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>'};

const state = {
  token: localStorage.getItem('evently-token') || '', user: null, page: 'home',
  events: [], friends: [], users: [], invitations: [], friendRequests: [], joinRequests: [], activity: [],
  filter: 'all', query: '', inboxTab: 'all', authMode: 'login', authOpen: false
};
const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
let toastTimer, returnFocus;
const arrowRight = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
const closeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>';
const logoutIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M10 4H5v16h5m4-12 4 4-4 4m-6-4h10"/></svg>';
async function api(action, payload = {}) {
  const response = await fetch('/api', { method: 'POST', headers: {'content-type':'application/json', ...(state.token ? {authorization:`Bearer ${state.token}`} : {})}, body:JSON.stringify({action,payload}) });
  const result = await response.json();
  if (!result.ok) throw Error(result.error || 'Có lỗi xảy ra. Vui lòng thử lại.');
  return result.data;
}
function esc(value = '') { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function initials(name = '') { return String(name || '?').trim().split(/\s+/).slice(-2).map(n => n[0]).join('').toUpperCase(); }
function toast(message, error = false) {
  clearTimeout(toastTimer);
  const el = document.querySelector('#toast'); el.textContent = message; el.className = `toast show${error ? ' error' : ''}`;
  toastTimer = setTimeout(() => el.className = 'toast', 3500);
}
function dateParts(value) {
  const d = new Date(value), valid = Number.isFinite(d.getTime());
  if (!valid) return {day:'—', month:'', short:'Chưa có thời gian', full:'Chưa có thời gian', time:'', weekday:''};
  return {day:d.toLocaleDateString('vi-VN',{day:'2-digit'}), month:`THÁNG ${d.getMonth()+1}`, short:d.toLocaleDateString('vi-VN',{day:'numeric',month:'numeric'}), full:d.toLocaleDateString('vi-VN',{day:'numeric',month:'long',year:'numeric'}), time:d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}), weekday:d.toLocaleDateString('vi-VN',{weekday:'long'})};
}
function localInputTime(value) { const d = new Date(value); return Number.isFinite(d.getTime()) ? new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16) : ''; }
function brand() { return '<span class="brand"><span class="brand-name">evently</span></span>'; }
function meadowArt() { return '<video id="meadow-film" class="meadow-film" muted loop playsinline preload="metadata" poster="/assets/meadow-poster.jpg" aria-hidden="true"><source src="/assets/meadow-loop.mp4" type="video/mp4"></video>'; }
function avatar(user, size = '') { return `<span class="avatar ${size}" aria-hidden="true">${esc(initials(user?.name))}</span>`; }
function emptyState(title, copy, action = '', label = '') {
  return `<div class="empty-state"><span class="empty-symbol" aria-hidden="true">${icons.calendar}</span><h3>${esc(title)}</h3><p>${esc(copy)}</p>${action ? `<button class="btn secondary" data-action="${action}">${esc(label)} ${arrowRight}</button>` : ''}</div>`;
}
function landing() {
  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
  return `<main class="landing">
    <header class="landing-nav">
      ${brand()}
      <nav aria-label="Điều hướng chính">
        <a class="current" href="#hero-heading" aria-current="page">Khám phá</a>
        <button data-action="open-login">Sự kiện</button>
        <button data-action="open-login">Bạn bè</button>
        <button data-action="open-register">Đăng ký</button>
      </nav>
      <button class="black-pill nav-cta" data-action="open-login">Đăng nhập</button>
    </header>
    <section class="landing-hero" aria-labelledby="hero-heading">
      <div class="hero-copy">
        <h1 id="hero-heading">Hẹn nhau, <span>tạo nên</span> kỷ niệm.</h1>
        <p class="hero-description">Nơi bạn tạo sự kiện, kết nối những người thân quen<br>và cùng nhau lưu giữ những khoảnh khắc đáng nhớ.</p>
        <button class="black-pill hero-cta" data-action="open-login">ĐĂNG NHẬP ${arrow}</button>
      </div>
      <div class="meadow-wrap">${meadowArt()}</div>
    </section>
  </main>`;
}
function auth() {
  if (!state.authOpen) return landing();
  const register = state.authMode === 'register';
  return `<main class="account-page">
    <header class="account-header"><button class="wordmark-button" data-action="close-auth" aria-label="Về trang giới thiệu">${brand()}</button><button class="quiet-link" data-action="close-auth">Về trang chủ ${arrowRight}</button></header>
    <div class="account-layout"><section class="account-story"><p class="overline">CHO NHỮNG LẦN GẶP GỠ THẬT</p><h1>Một lời hẹn.<br><span>Thật nhiều kỷ niệm.</span></h1><p>Đặt lịch cho những điều bạn mong đợi,<br>và dành thời gian cho những người bạn thương.</p><div class="account-photo"><img src="/assets/meadow-poster.jpg" alt="Đồng hoa trong ánh hoàng hôn"></div></section>
    <section class="account-form-panel" aria-labelledby="account-title"><p class="overline">${register ? 'GIA NHẬP EVENTLY' : 'CHÀO MỪNG TRỞ LẠI'}</p><h2 id="account-title">${register ? 'Bắt đầu một lời hẹn.' : 'Rất vui được gặp bạn.'}</h2><p class="account-intro">${register ? 'Tạo tài khoản để lên lịch và mời bạn bè.' : 'Những cuộc hẹn của bạn đang chờ phía trước.'}</p>
    <form id="auth-form" class="auth-form">
      ${register ? '<div class="field"><label for="auth-name">Họ và tên</label><input id="auth-name" name="name" placeholder="Nguyễn Minh Anh" autocomplete="name" required maxlength="80"></div>' : ''}
      <div class="field"><label for="auth-email">Email</label><input id="auth-email" name="email" type="email" placeholder="ban@email.com" autocomplete="email" required></div>
      <div class="field"><label for="auth-password">Mật khẩu</label><input id="auth-password" name="password" type="password" placeholder="Ít nhất 8 ký tự" autocomplete="${register ? 'new-password' : 'current-password'}" minlength="8" required></div>
      <p class="form-error" role="alert" hidden></p><button class="btn auth-submit">${register ? 'Tạo tài khoản' : 'Đăng nhập'} ${arrowRight}</button>
    </form><p class="auth-switch">${register ? 'Bạn đã có tài khoản?' : 'Chưa có tài khoản?'} <button data-action="toggle-auth">${register ? 'Đăng nhập' : 'Đăng ký ngay'}</button></p></section></div>
    <footer class="account-footer">evently · Cho những lần gặp gỡ thật.</footer></main>`;
}
function navButton(page, label, icon, count = 0, mobile = false) {
  return `<button class="app-nav-link ${state.page===page?'active':''}" data-page="${page}" ${state.page===page?'aria-current="page"':''}>${mobile ? icons[icon] : ''}<span>${label}</span>${count ? `<span class="nav-count">${count}</span>` : ''}</button>`;
}
function shell(content) {
  const pending = state.invitations.length + state.friendRequests.length + state.joinRequests.length;
  const nav = mobile => `${navButton('home','Tổng quan','spark',0,mobile)}${navButton('events','Sự kiện','calendar',0,mobile)}${navButton('friends','Bạn bè','users',0,mobile)}${navButton('inbox','Lời mời','bell',pending,mobile)}`;
  app.innerHTML = `<div class="workspace"><header class="app-header"><button class="wordmark-button" data-page="home" aria-label="Evently · Tổng quan">${brand()}</button><nav class="app-nav" aria-label="Điều hướng chính">${nav(false)}</nav><button class="profile-button" data-action="account" aria-label="Tài khoản của ${esc(state.user.name)}">${avatar(state.user)}<span>${esc(state.user.name.split(' ').slice(-2).join(' '))}</span></button></header>
    <main class="workspace-main">${content}</main><footer class="app-footer"><span class="footer-wordmark">evently</span><span>Cho những lần gặp gỡ thật.</span><button class="quiet-link" data-action="account">Không gian của ${esc(state.user.name.split(' ').slice(-1)[0])} ${arrowRight}</button></footer><nav class="mobile-app-nav" aria-label="Điều hướng trên điện thoại">${nav(true)}</nav></div>`;
}
function pageIntro(kicker, title, copy, action = true) {
  return `<header class="page-intro"><div><p class="overline">${kicker}</p><h1>${title}</h1><p class="page-description">${copy}</p></div>${action ? `<button class="btn" data-action="create">Tạo sự kiện ${icons.plus}</button>` : ''}</header>`;
}
function upcoming() { return state.events.filter(e => new Date(e.startsAt) >= new Date()).sort((a,b)=>new Date(a.startsAt)-new Date(b.startsAt)); }
function eventStatus(e) { return e.owner===state.user.id ? 'Bạn tổ chức' : e.joined ? 'Đã tham gia' : e.request==='pending' ? 'Chờ duyệt' : e.invitation==='pending' ? 'Bạn được mời' : ''; }
function eventRow(e) {
  const d = dateParts(e.startsAt);
  return `<article class="schedule-row"><div class="schedule-date"><b>${d.day}</b><span>${d.month}</span></div><div class="schedule-copy"><button class="title-button" data-action="detail" data-id="${e.id}">${esc(e.title)}</button><p>${esc(d.time)}<span>·</span>${esc(e.location)}</p></div><span class="status-label">${eventStatus(e)}</span><button class="round-arrow" data-action="detail" data-id="${e.id}" aria-label="Xem ${esc(e.title)}">${arrowRight}</button></article>`;
}
function featuredEvent(e) {
  if (!e) return `<section class="featured-event vacant-feature"><div class="feature-image"><img src="/assets/meadow-poster.jpg" alt="Đồng hoa trong ánh hoàng hôn"></div><div class="feature-copy"><p class="overline">DÀNH MỘT NGÀY CHO NHAU</p><h2>Cuộc hẹn đầu tiên<br>bắt đầu từ bạn.</h2><p>Một buổi cà phê, một chuyến đi hay chỉ là dịp để ngồi lại cùng nhau.</p><button class="btn" data-action="create">Tạo cuộc hẹn đầu tiên ${arrowRight}</button></div></section>`;
  const d = dateParts(e.startsAt);
  return `<section class="featured-event"><button class="feature-image" data-action="detail" data-id="${e.id}" aria-label="Xem ${esc(e.title)}"><img src="/assets/meadow-poster.jpg" alt=""><span class="feature-date"><b>${d.day}</b><span>${d.month}</span></span></button><div class="feature-copy"><p class="overline">${e.joined || e.owner===state.user.id ? 'CUỘC HẸN GẦN NHẤT' : 'KHÁM PHÁ MỘT CUỘC HẸN'}</p><h2>${esc(e.title)}</h2><p class="feature-summary">${esc(e.description || 'Một dịp để gặp gỡ và dành thời gian cho nhau.')}</p><div class="feature-meta"><span>${icons.clock}${esc(d.weekday)}, ${esc(d.time)}</span><span>${icons.pin}${esc(e.location)}</span></div><div class="feature-bottom"><span class="status-label">${eventStatus(e) || (e.visibility==='public'?'Công khai':'Riêng tư')}</span><button class="quiet-link" data-action="detail" data-id="${e.id}">Xem cuộc hẹn ${arrowRight}</button></div></div></section>`;
}
function activityList() {
  const labels = {'account.register':'Tạo tài khoản Evently','auth.login':'Đăng nhập vào không gian của bạn','auth.logout':'Đăng xuất','event.create':'Tạo một cuộc hẹn mới','event.update':'Cập nhật thông tin sự kiện','event.delete':'Xóa một sự kiện','friend.request':'Gửi lời mời kết bạn','friend.accept':'Chấp nhận lời mời kết bạn','friend.reject':'Từ chối lời mời kết bạn','friend.remove':'Cập nhật danh sách bạn bè','event.invite':'Mời bạn bè tham gia sự kiện','event.invitation.respond':'Phản hồi lời mời tham gia','event.join.request':'Gửi yêu cầu tham gia','event.join.respond':'Phản hồi yêu cầu tham gia'};
  return state.activity.slice(0,4).map(a=>`<li><span class="activity-dot" aria-hidden="true"></span><div><p>${labels[a.action] || 'Cập nhật hoạt động'}</p><time datetime="${esc(a.at)}">${dateParts(a.at).short} · ${dateParts(a.at).time}</time></div></li>`).join('') || '<li class="muted-copy">Những hoạt động mới sẽ xuất hiện ở đây.</li>';
}
function home() {
  const own = upcoming().filter(e=>e.joined || e.owner===state.user.id), featured=own[0] || upcoming()[0];
  const pending = state.invitations.length + state.friendRequests.length + state.joinRequests.length;
  return `${pageIntro('KHÔNG GIAN CỦA BẠN',`Chào ${esc(state.user.name.split(' ').slice(-1)[0])}, <span>hẹn nhau nhé.</span>`, 'Dành một chút thời gian cho những điều và những người bạn mong đợi.')}
    <div class="overview-metrics"><div><span class="metric-value">${String(own.length).padStart(2,'0')}</span><span>Cuộc hẹn sắp tới</span></div><div><span class="metric-value">${String(state.friends.length).padStart(2,'0')}</span><span>Người bạn kết nối</span></div><div><span class="metric-value">${String(pending).padStart(2,'0')}</span><span>Lời mời & yêu cầu</span></div><div><span class="metric-value">${String(state.events.filter(e=>e.owner===state.user.id).length).padStart(2,'0')}</span><span>Sự kiện bạn tổ chức</span></div></div>
    ${featuredEvent(featured)}
    <div class="home-columns"><section class="editorial-section"><div class="section-heading"><div><p class="overline">TRÊN LỊCH CỦA BẠN</p><h2>Những lần gặp sắp tới.</h2></div><button class="quiet-link" data-page="events">Tất cả sự kiện ${arrowRight}</button></div>${own.length ? own.slice(0,3).map(eventRow).join('') : emptyState('Lịch hẹn vẫn còn trống.','Tạo một sự kiện và rủ bạn bè cùng tham gia.','create','Tạo cuộc hẹn')}</section>
    <aside class="invitation-note"><p class="overline">MỘT LỜI MỜI, MỘT KẾT NỐI</p><h2>${pending ? `${pending} lời hẹn<br>đang chờ bạn.` : 'Có nhau,<br>ngày nào cũng vui.'}</h2><p>${pending ? 'Phản hồi những lời mời và yêu cầu tham gia mới nhất của bạn.' : 'Kết nối với bạn bè và tạo thêm những dịp để gặp nhau.'}</p><button class="quiet-link" data-page="${pending?'inbox':'friends'}">${pending?'Mở hộp thư':'Kết nối bạn bè'} ${arrowRight}</button></aside></div>
    <section class="activity-section"><div><p class="overline">NHẬT KÝ NHỎ</p><h2>Gần đây.</h2><p class="muted-copy">Những thay đổi trong không gian của bạn.</p></div><ol class="activity-list">${activityList()}</ol></section>`;
}
function eventArtwork(e) {
  const d = dateParts(e.startsAt), theme = [...e.title].reduce((sum,c)=>sum+c.charCodeAt(0),0)%4;
  return `<div class="event-art art-${theme}"><span class="art-note">${e.visibility==='private'?'RIÊNG TƯ':'CÔNG KHAI'}</span><span class="art-day">${d.day}</span><span class="art-flower" aria-hidden="true">${icons.spark}</span><span class="art-month">${d.month}<small>${new Date(e.startsAt).getFullYear()}</small></span></div>`;
}
function eventCard(e) {
  const d = dateParts(e.startsAt);
  return `<article class="event-tile"><button class="event-cover" data-action="detail" data-id="${e.id}" aria-label="Chi tiết ${esc(e.title)}">${eventArtwork(e)}</button><div class="event-tile-meta"><span>${esc(d.weekday)} · ${esc(d.time)}</span><span class="status-label">${eventStatus(e)}</span></div><h2><button data-action="detail" data-id="${e.id}">${esc(e.title)}</button></h2><p class="tile-location">${icons.pin}${esc(e.location)}</p><div class="event-tile-footer"><span>${e.owner===state.user.id?'Bạn tổ chức':esc(e.ownerName || 'Thành viên Evently')}<small>${e.attendees.length} người tham gia</small></span><button class="round-arrow" data-action="detail" data-id="${e.id}" aria-label="Xem ${esc(e.title)}">${arrowRight}</button></div></article>`;
}
function searchBox(id, placeholder) { return `<label class="editorial-search">${icons.search}<span class="sr-only">${placeholder}</span><input id="${id}" type="search" placeholder="${placeholder}" value="${esc(state.query)}" autocomplete="off"></label>`; }
function eventsPage() {
  const filtered=state.events.filter(e => (state.filter==='all' || (state.filter==='mine'&&e.owner===state.user.id) || state.filter===e.visibility) && (e.title+' '+e.location).toLowerCase().includes(state.query.toLowerCase()));
  return `${pageIntro('LỊCH HẸN / SỰ KIỆN','Những cuộc hẹn <span>đang chờ.</span>','Lên lịch, khám phá và tìm thêm một dịp để gặp nhau.')}<div class="collection-toolbar"><div class="editorial-tabs" aria-label="Lọc sự kiện">${[['all','Tất cả'],['mine','Bạn tổ chức'],['public','Công khai'],['private','Riêng tư']].map(([value,label])=>`<button class="${state.filter===value?'active':''}" data-filter="${value}" aria-pressed="${state.filter===value}">${label}${value==='all'?` <small>${state.events.length}</small>`:''}</button>`).join('')}</div>${searchBox('event-search','Tìm tên hoặc địa điểm')}</div>${filtered.length ? `<div class="event-gallery">${filtered.map(eventCard).join('')}</div>` : emptyState('Chưa có cuộc hẹn phù hợp.','Thử tìm kiếm khác hoặc tạo sự kiện của riêng bạn.','create','Tạo sự kiện mới')}`;
}
function friendCard(user, connected) {
  const request=state.friendRequests.find(r=>r.from===user.id || r.user?.id===user.id);
  const actions=connected ? `<span class="connected-label">${icons.check} Bạn bè</span><button class="icon-btn plain" data-action="unfriend" data-id="${user.id}" aria-label="Hủy kết bạn với ${esc(user.name)}">${closeIcon}</button>` : user.friendship==='sent' ? '<span class="status-label">Đang chờ phản hồi</span>' : request ? `<button class="btn small" data-action="friend-accept" data-id="${request.id}">Chấp nhận</button>` : `<button class="btn secondary small" data-action="friend-add" data-id="${user.id}">Kết bạn ${icons.plus}</button>`;
  return `<article class="connection-card">${avatar(user,'large')}<div class="connection-copy"><h3>${esc(user.name)}</h3><p>${esc(user.email)}</p></div><div class="connection-actions">${actions}</div></article>`;
}
function friendsPage() {
  const query=state.query.toLowerCase(), match=u=>(u.name+' '+u.email).toLowerCase().includes(query);
  const friends=state.friends.filter(match), discover=state.users.filter(u=>u.friendship!=='friends'&&match(u));
  return `${pageIntro('KẾT NỐI / BẠN BÈ','Những người <span>bạn thương.</span>','Một lời kết bạn, thêm một người để chia sẻ những ngày vui.',false)}<div class="connections-toolbar"><p>${state.friends.length} người bạn trong không gian của bạn</p>${searchBox('friend-search','Tìm tên hoặc email')}</div><section class="editorial-section"><div class="section-heading"><h2>Bạn bè của bạn <small>${state.friends.length}</small></h2><button class="quiet-link" data-page="inbox">Lời mời kết bạn ${arrowRight}</button></div>${friends.length?`<div class="connection-grid">${friends.map(u=>friendCard(u,true)).join('')}</div>`:emptyState(state.query?'Chưa tìm thấy người bạn này.':'Cùng nhau bắt đầu một kết nối.','Tìm kiếm mọi người bên dưới và gửi lời mời kết bạn.')}</section><section class="editorial-section discover-section"><div class="section-heading"><div><p class="overline">THÊM NHỮNG NGƯỜI CÙNG QUAN TÂM</p><h2>Khám phá mọi người.</h2></div><span class="muted-copy">${discover.length} người</span></div>${discover.length?`<div class="connection-grid">${discover.map(u=>friendCard(u,false)).join('')}</div>`:emptyState('Bạn đã xem hết mọi người.','Những thành viên mới sẽ xuất hiện tại đây.')}</section>`;
}
function inboxItems() {
  return [...state.invitations.map(i=>({...i,type:'events',person:i.from,title:i.event?.title || 'Lời mời tham gia sự kiện',copy:`${i.from?.name || 'Một người bạn'} mời bạn tham gia`,event:i.event,accept:'invite-accept',reject:'invite-reject'})),...state.friendRequests.map(r=>({...r,type:'friends',person:r.user,title:r.user.name,copy:'Muốn kết nối và trở thành bạn bè với bạn',accept:'friend-accept',reject:'friend-reject'})),...state.joinRequests.map(r=>({...r,type:'requests',person:r.user,title:r.event.title,copy:`${r.user.name} muốn tham gia cuộc hẹn của bạn`,event:r.event,accept:'join-accept',reject:'join-reject'}))].sort((a,b)=>new Date(b.at||0)-new Date(a.at||0));
}
function inboxPage() {
  const items=inboxItems(), visible=items.filter(i=>state.inboxTab==='all'||i.type===state.inboxTab);
  return `${pageIntro('KẾT NỐI / HỘP THƯ','Những lời hẹn <span>dành cho bạn.</span>','Phản hồi một lời mời, bắt đầu một cuộc gặp gỡ.',false)}<div class="collection-toolbar"><div class="editorial-tabs" aria-label="Lọc lời mời">${[['all','Tất cả'],['events','Sự kiện'],['friends','Kết bạn'],['requests','Xin tham gia']].map(([key,label])=>`<button data-inbox="${key}" class="${key===state.inboxTab?'active':''}" aria-pressed="${key===state.inboxTab}">${label} <small>${items.filter(i=>key==='all'||i.type===key).length}</small></button>`).join('')}</div></div><div class="inbox-list">${visible.length?visible.map(i=>`<article class="invitation-row">${avatar(i.person,'large')}<div class="invitation-copy"><p class="overline">${{events:'LỜI MỜI THAM GIA',friends:'LỜI MỜI KẾT BẠN',requests:'YÊU CẦU THAM GIA'}[i.type]}</p><h2>${esc(i.title)}</h2><p>${esc(i.copy)}</p>${i.event?`<p class="invitation-meta">${esc(dateParts(i.event.startsAt).full)}<span>·</span>${esc(i.event.location)}</p>`:''}</div><div class="invitation-actions"><button class="btn small" data-action="${i.accept}" data-id="${i.id}">${i.type==='requests'?'Duyệt yêu cầu':i.type==='events'?'Tham gia':'Chấp nhận'} ${arrowRight}</button><button class="quiet-link muted" data-action="${i.reject}" data-id="${i.id}">Từ chối</button></div></article>`).join(''):emptyState('Hộp thư đã được xem hết.','Những lời mời và yêu cầu mới sẽ xuất hiện ở đây.','browse-events','Khám phá sự kiện')}</div>`;
}
function render() {
  window.EventlyMeadow?.stop();
  if (!state.user) { app.innerHTML=auth(); requestAnimationFrame(()=>window.EventlyMeadow?.mount()); return; }
  shell(({home,events:eventsPage,friends:friendsPage,inbox:inboxPage})[state.page]());
}
async function refresh() {
  const [events,friends,users,friendRequests,joinRequests,activity,inbox] = await Promise.all(['events','friends','users','friend-requests','join-requests','activity','inbox'].map(action=>api(action)));
  Object.assign(state,{events,friends,users,friendRequests,joinRequests,activity,invitations:inbox.invitations});
  render();
}
function closeModal() {
  modalRoot.innerHTML=''; document.body.classList.remove('dialog-open');
  if (returnFocus?.isConnected) returnFocus.focus();
}
function modal(title, subtitle, html) {
  if (!modalRoot.innerHTML) returnFocus=document.activeElement;
  modalRoot.innerHTML=`<div class="overlay" data-action="overlay-close"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description"><header class="modal-top"><div><p class="overline">EVENTLY / MỖI CUỘC HẸN LÀ MỘT KỶ NIỆM</p><h2 id="dialog-title">${esc(title)}</h2><p id="dialog-description">${esc(subtitle)}</p></div><button class="icon-btn plain" data-action="close-modal" aria-label="Đóng hộp thoại">${closeIcon}</button></header>${html}</section></div>`;
  document.body.classList.add('dialog-open');
  requestAnimationFrame(()=>(modalRoot.querySelector('input:not([type=radio]),textarea,select') || modalRoot.querySelector('button'))?.focus());
}
function createModal(e) {
  modal(e?'Chỉnh sửa cuộc hẹn.':'Tạo một cuộc hẹn mới.',e?'Thay đổi một chút, để mọi người dễ dàng gặp nhau hơn.':'Một chút thông tin để bạn bè cùng lên lịch.',`<form id="event-form" data-id="${e?.id||''}"><div class="form-grid"><div class="field full"><label for="event-title">Tên cuộc hẹn</label><input id="event-title" name="title" placeholder="Ví dụ: Một chiều cà phê cùng nhau" maxlength="160" required value="${esc(e?.title||'')}"></div><div class="field"><label for="event-date">Thời gian</label><input id="event-date" name="startsAt" type="datetime-local" value="${e?localInputTime(e.startsAt):''}" required></div><div class="field"><label for="event-location">Địa điểm</label><input id="event-location" name="location" placeholder="Mình sẽ gặp nhau ở đâu?" value="${esc(e?.location||'')}" required></div><fieldset class="visibility-field full"><legend>Ai có thể tham gia?</legend><div class="visibility-options"><label><input type="radio" name="visibility" value="public" ${e?.visibility!=='private'?'checked':''}><span><b>Công khai</b><small>Mọi người có thể gửi yêu cầu tham gia.</small></span></label><label><input type="radio" name="visibility" value="private" ${e?.visibility==='private'?'checked':''}><span><b>Riêng tư</b><small>Chia sẻ cuộc hẹn với bạn bè được mời.</small></span></label></div></fieldset><div class="field full"><label for="event-description">Lời nhắn cho mọi người</label><textarea id="event-description" name="description" rows="4" placeholder="Kể thêm một chút về cuộc hẹn...">${esc(e?.description||'')}</textarea></div></div><p class="form-error" role="alert" hidden></p><div class="form-actions">${e?`<button class="quiet-link danger" type="button" data-action="delete-event" data-id="${e.id}">Xóa sự kiện</button>`:''}<span class="action-spacer"></span><button class="btn secondary" type="button" data-action="close-modal">Để sau</button><button class="btn">${e?'Lưu thay đổi':'Tạo cuộc hẹn'} ${arrowRight}</button></div></form>`);
}
function detailModal(e) {
  if (!e) return;
  const d=dateParts(e.startsAt), owned=e.owner===state.user.id, invitation=state.invitations.find(i=>i.eventId===e.id);
  const action=owned?`<button class="btn secondary" data-action="edit-event" data-id="${e.id}">Chỉnh sửa</button><button class="btn" data-action="invite-friend" data-id="${e.id}">Mời bạn bè ${icons.plus}</button>`:invitation?`<button class="btn" data-action="invite-accept" data-id="${invitation.id}">Chấp nhận lời mời ${arrowRight}</button>`:e.joined?'<span class="status-label">Bạn sẽ tham gia cuộc hẹn này.</span>':e.request==='pending'?'<button class="btn secondary" disabled>Đã gửi yêu cầu</button>':e.visibility==='public'?`<button class="btn" data-action="join" data-id="${e.id}">Xin tham gia ${arrowRight}</button>`:'<span class="status-label">Sự kiện riêng tư · cần lời mời để tham gia.</span>';
  const people=e.attendees.map(id=>id===state.user.id?state.user:state.users.find(u=>u.id===id)).filter(Boolean);
  modal(e.title,e.ownerName?`Được tổ chức bởi ${e.ownerName}.`:'Một dịp để dành thời gian cho nhau.',`<div class="detail-calendar"><span class="detail-date">${d.day}<small>${d.month}</small></span><div><p>${esc(d.weekday)}, ${esc(d.full)}</p><span>${esc(d.time)} · ${e.visibility==='private'?'Riêng tư':'Công khai'}</span></div></div><div class="detail-location">${icons.pin}<div><span>ĐỊA ĐIỂM</span><p>${esc(e.location)}</p></div></div><p class="detail-description">${esc(e.description||'Một cuộc hẹn đáng nhớ đang chờ mọi người.')}</p><div class="detail-participants"><div class="avatar-stack">${people.slice(0,5).map(u=>avatar(u)).join('')}</div><span>${e.attendees.length} người sẽ tham gia</span></div><div class="form-actions">${action}</div>`);
}
function inviteModal(eventId) {
  const event=state.events.find(e=>e.id===eventId); if (!event) return;
  const friends=state.friends.filter(f=>!event.attendees.includes(f.id));
  modal('Thêm bạn, thêm niềm vui.',`Mời bạn bè đến ${event.title}.`,friends.length?`<div class="invite-friends-list">${friends.map(f=>`<div class="invite-friend-row">${avatar(f)}<div><strong>${esc(f.name)}</strong><small>${esc(f.email)}</small></div><button class="btn secondary small" data-action="send-invite" data-event="${eventId}" data-id="${f.id}">Gửi lời mời ${icons.plus}</button></div>`).join('')}</div>`:emptyState('Chưa có người bạn nào để mời.','Kết nối thêm bạn bè hoặc mọi người đã tham gia cuộc hẹn.'));
}
function accountModal() { modal('Không gian của bạn.', 'Những kết nối và cuộc hẹn bắt đầu từ đây.', `<div class="account-details">${avatar(state.user,'large')}<h3>${esc(state.user.name)}</h3><p>${esc(state.user.email)}</p></div><div class="account-summary"><span><b>${state.friends.length}</b> bạn bè</span><span><b>${state.events.filter(e=>e.owner===state.user.id).length}</b> sự kiện tổ chức</span></div><div class="form-actions"><button class="btn secondary" data-action="logout">Đăng xuất ${logoutIcon}</button></div>`); }
function navigate(page) {
  state.page=page;state.query='';render();window.scrollTo({top:0,behavior:'instant'});
}
document.addEventListener('click', async event => {
  const button=event.target.closest('[data-action],[data-page],[data-filter],[data-inbox]');
  if (!button || button.disabled) return;
  if (button.dataset.page) { navigate(button.dataset.page); return; }
  if (button.dataset.filter) { state.filter=button.dataset.filter;render();return; }
  if (button.dataset.inbox) { state.inboxTab=button.dataset.inbox;render();return; }
  const action=button.dataset.action,id=button.dataset.id;
  try {
    if (action==='open-login'||action==='open-register') { state.authMode=action==='open-login'?'login':'register';state.authOpen=true;render();window.scrollTo(0,0); }
    else if (action==='toggle-auth') { state.authMode=state.authMode==='login'?'register':'login';render(); }
    else if (action==='close-auth') { state.authOpen=false;render();window.scrollTo(0,0); }
    else if (action==='close-modal'||(action==='overlay-close'&&event.target===button)) closeModal();
    else if (action==='browse-events') navigate('events');
    else if (action==='create') createModal();
    else if (action==='detail') detailModal(state.events.find(e=>e.id===id));
    else if (action==='edit-event') createModal(state.events.find(e=>e.id===id));
    else if (action==='invite-friend') inviteModal(id);
    else if (action==='account') accountModal();
    else if (action==='logout') { await api('logout').catch(()=>{});closeModal();Object.assign(state,{token:'',user:null,authOpen:false,page:'home'});localStorage.removeItem('evently-token');render(); }
    else if (action==='delete-event') { const e=state.events.find(e=>e.id===id);modal('Xóa cuộc hẹn này?',e?.title||'Sự kiện sẽ được xóa khỏi lịch hẹn.',`<p class="muted-copy">Thông tin cuộc hẹn và các lời mời liên quan sẽ được gỡ bỏ.</p><div class="form-actions"><button class="btn secondary" data-action="edit-event" data-id="${id}">Quay lại</button><button class="btn" data-action="delete-confirm" data-id="${id}">Xóa cuộc hẹn</button></div>`); }
    else if (action==='unfriend') { const person=state.friends.find(u=>u.id===id);modal('Hủy kết nối bạn bè?',`Bạn và ${person?.name||'người bạn này'} sẽ không còn trong danh sách bạn bè của nhau.`,`<div class="form-actions"><button class="btn secondary" data-action="close-modal">Giữ kết nối</button><button class="btn" data-action="unfriend-confirm" data-id="${id}">Hủy kết bạn</button></div>`); }
    else {
      const requests={
        'join':['join-request',{eventId:id},'Đã gửi yêu cầu tham gia.'],
        'friend-add':['friend-request',{userId:id},'Đã gửi lời mời kết bạn.'],
        'friend-accept':['friend-respond',{requestId:id,accept:true},'Hai bạn đã kết nối.'],
        'friend-reject':['friend-respond',{requestId:id,accept:false},'Đã từ chối lời mời.'],
        'invite-accept':['invitation-respond',{invitationId:id,accept:true},'Bạn đã tham gia cuộc hẹn.'],
        'invite-reject':['invitation-respond',{invitationId:id,accept:false},'Đã từ chối lời mời tham gia.'],
        'join-accept':['join-respond',{requestId:id,accept:true},'Đã duyệt yêu cầu tham gia.'],
        'join-reject':['join-respond',{requestId:id,accept:false},'Đã từ chối yêu cầu tham gia.'],
        'unfriend-confirm':['friend-remove',{userId:id},'Đã cập nhật danh sách bạn bè.'],
        'delete-confirm':['event-delete',{id},'Đã xóa cuộc hẹn.'],
        'send-invite':['invite',{eventId:button.dataset.event,userId:id},'Đã gửi lời mời tham gia.']
      };
      if (!requests[action]) return;
      button.disabled=true;
      const [method,payload,message]=requests[action]; await api(method,payload);
      if(action==='send-invite') { button.textContent='Đã gửi lời mời'; button.setAttribute('aria-label','Đã gửi lời mời');toast(message);return; }
      closeModal(); await refresh(); toast(message);
    }
  } catch (error) { toast(error.message,true); if(button.isConnected)button.disabled=false; }
});
document.addEventListener('submit', async event => {
  const form=event.target;if(!['auth-form','event-form'].includes(form.id))return;event.preventDefault();
  const submit=form.querySelector('button:not([type="button"])'),errorBox=form.querySelector('.form-error'),oldLabel=submit.innerHTML;
  if(submit.disabled)return;submit.disabled=true;submit.textContent='Đang lưu…';errorBox.hidden=true;
  try {
    const data=Object.fromEntries(new FormData(form));
    if(form.id==='auth-form') {
      submit.textContent=state.authMode==='login'?'Đang đăng nhập…':'Đang tạo tài khoản…';
      const result=await api(state.authMode==='login'?'login':'register',data);
      state.token=result.token;state.user=result.user;state.authOpen=false;state.page='home';localStorage.setItem('evently-token',state.token);await refresh();window.scrollTo(0,0);
    } else {
      await api(form.dataset.id?'event-update':'event-create',{...data,id:form.dataset.id,startsAt:new Date(data.startsAt).toISOString()});closeModal();await refresh();toast(form.dataset.id?'Đã cập nhật cuộc hẹn.':'Cuộc hẹn đã được tạo.');
    }
  } catch(error) { errorBox.textContent=error.message;errorBox.hidden=false; }
  finally { if(submit.isConnected){submit.disabled=false;submit.innerHTML=oldLabel;} }
});
app.addEventListener('input', event => {
  if(!['event-search','friend-search'].includes(event.target.id))return;
  const {id,value,selectionStart}=event.target;state.query=value;render();
  const input=document.getElementById(id);input.focus();if(input.type!=='search')input.setSelectionRange(selectionStart,selectionStart);
});
document.addEventListener('keydown', event => {
  const dialog=modalRoot.querySelector('[role="dialog"]');if(!dialog)return;
  if(event.key==='Escape'){event.preventDefault();closeModal();return;}
  if(event.key==='Tab'){
    const focusable=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select,textarea,a[href]')].filter(el=>el.getClientRects().length);
    if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
async function init() {
  if(!state.token){render();return;}
  try{state.user=await api('me');await refresh();}
  catch{state.user=null;state.token='';localStorage.removeItem('evently-token');render();}
}
init();
