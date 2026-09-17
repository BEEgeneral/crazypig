import type {IndicatorStage} from './horus';

/** Trading → narrativa del valle (UI jugador). */
export const LEXICON={
  range:'Niebla de la mañana',
  sweep:'Barrida de jabalíes',
  structure:'Cuerno / puerta del valle',
  retest:'Retorno a la puerta',
  long:'Embestida LONG',
  short:'Embestida SHORT',
  tp:'Botín del día',
  sl:'Herida mortal',
  flat:'Campana del castillo',
  entry:'Ofrecer / Embestida',
  stop:'Herida mortal',
  target:'Botín del día',
  dll:'Límite de sangre',
  profitCap:'Cupo de botín',
  oneTrade:'Una embestida',
  secondBe:'Segunda solo si empataste',
  wait:'En espera',
} as const;

export type LexiconKey=keyof typeof LEXICON;

export function stageLabel(stage:IndicatorStage):string{
  switch(stage){
    case 'range':return LEXICON.range;
    case 'sweep':return LEXICON.sweep;
    case 'structure':return LEXICON.structure;
    case 'retest':return LEXICON.retest;
    case 'long':return LEXICON.long;
    case 'short':return LEXICON.short;
    case 'tp':return LEXICON.tp;
    case 'sl':return LEXICON.sl;
    case 'flat':return LEXICON.flat;
    default:return LEXICON.flat;
  }
}

export function directionLabel(direction:-1|0|1):string{
  if(direction===1)return LEXICON.long;
  if(direction===-1)return LEXICON.short;
  return LEXICON.wait;
}

export function stageChip(stage:IndicatorStage):string{
  switch(stage){
    case 'range':return 'NIEBLA';
    case 'sweep':return 'BARRIDA';
    case 'structure':return 'CUERNO';
    case 'retest':return 'RETORNO';
    case 'long':return 'EMBESTIDA ▲';
    case 'short':return 'EMBESTIDA ▼';
    case 'tp':return 'BOTÍN';
    case 'sl':return 'HERIDA';
    case 'flat':return 'CAMPANA';
    default:return 'FIN';
  }
}
