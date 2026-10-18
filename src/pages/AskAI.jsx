import { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Key, Loader2, BookOpen, X, RotateCcw, Trash2, Copy, Check } from 'lucide-react';
import { useUserData } from '../context/PlayerContext';
import { listAIModels, generateAnswer } from '../services/aiService';
import { retrieveIslamicContext, buildGroundedPrompt } from '../services/ragService';
import './AskAI.css';
const starters = ['What does the Quran say about patience?', 'Verses about gratitude', 'The importance of kindness'];
function Sources({context}) {
  if(!context) return null;
  return <div className="retrieved-sources-container"><p className="sources-header"><BookOpen size={15}/>Retrieved sources</p>
    {context.verses?.map(v=><a className="source-pill" key={v.verseKey} href={`https://quran.com/${v.verseKey.replace(':','/')}`} target="_blank" rel="noreferrer"><strong>Quran {v.verseKey}</strong><span>{v.translation}</span></a>)}
    {context.tafsir?.map(t=><details className="source-pill" key={t.verseKey}><summary>{t.sourceName} · {t.verseKey}</summary><p>{t.text}</p></details>)}
    {context.hadiths?.map(h=><div className="source-pill" key={`${h.bookName}-${h.hadithNumber}`}><strong>{h.bookName} #{h.hadithNumber} · {h.status}</strong><span>{h.textEnglish}</span></div>)}
  </div>;
}
function AskChat({owner}) {
  const storageKey = `quranly_ai_chat_${owner}`;
  const [apiKey,setApiKey]=useState(()=>localStorage.getItem('quranly_gemini_key') || '');
  const [draftKey,setDraftKey]=useState(apiKey);
  const [model,setModel]=useState(()=>localStorage.getItem('quranly_gemini_model') || '');
  const [models,setModels]=useState([]);
  const [messages,setMessages]=useState(()=>{try {const data=JSON.parse(localStorage.getItem(storageKey));return Array.isArray(data) ? data.slice(-40) : [];} catch {return [];} });
  const [input,setInput]=useState('');
  const [mode,setMode]=useState(apiKey ? 'ai' : 'sources');
  const [settings,setSettings]=useState(false);
  const [connecting,setConnecting]=useState(false);
  const [loading,setLoading]=useState(false);
  const [status,setStatus]=useState('');
  const [keyError,setKeyError]=useState('');
  const [copied,setCopied]=useState(null);
  const controller=useRef(null), connection=useRef(null), chat=useRef(null), busy=useRef(false);
  useEffect(()=>{try {localStorage.setItem(storageKey,JSON.stringify(messages.slice(-40)));} catch {}},[messages,storageKey]);
  useEffect(()=>{chat.current?.scrollTo({top:chat.current.scrollHeight,behavior:'instant'});},[messages,loading]);
  useEffect(()=>()=>{controller.current?.abort();connection.current?.abort();},[]);
  const connect=async event=>{
    event.preventDefault(); if(!draftKey.trim() || connecting) return;
    setConnecting(true);setKeyError(''); const task=new AbortController();connection.current=task;
    const timer=setTimeout(()=>task.abort(),15000);
    try {const available=await listAIModels(draftKey.trim(),task.signal); const next=available.find(m=>m.id===model)?.id || available.find(m=>/flash/.test(m.id))?.id || available[0].id;
      setModels(available);setModel(next);setApiKey(draftKey.trim());setMode('ai');setSettings(false);
      localStorage.setItem('quranly_gemini_key',draftKey.trim());localStorage.setItem('quranly_gemini_model',next);
    } catch(error) {setKeyError(error.name==='AbortError' ? 'Connection timed out. Check your connection and try again.' : error.message);} finally {clearTimeout(timer);setConnecting(false);}
  };
  const send=async (question=input)=>{
    if(!question.trim() || busy.current) return;
    if(mode==='ai' && !apiKey) {setSettings(true);return;}
    busy.current=true;setLoading(true);setInput('');setStatus('Finding Quran and Hadith sources…');
    const task=new AbortController();controller.current=task;
    const timer=setTimeout(()=>task.abort('timeout'),45000);
    const userMessage={id:crypto.randomUUID(),role:'user',text:question.trim(),mode};
    setMessages(prev=>[...prev,userMessage]);
    try {const context=await retrieveIslamicContext(question.trim(),{signal:task.signal});
      const hasSources=context.verses.length || context.hadiths.length;
      let text=hasSources ? 'Here are the sources matching your search.' : 'No matching sources were found. Try a shorter topic such as patience, gratitude, or kindness.';
      if(mode==='ai' && hasSources) {setStatus('Preparing an answer from the retrieved sources…');
        let selected=model;
        if(!selected) {const available=await listAIModels(apiKey,task.signal);selected=available.find(m=>/flash/.test(m.id))?.id || available[0].id;setModel(selected);localStorage.setItem('quranly_gemini_model',selected);}
        text=await generateAnswer({key:apiKey,model:selected,prompt:buildGroundedPrompt(question,context),history:messages,signal:task.signal});
      }
      if(!task.signal.aborted) setMessages(prev=>[...prev,{id:crypto.randomUUID(),role:'ai',text,context,mode}]);
    } catch(error) {if(controller.current===task) setMessages(prev=>[...prev,{id:crypto.randomUUID(),role:'ai',text:task.signal.aborted ? task.signal.reason==='timeout' ? 'The request timed out. Please try again.' : 'Request stopped.' : error.message || 'Could not connect. Check your connection and try again.',error:true,question,mode}]);}
    finally {clearTimeout(timer);if(controller.current===task){setLoading(false);setStatus('');busy.current=false;}}
  };
  const removeKey=()=>{connection.current?.abort();setApiKey('');setDraftKey('');setModel('');setModels([]);setMode('sources');localStorage.removeItem('quranly_gemini_key');localStorage.removeItem('quranly_gemini_model');setSettings(false);};
  return <div className="ask-ai-page">
    <header className="ask-ai-header"><div><h1><Sparkles size={26}/>Ask the Quran</h1><p>Explore sources. Reflect with context.</p></div><div className="ai-header-actions"><button onClick={()=>{controller.current?.abort();setMessages([]);}} disabled={loading || !messages.length} aria-label="Clear conversation" title="Clear conversation"><Trash2 size={18}/></button><button onClick={()=>setSettings(v=>!v)} aria-label="AI connection settings" aria-expanded={settings} title="AI connection settings"><Key size={19}/></button></div></header>
    <div className="ai-mode-bar"><div role="group" aria-label="Answer mode"><button aria-pressed={mode==='sources'} onClick={()=>setMode('sources')} disabled={loading}><BookOpen size={15}/>Source search</button><button aria-pressed={mode==='ai'} onClick={()=>{setMode('ai');if(!apiKey)setSettings(true);}} disabled={loading}><Sparkles size={15}/>AI answer</button></div><span>{mode==='sources' ? 'No API key needed' : apiKey ? 'Personal Gemini connection' : 'Connect Gemini to continue'}</span></div>
    {settings && <section className="api-key-card" aria-label="AI connection"><div className="ai-settings-heading"><h2>Connect Gemini</h2><button aria-label="Close AI settings" onClick={()=>setSettings(false)}><X size={18}/></button></div><p>Use your own key for AI answers. Your key stays on this device. Source search works without one.</p><form onSubmit={connect} className="api-key-input-group"><label className="sr-only" htmlFor="gemini-key">Gemini API key</label><input id="gemini-key" type="password" autoComplete="off" placeholder="Gemini API key" value={draftKey} onChange={e=>setDraftKey(e.target.value)} required/><button type="submit" className="save-key-btn" disabled={connecting || !draftKey.trim()}>{connecting ? 'Connecting…' : 'Save Key'}</button></form>{models.length>0 && <label className="ai-model-label">Model<select value={model} onChange={e=>{setModel(e.target.value);localStorage.setItem('quranly_gemini_model',e.target.value);}}>{models.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}{apiKey && <button className="ai-remove-key" onClick={removeKey}>Remove saved key</button>}{keyError && <p role="alert" className="ai-error">{keyError}</p>}<a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Get a Gemini API key</a></section>}
    <div className="chat-container" ref={chat} role="log" aria-label="Conversation" aria-live="polite">
      {!messages.length && <div className="ai-empty-state"><BookOpen size={32}/><h2>What would you like to explore?</h2><p>Search Quran translations and available Hadith sources, or connect Gemini for a sourced explanation.</p><div className="ai-starters">{starters.map(q=><button key={q} onClick={()=>setInput(q)}>{q}</button>)}</div></div>}
      {messages.map(m=><article key={m.id} className={`chat-message ${m.role} ${m.error ? 'error' : ''}`}><div className="message-heading"><strong>{m.role==='user' ? 'You' : m.mode==='sources' ? 'Quranly sources' : 'Quranly AI'}</strong>{m.role==='ai' && !m.error && <button aria-label="Copy answer" onClick={async()=>{try {await navigator.clipboard.writeText(m.text);setCopied(m.id);} catch {setCopied(null);}}}>{copied===m.id ? <Check size={14}/> : <Copy size={14}/>}</button>}</div><p className="message-text">{m.text}</p>{m.context && <Sources context={m.context}/ >}{m.error && <button className="ai-retry" disabled={loading} onClick={()=>send(m.question)}><RotateCcw size={14}/>Try again</button>}</article>)}
      {loading && <div className="ai-loading" role="status"><Loader2 size={17} className="spin"/>{status}</div>}
    </div>
    <form className="chat-input-wrapper" onSubmit={e=>{e.preventDefault();send();}}><label className="sr-only" htmlFor="ai-question">Your question</label><textarea id="ai-question" rows="2" placeholder="Ask about a verse or topic…" maxLength={2000} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter' && !e.shiftKey){e.preventDefault();send();}}}/>{loading ? <button type="button" className="chat-send-btn" aria-label="Stop response" onClick={()=>controller.current?.abort()}><X size={19}/></button> : <button className="chat-send-btn" aria-label="Send question" disabled={!input.trim()}><Send size={19}/></button>}</form>
    <p className="ai-footnote">Conversations are saved on this device. AI can make mistakes; check the cited sources.</p>
  </div>;
}
export default function AskAI(){const {currentUser}=useUserData();return <AskChat key={currentUser?.uid || 'guest'} owner={currentUser?.uid || 'guest'}/>;}
