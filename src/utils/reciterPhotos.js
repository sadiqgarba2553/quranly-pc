/**
 * reciterPhotos.js — Elegant Qari Photo & Local Assets Resolver
 */

// Local static Qari photo mappings uploaded to public/reciters/
const LOCAL_QARI_IMAGES = {
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

/**
 * Generates an elegant, dignified SVG Qari portrait (100% offline, zero network 404s)
 */
export function generateInitialsSvgDataUri(name) {
  const cleanName = (name || 'Qari')
    .replace(/^(shaikh|sheikh|qari|imam|hafiz|ustadh|dr\.|prof\.)\s+/i, '');

  const parts = cleanName.trim().split(/\s+/);
  const initials = parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0] ? parts[0].slice(0, 2) : 'QA').toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <circle cx="100" cy="100" r="100" fill="%2318181b"/>
    <circle cx="100" cy="100" r="92" fill="none" stroke="%233f3f46" stroke-width="2"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-size="56" font-family="Inter, -apple-system, sans-serif" font-weight="700" letter-spacing="2">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${svg}`;
}

const resolveUrl = (path) => {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
};

/**
 * Returns local Qari photo URL if available, or instant SVG data URI avatar
 */
export function getReciterAvatarUrl(name, id) {
  if (!name) return generateInitialsSvgDataUri('Qari');

  const lower = name.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

  // 1. Direct and substring match in local catalog
  for (const [key, photoUrl] of Object.entries(LOCAL_QARI_IMAGES)) {
    const cleanKey = key.toLowerCase().replace(/[-_]/g, ' ').trim();
    if (lower.includes(cleanKey) || cleanKey.includes(lower)) {
      return resolveUrl(photoUrl);
    }
  }

  // 2. Token / surname match for multi-word names
  const tokens = lower.split(' ').filter(t => t.length > 3 && !['sheikh', 'shaikh', 'qari', 'imam', 'mohammad', 'mohammed', 'ahmad', 'ahmed'].includes(t));
  for (const token of tokens) {
    for (const [key, photoUrl] of Object.entries(LOCAL_QARI_IMAGES)) {
      if (key.includes(token)) {
        return resolveUrl(photoUrl);
      }
    }
  }

  // 3. Fallback to instant dignified monochrome SVG avatar
  return generateInitialsSvgDataUri(name);
}
