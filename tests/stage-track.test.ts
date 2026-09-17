import {describe,it,expect} from 'vitest';
import {chartBeat,playerToast} from '../src/stage-track';
import {Game,StoryFeed} from '../src/game';
import {HorusDemo} from '../src/horus';
import {stageChip,LEXICON,stageLabel} from '../src/lexicon';

describe('chart → collision beats',()=>{
  it('maps Will stages to smashable track events',()=>{
    expect(chartBeat('range',0)).toEqual({beat:'mist',side:0});
    expect(chartBeat('sweep',-1)).toEqual({beat:'smash-hi',side:-1});
    expect(chartBeat('sweep',1)).toEqual({beat:'smash-lo',side:1});
    expect(chartBeat('structure',-1).beat).toBe('skid');
    expect(chartBeat('retest',1).beat).toBe('gate');
    expect(chartBeat('long',1)).toEqual({beat:'charge',side:-1});
    expect(chartBeat('short',-1)).toEqual({beat:'charge',side:1});
    expect(chartBeat('tp',0).beat).toBe('loot');
    expect(chartBeat('sl',0).beat).toBe('ko');
    expect(chartBeat('flat',0).beat).toBe('bell');
  });
  it('player toasts stay in valley language',()=>{
    const blob=['range','sweep','structure','retest','long','short','tp','sl','flat'].map(s=>playerToast(s as 'range',-1)+playerToast(s as 'range',1)).join(' ');
    expect(blob).not.toMatch(/\bLONG\b|\bSHORT\b|\bSL\b|\bTP\b|MNQ|stop loss/i);
  });
  it('story quotes walk the real Will machine to KO without touching bags',()=>{
    const g=new Game(),f=new StoryFeed(),h=new HorusDemo();
    f.update(.1,0,g);expect(g.start(0)).toBe(true);h.reset(g);
    const seen=new Set<string>();
    for(let i=1;i<=500;i++){
      const now=i*80;f.update(.08,now,g);g.tick(.08,now);h.update(g);seen.add(h.state.stage);
    }
    expect(seen.has('sweep')).toBe(true);
    expect(seen.has('structure')||seen.has('retest')).toBe(true);
    expect(seen.has('short')||seen.has('long')).toBe(true);
    expect(seen.has('sl')||seen.has('tp')).toBe(true);
    expect(g.bags).toBe(1);expect(g.phase).toBe('running');
  });
});

describe('player lexicon',()=>{
  it('hides trading jargon from HUD copy',()=>{
    const blob=Object.values(LEXICON).join(' ')+['range','sweep','structure','retest','long','short','tp','sl','flat'].map(s=>stageChip(s as 'range')+stageLabel(s as 'range')).join(' ');
    expect(blob).not.toMatch(/\bLONG\b|\bSHORT\b|\bSL\b|\bTP\b|MNQ/);
  });
});
