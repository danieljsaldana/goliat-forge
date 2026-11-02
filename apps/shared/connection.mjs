/** Shared validation for test-only connections; production always uses IAM + TLS. */
export function localConnection(environment, name, protocols) {
  const value = environment[name];
  if (!value) return null;
  if (environment.NODE_ENV === 'production' || environment.AWS_EXECUTION_ENV || environment.ECS_CONTAINER_METADATA_URI || environment.ECS_CONTAINER_METADATA_URI_V4) throw Error('test_database_forbidden');
  const url = new URL(value);
  if (!protocols.includes(url.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw Error('test_database_must_be_loopback');
  return url;
}
export function databaseEngine(environment = process.env) {
  const value = environment.DB_ENGINE || 'postgres';
  if (!['postgres', 'mysql', 'documentdb'].includes(value)) throw Error('unsupported_database_engine');
  return value;
}
