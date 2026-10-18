# Guía Git y GitHub para el proyecto

## 1. Verificar el estado

```powershell
git status
git branch
```

Si el repositorio está vacío, se puede cambiar el nombre de la rama principal a `main`:

```powershell
git branch -M main
```

## 2. Crear commits pequeños

Después de completar una etapa y probarla:

```powershell
git status
git add package.json package-lock.json .gitignore .env.example
git commit -m "chore: preparar estructura y configuracion"
```

Para las siguientes etapas, añade solo los archivos relacionados con el cambio. Antes de cada commit revisa `git status` y, si hace falta, `git diff`.

## 3. Conectar con GitHub

Crea un repositorio vacío en GitHub. Si ya tienes uno, consulta su URL en GitHub. Luego configura el remoto (sustituye la URL de ejemplo por la tuya):

```powershell
git remote add origin https://github.com/TU-USUARIO/reservas-deportivas.git
git branch -M main
git push -u origin main
```

Si `origin` ya existe, revisa `git remote -v` en vez de añadirlo de nuevo.

## 4. Flujo normal de trabajo

```powershell
git status
git add backend/src/reservation-service.js backend/tests/reservation-service.test.js
git commit -m "feat: aplicar reglas de negocio de reservas"
git push
```

Ejecuta `npm test` antes de los commits relacionados con lógica o pruebas. Si el commit falla, lee el mensaje antes de repetir comandos.

## 5. Reglas importantes

- No subas `.env`, contraseñas, archivos SQLite ni `node_modules`.
- No uses `git reset --hard` ni borres archivos sin entender qué cambios se perderían.
- Si GitHub tiene cambios que no están en tu equipo, ejecuta `git pull --rebase` antes de subir tu trabajo, siempre que no tengas conflictos locales sin resolver.
- `git add .` añade todos los cambios visibles; úsalo solo después de revisar cuidadosamente `git status`.
