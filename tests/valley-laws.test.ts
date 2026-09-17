import {describe,it,expect} from 'vitest';
import {
  canOffer,isPastFlatBell,VALLEY_DLL,VALLEY_PROFIT_CAP,VALLEY_MAX_MNQ,
} from '../src/valley-laws';

/** 2026-09-17 16:49 America/New_York = 20:49 UTC */
const BEFORE_BELL=Date.UTC(2026,8,17,20,49,0);
/** 2026-09-17 16:50 America/New_York = 20:50 UTC */
const AT_BELL=Date.UTC(2026,8,17,20,50,0);

describe('valley laws (compliance)',()=>{
  it('allows the first charge within limits',()=>{
    const d=canOffer({chargesUsedToday:0,beAllowed:false,dayPnl:0,contracts:2,nowMs:BEFORE_BELL});
    expect(d.allowed).toBe(true);
    expect(d.reason).toBe('ok');
  });

  it('blocks a second charge unless beAllowed',()=>{
    expect(canOffer({chargesUsedToday:1,beAllowed:false,dayPnl:0,contracts:1,nowMs:BEFORE_BELL}).allowed).toBe(false);
    expect(canOffer({chargesUsedToday:1,beAllowed:true,dayPnl:0,contracts:1,nowMs:BEFORE_BELL}).allowed).toBe(true);
    expect(canOffer({chargesUsedToday:2,beAllowed:true,dayPnl:0,contracts:1,nowMs:BEFORE_BELL}).allowed).toBe(false);
  });

  it('enforces dll, profit cap and max MNQ',()=>{
    expect(canOffer({chargesUsedToday:0,beAllowed:false,dayPnl:-VALLEY_DLL,contracts:1,nowMs:BEFORE_BELL}).reason).toBe('dll');
    expect(canOffer({chargesUsedToday:0,beAllowed:false,dayPnl:VALLEY_PROFIT_CAP,contracts:1,nowMs:BEFORE_BELL}).reason).toBe('profit_cap');
    expect(canOffer({chargesUsedToday:0,beAllowed:false,dayPnl:0,contracts:VALLEY_MAX_MNQ+1,nowMs:BEFORE_BELL}).reason).toBe('max_contracts');
    expect(canOffer({chargesUsedToday:0,beAllowed:false,dayPnl:0,contracts:0,nowMs:BEFORE_BELL}).reason).toBe('max_contracts');
  });

  it('flats after 16:50 America/New_York',()=>{
    expect(isPastFlatBell(BEFORE_BELL)).toBe(false);
    expect(isPastFlatBell(AT_BELL)).toBe(true);
    expect(canOffer({chargesUsedToday:0,beAllowed:false,dayPnl:0,contracts:1,nowMs:AT_BELL}).reason).toBe('flat_bell');
  });
});
