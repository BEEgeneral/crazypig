/** Leyes del valle — compliance gate before Ofrecer (no broker orders here). */

export const VALLEY_DLL=280;
export const VALLEY_PROFIT_CAP=750;
export const VALLEY_MAX_MNQ=3;
export const VALLEY_FLAT_HOUR=16;
export const VALLEY_FLAT_MINUTE=50;
export const VALLEY_TZ='America/New_York';

export interface OfferContext{
  /** Embestidas ya usadas hoy (0 = ninguna). */
  chargesUsedToday:number;
  /** true solo si el 1er trade fue BE y se autoriza la 2ª. */
  beAllowed:boolean;
  /** PnL diario estimado/leído (negativo = pérdida). */
  dayPnl:number;
  /** Contratos MNQ solicitados. */
  contracts:number;
  /** Reloj; por defecto Date.now(). */
  nowMs?:number;
}

export type OfferBlockReason=
  |'flat_bell'
  |'dll'
  |'profit_cap'
  |'max_contracts'
  |'no_charge'
  |'ok';

export interface OfferDecision{
  allowed:boolean;
  reason:OfferBlockReason;
  label:string;
}

function nyParts(nowMs:number){
  const fmt=new Intl.DateTimeFormat('en-US',{
    timeZone:VALLEY_TZ,
    hour:'numeric',
    minute:'numeric',
    hourCycle:'h23',
    weekday:'short',
  });
  const parts=Object.fromEntries(fmt.formatToParts(new Date(nowMs)).map(p=>[p.type,p.value]));
  return {
    hour:Number(parts.hour),
    minute:Number(parts.minute),
    weekday:parts.weekday as string,
  };
}

export function isPastFlatBell(nowMs:number=Date.now()):boolean{
  const {hour,minute}=nyParts(nowMs);
  return hour>VALLEY_FLAT_HOUR||(hour===VALLEY_FLAT_HOUR&&minute>=VALLEY_FLAT_MINUTE);
}

export function canOffer(ctx:OfferContext):OfferDecision{
  const now=ctx.nowMs??Date.now();
  const contracts=ctx.contracts;

  if(!Number.isInteger(contracts)||contracts<1||contracts>VALLEY_MAX_MNQ){
    return {allowed:false,reason:'max_contracts',label:`Máximo ${VALLEY_MAX_MNQ} jabalíes (contratos MNQ)`};
  }
  if(isPastFlatBell(now)){
    return {allowed:false,reason:'flat_bell',label:'Campana del castillo · flat tras 16:50 NY'};
  }
  if(ctx.dayPnl<=-VALLEY_DLL){
    return {allowed:false,reason:'dll',label:`Límite de sangre (−$${VALLEY_DLL}) alcanzado`};
  }
  if(ctx.dayPnl>=VALLEY_PROFIT_CAP){
    return {allowed:false,reason:'profit_cap',label:`Cupo de botín (+$${VALLEY_PROFIT_CAP}) alcanzado`};
  }

  const charges=ctx.chargesUsedToday;
  if(charges<=0){
    return {allowed:true,reason:'ok',label:'Una embestida disponible'};
  }
  if(charges===1&&ctx.beAllowed){
    return {allowed:true,reason:'ok',label:'Segunda embestida (empataste) permitida'};
  }
  return {
    allowed:false,
    reason:'no_charge',
    label:ctx.beAllowed
      ?'Sin embestidas restantes hoy'
      :'Una embestida al día · la segunda solo si empataste',
  };
}
