const page=value=>Math.max(1,Math.min(604,Math.floor(Number(value)||1)));
const journal=storage=>'quranly_study_checkpoint_'+(storage.getItem('quranly_data_owner')||'guest');
export function readStudyProgress(storage){
  try{
    const record=JSON.parse(storage.getItem(journal(storage))||'null');
    if(record?.schema===1&&Number.isInteger(record.readingPage)&&record.readingPage>=1&&record.readingPage<=604&&record.memorizationProgress&&typeof record.memorizationProgress==='object'&&!Array.isArray(record.memorizationProgress))return {readingPage:record.readingPage,memorizationProgress:record.memorizationProgress};
  }catch{}
  let memorizationProgress={};try{const value=JSON.parse(storage.getItem('quranly_memorization_progress')||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))memorizationProgress=value;}catch{}
  let readingPage=1;try{readingPage=page(storage.getItem('quranly_mushaf_page'));}catch{}
  return {readingPage,memorizationProgress};
}
export function persistStudyProgress(storage,data){
  const record={schema:1,readingPage:page(data.readingPage),memorizationProgress:data.memorizationProgress||{},savedAt:new Date().toISOString()};
  // One atomic record prevents page and memorization state from separating on a
  // quota failure or interrupted write. Account journals have separate keys.
  storage.setItem(journal(storage),JSON.stringify(record));
  try{storage.setItem('quranly_mushaf_page',String(record.readingPage));storage.setItem('quranly_memorization_progress',JSON.stringify(record.memorizationProgress));}catch{}
}
