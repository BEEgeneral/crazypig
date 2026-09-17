import './fonts.css';import './style.css';import './tournament.css';import './race.css';import './natural.css';
import { Game, DemoFeed, StoryFeed, CATALOG, parseWallet, purchase, collect, type Item, type Wallet, type Quote } from './game';
import {ValleyScene} from './scene';import {icon} from './icons';
import {VillageRun} from './village-run';
import {HorusDemo, type IndicatorSnapshot} from './horus';
import {stageChip, LEXICON, stageLabel} from './lexicon';
import {PriceTerrain,priceToGround} from './price-terrain';
import {playerToast} from './stage-track';

const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<aside class="rail" aria-label="Navegación principal">
 <a class="brand-icon" href="#" aria-label="CrazyPig, ir al valle"><img src="/favicon.svg" alt=""/></a>
 <nav><button class="nav-item selected" data-nav="play" aria-label="El valle" aria-current="page">${icon('play')}<span>Jugar</span></button><button class="nav-item" data-nav="village" aria-label="Mi villa">${icon('village')}<span>Mi villa</span></button><button class="nav-item" data-nav="history" aria-label="Diario de recorridos">${icon('book')}<span>Diario</span></button></nav>
 <button class="nav-item rail-help" data-action="help" aria-label="Cómo jugar">${icon('help')}<span>Ayuda</span></button>
 <div class="rail-bottom"><span>CP</span><small>EL VALLE</small></div>
</aside>
<div class="shell">
 <header class="topbar"><div class="wordmark">CrazyPig<span>LAS VILLAS DEL VALLE</span></div>
  <div class="wallets"><div class="wallet official" tabindex="0" aria-label="Tesoro oficial, pendiente de conexión"><span class="wallet-symbol">${icon('bag',23)}</span><div><small>TESORO OFICIAL</small><strong>— <em>Sin conectar</em></strong></div></div><div class="wallet village-wallet"><span class="wallet-symbol">${icon('coin',23)}</span><div><small>MONEDAS DE VILLA</small><strong id="coins">1.250</strong></div><button data-nav="village" aria-label="Usar monedas de villa" class="wallet-add">+</button></div></div>
  <button class="avatar" data-action="help" aria-label="Guía del valle">A<span></span></button>
 </header>
 <main class="playground" id="main">
  <section class="intro"><div class="eyebrow">TORNEO DEL VALLE</div><h1>El cerdo<br><i>abre el camino.</i></h1><p>Corre, ofrece, y deja que el jabalí rompa puertas. El tesoro oficial sigue en el castillo.</p></section>
  <div class="scene-wrap" id="scene"><div class="loading" id="loading"><img src="/favicon.svg" alt=""/><span>Despertando al valle…</span><div><i></i></div></div></div>
  <div class="mode-chip"><span></span><span id="mode-label">Modo demostración</span><button data-action="help" aria-label="Información del modo demostración">${icon('help',14)}</button></div>
  <div class="village-label label-blue"><div class="portrait-frame"><img src="/portraits/edrick.jpeg" alt="Sir Edrick, señor de Villa Roble"/></div><span>VILLA ROBLE</span><strong>Sir Edrick</strong><small>Honor, valor y raíces.</small></div><div class="village-label label-red"><div class="portrait-frame"><img src="/portraits/alaric.jpeg" alt="Lord Alaric, señor de Villa Brasa"/></div><span>VILLA BRASA</span><strong>Lord Alaric</strong><small>Que arda la rivalidad.</small></div>
  <div class="scene-tools"><button class="tool" data-action="camera" aria-label="Cambiar vista de cámara" title="Cambiar vista">${icon('camera',20)}</button><button class="tool" data-action="sound" aria-label="Activar sonido" aria-pressed="false" title="Sonido">${icon('mute',20)}</button><button class="tool fullscreen" data-action="fullscreen" aria-label="Pantalla completa" title="Pantalla completa">${icon('expand',20)}</button></div>
  <button id="acorn" class="acorn" hidden aria-label="Recoger regalo: 10 monedas de villa">${icon('coin',27)}<span>¡Un regalo del valle!</span><small>+10 monedas de villa</small></button>
  <section id="runner-panel" class="runner-panel" hidden aria-label="Minijuego de las villas">
   <div class="village-score score-roble"><button data-side="-1" aria-pressed="true">VILLA ROBLE <span id="roble-active">TU VILLA</span></button><strong id="pile-roble">0</strong><small>ofrecido junto a la valla</small></div>
   <div class="village-score score-brasa"><button data-side="1" aria-pressed="false">VILLA BRASA <span id="brasa-active">CAMBIAR</span></button><strong id="pile-brasa">0</strong><small>ofrecido junto a la valla</small></div>
   <div class="runner-tip"><b>RECOGE · LLEVA A LA VALLA · OFRECE</b><span>Flechas o WASD. El cerdo abre las puertas del valle.</span></div>
   <div class="backpack"><span>TU MOCHILA</span><strong>${icon('coin',19)} <b id="pocket-coins">0</b><span class="gem-icon">◆</span> <b id="pocket-gems">0</b></strong><small>1 joya = 5 monedas de villa</small></div>
   <div class="runner-feedback" id="runner-feedback" role="status" aria-live="polite">Recoge recursos y llévalos a la valla.</div>
   <div class="runner-pad" role="group" aria-label="Mover al aldeano"><button data-move="up" aria-label="Mover hacia delante">↑</button><button data-move="left" aria-label="Mover a la izquierda">←</button><span> TÚ </span><button data-move="right" aria-label="Mover a la derecha">→</button><button data-move="down" aria-label="Mover hacia atrás">↓</button></div>
   <div class="offer-area"><button class="primary" id="offer" disabled>Ofrecer a la villa <span id="offer-value">0</span></button><small id="offer-hint">Recoge monedas o joyas primero.</small><span>Solo recursos de villa · efecto visual</span></div>
  </section>
  <section id="indicator-panel" class="indicator-panel quest-panel" hidden aria-label="Quest del valle">
   <div class="indicator-head"><span><b>QUEST DEL VALLE</b><small>ENSAYO · SIN TESORO</small></span><strong id="signal-stage">NIEBLA</strong></div>
   <svg id="price-chart" viewBox="0 0 240 74" role="img" aria-label="Camino del cerdo"><rect id="chart-range" x="0" y="22" width="240" height="30"/><polyline id="chart-line" points="0,38 240,38"/><line id="chart-entry" x1="0" y1="38" x2="240" y2="38"/><line id="chart-stop" x1="0" y1="58" x2="240" y2="58"/><line id="chart-target" x1="0" y1="18" x2="240" y2="18"/></svg>
   <div class="indicator-metrics"><span>NIEBLA <b id="range-value">—</b></span><span>QUEST <b id="signal-value">En espera</b></span><span>DESTINO <b id="levels-value">—</b></span></div>
  </section>
  <div class="terrain-legend" id="terrain-legend" hidden><span>← VILLA ROBLE</span><b id="terrain-state">Niebla de la mañana</b><span>VILLA BRASA →</span></div>
  <div id="quest-flash" class="quest-flash" hidden><b id="quest-flash-chip">NIEBLA</b><span id="quest-flash-copy">Niebla de la mañana</span></div>
  <section class="race-result" id="race-result" hidden role="status"><small>RESULTADO DEL ENSAYO</small><strong id="result-title"></strong><p id="result-detail"></p><button class="primary" data-action="save-result">Guardar y volver al valle</button></section>
  <section class="game-dock" aria-label="Controles de la partida">
   <div class="dock-heading"><div><span class="section-kicker" id="dock-kicker">TU AVENTURA EMPIEZA AQUÍ</span><h2 id="dock-title">¿Cuántas bolsas llevas?</h2></div><span class="step-chip" id="step-chip">01 <span>/</span> ELIGE TU EQUIPAJE</span></div>
   <div class="lobby-controls" id="lobby-controls"><div class="bags" role="group" aria-label="Número de bolsas de oro">${[1,2,3].map(n=>`<button class="bag-option ${n===1?'chosen':''}" data-bags="${n}" aria-pressed="${n===1}"><span class="bag-art">${Array.from({length:n},()=>icon('bag',38)).join('')}</span><span>${n} bolsa${n>1?'s':''} de oro</span><i class="bag-check">${icon('check',11)}</i></button>`).join('')}</div><div class="start-area"><button class="primary start" id="start" disabled>Entrar al valle ${icon('arrow',19)}</button><span>El cerdo marca el camino. Tú lo vives.</span></div></div>
   <div class="run-controls" id="run-controls" hidden><div class="run-stat">${icon('clock',19)}<div><small>TIEMPO EN EL VALLE</small><strong id="time">00:00</strong></div></div><div class="run-stat">${icon('flag',19)}<div><small>CAMINO RECORRIDO</small><strong id="distance">0 m</strong></div></div><div class="run-stat bags-stat">${icon('bag',21)}<div><small>TU EQUIPAJE</small><strong id="run-bags">1 bolsa</strong></div></div><div class="run-buttons"><button class="secondary" id="pause">${icon('pause',16)} Pausa</button><button class="primary" id="finish">Terminar ${icon('arrow',18)}</button></div></div>
   <div class="dock-foot">${icon('spark',13)}<span>Estás explorando una demostración. El tesoro oficial no se mueve.</span><button data-action="help">Cómo funciona ${icon('arrow',12)}</button></div>
  </section>
  <footer class="world-footer"><span><span class="status-dot"></span> Un valle vivo, una historia por escribir.</span><span>HECHO PARA DISFRUTAR DEL CAMINO ${icon('leaf',14)}</span></footer>
 </main>
</div>
<dialog id="dialog"><div class="dialog-top"><span class="section-kicker" id="dialog-kicker"></span><button class="tool" data-action="close" aria-label="Cerrar ventana">${icon('close',21)}</button></div><div id="dialog-content"></div></dialog>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
`;
const $=<T extends HTMLElement=HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const game=new Game(),storyMode=new URLSearchParams(location.search).has('story'),feed=storyMode?new StoryFeed():new DemoFeed(),villageRun=new VillageRun(),horus=new HorusDemo(),terrain=new PriceTerrain();let wallet:Wallet;let walletReady=true;
const heldKeys=new Set<string>(),heldPointers=new Map<number,string>();
function clearMovement(){heldKeys.clear();heldPointers.clear();document.querySelectorAll('[data-move]').forEach(b=>b.classList.remove('held'));}
function movement(){const directions=new Set([...heldKeys,...heldPointers.values()]);return{horizontal:Number(directions.has('right'))-Number(directions.has('left')),forward:Number(directions.has('up'))-Number(directions.has('down'))};}
const WALLET_KEY='crazypig-village-v1';
try{wallet=parseWallet(localStorage.getItem(WALLET_KEY));}catch{wallet=parseWallet(null);walletReady=false;}
let valley:ValleyScene|undefined,loaded=false,sound=false,audio:AudioContext|undefined;
let lastFrame=performance.now(),lastUI=0,raf=0,acornID:string|null=null,nextAcorn=12,fartSeen=0,lastIndicatorStage='flat';
// getRandomValues also works when a phone opens the demo over local-network HTTP.
function uniqueID(){return crypto.randomUUID?.()??Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');}
const sessionID=uniqueID(),dialog=$<HTMLDialogElement>('#dialog');let panel='';
let toastTimer:ReturnType<typeof setTimeout>;
function toast(message:string,kind:'plain'|'quest'='plain'){
 $('#toast').textContent=message;$('#toast').classList.add('visible');
 $('#toast').classList.toggle('quest',kind==='quest');
 $('#main').classList.remove('juice-shake');void $('#main').offsetWidth;$('#main').classList.add('juice-shake');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('#toast').classList.remove('visible','quest');$('#main').classList.remove('juice-shake');},kind==='quest'?2600:4200);
}
function flashQuest(stage:IndicatorSnapshot['stage'],direction:-1|0|1){
 const flash=$('#quest-flash');flash.hidden=false;
 $('#quest-flash-chip').textContent=stageChip(stage);
 $('#quest-flash-copy').textContent=playerToast(stage,direction);
 flash.classList.remove('show');void flash.offsetWidth;flash.classList.add('show');
 toast(playerToast(stage,direction),'quest');
}
function updateCoins(){$('#coins').textContent=wallet.coins.toLocaleString('es-ES');}
updateCoins();
function save(next:Wallet){
 if(!walletReady){toast('No se pudo leer el monedero. Las compras están desactivadas para conservar tus datos.');return false;}
 try{localStorage.setItem(WALLET_KEY,JSON.stringify(next));wallet=next;updateCoins();return true;}catch{toast('No se pudo guardar. No se ha descontado ninguna moneda.');return false;}
}
async function transaction(transform:(w:Wallet)=>Wallet|null){
 const work=()=>{
  if(!walletReady)return false;
  try{const current=parseWallet(localStorage.getItem(WALLET_KEY));const next=transform(current);if(!next)return false;return save(next);}catch{walletReady=false;toast('No se pudo leer el monedero. Tus datos se han conservado.');return false;}
 };
 return navigator.locks?navigator.locks.request('crazypig-wallet',work):work();
}
window.addEventListener('storage',e=>{if(e.key===WALLET_KEY){try{wallet=parseWallet(e.newValue);updateCoins();if(panel==='village')renderShop();}catch{walletReady=false;toast('El monedero ha cambiado y no se puede leer.');}}});
function chime(frequency=520){
 if(!sound)return;try{audio??=new AudioContext();void audio.resume();const o=audio.createOscillator(),gain=audio.createGain();o.type='sine';o.frequency.setValueAtTime(frequency,audio.currentTime);o.frequency.exponentialRampToValueAtTime(frequency*1.5,audio.currentTime+.12);gain.gain.setValueAtTime(.035,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.45);o.connect(gain).connect(audio.destination);o.start();o.stop(audio.currentTime+.5);}catch{sound=false;}
}
function renderState(){
 const active=game.active;$('#lobby-controls').hidden=active;$('#run-controls').hidden=!active;
 $('#dock-kicker').textContent=active?'YA FORMAS PARTE DE LA HISTORIA':'TU AVENTURA EMPIEZA AQUÍ';
 $('#dock-title').textContent=active?(game.phase==='paused'?'El valle se toma un respiro.':'Que corra el cerdo.'):'¿Cuántas bolsas llevas?';
 $('#step-chip').innerHTML=active?'<span class="status-dot"></span> RECORRIDO EN CURSO':'01 <span>/</span> ELIGE TU EQUIPAJE';
 $('#pause').innerHTML=game.phase==='paused'?`${icon('play',16)} Seguir`:`${icon('pause',16)} Pausa`;
 $('#pause').hidden=game.source!=='demo';
 $('#run-bags').textContent=`${game.bags} bolsa${game.bags>1?'s':''}`;
 document.querySelectorAll<HTMLButtonElement>('[data-bags]').forEach(b=>{const chosen=Number(b.dataset.bags)===game.bags;b.classList.toggle('chosen',chosen);b.setAttribute('aria-pressed',String(chosen));b.disabled=active;});
 document.body.classList.toggle('is-running',active);$('#acorn').hidden=true;$('#runner-panel').hidden=!active;
 $('#indicator-panel').hidden=!active;$('#terrain-legend').hidden=!active;if(!active)$('#race-result').hidden=true;
 if(game.phase!=='running')clearMovement();
}
function renderRunner(){
 $('#pocket-coins').textContent=String(villageRun.coins);$('#pocket-gems').textContent=String(villageRun.gems);
 $('#pile-roble').textContent=String(villageRun.piles[-1]);$('#pile-brasa').textContent=String(villageRun.piles[1]);
 $('#offer-value').textContent=String(villageRun.pocketValue);
 $<HTMLButtonElement>('#offer').disabled=!villageRun.enabled||!villageRun.atFence||!villageRun.pocketValue;
 $('#offer-hint').textContent=villageRun.activeSide===0?(horus.state.stage==='tp'||horus.state.stage==='sl'?'El recorrido ha terminado.':'Esperando la señal que active tu villa.'):!villageRun.enabled?'El recorrido está detenido.':!villageRun.pocketValue?'Recoge monedas o joyas primero.':villageRun.atFence?'¡Estás junto a la valla! Pulsa aquí o E.':`Muévete hacia ${villageRun.side===-1?'la derecha →':'la izquierda ←'}, hasta la valla.`;
 const feedback=villageRun.elapsed<villageRun.feedbackUntil?villageRun.feedback:'La flecha dorada señala a tu aldeano.';
 if($('#runner-feedback').textContent!==feedback)$('#runner-feedback').textContent=feedback;
 document.querySelectorAll<HTMLButtonElement>('[data-side]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.side)===villageRun.side)));
 $('#roble-active').textContent=villageRun.activeSide===-1?`TU VILLA · ${LEXICON.long}`:villageRun.activeSide?LEXICON.wait:LEXICON.wait;$('#brasa-active').textContent=villageRun.activeSide===1?`TU VILLA · ${LEXICON.short}`:villageRun.activeSide?LEXICON.wait:LEXICON.wait;document.querySelectorAll<HTMLButtonElement>('[data-side]').forEach(b=>b.disabled=true);
}
function renderIndicator(snapshot:IndicatorSnapshot){
 const stage=$('#signal-stage');stage.textContent=stageChip(snapshot.stage);
 stage.className=`stage-${snapshot.stage}`;$('#signal-value').textContent=stageLabel(snapshot.stage);$('#range-value').textContent=snapshot.stage==='range'?LEXICON.range:snapshot.stage==='sweep'?LEXICON.sweep:'—';
 $('#levels-value').textContent=snapshot.stage==='tp'?LEXICON.tp:snapshot.stage==='sl'?LEXICON.sl:snapshot.stage==='long'||snapshot.stage==='short'?LEXICON.entry:snapshot.stage==='retest'?LEXICON.structure:'—';
 const f=terrain.frame,y=(price:number)=>37+priceToGround(price,f)/f.width*60;
 const line=document.querySelector<SVGPolylineElement>('#chart-line')!;
 const values=game.history.slice(-100).map(p=>game.entry-p.offset/.8);
 line.setAttribute('points',values.map((v,i)=>`${i/Math.max(1,values.length-1)*240},${y(v)}`).join(' '));
 const range=document.querySelector<SVGRectElement>('#chart-range')!;
 range.setAttribute('y',String(y(snapshot.rangeHigh||game.price)));range.setAttribute('height',String(Math.max(0,y(snapshot.rangeLow||game.price)-y(snapshot.rangeHigh||game.price))));
 (['entry','stop','target'] as const).forEach(key=>{const element=document.querySelector<SVGLineElement>(`#chart-${key}`)!;element.style.display=snapshot[key]>0?'':'none';element.setAttribute('y1',String(y(snapshot[key])));element.setAttribute('y2',String(y(snapshot[key])));});
 $('#terrain-state').textContent=stageLabel(snapshot.stage);
}
function openPanel(name:string){clearMovement();if(game.source==='demo'&&game.phase==='running'){game.togglePause();renderState();}panel=name;if(name==='village')renderShop();else if(name==='history')renderHistory();else renderHelp();if(!dialog.open)dialog.showModal();}
function closePanel(){dialog.close();panel='';document.querySelectorAll('[data-nav]').forEach(el=>el.classList.toggle('selected',(el as HTMLElement).dataset.nav==='play'));}
function renderShop(){
 $('#dialog-kicker').textContent='UN POCO MÁS TUYO';
 $('#dialog-content').innerHTML=`<h2>Haz crecer tu villa.</h2><p class="dialog-intro">Pequeños detalles, grandes historias. Tus mejoras decoran el valle sin alterar el camino del cerdo.</p><div class="shop-balance">${icon('coin',21)}<strong>${wallet.coins.toLocaleString('es-ES')}</strong><span>monedas de villa</span></div><div class="shop-items">${(Object.keys(CATALOG) as Item[]).map((key,i)=>{const s=CATALOG[key],max=wallet.items[key]>=s.limit;return `<article class="shop-item"><div class="shop-art art-${key}">${icon(['flower','flag','spark'][i],42)}</div><div class="shop-text"><h3>${s.title}</h3><p>${s.description}</p><small>${wallet.items[key]} / ${s.limit} mejoras</small></div><button class="buy" data-buy="${key}" ${max||wallet.coins<s.cost||!walletReady?'disabled':''}>${max?icon('check',16):icon('coin',15)} ${max?'Completo':s.cost}</button></article>`;}).join('')}</div><div class="gentle-note">${icon('leaf',17)}<span>Solo moneda de villa. El tesoro oficial y tus bolsas se mantienen independientes.</span></div>`;
}
function renderHistory(){
 $('#dialog-kicker').textContent='RECUERDOS DEL CAMINO';
 $('#dialog-content').innerHTML=`<h2>Tu diario del valle.</h2><p class="dialog-intro">Cada paseo deja una historia. Estos recorridos de ensayo no tienen ganancias ni pérdidas oficiales.</p>${wallet.visits.length?`<div class="history-list">${[...wallet.visits].reverse().map(v=>`<article><span class="history-icon">${icon('flag',20)}</span><div><strong>${new Intl.DateTimeFormat('es',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v.date))}</strong><small>${v.bags} bolsa${v.bags>1?'s':''} · ${v.source==='demo'?'Demostración':'Solo visual'}</small></div><b>${Math.floor(v.distance)} m<small>${formatTime(v.seconds)}</small></b></article>`).join('')}</div>`:`<div class="empty-state">${icon('book',48)}<h3>La primera página está en blanco.</h3><p>Entra al valle y deja que el cerdo empiece la historia.</p><button class="primary" data-action="close">Volver al valle ${icon('arrow',18)}</button></div>`}`;
}
function renderHelp(){
 $('#dialog-kicker').textContent='BIENVENIDO A CRAZYPIG';
 $('#dialog-content').innerHTML=`<h2>Aquí manda el cerdo.</h2><p class="dialog-intro">Roble y Brasa disputan el mismo valle. Un cerdo un poco loco abre puertas, rompe arcos y persigue el botín mientras tú corres por el lateral.</p><div class="help-steps"><div><b>01</b><section><h3>Elige 1, 2 o 3 bolsas.</h3><p>Decides cuántas llevas antes de empezar. No puedes cambiarlas durante el recorrido.</p></section></div><div><b>02</b><section><h3>Corre por tu villa.</h3><p>Usa las flechas, WASD o los botones táctiles para recoger monedas y joyas. Cuando el cerdo embiste, despierta Villa Roble o Villa Brasa. Tú no eliges el sentido.</p></section></div><div><b>03</b><section><h3>Ofrece en la valla.</h3><p>Acércate a la valla y pulsa Ofrecer o la tecla E. El cerdo se lanza, el montón crece y la villa celebra.</p></section></div></div><div class="demo-note"><strong>Estás en una demostración.</strong><p>Los datos son simulados. El tesoro oficial no está conectado y no se ejecutan operaciones ni se liquidan premios oficiales.</p></div><button class="primary full" data-action="close">Entendido. ¡Al valle! ${icon('arrow',18)}</button>`;
}
function formatTime(n:number){return `${Math.floor(n/60).toString().padStart(2,'0')}:${Math.floor(n%60).toString().padStart(2,'0')}`;}
function begin(){if(!loaded||!game.start(performance.now())){toast('El valle todavía está cargando.');return;}villageRun.reset();horus.reset(game);clearMovement();acornID=null;lastIndicatorStage='range';renderState();renderRunner();chime(480);flashQuest('range',0);}
async function finish(){
 if(!game.finish())return;
 const visit={id:uniqueID(),date:new Date().toISOString(),seconds:game.elapsed,distance:game.distance,bags:game.bags,source:game.source};
 const reward=villageRun.settle()??0;
 const saved=await transaction(w=>w.coins>Number.MAX_SAFE_INTEGER-reward?null:({...w,coins:w.coins+reward,visits:[...w.visits,visit].slice(-30)}));acornID=null;renderState();
 toast(saved?`Recorrido guardado. +${reward} monedas de villa de tu mochila. Ofrendas: ${villageRun.deposited}.`:'No se pudo guardar el recorrido ni los recursos.');chime(380);
}
$('#start').addEventListener('click',begin);$('#pause').addEventListener('click',()=>{game.togglePause();renderState();});$('#finish').addEventListener('click',()=>void finish());
function offer(){if(game.phase!=='running'||!game.fresh(performance.now())||dialog.open)return;const value=villageRun.deposit();if(value){chime(720);valley?.offerImpact();$('#offer').classList.remove('juice-pop');void $('#offer').offsetWidth;$('#offer').classList.add('juice-pop');renderRunner();}}
$('#offer').addEventListener('click',offer);
document.querySelectorAll<HTMLButtonElement>('[data-move]').forEach(button=>{
 let pressedAt=0;
 button.addEventListener('pointerdown',e=>{if(game.phase!=='running')return;e.preventDefault();pressedAt=performance.now();button.setPointerCapture(e.pointerId);heldPointers.set(e.pointerId,button.dataset.move!);button.classList.add('held');});
 const release=(e:PointerEvent)=>{heldPointers.delete(e.pointerId);button.classList.remove('held');};
 button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
 button.addEventListener('click',e=>{if(game.phase!=='running'||dialog.open||!game.fresh(performance.now()))return;if(e.detail===0||performance.now()-pressedAt<200){const d=button.dataset.move;villageRun.nudge(d==='right'?1:d==='left'?-1:0,d==='up'?1:d==='down'?-1:0);renderRunner();}});
});
const movementKeys:Record<string,string>={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'};
document.addEventListener('keydown',e=>{if(dialog.open||(e.target as HTMLElement).matches('input,textarea,select')||!game.active)return;const direction=movementKeys[e.key];if(direction){e.preventDefault();if(game.phase==='running')heldKeys.add(direction);}if(e.key.toLowerCase()==='e'&&!e.repeat){e.preventDefault();offer();}});
document.addEventListener('keyup',e=>{const direction=movementKeys[e.key];if(direction)heldKeys.delete(direction);});
window.addEventListener('blur',clearMovement);
$('#acorn').addEventListener('click',async()=>{const id=acornID;if(!id||!game.active)return;acornID=null;$('#acorn').hidden=true;if(await transaction(w=>collect(w,id))){toast('+10 monedas de villa. ¡El valle tiene sus detalles!');chime(740);}nextAcorn=game.elapsed+20;});
document.addEventListener('click',async e=>{
 const button=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;
 if(button.dataset.bags){game.setBags(Number(button.dataset.bags));renderState();chime(340+game.bags*70);button.classList.remove('juice-pop');void button.offsetWidth;button.classList.add('juice-pop');}
 // Villa selection is owned by the indicator; cards are informative only.
 if(button.dataset.nav){const name=button.dataset.nav;if(name==='play'){if(dialog.open)closePanel();}else openPanel(name);}
 if(button.dataset.buy){const key=button.dataset.buy as Item;if(await transaction(w=>purchase(w,key))){renderShop();toast(`${CATALOG[key].title}: tu valle acaba de cambiar.`);chime(600);}else toast('No se pudo comprar esta mejora.');}
 switch(button.dataset.action){
  case 'save-result':void finish();break;case 'help':openPanel('help');break;case 'close':closePanel();break;
  case 'camera':if(valley)toast(valley.toggleCamera()?'Vista abierta del valle.':'De vuelta junto al cerdo.');break;
  case 'sound':sound=!sound;button.innerHTML=icon(sound?'sound':'mute',20);button.setAttribute('aria-label',sound?'Desactivar sonido':'Activar sonido');button.setAttribute('aria-pressed',String(sound));chime();break;
  case 'fullscreen':try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Tu navegador no permite activar la pantalla completa.');}break;
 }
});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePanel();}});
dialog.addEventListener('close',()=>{panel='';});
document.addEventListener('keydown',e=>{
 if(dialog.open||e.repeat||(e.target as HTMLElement).matches('input,textarea,button,a'))return;
 if(['1','2','3'].includes(e.key)){game.setBags(Number(e.key));renderState();}
 if(e.code==='Space'){e.preventDefault();if(!game.active)begin();else{game.togglePause();renderState();}}
 if(e.key.toLowerCase()==='p'){game.togglePause();renderState();}
});
document.addEventListener('visibilitychange',()=>{clearMovement();if(document.hidden&&game.source==='demo'&&game.phase==='running'){game.togglePause();renderState();}lastFrame=performance.now();});
async function boot(){
 try{valley=new ValleyScene($('#scene'),message=>{if(game.phase==='running'&&game.source==='demo')game.togglePause();renderState();toast(message);});await valley.load();loaded=true;$<HTMLButtonElement>('#start').disabled=false;$('#loading').remove();}
 catch(error){$('#loading').innerHTML=`<span>No se pudo abrir el valle 3D.</span><p>Comprueba la conexión y que tu navegador admita WebGL 2.</p><button class="primary" id="retry-load">Volver a intentar</button>`;$('#retry-load').addEventListener('click',()=>location.reload());console.error(error);}
 if(!walletReady)toast('El monedero guardado no se puede leer. No se modificará.');
 lastFrame=performance.now();raf=requestAnimationFrame(frame);
}
function frame(now:number){
 const dt=Math.min((now-lastFrame)/1000,.1);lastFrame=now;
 if(!document.hidden){
  const wasTerminal=horus.state.stage==='tp'||horus.state.stage==='sl';
  if(!wasTerminal||!game.active)feed.update(dt,now,game);
  void pollHorusLatest(now);
  const previousDistance=game.distance;
  if(!wasTerminal)game.tick(dt,now);
  const indicator=horus.update(game),priceFrame=terrain.update(indicator,game.generation,game.price);
  villageRun.setActiveSide(indicator.activeSide);
  const terminal=indicator.stage==='tp'||indicator.stage==='sl';
  const playable=game.phase==='running'&&game.fresh(now)&&!dialog.open&&!terminal&&indicator.activeSide!==0;
  villageRun.tick(dt,game.distance-previousDistance,dialog.open?{horizontal:0,forward:0}:movement(),playable);
  valley?.render(game,wallet,dt,now,villageRun,indicator,priceFrame);

  if(valley&&valley.fartEvent!==fartSeen){fartSeen=valley.fartEvent;toast('El cerdo tiene sus propias costumbres…');chime(110);}
  if(indicator.stage!==lastIndicatorStage){
   flashQuest(indicator.stage,indicator.direction);
   if(indicator.stage==='tp'||indicator.stage==='sl'){$('#race-result').hidden=false;$('#result-title').textContent=indicator.stage==='tp'?'¡Botín del día!':'Herida mortal.';$('#result-detail').textContent=`${indicator.stage==='tp'?LEXICON.tp:LEXICON.sl}. Solo ensayo. El tesoro oficial no cambia.`;$('#pause').hidden=true;clearMovement();chime(indicator.stage==='tp'?740:260);}
   lastIndicatorStage=indicator.stage;
  }
  renderIndicator(indicator);
  if(now-lastUI>150){$('#time').textContent=formatTime(game.elapsed);$('#distance').textContent=`${Math.floor(game.distance)} m`;$('#mode-label').textContent=storyMode?'Relato del valle':game.source==='demo'?'Modo demostración':game.fresh(now)?'Conectado · solo visual':'Esperando datos';if(game.active)renderRunner();lastUI=now;}
 }
 raf=requestAnimationFrame(frame);
}
// Explicit integration seam. It changes price visuals only; never places an order or sets official balances.
export const marketAdapter={
 connect(){if(!game.setSource('external'))return false;renderState();return true;},
 receive(quote:Quote){return game.source==='external'&&game.quote(quote,performance.now());},
};
/** Poll sanitized Oráculo snapshot when not in demo. Never places orders. */
let lastHorusPoll=0;
async function pollHorusLatest(now:number){
 if(game.source==='demo'||now-lastHorusPoll<2000)return;
 lastHorusPoll=now;
 try{
  const res=await fetch('/api/horus/latest',{cache:'no-store'});
  if(!res.ok)return;
  const data=await res.json() as {latest:null|Partial<IndicatorSnapshot>&{price?:number|null;stage?:string;direction?:-1|0|1;entry?:number|null;stop?:number|null;target?:number|null;rangeHigh?:number|null;rangeLow?:number|null};stale?:boolean};
  const latest=data.latest;if(!latest||!latest.stage)return;
  const stage=latest.stage as IndicatorSnapshot['stage'];
  const direction=(latest.direction??0) as -1|0|1;
  const activeSide: -1|0|1 = stage==='long'?-1:stage==='short'?1:0;
  const num=(v:number|null|undefined)=>typeof v==='number'&&Number.isFinite(v)?v:0;
  horus.applyExternalSignal({
   stage,direction,activeSide,
   rangeHigh:num(latest.rangeHigh),rangeLow:num(latest.rangeLow),
   rangeWidth:Math.max(.25,num(latest.rangeHigh)-num(latest.rangeLow)),
   entry:num(latest.entry),stop:num(latest.stop),target:num(latest.target),
   zoneHigh:num(latest.rangeHigh),zoneLow:num(latest.rangeLow),
   progress:0,
   label:data.stale?`${stageChip(stage)} · señal antigua`:stageChip(stage),
  });
  if(typeof latest.price==='number'&&latest.price>0){
   game.quote({symbol:'MNQ',price:latest.price,sequence:game.sequence+1,time:performance.now()},performance.now());
  }
 }catch{/* Oráculo offline: keep last snapshot */}
}
if(import.meta.env.DEV){
 Object.defineProperty(window,'__CRAZYPIG__',{value:{snapshot:()=>({phase:game.phase,bags:game.bags,price:game.price,offset:game.offset,elapsed:game.elapsed,distance:game.distance,historySize:game.history.length,wallet:structuredClone(wallet),renderer:valley?.stats(),ready:loaded}),marketAdapter},writable:false});
}
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);});
window.addEventListener('pageshow',e=>{if(e.persisted){lastFrame=performance.now();raf=requestAnimationFrame(frame);}});
if(new URLSearchParams(location.search).get('source')==='external')marketAdapter.connect();
void boot();
