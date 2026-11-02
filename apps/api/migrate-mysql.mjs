import {readFile} from 'node:fs/promises';
export async function migrateMySql(pool,{iam=true,database='forge'}={}) {
  if(!/^[a-z][a-z0-9_]{0,62}$/.test(database))throw Error('invalid_database_name');
  const c=await pool.getConnection();
  let locked=false;
  try {
    const [lock]=await c.query("SELECT GET_LOCK('goliat-forge-migrate',30) AS acquired");
    if(lock[0].acquired!==1)throw Error('migration_lock_unavailable');locked=true;
    const sql=await readFile(new URL('./schema.mysql.sql',import.meta.url),'utf8');
    // DDL commits implicitly in MySQL. Each initial-schema statement is idempotent.
    for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await c.query(statement);
    if(iam){
      for(const user of ['forge_api','forge_worker']){
        await c.query(`CREATE USER IF NOT EXISTS '${user}' IDENTIFIED WITH AWSAuthenticationPlugin AS 'RDS'`);
        await c.query(`ALTER USER '${user}' IDENTIFIED WITH AWSAuthenticationPlugin AS 'RDS' REQUIRE SSL`);
      }
      await grantMySqlPrivileges(c,database);
    }
  } finally {try{if(locked)await c.query("SELECT RELEASE_LOCK('goliat-forge-migrate')");}finally{c.release();}}
}

export async function grantMySqlPrivileges(c,database) {
  if(!/^[a-z][a-z0-9_]{0,62}$/.test(database))throw Error('invalid_database_name');
      const prefix='`'+database+'`.';
      for(const statement of [
        `GRANT SELECT,INSERT ON ${prefix}requests TO 'forge_api'`,
        `GRANT SELECT ON ${prefix}activities TO 'forge_api'`,
        `GRANT SELECT,INSERT,UPDATE ON ${prefix}outbox TO 'forge_api'`,
        `GRANT SELECT,UPDATE(status) ON ${prefix}requests TO 'forge_worker'`,
        `GRANT SELECT,INSERT ON ${prefix}activities TO 'forge_worker'`,
        `GRANT SELECT,UPDATE ON ${prefix}outbox TO 'forge_worker'`,
      ])await c.query(statement);
}
