# Estado del proyecto

Revisión del 3 de octubre de 2026.

## Funcionamiento

Editor de CV con acceso Google/Firebase y modo invitado, guardado automático, foto, vista previa A4 y exportación PDF por impresión, Word, TXT y JSON. Cuenta con exportación de datos del servidor, borrado de borradores de ese navegador y eliminación confirmada de la cuenta. No se ofrecen empleos, cartas, entrevistas, Premium ni IA simulada.

Clásica sigue como única plantilla seleccionable. Compacta conserva los CVs existentes. Las 142 alternativas de Más plantillas utilizan composiciones propias y permanecen bloqueadas. Diez composiciones anteriores se mantienen; 132 tarjetas se sustituyen por doce familias y once paletas por familia. Miniaturas locales con datos ficticios; 140 fotos ficticias y cuatro muestras sin foto.

## Revisión de recursos y datos

Se retiran cinco recursos antiguos de la interfaz, 132 miniaturas previas, trece imágenes decorativas y ocho archivos de compositores/referencias, además de las referencias externas y declaraciones de fuentes retiradas que aún quedaban. Las fuentes conservadas incluyen sus licencias. El repositorio público se sustituye por una instantánea limpia; el historial de trabajo permanece en un archivo privado. Verificar siempre los enlaces de commits antiguos después de la sustitución.

Los procedimientos en docs/legal cubren registro del tratamiento, proveedores, seguridad, conservación y atención de derechos. .private-compliance conserva evidencias particulares y expedientes fuera de Git y del sitio. La cuenta de contacto actual es Gmail personal: no se le atribuye un contrato de Google Workspace. No se han firmado acuerdos ni contratado servicios de pago nuevos.

Firestore está en europe-southwest1, Madrid; no tiene PITR y conserva una hora de versiones. Authentication procesa el acceso en Estados Unidos. Dominio autorizado, acceso anónimo y acceso por contraseña desactivados. Se revisó la estructura de los registros existentes sin modificar ni exponer contenido personal. Las reglas nuevas validan propietario, campos, tipos y tamaños al crear y actualizar. Los límites sobre elementos internos de listas y cuotas se documentan en la evaluación de seguridad.

## Validación actual

- 30 pruebas del modelo, exportación Word, catálogos y conservación correctas.
- 16 pruebas de Authentication/Firestore locales correctas: aislamiento, datos inválidos, exportación de registros antiguos, sesión cambiada, y borrado cancelado, interrumpido y reintentado.
- 474 escenarios de las composiciones propias correctos, con muestra larga y fotografía, sin pérdida ni duplicación del texto ni solapamiento con el pie.
- 144 miniaturas regeneradas o conservadas según el compositor, con hashes en su manifiesto.
- Ningún archivo PDF existente ni el compositor público de Clásica se modifica en esta revisión. Se comprueba mediante hashes.

La web se publica con Firebase Hosting desde una lista de archivos permitidos; Cloudflare gestiona únicamente el DNS. GitHub conserva el código y deja de alojar el SaaS comercial. Las reglas de Firestore se despliegan por separado.

## Pendientes del responsable

NIF y domicilio publicable para completar el aviso legal de actividad económica; canal profesional apropiado para solicitudes con datos personales; evidencia particular de los acuerdos y garantías de transferencia aplicables a las cuentas. Los procedimientos requieren ejecutarse ante solicitudes reales y revisiones mensuales; no constituyen una certificación de cumplimiento o una garantía frente a reclamaciones.
