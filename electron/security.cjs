const path = require('node:path');
const APP_ORIGIN = 'quranly://app';
function resolveAsset(root, input) {
  try {
    const url = new URL(input);
    if (url.protocol !== 'quranly:' || url.hostname !== 'app') return null;
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.includes('\0') || pathname.includes('\\')) return null;
    const candidate = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    const relative = path.relative(root, candidate);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
    return candidate;
  } catch { return null; }
}
function isExternalUrl(input) {
  try { const url = new URL(input); return ['https:', 'mailto:'].includes(url.protocol); }
  catch { return false; }
}
module.exports = { resolveAsset, isExternalUrl, APP_ORIGIN };
