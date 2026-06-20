"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const blackbox_1 = __importDefault(require("./blackbox"));
const mrv_1 = __importDefault(require("./mrv"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3002;
app.use(express_1.default.json({ limit: '2mb' }));
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
app.use('/api/v1/blackbox', blackbox_1.default);
app.use('/api/v1/mrv', mrv_1.default);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'axion-core', uptime: process.uptime() }));
app.get('/', (_req, res) => res.sendFile(path_1.default.join(__dirname, '../public/index.html')));
app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));
app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`AXION server listening on port ${port}`);
});
