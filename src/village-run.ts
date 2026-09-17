// This layer owns only village resources. It has no access to Game, quotes or contracts.
export type VillageSide=-1|1;
export type ResourceKind='coin'|'gem';
export interface Pickup{id:number;x:number;z:number;side:VillageSide;kind:ResourceKind;lap:number}
export interface RunInput{horizontal:number;forward:number}
export const GEM_VALUE=5;
export class VillageRun{
  side:VillageSide=-1;x=-2;z=-8;elapsed=0;activeSide:VillageSide|0=0;
  coins=0;gems=0;collected=0;deposited=0;
  piles:Record<VillageSide,number>={'-1':0,'1':0};
  pickups:Pickup[]=[];
  enabled=false;feedback='Recoge recursos y llévalos a la valla.';feedbackUntil=0;
  cheerSide:VillageSide=-1;cheerUntil=0;
  private npcCycles=[0,0,0,0];private settled=false;
  constructor(){this.reset();}
  reset(){
    this.x=-2;this.z=this.side*8;this.elapsed=0;this.activeSide=0;this.coins=this.gems=this.collected=this.deposited=0;
    this.piles={'-1':0,'1':0};this.enabled=false;this.settled=false;this.cheerUntil=0;this.feedbackUntil=0;this.feedback='Recoge recursos y llévalos a la valla.';this.npcCycles=[0,0,0,0];
    this.pickups=Array.from({length:40},(_,id)=>{const side:VillageSide=id%2===0?-1:1;const row=Math.floor(id/2);return{id,x:5+row*5.2,z:side*([8,6,10,8,10,6][row%6]),side,kind:row%4===3?'gem':'coin',lap:0};});
  }
  get pocketValue(){return this.coins+this.gems*GEM_VALUE;}
  get atFence(){return Math.abs(this.z)<=6.35;}
  chooseSide(side:VillageSide){if(side!==-1&&side!==1)return false;if(this.activeSide!==0&&side!==this.activeSide)return false;this.side=side;this.z=side*8;return true;}
  setActiveSide(side:VillageSide|0){if(side!==-1&&side!==0&&side!==1)return false;if(this.activeSide===side)return true;this.activeSide=side;if(side)this.chooseSide(side);return true;}
  nudge(horizontal:number,forward:number){
    if(!this.enabled)return;
    this.z=this.side*Math.max(5.65,Math.min(10.6,(this.z+horizontal*1.1)*this.side));
    this.x=Math.max(-5,Math.min(4,this.x+forward*1.1));
  }
  tick(dt:number,travel:number,input:RunInput,enabled:boolean){
    this.enabled=enabled;if(!enabled||!Number.isFinite(dt)||dt<=0)return;
    const step=Math.min(dt,.1);this.elapsed+=step;
    const h=Number.isFinite(input.horizontal)?Math.max(-1,Math.min(1,input.horizontal)):0;
    const f=Number.isFinite(input.forward)?Math.max(-1,Math.min(1,input.forward)):0;
    const length=Math.max(1,Math.hypot(h,f));
    this.z+=h/length*5.2*step;this.z=this.side*Math.max(5.65,Math.min(10.6,this.z*this.side));
    this.x=Math.max(-5,Math.min(4,this.x+f/length*4.2*step));
    const advance=Number.isFinite(travel)?Math.max(0,Math.min(travel,.5)):0;
    for(const p of this.pickups){
      p.x-=advance;
      if(p.side===this.side&&Math.abs(p.x-this.x)<1.15&&Math.abs(p.z-this.z)<.9){
        if(p.kind==='coin')this.coins++;else this.gems++;
        this.collected++;this.feedback=p.kind==='coin'?'+1 moneda recogida':'+1 joya recogida · vale 5 monedas';this.feedbackUntil=this.elapsed+2;
        this.recycle(p);
      }else if(p.x<-12)this.recycle(p);
    }
    for(let i=0;i<4;i++){
      const cycle=Math.floor((this.elapsed+i*4)/20);
      if(cycle>this.npcCycles[i]){this.npcCycles[i]=cycle;this.piles[i<2?-1:1]+=2;}
    }
  }
  private recycle(p:Pickup){p.x+=112;p.lap++;p.z=p.side*[6,8,10][(p.id+p.lap)%3];}
  deposit(){
    if(!this.enabled||!this.atFence||this.pocketValue===0)return 0;
    const value=this.pocketValue;this.piles[this.side]+=value;this.deposited+=value;this.coins=this.gems=0;
    this.cheerSide=this.side;this.cheerUntil=this.elapsed+2.5;
    this.feedback=`+${value} al montón de ${this.side===-1?'Roble':'Brasa'}. ¡La villa celebra!`;this.feedbackUntil=this.elapsed+3;
    return value;
  }
  // Remaining resources become village coins once per round; offerings are spent.
  settle(){if(this.settled)return null;this.settled=true;this.enabled=false;return this.pocketValue;}
}
