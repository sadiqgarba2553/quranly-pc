import {useEffect,useRef,useState} from 'react';
import {auth,onAuthStateChanged,getUserProgress,saveUserProgress} from '../services/cloud';
import {createCloudBackup} from '../services/cloudBackup';
import {progressSnapshot,switchAccountProgress} from '../utils/accountProgress';
import {evaluateUserAchievements} from '../utils/achievements';

export function backupSnapshot(state,position=0) {
  const stats=evaluateUserAchievements(state);
  return {...progressSnapshot(state),playbackResume:{
    surahId:state.currentTrack?.surah?.id,reciterId:state.currentTrack?.reciter?.id,
    moshafIndex:state.currentTrack?.moshafIndex||0,position:Math.max(0,Math.floor(position||0)),
    reciter:state.currentTrack?.reciter,queueIds:state.queue.map(s=>s.id),queueIndex:state.queueIndex,
    volume:state.volume,speed:state.playbackSpeed,repeat:state.repeatMode,shuffle:state.shuffleOn,
  },totalMinutes:stats.totalMinutes,totalXP:stats.totalXP,streak:stats.streak,levelTitle:stats.levelTitle,unlockedBadgesCount:stats.unlockedCount};
}

export default function useAccountBackup(state,dispatch,audio,timeStore,pendingResumeRef) {
  const latest=useRef(state);latest.current=state;
  const engine=useRef(null);
  const playedSinceSignIn=useRef(false);
  const [status,setStatus]=useState({state:'guest',lastSaved:null});
  const checkpoint=useRef(()=>{});
  checkpoint.current=()=>{
    const owner=localStorage.getItem('quranly_data_owner')||'guest';
    if(owner!==(latest.current.currentUser?.uid||'guest'))return;
    const snapshot=backupSnapshot(latest.current,timeStore.peek());
    if(latest.current.isPlaying)playedSinceSignIn.current=true;
    localStorage.setItem(`quranly_account_progress_${owner}`,JSON.stringify(snapshot));
    localStorage.setItem('quranly_playback_resume',JSON.stringify(snapshot.playbackResume));
    if(engine.current?.uid===owner){
      const patch={...snapshot};
      // The temporary default player while cloud data loads is not a user edit.
      if(!latest.current.isCloudLoaded&&!playedSinceSignIn.current)delete patch.playbackResume;
      engine.current.update(patch);
    }
  };
  useEffect(()=>{
    let previousUid=Symbol('initial');
    const unsubscribe=onAuthStateChanged(auth,user=>{
      const uid=user?.uid||null;
      if(previousUid===uid){dispatch({type:'SET_CURRENT_USER',payload:user});return;}
      checkpoint.current();engine.current?.stop();engine.current=null;
      previousUid=uid;
      playedSinceSignIn.current=false;
      audio.pause();dispatch({type:'PAUSE'});
      const scoped=switchAccountProgress(uid,{...latest.current,resumePosition:timeStore.peek()});
      if(scoped){pendingResumeRef.current=scoped.playbackResume;timeStore.update(scoped.playbackResume?.position||0);dispatch({type:'SET_ACCOUNT_PROGRESS',payload:scoped,restorePlayback:true});}
      dispatch({type:'SET_CURRENT_USER',payload:user});
      if(!user){setStatus({state:'guest',lastSaved:null});dispatch({type:'RESET_USER_DATA'});return;}
      const localState={...latest.current,...scoped};
      if(scoped)localState.favouriteReciterIds=new Set(scoped.favouriteReciterIds);
      const local=backupSnapshot(localState,timeStore.peek());
      if(scoped)local.playbackResume=scoped.playbackResume;
      const worker=createCloudBackup({uid,storage:localStorage,initial:local,read:getUserProgress,write:saveUserProgress,
        onStatus:setStatus,
        onData:(data,first)=>{
          const restore=first&&!latest.current.isPlaying;
          if(restore){
            const position=Math.max(0,Number(data.playbackResume?.position)||0);
            pendingResumeRef.current=data.playbackResume ? {...data.playbackResume,position} : null;
            timeStore.update(position);
            if(audio.readyState>=1&&audio.seekable.length&&audio.seekable.end(audio.seekable.length-1)>=position&&data.playbackResume?.surahId===latest.current.currentTrack?.surah?.id&&data.playbackResume?.reciterId===latest.current.currentTrack?.reciter?.id){audio.currentTime=Math.min(position,audio.duration||position);pendingResumeRef.current=null;}
          }
          dispatch({type:'SYNC_CLOUD_DATA',payload:data,restorePlayback:restore});
        }});
      engine.current=worker;void worker.cycle();
    });
    const tick=()=>{checkpoint.current();void engine.current?.cycle();};
    const visible=()=>{if(!document.hidden)tick();else{checkpoint.current();void engine.current?.cycle();}};
    const interval=setInterval(tick,15000);
    const checkpointInterval=setInterval(()=>checkpoint.current(),5000);
    window.addEventListener('online',tick);
    window.addEventListener('pagehide',tick);
    window.addEventListener('quranly-analytics-changed',tick);
    document.addEventListener('visibilitychange',visible);
    audio.addEventListener('pause',tick);
    audio.addEventListener('seeked',tick);
    return ()=>{checkpoint.current();engine.current?.stop();unsubscribe();clearInterval(interval);clearInterval(checkpointInterval);
      window.removeEventListener('online',tick);window.removeEventListener('pagehide',tick);window.removeEventListener('quranly-analytics-changed',tick);
      document.removeEventListener('visibilitychange',visible);audio.removeEventListener('pause',tick);audio.removeEventListener('seeked',tick);};
  },[audio,dispatch,timeStore,pendingResumeRef]);
  useEffect(()=>{
    checkpoint.current();
    const timer=setTimeout(()=>void engine.current?.cycle(),1200);
    return ()=>clearTimeout(timer);
  },[state]);
  return status;
}
