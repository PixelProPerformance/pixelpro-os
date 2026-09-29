require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const { loadUser } = require('./auth');
const authRoutes = require('./routes/auth.routes');
const apiRoutes = require('./routes/api.routes');
const worker = require('./publish/worker');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '4mb' }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'troque-este-segredo',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: String(process.env.COOKIE_SECURE || 'false') === 'true', maxAge: 1000 * 60 * 60 * 24 * 7 },
}));
app.use(loadUser);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'pixelpro-os', ts: Date.now() }));
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// frontend estatico
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/', (req, res) => res.redirect('/app'));
app.get('/app', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'app.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'login.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[pixelpro-os] no ar em http://localhost:${PORT}`);
  if (String(process.env.ENABLE_WORKER || 'true') !== 'false') worker.start();
});
