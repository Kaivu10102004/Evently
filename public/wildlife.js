/* Small software-rendered cuboids composited in the footage's own coordinates.
   No second video, external renderer or pointer tracking is needed. */
(() => {
  const engines = new WeakMap();
  const clamp = (v, lo=0, hi=1) => Math.max(lo,Math.min(hi,v));
  const smooth = v => {v=clamp(v);return v*v*(3-2*v);};
  function create(film, wrap) {
    const canvas=wrap?.querySelector('.meadow-creature');
    if(!canvas)return {setPaused(){}};
    if(engines.has(canvas))return engines.get(canvas);
    const ctx=canvas.getContext('2d');
    if(!ctx)return {setPaused(){}};
    canvas.width=1920;canvas.height=690;
    const layer=document.createElement('canvas');layer.width=160;layer.height=144;
    const paint=layer.getContext('2d',{willReadFrequently:true});
    const sample=document.createElement('canvas');sample.width=80;sample.height=64;
    const pixels=sample.getContext('2d',{willReadFrequently:true});
    const poster=new Image();poster.src=film.poster;
    let paused=true,callback=0,last=0,elapsed=0,reference=null,offset=[0,0];
    const base=[1140,598];
    // Ground points are in the source plate, so desktop/mobile share the same map.
    const animals=[
      {base:[340,565],scale:.66,phase:11.2,angle:.2,speed:.86},
      {base:[760,505],scale:.45,phase:5.4,angle:Math.PI,speed:.93},
      {kind:'cow',base:[1280,535],scale:1.45,phase:0,angle:Math.PI+.25,speed:1},
      {base:[1710,568],scale:.7,phase:8.7,angle:Math.PI,speed:.9},
      {base:[1030,613],scale:1,phase:0,angle:0,speed:1}
    ].sort((a,b)=>a.base[1]-b.base[1]);
    function source(){return film.readyState>=2?film:poster.complete&&poster.naturalWidth?poster:null;}
    function track(frame) {
      // A small grass patch at the same depth anchors the animal to the plate.
      pixels.drawImage(frame,base[0]-80,base[1]-64,160,128,0,0,80,64);
      const data=pixels.getImageData(0,0,80,64).data;
      if(!reference)return;
      let best=Infinity,dxBest=0,dyBest=0;
      for(let dy=-4;dy<=4;dy++)for(let dx=-12;dx<=12;dx++){
        let cost=0;
        for(let y=23;y<43;y+=3)for(let x=28;x<52;x+=3){
          const a=(y*80+x)*4,b=((y+dy)*80+x+dx)*4;
          cost+=Math.abs(reference[a]-data[b])+Math.abs(reference[a+1]-data[b+1]);
        }
        if(cost<best){best=cost;dxBest=dx;dyBest=dy;}
      }
      offset[0]+=(dxBest*2-offset[0])*.25;offset[1]+=(dyBest*2-offset[1])*.25;
    }
    function pose(t,angle=0){
      const cycle=t%18;
      let x=0,jump=0,fold=0;
      for(const [start,dir] of [[1.8,1],[3.1,1],[10,-1],[11.3,-1]]){
        const p=clamp((cycle-start)/.7);
        x+=dir*21*p;
        if(p>0&&p<1){jump=Math.sin(p*Math.PI)*11;fold=Math.sin(p*Math.PI)*.45;}
      }
      const turn=smooth((cycle-8)/.8)-smooth((cycle-16.7)/.8);
      const graze=(smooth((cycle-5)/.6)-smooth((cycle-7.1)/.6))*.28;
      // Look towards the viewer and into the field only while resting.
      // Choose the shortest arc, so a glance never becomes a full spin.
      let yaw=.35+turn*Math.PI+angle;
      const glance=smooth((cycle-4.3)/.7)-smooth((cycle-6.7)/.7);
      const lookAway=smooth((cycle-12.7)/.7)-smooth((cycle-15.2)/.7);
      const towards=(target,weight)=>{yaw+=Math.atan2(Math.sin(target-yaw),Math.cos(target-yaw))*weight;};
      towards(-Math.PI/2+.12,glance);
      towards(Math.PI/2-.12,lookAway);
      return {x,jump,fold,yaw,nod:graze,ear:Math.sin(t*7)*.07*(Math.sin(t*1.3)>.75?1:0)};
    }
    function cowPose(t,angle){
      const cycle=t%24;
      const out=smooth(cycle/5.4),back=smooth((cycle-15.2)/5.4);
      const window=(start,end,ramp=.65)=>smooth((cycle-start)/ramp)-smooth((cycle-end)/ramp);
      const walk=window(-.65,4.75)+window(14.55,19.95);
      const graze=window(5.8,11.6,1);
      let yaw=angle+Math.PI*(smooth((cycle-14.3)/.9)-smooth((cycle-22.5)/.9));
      const glance=window(12.4,13.5,.6);
      yaw+=Math.atan2(Math.sin(-Math.PI/2-yaw),Math.cos(-Math.PI/2-yaw))*glance;
      return {x:60*(out-back),jump:0,fold:0,yaw,nod:.08+graze*.74,headDrop:graze*.42,graze,walk,step:t*4.4,chew:(.5+.5*Math.sin(t*6.5))*graze,ear:Math.sin(t*5)*.11*(Math.sin(t*1.4)>.6?1:0),tail:Math.sin(t*2)*.55,breath:1+Math.sin(t*1.7)*.012};
    }
    function draw(t=elapsed){
      const frame=source();if(!frame)return;
      track(frame);
      ctx.clearRect(0,0,1920,690);
      for(const animal of animals)drawAnimal(frame,t,animal);
    }
    function drawAnimal(frame,t,animal){
      const {scale,phase,angle,speed}=animal,unit=14*scale,isCow=animal.kind==='cow';
      const clock=t*speed+phase;
      const p=isCow?cowPose(clock,angle):pose(clock,angle);
      const direction=Math.cos(angle)<0?-1:1;
      p.jump*=scale;
      const ground=[animal.base[0]+offset[0]*scale+p.x*scale*direction,animal.base[1]+offset[1]*scale];
      // The low sun casts a soft, elongated shadow along the actual grass.
      ctx.save();ctx.translate(ground[0]+9*scale,ground[1]+2*scale);ctx.rotate(-.12);
      ctx.filter=`blur(${3*scale+1}px)`;ctx.fillStyle=`rgba(44,51,10,${.26-p.jump*.009})`;
      ctx.beginPath();ctx.ellipse(0,0,(isCow?49:32)*scale,(isCow?10:7)*scale,0,0,Math.PI*2);ctx.fill();ctx.restore();
      paint.clearRect(0,0,160,144);
      const faces=[],co=Math.cos(p.yaw),si=Math.sin(p.yaw);
      const world=([x,y,z])=>[x*co+z*si,y,-x*si+z*co];
      const project=([x,y,z])=>[80+x*unit,120-y*unit+z*unit*.24-p.jump];
      function box(x,y,z,w,h,d,color=[249,241,216],transform=v=>v){
        const vertices=[[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z],[x,y,z+d],[x+w,y,z+d],[x+w,y+h,z+d],[x,y+h,z+d]].map(v=>world(transform(v)));
        for(const indices of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]]){
          const points=indices.map(i=>vertices[i]),a=points[0],b=points[1],c=points[2];
          const u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-b[i]);
          let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
          const length=Math.hypot(...n);n=n.map(v=>v/length);
          if(n[2]+n[1]*.24<=0)continue;
          // Light stays on the left when the animal turns; green ground bounce.
          const light=Math.min(1.02,.77+.4*Math.max(0,-n[0]*.77+n[1]*.57-n[2]*.28));
          const low=points.reduce((sum,v)=>sum+v[1],0)/4<.7;
          const rgb=color.map((v,i)=>Math.round(v*light*(low?[.94,.98,.84][i]:1)));
          faces.push({points:points.map(project),depth:points.reduce((sum,v)=>sum+v[2]+v[1]*.24,0)/4,color:`rgb(${rgb.join(',')})`});
        }
      }
      const pivotX=isCow?1.8:1,pivotY=isCow?3.05:1.7;
      const head=v=>{const [x,y,z]=v;return [pivotX+(x-pivotX)*Math.cos(p.nod)+(y-pivotY)*Math.sin(p.nod),pivotY-(x-pivotX)*Math.sin(p.nod)+(y-pivotY)*Math.cos(p.nod)-(p.headDrop||0),z];};
      if(isCow){
      // A stepped barrel and tapered head keep the voxel silhouette softer.
      const charcoal=[55,57,47],pink=[219,165,151],hoof=[75,69,54];
      const torso=v=>[v[0],1.3+(v[1]-1.3)*p.breath,v[2]];
      for(let x=0;x<6;x++)for(let y=0;y<4;y++)for(let z=0;z<4;z++){
        if((y===0||y===3)&&(z===0||z===3))continue;
        if(x===0&&y===3)continue;
        const spotted=(x<=1&&y>=1&&z!==1)||(x>=4&&y<=2&&z!==1)||(x===3&&y===3&&z<=1);
        box(-2.35+x*.65,1.3+y*.5,-1+z*.5,.65,.5,.5,spotted?charcoal:undefined,torso);
      }
      box(1.2,2.0,-.65,.85,1.3,1.3,undefined,torso);
      // Each hoof follows a grounded stance / lifted swing arc. Two articulated
      // segments bend at the knee instead of sliding one rigid leg back and forth.
      const bone=(a,b,z,w,d,color)=>{
        const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),co=dy/length,si=dx/length;
        box(-w/2,0,z,w,length,d,color,v=>[a[0]+v[0]*co+v[1]*si,a[1]-v[0]*si+v[1]*co,v[2]]);
      };
      for(const [x,z,phase] of [[-1.7,-.78,Math.PI],[-1.7,.36,Math.PI/2],[1.03,-.78,Math.PI*1.5],[1.03,.36,0]]){
        const gait=p.step+phase,hip=[x,1.52];
        const ankle=[x+Math.sin(gait)*.34*p.walk,.23+Math.max(0,Math.cos(gait))*.4*p.walk];
        const dx=ankle[0]-hip[0],dy=ankle[1]-hip[1],distance=Math.hypot(dx,dy);
        const bend=Math.sqrt(Math.max(0,.73*.73-distance*distance/4)),dir=x>0?1:-1;
        const knee=[(hip[0]+ankle[0])/2+(-dy/distance)*bend*dir,(hip[1]+ankle[1])/2+(dx/distance)*bend*dir];
        bone(knee,hip,z,.37,.4);
        bone(ankle,knee,z+.025,.29,.35);
        box(ankle[0]-.24,ankle[1]-.23,z-.02,.5,.25,.44,hoof);
      }
      box(-.65,1.0,-.55,1.2,.43,1.1,pink);
      // The forehead, cheeks and smaller muzzle use distinct tiers.
      box(1.85,2.75,-.67,1.28,1.0,1.34,undefined,head);
      box(1.95,3.74,-.55,.98,.27,1.1,undefined,head);
      box(2.03,2.53,-.61,1.06,.42,1.22,undefined,head);
      const jaw=v=>head([v[0],v[1]-p.chew*.07,v[2]+Math.sin(clock*6.5)*p.graze*.055]);
      box(2.96,2.49,-.57,.62,.57,1.14,pink,jaw);
      box(3.58,2.69,-.36,.025,.12,.16,hoof,jaw);
      box(3.58,2.69,.21,.025,.12,.16,hoof,jaw);
      box(2.02,3.33,-.685,.53,.38,.025,charcoal,head);
      box(2.02,3.33,.68,.53,.38,.025,charcoal,head);
      for(const z of [-.69,.68]){
        box(2.74,3.34,z,.15,.19,.025,[34,37,29],head);
        box(2.76,3.44,z+.002,.045,.045,.029,[249,239,214],head);
      }
      for(const z of [-.43,.3])box(3.14,3.33,z,.025,.16,.13,[34,37,29],head);
      for(const [z,side] of [[-1.16,-1],[.68,1]]){
        const ear=v=>head([v[0],v[1]+(v[2]-(side<0?-.67:.67))*p.ear*side,v[2]]);
        box(1.98,3.64,z,.65,.22,.49,undefined,ear);
        box(2.08,3.67,z+.02,.42,.07,.43,pink,ear);
      }
      for(const z of [-.5,.32]){
        box(2.02,3.97,z,.18,.38,.18,[226,215,179],head);
        box(1.94,4.3,z,.26,.12,.18,[247,237,205],head);
      }
      const tail=v=>[v[0]-(3.0-v[1])*.16,v[1],v[2]+p.tail*(3.0-v[1])*.45];
      box(-2.45,1.0,.42,.13,1.85,.13,undefined,tail);
      box(-2.53,.72,.34,.28,.43,.29,charcoal,tail);
      }else{
      const ear=v=>{const [x,y,z]=v;return head([x+(y-2.6)*p.ear,y,z]);};
      box(-1.5,.45,-.65,2.9,1.55,1.3);
      box(-1.4,.25,-.73,1.1,1.4,1.46);
      box(-1.95,1,-.3,.55,.55,.6);
      for(const z of [-.62,.3]){
        box(-1.45,.08+p.fold,z,1.12,.4,.42);
        box(.65,.08+p.fold*.6,z,.85,.4,.38);
      }
      box(.8,1.42,-.6,1.55,1.3,1.2,undefined,head);
      box(2.05,1.43,-.38,.55,.48,.76,undefined,head);
      for(const z of [-.48,.19]){
        box(1.05,2.57,z,.4,1.5,.3,undefined,ear);
        box(1.08,2.84,z+.305,.26,1.04,.025,[202,163,141],ear);
        box(1.93,2.12,z<0?-.615:.605,.14,.18,.025,[49,50,29],head);
      }
      // Small front-plane eyes keep the face readable during a frontal glance.
      for(const z of [-.47,.34]){
        box(2.355,2.12,z,.035,.17,.13,[49,50,29],head);
        box(2.392,2.22,z+.025,.015,.035,.035,[248,239,211],head);
      }
      box(2.61,1.61,-.11,.025,.16,.22,[175,130,105],head);
      }
      faces.sort((a,b)=>a.depth-b.depth);
      for(const face of faces){paint.beginPath();face.points.forEach(([x,y],i)=>i?paint.lineTo(x,y):paint.moveTo(x,y));paint.closePath();paint.fillStyle=face.color;paint.fill();}
      // Remove the lower silhouette using the current frame's real grass pixels.
      // A stepped top follows the plate texture, never a separate drawn grass fringe.
      const left=Math.round(ground[0]-80),top=Math.round(ground[1]-120);
      pixels.drawImage(frame,left,top,160,144,0,0,80,64);
      const grass=pixels.getImageData(0,0,80,64).data;
      const silhouette=paint.getImageData(0,0,160,144),data=silhouette.data;
      for(let x=0;x<160;x++){
        const col=Math.floor(x/2),greenLevel=grass[(54*80+col)*4+1];
        const grassTop=Math.round(120-(10-clamp((greenLevel-60)/130)*7)*scale);
        for(let y=grassTop;y<144;y++){
          const q=(Math.min(63,Math.floor(y*64/144))*80+col)*4;
          const green=grass[q+1]>grass[q+2]*1.3&&grass[q+1]>grass[q]*.85;
          if(green){const i=(y*160+x)*4;data[i+3]*=1-smooth((y-grassTop)/3);}
        }
      }
      paint.putImageData(silhouette,0,0);
      // Focus and colour share the plate's middle-ground, rather than crisp UI art.
      ctx.save();ctx.filter=`blur(${Math.max(.45,.65+(1-scale)*.2)}px)`;ctx.drawImage(layer,left,top);ctx.restore();
    }
    function tick(now){
      callback=0;if(paused||!canvas.isConnected)return;
      if(last)elapsed+=Math.min((now-last)/1000,.1);last=now;
      draw();schedule();
    }
    function schedule(){if(!callback&&!paused)callback=film.requestVideoFrameCallback?film.requestVideoFrameCallback(tick):requestAnimationFrame(tick);}
    function setPaused(value){
      paused=value;last=0;
      if(value){if(callback){if(film.cancelVideoFrameCallback)film.cancelVideoFrameCallback(callback);else cancelAnimationFrame(callback);callback=0;}draw();}
      else schedule();
    }
    poster.onload=()=>{
      pixels.drawImage(poster,base[0]-80,base[1]-64,160,128,0,0,80,64);
      reference=pixels.getImageData(0,0,80,64).data;draw();
    };
    const engine={setPaused};engines.set(canvas,engine);draw();return engine;
  }
  window.EventlyWildlife={create};
})();
