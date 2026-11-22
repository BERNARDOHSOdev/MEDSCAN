const COOKIE_NAME = '__Host-medscan_session';
const cookieOptions = { httpOnly: true, secure: true, sameSite: 'none', path: '/' };

function allowedOrigins() {
  return (process.env.SESSION_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(value => {
    try { const parsed = new URL(value); return parsed.protocol === 'https:' && parsed.origin === value; }
    catch (_) { return false; }
  });
}
function isAllowedOrigin(origin) { return typeof origin === 'string' && allowedOrigins().includes(origin); }
function wantsCookie(req) { return req.headers?.['x-medscan-session'] === 'cookie'; }
function isTrustedBrowserRequest(req) {
  return wantsCookie(req) && isAllowedOrigin(req.headers?.origin);
}
function readCookie(header = '') {
  const entry = header.split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE_NAME}=`));
  if (!entry) return null;
  try { return decodeURIComponent(entry.slice(COOKIE_NAME.length + 1)); } catch (_) { return null; }
}
function sendSession(req, res, user, token, status = 200) {
  res.set('Cache-Control', 'no-store');
  if (wantsCookie(req)) {
    if (!isTrustedBrowserRequest(req)) return res.status(403).json({ message: 'Origem não autorizada para sessão no navegador.' });
    res.cookie(COOKIE_NAME, token, cookieOptions);
    return res.status(status).json({ user });
  }
  return res.status(status).json({ user, token });
}
function requireTrustedBrowserSession(req, res, next) {
  if (!isTrustedBrowserRequest(req)) return res.status(403).json({ message: 'Origem não autorizada para sessão no navegador.' });
  return next();
}
module.exports = { COOKIE_NAME, cookieOptions, allowedOrigins, isAllowedOrigin, wantsCookie, isTrustedBrowserRequest, readCookie, sendSession, requireTrustedBrowserSession };
