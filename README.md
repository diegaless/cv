# Creador de CV

Aplicación estática en [cvapp.diegoayala.com](https://cvapp.diegoayala.com) para crear, guardar y descargar currículums. Permite acceso con Google/Firebase o uso como invitado. No incorpora empleos, entrevistas, cartas, distribución, publicidad, seguimiento ni funciones de IA.

## Uso y datos

- El editor ofrece texto, viñetas, enlaces, foto opcional y secciones ordenables, con vista A4 y guardado automático en la cuenta.
- PDF utiliza la impresión del navegador: Guardar como PDF, A4 y sin encabezados del navegador. Word descarga un DOCX editable; TXT y JSON permiten exportar el contenido.
- Invitado conserva los CVs en sessionStorage de la pestaña. Guardar en mi cuenta copia únicamente el CV abierto a la cuenta elegida.
- Los CVs privados se guardan en users/{uid}/cvs/{cvId}. Los borradores locales se separan por cuenta. Mi cuenta permite exportar los datos del servidor, retirar sus borradores locales y eliminar la cuenta, tras confirmación y nueva verificación con Google.

La eliminación retira primero los CVs, después los borradores del navegador y finalmente el usuario de Authentication. No elimina la cuenta personal de Google. Un marcador técnico bloquea escrituras de sesiones antiguas; si hay un fallo, Mi cuenta permite completar el proceso. No existe un servicio que termine automáticamente el borrado con la pestaña cerrada.

## Plantillas y recursos

La galería conserva 144 tarjetas: Clásica es la única seleccionable; 143 alternativas aparecen bloqueadas. Los CVs Compacta existentes conservan su diseño.

Las 142 alternativas del grupo Más plantillas tienen composiciones propias en [drafts/originals](drafts/originals/README.md). Diez diseños originales previos se mantienen y las otras 132 tarjetas se sustituyen por doce familias con once variantes de paleta cada una. Los identificadores anteriores se conservan únicamente por compatibilidad. La [revisión individual](docs/legal/revision-plantillas.md) registra las sustituciones. No se presentan como 132 estructuras independientes ni como una certificación jurídica.

Las miniaturas locales se generan con nuestras composiciones y datos ficticios; 140 incluyen un [retrato generado con ImageGen](drafts/templates/sample-portrait-v1.md). Las cuatro restantes no admiten foto. El compositor público Clásico, los CVs guardados y todos los PDF existentes se conservan. Se retiraron los logos, imágenes promocionales, fondos, miniaturas y compositores de referencia anteriores. Los archivos tipográficos conservados incluyen su documentación de licencia.

## Privacidad y operación

Responsable: Diego Ayala Bernal. Contacto autorizado: diego.ayala.bernal2@gmail.com. La [política pública](privacidad.html) explica uso de Google, almacenamiento, transferencias, conservación y derechos; no carga Firebase ni seguimiento. Este correo es Gmail personal y no se le atribuye el contrato de Workspace.

Los [procedimientos](docs/legal/README.md) incluyen registro del tratamiento, proveedores, seguridad, solicitudes de derechos y conservación. Los expedientes y evidencias particulares se guardan en .private-compliance, excluido de Git y del sitio publicado. Quedan pendientes NIF y domicilio publicable para completar el aviso legal de actividad económica, un canal profesional adecuado y evidencia particular de los acuerdos aplicables.

Firestore está en Madrid (europe-southwest1); Authentication procesa datos de acceso en EE. UU. Las reglas validan propietario, tipos, tamaños y metadatos tanto al crear como al modificar. Los marcadores de eliminación no se pueden listar ni modificar desde el cliente. Hay límites documentados sobre cuotas y validación de elementos internos de listas.

La conservación de marcadores se revisa mensualmente mediante scripts/privacy-maintenance.mjs. La orden sin argumentos es una simulación: solo permite retirar un marcador de al menos 30 días si Authentication ya no contiene la cuenta y Firestore no contiene ningún CV. Nunca elimina CVs por inactividad. --apply realiza la retirada y deja un expediente privado. La revisión es administrativa, no una tarea automática programada.

## Desarrollo y comprobaciones

Servir la raíz por HTTP, por ejemplo python3 -m http.server 4000, y abrir http://localhost:4000/resumes.html?guest=1. Los módulos no funcionan mediante file://. La configuración pública de Firebase está en assets/firebase-config.js; las claves de administración nunca se publican.

Con Node.js 22 o posterior: npm ci, npm run build:exports y npm test. Los paquetes Word y composición ya están compilados en assets/vendor, con sus licencias. npm run test:firebase requiere Java 21 y utiliza exclusivamente Authentication y Firestore locales del proyecto ficticio demo-cvapp.

Las pruebas cubren el modelo, Word, catálogo y disponibilidad; los emuladores comprueban aislamiento de cuentas, exportación completa, validación de datos y borrado cancelado, interrumpido y reintentado. Los archivos tests/preview.html, thumbnails.html y design-gallery.html permiten revisar la paginación, miniaturas y galería. El banco local de composiciones está en drafts/originals/index.html. No se publica.

## Publicación

Firebase Hosting aloja los archivos de la aplicación. npm run build:site prepara .public-site con una lista explícita de recursos públicos; excluye borradores de diseños, pruebas, documentos internos, expedientes y herramientas. npm run deploy:site publica en el proyecto cvapp-2538e. Cloudflare conecta el dominio mediante un registro A a 199.36.158.100, sin proxy, y un TXT de propiedad hosting-site=cvapp-2538e. Se mantiene el TXT de validación del certificado que pide Firebase. El dominio funciona con HTTPS y aparece conectado en Hosting.

GitHub conserva únicamente el código público en un repositorio nuevo con historial limpio. El repositorio anterior queda como archivo privado cv-archive-20261003-legal y no tiene Pages; existe además una copia local privada del historial. No volver a publicar ramas o etiquetas del archivo. La instantánea inicial limpia es 2db7393c843c82f953788053fd492797a83ffb7e. Los registros DNS, herramientas internas y expedientes particulares no deben copiarse al sitio publicado.

Las reglas se publican por separado con firebase deploy --only firestore:rules --project cvapp-2538e. Antes de desplegar límites nuevos, comprobar la compatibilidad de los registros existentes y ejecutar los emuladores. Ver [ESTADO_PROYECTO.md](ESTADO_PROYECTO.md) para el alcance y los pendientes.

## Extractor de PDF existente

scripts/generate_cv_site.py extrae un PDF compatible a cv-viewer.html y cv-data.json. En WSL, comprobar command -v docpython y utilizarlo si existe; verificar Pillow, pdftotext y pdfimages. Fuera de WSL, detectar un runtime compatible. El extractor no se ejecutó durante esta revisión ni se modificó ningún PDF. Su salida no entra automáticamente en el sitio publicado.
