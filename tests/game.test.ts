import {describe,it,expect} from 'vitest';
import {Game,DemoFeed,emptyWallet,parseWallet,purchase,collect,tilePosition} from '../src/game';
const start=()=>{const g=new Game();g.quote({symbol:'MNQ',price:20000,sequence:0,time:0},0);g.start(0);return g;};
describe('price-driven game',()=>{
 it('accepts only 1–3 bags and locks active sessions',()=>{const g=new Game();expect(g.setBags(4)).toBe(false);expect(g.setBags(0)).toBe(false);expect(g.setBags(2)).toBe(true);expect(g.start(0)).toBe(false);g.quote({symbol:'MNQ',price:20000,sequence:0,time:0},0);expect(g.start(0)).toBe(true);expect(g.setBags(1)).toBe(false);expect(g.bags).toBe(2);});
 it('maps only accepted MNQ quotes, anchored to entry',()=>{const g=start();expect(g.quote({symbol:'MNQ',price:20000.25,sequence:1,time:1},1)).toBe(true);expect(g.offset).toBe(-.2);expect(g.quote({symbol:'MNQ',price:100,sequence:1,time:2},2)).toBe(false);expect(g.quote({symbol:'MNQ',price:19999.5,sequence:2,time:3},3)).toBe(true);expect(g.offset).toBe(.4);expect(g.quote({symbol:'MNQ',price:NaN,sequence:3,time:4},4)).toBe(false);});
 it('rejects stale/future data and freezes when feed is stale',()=>{const g=start();g.tick(.1,6000);expect(g.distance).toBe(0);expect(g.quote({symbol:'MNQ',price:20001,sequence:1,time:0},6001)).toBe(false);expect(g.quote({symbol:'MNQ',price:20001,sequence:1,time:9999},0)).toBe(false);});
 it('has no live pause or mixed-source fallback',()=>{const g=new Game();g.setSource('external');new DemoFeed().update(1,0,g);expect(g.price).toBe(0);g.quote({symbol:'MNQ',price:20000,sequence:1,time:0},0);g.start(0);expect(g.togglePause()).toBe(false);expect(g.setSource('demo')).toBe(false);});
 it('pauses demo and rejects duplicate/stale finishes',()=>{const g=start();g.togglePause();g.tick(.1,100);expect(g.distance).toBe(0);expect(g.finish(99)).toBe(false);expect(g.finish()).toBe(true);expect(g.finish()).toBe(false);g.start(200);expect(g.finish(g.generation-1)).toBe(false);});
 it('keeps a one-hour session bounded',()=>{const g=new Game(),f=new DemoFeed();f.update(.016,0,g);g.start(0);for(let i=1;i<=216000;i++){f.update(1/60,i*1000/60,g);g.tick(1/60,i*1000/60);}expect(g.elapsed).toBeCloseTo(3600,4);expect(g.history.length).toBeLessThanOrEqual(192);expect(g.phase).toBe('running');});
});
describe('separate village currency',()=>{
 it('purchases never change market state or bags',()=>{const g=start(),before=JSON.stringify(g);const w=purchase(emptyWallet(),'flowers')!;expect(w.coins).toBe(1150);expect(JSON.stringify(g)).toBe(before);});
 it('caps purchases and prevents negative balances',()=>{let w=emptyWallet();for(let i=0;i<3;i++)w=purchase(w,'flowers')!;expect(purchase(w,'flowers')).toBe(null);w.coins=0;expect(purchase(w,'banners')).toBe(null);});
 it('collects each bonus once',()=>{const w=collect(emptyWallet(),'acorn-1')!;expect(w.coins).toBe(1260);expect(collect(w,'acorn-1')).toBe(null);});
 it('validates persisted state instead of trusting it',()=>{expect(parseWallet(null).coins).toBe(1250);expect(()=>parseWallet('{"version":1}')).toThrow();expect(()=>parseWallet(JSON.stringify({...emptyWallet(),coins:-1}))).toThrow();expect(parseWallet(JSON.stringify(emptyWallet()))).toEqual(emptyWallet());});
});
it('recycles eight tiles without gaps or accumulating coordinates',()=>{for(const d of [0,15.9,16,128,1e9,1e12]){const p=Array.from({length:8},(_,i)=>tilePosition(i,8,16,d)).sort((a,b)=>a-b);expect(new Set(p).size).toBe(8);expect(p[0]).toBeGreaterThanOrEqual(-32);expect(p[7]).toBeLessThan(96);for(let i=1;i<8;i++)expect(p[i]-p[i-1]).toBeCloseTo(16);}});
