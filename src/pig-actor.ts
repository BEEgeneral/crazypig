import * as THREE from 'three';

/** Articulated presentation actor. It cannot change quotes, levels or outcomes. */
export class PigActor{
  group=new THREE.Group();private body=new THREE.Group();private head=new THREE.Group();
  private legs:{hip:THREE.Vector3;upper:THREE.Mesh;lower:THREE.Mesh;hoof:THREE.Mesh;phase:number}[]=[];
  private ears:THREE.Group[]=[];private tail:THREE.Mesh;
  constructor(){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#b4978e';ctx.fillRect(0,0,128,128);
    for(let i=0;i<1800;i++){const v=Math.sin(i*78.233)*43758.5453,f=v-Math.floor(v);ctx.fillStyle=`rgba(58,43,36,${f*.16})`;ctx.fillRect((i*47)%128,(i*83)%128,1,2);}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const skin=new THREE.MeshStandardMaterial({color:0xc5aba1,map:texture,bumpMap:texture,bumpScale:.018,roughness:.89});
    const nose=new THREE.MeshStandardMaterial({color:0x956b63,roughness:.83});
    const dark=new THREE.MeshStandardMaterial({color:0x28211c,roughness:.76});
    const eye=new THREE.MeshStandardMaterial({color:0x171310,roughness:.21});
    const sphere=new THREE.SphereGeometry(1,28,18);
    const oval=(parent:THREE.Object3D,mat:THREE.Material,p:number[],s:number[])=>{const m=new THREE.Mesh(sphere,mat);m.position.set(p[0],p[1],p[2]);m.scale.set(s[0],s[1],s[2]);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
    this.group.add(this.body);oval(this.body,skin,[0,.91,0],[.94,.52,.48]);
    oval(this.body,skin,[-.51,.83,0],[.48,.46,.47]);
    this.head.position.set(.7,.89,0);this.body.add(this.head);
    oval(this.head,skin,[.25,0,0],[.5,.36,.32]);
    oval(this.head,skin,[.55,-.13,0],[.38,.23,.255]);
    oval(this.head,nose,[.84,-.12,0],[.065,.185,.235]);
    for(const side of [-1,1]){
      oval(this.head,dark,[.89,-.105,side*.10],[.025,.044,.037]);
      oval(this.head,eye,[.39,.13,side*.274],[.036,.043,.025]);
      const ear=new THREE.Group();ear.position.set(.06,.27,side*.22);ear.rotation.x=side*.7;ear.rotation.z=-.35;
      const shell=oval(ear,skin,[0,.13,0],[.16,.26,.045]);shell.rotation.z=-.3;
      oval(ear,nose,[0,.13,side*.027],[.115,.195,.021]);this.head.add(ear);this.ears.push(ear);
    }
    for(const x of [-.57,.58])for(const z of [-.3,.3]){
      const upper=new THREE.Mesh(new THREE.CylinderGeometry(.14,.105,1,12),skin);
      const lower=new THREE.Mesh(new THREE.CylinderGeometry(.092,.064,1,12),skin);
      const hoof=new THREE.Mesh(new THREE.BoxGeometry(.18,.11,.14),dark);
      for(const m of [upper,lower,hoof]){m.castShadow=true;this.group.add(m);}
      this.legs.push({hip:new THREE.Vector3(x,.72,z),upper,lower,hoof,phase:(x*z>0?0:Math.PI)});
      // Split hoof seam, attached to the hoof rather than another animated limb.
      const seam=new THREE.Mesh(new THREE.BoxGeometry(.183,.113,.012),new THREE.MeshStandardMaterial({color:0x100e0b}));hoof.add(seam);
    }
    const curve=new THREE.CatmullRomCurve3(Array.from({length:32},(_,i)=>{const t=i/31;return new THREE.Vector3(-.87-t*.22,1.02+Math.sin(t*Math.PI*3)*.065,t*.09+Math.cos(t*Math.PI*3)*.055);}));
    this.tail=new THREE.Mesh(new THREE.TubeGeometry(curve,32,.021,6,false),skin);this.body.add(this.tail);
    this.pose(0,false,false,'range');
  }
  private bone(mesh:THREE.Mesh,a:THREE.Vector3,b:THREE.Vector3){const d=b.clone().sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=d.length();mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());}
  pose(time:number,running:boolean,reduced:boolean,stage:string){
    const animate=running&&!reduced,t=time*9;
    this.body.position.y=animate?Math.cos(t*2)*.024:Math.sin(time*1.5)*.008;
    this.body.rotation.z=animate?Math.sin(t)*.015:0;
    this.head.rotation.z=stage==='tp'?-.1:stage==='sl'?.14:animate?Math.sin(t)*.028:0;
    this.ears.forEach((ear,i)=>ear.rotation.z=-.35+(animate?Math.sin(t+i)*.085:0));
    this.tail.rotation.x=animate?Math.sin(t*.6)*.09:0;
    this.legs.forEach(leg=>{
      const phase=t+leg.phase,stride=animate?Math.cos(phase)*.22:0,lift=animate?Math.max(0,Math.sin(phase))*.14:0;
      const foot=new THREE.Vector3(leg.hip.x+stride,.075+lift,leg.hip.z);
      const a=leg.hip.clone(),delta=foot.clone().sub(a),length=delta.length();
      // Two equal-length segments with a rear-facing hock; foot meets the plane.
      const bend=Math.sqrt(Math.max(0,.37*.37-length*length/4));
      const knee=a.clone().add(foot).multiplyScalar(.5).add(new THREE.Vector3(-delta.y,delta.x,0).normalize().multiplyScalar(-bend));
      this.bone(leg.upper,a,knee);this.bone(leg.lower,knee,foot);leg.hoof.position.copy(foot);leg.hoof.rotation.z=animate?Math.max(0,Math.sin(phase))*.22:0;
    });
  }
}
