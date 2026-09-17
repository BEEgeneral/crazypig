# Crazy Pig — Concepto: juego que opera (mínimo coste + compliance)

**Fecha:** 2026-09-17  
**Estado:** base de producto para que Código / Juegos / Estrategia / Investigación desarrollen  
**Código actual:** `Dropbox/CrazyPig/CrazyPigWeb` (Three.js + Vite + HorusDemo + admin webhook)

---

## 1. Visión (lo que quieres)

- El jugador **solo ve un juego** (torneo del valle, cerdo, villas, ofrendas).
- Por detrás: **reglas Apex estrictas** + **indicador tipo Will_Apex** + conexión a **TradingView (señal)** y **Tradovate (ejecución / balances)**.
- Cada jugador opera **su** cuenta; puede agrupar varias PAs vía torneos / premium.
- “Ganar dinero” = PnL real de su(s) cuenta(s) Apex/Tradovate, **narrado** como botín del torneo — no un casino interno con cash-out mágico.

---

## 2. Línea roja (sin esto el producto muere)

Apex (PA/Live) prohíbe de forma explícita:
- automatización / bots / set-and-forget sin intervención humana,
- que **otra persona o sistema** gestione o “influya” la cuenta (señales ajenas tipo copy service),
- sharing de cuentas entre traders distintos.

**Implicación de diseño (no negociable en v1):**

| Prohibido | Permitido (hipótesis a validar con Apex por escrito) |
|---|---|
| Servidor coloca órdenes solo porque salió la alerta | Jugador **pulsa** “Ofrecer / Entrar al valle” y eso dispara la orden en **su** Tradovate |
| Un maestro opera N cuentas de terceros | Cada OAuth = **titular** de esa cuenta |
| Bot 24/7 desatendido | Sesión de torneo con jugador presente; flat forzado a hora del valle |
| Señales vendidas a cuentas ajenas | Señal = **contenido del quest**; la decisión de ejecutar es del jugador |

> Tradovate Group Copier nativo de Apex sirve para **multi-cuenta del mismo titular**, no para TV y no sustituye el tap humano.

**Acción legal/producto:** antes de dinero real, carta a Apex Support describiendo “UI gamificada + confirmación humana + OAuth propio + copier solo cuentas propias”. Guardar aprobación.

---

## 3. Arquitectura ingeniosa y barata: “Oráculo + Escudero”

### Idea clave
No metas TradingView ni el DOM del bróker dentro del juego.  
Separas **tres planos**:

1. **Oráculo (señal)** — ¿hay setup Will hoy?  
2. **Escudero (jugador)** — un gesto en el juego = consentimiento de orden.  
3. **Tesoro (broker)** — OAuth Tradovate del jugador: balances, fill, flat.

```
[ Will_Apex en TV ] --webhook JSON--> [ CrazyPig Cloud ]
                                            |
                     quest event ----------+-----> [ Cliente juego ]
                                            |            |
                                            |     tap "Ofrecer"
                                            v            v
                                   [ API Tradovate OAuth del jugador ]
```

### Por qué es barato

| Pieza | Coste orientativo | Nota |
|---|---|---|
| **1 sola** cuenta TradingView de pago (Essential+) con webhook | ~15 USD/mes | Oráculo compartido de *contenido* de quest (no “gestiona” cuentas) |
| Cloudflare Worker / Fly.io / Railway receptor HTTPS | ~0–10 USD/mes | Contesta en &lt;3 s (límite TV) y encola |
| DB (Supabase free / Turso) | 0–25 USD/mes | quests, sesiones, mapeo villa↔cuenta |
| Tradovate OAuth multi-usuario | **Partner Ecosystem** (revisión; posible fee) | Cada jugador trae su cuenta → **tú no pagas datos de mercado ni margen** |
| Datos MNQ en el juego | 0 | Cotización desde **sesión Tradovate del jugador** o demo sintética |
| Widget TV embebido | Evitar | Ya falló MNQ en el admin; caro en UX y ToS |

**No** montes feed CME propio ni VPS de Ninja por jugador. **BYO broker** = el truco de coste.

### Flujo enmascarado (onboarding = “Inscripción al torneo”)

1. **Elegir casa** → en realidad: crear/login CrazyPig.  
2. **Jurar lealtad al valle** → OAuth Tradovate (demo primero).  
3. **Recibir estandarte** → lectura de cuentas/balances → “tesoro / prestigio”.  
4. **Leyes del valle** (obligatorias, texto de juego): 1 embestida/día, herida máx (DLL), botín máx (+750), máx 3 jabalíes (contratos), retirada al toque de campana (flat).  
5. Opcional premium: más villas = más PAs del **mismo** OAuth (Group Copier detrás).

En pantalla: cero velas, cero “LONG/SHORT”, cero “stop loss”.  
Léxico:

| Trading | Juego |
|---|---|
| Rango 06–09 | Niebla de la mañana |
| Sweep / manipulación | Barrida de jabalíes |
| Breaker | Cuerno / puerta del valle |
| Entrada | Ofrecer / Embestida |
| SL | Herida mortal |
| TP 1R | Botín del día |
| Flat 16:50 | Campana del castillo |
| DLL −280 | Límite de sangre |
| +750 | Cupo de botín |
| 1 trade (2º tras BE) | Una embestida (segunda solo si empataste) |

---

## 4. Modelo de “ganar dinero” (efectivo y creíble)

1. **Fase Arena (gratis / papel):** oro cosmético, ranking, sin broker. Valida retención.  
2. **Fase Escudero:** OAuth demo Tradovate; “tesoro” = balance demo; tap ejecuta en demo.  
3. **Fase Caballero (premium):** OAuth live/PA Apex del jugador; el botín del diario = PnL real **de su cuenta**; cash-out = payout Apex (fuera del juego o deep-link a portal Apex).  
4. Monetización CrazyPig: **suscripción / pases de torneo / cosméticos**, no “invertimos tu dinero”. El riesgo de mercado lo asume **su** cuenta prop.

Así evitas ser un bróker o un pool de inversión.

---

## 5. Qué mejorar del prototipo actual

### Producto / UX
- Sustituir `HorusDemo` (timer falso) por **máquina de estados idéntica a Will_Apex** (mismos stages del contrato webhook ya documentado).  
- Diccionario de narrativa (tabla §3) en UI.  
- Onboarding “Inscripción al torneo” (hoy no existe el puente jugador).  
- Un solo gesto irreversible: **Ofrecer** = orden (con countdown y preview de “riesgo de herida” en lenguaje de juego).

### Señal
- **Una fuente de verdad:** Pine = evolución de `Will_Apex_Senal_Simple` (+ JSON bridge que ya bosqueja `Horus-CrazyPig.pine`). Matar divergencia Horus v7/v8/demo.  
- Admin actual: receptor OK como base; falta fan-out a partidas y **no** auto-orden.

### Broker
- Prioridad 1: OAuth **solo lectura** (tesoro, posiciones).  
- Prioridad 2: place order + brackets SL/TP tras tap.  
- Multi-cuenta: Group Copier Tradovate nativo (gratis en Apex multi), no reinventar replicador caro.

### Infra low-cost
- Webhook edge (Worker) → cola → clients WebSocket.  
- No túnel ngrok en prod.  
- Secrets fuera de Dropbox (ya bien: `~/.config/crazypig/`).

### Compliance engine (“Leyes del valle”)
Módulo duro en servidor: bloquea Ofrecer si: fuera de ventana, ya hubo embestida, herida/botín al límite, flat, sin confirmación humana, señal caducada (&gt;2 min como el contrato v1).

---

## 6. Alternativas de conexión (ranking coste/efectividad)

| # | Enfoque | Coste | Efectividad | Riesgo Apex |
|---|---|---|---|---|
| **A (recomendado)** | Oráculo TV único + tap humano + OAuth Tradovate BYO | Muy bajo | Alta UX + control | Medio (mitigado por tap + titular) |
| B | Cada jugador su TV + webhook propio | Alto (N× suscripción TV) | Máxima “personalización” | Menor señal compartida; peor onboarding |
| C | Auto-orden sin tap (alerta → API) | Bajo ops | “Mágico” | **Alto / probable ban** |
| D | Solo cosmético + PnL leído (sin órdenes desde app) | Mínimo | Jugadores siguen en Tradovate a mano | Bajo; menos “juego opera” |
| E | Partner tipo PickMyTrade / bridge comercial | Fee por usuario | Rápido | Depende de su ToS + Apex approval |

**Recomendación Director:** empezar **D → A**. Primero leer tesoro; luego Ofrecer=orden. Nunca C en PA.

---

## 7. Roadmap mínimo para otros agentes

1. **Estrategia:** modelo de negocio (Arena / Escudero / Caballero), pricing, riesgos legales.  
2. **Juegos:** GDD léxico + loop diario 15:00–16:30 Madrid alineado sesión Will.  
3. **Código:**  
   - unificar contrato señal Will_Apex ↔ juego,  
   - Worker webhook,  
   - OAuth Tradovate (demo),  
   - compliance engine,  
   - tap Ofrecer → order demo.  
4. **Investigación:** partner Tradovate Ecosystem + carta Apex.  
5. **Trading (Director):** mantener Pine canónico; CrazyPig consume, no forka lógica.

---

## 8. Definición de éxito (v1)

- Jugador nuevo completa “Inscripción” sin ver la palabra trading.  
- En demo: quest por señal real (o replay) → Ofrecer → fill demo → diario de botín.  
- Leyes del valle impiden 2ª embestida / overrun DLL / operar tras campana.  
- Coste infra &lt; ~50 USD/mes hasta 100 jugadores demo.  
- Cero órdenes sin gesto humano logueado.

