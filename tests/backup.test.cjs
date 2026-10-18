const {test}=require('node:test');
const assert=require('node:assert/strict');
const store=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
test('Postgres object key order does not cause repeated backup writes',async()=>{
 const {createCloudBackup}=await import('../src/services/cloudBackup.js');let writes=0;
 const engine=createCloudBackup({uid:'a',storage:store(),initial:{resume:{position:12,surah:3}},read:async()=>({resume:{surah:3,position:12}}),write:async()=>writes++,onData:()=>{},onStatus:()=>{}});
 await engine.cycle();engine.update({resume:{position:12,surah:3}});await engine.cycle();assert.equal(writes,0);engine.stop();
});
test('offline changes survive restart, upload only changed fields, and are not replaced by stale cloud data',async()=>{
 const {createCloudBackup}=await import('../src/services/cloudBackup.js');
 const storage=store();let remote={favorites:[1],playlist:['cloud']},applied,fail=false,writes=[];
 const make=initial=>createCloudBackup({uid:'a',storage,initial,read:async()=>remote,write:async(_uid,patch)=>{if(fail)throw Error('offline');writes.push(patch);remote={...remote,...patch};},onData:d=>applied=d,onStatus:()=>{}});
 let engine=make({favorites:[],playlist:[]});await engine.cycle();
 assert.deepEqual(applied,remote);
 fail=true;engine.update({...applied,favorites:[1,2]});await engine.cycle();engine.stop();
 engine=make({...applied,favorites:[1,2]});await engine.cycle();
 assert.deepEqual(applied.favorites,[1,2]);assert.deepEqual(engine.pending,{favorites:[1,2]});
 fail=false;await engine.cycle();assert.deepEqual(writes,[{favorites:[1,2]}]);assert.deepEqual(engine.pending,{});
 remote={...remote,playlist:['other device']};await engine.cycle();assert.deepEqual(applied.playlist,['other device']);
 assert.equal(writes.length,1);
});
test('an edit during upload stays queued and account outboxes remain isolated',async()=>{
 const {createCloudBackup}=await import('../src/services/cloudBackup.js');const storage=store();let release,writing;
 const engine=createCloudBackup({uid:'a',storage,initial:{goal:10},read:async()=>({goal:10}),write:async()=>{writing=true;await new Promise(r=>release=r);},onData:()=>{},onStatus:()=>{}});
 await engine.cycle();engine.update({goal:15});const upload=engine.cycle();
 assert.equal(writing,true);engine.update({goal:20});release();await upload;assert.deepEqual(engine.pending,{goal:20});
 const other=createCloudBackup({uid:'b',storage,initial:{goal:5},read:async()=>({goal:5}),write:async()=>{},onData:()=>{},onStatus:()=>{}});
 assert.deepEqual(other.pending,{});engine.stop();other.stop();
});
