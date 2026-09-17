import {describe,it,expect} from 'vitest';
import {VillageRun} from '../src/village-run';
import {Game,DemoFeed} from '../src/game';

describe('playable village layer',()=>{
 it('collects a passing coin only on the occupied side and consumes the pickup',()=>{
  const r=new VillageRun();for(let i=0;i<18;i++)r.tick(.1,.42,{horizontal:0,forward:0},true);
  expect(r.coins).toBe(1);expect(r.pickups[0].lap).toBe(1);expect(r.pickups[1].lap).toBe(0);
  for(let i=0;i<10;i++)r.tick(.1,0,{horizontal:0,forward:0},true);expect(r.coins).toBe(1);
 });
 it('keeps the player outside the central track on either side',()=>{
  const r=new VillageRun();for(const side of [-1,1] as const){r.chooseSide(side);for(let i=0;i<100;i++)r.tick(.1,0,{horizontal:-side,forward:1},true);expect(Math.abs(r.z)).toBeCloseTo(5.65);expect(r.x).toBe(4);for(let i=0;i<100;i++)r.tick(.1,0,{horizontal:side,forward:-1},true);expect(Math.abs(r.z)).toBeCloseTo(10.6);expect(r.x).toBe(-5);}
 });
 it('locks the playable side after the indicator confirms its direction',()=>{
  const r=new VillageRun();expect(r.setActiveSide(1)).toBe(true);expect(r.side).toBe(1);expect(r.chooseSide(-1)).toBe(false);expect(r.side).toBe(1);expect(r.chooseSide(1)).toBe(true);
 });
 it('freezes movement, collection and villagers when paused or feed is stale',()=>{
  const r=new VillageRun(),before=JSON.stringify(r);r.tick(.1,.42,{horizontal:1,forward:1},false);expect(JSON.stringify(r)).toBe(before);expect(r.deposit()).toBe(0);
 });
 it('requires resources and proximity to the fence, consumes offerings once',()=>{
  const r=new VillageRun();r.coins=3;r.gems=2;r.tick(.1,0,{horizontal:0,forward:0},true);expect(r.deposit()).toBe(0);
  for(let i=0;i<5;i++)r.tick(.1,0,{horizontal:1,forward:0},true);
  expect(r.deposit()).toBe(13);expect(r.piles[-1]).toBe(13);expect(r.piles[1]).toBe(0);expect(r.pocketValue).toBe(0);expect(r.deposit()).toBe(0);
 });
 it('settles only remaining resources once and resets the next round',()=>{
  const r=new VillageRun();r.coins=4;r.gems=3;expect(r.settle()).toBe(19);expect(r.settle()).toBeNull();r.reset();expect(r.pocketValue).toBe(0);expect(r.settle()).toBe(0);
 });
 it('keeps pickup and NPC pools bounded during an hour of running',()=>{
  const r=new VillageRun();for(let i=0;i<36000;i++)r.tick(.1,.42,{horizontal:0,forward:0},true);
  expect(r.pickups).toHaveLength(40);expect(r.pickups.every(p=>p.x>=-12&&p.x<116)).toBe(true);expect(r.piles[-1]).toBeGreaterThan(0);expect(r.piles[1]).toBeGreaterThan(0);
 });
 it('cannot change the price path, contracts or operation lifecycle',()=>{
  const a=new Game(),b=new Game(),fa=new DemoFeed(),fb=new DemoFeed(),r=new VillageRun();
  fa.update(.1,0,a);fb.update(.1,0,b);a.start(0);b.start(0);
  for(let i=1;i<=1500;i++){const t=i*100;fa.update(.1,t,a);fb.update(.1,t,b);a.tick(.1,t);b.tick(.1,t);r.tick(.1,.42,{horizontal:i%20<10?1:-1,forward:0},true);r.deposit();if(i%100===0)r.chooseSide(r.side===-1?1:-1);}
  expect(JSON.stringify(a)).toBe(JSON.stringify(b));expect(a.bags).toBe(1);expect(a.phase).toBe('running');
 });
});
