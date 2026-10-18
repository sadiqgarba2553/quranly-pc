const copy = value => JSON.parse(JSON.stringify(value));
// Postgres jsonb reorders object keys; that must not look like a user edit.
const stable = value => JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])) : item);
const same = (a,b) => stable(a) === stable(b);

// One serialized, durable outbox per account. Only changed fields are uploaded;
// cloud refreshes cannot replace fields waiting to be saved on this device.
export function createCloudBackup({uid,storage,initial,read,write,onData,onStatus}) {
  const key = `quranly_backup_pending_${uid}`;
  let pending;
  try {pending=JSON.parse(storage.getItem(key) || '{}');} catch {pending={};}
  let seen=copy(initial),ready=false,stopped=false,running=null,lastSaved=null;
  const persist=()=>storage.setItem(key,JSON.stringify(pending));
  const status=(state)=>{if(!stopped)onStatus({state,lastSaved});};
  const update=snapshot=>{
    if(stopped)return;
    const next=copy(snapshot);
    for(const field of Object.keys(next))if(!same(next[field],seen[field]))pending[field]=next[field];
    seen={...seen,...next};persist();
    if(Object.keys(pending).length)status('pending');
  };
  const cycle=()=>{
    if(stopped)return Promise.resolve();
    if(running)return running;
    let succeeded=false;
    running=(async()=>{
      try {
        if(!ready){
          status('loading');
          const remote=await read(uid);
          if(stopped)return;
          if(!remote)pending={...seen,...pending};
          seen={...seen,...remote,...pending};
          persist();ready=true;onData(copy(seen),true);
        }
        if(Object.keys(pending).length){
          status('saving');
          const sent=copy(pending);
          await write(uid,sent);
          if(stopped)return;
          for(const field of Object.keys(sent))if(same(pending[field],sent[field]))delete pending[field];
          persist();lastSaved=Date.now();
        } else {
          const remote=await read(uid);
          if(stopped)return;
          // Edits can arrive while the request is in flight.
          if(remote){const next={...seen,...remote,...pending};if(!same(next,seen)){seen=next;onData(copy(seen),false);}}
        }
        status(Object.keys(pending).length?'pending':'saved');
        succeeded=true;
      } catch {status('offline');}
    })().finally(()=>{running=null;if(succeeded&&!stopped&&Object.keys(pending).length)void cycle();});
    return running;
  };
  return {uid,update,cycle,stop(){stopped=true;persist();},get pending(){return copy(pending);}};
}
