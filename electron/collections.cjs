const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {EventEmitter}=require('node:events');
const {spawn}=require('node:child_process');
const LIMIT=1024*1024*1024;
function audioUrl(value){
  const url=new URL(value);
  if(url.protocol!=='https:'||!/^([a-z0-9-]+\.)?mp3quran\.net$/i.test(url.hostname)||url.username||url.password||url.port||url.search||url.hash)throw Error('Unsupported recitation source');
  return url.href;
}
function validate(input){
  if(!input||!['original','64','128'].includes(input.quality))throw Error('Choose an audio quality');
  const reciter=input.reciter,edition=input.edition;
  if(!reciter||!['string','number'].includes(typeof reciter.id)||!String(reciter.id).match(/^[\w-]{1,80}$/)||typeof reciter.name!=='string'||reciter.name.length>150||typeof edition?.name!=='string'||edition.name.length>200)throw Error('Invalid collection');
  const server=audioUrl(edition.server).replace(/\/$/,'');
  if(!Array.isArray(input.surahs)||!input.surahs.length||input.surahs.length>114)throw Error('Choose up to 114 surahs');
  const ids=new Set();
  const entries=input.surahs.map(s=>{
    if(!Number.isInteger(s.id)||s.id<1||s.id>114||ids.has(s.id))throw Error('Invalid or duplicate surah');ids.add(s.id);
    return{id:s.id,name:String(s.nameEnglish||s.name||s.id).slice(0,100),arabic:String(s.nameArabic||'').slice(0,100),url:audioUrl(`${server}/${String(s.id).padStart(3,'0')}.mp3`),status:'pending',sizeBytes:0};
  });
  return{reciter:{id:reciter.id,name:reciter.name},edition:{name:edition.name,server},quality:input.quality,entries};
}
class CollectionDownloads extends EventEmitter{
  constructor(root,ffmpeg,fetcher=(...args)=>fetch(...args)){super();this.root=root;this.ffmpeg=ffmpeg;this.fetch=fetcher;this.jobs=[];this.saves=Promise.resolve();this.active=null;}
  async init(){await fs.mkdir(this.root,{recursive:true});try{
    const saved=JSON.parse(await fs.readFile(path.join(this.root,'collections.json'),'utf8'));
    for(const job of saved){
      if(!/^[0-9a-f-]{36}$/.test(job.id))continue;
      try{const clean=validate({reciter:job.reciter,edition:job.edition,quality:job.quality,surahs:job.entries.map(e=>({id:e.id,nameEnglish:e.name,nameArabic:e.arabic}))});
        const entries=clean.entries.map(entry=>{const old=job.entries.find(e=>e.id===entry.id);return{...entry,status:old.status==='complete'?'complete':'pending',sizeBytes:Number.isSafeInteger(old.sizeBytes)?old.sizeBytes:0,validator:typeof old.validator==='string'?old.validator.slice(0,300):null};});
        for(const entry of entries)if(entry.status==='complete')try{await fs.access(this.file(job.id,entry.id,'mp3'));}catch{entry.status='pending';entry.sizeBytes=0;}
        this.jobs.push({...clean,entries,id:job.id,status:entries.every(e=>e.status==='complete')?'completed':'paused',message:entries.every(e=>e.status==='complete')?'Collection ready offline.':'Saved queue restored. Resume when ready.',createdAt:job.createdAt});
      }catch{}
    }
  }catch(error){if(error.code!=='ENOENT')throw Error('The download library could not be read. Existing audio files were retained.');}await this.save();}
  file(id,surah,extension){if(!/^[0-9a-f-]{36}$/.test(id)||!Number.isInteger(surah)||surah<1||surah>114||!['mp3','part','encoding.mp3'].includes(extension))throw Error('Invalid audio file');return path.join(this.root,id,`${surah}.${extension}`);}
  snapshot(){return structuredClone(this.jobs);}
  save(){this.saves=this.saves.catch(()=>{}).then(async()=>{await fs.writeFile(path.join(this.root,'collections.json.tmp'),JSON.stringify(this.jobs));await fs.rename(path.join(this.root,'collections.json.tmp'),path.join(this.root,'collections.json'));});return this.saves;}
  changed(){this.emit('change',this.snapshot());}
  async request(url,options={}){let next=audioUrl(url);for(let n=0;n<6;n++){const res=await this.fetch(next,{...options,redirect:'manual'});if([301,302,303,307,308].includes(res.status)){const location=res.headers.get('location');await res.body?.cancel();if(!location)throw Error('Missing audio redirect');next=audioUrl(new URL(location,next).href);continue;}return res;}throw Error('Too many audio redirects');}
  async estimate(input,signal){const spec=validate(input);let cursor=0,known=0,unknown=0;const sizes=[];
    await Promise.all(Array.from({length:Math.min(4,spec.entries.length)},async()=>{while(cursor<spec.entries.length){const entry=spec.entries[cursor++];try{const response=await this.request(entry.url,{method:'HEAD',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000)});const size=Number(response.headers.get('content-length'));if(!response.ok||!Number.isSafeInteger(size)||size<=0||size>LIMIT)throw Error();known+=size;sizes.push(size);}catch{unknown++;}}}));
    const sourceBytes=known+unknown*(sizes.length?Math.round(known/sizes.length):15000000),disk=await fs.statfs(this.root);
    return{sourceBytes,approximate:unknown>0,unknownFiles:unknown,freeBytes:disk.bavail*disk.bsize,reserveBytes:sourceBytes*(spec.quality==='original'?1:3)+100000000,count:spec.entries.length};
  }
  async start(input){const spec=validate(input);const existing=this.jobs.find(j=>j.reciter.id===spec.reciter.id&&j.edition.server===spec.edition.server&&j.quality===spec.quality&&j.entries.map(e=>e.id).join()===spec.entries.map(e=>e.id).join());if(existing)return this.resume(existing.id);
    if(this.jobs.length>=30)throw Error('Remove an old collection before adding another');
    const job={...spec,id:randomUUID(),status:'queued',message:'Waiting to download.',createdAt:new Date().toISOString()};this.jobs.push(job);await this.save();this.changed();this.pump();return this.snapshot();}
  job(id){const job=this.jobs.find(j=>j.id===id);if(!job)throw Error('Collection not found');return job;}
  async pause(id){const job=this.job(id);if(job.status==='completed')return this.snapshot();job.status='paused';job.message='Paused. Completed surahs and partial downloads are kept.';if(this.active?.id===id)this.active.controller.abort();await this.save();this.changed();return this.snapshot();}
  async resume(id){const job=this.job(id);if(this.active?.id===id&&this.active.controller.signal.aborted)await this.active.done;if(!['paused','failed'].includes(job.status))return this.snapshot();job.status='queued';job.message='Waiting to resume.';await this.save();this.changed();this.pump();return this.snapshot();}
  async remove(id){await this.pause(id);if(this.active?.id===id)await this.active.done;this.jobs=this.jobs.filter(j=>j.id!==id);await this.save();await fs.rm(path.join(this.root,id),{recursive:true,force:true,maxRetries:5,retryDelay:200});this.changed();return this.snapshot();}
  async download(job,entry,signal){
    const partial=this.file(job.id,entry.id,'part');let offset=await fs.stat(partial).then(s=>s.size).catch(()=>0);
    // A validator is required before appending bytes from a previous request.
    if(offset&&!entry.validator){await fs.rm(partial,{force:true});offset=0;}
    const headers=offset?{Range:`bytes=${offset}-`,'If-Range':entry.validator}:{};
    let response=await this.request(entry.url,{headers,signal});
    if(response.status===416){await response.body?.cancel();if(!offset)throw Error('Audio server rejected the download');await fs.rm(partial,{force:true});entry.validator=null;return this.download(job,entry,signal);}
    if(!response.ok||!response.body)throw Error(`Audio server returned ${response.status}`);
    if(/text\/|application\/(json|xml)/i.test(response.headers.get('content-type')||'')){await response.body.cancel();throw Error('The audio server did not return an audio file');}
    const range=response.headers.get('content-range');
    if(response.status===206&&(!offset||!range?.startsWith(`bytes ${offset}-`))){await response.body.cancel();throw Error('Invalid audio resume response');}
    if(response.status!==206)offset=0;
    const length=Number(response.headers.get('content-length'))||0,total=response.status===206?Number(range.split('/')[1]):length;
    if(total>LIMIT){await response.body.cancel();throw Error('Audio file exceeds the 1 GB limit');}
    const disk=await fs.statfs(this.root);if(disk.bavail*disk.bsize<Math.max((total||100000000)-offset,0)+100000000){await response.body.cancel();throw Error('Not enough free storage. Free some space and resume.');}
    entry.validator=response.headers.get('etag')||response.headers.get('last-modified')||null;await this.save();
    const file=await fs.open(partial,offset?'a':'w');let received=offset,last=0;
    try{for await(const chunk of response.body){signal.throwIfAborted();received+=chunk.length;if(received>LIMIT)throw Error('Audio file exceeds the 1 GB limit');let at=0;while(at<chunk.length){const {bytesWritten}=await file.write(chunk,at,chunk.length-at);if(!bytesWritten)throw Error('Could not save audio');at+=bytesWritten;}if(Date.now()-last>250){job.receivedBytes=received;job.totalBytes=total;this.changed();last=Date.now();}}await file.sync();}finally{await file.close();}
    if(!received||(total&&received!==total))throw Error('Audio download was interrupted. Resume to retry.');
    return partial;
  }
  async encode(input,output,quality,signal){await fs.rm(output,{force:true});await new Promise((resolve,reject)=>{
    const child=spawn(this.ffmpeg,['-nostdin','-hide_banner','-loglevel','error','-y','-protocol_whitelist','file,pipe','-f','mp3','-i',input,'-map','0:a:0','-vn','-codec:a','libmp3lame','-b:a',`${quality}k`,output],{windowsHide:true,stdio:['ignore','ignore','pipe']});let stderr='';const abort=()=>child.kill();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();child.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-2000);});child.once('error',error=>{signal.removeEventListener('abort',abort);reject(error);});child.once('close',code=>{signal.removeEventListener('abort',abort);if(signal.aborted)reject(signal.reason);else if(code!==0)reject(Error(`Audio conversion failed. Resume to retry. ${stderr.slice(-250)}`));else resolve();});
  });}
  pump(){if(this.active||this.closing)return;const job=this.jobs.find(j=>j.status==='queued');if(!job)return;
    const controller=new AbortController();let finish;const done=new Promise(resolve=>{finish=resolve;});this.active={id:job.id,controller,done};
    (async()=>{try{await fs.mkdir(path.join(this.root,job.id),{recursive:true});
      for(const entry of job.entries){if(entry.status==='complete')continue;controller.signal.throwIfAborted();job.status='downloading';job.currentSurah=entry.id;job.receivedBytes=0;job.totalBytes=0;job.message=`Downloading ${entry.name}`;await this.save();this.changed();
        let input;for(let attempt=0;attempt<3;attempt++){try{input=await this.download(job,entry,AbortSignal.any([controller.signal,AbortSignal.timeout(30*60*1000)]));break;}catch(error){if(controller.signal.aborted||attempt===2||/storage|1 GB|Unsupported|Invalid audio|not return an audio/.test(error.message))throw error;job.message=`Connection interrupted. Retrying ${entry.name} (${attempt+2}/3)`;this.changed();await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));}}
        controller.signal.throwIfAborted();const final=this.file(job.id,entry.id,'mp3');
        if(job.quality==='original')await fs.rename(input,final);else{job.status='converting';job.message=`Saving ${entry.name} at ${job.quality} kbps`;this.changed();const encoded=this.file(job.id,entry.id,'encoding.mp3');await this.encode(input,encoded,job.quality,controller.signal);await fs.rename(encoded,final);await fs.rm(input,{force:true});}
        entry.status='complete';entry.sizeBytes=(await fs.stat(final)).size;await this.save();this.changed();
      }
      job.status='completed';job.message='Collection ready offline.';delete job.currentSurah;
    }catch(error){if(controller.signal.aborted){job.status='paused';job.message='Paused. Resume to continue your saved download.';}else{job.status='failed';job.message=error.message;}}
    finally{await this.save().catch(error=>{job.status='failed';job.message=`Could not save download queue: ${error.message}`;});this.changed();this.active=null;finish();this.pump();}})();
  }
  tracks(){return this.jobs.flatMap(job=>job.entries.filter(e=>e.status==='complete').map(e=>({id:`${job.id}/${e.id}`,collectionId:job.id,surahId:e.id,surahName:e.name,surahArabic:e.arabic,reciterId:job.reciter.id,reciterName:job.reciter.name,audioUrl:e.url,sizeBytes:e.sizeBytes,quality:job.quality,editionName:job.edition.name})));}
  resolveAudio(source){const track=this.tracks().reverse().find(t=>t.audioUrl===source);return track?`quranly-audio://cache/${track.collectionId}/${track.surahId}`:null;}
  resolveFile(url){const parsed=new URL(url),parts=parsed.pathname.split('/').filter(Boolean);if(parsed.protocol!=='quranly-audio:'||parsed.hostname!=='cache'||parts.length!==2)return null;const job=this.jobs.find(j=>j.id===parts[0]),entry=job?.entries.find(e=>String(e.id)===parts[1]&&e.status==='complete');return entry?this.file(job.id,entry.id,'mp3'):null;}
  async close(){this.closing=true;if(this.active){const {id,done}=this.active;await this.pause(id);await done;}await this.saves;}
}
module.exports={CollectionDownloads,validate,audioUrl};
