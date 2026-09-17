import type {Game} from './game';

export type IndicatorStage='range'|'sweep'|'structure'|'retest'|'long'|'short'|'tp'|'sl'|'flat';
export interface IndicatorSnapshot{
  stage:IndicatorStage;rangeHigh:number;rangeLow:number;zoneHigh:number;zoneLow:number;
  direction:-1|0|1;entry:number;stop:number;target:number;activeSide:-1|0|1;
  rangeWidth:number;progress:number;label:string;exitPrice?:number;
}

const RANGE_BUILD_SEC=12;
const SWEEP_BUFFER=.25;
const MINTICK=.25;

const blank=():IndicatorSnapshot=>({
  stage:'flat',rangeHigh:0,rangeLow:0,zoneHigh:0,zoneLow:0,direction:0,
  entry:0,stop:0,target:0,activeSide:0,rangeWidth:1,progress:0,
  label:'Esperando una nueva sesión',
});

/**
 * Will-aligned stage machine for the demo race.
 * Synthetic MNQ is fine, but long/short require: locked range → sweep of hi/lo →
 * breaker-style reclaim/confirmation → retest → entry. Exits follow price vs SL/TP.
 * applyExternalSignal remains the webhook presentation path (no orders).
 */
export class HorusDemo{
  state=blank();
  private generation=-1;
  private rangeLocked=false;
  private sweepExtreme=0;
  private breakerLevel=0;
  private armedAt=-1;
  private lastPrice=0;

  reset(game:Game){
    this.generation=game.generation;
    this.rangeLocked=false;
    this.sweepExtreme=0;
    this.breakerLevel=0;
    this.armedAt=-1;
    this.lastPrice=game.price;
    this.state={
      ...blank(),
      stage:'range',
      rangeHigh:game.price,
      rangeLow:game.price,
      rangeWidth:MINTICK,
      label:'Niebla de la mañana · el corredor se estrecha',
    };
  }

  update(game:Game){
    if(this.generation!==game.generation)this.reset(game);
    if(game.source!=='demo'||!game.active||!Number.isFinite(game.price)||game.price<=0)return this.state;

    const t=game.elapsed;
    const p=game.price;
    const prev=this.lastPrice||p;

    if(this.state.stage==='range'){
      if(!this.rangeLocked){
        this.state.rangeHigh=Math.max(this.state.rangeHigh,p);
        this.state.rangeLow=Math.min(this.state.rangeLow,p);
        this.state.rangeWidth=Math.max(MINTICK,this.state.rangeHigh-this.state.rangeLow);
        this.state.progress=Math.min(1,t/RANGE_BUILD_SEC);
        this.state.label=t<RANGE_BUILD_SEC
          ?'Niebla de la mañana · el corredor se estrecha'
          :'Niebla lista · esperando barrida de jabalíes';
        if(t>=RANGE_BUILD_SEC){
          // Lock a slightly tighter band so the synthetic path can print a real sweep.
          const mid=(this.state.rangeHigh+this.state.rangeLow)/2;
          const half=Math.max(.5,(this.state.rangeHigh-this.state.rangeLow)/2*.8);
          this.state.rangeHigh=Math.round((mid+half)/MINTICK)*MINTICK;
          this.state.rangeLow=Math.round((mid-half)/MINTICK)*MINTICK;
          this.state.rangeWidth=Math.max(MINTICK,this.state.rangeHigh-this.state.rangeLow);
          this.rangeLocked=true;
          this.state.progress=1;
          this.state.label='Niebla lista · esperando barrida de jabalíes';
        }
      }else{
        this.state.progress=1;
        const sweptHi=p>=this.state.rangeHigh+SWEEP_BUFFER;
        const sweptLo=p<=this.state.rangeLow-SWEEP_BUFFER;
        if(sweptHi&&sweptLo){
          this.state.stage='flat';
          this.state.direction=0;
          this.state.label='Ambos extremos barridos · sesión en blanco';
        }else if(sweptHi||sweptLo){
          // Hi sweep → SHORT bias; Lo sweep → LONG bias (Will Apex).
          this.state.direction=(sweptHi?-1:1) as -1|1;
          this.sweepExtreme=sweptHi?Math.max(p,prev):Math.min(p,prev);
          this.state.zoneHigh=p;
          this.state.zoneLow=p;
          this.state.stage='sweep';
          this.state.progress=0;
          this.state.label=this.state.direction===-1
            ?'¡Barrida en las cumbres de Roble!'
            :'¡Barrida en las puertas de Brasa!';
        }else{
          this.state.label='Niebla lista · esperando barrida de jabalíes';
        }
      }
    }else if(this.state.stage==='sweep'){
      this.state.zoneHigh=Math.max(this.state.zoneHigh,p);
      this.state.zoneLow=Math.min(this.state.zoneLow,p);
      if(this.state.direction===-1)this.sweepExtreme=Math.max(this.sweepExtreme,p);
      if(this.state.direction===1)this.sweepExtreme=Math.min(this.sweepExtreme,p);
      // Breaker setup: reclaim back through the swept edge into the range.
      const reclaimed=this.state.direction===-1
        ?p<=this.state.rangeHigh
        :p>=this.state.rangeLow;
      this.state.progress=reclaimed?.5:Math.min(.45,this.state.progress+.02);
      if(reclaimed){
        this.breakerLevel=this.state.direction===1
          ?(this.state.rangeLow+this.state.rangeHigh)/2
          :(this.state.rangeLow+this.state.rangeHigh)/2;
        this.state.stage='structure';
        this.state.progress=0;
        this.state.label='El cerdo se clava · el cuerno brilla';
      }
    }else if(this.state.stage==='structure'){
      // Breaker-style confirmation: price accepts the reclaim level in trade direction.
      const confirmed=this.state.direction===1
        ?p>=this.breakerLevel
        :p<=this.breakerLevel;
      this.state.progress=confirmed?1:Math.min(.8,Math.abs(p-this.breakerLevel)/(this.state.rangeWidth||1));
      if(confirmed){
        const dir=this.state.direction as -1|1;
        const rawEntry=dir===1?Math.max(p,this.breakerLevel):Math.min(p,this.breakerLevel);
        const entry=Math.round(rawEntry/MINTICK)*MINTICK;
        const stop=Math.round((dir===1
          ?this.sweepExtreme-4*MINTICK
          :this.sweepExtreme+4*MINTICK)/MINTICK)*MINTICK;
        const risk=Math.max(MINTICK,Math.abs(entry-stop));
        this.state.entry=entry;
        this.state.stop=stop;
        this.state.target=Math.round((entry+dir*risk)/MINTICK)*MINTICK;
        this.state.stage='retest';
        this.state.progress=0;
        this.armedAt=t;
        this.state.label='¡A la puerta del valle!';
      }
    }else if(this.state.stage==='retest'){
      const near=Math.abs(p-this.state.entry)<=Math.max(.5,this.state.rangeWidth*.35);
      const waited=this.armedAt>=0&&t-this.armedAt>=1.5;
      this.state.progress=near||waited?1:Math.min(.9,Math.abs(p-this.state.entry)/(this.state.rangeWidth||1));
      if(near||waited){
        const dir=this.state.direction as -1|1;
        // Re-anchor levels around the activation quote (demo rehearsal fill).
        const risk=Math.max(MINTICK,Math.abs(this.state.entry-this.state.stop));
        this.state.entry=p;
        this.state.stop=p-dir*risk;
        this.state.target=p+dir*risk;
        this.state.stage=dir===1?'long':'short';
        this.state.activeSide=dir===1?-1:1;
        this.state.progress=0;
        this.state.label=dir===1
          ?'¡Embestida hacia Villa Roble!'
          :'¡Embestida hacia Villa Brasa!';
      }
    }else if(this.state.stage==='long'||this.state.stage==='short'){
      const dir=this.state.direction as -1|1;
      const hitStop=dir*(p-this.state.stop)<=0;
      const hitTarget=dir*(p-this.state.target)>=0;
      this.state.progress=Math.max(0,Math.min(1,dir*(p-this.state.entry)/Math.abs(this.state.target-this.state.entry||1)));
      if(hitStop||hitTarget){
        this.state.stage=hitStop?'sl':'tp';
        this.state.exitPrice=hitStop?this.state.stop:this.state.target;
        this.state.activeSide=0;
        this.state.label=hitStop?'Herida mortal · ensayo':'Botín del día · ensayo';
      }
    }

    this.lastPrice=p;
    return this.state;
  }

  applyExternalSignal(signal:Partial<IndicatorSnapshot>){
    this.state={...this.state,...signal};
  }
}
