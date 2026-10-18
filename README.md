# Reservas Deportivas

Aplicación web académica para gestionar usuarios, escenarios deportivos, horarios, reservas, cancelaciones, bloqueos, asistencia e informes.

## Tecnologías

- Node.js 20 o superior
- Express
- HTML, CSS y JavaScript
- SQLite mediante `better-sqlite3`
- Contraseñas con bcrypt
- Sesiones persistidas en SQLite
- Pruebas con Node Test Runner

## Instalación en Windows

1. Instala Node.js 20 o superior desde https://nodejs.org/.
2. Abre PowerShell en la carpeta del proyecto.
3. Instala dependencias:

   ```powershell
   npm install
   ```

4. Copia la configuración de ejemplo:

   ```powershell
   Copy-Item .env.example .env
   ```

5. Edita `.env`. Cambia `SESSION_SECRET` por una cadena aleatoria de al menos 32 caracteres y `ADMIN_PASSWORD` por una contraseña de al menos 12 caracteres. No subas `.env` a GitHub.
6. Crea la cuenta inicial de administrador:

   ```powershell
   npm run init-admin
   ```

7. Inicia el sistema:

   ```powershell
   npm start
   ```

8. Abre http://localhost:3000 y accede con el correo y la contraseña definidos en `.env`.

## Flujo de uso inicial

1. Inicia sesión como administrador.
2. En **Escenarios**, crea un escenario.
3. En la tarjeta del escenario, pulsa **Configurar horarios**. Indica los días (0=domingo a 6=sábado) y las horas de apertura y cierre, por ejemplo `1,2,3,4,5,6`, `08:00` y `22:00`.
4. En **Usuarios**, crea cuentas con rol Usuario o Personal deportivo.
5. Cierra sesión e ingresa como usuario para consultar franjas y crear reservas.
6. El administrador puede crear bloqueos; el personal deportivo puede registrar completadas o inasistencias.
7. Los reportes se consultan por intervalo de fechas.

## Reglas implementadas en el servicio

- Reserva de 60 minutos, con inicio en una hora exacta.
- Anticipación entre 2 horas y 7 días.
- Máximo de dos reservas activas por usuario y día.
- No permite solapamientos ni reservas sobre bloqueos.
- Solo escenarios activos con horario configurado.
- Cancelación con motivo y al menos dos horas de anticipación.
- Estados finales protegidos frente a cambios normales.
- El historial de reservas se conserva; escenarios se desactivan en lugar de eliminarse.
- Validación de roles en las rutas del servidor.

## Pruebas

```powershell
npm test
```

## Respaldo y restauración

1. Detén el servidor antes de copiar los archivos de base de datos.
2. Copia `backend/data/reservas.sqlite` y `backend/data/sessions.sqlite` a una ubicación segura. Si existen archivos `-wal` o `-shm`, no los copies mientras la aplicación esté escribiendo; detener el servidor primero permite que SQLite cierre de forma consistente.
3. Para restaurar, detén el servidor y reemplaza los archivos por la copia. Conserva una copia anterior por seguridad.
4. Nunca publiques archivos de base de datos, contraseñas ni el archivo `.env` en GitHub.

## Limitaciones académicas conocidas

- El horario se configura por día de la semana; no hay todavía una interfaz para horarios distintos por fecha.
- La fecha y hora se interpretan con la zona horaria local del servidor. Para despliegue multi-zona se debe definir una política explícita de zona horaria.
- Las pruebas de rendimiento de 10 usuarios concurrentes y 20.000 reservas históricas deben ejecutarse y documentarse antes de afirmar que se cumple el objetivo de tres segundos.
- Para despliegue público se recomienda añadir protección CSRF, HTTPS, política de contraseñas institucional, recuperación de cuenta y revisión de seguridad.

## Estructura

```text
backend/
  data/                 # Bases SQLite locales, ignoradas por Git
  src/
    app.js              # Rutas y autorización
    db.js               # Esquema y conexión SQLite
    reservation-service.js
    seed-admin.js
    server.js
  tests/
    reservation-service.test.js
frontend/
  index.html
  css/styles.css
  js/api.js
  js/app.js
docs/
  requisitos.md
  git-github.md
```
