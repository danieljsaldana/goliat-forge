import {test} from 'node:test';
import assert from 'node:assert/strict';
import {databasePreview} from '../site/database-profile.mjs';

test('RDS standby is never presented as a readable replica',()=>{
 const preview=databasePreview('postgres',{highAvailability:true,readerCount:3});
 assert.equal(preview.readers,0);assert.equal(preview.standby,true);assert.match(preview.snippet,/db_read_replicas = \{\}/);
});
test('cluster HA always includes reader compute while a basic cluster may omit it',()=>{
 for(const kind of ['aurora-postgresql','aurora-mysql','documentdb']){
  assert.equal(databasePreview(kind).readers,0);
  const preview=databasePreview(kind,{highAvailability:true,readerCount:0});assert.equal(preview.readers,1);assert.match(preview.snippet,/reader-1/);
 }
 assert.throws(()=>databasePreview('documentdb',{readerCount:6}));assert.throws(()=>databasePreview('unsupported'));
});
