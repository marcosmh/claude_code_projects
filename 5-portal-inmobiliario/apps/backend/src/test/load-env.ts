// Carga .env.local antes de cualquier prueba para las de integración con PostgreSQL.
try {
  process.loadEnvFile(".env.local");
} catch {
  // sin .env.local: las pruebas de integración se omiten
}
