const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const filters=require('../public/event-filters');
function client(){
 const node={addEventListener(){}};
 const context=vm.createContext({document:{querySelector:()=>node,addEventListener(){}},window:{EventlyFilters:filters,addEventListener(){}},location:{hash:''},localStorage:{getItem:()=>''}});
 vm.runInContext(fs.readFileSync('public/app.js','utf8').replace(/\ninit\(\);\s*$/,'')+'\nglobalThis.client={state,friendsPage};',context);
 return context.client;
}
test('connection directory caps a thousand friends at twelve rows per page and clamps removed pages',()=>{
 const {state,friendsPage}=client();
 state.friends=Array.from({length:1000},(_,i)=>({id:String(i),name:`Bạn ${String(i).padStart(4,'0')}`,email:`u${i}@example.test`}));
 let html=friendsPage();assert.equal((html.match(/class="connection-row"/g)||[]).length,12);assert.match(html,/Trang 1 \/ 84/);
 state.friendPage=84;html=friendsPage();assert.equal((html.match(/class="connection-row"/g)||[]).length,4);
 state.friends=state.friends.slice(0,5);html=friendsPage();assert.equal(state.friendPage,1);assert.equal((html.match(/class="connection-row"/g)||[]).length,5);
});
test('directory searches Vietnamese names without accents and separates pending and sent invitations',()=>{
 const {state,friendsPage}=client();
 state.friends=[{id:'one',name:'Đặng Thảo Linh',email:'linh@example.test'}];
 state.query='dang thao';assert.match(friendsPage(),/Đặng Thảo Linh/);
 state.query='';state.friendTab='requests';state.friendRequests=[{id:'r',from:'incoming',user:{id:'incoming',name:'An',email:'an@example.test'}}];
 let html=friendsPage();assert.match(html,/data-action="friend-accept"/);assert.match(html,/data-action="friend-reject"/);
 state.friendTab='discover';state.users=[{id:'sent',name:'Mai',email:'mai@example.test',friendship:'sent'},state.friendRequests[0].user];
 html=friendsPage();assert.match(html,/Đã gửi lời mời/);assert.doesNotMatch(html,/data-action="friend-add"/);
});
