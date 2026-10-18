# Mantenimiento y evolución

## SC-01. Conflicto simultáneo
**Tipo:** correctivo. Se corrige el defecto que permitiría confirmar dos reservas incompatibles.
**Afectados:** servicio de reservas y persistencia.
**Cambio:** serializar las mutaciones en el proceso local y validar conflicto inmediatamente antes de guardar. En una versión real multiinstancia, usar transacciones y bloqueo/estrategia de exclusión en la base de datos.
**Regresión:** CP-01, CP-06, CP-07 y CP-12.

## SC-02. Duración configurable
**Tipo:** perfectivo. Se amplía la capacidad funcional.
**Afectados:** escenarios, formulario, servicio y pruebas.
**Cambio futuro:** atributo `durationMinutes` por escenario con valores permitidos de 60 o 90; calcular el final con esa duración.
**Regresión:** CP-01, CP-04, CP-05, CP-06 y CP-12.

## SC-03. Lista de espera
**Tipo:** perfectivo. Se agrega una nueva funcionalidad.
**Afectados:** interfaz, servicio, almacenamiento y API.
**Cambio futuro:** registrar usuario, escenario, franja solicitada, fecha de inscripción y estado; ordenar por fecha y ofrecer la franja cuando se libere, revalidando las reglas.
**Regresión:** CP-06, CP-08, CP-11 y CP-12.

## Propuesta propia: notificaciones
Enviar confirmación y cancelación por correo institucional o notificación interna. Verificar que los errores de notificación no reviertan indebidamente una reserva ya confirmada.
