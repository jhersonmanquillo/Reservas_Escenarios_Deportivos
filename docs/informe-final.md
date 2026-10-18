# Informe técnico: Sistema de reservas de escenarios deportivos

## Portada
**Institución:** [Nombre de la institución]  
**Programa:** [Programa académico]  
**Asignatura:** [Asignatura]  
**Integrantes:** [Nombres]  
**Docente:** [Nombre]  
**Fecha:** [Fecha de entrega]

## 1. Introducción
El proyecto propone una aplicación web para consultar escenarios deportivos y gestionar reservas. La implementación se limita al módulo de reservas y disponibilidad, usando datos ficticios y persistencia JSON local para reducir la configuración del entorno.

## 2. Descripción de la solución
Tecnologías: HTML, CSS, JavaScript, Node.js, Express, JSON, Git y Node.js Test Runner. La aplicación permite iniciar sesión con cuentas demo, consultar escenarios, crear reservas, consultar las propias, cancelar y registrar el resultado desde el rol de personal deportivo.

## 3. Modularidad
Consultar `modulos.md`. Describir las responsabilidades, datos, interfaces y dependencias del módulo implementado y documentar los demás sin presentarlos como implementados.

## 4. Casos de prueba
Consultar `casos-de-prueba.md`. Añadir la fecha, versión, resultado obtenido, estado y evidencia real de cada ejecución. Incluir los defectos encontrados y sus correcciones.

## 5. Mantenimiento y evolución
Consultar `mantenimiento.md`. SC-01 se clasifica como correctivo; SC-02 y SC-03 como perfectivos. Añadir las pruebas de regresión ejecutadas.

## 6. Git e inteligencia artificial
Consultar `uso-ia-y-git.md`. Añadir el enlace real al repositorio, commits, ramas, etiquetas y prompts utilizados.

## 7. Limitaciones
La solución utiliza JSON local y no una base de datos transaccional. La coordinación de escrituras funciona en una sola instancia Node.js y no es adecuada para despliegue institucional con múltiples procesos. Los datos y usuarios son ficticios.

## 8. Conclusiones
[Completar después de ejecutar y verificar la aplicación y las pruebas.]

## 9. Repositorio
[Agregar aquí el enlace real de GitHub.]

## 10. Anexos
Adjuntar capturas de la aplicación, terminal, pruebas, commits y versiones.
