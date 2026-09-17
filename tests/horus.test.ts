import {describe,it,expect} from 'vitest';
import {Game,DemoFeed} from '../src/game';
import {HorusDemo} from '../src/horus';

function startAt(price=20000){
  const game=new Game();
  expect(game.quote({symbol:'MNQ',price,sequence:0,time:0},0)).toBe(true);
  expect(game.start(0)).toBe(true);
  const horus=new HorusDemo();
  horus.reset(game);
  return {game,horus};
}

/** Build and lock a tight range around 20000 without sweeping. */
function lockRange(game:Game,horus:HorusDemo){
  let seq=1;
  for(let i=1;i<=130;i++){
    const now=i*100;
    const price=20000+(i%2===0?.5:-.5);
    game.quote({symbol:'MNQ',price,sequence:seq++,time:now},now);
    game.tick(.1,now);
    horus.update(game);
  }
  expect(horus.state.stage).toBe('range');
  expect(horus.state.direction).toBe(0);
  expect(horus.state.rangeHigh).toBeGreaterThan(horus.state.rangeLow);
  return seq;
}

function step(game:Game,horus:HorusDemo,price:number,seq:number,now:number){
  game.quote({symbol:'MNQ',price,sequence:seq,time:now},now);
  game.tick(.1,now);
  horus.update(game);
  return seq+1;
}

describe('Will-aligned Horus rehearsal',()=>{
  it('builds a range before any sweep direction',()=>{
    const game=new Game(),feed=new DemoFeed();
    feed.update(.1,0,game);
    expect(game.start(0)).toBe(true);
    const horus=new HorusDemo();horus.reset(game);
    for(let i=1;i<=100;i++){
      const now=i*100;feed.update(.1,now,game);game.tick(.1,now);horus.update(game);
    }
    expect(horus.state.stage).toBe('range');
    expect(horus.state.rangeHigh).toBeGreaterThan(horus.state.rangeLow);
    expect(horus.state.direction).toBe(0);
    expect(game.bags).toBe(1);
  });

  it('requires a price sweep of the locked range before leaving range',()=>{
    const {game,horus}=startAt();
    let seq=lockRange(game,horus);
    seq=step(game,horus,20000,seq,14000);
    expect(horus.state.stage).toBe('range');
    seq=step(game,horus,horus.state.rangeLow-1,seq,14100);
    expect(horus.state.stage).toBe('sweep');
    expect(horus.state.direction).toBe(1);
  });

  it('needs breaker-style reclaim before long/short',()=>{
    const {game,horus}=startAt();
    let seq=lockRange(game,horus);
    const lo=horus.state.rangeLow;
    const mid=(horus.state.rangeHigh+horus.state.rangeLow)/2;
    seq=step(game,horus,lo-1,seq,14000);
    expect(horus.state.stage).toBe('sweep');
    seq=step(game,horus,lo-0.5,seq,14100);
    expect(horus.state.stage).toBe('sweep');
    seq=step(game,horus,lo+0.25,seq,14200);
    expect(horus.state.stage).toBe('structure');
    seq=step(game,horus,mid+0.25,seq,14300);
    expect(horus.state.stage).toBe('retest');
    expect(horus.state.entry).toBeGreaterThan(0);
    expect(horus.state.target).not.toBe(horus.state.stop);
    for(let i=0;i<20;i++){
      seq=step(game,horus,horus.state.entry,seq,14400+i*100);
    }
    expect(horus.state.stage).toBe('long');
    expect(horus.state.activeSide).toBe(-1);
  });

  it('shows a terminal 1R outcome without changing game contracts',()=>{
    const {game,horus}=startAt();
    let seq=lockRange(game,horus);
    const lo=horus.state.rangeLow;
    const mid=(horus.state.rangeHigh+horus.state.rangeLow)/2;
    seq=step(game,horus,lo-1,seq,14000);
    seq=step(game,horus,lo+0.25,seq,14200);
    seq=step(game,horus,mid+0.25,seq,14300);
    for(let i=0;i<20;i++)seq=step(game,horus,horus.state.entry,seq,14400+i*100);
    expect(horus.state.stage).toBe('long');
    seq=step(game,horus,horus.state.target,seq,20000);
    expect(horus.state.stage).toBe('tp');
    expect(horus.state.activeSide).toBe(0);
    expect(game.bags).toBe(1);
    expect(game.phase).toBe('running');
  });

  it('accepts an external indicator payload as presentation state',()=>{
    const h=new HorusDemo();
    h.applyExternalSignal({stage:'long',direction:1,activeSide:-1,label:'LONG externo'});
    expect(h.state.stage).toBe('long');
    expect(h.state.activeSide).toBe(-1);
    expect(h.state.label).toBe('LONG externo');
  });
});
