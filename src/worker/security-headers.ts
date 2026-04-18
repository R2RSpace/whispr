/** Whipsr — Security Headers Middleware
 * Implements all 8 required headers for A+ security rating.
 * Applied as Hono middleware on every response.
 */
import { MiddlewareHandler } from 'hono';

/** All required security headers for A+ rating on securityheaders.com */
export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();

  // Content-Security-Policy: strict, no unsafe-inline, no unsafe-eval
  c.res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' blob: data:",
      "connect-src 'self' wss://*.workers.dev wss://localhost:*",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; ')
  );

  // HSTS: 2 years, include subdomains, preload
  c.res.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  // Prevent clickjacking
  c.res.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  c.res.headers.set('X-Content-Type-Options', 'nosniff');

  // No referrer information leaked
  c.res.headers.set('Referrer-Policy', 'no-referrer');

  // Disable all unnecessary browser features
  c.res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );

  // Cross-Origin isolation
  c.res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  c.res.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
};
