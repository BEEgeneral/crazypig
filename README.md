# CrazyPig Web

Prototipo jugable en Three.js para navegador de escritorio y móvil. Consulta `ARCHITECTURE.md` (Oráculo / Escudero / Tesoro) y `ART_DIRECTION.md` para la dirección visual, procedencia de recursos y límites actuales.

Arquitectura de producto (juego ↔ señal ↔ bróker, cumplimiento Apex): [`docs/CONCEPTO_Puente_Juego_Broker_ES.md`](docs/CONCEPTO_Puente_Juego_Broker_ES.md). Señal canónica (Pine): [`docs/Will_Apex_Senal_Simple.pine`](docs/Will_Apex_Senal_Simple.pine) — el juego espeja esos stages; no sustituye al indicador.

## Desarrollo

```sh
npm ci
npm run dev -- --host 0.0.0.0 --port 4173
```

Abre `http://localhost:4173/`. En un móvil de la misma red, usa la dirección de red que muestra Vite. Se requiere WebGL 2. El monedero y el diario se guardan localmente por navegador/origen; no hay sincronización entre dispositivos.

```sh
npm run build
npm test
```

## Límites de esta base (Apex / Tradovate)

**No hay órdenes reales ni OAuth de Tradovate.** El tesoro oficial permanece desconectado. `GET /api/horus/latest` y el tap «Ofrecer» son presentación y consentimiento de prototipo: ningún endpoint coloca, modifica ni cierra operaciones.

Apex (PA / Live) sigue prohibiendo automatización desatendida, que un sistema o tercero gestione la cuenta, y el sharing entre traders. Esta base no implementa copy trading ni auto-orden por webhook. Cualquier puente futuro exige gesto humano del titular, OAuth propio y aprobación escrita de Apex — ver el concepto citado arriba.

No añadas secretos de bróker ni de TradingView al repositorio. Credenciales de admin local viven fuera del repo (`~/.config/crazypig/`).

## Arte

`scripts/export_web.py` exporta la biblioteca de Blender del proyecto contiguo `CrazyPigUnreal` e incluye el atributo de color de vértice `Color`.

`scripts/prepare_reference_pig.py` recibe, tras `--`, la ruta absoluta de este proyecto y la ruta al `CP_Pig.blend` original. Ejecutarlo con Blender en segundo plano y `--disable-autoexec`. Escribe únicamente una copia derivada dentro de este proyecto y su GLB.

## Controles

Selecciona 1, 2 o 3 bolsas y entra al valle. La vista cambia a una pista infinita: el cerdo avanza hacia el horizonte y el jugador corre en el carril lateral de su villa. La preparación del Oráculo (Horus/Will) exige barrida del rango y confirmación tipo breaker antes de LONG/SHORT; el resultado de ensayo llega cuando el precio sintético toca SL o TP. Consulta `ARCHITECTURE.md` (Oráculo / Escudero / Tesoro) y el léxico en `src/lexicon.ts`. Flechas, WASD y los botones táctiles mueven al aldeano; E u Ofrecer deposita monedas y joyas junto a la valla. Cuando la demostración muestra LONG o SHORT, la tarjeta correspondiente bloquea tu villa activa y el otro lateral queda en manos de corredores simulados. Las tarjetas son informativas: la señal selecciona la villa, nunca el jugador. En modo demostración puedes pausar y terminar el recorrido. Mi villa permite mejoras cosméticas; Diario muestra los recorridos guardados. Teclas: 1–3 seleccionan bolsas, espacio inicia o pausa, P pausa.

El tesoro oficial permanece desconectado. Este prototipo no ejecuta operaciones financieras.

## TradingView privado

[Panel de administración local](http://localhost:4173/admin), con clave y sesión privada, fuera de la navegación de jugadores. Incluye gráfico TradingView de consulta, recepción de alertas Horus y una copia del Pine con salida JSON. Consulta [configuración, acceso y límites](docs/TRADINGVIEW_ADMIN.md). El receptor está preparado; `GET /api/horus/latest` expone el último snapshot sanitizado al cliente cuando `source=external` (solo visual, sin órdenes). Las alertas reales de TV y el Tesoro (OAuth) siguen pendientes.

## Terreno horizontal y personaje articulado

La pista conserva el suelo horizontal. El eje longitudinal representa tiempo y el transversal precio: cotizaciones mayores hacia Roble (−Z), menores hacia Brasa (+Z). `price-terrain.ts` proporciona una transformación compartida para cerdo, huellas, rango y niveles. La escala se ajusta durante la preparación para incluir la barrida y queda fija al entrar. La franja del rango es independiente de entrada/SL/TP; no se recorta la posición del cerdo a la franja.

Los niveles longitudinales se identifican sobre el suelo y en el minimapa. TP/SL detienen el avance del ensayo y muestran su resultado; el botón de guardar liquida solo los recursos de villa restantes. No hay liquidación oficial ni datos reales conectados.

El nuevo `PigActor` usa anatomía procedural, cuatro patas articuladas con apoyo sobre el plano, movimiento de cabeza, orejas y cola. Sustituye en esta vista al GLB estático, que se conserva intacto. No es un rig de Blender ni un modelo fotorrealista. Las texturas, materiales, iluminación y proporciones de los aldeanos se han hecho más naturales; las construcciones siguen utilizando los recursos originales.

Verificaciones: escala estable tras entrada, separación rango/SL/TP, salidas por precio en LONG/SHORT, movimiento lateral sin recolocaciones por fotograma y controles de 44 px a 390 px de ancho sin desbordamiento horizontal.
