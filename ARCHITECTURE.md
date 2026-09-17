# CrazyPig — Arquitectura Oráculo / Escudero / Tesoro

Fecha: 2026-09-17. Sin órdenes reales en v1 de esta base.

## Tres planos

| Plano | Rol | Piezas actuales |
|---|---|---|
| **Oráculo** | ¿Hay setup Will hoy? | Pine Will/Horus → `POST /api/horus/webhook` → snapshot `GET /api/horus/latest` → `HorusDemo.applyExternalSignal` / máquina demo |
| **Escudero** | Gesto humano = consentimiento | UI «Ofrecer»; `valley-laws.canOffer` bloquea 2ª embestida, DLL, cupo, flat 16:50 NY, máx 3 MNQ |
| **Tesoro** | Broker del jugador | Pendiente (OAuth Tradovate lectura → luego orden tras tap). El tesoro oficial del prototipo sigue desconectado |

```
[ Will_Apex / Horus Pine ] --webhook JSON--> [ server/admin.mjs ]
                                                    |
                                         /api/horus/latest
                                                    |
                                              [ Cliente juego ]
                                                    |
                                          tap «Ofrecer» (humano)
                                                    v
                                         [ Tradovate OAuth — futuro ]
```

## Módulos clave

- `src/horus.ts` — stages Will: `range → sweep → structure → retest → long|short → tp|sl|flat`. Demo exige barrida de Hi/Lo y confirmación tipo breaker antes de embestir.
- `src/valley-laws.ts` — compliance: 1 cargo/día (2º solo con `beAllowed`), DLL 280, profitCap 750, maxMnq 3, flat tras 16:50 `America/New_York`.
- `src/lexicon.ts` — léxico trading → narrativa ES del valle (niebla, barrida, cuerno, embestida, herida, botín, campana).
- `server/admin.mjs` — receptor autenticado por `webhookKey`; panel admin con cookie; `/api/horus/latest` solo presenta niveles (sin secretos, sin auto-orden).

## Línea roja

Ningún endpoint coloca órdenes. La señal es contenido de quest; la ejecución requiere gesto del titular de la cuenta. Ver `docs/CONCEPTO_Puente_Juego_Broker_ES.md` y `docs/TRADINGVIEW_ADMIN.md`. Señal canónica de referencia: `docs/Will_Apex_Senal_Simple.pine` (el juego espeja stages; no hay OAuth ni órdenes Tradovate en esta base).

## Modo externo (local)

`?source=external` o `marketAdapter.connect()`: el cliente deja de usar `HorusDemo` temporizado y aplica el último snapshot del Oráculo vía `/api/horus/latest`. Sigue siendo solo visual.
