import {createPool,createPostgresRepository} from './database.mjs';
import {createMySqlPool,createMySqlRepository} from './mysql.mjs';
import {createDocumentClient,createDocumentRepository} from './documentdb.mjs';
import {databaseEngine} from './connection.mjs';
export async function createRepository(environment=process.env,{eventsEnabled=environment.EVENTS_ENABLED==='true'}={}) {
  const engine=databaseEngine(environment),options={eventsEnabled,database:environment.DB_NAME || 'forge'};
  if(engine==='mysql')return createMySqlRepository(await createMySqlPool(environment),options);
  if(engine==='documentdb')return createDocumentRepository(await createDocumentClient(environment),options);
  return createPostgresRepository(await createPool(environment),options);
}
