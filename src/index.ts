import express from 'express';
import path from 'path';
import blackboxRouter from './blackbox';
import mrvRouter from './mrv';

const app = express();
const port = process.env.PORT || 3002;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api/v1/blackbox', blackboxRouter);
app.use('/api/v1/mrv', mrvRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'axion-core', uptime: process.uptime() }));
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`AXION server listening on port ${port}`);
});
