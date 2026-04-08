# fromnorthgbrp-desktop

App de escritorio de FromNorth GBRP. Es una copia del repo `facuguz55/fromnorthgbrp` empaquetada con Tauri para Windows (.exe).

## Importante

- **NO modificar** `src/`, `api/`, ni ningún archivo del dashboard original.
- Los cambios del dashboard vienen del repo original `facuguz55/fromnorthgbrp` — hay que copiarlos acá manualmente.
- Este repo solo tiene archivos de Tauri + CI/CD.

## Stack

- Frontend: React 19 + TypeScript + Vite (copiado de fromnorthgbrp)
- Desktop wrapper: Tauri v2
- Auto-updater: tauri-plugin-updater apuntando a GitHub Releases
- CI/CD: GitHub Actions buildea y publica el .exe en cada push a main

## Flujo para actualizar la app

1. Copiar los cambios nuevos de `fromnorthgbrp` a este repo (solo `src/`, `public/`, `api/`)
2. Subir la versión en `src-tauri/tauri.conf.json` (ej: `0.1.0` → `0.1.1`)
3. Hacer commit y push a main
4. GitHub Actions buildea el .exe y publica el Release automáticamente (~7 min)
5. La app instalada en las PCs detecta la nueva versión y se actualiza sola

## Archivos clave de Tauri

- `src-tauri/tauri.conf.json` — config principal (nombre, versión, updater)
- `src-tauri/src/lib.rs` — lógica Rust (auto-updater al iniciar)
- `src-tauri/Cargo.toml` — dependencias Rust
- `.github/workflows/release.yml` — CI/CD que buildea y publica el .exe

## Secrets de GitHub (ya configurados)

- `TAURI_SIGNING_PRIVATE_KEY` — clave privada para firmar los updates
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — vacío (sin password)

La clave privada está en `C:\Users\facui\.tauri\fromnorth.key` — NO commitear.

## Repo GitHub

`facuguz55/fromnorthgbrp-desktop`
