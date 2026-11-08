// Carga .env antes de cualquier prueba para las de integración con PostgreSQL.
try {
  process.loadEnvFile(".env");
} catch {
  // sin .env: las pruebas de integración se omiten
}
