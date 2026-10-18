# Sistema de reservas de escenarios deportivos

Proyecto académico desarrollado con Visual Studio Code, Node.js, Express, HTML, CSS y JavaScript. No requiere MySQL: los datos se guardan localmente en `backend/data/data.json`.

## Requisitos
- Node.js LTS
- Visual Studio Code
- Git

## Instalación
1. Abre esta carpeta en Visual Studio Code.
2. En Terminal > Nueva terminal, ejecuta `npm install`.
3. Ejecuta `npm start`.
4. Abre `http://localhost:3000`.

## Cuentas de demostración
- Administrador: `admin@demo.edu` / `Admin123!`
- Usuario: `estudiante@demo.edu` / `Estudiante123!`
- Personal deportivo: `deportivo@demo.edu` / `Deportivo123!`

Son credenciales ficticias solo para desarrollo local. Cámbialas antes de cualquier despliegue real.

## Pruebas
Ejecuta `npm test`. Las pruebas automatizadas cubren las reglas centrales del servicio de reservas.

## Persistencia
La aplicación crea `backend/data/data.json` en el primer arranque. Haz una copia de ese archivo para respaldar los datos. No lo edites mientras el servidor está ejecutándose.

## Alcance
Se implementa el módulo de reservas y disponibilidad con datos ficticios. No se implementa el sistema completo de administración, reportes ni lista de espera. El archivo JSON es adecuado para una demostración local, no para varios procesos/servidores ni para uso institucional real.

## Seguridad y limitaciones
- Contraseñas almacenadas mediante bcrypt.
- Autorización comprobada en el backend.
- El archivo JSON se escribe en serie dentro de un único proceso Node.js.
- Para producción, sustituir el almacenamiento JSON por una base de datos transaccional y configurar HTTPS, protección CSRF, límites de intentos y gestión segura de sesiones.
