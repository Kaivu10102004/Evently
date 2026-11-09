import * as THREE from '/vendor/three.module.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let active = null;

function makeCloud(material, blocks) {
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  for (const [x,y,z,sx,sy,sz] of blocks) {
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(x,y,z); cube.scale.set(sx,sy,sz); cube.castShadow = false;
    group.add(cube);
  }
  return group;
}

function mount() {
  const host = document.querySelector('#meadow-scene');
  if (!host || active?.host === host) return;
  if (active) { active.stop(); active = null; }
  const mobile = matchMedia('(max-width: 700px)').matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(39, 1, .1, 150);
  camera.position.set(0, 5.7, 13.8);
  camera.lookAt(0, 1.25, -14);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({alpha:true, antialias:true, powerPreference:'low-power', failIfMajorPerformanceCaveat:false}); }
  catch (error) { console.warn('Evently 3D scene unavailable; using the CSS fallback.', error); host.parentElement.classList.add('scene-fallback'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.15 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.domElement.setAttribute('aria-hidden','true');
  renderer.domElement.tabIndex = -1;
  host.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffefd9, 0x283b1b, 2.0));
  const sunLight = new THREE.DirectionalLight(0xffd5a0, 2.5);
  sunLight.position.set(-12, 18, 10); scene.add(sunLight);

  // Soft, low sun and a warm horizon glow.
  const sun = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12), new THREE.MeshBasicMaterial({color:0xffedb1}));
  sun.position.set(-18, 8.4, -42); scene.add(sun);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(2.35, 16, 12), new THREE.MeshBasicMaterial({color:0xf7b87d, transparent:true, opacity:.22, depthWrite:false}));
  glow.position.copy(sun.position); scene.add(glow);

  // Stacked cubes give the clouds the stepped silhouette in the reference.
  const cloudMat = new THREE.MeshLambertMaterial({color:0xfff3e8, flatShading:true});
  const cloudPink = new THREE.MeshLambertMaterial({color:0xf2b7ad, flatShading:true});
  const clouds = [
    makeCloud(cloudMat,[[-1,0,0,2.8,.55,1.25],[-.4,.55,0,1.8,.55,1.25],[.9,.35,0,1.5,.55,1.25],[1.8,-.12,0,1.35,.55,1.25]]),
    makeCloud(cloudPink,[[-1,0,0,2.4,.5,1.1],[-.5,.5,0,1.6,.5,1.1],[.8,.35,0,1.5,.5,1.1]]),
    makeCloud(cloudMat,[[-.6,0,0,1.8,.4,1],[-.1,.4,0,1.25,.4,1],[1,-.1,0,1,.4,1]])
  ];
  clouds[0].position.set(-9,9,-31); clouds[1].position.set(10,7.1,-28); clouds[2].position.set(1,10.2,-44);
  clouds.forEach(c=>scene.add(c));

  // Tiled, uneven ground creates the deep checkerboard field and its perspective.
  const across = mobile ? 66 : 112, rows = mobile ? 55 : 88;
  const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshLambertMaterial({color:0xffffff, flatShading:true}), across*rows);
  tiles.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  const tile = new THREE.Object3D(); let k=0; let seed=739;
  const random=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};
  const palette=[0x7f913b,0x718332,0x879840,0x66782e,0x9a9b3c,0x536b2b,0x8c8a35];
  for(let z=0;z<rows;z++) for(let x=0;x<across;x++){
    const depth=z/(rows-1), width=68;
    const size=width/across;
    tile.position.set((x-across/2)*size, -.13+random()*.12, 5-depth*56);
    tile.scale.set(size*(.88+random()*.16), .12, (56/rows)*(.82+random()*.22));
    tile.rotation.y=(random()-.5)*.045; tile.updateMatrix(); tiles.setMatrixAt(k,tile.matrix);
    tiles.setColorAt(k,new THREE.Color(palette[Math.floor(random()*palette.length)])); k++;
  }
  tiles.instanceMatrix.needsUpdate=true; if(tiles.instanceColor)tiles.instanceColor.needsUpdate=true; scene.add(tiles);

  // Each flower uses instanced stems and small cube petals: thousands of blocks, few draw calls.
  const flowerCount=mobile?370:980;
  const stemGeom=new THREE.BoxGeometry(.035,1,.035);
  const stems=new THREE.InstancedMesh(stemGeom,new THREE.MeshLambertMaterial({color:0x53692c,flatShading:true}),flowerCount);
  const petalGeom=new THREE.BoxGeometry(.13,.13,.09);
  const centerGeom=new THREE.BoxGeometry(.105,.105,.1);
  const petalMats=[0xe98685,0xe9b7cc,0xf5cf62,0xf1ead7,0x9c87c9,0xeaa45b,0x91bdc2].map(color=>new THREE.MeshLambertMaterial({color,flatShading:true}));
  const petalMeshes=petalMats.map(mat=>new THREE.InstancedMesh(petalGeom,mat,flowerCount*4));
  const centers=new THREE.InstancedMesh(centerGeom,new THREE.MeshLambertMaterial({color:0xffdb75,flatShading:true}),flowerCount);
  const petalCounts=petalMeshes.map(()=>0); let n=0;
  const dummy=new THREE.Object3D();
  for(let i=0;i<flowerCount;i++){
    const x=(random()-.5)*65, z=4-random()*41, depth=(z+38)/42, scale=.22+Math.max(0,depth)*.88;
    const height=(.8+random()*1.25)*scale, baseY=.02+random()*.12;
    dummy.position.set(x,baseY+height/2,z); dummy.scale.set(scale,height,scale); dummy.rotation.y=random()*.5; dummy.updateMatrix(); stems.setMatrixAt(i,dummy.matrix);
    const colorIndex=Math.floor(random()*petalMeshes.length);
    const offsets=[[-.105,0,0],[.105,0,0],[0,.105,0],[0,-.105,0]];
    for(const [dx,dy,dz] of offsets){const mesh=petalMeshes[colorIndex],idx=petalCounts[colorIndex]++;dummy.position.set(x+dx*scale,baseY+height+dy*scale,z+dz);dummy.scale.setScalar(scale);dummy.rotation.set(0,0,(random()-.5)*.16);dummy.updateMatrix();mesh.setMatrixAt(idx,dummy.matrix)}
    dummy.position.set(x,baseY+height,z+.015);dummy.scale.setScalar(scale);dummy.rotation.set(0,0,0);dummy.updateMatrix();centers.setMatrixAt(i,dummy.matrix);n++;
  }
  scene.add(stems,centers);petalMeshes.forEach((m,i)=>{m.count=petalCounts[i];scene.add(m)});
  stems.instanceMatrix.needsUpdate=true;centers.instanceMatrix.needsUpdate=true;petalMeshes.forEach(m=>m.instanceMatrix.needsUpdate=true);

  const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};
  resize(); const observer=new ResizeObserver(resize);observer.observe(host);
  let pointerX=0;const onPointer=e=>{const r=host.getBoundingClientRect();pointerX=((e.clientX-r.left)/r.width-.5)*2};host.addEventListener('pointermove',onPointer,{passive:true});
  let frame=0,alive=true;
  const render=(time=0)=>{if(!alive||document.hidden)return;const t=time*.0003;if(!reduced){camera.position.x+=(pointerX*.28+Math.sin(t)*.12-camera.position.x)*.025;camera.lookAt(pointerX*.14,1.25,-14);clouds[0].position.x=-9+Math.sin(t*.45)*.9;clouds[1].position.x=10+Math.cos(t*.36)*.7;clouds[2].position.x=1+Math.sin(t*.25)*.5}renderer.render(scene,camera);if(!reduced)frame=requestAnimationFrame(render)};
  const onVisibility=()=>{if(!document.hidden&&alive)frame=requestAnimationFrame(render)};
  document.addEventListener('visibilitychange',onVisibility);
  frame=requestAnimationFrame(render);
  active={host,renderer,observer,frame,stop(){alive=false;cancelAnimationFrame(frame);observer.disconnect();host.removeEventListener('pointermove',onPointer);document.removeEventListener('visibilitychange',onVisibility);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();host.parentElement?.classList.remove('scene-fallback')}};
}
window.EventlyMeadow={mount};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
const watch=new MutationObserver(()=>{const host=document.querySelector('#meadow-scene');if(!host&&active){active.stop();active=null}else if(host)mount()});
watch.observe(document.body,{childList:true,subtree:true});
