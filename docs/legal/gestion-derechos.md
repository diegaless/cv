# Gestión de derechos y conservación

Responsable operativo: Diego Ayala Bernal. Contacto publicado:
diego.ayala.bernal2@gmail.com. Revisión: 3 de octubre de 2026.

## Solicitudes

1. Registrar la fecha de recepción, un identificador de expediente, tipo de derecho
   y vencimiento. El registro real reside en `.private-compliance/`; no incluirlo
   en Git, capturas públicas o documentación del sitio.
2. Verificar de forma proporcionada la vinculación con la cuenta. Preferir sesión
   autenticada o comprobación del correo conocido. Pedir información adicional
   solo cuando exista una duda razonable; nunca contraseñas o un DNI por rutina.
3. Confirmar alcance: CV concreto, cuenta completa, copia de datos o un tratamiento.
   El usuario puede editar y borrar sus CVs, descargar todos los datos desde Mi
   cuenta, limpiar borradores de este navegador o eliminar la cuenta.
4. Si necesita intervención administrativa, acceder únicamente a los datos del UID
   verificado. Nunca buscar o entregar los CVs de otras cuentas. Para limitación u
   oposición, valorar el tratamiento concreto; no prometer que borrar la cuenta
   sea la única forma de ejercerlos. No utilizar la marca de borrado como una
   limitación, pues alteraría el significado del estado de la cuenta.
5. Responder dentro de un mes. Registrar cualquier ampliación motivada y comunicarla
   dentro del primer mes. Si se deniega, registrar motivo y vías de reclamación.
   No se ha enviado ninguna comunicación a usuarios durante esta implementación.
6. Cerrar el expediente y conservar una evidencia mínima durante dos años. Retirar
   las copias de CV y verificaciones innecesarias al finalizar; revisar anualmente
   excepciones concretas por reclamación u obligación legal.

La descarga de cuenta usa lecturas del servidor por UID e incluye documentos
antiguos sin fechas que la lista ordenada puede omitir. Incluye perfil, CVs y marca
de borrado accesible; no los registros internos ni copias de proveedores. No modifica
datos ni requiere conceder permisos de Google adicionales.

## Conservación

- CVs activos: bajo control del usuario; no borrado automático por inactividad.
- Invitados: almacenamiento de la pestaña; explicar posibles restauraciones del
  navegador. No atribuir un borrado inmediato garantizado al cierre de la ventana.
- Borradores: retirar al guardar, descartar o borrar; ofrecer limpieza de los de
  esta cuenta en este navegador. Otros navegadores deben limpiarse allí.
- Eliminación: verificar de nuevo la misma cuenta, escribir marca inmutable, borrar
  todos los CVs del servidor, limpiar borradores del navegador y eliminar Auth al
  final. Un fallo conserva el estado que permite completar el proceso.
- Marcas técnicas: ejecutar primero `node scripts/privacy-maintenance.mjs`.
  El modo normal solo revisa. `--apply` retira exclusivamente marcas de más de
  30 días con Auth inexistente y ningún CV, utilizando la versión comprobada como
  precondición. Nunca borra CVs o usuarios de Authentication ni aplica inactividad.
- Revisar las marcas mensualmente y guardar el informe privado. Este paso es un
  procedimiento operativo manual; no se ha creado una tarea programada ni se
  afirma que haya borrado automático en segundo plano.
- Borrado del proveedor: mantener la información pública sobre sus plazos; no
  confundir el borrado en vivo con la eliminación de todas las copias del proveedor.

## Incidentes

Registrar recepción, alcance, usuarios afectados, medidas de contención y evidencias
en el registro privado. Cortar la causa sin hacer públicos datos de CV. Valorar
la notificación a la AEPD dentro de 72 horas desde conocimiento cuando corresponda
y la comunicación a afectados si hay alto riesgo. Documentar también los casos en
que no sea exigible la notificación. Restaurar el servicio y verificar aislamiento,
borrado pendiente y acceso antes de cerrar el incidente.
