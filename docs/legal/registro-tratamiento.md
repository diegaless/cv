# Registro de actividades de tratamiento

Versión 1, 3 de octubre de 2026. Responsable: Diego Ayala Bernal,
diego.ayala.bernal2@gmail.com. No se ha designado un DPD; esta aplicación pequeña
no realiza seguimiento sistemático a gran escala ni decisiones de selección.
Debe reevaluarse esa conclusión si cambia el servicio.

| Actividad | Finalidad y base | Personas y datos | Destinatarios | Conservación | Medidas |
| --- | --- | --- | --- | --- | --- |
| Cuenta y CV | Editar, guardar y exportar el CV solicitado; prestación del servicio | Usuarios; identificador, nombre, correo, imagen de perfil, contacto, experiencia, formación, idiomas, competencias, enlaces y foto opcional | Firebase Authentication; Cloud Firestore; administrador cuando sea necesario | Hasta borrado de CV o cuenta; no eliminación por inactividad | Reglas por UID, conexión cifrada, normalización, escape de texto, límites de campos y documentos, verificación reciente antes de eliminar cuenta |
| Invitados y borradores | Continuidad de edición y recuperación del trabajo solicitado | Usuarios de este navegador; contenido y preferencias del CV | Almacenamiento de la pestaña o navegador; los CVs de invitado no se envían a Firestore | Hasta cierre de sesión de pestaña, borrado, guardado, descarte o limpieza local, según el tipo | Separación por pestaña o UID; controles para retirar borradores; recuperación explícita |
| Seguridad y registros de eliminación | Impedir escrituras de sesiones antiguas; interés legítimo de seguridad documentado | UID y fecha del borrado; datos técnicos necesarios | Firebase; administrador | Revisar tras 30 días; retirar solo cuando Auth ya no existe y no quedan CVs; mantener si el proceso está incompleto | Registro inmutable; no nombre, correo, foto o contenido; mantenimiento con precondición de versión |
| Entrega de la web | Servir la aplicación y proteger acceso | Visitantes; IP y datos técnicos de conexión | Proveedor de alojamiento; DNS de Cloudflare; GitHub durante la transición | Plazos técnicos del proveedor | HTTPS, separación entre archivos públicos y datos privados, cabeceras de seguridad en Firebase Hosting |
| Solicitudes de derechos | Atender acceso, corrección, supresión y demás derechos; obligación legal | Solicitantes; correo, solicitud y verificación proporcionada | Responsable y proveedor del canal de contacto | Durante tramitación; evidencia mínima de cumplimiento durante dos años, con revisión anual y extensión solo por reclamación u obligación concreta | Registro privado de entrada, plazo y respuesta; acceso limitado; evitar contraseñas, DNI completos y CV innecesarios |

Firestore está en Madrid (`europe-southwest1`), con recuperación puntual
desactivada y una hora de retención de versiones, comprobado por API. Authentication
procesa datos en Estados Unidos. El alojamiento usa una CDN internacional. La
localización de la base de datos no cubre todos los servicios. Las garantías y
roles de proveedores se documentan por servicio en [proveedores](proveedores.md).

No se pretende recoger categorías especiales, antecedentes penales o datos de
terceros. Los CVs permiten texto libre y podrían contenerlos: el aviso pide evitarlos;
si el usuario los introduce, el responsable debe evaluar su necesidad y una base
adicional aplicable, retirándolos cuando no corresponda. No hay selección automática
de candidatos, entrenamiento de IA con CVs, publicidad o analítica del contenido.
Antes de introducir pagos, publicidad o promoción con seguimiento debe actualizarse
este registro y la información al usuario.

Base de la documentación: [RGPD](https://www.boe.es/buscar/doc.php?id=DOUE-L-2016-80807),
especialmente responsabilidad, registro y seguridad. Se conserva por escrito por
tratarse de una operación continuada, aunque el responsable tenga menos de 250
empleados.
