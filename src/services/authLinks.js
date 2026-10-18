// Never navigate to pasted links: credentials are sent only to our Supabase client.
export async function confirmAuthLink(auth, projectUrl, input, expectedType = 'email') {
  let url;
  try { url = new URL(String(input).trim()); }
  catch { throw Error('Paste the full email link, or the full address from your browser after opening it.'); }
  const project = new URL(projectUrl);
  const direct = url.origin === project.origin && url.pathname === '/auth/v1/verify';
  const legacyRedirect = url.origin === 'http://localhost:3000' && url.pathname === '/';
  const appRedirect = url.protocol === 'quranly:' && url.hostname === 'app';
  if (!direct && !legacyRedirect && !appRedirect) throw Error('This link does not belong to Quranly. Copy the link from your Quranly email.');
  const params = direct ? url.searchParams : new URLSearchParams(url.hash.slice(1));
  if (params.has('error') || params.has('error_code')) throw Error('This email link has expired or was already used. Try signing in, or request a new email.');
  const type = params.get('type');
  if (!['signup', 'email', 'recovery', 'magiclink'].includes(type)) throw Error('This email link is incomplete. Copy the entire link, including everything after #.');
  if ((expectedType === 'recovery') !== (type === 'recovery')) throw Error(expectedType === 'recovery' ? 'Use the password recovery link from your email.' : 'This is a recovery link. Open Forgot password to choose a new password.');
  let result;
  if (direct) {
    const token = params.get('token_hash') || params.get('token');
    if (!token) throw Error('This email link is incomplete. Copy the entire link from your email.');
    result = await auth.verifyOtp({ token_hash: token, type: type === 'signup' ? 'email' : type });
  } else {
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) throw Error('This email link is incomplete. Copy the entire browser address, including everything after #.');
    let claims;
    try { claims = JSON.parse(atob(access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); }
    catch { throw Error('This confirmation link is invalid. Request a new email.'); }
    if (claims.iss !== `${project.origin}/auth/v1`) throw Error('This link does not belong to Quranly.');
    // The issuer check is only a prefilter. Supabase validates the actual token.
    const verified = await auth.getUser(access_token);
    if (verified.error || !verified.data?.user) throw Error('This email link has expired or is invalid. Try signing in, or request a new email.');
    result = await auth.setSession({ access_token, refresh_token });
  }
  if (result.error) throw Error('This email link has expired or is invalid. Try signing in, or request a new email.');
  if (!result.data?.session) throw Error('Confirmation did not finish. Request a new email and try again.');
  return { recovery: type === 'recovery' };
}
