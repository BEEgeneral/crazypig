import {describe,it,expect} from 'vitest';
import {PriceTerrain,priceToGround,frameFor} from '../src/price-terrain';
import {HorusDemo} from '../src/horus';
import {Game} from '../src/game';
import {VillageRun} from '../src/village-run';

describe('horizontal terrain and price exits',()=>{
 it('keeps the reference range separate from SL/TP and always maps higher prices toward Roble',()=>{
  const h=new HorusDemo();Object.assign(h.state,{rangeLow:19990,rangeHigh:20010,entry:20012,stop:20008,target:20016,rangeWidth:20});
  const f=frameFor(h.state,20012);
  expect(priceToGround(20016,f)).toBeLessThan(priceToGround(20012,f));
  expect(priceToGround(19990,f)).toBeGreaterThan(priceToGround(20008,f));
  for(const value of [19990,20010,20012,20008,20016])expect(Math.abs(priceToGround(value,f))).toBeLessThan(4.5);
 });
 it('freezes the scale at entry, even when the next price is far outside the range',()=>{
  const h=new HorusDemo(),terrain=new PriceTerrain();Object.assign(h.state,{stage:'long',entry:20000,stop:19995,target:20005,rangeLow:19990,rangeHigh:20010});
  const f=terrain.update(h.state,1,20000),z=priceToGround(20005,f);
  const next=terrain.update({...h.state,rangeHigh:22000},1,21000);
  expect(next).toEqual(f);expect(priceToGround(20005,next)).toBe(z);
  expect(terrain.update({...h.state,stage:'range',rangeHigh:22000},2,21000)).not.toEqual(f);
 });
 for(const direction of [-1,1] as const)for(const outcome of ['tp','sl'] as const){
  it(`${direction===1?'LONG':'SHORT'} ends only at its ${outcome.toUpperCase()} price, not elapsed time`,()=>{
   const g=new Game();g.quote({symbol:'MNQ',price:20000,sequence:0,time:0},0);g.start(0);
   const h=new HorusDemo();h.reset(g);Object.assign(h.state,{stage:direction===1?'long':'short',direction,entry:20000,stop:20000-direction*2,target:20000+direction*2,activeSide:direction===1?-1:1});
   g.elapsed=3600;h.update(g);expect(h.state.stage).toBe(direction===1?'long':'short');
   const price=outcome==='tp'?h.state.target:h.state.stop;
   g.quote({symbol:'MNQ',price,sequence:1,time:1},1);h.update(g);
   expect(h.state.stage).toBe(outcome);expect(h.state.exitPrice).toBe(price);expect(h.state.activeSide).toBe(0);
  });
 }
 it('does not reset the player position when the same villa signal is applied each frame',()=>{
  const v=new VillageRun();v.setActiveSide(-1);
  for(let i=0;i<10;i++){v.setActiveSide(-1);v.tick(.1,0,{horizontal:1,forward:0},true);}
  expect(v.z).toBeCloseTo(-5.65);expect(v.atFence).toBe(true);
 });
});
