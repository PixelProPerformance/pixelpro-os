const bcrypt = require('bcryptjs');
const prisma = require('./db');
const { can } = require('./permissions');

async function hash(pw) { return bcrypt.hash(pw, 10); }
async function verify(pw, h) { return bcrypt.compare(pw, h); }

function publicUser(u) {
  if (!u) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role, clientId: u.clientId || null };
}

// Middlewares
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'nao_autenticado' });
  next();
}

async function loadUser(req, res, next) {
  if (req.session && req.session.userId) {
    req.user = await prisma.user.findUnique({ where: { id: req.session.userId } });
    if (!req.user) { req.session.destroy(() => {}); }
  }
  next();
}

function requirePermission(action) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'nao_autenticado' });
    if (!can(req.user.role, action)) return res.status(403).json({ error: 'sem_permissao', action });
    next();
  };
}

// Garante que um CLIENT só toque em recursos do próprio cliente.
function ensureClientScope(req, clientId) {
  if (req.user.role === 'CLIENT') return req.user.clientId === clientId;
  return true;
}

module.exports = { hash, verify, publicUser, requireAuth, loadUser, requirePermission, ensureClientScope };
