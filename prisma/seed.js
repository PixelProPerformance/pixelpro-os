require('dotenv').config();
const prisma = require('../src/db');
const bcrypt = require('bcryptjs');

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@pixelpro.com').toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

  const aqua = await prisma.client.upsert({
    where: { id: 'seed_aqua' },
    update: {},
    create: {
      id: 'seed_aqua', name: 'Aqualife', handle: '@Aqualife.br', color: '#37e0a6', market: 'br',
      ramo: 'aquarismo, manutencao de aquarios e lagos, loja online',
      assuntos: 'agua verde, ciclagem, testes e parametros, saude dos peixes, especies',
      tom: 'provocativo leve com autoridade tecnica, educativo',
      cta: 'Aqualife Care, diagnostico da agua em contexto',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail }, update: {},
    create: { email: adminEmail, passwordHash: await bcrypt.hash(adminPass, 10), name: 'Admin PixelPro', role: 'ADMIN' },
  });

  await prisma.user.upsert({
    where: { email: 'colaborador@pixelpro.com' }, update: {},
    create: { email: 'colaborador@pixelpro.com', passwordHash: await bcrypt.hash('colab123', 10), name: 'Colaborador', role: 'COLLABORATOR' },
  });

  await prisma.user.upsert({
    where: { email: 'cliente@aqualife.com' }, update: {},
    create: { email: 'cliente@aqualife.com', passwordHash: await bcrypt.hash('cliente123', 10), name: 'Cliente Aqualife', role: 'CLIENT', clientId: aqua.id },
  });

  const count = await prisma.post.count({ where: { clientId: aqua.id } });
  if (count === 0) {
    await prisma.post.create({ data: {
      clientId: aqua.id, title: 'Agua verde, 6 causas antes de culpar o filtro', format: 'Carrossel',
      networks: JSON.stringify(['instagram','facebook','threads']), status: 'PENDING_APPROVAL',
      captionIG: 'Antes da proxima manutencao...', hashtags: '#Aqualife #Aquarismo #AqualifeCare', createdById: admin.id,
    }});
    await prisma.post.create({ data: {
      clientId: aqua.id, title: 'Ciclagem em 6 slides, o guia do aquario novo', format: 'Carrossel',
      networks: JSON.stringify(['instagram']), status: 'SCHEDULED', scheduledAt: new Date(Date.now() + 5 * 60000),
      captionIG: 'Aquario novo? Comeca por aqui.', hashtags: '#Aqualife #ciclagem', createdById: admin.id,
    }});
  }

  console.log('Seed pronto.');
  console.log('Admin:', adminEmail, '/', adminPass);
  console.log('Colaborador: colaborador@pixelpro.com / colab123');
  console.log('Cliente: cliente@aqualife.com / cliente123');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
