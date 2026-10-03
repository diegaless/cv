# Estado del proyecto

Revisión del 3 de octubre de 2026.

## Funcionamiento

Editor de CV con acceso Google/Firebase y modo invitado, guardado automático, foto, vista previa A4 y exportación PDF por impresión, Word, TXT y JSON. Cuenta con exportación de datos del servidor, borrado de borradores de ese navegador y eliminación confirmada de la cuenta. No se ofrecen empleos, cartas, entrevistas, Premium ni IA simulada.

Clásica sigue como única plantilla seleccionable. Compacta conserva los CVs existentes. Las 142 alternativas de Más plantillas utilizan composiciones propias y permanecen bloqueadas. Diez composiciones anteriores se mantienen; 132 tarjetas se sustituyen por doce familias y once paletas por familia. Miniaturas locales con datos ficticios; 140 fotos ficticias y cuatro muestras sin foto.

## Revisión de recursos y datos

Se retiraron cinco recursos antiguos de la interfaz, 132 miniaturas previas, trece imágenes decorativas y ocho archivos de compositores/referencias, además de las referencias externas y declaraciones de fuentes retiradas que aún quedaban. Las fuentes conservadas incluyen sus licencias. El repositorio público se sustituyó por una instantánea limpia, con raíz 2db7393c843c82f953788053fd492797a83ffb7e. El historial de trabajo permanece en cv-archive-20261003-legal, privado y sin Pages, y en una copia local privada. No volver a publicar sus ramas o etiquetas.

Los procedimientos en docs/legal cubren registro del tratamiento, proveedores, seguridad, conservación y atención de derechos. .private-compliance conserva evidencias particulares y expedientes fuera de Git y del sitio. La cuenta de contacto actual es Gmail personal: no se le atribuye un contrato de Google Workspace. No se han firmado acuerdos ni contratado servicios de pago nuevos.

Firestore está en europe-southwest1, Madrid; no tiene PITR y conserva una hora de versiones. Authentication procesa el acceso en Estados Unidos. Dominio autorizado, acceso anónimo y acceso por contraseña desactivados. Se revisó la estructura de los registros existentes sin modificar ni exponer contenido personal. Las reglas nuevas validan propietario, campos, tipos y tamaños al crear y actualizar. Los límites sobre elementos internos de listas y cuotas se documentan en la evaluación de seguridad.

## Validación actual

- 30 pruebas del modelo, exportación Word, catálogos y conservación correctas.
- 16 pruebas de Authentication/Firestore locales correctas: aislamiento, datos inválidos, exportación de registros antiguos, sesión cambiada, y borrado cancelado, interrumpido y reintentado.
- 474 escenarios de las composiciones propias correctos, con muestra larga y fotografía, sin pérdida ni duplicación del texto ni solapamiento con el pie.
- 144 miniaturas regeneradas o conservadas según el compositor, con hashes en su manifiesto.
- Galería comprobada en escritorio y móvil: 144 imágenes decodificadas y contrastadas con su manifiesto, una seleccionable y 143 bloqueadas, sin desbordamiento horizontal.
- Nueve escenarios de privacidad y cuenta comprobados, incluida la descarga JSON real, aislamiento y confirmación del borrado local, enlaces y tamaños móviles.
- 224 PDF existentes y seis archivos del compositor público y núcleo conservan sus hashes anteriores. No se modificó el PDF de Clásica ni los CVs guardados.

La web ya está publicada con Firebase Hosting desde una lista de 185 archivos permitidos. Cloudflare gestiona únicamente el DNS, con A 199.36.158.100 y TXT de propiedad y certificado. El dominio tiene HTTPS válido y Firebase muestra Conectado. Se retiró el alojamiento de GitHub Pages; GitHub conserva el código. Las reglas estrictas de Firestore ya se desplegaron y se verificó su coincidencia con el archivo local.

## Pendientes del responsable

NIF y domicilio publicable para completar el aviso legal de actividad económica; canal profesional apropiado para solicitudes con datos personales; evidencia particular de los acuerdos y garantías de transferencia aplicables a las cuentas. Los procedimientos requieren ejecutarse ante solicitudes reales y revisiones mensuales; no constituyen una certificación de cumplimiento o una garantía frente a reclamaciones.
