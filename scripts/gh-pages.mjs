// Post-build step for GitHub Pages: SPA fallback + Content Security Policy.
// GitHub Pages serves 404.html for unknown paths, so a copy of index.html lets
// deep links (/saiyagym-frontend/routines/123) boot the Angular router.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve('dist/saiyagym-frontend/browser');
const indexPath = resolve(dist, 'index.html');

// GitHub Pages can't send headers, so the policy goes in a <meta>. Keep connect-src in
// sync with environment.ts. Critical-CSS inlining is disabled in angular.json because
// its onload handler would be blocked by this policy.
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // blob:: local preview of a progress photo before it is uploaded.
  "img-src 'self' data: blob: https://res.cloudinary.com",
  // Admin sound preview: the stored mp3 (Cloudinary) or the local file before upload (blob:).
  "media-src 'self' blob: https://res.cloudinary.com",
  // api.cloudinary.com: signed direct image uploads (the API signs, the browser uploads).
  "connect-src 'self' https://saiyagym-api.onrender.com https://api.cloudinary.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const html = readFileSync(indexPath, 'utf8');
if (html.includes('Content-Security-Policy')) {
  throw new Error('index.html already declares a CSP; refusing to add a second one.');
}
// Tolerant of formatting (`<meta charset="utf-8">` vs Prettier's `<meta charset="utf-8" />`).
const charset = /<meta charset="utf-8"\s*\/?>/i;
if (!charset.test(html)) throw new Error('Could not find <meta charset="utf-8"> in index.html.');
const withCsp = html.replace(
  charset,
  (tag) => `${tag}\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
);

writeFileSync(indexPath, withCsp);
writeFileSync(resolve(dist, '404.html'), withCsp);
console.log('GitHub Pages: CSP injected, 404.html created.');
