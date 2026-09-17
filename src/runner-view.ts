import * as THREE from 'three';
import { VillageRun } from './village-run';

/** Small animated villagers and resource props; all transforms are presentation-only. */
export class RunnerView{
  group=new THREE.Group();
  private player:THREE.Group;private npcs:THREE.Group[]=[];
  private resources:THREE.Mesh[]=[];private piles:THREE.Group[]=[];
  private pennant:THREE.Mesh;private halo:THREE.Mesh;
  private shirt=new THREE.MeshStandardMaterial({color:0x526c74,roughness:.8});
  constructor(){
    this.player=this.person(this.shirt);this.group.add(this.player);
    const haloMat=new THREE.MeshBasicMaterial({color:0xffe385,transparent:true,opacity:.8,side:THREE.DoubleSide});
    this.halo=new THREE.Mesh(new THREE.RingGeometry(.55,.7,32),haloMat);this.halo.rotation.x=-Math.PI/2;this.halo.position.y=.075;this.group.add(this.halo);
    this.pennant=new THREE.Mesh(new THREE.ConeGeometry(.24,.5,4),new THREE.MeshBasicMaterial({color:0xffe385}));this.group.add(this.pennant);
    for(let i=0;i<4;i++){const npc=this.person(new THREE.MeshStandardMaterial({color:i<2?0x526874:0x866052,roughness:.9}));npc.scale.setScalar(.9);this.npcs.push(npc);this.group.add(npc);}
    const gold=new THREE.MeshStandardMaterial({color:0xbca365,metalness:.65,roughness:.3,emissive:0x885411,emissiveIntensity:.04});
    const gem=new THREE.MeshStandardMaterial({color:0x79a6a0,metalness:.3,roughness:.15,emissive:0x126773,emissiveIntensity:.08});
    const coinGeo=new THREE.CylinderGeometry(.31,.31,.12,12);coinGeo.rotateX(Math.PI/2);
    const gemGeo=new THREE.OctahedronGeometry(.4);
    for(let i=0;i<40;i++){const mesh=new THREE.Mesh(Math.floor(i/2)%4===3?gemGeo:coinGeo,Math.floor(i/2)%4===3?gem:gold);mesh.castShadow=true;this.resources.push(mesh);this.group.add(mesh);}
    for(const side of [-1,1]){
      const pile=new THREE.Group();pile.position.set(1,0,side*4.9);
      const mat=new THREE.MeshStandardMaterial({color:side===-1?0x526874:0x866052,roughness:.8});
      const base=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.2,.18,12),mat);base.position.y=.12;pile.add(base);
      for(let i=0;i<32;i++){
        const coin=new THREE.Mesh(new THREE.CylinderGeometry(.22,.25,.15,10),i%7===0?gem:gold);
        const angle=i*2.4,radius=.83*Math.sqrt((i%12)/12);coin.position.set(Math.cos(angle)*radius,.3+Math.floor(i/10)*.18,Math.sin(angle)*radius);coin.rotation.z=Math.sin(i)*.13;coin.visible=false;pile.add(coin);
      }
      this.piles.push(pile);this.group.add(pile);
      const zone=new THREE.Mesh(new THREE.PlaneGeometry(10,1.2),new THREE.MeshBasicMaterial({color:0xfde18a,transparent:true,opacity:.18,side:THREE.DoubleSide}));zone.rotation.x=-Math.PI/2;zone.position.set(-.5,.055,side*5.9);this.group.add(zone);
    }
  }
  private person(shirt:THREE.Material){
    const group=new THREE.Group();
    const skin=new THREE.MeshStandardMaterial({color:0xdeab79,roughness:.8});
    const leather=new THREE.MeshStandardMaterial({color:0x493124,roughness:.9});
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.25,.47,6,12),shirt);body.position.y=1.08;group.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.20,16,12),skin);head.position.y=1.82;group.add(head);
    const hat=new THREE.Mesh(new THREE.ConeGeometry(.235,.27,12),leather);hat.position.y=2.03;group.add(hat);
    for(let i=0;i<4;i++){
      const limb=new THREE.Group();limb.name='limb'+i;limb.position.set(i<2?0:.02,i<2?.75:1.35,(i%2===0?-1:1)*(i<2?.19:.4));
      const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(i<2?.12:.095,i<2?.42:.33,3,6),i<2?leather:skin);mesh.position.y=-.25;limb.add(mesh);group.add(limb);
    }
    const sack=new THREE.Mesh(new THREE.SphereGeometry(.23,12,8),new THREE.MeshStandardMaterial({color:0xd7a148,roughness:.9}));sack.position.set(-.36,1.03,0);sack.scale.y=1.3;group.add(sack);
    group.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=true;});return group;
  }
  private pose(person:THREE.Group,time:number,moving:boolean){
    for(let i=0;i<4;i++){const limb=person.getObjectByName('limb'+i)!;limb.rotation.z=moving?Math.sin(time*11+(i%2)*Math.PI)*.55:0;}
  }
  render(run:VillageRun,visible:boolean,reduced:boolean){
    this.group.visible=visible;if(!visible)return;
    this.player.position.set(run.x,run.enabled&&!reduced?Math.abs(Math.sin(run.elapsed*11))*.08:0,run.z);
    this.shirt.color.setHex(run.side===-1?0x526c74:0x8e6353);
    this.pose(this.player,run.elapsed,run.enabled&&!reduced);this.halo.position.set(run.x,.075,run.z);
    this.pennant.position.set(run.x,2.85,run.z);this.pennant.rotation.z=Math.PI;
    run.pickups.forEach((p,i)=>{const mesh=this.resources[i];mesh.position.set(p.x,.8+(reduced?0:Math.sin(run.elapsed*3+i)*.13),p.z);mesh.rotation.y=reduced?0:run.elapsed*2;});
    this.npcs.forEach((npc,i)=>{const phase=((run.elapsed+i*4)%20)/20,side=i<2?-1:1;const approach=phase<.5?phase*2:(1-phase)*2;npc.position.set(10+(i%2)*15,0,side*(10-approach*4));npc.rotation.y=phase<.5?side*Math.PI/2:-side*Math.PI/2;this.pose(npc,run.elapsed+i,run.enabled&&!reduced);});
    this.piles.forEach((pile,i)=>{const total=run.piles[i===0?-1:1];const count=Math.min(32,total);pile.children.forEach((o,n)=>{if(n>0)o.visible=n<=count;});pile.scale.y=1+Math.min(3,total/40);});
  }
}
