# Proveedores y contratos

Revisión del 3 de octubre de 2026. Se distinguen condiciones publicadas, evidencia
del servicio activo y justificantes particulares de la cuenta. No se inventa una
firma o aceptación histórica ni se utiliza un enlace genérico como prueba de ella.

| Servicio | Función y documentación oficial | Estado comprobado | Acción del responsable |
| --- | --- | --- | --- |
| Firebase Authentication | Acceso con Google; [condiciones por servicio](https://firebase.google.com/terms), condiciones de Google Cloud y su [adenda](https://cloud.google.com/terms/data-processing-addendum) | Proyecto activo; dominio autorizado; sin acceso anónimo o contraseña habilitados | Guardar los justificantes de contratación y comprobar entidad contratante, contactos y garantías de transferencia |
| Cloud Firestore | Datos de CV privados; mismas condiciones de Google Cloud y adenda aplicable | Base Madrid; reglas por propietario; una hora de versiones; sin PITR | Mantener las evidencias de región y reglas; documentar cambios y subencargados |
| Firebase Hosting | Archivos públicos del servicio; [condiciones de APIs y tratamiento de Firebase](https://firebase.google.com/terms/data-processing-terms) | Sitio existente en el mismo proyecto; migración preparada para sustituir Pages | Conservar el justificante de uso y las condiciones del servicio; comprobar publicación y dominio |
| Cloudflare | DNS del dominio; [acuerdo de tratamiento](https://www.cloudflare.com/cloudflare-customer-dpa/) y [privacidad](https://www.cloudflare.com/privacypolicy/) | Registro `cvapp` solo DNS; no proxy HTTP del contenido del CV | Conservar condiciones aplicables a la cuenta; revisar de nuevo si se activa proxy o analítica |
| GitHub | Código y, durante transición, archivos públicos de Pages; [privacidad](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) y [condiciones de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) | Los CVs de usuarios no se guardan en Git; retiro de historial con archivo privado | Retirar Pages como alojamiento de SaaS comercial; GitHub puede seguir alojando el código |
| Gmail personal | Correo de contacto; [aclaración oficial del rol de Google](https://support.google.com/policies/answer/9581826?hl=en) | Correo público confirmado; Google declara que la versión de consumo no actúa como encargado | No atribuirle la adenda de Workspace. Elegir un canal profesional con condiciones apropiadas para la gestión de solicitudes y conservar su documentación |

Authentication y Firestore se rigen por la tabla vigente de servicios de Firebase;
Hosting remite a las condiciones específicas de APIs y tratamiento de Firebase.
Las condiciones de tratamiento se incorporan a los acuerdos de servicio: un
contrato de encargo no tiene que ser siempre un PDF firmado aparte, pero debe
poder acreditarse su aplicación a la cuenta y al servicio concreto. Queda pendiente
la evidencia particular de contratación; no se han aceptado términos nuevos durante
esta revisión.

Las transferencias no se dan por cubiertas simplemente por usar marcas conocidas.
El responsable debe guardar la entidad y garantías que correspondan a su cuenta,
las cláusulas y subencargados aplicables y su evaluación. Madrid no convierte
Authentication o la CDN en servicios exclusivamente europeos. La información de
ubicación y borrado está en [Firebase](https://firebase.google.com/support/privacy).
