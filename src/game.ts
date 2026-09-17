export type Phase = 'lobby' | 'running' | 'paused' | 'finished';
export type Source = 'demo' | 'external';
export type Item = 'flowers' | 'banners' | 'lanterns';
export interface Quote { symbol: 'MNQ'; price: number; sequence: number; time: number }
export interface Visit { id: string; date: string; seconds: number; distance: number; bags: number; source: Source }
export interface Wallet { version: 1; coins: number; items: Record<Item, number>; visits: Visit[]; collected: string[] }
export const CATALOG: Record<Item,{title:string;cost:number;limit:number;description:string}> = {
  flowers:{title:'Un valle en flor',cost:100,limit:3,description:'Flores silvestres a los dos lados del camino.'},
  banners:{title:'Orgullo de villa',cost:150,limit:3,description:'Nuevos estandartes para Roble y Brasa.'},
  lanterns:{title:'Pequeñas luces',cost:200,limit:1,description:'Luciérnagas doradas que dan vida al valle.'},
};
export const emptyWallet=():Wallet=>({version:1,coins:1250,items:{flowers:0,banners:0,lanterns:0},visits:[],collected:[]});
export function parseWallet(raw:string|null):Wallet {
  if(raw===null)return emptyWallet();
  const w:unknown=JSON.parse(raw);
  if(!w||typeof w!=='object')throw new Error('Monedero no válido');
  const x=w as Wallet;
  if(x.version!==1||!Number.isSafeInteger(x.coins)||x.coins<0||!x.items||!Array.isArray(x.visits)||!Array.isArray(x.collected))throw new Error('Monedero no válido');
  for(const key of Object.keys(CATALOG) as Item[])if(!Number.isInteger(x.items[key])||x.items[key]<0||x.items[key]>CATALOG[key].limit)throw new Error('Mejora no válida');
  if(x.visits.length>30||x.collected.length>100||x.collected.some(v=>typeof v!=='string'))throw new Error('Historial no válido');
  for(const v of x.visits)if(typeof v.id!=='string'||typeof v.date!=='string'||!Number.isFinite(v.seconds)||v.seconds<0||!Number.isFinite(v.distance)||v.distance<0||![1,2,3].includes(v.bags)||!['demo','external'].includes(v.source))throw new Error('Recorrido no válido');
  return structuredClone(x);
}
export function purchase(w:Wallet,item:Item):Wallet|null{
  const spec=CATALOG[item];if(!spec||w.coins<spec.cost||w.items[item]>=spec.limit)return null;
  const next=structuredClone(w);next.coins-=spec.cost;next.items[item]++;return next;
}
export function collect(w:Wallet,id:string):Wallet|null{
  if(!id||w.collected.includes(id)||w.coins>Number.MAX_SAFE_INTEGER-10)return null;
  const next=structuredClone(w);next.coins+=10;next.collected=[...next.collected,id].slice(-100);return next;
}
export class Game {
  phase:Phase='lobby';source:Source='demo';bags=1;generation=0;
  elapsed=0;distance=0;entry=0;price=0;offset=0;sequence=-1;quoteTime=-Infinity;
  history:{distance:number;offset:number}[]=[];
  private lastHistory=-Infinity;
  setBags(n:number){if(this.active||![1,2,3].includes(n))return false;this.bags=n;return true;}
  get active(){return this.phase==='running'||this.phase==='paused';}
  setSource(source:Source){
    if(this.active)return false;this.source=source;this.sequence=-1;this.quoteTime=-Infinity;this.price=0;this.offset=0;this.history=[];return true;
  }
  quote(q:Quote,now:number){
    if(q.symbol!=='MNQ'||!Number.isFinite(q.price)||q.price<=0||!Number.isSafeInteger(q.sequence)||q.sequence<=this.sequence||!Number.isFinite(q.time)||q.time>now+1000||now-q.time>5000)return false;
    const offset=this.active?-(q.price-this.entry)*.8:0;
    if(!Number.isFinite(offset))return false;
    this.price=q.price;this.sequence=q.sequence;this.quoteTime=q.time;if(this.active)this.offset=offset;return true;
  }
  fresh(now:number){return this.price>0&&now-this.quoteTime>=-1000&&now-this.quoteTime<5000;}
  start(now:number){
    if(this.active||!this.fresh(now))return false;
    this.phase='running';this.generation++;this.entry=this.price;this.offset=this.elapsed=this.distance=0;this.history=[{distance:0,offset:0}];this.lastHistory=0;return true;
  }
  togglePause(){
    if(this.source!=='demo')return false;
    if(this.phase==='running'){this.phase='paused';return true;}if(this.phase==='paused'){this.phase='running';return true;}return false;
  }
  tick(dt:number,now:number){
    if(this.phase!=='running'||!this.fresh(now)||!Number.isFinite(dt)||dt<=0)return;
    // A stalled/hidden tab must not fast-forward scenery by minutes when it returns.
    const step=Math.min(dt,.1);this.elapsed+=step;this.distance+=step*4.2;
    if(this.elapsed-this.lastHistory>=.125){this.history.push({distance:this.distance,offset:this.offset});if(this.history.length>192)this.history.shift();this.lastHistory=this.elapsed;}
  }
  finish(generation=this.generation){if(!this.active||generation!==this.generation)return false;this.phase='finished';return true;}
}
export function tilePosition(i:number,count:number,length:number,distance:number){
  const pool=count*length;return ((i*length-distance+2*length)%pool+pool)%pool-2*length;
}
export class DemoFeed {
  private elapsed=0;private last=-Infinity;private sequence=0;
  update(dt:number,now:number,game:Game){
    if(game.source!=='demo'||game.phase==='paused')return;
    this.elapsed+=Math.min(dt,.1);
    if(this.elapsed-this.last<.25)return;
    this.last=this.elapsed;
    const base=20000+3*Math.sin(this.elapsed*.19)+1.25*Math.sin(this.elapsed*.61);
    const wick=this.elapsed>12?5.5*Math.sin(this.elapsed*.48)*Math.max(0,Math.sin(this.elapsed*.09)):0;
    game.quote({symbol:'MNQ',price:Math.round((base+wick)*4)/4,sequence:this.sequence++,time:now},now);
  }
}

/** Scripted demo quotes that walk the real HorusDemo through smash → gate → KO. Presentation only. */
export class StoryFeed {
  private elapsed=0;private last=-Infinity;private sequence=0;
  update(dt:number,now:number,game:Game){
    if(game.source!=='demo'||game.phase==='paused')return;
    this.elapsed+=Math.min(dt,.1);
    if(this.elapsed-this.last<.08)return;
    this.last=this.elapsed;
    const t=game.active?game.elapsed:this.elapsed;
    let price=20000;
    if(t<12.2)price=20000+.35*Math.sin(t*2);
    else if(t<13.5)price=20010;
    else if(t<14.4)price=19999.5;
    else if(t<15.4)price=19997;
    else if(t<18.2)price=19999;
    else price=20018;
    game.quote({symbol:'MNQ',price:Math.round(price*4)/4,sequence:this.sequence++,time:now},now);
  }
}
