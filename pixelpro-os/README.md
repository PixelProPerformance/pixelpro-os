# PixelPro OS

Sistema geral da PixelPro Performance: login com papéis, Planner com robô de publicação, Máquina de Assuntos com IA, Production Pro e portal de aprovação do cliente com e-mail.

## O que já está pronto nesta versão

- **Login e três papéis**, com matriz de permissões no servidor:
  - **Admin**: controle total.
  - **Colaborador**: cria, lê e edita, não exclui, não mexe em usuários nem conexões de rede.
  - **Cliente**: vê só o conteúdo do próprio cliente, comenta e aprova.
- **Planner** dos posts com formato, redes (Instagram, Facebook, YouTube, Threads, TikTok, LinkedIn), status, agendamento, legenda e hashtags.
- **Robô de publicação**: um worker que roda a cada minuto, pega os posts agendados com horário vencido e publica por rede via adaptadores. Vem em **DRY_RUN** ligado (registra sem postar), pra rodar sem credenciais.
- **Máquina de Assuntos** server-side: briefing por cliente, gera assuntos com IA, guarda um baralho de assuntos possíveis pra usar sem IA, sorteio sem repetir, botão de deixar mais apimentado, gera texto de carrossel ou roteiro de Reels. Com um clique manda pro Planner ou abre no Production Pro.
- **Production Pro (v1 básica)**: mini editor que puxa o texto da Máquina sobre um fundo, arrasta o título, ajusta tamanho, salva o design e envia pro cliente aprovar.
- **Aprovação com e-mail**: ao enviar pra aprovar, o cliente recebe um e-mail avisando que tem algo no portal. A resposta dele volta como status e aparece no painel.
- **Ícones modernos** (Lucide), poucos emojis.

## Rodar localmente

Precisa de Node 18 ou mais novo.

```bash
cp .env.example .env
npm install            # gera o client do Prisma
npm run setup          # cria o banco (SQLite) e roda o seed
npm run dev            # sobe em http://localhost:3000
```

Contas do seed:

- Admin: `admin@pixelpro.com` / `admin123`
- Colaborador: `colaborador@pixelpro.com` / `colab123`
- Cliente: `cliente@aqualife.com` / `cliente123`

Troque essas senhas antes de ir pra produção.

## Deploy no Railway com GitHub

1. Suba esta pasta como um repositório no GitHub.
2. No Railway, **New Project, Deploy from GitHub repo**, e escolha o repositório.
3. Em **Variables**, cole as variáveis do `.env.example` com os valores reais. No mínimo:
   - `SESSION_SECRET` (um segredo forte)
   - `APP_URL` (a URL pública do serviço no Railway)
   - `COOKIE_SECURE=true`
   - `DATABASE_URL` (veja Postgres abaixo)
   - `ANTHROPIC_API_KEY` (pra Máquina gerar textos)
   - SMTP, se quiser e-mail de verdade
4. O `railway.json` já roda `prisma db push`, o seed e sobe o servidor. O robô sobe junto.

### Banco: SQLite agora, Postgres pra escalar

O starter usa SQLite pra subir rápido. Pra produção séria, use o Postgres do Railway:

1. No projeto, **New, Database, PostgreSQL**.
2. Em `prisma/schema.prisma`, troque `provider = "sqlite"` por `provider = "postgresql"`.
3. Aponte `DATABASE_URL` pra variável do Postgres do Railway.
4. O `prisma db push` do deploy cria as tabelas.

## O robô de publicação, o que é honesto dizer

O código do robô está pronto: agendador, fila por horário, adaptadores por rede e log de publicação. Mas **postar de verdade em cada rede exige que vocês criem um app de desenvolvedor na plataforma e conectem a conta por OAuth**. Nenhum código pula essa etapa, é regra das próprias redes.

- Enquanto os apps não existem, o robô fica em `DRY_RUN=true` e registra o que publicaria.
- Em **Contas de rede**, dá pra conectar no modo manual, colando o token e os ids (por exemplo `igUserId` e `pageId` do Meta). Assim o Instagram e o Facebook já publicam de verdade com `DRY_RUN=false`.
- Instagram e Facebook têm o caminho real via Graph API já escrito em `src/publish/adapters.js`. Threads, YouTube, TikTok e LinkedIn ficam em dry-run com a interface pronta, é só plugar a API de cada um quando o app estiver aprovado.

## Onde está cada coisa

```
src/
  server.js              servidor e sessão
  auth.js                login, sessão, middlewares de papel
  permissions.js         matriz de permissões
  anthropic.js           IA da Máquina (server-side)
  email.js               e-mail de aprovação
  publish/adapters.js    publicação por rede (Meta real, resto em dry-run)
  publish/worker.js      o robô que publica no horário
  routes/                auth e API
prisma/schema.prisma     modelo de dados
public/                  frontend (login e app)
```

## Próximos passos sugeridos

- OAuth completo por rede, com telas de conexão, no lugar do modo manual.
- Production Pro completo: modelo de identidade visual por cliente que o admin define, distribuição automática dos textos por slide, e exportação em PNG no navegador.
- Notificações no painel além do e-mail.
- Trocar a sessão em memória por uma com store (Redis) e separar o worker em um serviço próprio do Railway quando o volume crescer.
