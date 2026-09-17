import type { IndicatorSnapshot } from './horus';

export interface PriceFrame { low:number; high:number; width:number }
/** Higher prices always face Roble (-Z). Neither direction nor cosmetics invert the map. */
export function priceToGround(price:number, frame:PriceFrame){
  return -(price-(frame.high+frame.low)/2)/(frame.high-frame.low)*frame.width;
}
export function frameFor(s:IndicatorSnapshot, fallback:number):PriceFrame{
  const values=[s.rangeLow,s.rangeHigh,s.entry,s.stop,s.target].filter(v=>Number.isFinite(v)&&v>0);
  // Before entry the sweep may leave the reference band; keep it on the field.
  if(Number.isFinite(fallback)&&fallback>0)values.push(fallback);
  if(!values.length)values.push(fallback||20000);
  const low=Math.min(...values),high=Math.max(...values),span=Math.max(2,high-low);
  return {low:(low+high-span)/2-span*.15,high:(low+high+span)/2+span*.15,width:7.3};
}
export class PriceTerrain {
  frame:PriceFrame={low:19997,high:20003,width:7.3};
  private generation=-1;private locked=false;
  update(s:IndicatorSnapshot, generation:number, price:number){
    if(generation!==this.generation){this.generation=generation;this.locked=false;}
    if(!this.locked)this.frame=frameFor(s,price);
    if(s.stage==='long'||s.stage==='short'||s.stage==='tp'||s.stage==='sl')this.locked=true;
    return this.frame;
  }
}
