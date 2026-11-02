/** A configuration preview, not a deployment or cost estimator. */
export function databasePreview(kind,{highAvailability=false,readerCount=0}={}){
 if(!['postgres','aurora-postgresql','aurora-mysql','documentdb'].includes(kind))throw Error('unsupported_profile');
 if(!Number.isInteger(readerCount)||readerCount<0||readerCount>5)throw Error('invalid_reader_count');
 const postgres=kind==='postgres',readers=postgres?0:Math.max(readerCount,highAvailability?1:0),instanceClass=postgres?'db.t4g.small':'db.r6g.large';
 const rows=Array.from({length:readers},(_,index)=>`  reader-${index+1} = {\n    instance_class = "${instanceClass}"\n    promotion_tier = ${index+1}\n  }`);
 const snippet=`db_kind           = "${kind}"\ndb_engine_version = null\ndb_instance_class = "${instanceClass}"\ndb_multi_az       = ${highAvailability}\n\ndb_read_replicas = ${readers?'{\n'+rows.join('\n')+'\n}':'{}'}`;
 return {readers,highAvailability,instanceClass,standby:postgres&&highAvailability,snippet};
}
