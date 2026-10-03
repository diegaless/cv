# Miniaturas de la colección

Hay 144 imágenes WebP de 480 × 679 píxeles, obtenidas de primeras páginas compuestas por nuestro código con datos ficticios. Classic y Compact mantienen sus compositores públicos existentes. Las otras 142 corresponden a la colección propia: diez archivos original-*.webp y 132 owned-*.webp, repartidos en doce familias con once paletas.

Las 140 muestras compatibles incorporan el retrato ficticio generado con ImageGen, documentado en drafts/templates/sample-portrait-v1.md. Las cuatro que no admiten foto conservan muestras sin retrato. sources.json registra el diseño actual, compositor, fotografía, tamaño y SHA-256 de cada imagen. No son capturas ni recortes de los catálogos ajenos. La procedencia del archivo no sustituye la valoración jurídica del diseño.

Se retiraron las miniaturas antiguas, sus fondos decorativos y los recursos promocionales de terceros. Todas las alternativas siguen bloqueadas; solo Clásica se puede seleccionar.

## Regeneración

Con la raíz servida por HTTP y Playwright disponible, ejecutar node scripts/generate-design-previews.mjs http://127.0.0.1:PUERTO. Las capturas PNG van a .tools/owned-design-previews. Después, python3 scripts/encode-design-previews.py actualiza los WebP y el manifiesto con Pillow. Ambos admiten listas de IDs para actualizaciones parciales. No abren ni escriben archivos PDF.
