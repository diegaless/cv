# Compatibilidad del primer catálogo

Los 38 identificadores internos de este directorio se conservan para enlaces y herramientas anteriores. Las 37 alternativas bloqueadas ya utilizan el [compositor propio](../originals/README.md); la entrada interna Clásico reutiliza el compositor público existente, sin modificar su PDF.

catalog-layouts.mjs contiene únicamente el orden histórico y las definiciones propias correspondientes. preview.js delega la composición. index.html redirige al banco local drafts/originals. Las medidas, fondos y estilos de referencia anteriores se retiraron del árbol actual. Las referencias antiguas quedan únicamente en el archivo privado de trabajo.

fixtures.mjs ofrece datos ficticios normales y largos, y el retrato sample-portrait-v1.png generado con ImageGen. La [procedencia del retrato](sample-portrait-v1.md) conserva el prompt. content.mjs contiene utilidades comunes de secciones y enlaces.

Las fuentes locales y sus licencias se mantienen como recursos de desarrollo en font-sources.json y fonts. El compositor actual utiliza únicamente Inter y EB Garamond de licencia OFL. Este directorio se excluye de Firebase Hosting; no permite elegir las alternativas en el editor público.
