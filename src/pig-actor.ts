import * as THREE from 'three';

/** Articulated presentation actor. It cannot change quotes, levels or outcomes. */
export type PigAction='idle'|'trot'|'gallop'|'smash'|'skid'|'charge'|'crash'|'lunge'|'walk';

export class PigActor{
  group=new THREE.Group();
  private body=new THREE.Group();
  private head=new THREE.Group();
  private helmet=new THREE.Group();
  private stars=new THREE.Group();
  private legs:{hip:THREE.Vector3;upper:THREE.Mesh;lower:THREE.Mesh;hoof:THREE.Mesh;phase:number}[]=[];
  private ears:THREE.Group[]=[];
  private tail:THREE.Mesh;
  private _a=new THREE.Vector3();
  private _b=new THREE.Vector3();
  private _k=new THREE.Vector3();
  private _n=new THREE.Vector3();
  constructor(){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#c9a090';ctx.fillRect(0,0,128,128);
    for(let i=0;i<2200;i++){const v=Math.sin(i*78.233)*43758.5453,f=v-Math.floor(v);ctx.fillStyle=`rgba(72,42,34,${f*.18})`;ctx.fillRect((i*47)%128,(i*83)%128,1,2);}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const skin=new THREE.MeshStandardMaterial({color:0xd4a89a,map:texture,bumpMap:texture,bumpScale:.02,roughness:.82});
    const blush=new THREE.MeshStandardMaterial({color:0xc47872,roughness:.78});
    const nose=new THREE.MeshStandardMaterial({color:0xb06b62,roughness:.7});
    const dark=new THREE.MeshStandardMaterial({color:0x241b16,roughness:.7});
    const white=new THREE.MeshStandardMaterial({color:0xf4eee4,roughness:.35});
    const eye=new THREE.MeshStandardMaterial({color:0x171310,roughness:.18});
    const steel=new THREE.MeshStandardMaterial({color:0x6d7d88,metalness:.72,roughness:.28,emissive:0x9ec4d8,emissiveIntensity:.08});
    const brass=new THREE.MeshStandardMaterial({color:0xd7a84a,metalness:.65,roughness:.32,emissive:0x7a4e10,emissiveIntensity:.12});
    const leather=new THREE.MeshStandardMaterial({color:0x3a2418,roughness:.86});
    const sphere=new THREE.SphereGeometry(1,28,18);
    const oval=(parent:THREE.Object3D,mat:THREE.Material,p:number[],s:number[])=>{const m=new THREE.Mesh(sphere,mat);m.position.set(p[0],p[1],p[2]);m.scale.set(s[0],s[1],s[2]);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
    this.group.add(this.body);
    oval(this.body,skin,[0,.88,0],[1.02,.58,.52]);
    oval(this.body,skin,[-.58,.8,0],[.52,.5,.5]);
    const collar=new THREE.Mesh(new THREE.TorusGeometry(.46,.055,8,18),leather);collar.position.set(.22,.95,0);collar.rotation.z=Math.PI/2.4;this.body.add(collar);
    const bell=new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),brass);bell.position.set(.42,.72,0);this.body.add(bell);
    this.head.position.set(.72,.92,0);this.body.add(this.head);
    oval(this.head,skin,[.28,.02,0],[.54,.4,.36]);
    oval(this.head,blush,[.22,-.02,.22],[.12,.1,.06]);
    oval(this.head,blush,[.22,-.02,-.22],[.12,.1,.06]);
    oval(this.head,skin,[.62,-.12,0],[.42,.26,.28]);
    oval(this.head,nose,[.96,-.1,0],[.09,.2,.26]);
    for(const side of [-1,1]){
      oval(this.head,dark,[1.02,-.08,side*.11],[.028,.05,.04]);
      oval(this.head,white,[.42,.14,side*.29],[.08,.09,.05]);
      oval(this.head,eye,[.48,.14,side*.32],[.04,.05,.028]);
      const ear=new THREE.Group();ear.position.set(.08,.3,side*.24);ear.rotation.x=side*.65;ear.rotation.z=-.4;
      const shell=oval(ear,skin,[0,.15,0],[.17,.28,.05]);shell.rotation.z=-.28;
      oval(ear,blush,[0,.15,side*.03],[.12,.2,.022]);this.head.add(ear);this.ears.push(ear);
    }
    this.helmet.position.set(.18,.28,0);this.head.add(this.helmet);
    const dome=new THREE.Mesh(new THREE.SphereGeometry(.38,16,12,0,Math.PI*2,0,Math.PI/1.7),steel);dome.position.set(0,.02,0);dome.castShadow=true;this.helmet.add(dome);
    const brim=new THREE.Mesh(new THREE.TorusGeometry(.4,.04,8,20),steel);brim.rotation.x=Math.PI/2;brim.position.y=-.02;this.helmet.add(brim);
    const crest=new THREE.Mesh(new THREE.BoxGeometry(.08,.22,.55),brass);crest.position.set(-.02,.22,0);this.helmet.add(crest);
    for(const side of [-1,1]){const rivet=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),brass);rivet.position.set(.12,.02,side*.34);this.helmet.add(rivet);}
    for(const x of [-.6,.62])for(const z of [-.32,.32]){
      const upper=new THREE.Mesh(new THREE.CylinderGeometry(.15,.11,1,12),skin);
      const lower=new THREE.Mesh(new THREE.CylinderGeometry(.1,.07,1,12),skin);
      const hoof=new THREE.Mesh(new THREE.BoxGeometry(.2,.12,.16),dark);
      for(const m of [upper,lower,hoof]){m.castShadow=true;this.group.add(m);}
      this.legs.push({hip:new THREE.Vector3(x,.74,z),upper,lower,hoof,phase:x>0?0:Math.PI});
      const seam=new THREE.Mesh(new THREE.BoxGeometry(.205,.125,.014),new THREE.MeshStandardMaterial({color:0x100e0b}));hoof.add(seam);
    }
    const curve=new THREE.CatmullRomCurve3(Array.from({length:32},(_,i)=>{const t=i/31;return new THREE.Vector3(-.95-t*.28,1.05+Math.sin(t*Math.PI*3)*.08,Math.sin(t*Math.PI*4)*.07);}));
    this.tail=new THREE.Mesh(new THREE.TubeGeometry(curve,32,.024,6,false),skin);this.body.add(this.tail);
    const starMat=new THREE.MeshBasicMaterial({color:0xffe58a});
    for(let i=0;i<5;i++){const star=new THREE.Mesh(new THREE.OctahedronGeometry(.09),starMat);this.stars.add(star);}
    this.stars.visible=false;this.group.add(this.stars);
    this.pose(0,false,false,'range','idle');
  }
  private bone(mesh:THREE.Mesh,a:THREE.Vector3,b:THREE.Vector3){
    const d=this._n.copy(b).sub(a);const len=d.length()||.001;mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=len;mesh.quaternion.setFromUnitVectors(this._k.set(0,1,0),d.normalize());
  }
  pose(time:number,running:boolean,reduced:boolean,stage:string,action:PigAction='idle',lunge=0){
    const crash=action==='crash',smash=action==='smash',skid=action==='skid',charge=action==='charge',lungeOn=action==='lunge'||lunge>0;
    const walk=action==='walk'||stage==='flat';
    const gallop=action==='gallop'||stage==='long'||stage==='short';
    const trot=action==='trot'||stage==='range';
    const animate=running&&!reduced&&!crash&&!walk;
    const cadence=gallop||charge||smash?12:skid?6:trot?7.2:9;
    const t=time*cadence;
    const bounce=crash?0:animate?(gallop||charge?.07:.032)*Math.abs(Math.cos(t)):walk?Math.sin(time*2.2)*.012:Math.sin(time*1.5)*.008;
    this.body.position.y=.0+bounce+(smash?.04:0)+(charge?.05:0);
    this.body.rotation.z=crash?time*4.2:smash?Math.sin(t)*.12:skid?-0.18:lungeOn?.2*lunge:animate?Math.sin(t)*.04:0;
    this.body.rotation.x=crash?.6:charge?-0.22:skid?.18:smash?-0.12:lungeOn?-0.15:gallop?-0.08:0;
    this.head.rotation.z=stage==='tp'?-.14:crash?.5:skid?.2:animate?Math.sin(t)*.05:0;
    this.head.rotation.x=charge?-0.25:smash?-0.18:crash?.4:0;
    this.helmet.rotation.z=animate?Math.sin(t)*.04:crash?Math.sin(time*9)*.2:0;
    this.ears.forEach((ear,i)=>ear.rotation.z=-.4+(crash?Math.sin(time*10+i)*.4:animate?Math.sin(t+i)*.12:0));
    this.tail.rotation.x=crash?Math.sin(time*8)*.4:animate?Math.sin(t*.7)*.16:0;
    const strideAmt=crash?0:smash?.42:charge?.48:gallop?.36:skid?.08:trot?.2:.22;
    const liftAmt=crash?0:smash||charge||gallop?.22:trot?.12:.14;
    this.legs.forEach((leg,i)=>{
      const pair=i<2?0:Math.PI;
      const phase=t+leg.phase+pair*(gallop||charge?0.15:0);
      const stride=animate?Math.cos(phase)*strideAmt:(walk?Math.cos(time*3+leg.phase)*.08:0);
      const lift=animate?Math.max(0,Math.sin(phase))*liftAmt:0;
      const foot=this._b.set(leg.hip.x+stride,crash?.35+.1*Math.sin(time*8+i):.075+lift,leg.hip.z+(smash?Math.sin(t)*.04:0));
      const a=this._a.copy(leg.hip);
      if(crash)a.y=.5;
      const delta=this._n.copy(foot).sub(a);const length=delta.length();
      const bend=Math.sqrt(Math.max(0,.4*.4-length*length/4));
      const knee=this._k.copy(a).add(foot).multiplyScalar(.5).add(this._n.set(-delta.y,delta.x,0).normalize().multiplyScalar(skid?bend*.3:-bend));
      this.bone(leg.upper,a,knee);this.bone(leg.lower,knee,foot);leg.hoof.position.copy(foot);leg.hoof.rotation.z=crash?Math.sin(time*8+i):animate?Math.max(0,Math.sin(phase))*.28:0;
    });
    this.stars.visible=crash&&!reduced;
    if(this.stars.visible)this.stars.children.forEach((s,i)=>{const a=time*4+i*1.26;s.position.set(Math.cos(a)*0.7,.95+Math.sin(a*1.7)*.15,Math.sin(a)*0.7);});
  }
}
