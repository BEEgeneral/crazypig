# TradingView y Horus: administración local

Abre http://localhost:4173/admin con el servidor en marcha (`npm run dev -- --port 4173`). El panel no aparece en la navegación de jugadores. Exige una sesión con cookie HttpOnly/SameSite=Strict y solo admite conexiones desde este ordenador. También funciona con `npm run preview -- --port 4173`, conservando los archivos `server/` y la configuración de Vite junto a `dist/`.

La primera ejecución genera `~/.config/crazypig/admin.json`, fuera de Dropbox y de la raíz web, con permisos 0600. El campo `password` abre el panel. `webhookKey` es una credencial diferente, exclusiva del receptor. Nunca uses contraseñas de TradingView o del bróker en esos campos. Para revocar todas las sesiones, reinicia el servidor; caducan a las ocho horas. La clave no se incluye en el bundle del juego.

## Qué está implementado

- Gráfico oficial TradingView de consulta, MNQ continuo y velas de 5m en horario de Nueva York. En la prueba visual TradingView rechazó MNQ con «Símbolo solo disponible en TradingView». Por ello el widget es una sección opcional y el acceso a TradingView completo es la opción principal. Otros símbolos también pueden tener retraso o restricciones. No ejecuta Pine privado.
- Acceso a TradingView completo para configurar el indicador en la cuenta del administrador.
- Receptor `POST /api/horus/webhook`: exige clave, valida símbolo MNQ, fecha, dirección, contratos y niveles; descarta duplicados y eventos anteriores. No guarda claves recibidas en el historial. Registro en memoria de los últimos 30 eventos; se borra al reiniciar.
- Panel de rango, entrada, stop y objetivo realmente recibidos; estados explícitos de conexión.
- Copia descargable `server/Horus-CrazyPig.pine`, derivada del texto aportado por el usuario. El original se conserva. El generador reproducible es `scripts/prepare_horus_bridge.py`.

## Activación pendiente en TradingView

1. Compilar la copia en el editor Pine de TradingView. Todavía no se ha validado en su compilador ni comparado sesión a sesión con el original.
2. Usar un gráfico estándar MNQ de 5 minutos. Verificar los ajustes y datos manuales que ya requiere Horus. La copia solo añade transporte; no certifica el modelo, los límites de cuenta ni ejecuciones reales.
3. Activar «Enviar estado a CrazyPig» y pegar la clave de recepción. Este modo sustituye los mensajes de texto de `alert()` por un JSON por cierre de vela. Las condiciones de alerta originales siguen disponibles. Para mantener avisos intrabar personales, usar otra instancia con CrazyPig desactivado y su alerta separada.
4. Publicar un receptor HTTPS de producción (puerto 443) que utilice este contrato. **No publicar Vite ni un túnel del servidor de desarrollo.** El localhost actual no es accesible desde los servidores de TradingView.
5. Crear la alerta «Any alert() function call» con la URL del receptor. TradingView exige 2FA para webhooks. Recrear la alerta tras cambios de script o ajustes. Verificar en ambos extremos la recepción.

La recepción solo se ha probado con mensajes sintéticos en pruebas aisladas. Ninguna alerta de una cuenta real ha llegado a esta instalación todavía.

## Contrato v1

Campos obligatorios: `version: 1`, `key`, `id` único por símbolo y vela, `symbol` (ej. `CME_MINI:MNQU2026`), `time` Unix en milisegundos del envío, `stage`, `direction` (-1/0/1), `maxContracts` (0–3), `price`, `rangeHigh`, `rangeLow`, `entry`, `stop`, `target`. Los niveles no disponibles se envían como `null`; precio siempre obligatorio. La antigüedad máxima al recibir son dos minutos, con tolerancia futura de diez segundos.

Fases: `range`, `sweep`, `structure`, `retest`, `long`, `short`, `closed`, `flat`. `maxContracts` recoge el número calculado del modelo para la señal, no un permiso para operar ni una lectura del bróker. `closed` informa del cierre del modelo; no acredita beneficio, pérdida ni ejecución de cuenta. El servidor no calcula P&L a partir de este evento.

## Límite actual respecto al juego

El receptor puede alimentar la presentación vía `GET /api/horus/latest` cuando el cliente usa `source=external` (snapshot sanitizado, sin secretos ni órdenes). El modo demostración sigue usando la máquina Will en `HorusDemo` (barrida + breaker). El widget no proporciona datos a CrazyPig ni existe extracción de su iframe.

Antes de conectar la pista hay que implementar el ciclo de señales externas sin mezclarlo con el demo, la misma transformación de precios para pista/vallas/SL/TP, una fuente continua autorizada de cotizaciones del mismo contrato MNQ y tratamiento de desconexiones. Los resultados oficiales necesitarían confirmaciones de ejecución del bróker, no solo alertas del indicador. No hay órdenes, conexión Apex ni cambios al tesoro oficial.

Referencias oficiales: [widgets y Pine](https://www.tradingview.com/widget-docs/faq/general/), [datos de widgets](https://www.tradingview.com/widget-docs/faq/data/), [webhooks](https://www.tradingview.com/support/solutions/43000529348-how-to-configure-webhook-alerts/), [alertas y sus límites](https://www.tradingview.com/pine-script-docs/faq/alerts/).
