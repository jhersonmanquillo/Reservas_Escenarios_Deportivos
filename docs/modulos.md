# Propuesta de modularidad

## Módulo implementado: reservas y disponibilidad
**Responsabilidad:** consultar escenarios activos, validar solicitudes, crear reservas, consultar las propias y cancelar con motivo.

**Datos:** escenarios, usuarios de sesión, reservas y bloqueos guardados en JSON.

**Interfaz:** página web y endpoints `/api/scenarios`, `/api/reservations`, `/api/reservations/mine` y `/api/reservations/:id/cancel`.

**Dependencias:** autenticación/autorización, servicio de reservas y almacenamiento JSON.

## Módulos documentados, no implementados
- **Autenticación y usuarios:** administrar cuentas, roles y estados.
- **Escenarios:** CRUD, desactivación y datos de las instalaciones.
- **Horarios y bloqueos:** definir franjas, cierres por mantenimiento y eventos.
- **Operación deportiva:** registrar completada o inasistencia.
- **Reportes:** consultar reservas, cancelaciones y uso por periodo.

La separación de rutas, servicios y almacenamiento aumenta la cohesión y reduce el acoplamiento. La implementación usa un único módulo funcional para respetar el alcance del taller.

## Limitaciones
El JSON se usa para simplificar el aprendizaje. La cola de escrituras solo coordina operaciones dentro de una instancia Node.js; no sustituye transacciones de una base de datos multiusuario distribuida.
