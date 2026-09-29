// Papéis e permissões do PixelPro OS.
// ADMIN: controle total.
// COLLABORATOR: cria, lê e edita, não exclui e não mexe em usuários nem em conexões de rede.
// CLIENT: visualiza o conteúdo do próprio cliente, comenta e aprova.

const ROLES = ['ADMIN', 'COLLABORATOR', 'CLIENT'];

// Ações do sistema e quem pode.
const MATRIX = {
  'client.read':    ['ADMIN', 'COLLABORATOR', 'CLIENT'],
  'client.create':  ['ADMIN', 'COLLABORATOR'],
  'client.update':  ['ADMIN', 'COLLABORATOR'],
  'client.delete':  ['ADMIN'],

  'post.read':      ['ADMIN', 'COLLABORATOR', 'CLIENT'],
  'post.create':    ['ADMIN', 'COLLABORATOR'],
  'post.update':    ['ADMIN', 'COLLABORATOR'],
  'post.delete':    ['ADMIN'],
  'post.schedule':  ['ADMIN', 'COLLABORATOR'],
  'post.publishNow':['ADMIN'],

  'approval.request': ['ADMIN', 'COLLABORATOR'],
  'approval.decide':  ['ADMIN', 'CLIENT'], // cliente decide, admin pode em nome dele
  'comment.create':   ['ADMIN', 'COLLABORATOR', 'CLIENT'],

  'maquina.use':    ['ADMIN', 'COLLABORATOR'],

  'social.read':    ['ADMIN', 'COLLABORATOR'],
  'social.connect': ['ADMIN'],
  'social.delete':  ['ADMIN'],

  'user.read':      ['ADMIN'],
  'user.manage':    ['ADMIN'],

  'template.update':['ADMIN'], // identidade visual do Production Pro
};

function can(role, action) {
  const allowed = MATRIX[action];
  return !!allowed && allowed.includes(role);
}

// CLIENT só enxerga o próprio clientId. Retorna filtro de escopo.
function scopeForUser(user) {
  if (user.role === 'CLIENT') return { clientId: user.clientId || '__none__' };
  return {};
}

module.exports = { ROLES, MATRIX, can, scopeForUser };
