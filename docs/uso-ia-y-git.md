# Uso de IA y Git

## Herramienta
ChatGPT se utilizó como apoyo para proponer estructura, generar código inicial y explicar decisiones. El equipo debe revisar el código y ejecutar las pruebas.

## Prompt representativo
"Actúa como desarrollador Node.js y Express. Implementa un servicio de reservas deportivas con datos JSON locales. Valida anticipación mínima de dos horas y máxima de siete días, máximo dos reservas activas por usuario y día, escenarios activos, cancelaciones con motivo y conflictos de horario. Separa servicio y rutas, incluye pruebas automatizadas y explica limitaciones de concurrencia."

## Verificación
Registrar qué código se aceptó, qué se modificó, qué pruebas se ejecutaron y qué defectos se encontraron. No afirmar que una prueba pasó sin evidencia de su ejecución.

## Commits sugeridos
- `chore: inicializar estructura del proyecto`
- `feat: cargar escenarios ficticios`
- `feat: implementar autenticación de demostración`
- `feat: crear y consultar reservas`
- `feat: implementar cancelaciones`
- `test: agregar pruebas de reglas de negocio`
- `fix: serializar solicitudes concurrentes`
- `docs: completar informe técnico`

Crear ramas de funcionalidad, ejecutar pruebas antes de integrar y etiquetar versiones solo cuando estén verificadas.
