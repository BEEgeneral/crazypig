# CrazyPig · Torneo del valle

## Dirección aprobada

Torneo medieval luminoso y cómico: cerdo expresivo con casco, villas azul y roja, madera, estandartes, gradas y hierba. Interfaz de pergamino y latón sobre madera oscura. El cerdo ocupa el centro; las acciones y las monedas de villa son una capa independiente del recorrido.

## Implementado en esta versión

- Cerdo importado de `CP_Pig.blend`, orientado y colocado sobre el suelo. Ojos, pupilas y remaches añadidos; materiales de piel, acero y cuero. Copia editable: `art/CrazyPig_Hero.blend`. Archivo web: `public/models/pig-hero.glb`.
- Exportación corregida de los colores de vértice de la biblioteca de edificios, árboles y vallas.
- Gradas con público instanciado, colores de los equipos, banderas, texturas procedurales de hierba y arena, luz cálida y sombras.
- Retratos proporcionados por el usuario de Sir Edrick y Lord Alaric integrados en marcos heráldicos. Son imágenes, no nuevos personajes humanos 3D.
- Interfaz adaptada a escritorio y móvil. Selección de 1–3 bolsas, recorrido, pausa en demostración, final manual, diario y tienda cosmética conservados.
- Durante el recorrido la cámara se coloca como una carrera hacia delante. Los laterales contienen un carril por villa, un aldeano controlable, 40 recursos reciclados, corredores de fondo y montones visibles junto a las vallas.
- El panel Horus muestra un replay local del Pine: rango 06–09, barrida, estructura, retorno y resultado 1R. El ancho de la carretera se escala con el ancho del rango y la villa activa se asigna por dirección (LONG Roble, SHORT Brasa).
- El héroe tiene movimiento procedural de carrera con cuatro patas, cola, rebote, polvo y puffs verdes periódicos para el gag del pedo. El aviso se acompaña de una señal sonora solo cuando el usuario activa el sonido.

## Procedencia

Referencias originales en `/Users/albertogala/Downloads/From：Local Computer/Dropbox/PROYECTOS/CrazyPig/`. Se mantienen intactas.

- Cerdo: `CP_Pig.blend`.
- Azul: `Señores/Default_Seor_Medieval_de_Escudo_Azul_Sir_EdrickApariencia_Rop_3.jpeg`.
- Rojo: `Señores/Default_Seor_Medieval_de_Escudo_Rojo_Lord_AlaricApariencia_Ro_3.jpeg`.
- Referencia de dirección artística: `x2e9GnoITxupQsE6qMEzjg.jpeg`.

## Límites y siguientes entregas

La escena conserva edificios y público simplificados; no reproduce todavía el nivel cinematográfico de la portada. El cerdo usa movimiento procedural del conjunto, sin rig esquelético ni ciclo de patas independiente. Los señores humanos necesitan modelado y animación finales.

El feed actual es simulado. `marketAdapter` acepta precios externos solo para visualización; no conecta Apex, no envía órdenes, no agrupa cuentas y no liquida el tesoro oficial. Las reglas reales del Pine deben llegar por un puente de alertas para sustituir `HorusDemo`; el indicador original sigue siendo una ayuda visual de ejecución manual. Agua, alimentos y alimentación del cerdo son mecánicas futuras. En esta iteración ya funcionan monedas y joyas: las joyas valen cinco monedas de villa, se recogen al contacto y se ofrecen únicamente junto a la valla. Los montones y el júbilo de la villa son visuales.

Las animaciones y compras cosméticas no modifican `Game.offset`, contratos ni resultados operativos. La presentación comprime desplazamientos grandes para mantener al cerdo en pista; la posición lógica se conserva.
