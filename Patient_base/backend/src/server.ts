/**
 * server.ts
 * Vortexa Backend — Hono on Bun.serve()
 *
 * Routes:
 *   GET  /health                         — health check
 *   POST /api/vault/store                — store E2EE ciphertext
 *   GET  /api/vault/:patient_id          — fetch encrypted records
 *   DEL  /api/vault/:record_id           — delete a record
 *   GET  /api/vault/:patient_id/audit    — audit log
 *   POST /api/analyze                    — signature-gated AI (clinical + fraud)
 *   POST /api/care-continuity/analyze    — 90-day disengagement risk engine
 *   POST /api/care-continuity/protocols  — create treatment protocol
 *   POST /api/care-continuity/milestones — add milestones
 *   PATCH /api/care-continuity/milestones/:id — update milestone status
 *   GET  /api/care-continuity/:patient_id — get all protocols + risk scores
 *   POST /api/care-continuity/seed-demo  — seed demo oncology patient
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import vaultRouter from './routes/vault.js';
import aiAgentRouter from './routes/ai-agent.js';
import careContinuityRouter from './routes/care-continuity.js';

// Load .env (Bun reads .env automatically, but dotenv works too)
const PORT = parseInt(process.env.PORT ?? '3001', 10);

const app = new Hono();

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use('*', cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use('*', logger());

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'Vortexa Backend — Patient-Sovereign Intelligence Network',
    runtime: 'Bun + Hono',
    timestamp: new Date().toISOString(),
    ai_configured: !!(process.env.FEATHERLESS_API_KEY && process.env.FEATHERLESS_API_KEY !== 'demo-key'),
    db_configured: !!process.env.DATABASE_URL,
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.route('/api/vault', vaultRouter);
app.route('/api/analyze', aiAgentRouter);
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
console.log('║     VORTEXA — Patient-Sovereign Intelligence Network         ║');
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
