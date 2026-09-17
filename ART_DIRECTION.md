# CrazyPig · Torneo del valle

## Dirección aprobada

Torneo medieval luminoso y cómico: cerdo expresivo con casco, villas azul y roja, madera, estandartes, gradas y hierba. Interfaz de pergamino y latón sobre madera oscura. El cerdo ocupa el centro; las acciones y las monedas de villa son una capa independiente del recorrido.

## Soft reboot (capa de fantasía)

Se rehízo la capa jugable. **No** se tocó el cerebro de producto: máquina Will (`HorusDemo` + `applyExternalSignal`), `valley-laws`, webhook admin / `GET /api/horus/latest`, ni órdenes reales.

Referencias de feel: Clash Royale / Fall Guys (silueta leíble), Mario Kart / Temple Run (pista y persecución), Crossy Road (impacto inmediato). Prioridad: que el cerdo **choque** con el gráfico, no que lo etiquete.

### Cerdo

`PigActor` procedural: proporciones cómicas, casco de acero con cresta de latón, hocico grande, galope de cuatro patas, poses de smash / skid / charge / crash / lunge / walk. El gag de polvo/pedo sigue siendo presentación.

### Chart → colisión (mapa)

Eje largo = tiempo (scroll). Eje transversal = cotización (`price-terrain`, Roble = precio alto / −Z). Los props se colocan en esos niveles y se rompen al cambiar de stage Will.

| Stage Will | En pista (lenguaje del valle) |
|---|---|
| `range` | Niebla / corredor estrecho; el cerdo trota |
| `sweep` dir −1 | **Barrida en cumbres de Roble**: arco azul se destroza, partículas, shake |
| `sweep` dir +1 | **Barrida en puertas de Brasa**: arco rojo igual |
| `structure` | Cerdo se clava (skid, polvo); cuerno/puerta brilla |
| `retest` | **Rompe la puerta**: el cerdo carga y parte el travesaño |
| `long` / `short` | Embestida; carril Roble (azul) o Brasa (rojo); galope |
| `tp` | Cofre de botín; monedas al impacto |
| `sl` | Muro de espinas / escudo; KO cómico, estrellas, tumba |
| `flat` | Campana del castillo; el cerdo camina |

Wicks fuertes: el cerdo se tambalea en Z y golpea barriles. **Ofrecer** = lunge del cerdo + burst (sigue sin orden real).

Implementación: `src/stage-track.ts` (`chartBeat`, `StageTrack`). Relato rápido para ensayos: `?story=1` (sigue usando `HorusDemo`, solo cambia las cotizaciones sintéticas).

### Cámara y HUD

Cámara de persecución con follow al eje de precio y shake en impactos. HUD de pergamino/latón: **QUEST DEL VALLE**, toasts en léxico (`Niebla`, `Barrida`, `Cuerno`, `Embestida`, `Botín`, `Herida`). Cero LONG/SHORT/SL/TP/MNQ en UI de jugador.

## Implementado en esta versión

- Carriles Roble/Brasa saturados, bordillos de arena, niebla de mañana, arcos rompibles, puerta/cuerno, cofre, espinas, barriles.
- Toasts de quest y flash de pergamino en cada cambio de stage.
- Retratos de Sir Edrick y Lord Alaric (imágenes). Admin y tesoro oficial desconectados.

## Procedencia

Referencias originales en Dropbox CrazyPig. Se mantienen intactas.

- Cerdo: `CP_Pig.blend` (el runtime usa `PigActor` hasta haber GLB).
- Azul / rojo: retratos de Edrick y Alaric.

## Límites

Sin OAuth Tradovate ni órdenes. `marketAdapter` y `?source=external` son solo visuales. Cosméticos y colisiones no escriben `Game.offset`, contratos ni tesoro oficial.
