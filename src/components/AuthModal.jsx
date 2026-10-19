import { useEffect, useRef, useState } from 'react';
import { X, User, CloudCheck, LogOut, Loader } from 'lucide-react';
import { useUserData } from '../context/PlayerContext';
import { signUpWithEmail, signInWithEmail, resetPassword, verifyEmailLink, resendConfirmation, updatePassword, logOutUser, updateUserProfileName, saveUserProgress } from '../services/cloud';
import './AuthModal.css';
import { progressSnapshot } from '../utils/accountProgress';

export default function AuthModal({isOpen,onClose}) {
  const data = useUserData();
  const { currentUser, favouriteSurahIds, favouriteReciterIds, bookmarkedVerses, customPlaylists, groupKhatms, listeningHistory, dailyGoalMinutes, verseReflections, completedAzkarCount } = data;
  const [mode,setMode] = useState('signin');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [name,setName] = useState('');
  const [link,setLink] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const dialog = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    dialog.current?.focus();
    return () => previous?.focus();
  },[isOpen]);
  useEffect(() => { setName(currentUser?.displayName || ''); },[currentUser?.displayName]);
  if (!isOpen) return null;
  const changeMode = value => { setMode(value); setError(''); setMessage(''); setPassword(''); setLink(''); };
  const run = async task => { setBusy(true); setError(''); setMessage(''); try { await task(); } catch(e) { setError(e.message || 'Could not complete this request. Please try again.'); } finally { setBusy(false); } };
  const submit = event => {
    event.preventDefault();
    run(async () => {
      if (mode === 'forgot') { await resetPassword(email.trim()); setMode('recovery'); setMessage('Check your email. Copy the recovery link and paste it below to choose a new password.'); return; }
      if (mode === 'verify' || mode === 'recovery') {
        const verified = await verifyEmailLink(link, mode === 'recovery' ? 'recovery' : 'email');
        if (mode === 'recovery') { if (!verified.recovery) throw Error('Use the password recovery link from your email.'); await updatePassword(password); setMessage('Your password has been updated.'); }
        else setMessage('Email confirmed. You are signed in.');
        setLink(''); setPassword(''); setMode('signin'); return;
      }
      if (mode === 'signup') {
        const result = await signUpWithEmail(email.trim(), password, name.trim());
        if (result?.confirmationRequired) { setMode('verify'); setPassword(''); setMessage('Confirm your email, then return to sign in. You can also paste the confirmation link below.'); return; }
      } else await signInWithEmail(email.trim(),password);
      onClose();
    });
  };
  const sync = () => run(async () => {
    await saveUserProgress(currentUser.uid,{ ...progressSnapshot(data), displayName:currentUser.displayName || '' });
    setMessage('Your progress was saved to Supabase.');
  });
  const focusTrap = event => {
    if (event.key !== 'Tab') return;
    const items=[...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href]')];
    const first=items[0],last=items.at(-1);
    if (event.shiftKey && document.activeElement===first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement===last) { event.preventDefault(); first?.focus(); }
  };
  const profile = currentUser && !['verify','recovery'].includes(mode);
  const title = profile ? 'Your account' : mode==='signup' ? 'Create your account' : mode==='forgot' ? 'Reset your password' : mode==='verify' ? 'Confirm your email' : mode==='recovery' ? 'Choose a new password' : 'Welcome back';
  return <div className="account-overlay" onClick={onClose}><section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title" tabIndex="-1" ref={dialog} onKeyDown={focusTrap} onClick={event=>event.stopPropagation()}>
    <button className="account-close" aria-label="Close account" onClick={onClose}><X size={20}/></button>
    <div className="account-symbol"><User size={25}/></div><h2 id="account-title">{title}</h2><p className="account-intro">{profile ? currentUser.email : 'Your Quranly account is secured by Supabase.'}</p>
    {error && <p className="account-error" role="alert">{error}</p>}{message && <p className="account-message" role="status">{message}</p>}
    {profile ? <><form className="account-form" onSubmit={event=>{event.preventDefault();run(async()=>{await updateUserProfileName(name.trim());setMessage('Display name updated.');});}}><label htmlFor="account-name">Display name</label><input id="account-name" value={name} onChange={event=>setName(event.target.value)} maxLength="40" required/><button className="account-primary" disabled={busy}>Save name</button></form><div className="account-summary"><span><strong>{favouriteSurahIds.size+favouriteReciterIds.size}</strong> favorites</span><span><strong>{bookmarkedVerses.length}</strong> bookmarks</span><span><strong>{dailyGoalMinutes} min</strong> daily goal</span></div><button className="account-secondary" onClick={sync} disabled={busy}><CloudCheck size={17}/>{busy ? 'Saving…' : 'Sync progress now'}</button><button className="account-signout" disabled={busy} onClick={()=>run(async()=>{await logOutUser();onClose();})}><LogOut size={16}/>Sign out</button></> : <>
    <form className="account-form" onSubmit={submit}>
      {mode==='signup' && <><label htmlFor="account-name">Your name</label><input id="account-name" autoComplete="name" value={name} onChange={event=>setName(event.target.value)} required maxLength="40"/></>}
      {!['verify','recovery'].includes(mode) && <><label htmlFor="account-email">Email address</label><input id="account-email" type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} required/></>}
      {['verify','recovery'].includes(mode) && <><label htmlFor="account-link">Email confirmation or recovery link</label><textarea id="account-link" value={link} onChange={event=>setLink(event.target.value)} placeholder="Paste the full email link or browser address" autoComplete="off" spellCheck={false} required rows="3"/><small>Copy the link from your email. If you already opened it, copy the entire browser address, even if localhost could not open. Keep this link private.</small></>}
      {['signin','signup','recovery'].includes(mode) && <><label htmlFor="account-password">{mode==='recovery' ? 'New password' : 'Password'}</label><input id="account-password" type="password" autoComplete={mode==='signin' ? 'current-password' : 'new-password'} value={password} onChange={event=>setPassword(event.target.value)} minLength={mode==='signin' ? undefined : 8} required/>{mode!=='signin' && <small>Use at least 8 characters.</small>}</>}
      <button className="account-primary" disabled={busy}>{busy ? <Loader size={17} className="spin"/> : mode==='signup' ? 'Create account' : mode==='forgot' ? 'Send recovery email' : mode==='verify' ? 'Confirm email' : mode==='recovery' ? 'Reset password' : 'Sign in'}</button>
    </form>
    {mode==='verify' && <form className="account-form" onSubmit={event=>{event.preventDefault();run(async()=>{await resendConfirmation(email.trim());setMessage('If this account needs confirmation, a new email has been sent. Check your inbox and spam folder.');});}}><label htmlFor="resend-email">Email address</label><input id="resend-email" type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} required/><button className="account-secondary" disabled={busy}>Resend confirmation email</button></form>}
    <div className="account-links">{mode==='signin' ? <><button onClick={()=>changeMode('signup')}>Create an account</button><button onClick={()=>changeMode('forgot')}>Forgot password?</button><button onClick={()=>changeMode('verify')}>Confirm an email link</button></> : <button onClick={()=>changeMode('signin')}>Back to sign in</button>}</div></>}
    <p className="account-footnote">Quranly 0.5.0 · All features are free</p>
  </section></div>;
}
