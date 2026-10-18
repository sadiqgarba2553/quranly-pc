/**
 * reciterPhotos.js — Elegant Qari Photo & Local Assets Resolver
 */

// Local static Qari photo mappings uploaded to public/reciters/
const LOCAL_QARI_IMAGES = {
  'ali jaber': '/reciters/ali-jaber.jpg',
  'ali abdullah jaber': '/reciters/ali-jaber.jpg',
  'abdul basit': '/reciters/abdul-basit.jpg',
  'abdulbasit abdulsamad': '/reciters/abdul-basit.jpg',
  'abdulbaset abdulsamad': '/reciters/abdul-basit.jpg',
  'abdul basit abdul samad': '/reciters/abdul-basit.jpg',
  'saad al ghamdi': '/reciters/saad-al-ghamdi.jpg',
  'saad alghamdi': '/reciters/saad-al-ghamdi.jpg',
  'abdul rahman al sudais': '/reciters/abdulrahman-al-sudais.jpg',
  'abdulrahman alsudaes': '/reciters/abdulrahman-al-sudais.jpg',
  'abdurrahman as sudais': '/reciters/abdulrahman-al-sudais.jpg',
  'muhammad siddiq al minshawi': '/reciters/Mohammed Siddiq Al-Minshawi.jpg',
  'mohamed siddiq el minshawi': '/reciters/Mohammed Siddiq Al-Minshawi.jpg',
  'maher al mueaqly': '/reciters/Maher Al Meaqli.jpg',
  'mishary rashid al afasy': '/reciters/Mishary Alafasi.jpg',
  'mahmoud khalil al hosary': '/reciters/Mahmoud Khalil Al-Hussary.jpg',
  'abdulelah bin aoun': '/reciters/Abdulelah bin Aoun.jpg',
  'aoun': '/reciters/Abdulelah bin Aoun.jpg',

  'adel al-khalbany': '/reciters/Adel Al-Khalbany.jpg',
  'khalbany': '/reciters/Adel Al-Khalbany.jpg',
  'khalbani': '/reciters/Adel Al-Khalbany.jpg',

  'ahmad talib bin humaid': '/reciters/Ahmad Talib bin Humaid.jpg',
  'humaid': '/reciters/Ahmad Talib bin Humaid.jpg',

  'akram alalaqmi': '/reciters/Akram Alalaqmi.jpg',
  'alalaqmi': '/reciters/Akram Alalaqmi.jpg',

  'al-qaria yassen': '/reciters/Al-Qaria Yassen.jpg',
  'yassen': '/reciters/Al-Qaria Yassen.jpg',

  'alashri omran': '/reciters/Alashri Omran.jpg',
  'omran': '/reciters/Alashri Omran.jpg',

  'alhusayni al-azazi': '/reciters/Alhusayni Al-Azazi.jpg',
  'azazi': '/reciters/Alhusayni Al-Azazi.jpg',
  'alhusayni': '/reciters/Alhusayni Al-Azazi.jpg',

  'aloyoon al-koshi': '/reciters/Aloyoon Al-Koshi.jpg',
  'koshi': '/reciters/Aloyoon Al-Koshi.jpg',

  'alzain mohammad ahmad': '/reciters/Alzain Mohammad Ahmad.jpg',
  'alzain': '/reciters/Alzain Mohammad Ahmad.jpg',

  'idrees abkr': '/reciters/Idrees Abkr.jpg',
  'idrees': '/reciters/Idrees Abkr.jpg',
  'abkr': '/reciters/Idrees Abkr.jpg',

  'ibrahim al-akdar': '/reciters/ibrahim-al-akhdar.jpg',
  'ibrahim-al-akhdar': '/reciters/ibrahim-al-akhdar.jpg',
  'ibrahim al-akhdar': '/reciters/ibrahim-al-akhdar.jpg',
  'akhdar': '/reciters/ibrahim-al-akhdar.jpg',
  'akdar': '/reciters/ibrahim-al-akhdar.jpg',

  'khalid almohana': '/reciters/Khalid Almohana.jpg',
  'almohana': '/reciters/Khalid Almohana.jpg',

  'maher al meaqli': '/reciters/Maher Al Meaqli.jpg',
  'maher al-muaiqly': '/reciters/Maher Al Meaqli.jpg',
  'meaqli': '/reciters/Maher Al Meaqli.jpg',
  'muaiqly': '/reciters/Maher Al Meaqli.jpg',

  'maher shakhashero': '/reciters/Maher Shakhashero.jpg',
  'shakhashero': '/reciters/Maher Shakhashero.jpg',

  'mahmoud ali albanna': '/reciters/Mahmoud Ali  Albanna.jpg',
  'albanna': '/reciters/Mahmoud Ali  Albanna.jpg',
  'banna': '/reciters/Mahmoud Ali  Albanna.jpg',

  'mahmoud khalil al-hussary': '/reciters/Mahmoud Khalil Al-Hussary.jpg',
  'hussary': '/reciters/Mahmoud Khalil Al-Hussary.jpg',
  'husary': '/reciters/Mahmoud Khalil Al-Hussary.jpg',

  'majed al-enezi': '/reciters/Majed Al-Enezi.jpg',
  'enezi': '/reciters/Majed Al-Enezi.jpg',

  'majed al-zamil': '/reciters/Majed Al-Zamil.jpg',
  'zamil': '/reciters/Majed Al-Zamil.jpg',

  'mishary alafasi': '/reciters/Mishary Alafasi.jpg',
  'mishary rashid alafasy': '/reciters/Mishary Alafasi.jpg',
  'alafasi': '/reciters/Mishary Alafasi.jpg',
  'alafasy': '/reciters/Mishary Alafasi.jpg',
  'mishary': '/reciters/Mishary Alafasi.jpg',
  'afasy': '/reciters/Mishary Alafasi.jpg',

  'mohammad abdullkarem': '/reciters/Mohammad Abdullkarem.jpg',
  'abdullkarem': '/reciters/Mohammad Abdullkarem.jpg',

  'mohammad al-airawy': '/reciters/Mohammad Al-Airawy.jpg',
  'airawy': '/reciters/Mohammad Al-Airawy.jpg',

  'mohammad al-tablaway': '/reciters/Mohammad Al-Tablaway.jpg',
  'tablaway': '/reciters/Mohammad Al-Tablaway.jpg',
  'tablawi': '/reciters/Mohammad Al-Tablaway.jpg',

  'mohammad saayed': '/reciters/Mohammad Saayed.jpg',
  'saayed': '/reciters/Mohammad Saayed.jpg',

  'mohammad saleh alim shah': '/reciters/Mohammad Saleh Alim Shah.jpg',

  'mohammed al-barrak': '/reciters/Mohammed Al-Barrak.jpg',
  'barrak': '/reciters/Mohammed Al-Barrak.jpg',

  'mohammed al-lohaidan': '/reciters/Mohammed Al-Lohaidan.jpg',
  'muhammad al-luhaidan': '/reciters/Mohammed Al-Lohaidan.jpg',
  'lohaidan': '/reciters/Mohammed Al-Lohaidan.jpg',
  'luhaidan': '/reciters/Mohammed Al-Lohaidan.jpg',

  'mohammed al-muhasny': '/reciters/Mohammed Al-Muhasny.jpg',
  'muhasny': '/reciters/Mohammed Al-Muhasny.jpg',

  'mohammed ayyub': '/reciters/Mohammed Ayyub.jpg',
  'muhammad ayub': '/reciters/Mohammed Ayyub.jpg',
  'ayyub': '/reciters/Mohammed Ayyub.jpg',
  'ayub': '/reciters/Mohammed Ayyub.jpg',

  'mohammed jibreel': '/reciters/Mohammed Jibreel.jpg',
  'jibreel': '/reciters/Mohammed Jibreel.jpg',

  'mohammed siddiq al-minshawi': '/reciters/Mohammed Siddiq Al-Minshawi.jpg',
  'minshawi': '/reciters/Mohammed Siddiq Al-Minshawi.jpg',

  'mousa bilal': '/reciters/Mousa Bilal.jpg',
  'mousa': '/reciters/Mousa Bilal.jpg',

  'muamar': '/reciters/Muamar (From Indonesia).jpg',

  'muftah alsaltany': '/reciters/Muftah Alsaltany.jpg',
  'alsaltany': '/reciters/Muftah Alsaltany.jpg',

  'mustafa al-lahoni': '/reciters/Mustafa Al-Lahoni.jpg',
  'lahoni': '/reciters/Mustafa Al-Lahoni.jpg',

  'mustafa ismail': '/reciters/Mustafa Ismail.jpg',
  'ismaeel': '/reciters/Mustafa Ismail.jpg',

  'noreen mohammad siddiq': '/reciters/Noreen Mohammad Siddiq.jpg',
  'noreen': '/reciters/Noreen Mohammad Siddiq.jpg',

  'ustaz zamri': '/reciters/Ustaz Zamri.jpg',
  'zamri': '/reciters/Ustaz Zamri.jpg',

  'yasser al-dosari': '/reciters/Yasser Al-Dosari.jpg',
  'yasser al dosari': '/reciters/Yasser Al-Dosari.jpg',
  'yasser dosari': '/reciters/Yasser Al-Dosari.jpg',
  'dosari': '/reciters/Yasser Al-Dosari.jpg',
  'dossari': '/reciters/Yasser Al-Dosari.jpg',

  'yasser salamah': '/reciters/Yasser Salamah.jpg',
  'salamah': '/reciters/Yasser Salamah.jpg',
};

const resolveUrl = path => `${(import.meta.env?.BASE_URL || '/').replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
const normalize = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/^(?:sheikh|shaikh|qari|imam|hafiz|ustadh|dr\.?)\s+/,'')
  .replace(/[’'`]/g,'').replace(/[-_]/g,' ').replace(/\b(?:mohammad|mohammed|muhammed|mohamed)\b/g,'muhammad').replace(/\s+/g,' ').trim();

export const getReciterFallbackUrl = () => resolveUrl('/reciters/reciter-silhouette.svg');
// Retained for callers from older builds; fallback no longer uses initials.
export const generateInitialsSvgDataUri = getReciterFallbackUrl;
export function getReciterPhotoPath(name) {
  const clean=normalize(name);
  if(!clean)return null;
  const entries=Object.entries(LOCAL_QARI_IMAGES).filter(([alias])=>normalize(alias).includes(' '));
  const exact=entries.find(([alias])=>normalize(alias)===clean);
  if(exact)return exact[1];
  // Only full multiword aliases are eligible. Shared first names and loose
  // surname tokens must never select another person's portrait.
  const match=entries.find(([alias])=>{const key=normalize(alias);return key.includes(' ')&&(` ${clean} `).includes(` ${key} `);});
  return match?.[1] || null;
}
export function getReciterAvatarUrl(name) {
  return resolveUrl(getReciterPhotoPath(name) || '/reciters/reciter-silhouette.svg');
}
