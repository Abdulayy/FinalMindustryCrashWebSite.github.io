// 3D background: a box full of cubes. They tumble into place, then freeze.
// Each load uses a new random seed, so the pile is different every time.
import * as THREE from './vendor/three.module.min.js';
import RAPIER from './vendor/rapier.es.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SHOW_FALL = !REDUCED_MOTION;
const CELL = 1.7, LAYERS = 4, MAX_CUBES = 800, MAX_STEPS = 400;
const FLARE_HEIGHT = 6.5, FLARE_SIZE = 1.1, FLARE_FLIGHT_MS = 6500;

function mulberry(s){return function(){s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

export async function start(){
  const canvas=document.createElement('canvas');
  canvas.id='bg3d';
  document.body.prepend(canvas);
  try{
    await RAPIER.init();
    const tex=await new THREE.TextureLoader().loadAsync(new URL('../assets/cube.png',import.meta.url).href);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.magFilter=tex.minFilter=THREE.NearestFilter;   // keep the pixels crisp
    tex.generateMipmaps=false;

    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFShadowMap;
    const scene=new THREE.Scene();
    scene.background=new THREE.Color('#1c1c23');
    scene.add(new THREE.AmbientLight(0x9aa4c4,2.2));
    const sun=new THREE.DirectionalLight(0xe6ecff,4.2);
    sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-0.0006;sun.shadow.normalBias=0.03;
    sun.position.set(-7,26,9);scene.add(sun,sun.target);
    const camera=new THREE.PerspectiveCamera(40,1,1,120);
    camera.up.set(0,0,-1);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshLambertMaterial({color:0x2a2a32}));
    floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
    const geo=new THREE.BoxGeometry(1,1,1),mat=new THREE.MeshLambertMaterial({map:tex});

    let run=0,raf=0,cameraRaf=0,world=null,mesh=null,bodies=[],sizes=[],unit=50,AW=0,AH=0,H=18;
    let targetX=0,targetZ=0,offsetX=0,offsetZ=0,settled=false;
    const m4=new THREE.Matrix4(),pos=new THREE.Vector3(),quat=new THREE.Quaternion(),scl=new THREE.Vector3(),col=new THREE.Color();

    function positionCamera(){
      camera.position.set(offsetX,H,H*0.08+offsetZ);
      // Move the aim point with the camera to pan without rotating the view.
      camera.lookAt(offsetX,0,offsetZ);
    }
    function fit(){
      renderer.setSize(innerWidth,innerHeight,false);
      camera.aspect=innerWidth/innerHeight;
      camera.fov=2*Math.atan((innerHeight/unit/2)/H)*180/Math.PI;
      positionCamera();
      camera.updateProjectionMatrix();
    }
    function moveCamera(){
      const dx=targetX-offsetX,dz=targetZ-offsetZ;
      offsetX+=dx*.12;offsetZ+=dz*.12;
      positionCamera();
      if(settled)renderer.render(scene,camera);
      if(Math.abs(dx)>.002||Math.abs(dz)>.002){
        cameraRaf=requestAnimationFrame(moveCamera);
      }else{
        offsetX=targetX;offsetZ=targetZ;
        positionCamera();
        if(settled)renderer.render(scene,camera);
        cameraRaf=0;
      }
    }
    function setCameraTarget(event){
      if(REDUCED_MOTION||event.pointerType!=='mouse')return;
      targetX=((event.clientX/innerWidth)-.5)*1.5;
      targetZ=((event.clientY/innerHeight)-.5)*1.0;
      if(!cameraRaf)cameraRaf=requestAnimationFrame(moveCamera);
    }
    function resetCameraTarget(){
      targetX=0;targetZ=0;
      if(!cameraRaf)cameraRaf=requestAnimationFrame(moveCamera);
    }
    function sync(){
      for(let k=0;k<bodies.length;k++){
        const p=bodies[k].translation(),q=bodies[k].rotation();
        m4.compose(pos.set(p.x,p.y,p.z),quat.set(q.x,q.y,q.z,q.w),scl.setScalar(sizes[k]));
        mesh.setMatrixAt(k,m4);
      }
      mesh.instanceMatrix.needsUpdate=true;
    }
    const asleep=()=>bodies.every(b=>b.isSleeping());

    let flare=null;
    const flareRaycaster=new THREE.Raycaster();
    const flareScreen=new THREE.Vector2();
    const flarePlane=new THREE.Plane(new THREE.Vector3(0,1,0),-FLARE_HEIGHT);

    function pointOnFlightPlane(x,y,target){
      camera.updateMatrixWorld(true);
      flareRaycaster.setFromCamera(flareScreen.set(x,y),camera);
      return flareRaycaster.ray.intersectPlane(flarePlane,target);
    }
    function scheduleFlare(){
      setTimeout(flyFlare,5000+Math.random()*8000);
    }
    function flyFlare(){
      const start=performance.now(),screenX=(Math.random()-.5)*1.8;
      const startY=1.35+Math.random()*.2;
      const flightStart=pointOnFlightPlane(screenX,startY,new THREE.Vector3());
      const flightEnd=pointOnFlightPlane(screenX,-startY,new THREE.Vector3());
      if(!flightStart||!flightEnd){
        console.error('Flare flyby could not reach its flight path.');
        scheduleFlare();
        return;
      }
      scene.add(flare);
      renderer.shadowMap.autoUpdate=true;
      function finishFlare(){
        scene.remove(flare);
        renderer.shadowMap.autoUpdate=false;
        renderer.shadowMap.needsUpdate=true;
        renderer.render(scene,camera);
        scheduleFlare();
      }
      function frame(now){
        const progress=Math.min(1,(now-start)/FLARE_FLIGHT_MS);
        flare.position.lerpVectors(flightStart,flightEnd,progress);
        flare.position.y+=Math.sin(progress*Math.PI*4)*.06;
        if(progress>=1){
          finishFlare();
          return;
        }
        renderer.render(scene,camera);
        requestAnimationFrame(frame);
      }
      frame(start);
    }
    function loadFlare(){
      if(REDUCED_MOTION)return;
      new GLTFLoader().loadAsync(new URL('../assets/flare3d.glb',import.meta.url).href)
        .then(gltf=>{
          const model=gltf.scene;
          model.updateMatrixWorld(true);
          const bounds=new THREE.Box3().setFromObject(model);
          const size=bounds.getSize(new THREE.Vector3());
          const center=bounds.getCenter(new THREE.Vector3());
          const maxDimension=Math.max(size.x,size.y,size.z);
          if(!Number.isFinite(maxDimension)||maxDimension<=0)throw new Error('Flare model has invalid dimensions.');
          model.position.sub(center);
          model.rotation.x=Math.PI;
          model.traverse(object=>{
            if(object.isMesh){object.castShadow=true;object.receiveShadow=false;}
          });
          flare=new THREE.Group();
          flare.scale.setScalar(FLARE_SIZE/maxDimension);
          const roll=new THREE.Group();
          roll.rotation.z=Math.PI;
          roll.add(model);
          flare.add(roll);
          scheduleFlare();
        })
        .catch(error=>console.error('Unable to load the Flare flyby model:',error));
    }

    function build(){
      const id=++run;cancelAnimationFrame(raf);
      settled=false;
      canvas.classList.remove('ready');
      if(mesh){scene.remove(mesh);mesh.dispose();}
      if(world){try{world.free();}catch(e){}}
      unit=Math.max(44,Math.min(80,innerWidth/22));     // pixels per cube
      let nx,nz;
      for(;;){
        AW=innerWidth/unit*1.12+2;AH=innerHeight/unit*1.12+2;
        nx=Math.ceil(AW/CELL);nz=Math.ceil(AH/CELL);
        if(nx*nz*LAYERS<=MAX_CUBES)break;
        unit*=1.08;
      }
      H=Math.max(18,(innerHeight/unit/2)/Math.tan(22*Math.PI/180));
      fit();
      const R=Math.max(AW,AH)/2+8,sc=sun.shadow.camera;
      sc.left=-R;sc.right=R;sc.top=R;sc.bottom=-R;sc.near=1;sc.far=70;sc.updateProjectionMatrix();
      renderer.shadowMap.autoUpdate=true;

      // the box: floor plus four walls
      world=new RAPIER.World({x:0,y:-22,z:0});
      const D=RAPIER.ColliderDesc,hh=14;
      world.createCollider(D.cuboid(AW/2+3,1,AH/2+3).setTranslation(0,-1,0).setFriction(0.9));
      for(const s of [-1,1]){
        world.createCollider(D.cuboid(1,hh,AH/2+3).setTranslation(s*(AW/2+1),hh,0));
        world.createCollider(D.cuboid(AW/2+3,hh,1).setTranslation(0,hh,s*(AH/2+1)));
      }

      // cubes: staggered lattice above the floor, random rotation, new seed every build
      const rng=mulberry(crypto.getRandomValues(new Uint32Array(1))[0]);
      const n=nx*nz*LAYERS;
      mesh=new THREE.InstancedMesh(geo,mat,n);
      mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);
      bodies=[];sizes=[];
      const lim=(a)=>Math.max(-a/2+0.6,Math.min(a/2-0.6,0));
      for(let l=0;l<LAYERS;l++)for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
        const x=Math.max(-AW/2+0.6,Math.min(AW/2-0.6,(i-(nx-1)/2)*CELL+(l&1?CELL/2:0)+(rng()-.5)*.3));
        const z=Math.max(-AH/2+0.6,Math.min(AH/2-0.6,(j-(nz-1)/2)*CELL+(l&2?CELL/2:0)+(rng()-.5)*.3));
        const y=1+l*1.9+rng()*.5,s=.92+rng()*.16;
        const u=rng(),v=rng()*6.2832,w=rng()*6.2832,a=Math.sqrt(1-u),b=Math.sqrt(u);
        const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,y,z)
          .setRotation({x:a*Math.sin(v),y:a*Math.cos(v),z:b*Math.sin(w),w:b*Math.cos(w)})
          .setLinearDamping(0.5).setAngularDamping(1.0));
        world.createCollider(D.cuboid(s/2,s/2,s/2).setRestitution(0.12).setFriction(0.8),body);
        const k=bodies.length;bodies.push(body);sizes.push(s);
        const t=.72+rng()*.28;mesh.setColorAt(k,col.setRGB(t*.93,t*.96,t));
      }
      mesh.instanceColor.needsUpdate=true;
      sync();

      let steps=0;
      function finish(){
        sync();
        renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true; // one last shadow pass, then it stays still
        settled=true;
        renderer.render(scene,camera);
        canvas.classList.add('ready');
        try{world.free();}catch(e){}
        world=null;bodies=[];
      }
      function tick(){
        if(id!==run)return;
        const t0=performance.now(),per=SHOW_FALL?(steps>150?3:1):1e9;
        let done=false,k=0;
        do{
          world.step();steps++;k++;
          if(steps>=MAX_STEPS||(steps%15===0&&steps>60&&asleep())){done=true;break;}
        }while(k<per&&(SHOW_FALL||performance.now()-t0<10));
        if(done){finish();return;}
        if(SHOW_FALL){
          sync();
          renderer.render(scene,camera);
          if(steps===1)canvas.classList.add('ready');
        }
        raf=requestAnimationFrame(tick);
      }
      tick();
    }

    if(!REDUCED_MOTION){
      addEventListener('pointermove',setCameraTarget);
      addEventListener('blur',resetCameraTarget);
      document.addEventListener('pointerout',event=>{if(event.relatedTarget===null)resetCameraTarget();});
    }
    build();
    loadFlare();
    let rt;
    addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{
      if(innerWidth/unit>AW-0.8||innerHeight/unit>AH-0.8)build();   // window grew past the box: refill it
      else{fit();renderer.render(scene,camera);}
    },200);});
  }catch(e){canvas.remove();throw e;}
}
