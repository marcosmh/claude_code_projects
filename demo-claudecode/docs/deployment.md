# Despliegue

Frontend y backend se construyen y se despliegan por separado. El diseño asume **mismo origen**: el navegador habla solo con
el host del frontend, que sirve la SPA y reenvía `/api` al backend. Así no hay CORS y las cookies httpOnly
(`SameSite=Strict`) siguen siendo de primera parte. Dominios distintos no funcionan con este diseño; subdominios hermanos
sí, pero exigen CORS con credenciales (ver la auditoría de seguridad en `apps/backend/docs/jwt-migration.md`).

## Imágenes

El contexto de ambos `docker build` es la raíz del monorepo (`demo-claudecode/`); `turbo prune` deja solo lo que cada app necesita.

```bash
docker build -f apps/backend/Dockerfile  -t invoices-backend  .
docker build -f apps/frontend/Dockerfile -t invoices-frontend .
```

- **Backend** (`next start`, puerto 4000, PostgreSQL vía `DATABASE_URL`, p. ej. el Session pooler de Supabase). Variables obligatorias en producción: `JWT_SECRET`,
  `JWT_REFRESH_SECRET` (distinto, ambos con `openssl rand -base64 48`) y `FRONTEND_ORIGIN` (origen https público, sin ruta).
  Detrás de un proxy, `TRUSTED_PROXY_HOPS=1`. El servidor no arranca si falta alguna o es inaceptable.
- **Frontend** (nginx, puerto 8080). `BACKEND_UPSTREAM` (por defecto `http://backend:4000`) es a donde reenvía `/api`.
  Envía la CSP completa (con `frame-ancestors`) y el resto de cabeceras de seguridad en cada respuesta; salen del build
  (`dist/security-headers.conf`, `dist/_headers`) a partir de la misma política que el `<meta>`. `VITE_API_URL` es un
  `--build-arg` (por defecto `/api/v1`, mismo origen); si apunta a otro origen, la CSP lo incluye en `connect-src`.
- El TLS lo termina quien esté delante (balanceador o proxy); las cookies llevan `Secure` y el prefijo `__Secure-`.

## Pasos de release (backend)

Las migraciones son un paso aparte, no ocurren al arrancar:

```bash
docker run --rm -e DATABASE_URL=postgresql://... invoices-backend npx prisma migrate deploy
# solo la primera vez (no hay registro público); la contraseña va por entorno, nunca como argumento:
docker run --rm -e DATABASE_URL=postgresql://... -e USER_PASSWORD=... invoices-backend npm run user:create -- tu@correo.com
```

## Probar la pila completa

`docker-compose.yml` levanta ambas apps en `http://localhost:8080`:

```bash
JWT_SECRET=$(openssl rand -base64 48) JWT_REFRESH_SECRET=$(openssl rand -base64 48) \
FRONTEND_ORIGIN=https://app.example.com docker compose up --build
```

Es una prueba de integración, no una receta de producción: la base es PostgreSQL, así que el backend ya no está atado a una réplica; con
varias réplicas hace falta además un almacén compartido para el rate limiter.

## Versionado y CI

- Cada app y cada paquete tiene su versión; `npm run changeset` registra un cambio y `npm run version-packages` lo aplica
  (ver `.changeset/README.md`). Un cambio en `shared-types` o `shared-validation` es un cambio de contrato.
- Workflows en `.github/workflows/`: `backend.yml`, `frontend.yml`, `packages.yml` y `e2e.yml`, cada uno con filtros por rutas.
  Los jobs `image` solo comprueban que la imagen se construye; no publican nada.
