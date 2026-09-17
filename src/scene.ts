import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Game, tilePosition, type Wallet } from './game';
import { VillageRun } from './village-run';
import { RunnerView } from './runner-view';
import type {IndicatorSnapshot} from './horus';
import {PigActor} from './pig-actor';
import {priceToGround,type PriceFrame} from './price-terrain';
import {StageTrack} from './stage-track';

export class ValleyScene {
  renderer:THREE.WebGLRenderer;
  scene=new THREE.Scene();
  camera=new THREE.OrthographicCamera(-20,20,15,-15,.1,180);
  private raceCamera=new THREE.PerspectiveCamera(55,1,.1,150);
  private runner=new RunnerView();
  private cheer=new THREE.Group();
  private models=new Map<string,THREE.Object3D>();
  private actor=new PigActor();
  private pig=this.actor.group;
  private rangeBand!:THREE.Mesh;private groundLevels:{mesh:THREE.Mesh;label:THREE.Sprite;key:'entry'|'stop'|'target'}[]=[];
  private rangeEdges:THREE.Mesh[]=[];private hoofMarks!:THREE.InstancedMesh;
  private fartPuffs:THREE.Mesh[]=[];private fartPulse=0;private nextFart=6;fartEvent=0;
  private roads:THREE.Mesh[]=[];
  private tiles:THREE.Group[]=[];private flowers:THREE.Group[]=[];private banners:THREE.Object3D[]=[];
  private lanterns=new THREE.Group();private clock=0;private wide=false;
  private trailGeometry=new THREE.BufferGeometry();private trail:THREE.Line;
  private positions=new Float32Array(192*3);private dust:THREE.Points;
  private resizeObserver:ResizeObserver;
  private cameraTarget=new THREE.Vector3(-1,1,0);
  private pigGeneration=-1;private lastOffset=0;private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  private lightSeed=new Float32Array(90);
  private track=new StageTrack();
  private chaseZ=0;private lookZ=0;
  impactEvent=0;
  ready=false;lost=false;
  constructor(private container:HTMLElement,private onError:(message:string)=>void){
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance',failIfMajorPerformanceCaveat:false});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.18;
    this.renderer.setClearColor(0xc5d6e4,1);
    this.renderer.domElement.setAttribute('aria-label','Escenario 3D: el cerdo y las villas Roble y Brasa');
    this.renderer.domElement.setAttribute('role','img');container.append(this.renderer.domElement);
    this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.onError('La vista 3D se ha detenido. Recarga para recuperar el valle.');});
    this.scene.fog=new THREE.Fog(0xd7c4a0,36,92);
    const ambient=new THREE.HemisphereLight(0xfff0d6,0x5a4a32,1.15);this.scene.add(ambient);
    const sun=new THREE.DirectionalLight(0xffe0b0,2.45);sun.position.set(10,16,8);sun.castShadow=true;
    const map=matchMedia('(max-width:760px)').matches?1024:1536;
    sun.shadow.mapSize.set(map,map);sun.shadow.camera.left=-22;sun.shadow.camera.right=22;sun.shadow.camera.top=22;sun.shadow.camera.bottom=-22;sun.shadow.camera.far=70;sun.shadow.bias=-.0003;sun.shadow.normalBias=.04;this.scene.add(sun);
    const fill=new THREE.DirectionalLight(0xffc9a0,.55);fill.position.set(-12,7,-10);this.scene.add(fill);
    this.camera.position.set(16,14,22);this.camera.lookAt(this.cameraTarget);
    this.scene.add(this.runner.group);this.runner.group.visible=false;
    this.scene.add(this.track.group);
    const sparkMat=new THREE.MeshBasicMaterial({color:0xffe489});
    for(let i=0;i<12;i++){const spark=new THREE.Mesh(new THREE.OctahedronGeometry(.1),sparkMat);this.cheer.add(spark);}this.scene.add(this.cheer);this.cheer.visible=false;
    this.trailGeometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3));this.trailGeometry.setDrawRange(0,0);
    this.trail=new THREE.Line(this.trailGeometry,new THREE.LineBasicMaterial({color:0xf2c86c,transparent:true,opacity:.9}));this.trail.frustumCulled=false;this.scene.add(this.trail);
    const dustGeo=new THREE.BufferGeometry();const dustPos=new Float32Array(22*3);dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));
    this.dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xf4d2a1,size:.13,transparent:true,opacity:.4,depthWrite:false}));this.scene.add(this.dust);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();
  }
  async load(){
    await this.loadLibrary();
    const fartMaterial=new THREE.MeshBasicMaterial({color:0xaca68e,transparent:true,opacity:.07,depthWrite:false});
    for(let i=0;i<5;i++){const puff=new THREE.Mesh(new THREE.SphereGeometry(.06+(i%3)*.03,8,6),fartMaterial);puff.visible=false;this.fartPuffs.push(puff);this.pig.add(puff);}
    this.pig.scale.setScalar(3);this.scene.add(this.pig);
    const meadowMat=new THREE.MeshStandardMaterial({color:0x7fa35e,map:this.surfaceTexture('grass'),roughness:.92});
    const roadMat=new THREE.MeshStandardMaterial({color:0xc4a070,map:this.surfaceTexture('sand'),roughness:.95});
    roadMat.bumpMap=roadMat.map;roadMat.bumpScale=.06;meadowMat.bumpMap=meadowMat.map;meadowMat.bumpScale=.1;
    const robleLane=new THREE.MeshStandardMaterial({color:0x2f6ad8,roughness:.48,emissive:0x123a88,emissiveIntensity:.16});
    const brasaLane=new THREE.MeshStandardMaterial({color:0xd23a32,roughness:.48,emissive:0x6a1210,emissiveIntensity:.16});
    const curbMat=new THREE.MeshStandardMaterial({color:0x8a6238,roughness:.86});
    const gridMat=new THREE.MeshBasicMaterial({color:0xe8d7a8,transparent:true,opacity:.22});
    const groundGeo=new THREE.BoxGeometry(16,1,64),roadGeo=new THREE.BoxGeometry(16,.1,7.2);
    const sidePathGeo=new THREE.BoxGeometry(16,.06,6.4);
    const ribbonGeo=new THREE.BoxGeometry(16,.07,2.35);
    const curbGeo=new THREE.BoxGeometry(16,.16,.28);
    const sidePathMat=new THREE.MeshStandardMaterial({color:0x8a9468,map:this.surfaceTexture('grass'),roughness:1});
    const stands={Roble:this.grandstand(0x2a5a9a),Brasa:this.grandstand(0xa43332)};
    for(let i=0;i<8;i++){
      const tile=new THREE.Group();
      const meadow=new THREE.Mesh(groundGeo,meadowMat);meadow.position.y=-.55;meadow.receiveShadow=true;tile.add(meadow);
      const road=new THREE.Mesh(roadGeo,roadMat);road.position.y=-.008;road.receiveShadow=true;tile.add(road);this.roads.push(road);
      for(let j=0;j<8;j++){
        const line=new THREE.Mesh(new THREE.BoxGeometry(.018,.009,8),gridMat);line.position.set(-7+j*2,.039,0);tile.add(line);
      }
      for(const side of [-1,1]){
        const team=side<0?'Roble':'Brasa';
        const path=new THREE.Mesh(sidePathGeo,sidePathMat);path.position.set(0,.005,side*8.2);path.receiveShadow=true;tile.add(path);
        const ribbon=new THREE.Mesh(ribbonGeo,team==='Roble'?robleLane:brasaLane);ribbon.position.set(0,.04,side*6.9);ribbon.receiveShadow=true;tile.add(ribbon);
        const curb=new THREE.Mesh(curbGeo,curbMat);curb.position.set(0,.09,side*4.55);tile.add(curb);
        for(const lane of [8,10]){const guide=new THREE.Mesh(new THREE.BoxGeometry(16,.01,.04),gridMat);guide.position.set(0,.05,side*lane);tile.add(guide);}
        for(let j=0;j<2;j++){
          const house=this.model('House'+team);house.position.set(-5+j*7,0,side*(21.2+(j%2)*1.2));house.rotation.y=side>0?Math.PI:0;house.scale.setScalar(1.6);tile.add(house);
        }
        if(i%2===0){const tower=this.model('Tower'+team);tower.position.set(6,0,side*19);tower.scale.setScalar(1.8);tile.add(tower);}
        const stand=stands[team].clone(true);stand.position.set(-2,0,side*15);stand.rotation.y=side>0?Math.PI:0;tile.add(stand);
        for(let j=0;j<5;j++){const fence=this.model('Fence');fence.position.set(-6+j*3,0,side*4.5);fence.scale.setScalar(1.15);tile.add(fence);}
        const banner=this.model('Banner'+team);banner.position.set(-6,0,side*5.2);banner.rotation.y=Math.PI/2;banner.scale.setScalar(1.65);tile.add(banner);
        for(let j=0;j<3;j++){const tree=this.model('Tree');tree.position.set(-6+j*5,0,side*(27+(j%2)*2));tree.scale.setScalar(2+(j%3)*.3);tree.rotation.y=j*1.1;tile.add(tree);}
      }
      const stones=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0x9a9585,roughness:1}),60);
      const tuft=new THREE.InstancedMesh(new THREE.ConeGeometry(.12,.48,3),new THREE.MeshStandardMaterial({color:0x777c58,roughness:1}),90);
      const placement=new THREE.Object3D();
      for(let j=0;j<90;j++){
        const hash=Math.sin((i*90+j)*43.12)*9876.12,r=hash-Math.floor(hash);
        placement.position.set(-8+((j*3.71)%16),.10,(j%2?1:-1)*(11.7+r*17));placement.rotation.set(.2*r,j*1.73,0);placement.scale.set(.7+r,.7+r*1.2,.7+r);placement.updateMatrix();tuft.setMatrixAt(j,placement.matrix);
        if(j<60){placement.position.set(-8+((j*2.37)%16),.016,(r-.5)*7.4);placement.scale.set(.035+r*.06,.025+r*.02,.04+r*.07);placement.updateMatrix();stones.setMatrixAt(j,placement.matrix);}
      }
      tile.add(stones,tuft);
      this.scene.add(tile);this.tiles.push(tile);
    }
    this.addTerrainMarks();
    // Cosmetic-only meshes, never read by the Game class.
    for(let level=0;level<3;level++){
      const patch=new THREE.Group();
      for(let i=0;i<28;i++){
        const x=(i%7)*.36-1.2+level*2.8,z=(i<14?1:-1)*(5.4+Math.floor(i%14/7)*.25);
        const stem=new THREE.Mesh(new THREE.CylinderGeometry(.018,.025,.23,4),new THREE.MeshStandardMaterial({color:0x688357}));stem.position.set(x,.10,z);patch.add(stem);
        const flower=new THREE.Mesh(new THREE.IcosahedronGeometry(.12,0),new THREE.MeshStandardMaterial({color:[0xeeb6a1,0xf2d280,0xdfb9ce][i%3]}));flower.position.set(x,.25,z);patch.add(flower);
      }
      patch.visible=false;this.scene.add(patch);this.flowers.push(patch);
      for(const side of [-1,1]){const b=this.model(side<0?'BannerRoble':'BannerBrasa');b.position.set(3+level*2,0,side*4.5);b.visible=false;b.rotation.y=Math.PI/2;this.scene.add(b);this.banners.push(b);}
    }
    const fireflyMat=new THREE.MeshBasicMaterial({color:0xffcf69});
    for(let i=0;i<30;i++){const dot=new THREE.Mesh(new THREE.SphereGeometry(.035,5,4),fireflyMat);this.lanterns.add(dot);this.lightSeed[i*3]=Math.sin(i*42)*6;this.lightSeed[i*3+1]=.6+(i%5)*.2;this.lightSeed[i*3+2]=Math.cos(i*42)*6;}
    this.lanterns.visible=false;this.scene.add(this.lanterns);
    this.ready=true;this.render(new Game(),emptyItems(),0,0);
  }
  private addTerrainMarks(){
    const plane=new THREE.BoxGeometry(118,.008,1);
    this.rangeBand=new THREE.Mesh(plane,new THREE.MeshBasicMaterial({color:0xaec2bb,transparent:true,opacity:.16,depthWrite:false}));this.rangeBand.position.set(30,.04,0);this.scene.add(this.rangeBand);
    for(let i=0;i<2;i++){const edge=new THREE.Mesh(new THREE.BoxGeometry(118,.012,.045),new THREE.MeshStandardMaterial({color:0x97aaa5,roughness:1}));edge.position.set(30,.05,0);this.scene.add(edge);this.rangeEdges.push(edge);}
    for(const [key,text,color] of [['entry','OFRECER',0xcac4ac],['target','BOTÍN',0x81ac79],['stop','HERIDA',0xb76b52]] as const){
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(118,.018,.075),new THREE.MeshStandardMaterial({color,roughness:.9,emissive:color,emissiveIntensity:.1}));mesh.position.set(30,.06,0);this.scene.add(mesh);
      const canvas=document.createElement('canvas');canvas.width=384;canvas.height=96;const ctx=canvas.getContext('2d')!;
      ctx.fillStyle='#242b25';ctx.fillRect(0,0,384,96);ctx.fillStyle='#'+color.toString(16).padStart(6,'0');ctx.fillRect(0,0,8,96);ctx.font='500 29px sans-serif';ctx.textAlign='center';ctx.fillStyle='#eee9d9';ctx.fillText(text,197,58);
      const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;const label=new THREE.Sprite(new THREE.SpriteMaterial({map,depthTest:false}));label.scale.set(2.9,.725,1);label.renderOrder=3;this.scene.add(label);this.groundLevels.push({key,mesh,label});
    }
    this.hoofMarks=new THREE.InstancedMesh(new THREE.BoxGeometry(.14,.006,.085),new THREE.MeshBasicMaterial({color:0x433c30,transparent:true,opacity:.52}),384);this.hoofMarks.frustumCulled=false;this.scene.add(this.hoofMarks);
  }
  private async loadLibrary(){
    try{
      const gltf=await new GLTFLoader().loadAsync('/models/valley.glb');
      for(const object of gltf.scene.children){
        object.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;if(o.material instanceof THREE.MeshStandardMaterial){o.material.roughness=.96;if(!o.material.userData.natural){o.material.color.multiplyScalar(.9);o.material.userData.natural=true;}o.material.side=THREE.DoubleSide;}const colors=o.geometry.getAttribute('color');if(colors&&!o.geometry.userData.muted){for(let j=0;j<colors.count;j++){const r=colors.getX(j),g=colors.getY(j),b=colors.getZ(j),l=r*.3+g*.5+b*.2;colors.setXYZ(j,r*.48+l*.52,g*.48+l*.49,b*.48+l*.43);}colors.needsUpdate=true;o.geometry.userData.muted=true;}}});
        this.models.set(object.name,object);
      }
      const required=['PigBody','PigLegFL','PigLegFR','PigLegBL','PigLegBR','ChiefRoble','ChiefBrasa','HouseRoble','HouseBrasa','Tree','Fence'];
      for(const name of required)if(!this.models.has(name))throw new Error(`Falta el modelo ${name}`);
    }catch{
      // Zip/foundation has no Blender GLB; procedural stand-ins keep the valle playable.
      this.seedPlaceholderModels();
    }
  }
  private seedPlaceholderModels(){
    const mat=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.92});
    const add=(parent:THREE.Object3D,geo:THREE.BufferGeometry,color:number,x:number,y:number,z:number,sx=1,sy=1,sz=1)=>{
      const mesh=new THREE.Mesh(geo,mat(color));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
    };
    const named=(name:string,build:(g:THREE.Group)=>void)=>{const g=new THREE.Group();g.name=name;build(g);this.models.set(name,g);};
    for(const team of [{name:'Roble',wood:0x3d5a68,cloth:0x4a6a78,roof:0x2f4550},{name:'Brasa',wood:0x6a4338,cloth:0x7a5348,roof:0x4a2e28}] as const){
      named('House'+team.name,g=>{add(g,new THREE.BoxGeometry(1.2,.9,1.1),team.wood,0,.45,0);const roof=add(g,new THREE.ConeGeometry(.95,.7,4),team.roof,0,1.15,0);roof.rotation.y=Math.PI/4;});
      named('Tower'+team.name,g=>{add(g,new THREE.CylinderGeometry(.35,.42,2.2,8),team.wood,0,1.1,0);add(g,new THREE.ConeGeometry(.5,.7,8),team.roof,0,2.55,0);});
      named('Banner'+team.name,g=>{add(g,new THREE.CylinderGeometry(.04,.04,2.2,6),0x5a4634,0,1.1,0);add(g,new THREE.PlaneGeometry(.9,1.1),team.cloth,.48,1.4,0);});
      named('Chief'+team.name,g=>{add(g,new THREE.CapsuleGeometry(.22,.5,4,8),team.cloth,0,1.1,0);add(g,new THREE.SphereGeometry(.2,8,6),0xd2a479,0,1.7,0);});
    }
    named('Tree',g=>{add(g,new THREE.CylinderGeometry(.12,.18,1.1,6),0x5a4634,0,.55,0);add(g,new THREE.IcosahedronGeometry(.7,0),0x4d6a3e,0,1.4,0);});
    named('Fence',g=>{for(const x of [-.6,0,.6])add(g,new THREE.BoxGeometry(.08,.7,.08),0x8a6d4a,x,.35,0);add(g,new THREE.BoxGeometry(1.4,.08,.06),0x9a7a54,0,.45,0);});
    for(const name of ['PigBody','PigLegFL','PigLegFR','PigLegBL','PigLegBR'])named(name,g=>{add(g,new THREE.SphereGeometry(.2,8,6),0xc5aba1,0,.2,0);});
  }
  private model(name:string){const template=this.models.get(name);if(!template)throw new Error('Modelo no disponible: '+name);return template.clone(true);}
  private surfaceTexture(kind:'grass'|'sand'){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle=kind==='grass'?'#899079':'#b3a38c';ctx.fillRect(0,0,256,256);
    let seed=42;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<6500;i++){const shade=100+Math.floor(random()*120);ctx.fillStyle=`rgba(${shade},${shade},${shade},.22)`;ctx.fillRect(random()*256,random()*256,kind==='grass'?1:2,kind==='grass'?5:2);}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(4,4);texture.anisotropy=4;return texture;
  }
  private grandstand(color:number){
    const group=new THREE.Group();
    const wood=new THREE.MeshStandardMaterial({color:0x62412b,roughness:.9});
    const cloth=new THREE.MeshStandardMaterial({color,roughness:.9});
    for(let row=0;row<3;row++){
      const step=new THREE.Mesh(new THREE.BoxGeometry(8,.3,1.1),wood);step.position.set(0,.5+row*.52,-row*.8);step.castShadow=true;step.receiveShadow=true;group.add(step);
    }
    const fascia=new THREE.Mesh(new THREE.BoxGeometry(8,.9,.15),cloth);fascia.position.set(0,.6,.6);fascia.castShadow=true;group.add(fascia);
    const gold=new THREE.MeshStandardMaterial({color:0xd9ac50,metalness:.35,roughness:.5});
    for(const x of [-3.8,0,3.8]){const shield=new THREE.Mesh(new THREE.CylinderGeometry(.27,.12,.55,5),gold);shield.position.set(x,.75,.72);shield.rotation.x=Math.PI/2;group.add(shield);}
    const bodies=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.17,.28,3,6),cloth,30);
    const heads=new THREE.InstancedMesh(new THREE.SphereGeometry(.145,8,6),new THREE.MeshStandardMaterial({color:0xd2a479,roughness:.85}),30);
    const dummy=new THREE.Object3D();
    for(let i=0;i<30;i++){
      const row=Math.floor(i/10),x=(i%10)*.74-3.35;dummy.position.set(x,1.03+row*.52,-row*.8);dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);
      bodies.setColorAt(i,new THREE.Color([color,0xd8c392,0x725241,0x344149][i%4]));
      dummy.position.y+=.43;dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);
    }
    bodies.castShadow=true;heads.castShadow=true;group.add(bodies,heads);return group;
  }
  private resize(){
    const width=this.container.clientWidth,height=this.container.clientHeight;if(!width||!height)return;
    this.renderer.setSize(width,height,false);const aspect=width/height;
    const viewHeight=this.wide?26:(width<600?18:19);
    this.camera.left=-viewHeight*aspect/2;this.camera.right=viewHeight*aspect/2;this.camera.top=viewHeight/2;this.camera.bottom=-viewHeight/2;this.camera.updateProjectionMatrix();
    this.raceCamera.aspect=aspect;this.raceCamera.fov=aspect<1?Math.min(92,2*Math.atan(Math.tan(THREE.MathUtils.degToRad(30))/aspect)*180/Math.PI):58;
    this.raceCamera.updateProjectionMatrix();
  }
  toggleCamera(){this.wide=!this.wide;this.resize();return this.wide;}
  offerImpact(){this.track.offerImpact();}
  applyWallet(wallet:Wallet){this.flowers.forEach((p,i)=>p.visible=i<wallet.items.flowers);this.banners.forEach((p,i)=>p.visible=Math.floor(i/2)<wallet.items.banners);this.lanterns.visible=wallet.items.lanterns>0;}
  render(game:Game,wallet:Wallet,dt:number,now:number,run?:VillageRun,indicator?:IndicatorSnapshot,priceFrame?:PriceFrame){
    if(!this.ready||this.lost)return;this.clock+=dt;
    if(this.pigGeneration!==game.generation){this.pigGeneration=game.generation;this.nextFart=this.clock+12;this.fartPulse=0;}
    const frame=priceFrame??{low:19997,high:20003,width:7.3};
    const terminal=indicator?.stage==='tp'||indicator?.stage==='sl';
    const value=game.price||20000;
    const z=priceToGround(value,frame);
    const racing=game.active;
    this.track.sync(indicator?.stage??'flat',indicator?.direction??0,indicator?.progress??0,racing?z:0,frame,dt,game.distance,racing);
    this.impactEvent=this.track.lastImpact;
    const active=game.phase==='running'&&game.fresh(now)&&!terminal;
    this.lastOffset=z;
    const pigZ=racing?z+this.track.lurchZ:0;
    this.pig.position.set(0,this.track.hopY,pigZ);
    this.pig.rotation.x=0;this.pig.rotation.z=this.track.offerT*.25*(run?.side??0);
    this.pig.scale.setScalar(racing?1.55:2.25);
    this.actor.pose(this.clock,active||this.track.action==='crash',this.reduced,indicator?.stage??'flat',this.track.action,this.track.offerT);
    if(indicator){
      const low=priceToGround(indicator.rangeLow||value,frame),high=priceToGround(indicator.rangeHigh||value,frame);
      this.rangeBand.visible=game.active&&indicator.rangeHigh>indicator.rangeLow;
      this.rangeBand.position.z=(low+high)/2;this.rangeBand.scale.z=Math.max(.01,Math.abs(high-low));
      this.rangeEdges.forEach((edge,i)=>{edge.visible=this.rangeBand.visible;edge.position.z=i?low:high;});
      this.groundLevels.forEach(({mesh,label,key})=>{const visible=game.active&&indicator[key]>0;mesh.visible=label.visible=visible;mesh.position.z=priceToGround(indicator[key]||value,frame);label.position.set(key==='entry'?4:key==='target'?12:22,1.1,mesh.position.z);});
    }
    this.fartPulse=Math.max(0,this.fartPulse-dt);
    if(active&&!this.reduced){if(this.clock>=this.nextFart){this.fartPulse=.95;this.nextFart=this.clock+17+Math.sin(this.clock)*3;this.fartEvent++;}}
    this.fartPuffs.forEach((puff,i)=>{const live=this.fartPulse>0; puff.visible=live;const t=1-this.fartPulse/.95;puff.position.set(-1.1-t*.6-i*.07,.65+t*.25,Math.sin(i*2.1)*t*.2);puff.scale.setScalar(.6+t*1.8);});
    this.tiles.forEach((tile,i)=>tile.position.x=tilePosition(i,8,16,game.distance));
    const n=game.history.length;
    game.history.forEach((p,i)=>{this.positions[i*3]=p.distance-game.distance;this.positions[i*3+1]=.065;this.positions[i*3+2]=priceToGround(game.entry-p.offset/.8,frame);});
    this.trailGeometry.attributes.position.needsUpdate=true;this.trailGeometry.setDrawRange(0,n);
    const stamp=new THREE.Object3D();
    for(let i=0;i<n;i++){const p=game.history[i],pz=priceToGround(game.entry-p.offset/.8,frame);for(let foot=0;foot<2;foot++){stamp.position.set(p.distance-game.distance,.045,pz+(foot?-.20:.20));stamp.rotation.y=Math.sin(i)*.2;stamp.updateMatrix();this.hoofMarks.setMatrixAt(i*2+foot,stamp.matrix);}}
    this.hoofMarks.count=n*2;this.hoofMarks.instanceMatrix.needsUpdate=true;this.hoofMarks.visible=game.active;
    this.trail.visible=game.active;
    this.dust.visible=active&&!this.reduced;
    const d=this.dust.geometry.attributes.position;
    for(let i=0;i<22;i++){const p=((this.clock*1.1+i/22)%1);d.setXYZ(i,-.7-p*1.8,.15+p*.8,this.lastOffset+Math.sin(i*7)*p*.6);}d.needsUpdate=true;
    this.lanterns.children.forEach((dot,i)=>dot.position.set(this.lightSeed[i*3]+Math.sin(this.clock+i)*.15,this.lightSeed[i*3+1]+Math.sin(this.clock*1.2+i)*.2,this.lightSeed[i*3+2]));
    if(run)this.runner.render(run,game.active,this.reduced);
    const cheering=!!run&&game.active&&run.elapsed<run.cheerUntil&&!this.reduced;
    this.cheer.visible=cheering;
    if(cheering&&run){const phase=(2.5-(run.cheerUntil-run.elapsed))/2.5;this.cheer.children.forEach((spark,i)=>spark.position.set(1+Math.sin(i*2.4)*phase*3,1+phase*4,run.cheerSide*(4.6-phase*2)+Math.cos(i)*phase));this.pig.rotation.x+=run.cheerSide*Math.sin(phase*Math.PI)*.025;}
    this.applyWallet(wallet);
    if(racing){
      const follow=1-Math.exp(-(this.wide?4:8)*dt);
      this.chaseZ+=(pigZ-this.chaseZ)*follow;this.lookZ+=(pigZ-this.lookZ)*Math.min(1,follow*1.15);
      const shake=this.reduced?0:this.track.shake;
      const sx=(Math.sin(this.clock*70)*shake*.35);
      this.raceCamera.position.set(this.wide?-20:-10.2,this.wide?15:5.6+shake*.4,this.chaseZ+sx);
      this.raceCamera.lookAt(7.5,1.15,this.lookZ);
      this.renderer.render(this.scene,this.raceCamera);
    }else this.renderer.render(this.scene,this.camera);
  }
  stats(){return{drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,tiles:this.tiles.length};}
  dispose(){this.resizeObserver.disconnect();this.renderer.dispose();}
}
function emptyItems():Wallet{return{version:1,coins:0,items:{flowers:0,banners:0,lanterns:0},visits:[],collected:[]};}
