export async function migrateDocument(client,{database='forge',apiRoleArn,workerRoleArn='',iam=true}={}) {
  const db=client.db(database);
  for(const name of ['requests','outbox','activities']){
    try{await db.createCollection(name);}catch(error){if(error.code!==48)throw error;}
  }
  await db.collection('requests').createIndex({owner_id:1,created_at:-1});
  await db.collection('outbox').createIndex({published_at:1,created_at:1});
  await db.collection('outbox').createIndex({request_id:1},{unique:true});
  await db.collection('activities').createIndex({request_id:1},{unique:true});
  const definitions=[
    ['forge_api_role',apiRoleArn,{requests:['find','insert'],outbox:['find','insert','update'],activities:['find']}],
    ['forge_worker_role',workerRoleArn,{requests:['find','update'],outbox:['find','update'],activities:['find','insert']}],
  ];
  for(const [role,arn,collections] of definitions){
    const privileges=Object.entries(collections).map(([collection,actions])=>({resource:{db:database,collection},actions}));
    const exists=(await db.command({rolesInfo:role})).roles.length>0;
    await db.command({[exists?'updateRole':'createRole']:role,privileges,roles:[]});
    if(!iam || (role==='forge_worker_role' && !arn))continue;
    if(!/^arn:aws:iam::[0-9]{12}:role\/[A-Za-z0-9+=,.@_/-]+$/.test(arn))throw Error('invalid_database_role_arn');
    const external=client.db('$external'),users=(await external.command({usersInfo:arn})).users;
    await external.command(users.length?{updateUser:arn,roles:[{role,db:database}]}:{createUser:arn,mechanisms:['MONGODB-AWS'],roles:[{role,db:database}]});
  }
}
