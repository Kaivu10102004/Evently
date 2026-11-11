/* Shared event metadata and calendar filtering; no DOM or framework dependency. */
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EventlyFilters=api;})(typeof window==='object'?window:globalThis,()=>{
  const categories=[['social','Gặp gỡ'],['creative','Sáng tạo'],['music','Âm nhạc'],['outdoors','Ngoài trời'],['work','Công việc'],['books','Sách'],['other','Khác']];
  const normalize=value=>String(value??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').trim();
  const category=e=>categories.some(([key])=>key===e.category)?e.category:'other';
  const area=e=>String(e.area??'').trim();
  const categoryLabel=e=>categories.find(([key])=>key===category(e))[1];
  const dateOptions=period=>period==='past'?[['any','Mọi thời gian'],['recent7','7 ngày gần đây'],['recent30','30 ngày gần đây']]:[['any','Mọi thời gian'],['today','Hôm nay'],['tomorrow','Ngày mai'],['weekend','Cuối tuần này'],['next7','7 ngày tới']];
  function dateMatches(e,value='any',now=new Date()){
    const time=new Date(e.startsAt).getTime();if(!Number.isFinite(time))return false;
    const start=new Date(now);start.setHours(0,0,0,0);
    const offset=days=>{const d=new Date(start);d.setDate(d.getDate()+days);return d.getTime();};
    let from=-Infinity,to=Infinity;
    if(value==='today'){from=+start;to=offset(1);}
    else if(value==='tomorrow'){from=offset(1);to=offset(2);}
    else if(value==='next7'){from=+start;to=offset(7);}
    else if(value==='weekend'){const day=start.getDay(),delta=day===0?-1:(6-day+7)%7;from=offset(delta);to=offset(delta+2);}
    else if(value==='recent7'){from=offset(-6);to=offset(1);}
    else if(value==='recent30'){from=offset(-29);to=offset(1);}
    return time>=from&&time<to;
  }
  const selectionKeys = ['categories','dates','areas','visibility','scopes'];
  const emptySelection = () => Object.fromEntries(selectionKeys.map(key => [key, []]));
  const copySelection = selection => Object.fromEntries(selectionKeys.map(key => [key, [...new Set(selection?.[key] || [])]]));
  const selectionCount = selection => selectionKeys.reduce((count,key) => count + (selection?.[key]?.length || 0), 0);
  function matches(e,filters={},now=new Date()){
    // OR within a group, AND between groups. Empty arrays leave a group unrestricted.
    const selected=(plural,singular,all)=>Array.isArray(filters[plural])?filters[plural]:filters[singular]&&filters[singular]!==all?[filters[singular]]:[];
    const activities=selected('categories','category','all'), locations=selected('areas','area','all'), dates=selected('dates','date','any');
    return (!activities.length||activities.includes(category(e)))
      &&(!locations.length||locations.some(value=>normalize(area(e))===normalize(value)))
      &&(dates.length?dates.some(value=>dateMatches(e,value,now)):dateMatches(e,'any',now))
      &&normalize(`${e.title} ${e.location} ${e.ownerName||''} ${categoryLabel(e)} ${area(e)}`).includes(normalize(filters.query||''));
  }
  function areas(events){const names=new Map();for(const e of events){const value=area(e),key=normalize(value);if(key&&!names.has(key))names.set(key,value);}return [...names].sort((a,b)=>a[1].localeCompare(b[1],'vi'));}
  return {categories,normalize,category,area,categoryLabel,dateOptions,dateMatches,matches,areas,emptySelection,copySelection,selectionCount};
});
