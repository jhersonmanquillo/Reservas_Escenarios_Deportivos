# Casos de prueba

Ejecutar `npm test`. Registrar fecha, versión, resultado real y captura de la terminal después de la ejecución.

| ID | Requisito/regla | Objetivo | Datos / pasos | Resultado esperado | Estado inicial |
|---|---|---|---|---|---|
| CP-01 | RF-06, RN-01, RN-03 | Crear reserva válida | Usuario activo, escenario activo y hora futura válida; crear reserva | Estado Reservada y ID único | Pendiente de ejecución |
| CP-02 | RF-01, RNF-03, RNF-07 | Login incorrecto | Enviar contraseña incorrecta | HTTP 401 sin datos sensibles | Pendiente de ejecución |
| CP-03 | RN-02 | Escenario inactivo | Reservar `e-004` | Solicitud rechazada | Pendiente de ejecución |
| CP-04 | RN-04 | Anticipación mínima | Reservar a menos de 2 horas | Solicitud rechazada | Pendiente de ejecución |
| CP-05 | RN-04 | Anticipación máxima | Reservar a más de 7 días | Solicitud rechazada | Pendiente de ejecución |
| CP-06 | RN-05, RN-13 | Conflicto de horario | Crear dos reservas superpuestas en el mismo escenario | La segunda es rechazada | Pendiente de ejecución |
| CP-07 | RN-06 | Límite diario | Crear una tercera reserva activa en el mismo día | Tercera rechazada | Pendiente de ejecución |
| CP-08 | RF-08, RN-07, RN-10 | Cancelar a tiempo | Cancelar reserva con motivo y anticipación suficiente | Estado Cancelada, motivo guardado | Pendiente de ejecución |
| CP-09 | RN-08 | Estado final inmutable | Cambiar una reserva finalizada | Solicitud rechazada | Pendiente de ejecución |
| CP-10 | RF-12, RN-12 | Control de roles | Usuario común solicita endpoint de personal | HTTP 403 | Pendiente de ejecución |
| CP-11 | RNF-08 | Persistencia | Crear reserva y releer JSON / reiniciar servidor | Reserva permanece guardada | Pendiente de ejecución |
| CP-12 | SC-01, RN-05, RN-13 | Concurrencia | Dos solicitudes simultáneas a misma franja | Solo una se confirma | Pendiente de ejecución |
| CP-13 | RN-05 | Límites de intervalos | Probar intervalos superpuestos y contiguos | Superposición detectada; contiguos permitidos | Pendiente de ejecución |

No se deben marcar los casos como aprobados hasta ejecutar y verificar los resultados. Adjuntar capturas de la terminal y registrar los defectos reales encontrados.
