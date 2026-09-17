import * as THREE from 'three';
import type {IndicatorStage} from './horus';
import type {PigAction} from './pig-actor';
import {priceToGround,type PriceFrame} from './price-terrain';

/** Presentation-only mapping: Will stage → visible beat. Does not mutate Game or Horus. */
export type TrackBeat='mist'|'smash-hi'|'smash-lo'|'skid'|'gate'|'charge'|'loot'|'ko'|'bell'|'idle';

export function chartBeat(stage:IndicatorStage,direction:-1|0|1):{beat:TrackBeat;side:-1|0|1}{
  if(stage==='range')return{beat:'mist',side:0};
  if(stage==='sweep')return{beat:direction===-1?'smash-hi':'smash-lo',side:direction===-1?-1:1};
  if(stage==='structure')return{beat:'skid',side:direction===-1?-1:direction===1?1:0};
  if(stage==='retest')return{beat:'gate',side:direction===-1?-1:direction===1?1:0};
  if(stage==='long')return{beat:'charge',side:-1};
  if(stage==='short')return{beat:'charge',side:1};
  if(stage==='tp')return{beat:'loot',side:0};
  if(stage==='sl')return{beat:'ko',side:0};
  if(stage==='flat')return{beat:'bell',side:0};
  return{beat:'idle',side:0};
}

export function playerToast(stage:IndicatorStage,direction:-1|0|1):string{
  switch(stage){
    case 'range':return 'Niebla de la mañana · el corredor se estrecha';
    case 'sweep':return direction===-1?'¡Barrida en las cumbres de Roble!':'¡Barrida en las puertas de Brasa!';
    case 'structure':return 'El cerdo se clava · el cuerno brilla';
    case 'retest':return '¡Rompe la puerta del valle!';
    case 'long':return '¡Embestida hacia Villa Roble!';
    case 'short':return '¡Embestida hacia Villa Brasa!';
    case 'tp':return '¡Botín del día! El cofre estalla';
    case 'sl':return 'Herida mortal · el cerdo cae';
    case 'flat':return 'Campana del castillo · el valle se aquieta';
    default:return 'El valle espera';
  }
}

interface Shard{mesh:THREE.Mesh;v:THREE.Vector3;life:number}
interface Barrel{mesh:THREE.Mesh;baseX:number;baseZ:number;hit:number}

/**
 * Chart → collision props. Pig stays on price Z; props sit on Will levels
 * and break when the hero reaches them. Never writes quotes or laws.
 */
export class StageTrack{
  group=new THREE.Group();
  action:PigAction='trot';
  shake=0;lurchZ=0;hopY=0;offerT=0;
  lastImpact=0;
  private stage:IndicatorStage='flat';
  private beat:TrackBeat='idle';
  private impactT=0;
  private lastZ=0;
  private mist:THREE.Mesh[]=[];
  private archHi:THREE.Group;private archLo:THREE.Group;
  private clothHi:THREE.Mesh;private clothLo:THREE.Mesh;
  private gate:THREE.Group;private bar:THREE.Mesh;private horn:THREE.Mesh;
  private chest:THREE.Group;private thorns:THREE.Group;private bell:THREE.Group;
  private coins:THREE.Mesh[]=[];private stars:THREE.Mesh[]=[];
  private shards:Shard[]=[];
  private barrels:Barrel[]=[];
  private dust:THREE.Points;
  private glow=new THREE.PointLight(0xffd27a,0,12,2);
  constructor(){
    const wood=new THREE.MeshStandardMaterial({color:0x6a4a2c,roughness:.9});
    const brass=new THREE.MeshStandardMaterial({color:0xd7a84a,metalness:.55,roughness:.4,emissive:0x7a4e10,emissiveIntensity:.15});
    this.archHi=this.arch(0x1e4ea0,0x7aa4e8,wood,brass);this.clothHi=this.archHi.userData.cloth;
    this.archLo=this.arch(0xa32d28,0xe07a6a,wood,brass);this.clothLo=this.archLo.userData.cloth;
    this.group.add(this.archHi,this.archLo);
    for(const side of [-1,1]){
      const mist=new THREE.Mesh(new THREE.BoxGeometry(28,4.2,1.1),new THREE.MeshStandardMaterial({color:0xdde7ea,transparent:true,opacity:.28,depthWrite:false}));
      mist.position.set(6,2.1,side*3.4);this.mist.push(mist);this.group.add(mist);
    }
    this.gate=new THREE.Group();
    const postGeo=new THREE.BoxGeometry(.28,3.2,.28);
    for(const z of [-1.3,1.3]){const p=new THREE.Mesh(postGeo,wood);p.position.set(0,1.6,z);p.castShadow=true;this.gate.add(p);}
    this.bar=new THREE.Mesh(new THREE.BoxGeometry(.22,0.35,2.8),wood);this.bar.position.set(0,1.55,0);this.gate.add(this.bar);
    this.horn=new THREE.Mesh(new THREE.ConeGeometry(.18,1.1,8),brass);this.horn.position.set(0,3.4,0);this.horn.rotation.z=.2;this.gate.add(this.horn);
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),new THREE.MeshStandardMaterial({color:0xffe08a,emissive:0xffc44a,emissiveIntensity:.6}));lamp.position.set(0,2.9,0);this.gate.add(lamp);
    this.gate.add(this.glow);this.group.add(this.gate);
    this.chest=new THREE.Group();
    const box=new THREE.Mesh(new THREE.BoxGeometry(1.1,.7,.8),new THREE.MeshStandardMaterial({color:0x8a5a22,roughness:.7}));box.position.y=.45;box.castShadow=true;this.chest.add(box);
    const lid=new THREE.Mesh(new THREE.BoxGeometry(1.14,.16,.84),brass);lid.position.y=.86;this.chest.add(lid);
    this.group.add(this.chest);
    this.thorns=new THREE.Group();
    const thornMat=new THREE.MeshStandardMaterial({color:0x4a5a32,roughness:.85});
    const shield=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.3,.18,8),new THREE.MeshStandardMaterial({color:0x7a3b32,metalness:.2,roughness:.6}));shield.rotation.x=Math.PI/2;shield.position.set(0,1.1,0);this.thorns.add(shield);
    for(let i=0;i<14;i++){const spike=new THREE.Mesh(new THREE.ConeGeometry(.12,.9,5),thornMat);spike.position.set((i%7)*.32-1,.5+Math.floor(i/7)*.5,0);spike.rotation.x=-.4;this.thorns.add(spike);}
    this.group.add(this.thorns);
    this.bell=new THREE.Group();
    const yoke=new THREE.Mesh(new THREE.BoxGeometry(1.4,.12,.12),wood);yoke.position.y=3.1;this.bell.add(yoke);
    const bronze=new THREE.Mesh(new THREE.SphereGeometry(.45,12,10,0,Math.PI*2,0,Math.PI/1.4),brass);bronze.position.y=2.5;this.bell.add(bronze);
    this.group.add(this.bell);
    const coinMat=new THREE.MeshStandardMaterial({color:0xe6c25a,metalness:.7,roughness:.3,emissive:0x8a5a10,emissiveIntensity:.2});
    for(let i=0;i<18;i++){const c=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.04,10),coinMat);c.visible=false;this.coins.push(c);this.group.add(c);}
    const starMat=new THREE.MeshBasicMaterial({color:0xfff1a8});
    for(let i=0;i<8;i++){const s=new THREE.Mesh(new THREE.OctahedronGeometry(.12),starMat);s.visible=false;this.stars.push(s);this.group.add(s);}
    const shardMat=new THREE.MeshStandardMaterial({color:0xc9a56a,roughness:.7});
    for(let i=0;i<16;i++){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.18,.04,.4),shardMat);mesh.visible=false;this.shards.push({mesh,v:new THREE.Vector3(),life:0});this.group.add(mesh);}
    const barrelMat=new THREE.MeshStandardMaterial({color:0x7a5230,roughness:.88});
    for(let i=0;i<8;i++){
      const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.28,.32,.55,10),barrelMat);mesh.castShadow=true;
      const baseX=4+(i%4)*5,baseZ=(i<4?-1:1)*(1.6+(i%3)*.4);
      mesh.position.set(baseX,.28,baseZ);this.barrels.push({mesh,baseX,baseZ,hit:0});this.group.add(mesh);
    }
    const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(40*3),3));
    this.dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xcbb58a,size:.18,transparent:true,opacity:.45,depthWrite:false}));this.group.add(this.dust);
    this.hideAll();
  }
  private arch(cloth:number,trim:number,wood:THREE.Material,brass:THREE.Material){
    const g=new THREE.Group();
    for(const z of [-1.6,1.6]){const p=new THREE.Mesh(new THREE.BoxGeometry(.3,3.4,.3),wood);p.position.set(0,1.7,z);p.castShadow=true;g.add(p);}
    const beam=new THREE.Mesh(new THREE.BoxGeometry(.28,.28,3.5),wood);beam.position.set(0,3.3,0);g.add(beam);
    const flag=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.5),new THREE.MeshStandardMaterial({color:cloth,side:THREE.DoubleSide,roughness:.7,emissive:trim,emissiveIntensity:.08}));
    flag.position.set(.2,2.2,0);g.add(flag);g.userData.cloth=flag;
    const finial=new THREE.Mesh(new THREE.SphereGeometry(.14,10,8),brass);finial.position.set(0,3.55,0);g.add(finial);
    return g;
  }
  private hideAll(){
    this.archHi.visible=this.archLo.visible=this.gate.visible=this.chest.visible=this.thorns.visible=this.bell.visible=false;
    this.mist.forEach(m=>m.visible=false);
  }
  offerImpact(){this.offerT=1;this.shake=Math.max(this.shake,.4);this.burst(0,1.1,this.lastZ,.9);}
  private burst(x:number,y:number,z:number,power:number){
    this.shards.forEach((s,i)=>{s.life=.7+power*.4;s.mesh.visible=true;s.mesh.position.set(x,y,z);s.v.set((Math.sin(i*2.1)-.2)*6*power,2+Math.cos(i)*3*power,(Math.cos(i*1.7))*5*power);});
  }
  sync(stage:IndicatorStage,direction:-1|0|1,progress:number,pigZ:number,frame:PriceFrame,dt:number,distance:number,active:boolean){
    const mapped=chartBeat(stage,direction);
    const changed=stage!==this.stage;
    this.stage=stage;this.beat=mapped.beat;
    const highZ=priceToGround(frame.high,frame),lowZ=priceToGround(frame.low,frame);
    const wick=pigZ-this.lastZ;this.lastZ=pigZ;
    if(Math.abs(wick)>0.18&&active){this.lurchZ+=wick*1.8;this.shake=Math.max(this.shake,.22);this.hopY=.12;}
    this.lurchZ+=(0-this.lurchZ)*Math.min(1,dt*8);this.hopY=Math.max(0,this.hopY-dt*.6);
    this.shake=Math.max(0,this.shake-dt*1.8);this.offerT=Math.max(0,this.offerT-dt*2.4);
    this.impactT=Math.max(0,this.impactT-dt);
    if(changed&&active){
      this.impactT=1.15;this.lastImpact++;
      if(mapped.beat==='smash-hi'||mapped.beat==='smash-lo'){this.shake=.72;this.burst(1.2,1.6,mapped.beat==='smash-hi'?highZ:lowZ,1.2);}
      if(mapped.beat==='gate'){this.shake=.8;this.burst(2.2,1.7,pigZ,1.3);}
      if(mapped.beat==='ko'){this.shake=.95;this.burst(0.4,1.2,pigZ,1.4);}
      if(mapped.beat==='loot'){this.shake=.55;this.coins.forEach((c,i)=>{c.visible=true;c.position.set(.6,1.2,pigZ);c.userData.v=new THREE.Vector3(Math.sin(i)*3,3+i%3,Math.cos(i)*3);});}
      if(mapped.beat==='skid')this.shake=.35;
      if(mapped.beat==='bell')this.shake=.25;
    }
    const show=active;
    this.mist.forEach((m,i)=>{m.visible=show&&(stage==='range'||stage==='sweep');m.position.z=i?lowZ:highZ;m.scale.z=stage==='range'?1.15:.6;(m.material as THREE.MeshStandardMaterial).opacity=stage==='range'?.32:.12;});
    this.place(this.archHi,show&&(stage==='range'||stage==='sweep'||(stage==='structure'&&direction===-1)),8,highZ,mapped.beat==='smash-hi'?this.impactT:0,true);
    this.place(this.archLo,show&&(stage==='range'||stage==='sweep'||(stage==='structure'&&direction===1)),8,lowZ,mapped.beat==='smash-lo'?this.impactT:0,true);
    this.clothHi.rotation.y=mapped.beat==='smash-hi'?this.impactT*2.4:Math.sin(distance*.4)*.12;
    this.clothLo.rotation.y=mapped.beat==='smash-lo'?this.impactT*2.4:Math.sin(distance*.4)*.12;
    this.clothHi.scale.y=mapped.beat==='smash-hi'?Math.max(.05,1-this.impactT):1;
    this.clothLo.scale.y=mapped.beat==='smash-lo'?Math.max(.05,1-this.impactT):1;
    const gateZ=priceToGround(((frame.high+frame.low)/2),frame);
    const gateHit=mapped.beat==='gate'||mapped.beat==='charge';
    this.place(this.gate,show&&(stage==='structure'||stage==='retest'||(stage==='long'||stage==='short')&&this.impactT>0),7,gateZ,mapped.beat==='gate'?this.impactT:0,false);
    this.glow.intensity=(stage==='structure'||stage==='retest')?2.4+Math.sin(distance*3)*1.2:mapped.beat==='gate'?4:0;
    this.horn.rotation.z=.2+((stage==='structure'||stage==='retest')?Math.sin(distance*6)*.15:0);
    if(mapped.beat==='gate'){this.bar.rotation.z=this.impactT*1.6;this.bar.position.x=this.impactT*2;this.bar.position.y=1.55+this.impactT;}
    else{this.bar.rotation.z=0;this.bar.position.set(0,1.55,0);}
    const lootZ=priceToGround(frame.high,frame)*0.15+pigZ*0.2;
    this.place(this.chest,show&&(stage==='long'||stage==='short'||stage==='tp')&&progress>.45,9,direction===1?lowZ*.3:highZ*.3,mapped.beat==='loot'?this.impactT:0,false);
    this.chest.scale.setScalar(mapped.beat==='loot'?1+this.impactT*.4:1);
    this.place(this.thorns,show&&(stage==='long'||stage==='short'||stage==='sl'),8,direction===1?lowZ:highZ,mapped.beat==='ko'?this.impactT:0,false);
    this.thorns.rotation.z=mapped.beat==='ko'?this.impactT*-.5:0;
    this.place(this.bell,show&&(stage==='flat'||stage==='tp'&&progress>1),4,0,0,false);
    this.bell.rotation.z=stage==='flat'?Math.sin(distance*8)*.35:0;
    this.coins.forEach(c=>{if(!c.visible)return;const v=c.userData.v as THREE.Vector3|undefined;if(!v){c.visible=false;return;}v.y-=9*dt;c.position.addScaledVector(v,dt);if(c.position.y<0)c.visible=false;});
    this.stars.forEach((s,i)=>{s.visible=mapped.beat==='ko';s.position.set(Math.cos(distance*5+i)*0.8,1.4+Math.sin(distance*4+i)*.2,pigZ+Math.sin(distance*5+i)*0.8);});
    this.shards.forEach(s=>{if(s.life<=0){s.mesh.visible=false;return;}s.life-=dt;s.v.y-=12*dt;s.mesh.position.addScaledVector(s.v,dt);s.mesh.rotation.x+=dt*8;s.mesh.visible=s.life>0;});
    this.barrels.forEach((b,i)=>{
      b.mesh.position.x=((b.baseX-distance*0.65)%20+20)%20-6;
      b.mesh.position.z=b.baseZ+(i%2?wick*2:0);
      const near=Math.abs(b.mesh.position.x)<1.2&&Math.abs(b.mesh.position.z-pigZ)<.9&&active&&Math.abs(wick)>.12;
      if(near){b.hit=1;this.shake=Math.max(this.shake,.28);this.lurchZ+=Math.sign(b.baseZ)*.2;}
      b.hit=Math.max(0,b.hit-dt*2);b.mesh.rotation.z=b.hit*1.4;b.mesh.position.y=.28+b.hit*.4;
    });
    const d=this.dust.geometry.attributes.position;const digging=mapped.beat==='skid'||this.offerT>0||mapped.beat==='smash-hi'||mapped.beat==='smash-lo';
    this.dust.visible=digging&&active;
    if(this.dust.visible){for(let i=0;i<40;i++){const p=((i/40)+distance)%1;d.setXYZ(i,-p*2,.1+p*.7,pigZ+(Math.sin(i)*p));}d.needsUpdate=true;}
    this.action=this.resolveAction(mapped.beat,progress);
    void gateHit;
  }
  private place(obj:THREE.Object3D,visible:boolean,x:number,z:number,smash:number,face=false){
    obj.visible=visible;if(!visible)return;obj.position.set(x-smash*1.2,0,z);if(face)obj.rotation.y=0;
  }
  private resolveAction(beat:TrackBeat,progress:number):PigAction{
    if(this.offerT>0.15)return 'lunge';
    switch(beat){
      case 'mist':return 'trot';
      case 'smash-hi':case 'smash-lo':return this.impactT>.15?'smash':'gallop';
      case 'skid':return 'skid';
      case 'gate':return this.impactT>.12?'charge':'skid';
      case 'charge':return progress>.72?'gallop':'gallop';
      case 'loot':return 'charge';
      case 'ko':return 'crash';
      case 'bell':return 'walk';
      default:return 'trot';
    }
  }
}
