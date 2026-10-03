# Evaluación de seguridad y privacidad

3 de octubre de 2026. Alcance: código, reglas de Firestore, metadatos de producción,
sesiones ficticias en emuladores y publicación de archivos. No se ha ejecutado el
borrado de la cuenta real, descargado CVs para informes públicos o enviado correos.

| Riesgo | Control verificado o incorporado | Límite y seguimiento |
| --- | --- | --- |
| Lectura o escritura de CV ajeno | UID autenticado contra la ruta; lectura, consulta, modificación y borrado aislados | El administrador de Google Cloud conserva acceso privilegiado; limitarlo y revisar permisos |
| Alteración de identidad o actualización que elude validación | Las mismas comprobaciones en creación y actualización; propietario y creación inmutables; solo campos previstos | No usar valores de rol introducidos por el cliente como autoridad |
| Campos o fotografía inválidos | Tipos, campos conocidos, tamaño de texto y listas, formato de diseño y de imagen; límite de documento de Firestore y control del cliente | Las reglas no validan cada elemento interior de listas largas; el modelo normaliza y escapa contenido, pero queda riesgo de corrupción de los propios datos |
| Abuso de cuotas | Límites de documento, foto, textos y número de entradas; sin permisos anónimos | No hay límite global de CVs por cuenta o App Check impuesto; monitorizar cuotas y abordar abuso si aparece |
| Ejecución de contenido introducido en CV | Escape de texto; enlaces HTTP(S) validados; imágenes base64 limitadas a formatos de imagen | Revisar cualquier importador o integración nueva antes de publicarlo |
| Sesiones antiguas tras eliminar cuenta | Marca inmutable con verificación reciente; bloquea escrituras mientras se borran CVs y Auth | Retirar marcas solo tras 30 días y verificaciones del servidor |
| Exportación a otra cuenta por cambio de sesión | Comprobación de propietario antes y después de lecturas del servidor | La descarga es sensible; el usuario debe guardarla de forma privada |
| Borradores en equipo compartido | Separación por UID y botón de limpieza local | Cerrar sesión no limpia automáticamente copias de otros navegadores |
| Publicación accidental de datos o código interno | Lista de archivos del sitio; exclusión de pruebas, borradores, scripts y registros privados; historial anterior privado | Las copias descargadas por terceros no pueden revocarse con una limpieza del repositorio |
| Transferencias y proveedores | Inventario por servicio, región verificada y condiciones consultadas | No se certifica aceptación particular, MFA, documentación contractual o evaluación de transferencias que no se haya aportado |

Evaluación inicial de impacto: no hay selección automática, perfilado o seguimiento
a gran escala. Se limita el uso a edición y descarga; los campos libres pueden
recibir datos sensibles, por lo que se pide evitarlos. No se concluye una exención
permanente de evaluación de impacto: debe revisarse si cambia escala, datos o
finalidades. No se presenta como auditoría de certificación o garantía de riesgo cero.

Formato de la auditoría de reglas aplicado según la guía de Firebase:

```json
{
  "score": 4,
  "summary": "Aislamiento por propietario y validación equivalente de creación y actualización; quedan límites frente a corrupción propia y abuso de cuotas.",
  "findings": [
    {"check": "Type Safety", "severity": "minor", "issue": "Los elementos interiores de listas extensas no se validan uno a uno en las reglas.", "recommendation": "Mantener normalización y escape, evaluar validación de servidor si se amplía la aplicación."},
    {"check": "Storage Abuse", "severity": "minor", "issue": "Los límites por documento no imponen un máximo total por cuenta.", "recommendation": "Revisar cuotas y añadir medidas de servidor ante abuso observado."}
  ]
}
```
