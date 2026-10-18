# Matriz de requisitos y pruebas de aceptación

| Requisito | Cobertura principal | Prueba manual/automatizada pendiente |
|---|---|---|
| RF-01 | `POST /api/auth/login`, `POST /api/auth/logout` | Probar credenciales correctas e incorrectas y cierre de sesión |
| RF-02 | `GET/POST/PATCH /api/users` | Probar alta, consulta, cambio de rol y desactivación |
| RF-03 | `GET/POST/PATCH /api/scenarios` | Crear, editar y desactivar escenarios |
| RF-04 | `PUT /api/scenarios/:id/hours`, `POST /api/blocks` | Probar horarios, franjas y mantenimiento |
| RF-05 | `GET /api/scenarios/:id/availability` | Probar disponibilidad con reserva y bloqueo existentes |
| RF-06 | `POST /api/reservations` | Probar usuario activo y franja disponible |
| RF-07 | `GET /api/reservations` | Confirmar que un usuario solo vea sus reservas |
| RF-08 | `POST /api/reservations/:id/cancel` | Probar motivo, permisos y límite de dos horas |
| RF-09 | `POST /api/reservations/:id/outcome` | Probar rol deportivo y estados finales |
| RF-10 | `POST /api/blocks` | Probar bloqueo que se superpone a una reserva existente |
| RF-11 | `GET /api/reports/summary` | Comparar resultados con datos conocidos |
| RF-12 | `requireRole` en backend | Llamar rutas administrativas como usuario normal |
| RNF-01 | Interfaz en español | Revisión visual de todas las vistas |
| RNF-02 | Frontend web estándar | Pruebas en Chrome, Edge y Firefox |
| RNF-03 | bcrypt con factor 12 | Revisar que `password_hash` nunca contenga la contraseña original |
| RNF-04 | `requireAuth` y `requireRole` | Pruebas directas a la API sin permisos |
| RNF-05 | Transacciones SQLite | Provocar conflicto y verificar que no haya escritura parcial |
| RNF-06 | Índices y consultas SQLite | Ejecutar prueba de carga de 10 usuarios y 20.000 reservas |
| RNF-07 | Middleware de errores | Confirmar que la respuesta no incluya stack ni SQL |
| RNF-08 | SQLite persistente | Reiniciar servidor y verificar datos |
| RNF-09 | README y esta guía | Seguir la instalación desde cero y probar restauración |
| RNF-10 | Validaciones de rutas | Enviar campos vacíos, tipos y rangos inválidos |

Esta matriz no reemplaza las pruebas: cada requisito debe marcarse como aprobado solo después de ejecutar y registrar su evidencia.
