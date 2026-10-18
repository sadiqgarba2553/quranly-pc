// Cache successful Quran text responses for revisiting pages offline.
export async function fetchTextJson(url, {signal} = {}) {
  const timeout = AbortSignal.timeout(12000);
  const combined = signal ? AbortSignal.any([signal,timeout]) : timeout;
  try {
    const response = await fetch(url,{signal:combined});
    if(!response.ok) throw Error('Text could not be loaded.');
    const data = await response.clone().json();
    if(data.code && data.code !== 200) throw Error('Text is unavailable.');
    try {const cache=await caches.open('quranly-text-v1');await cache.put(url,response);} catch {}
    return data;
  } catch(error) {
    if(signal?.aborted) throw error;
    try {const cached=await (await caches.open('quranly-text-v1')).match(url);if(cached) return await cached.json();} catch {}
    throw error;
  }
}
