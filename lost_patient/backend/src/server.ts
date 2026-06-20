import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import careContinuityRouter from './routes/care-continuity.js';

const PORT = parseInt(process.env.PORT ?? '3002', 10);

const app = new Hono();

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use('*', cors({
  origin: ['http://localhost:5174', 'http://127.0.0.1:5174', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use('*', logger());

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'Lost Patient Network — Care Continuity Engine',
    runtime: 'Bun + Hono',
    timestamp: new Date().toISOString(),
    ai_configured: !!(process.env.FEATHERLESS_API_KEY && process.env.FEATHERLESS_API_KEY !== 'demo-key'),
    db_configured: !!process.env.DATABASE_URL,
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.route('/api/care-continuity', careContinuityRouter);

// ─── 404 Fallback ─────────────────────────────────────────────────────────────

app.notFound((c) => c.json({ error: 'Route not found.' }, 404));

// ─── Error Handler ────────────────────────────────────────────────────────────

app.onError((err, c) => {
  console.error('[Server] Unhandled error:', err);
  return c.json({ error: 'Internal server error.', details: err.message }, 500);
});

console.log('\n');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║               THE LOST PATIENT NETWORK                       ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log(`║  Runtime:  Bun ${Bun.version} + Hono                             ║`);
console.log(`║  Listening: http://localhost:${PORT}                           ║`);
console.log(`║  AI Mode:  ${process.env.FEATHERLESS_API_KEY && process.env.FEATHERLESS_API_KEY !== 'demo-key' ? '✅ Featherless AI Connected         ' : '⚠️  Demo Mode (add FEATHERLESS_API_KEY)'}  ║`);
console.log(`║  Database: ${process.env.DATABASE_URL ? '✅ Supabase PostgreSQL Connected    ' : '⚠️  No DATABASE_URL set             '}  ║`);
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('\n');

export default {
  port: PORT,
  fetch: app.fetch,
};
