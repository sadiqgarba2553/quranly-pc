const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const {CollectionDownloads,validate,audioUrl}=require('../electron/collections.cjs');
const ffmpeg=require('ffmpeg-static');
const spec=(quality='original',count=3)=>({reciter:{id:1,name:'Test reciter'},edition:{name:'Test reading',server:'https://server1.mp3quran.net/test/'},quality,surahs:Array.from({length:count},(_,i)=>({id:i+1,nameEnglish:`Surah ${i+1}`}))});
async function waitFor(fn){const deadline=Date.now()+20000;while(Date.now()<deadline){if(await fn())return;await new Promise(r=>setTimeout(r,20));}throw Error('Timed out');}
test('collection inputs reject untrusted sources, duplicate surahs and invalid quality',()=>{
  for(const url of ['http://server1.mp3quran.net/test/','https://mp3quran.net.evil.test/','https://name:secret@mp3quran.net/','file:///C:/secret','https://server1.mp3quran.net:444/'])assert.throws(()=>audioUrl(url));
  assert.throws(()=>validate({...spec(),quality:'64;whoami'}));assert.throws(()=>validate({...spec(),surahs:[{id:1},{id:1}]}));assert.throws(()=>validate({...spec(),surahs:[{id:115}]}));
  assert.equal(validate(spec('64',114)).entries.length,114);
});
test('all 114 surahs download, persist and resolve offline; removal does not touch other data',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'quranly-collection-')),bytes=Buffer.from('audio fixture');let manager;
  try{await fs.writeFile(path.join(root,'keep.txt'),'user data');manager=new CollectionDownloads(root,ffmpeg,async()=>new Response(bytes,{headers:{'content-type':'audio/mpeg','content-length':String(bytes.length),etag:'"v1"'}}));await manager.init();const estimate=await manager.estimate(spec('original',114));assert.equal(estimate.sourceBytes,bytes.length*114);assert.equal(estimate.approximate,false);
    await manager.start(spec('original',114));await waitFor(()=>manager.jobs[0].status==='completed');assert.equal(manager.tracks().length,114);await manager.close();
    manager=new CollectionDownloads(root,ffmpeg);await manager.init();assert.equal(manager.jobs[0].status,'completed');const track=manager.tracks()[113],local=manager.resolveAudio(track.audioUrl);assert.ok(local.startsWith('quranly-audio://cache/'));assert.deepEqual(await fs.readFile(manager.resolveFile(local)),bytes);assert.equal(manager.resolveFile('quranly-audio://cache/../../secrets'),null);
    await manager.remove(manager.jobs[0].id);assert.equal(manager.tracks().length,0);assert.equal(await fs.readFile(path.join(root,'keep.txt'),'utf8'),'user data');
  }finally{await manager?.close();await fs.rm(root,{recursive:true,force:true,maxRetries:5});}
});
test('pause and restart resumes a partial file using Range and If-Range without corrupting it',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'quranly-range-')),bytes=Buffer.alloc(100000,42);let manager,rangeSeen;
  const fetcher=async(_url,{headers={},signal}={})=>{
    const offset=headers.Range?Number(headers.Range.match(/\d+/)[0]):0;
    if(offset){rangeSeen={...headers};return new Response(bytes.subarray(offset),{status:206,headers:{'content-type':'audio/mpeg','content-length':String(bytes.length-offset),'content-range':`bytes ${offset}-${bytes.length-1}/${bytes.length}`,etag:'"version1"'}});}
    return new Response(new ReadableStream({start(c){c.enqueue(bytes.subarray(0,20000));const timer=setTimeout(()=>{c.enqueue(bytes.subarray(20000));c.close();},10000);signal.addEventListener('abort',()=>{clearTimeout(timer);c.error(signal.reason);},{once:true});}}),{headers:{'content-type':'audio/mpeg','content-length':String(bytes.length),etag:'"version1"'}});
  };
  try{manager=new CollectionDownloads(root,ffmpeg,fetcher);await manager.init();await manager.start(spec('original',1));const id=manager.jobs[0].id;await waitFor(()=>fs.stat(manager.file(id,1,'part')).then(s=>s.size===20000).catch(()=>false));await manager.close();
    manager=new CollectionDownloads(root,ffmpeg,fetcher);await manager.init();assert.equal(manager.jobs[0].status,'paused');await manager.resume(id);await waitFor(()=>manager.jobs[0].status==='completed');assert.equal(rangeSeen.Range,'bytes=20000-');assert.equal(rangeSeen['If-Range'],'"version1"');assert.deepEqual(await fs.readFile(manager.file(id,1,'mp3')),bytes);
  }finally{await manager?.close();await fs.rm(root,{recursive:true,force:true,maxRetries:5});}
});
test('a source ignoring Range restarts safely and errors can be retried without losing completed tracks',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'quranly-retry-')),bytes=Buffer.from('whole new recording');let manager,fail=true;
  try{manager=new CollectionDownloads(root,ffmpeg,async url=>url.endsWith('002.mp3')&&fail?new Response(null,{status:503}):new Response(bytes,{headers:{'content-length':String(bytes.length),etag:'"new"'}}));await manager.init();await manager.start(spec('original',2));await waitFor(()=>manager.jobs[0].status==='failed');assert.equal(manager.tracks().length,1);
    const job=manager.jobs[0];await fs.writeFile(manager.file(job.id,2,'part'),'old partial');job.entries[1].validator='"old"';fail=false;await manager.resume(job.id);await waitFor(()=>manager.jobs[0].status==='completed');assert.equal(manager.tracks().length,2);assert.deepEqual(await fs.readFile(manager.file(job.id,2,'mp3')),bytes);
  }finally{await manager?.close();await fs.rm(root,{recursive:true,force:true,maxRetries:5});}
});
test('64 and 128 kbps options produce real locally converted, decodable MP3 files',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'quranly-bitrates-'));let manager;
  try{const generated=spawnSync(ffmpeg,['-v','error','-f','lavfi','-i','sine=frequency=440:duration=3','-c:a','libmp3lame','-b:a','192k','-f','mp3','pipe:1'],{windowsHide:true,maxBuffer:1000000});assert.equal(generated.status,0);
    manager=new CollectionDownloads(root,ffmpeg,async()=>new Response(generated.stdout,{headers:{'content-type':'audio/mpeg','content-length':String(generated.stdout.length)}}));await manager.init();await manager.start(spec('64',1));await manager.start(spec('128',1));await waitFor(()=>manager.jobs.every(j=>j.status==='completed'));
    const sizes=manager.jobs.map(job=>job.entries[0].sizeBytes);assert.ok(sizes[0]<sizes[1]);for(const job of manager.jobs){const decoded=spawnSync(ffmpeg,['-v','error','-i',manager.file(job.id,1,'mp3'),'-f','null','-'],{windowsHide:true});assert.equal(decoded.status,0,decoded.stderr.toString());}
  }finally{await manager?.close();await fs.rm(root,{recursive:true,force:true,maxRetries:5});}
});
