const {test}=require('node:test'),assert=require('node:assert/strict');
process.env.TZ='Asia/Ho_Chi_Minh';
const filters=require('../public/event-filters');
const at=startsAt=>({title:'Vẽ một chiều',location:'Hà Nội',ownerName:'Evently',startsAt,category:'creative',area:'Tây Hồ'});
const now=new Date('2026-11-11T04:00:00Z');
test('category, area, accent-insensitive search and date filters combine with AND',()=>{
  const e=at('2026-11-12T18:30:00+07:00');
  assert(filters.matches(e,{category:'creative',area:'tay ho',query:'ve mot',date:'tomorrow'},now));
  for(const patch of [{category:'music'},{area:'Ba Đình'},{query:'books'},{date:'today'}])assert(!filters.matches(e,{category:'creative',area:'tay ho',date:'tomorrow',...patch},now));
  assert(filters.matches(e,{},now));assert.equal(filters.category({}),'other');
});
test('calendar bounds include local midnight and exclude the next day',()=>{
  assert(filters.dateMatches(at('2026-11-11T00:00:00+07:00'),'today',now));
  assert(filters.dateMatches(at('2026-11-11T23:59:59+07:00'),'today',now));
  assert(!filters.dateMatches(at('2026-11-12T00:00:00+07:00'),'today',now));
  assert(filters.dateMatches(at('2026-11-17T23:59:59+07:00'),'next7',now));
  assert(!filters.dateMatches(at('2026-11-18T00:00:00+07:00'),'next7',now));
  assert(!filters.dateMatches(at('invalid'),'any',now));
});
test('weekend includes Saturday/Sunday and still finds Sunday on Sunday',()=>{
  assert(filters.dateMatches(at('2026-11-14T08:00:00+07:00'),'weekend',now));
  assert(filters.dateMatches(at('2026-11-15T18:00:00+07:00'),'weekend',new Date('2026-11-15T09:00:00+07:00')));
  assert(!filters.dateMatches(at('2026-11-16T00:00:00+07:00'),'weekend',now));
});
test('past ranges use local calendar boundaries; area options deduplicate spelling/accents',()=>{
  assert(filters.dateMatches(at('2026-11-05T00:00:00+07:00'),'recent7',now));
  assert(!filters.dateMatches(at('2026-11-04T23:59:59+07:00'),'recent7',now));
  assert.deepEqual(filters.areas([{area:'Tây Hồ'},{area:'tay ho'},{area:' Ba Đình '},{area:''}]).map(x=>x[0]).sort(),['ba dinh','tay ho']);
  assert(!filters.dateOptions('past').some(([key])=>key==='tomorrow'));
});

test('multi-select unions each group and intersects categories, areas, dates and search',()=>{
  const events=[
    at('2026-11-11T18:00:00+07:00'),
    {...at('2026-11-12T18:00:00+07:00'),category:'music',title:'Nhạc',area:'Đống Đa'},
    {...at('2026-11-15T18:00:00+07:00'),category:'books'},
    {...at('2026-11-12T18:00:00+07:00'),category:'creative',area:'Ba Đình'}
  ];
  const selection={categories:['creative','music'],areas:['tay ho','dong da'],dates:['today','tomorrow']};
  assert.deepEqual(events.filter(e=>filters.matches(e,selection,now)),events.slice(0,2));
  assert.deepEqual(events.filter(e=>filters.matches(e,{...selection,query:'nhac'},now)),[events[1]]);
  assert.equal(events.filter(e=>filters.matches(e,{dates:['today','next7']},now)).length,4,'overlapping date windows never duplicate events');
  assert(events.every(e=>filters.matches(e,filters.emptySelection(),now)));
});

test('draft selections have independent arrays and count individual choices',()=>{
  const applied=filters.emptySelection();applied.categories.push('creative');
  const draft=filters.copySelection(applied);draft.categories.push('music');draft.areas.push('tay ho');
  assert.deepEqual(applied.categories,['creative']);assert.deepEqual(applied.areas,[]);
  assert.equal(filters.selectionCount(draft),3);assert.equal(filters.selectionCount(applied),1);
  assert.deepEqual(filters.copySelection({...draft,categories:['music','music']}).categories,['music']);
});
