import DOMPurify from 'dompurify';
// Includes Quran tajweed markup while excluding scripts, events, frames and inline CSS.
export const sanitizeHtml = html => DOMPurify.sanitize(String(html || ''), {
  ALLOWED_TAGS: ['p','br','strong','b','em','i','u','sup','sub','span','div','ul','ol','li','a','tajweed'],
  ALLOWED_ATTR: ['class','href','title','data-type'],
});
