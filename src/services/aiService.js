const BASE = 'https://generativelanguage.googleapis.com/v1beta';
async function request(path, key, options = {}) {
  const response = await fetch(`${BASE}/${path}`, { ...options, headers: {'Content-Type':'application/json','x-goog-api-key':key,...options.headers} });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if ([400,401,403].includes(response.status)) throw Error('The API key or model access was rejected. Check your Gemini key and project access.');
    if (response.status === 429) throw Error('Gemini usage limit reached. Try again later or check your provider quota.');
    if (response.status === 404) throw Error('This model is unavailable. Reconnect your key to refresh available models.');
    throw Error('Gemini could not complete the request. Please try again.');
  }
  return data;
}
export async function listAIModels(key, signal) {
  const data = await request('models?pageSize=1000', key, {signal});
  const models = (data.models || []).filter(m => m.supportedGenerationMethods?.includes('generateContent') && /^models\/gemini-[\w.-]+$/.test(m.name) && !/image|tts|robotics/i.test(m.name));
  if (!models.length) throw Error('No text-generation model is available for this key.');
  return models.map(m=>({id:m.name.slice(7),name:m.displayName || m.name.slice(7)}));
}
export async function generateAnswer({key, model, prompt, history = [], signal}) {
  if (!/^[\w.-]+$/.test(model)) throw Error('Choose a valid model in AI settings.');
  const contents = history.slice(-8).filter(m=>m.text && !m.error && m.mode !== 'sources').map(m=>({role:m.role === 'ai' ? 'model' : 'user',parts:[{text:m.text.slice(0,12000)}]}));
  while(contents[0]?.role === 'model') contents.shift();
  contents.push({role:'user',parts:[{text:prompt}]});
  const data = await request(`models/${model}:generateContent`,key,{method:'POST',signal,body:JSON.stringify({contents,generationConfig:{temperature:0.3,maxOutputTokens:2048}})});
  const text = data.candidates?.[0]?.content?.parts?.filter(p=>!p.thought).map(p=>p.text || '').join('');
  if (!text) throw Error('No answer was returned. Try a different question or model.');
  return text;
}
