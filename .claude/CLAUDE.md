# Contexto do projeto — Claude Code

## O que é
IMOBI é uma vitrine imobiliária multi-marca para o Distrito Federal e entorno.
Permite que corretores, imobiliárias, construtoras, incorporadoras, correspondentes Caixa e proprietários publiquem imóveis em uma vitrine única.

## Arquitetura
- `frontend/` — site estático em HTML/CSS/JS vanilla.
  - Aponta para `https://imobi-api.contatodroppfy.workers.dev`.
  - Fluxos: listar imóveis, filtrar por modalidade, login/cadastro, publicar imóvel, enviar lead.
- `worker/` — API no Cloudflare Worker (`imobi-api`), escrita em TypeScript com Hono.
  - Banco: Cloudflare D1 (`imobi-db`).
  - Mídia: Cloudflare R2 (`imobi-media`).
  - Auth: JWT (`@tsndr/cloudflare-worker-jwt`) com senhas hasheadas via PBKDF2.

## Rotas da API
- `POST /api/auth/cadastro` — cria tenant + usuário.
- `POST /api/auth/login` — autentica e retorna JWT.
- `GET /api/listings?modalidade=&q=` — lista imóveis com mídia.
- `POST /api/listings` — publica imóvel (requer JWT).
- `POST /api/media/upload` — envia foto/vídeo para R2 (requer JWT).
- `GET /media/:key` — serve mídia pública.
- `POST /api/leads` — envia contato de interessado.
- `GET /api/health` — healthcheck.

## Comandos úteis
```bash
# Desenvolver o Worker localmente
cd worker
npm install
npm run dev

# Aplicar migrations no banco local
npm run db:migrate:local

# Deploy manual do Worker
npm run deploy
```

## CI/CD
- `.github/workflows/deploy-worker.yml` — deploy automático do Worker ao fazer push em `main`.
- `.github/workflows/deploy-frontend.yml` — deploy automático do frontend no Cloudflare Pages.

## Secrets necessários no GitHub
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Configurações do Worker
Edite `worker/wrangler.toml` para ajustar:
- `account_id`
- `database_id` do D1
- `bucket_name` do R2
- `JWT_SECRET` (idealmente movido para secret via `wrangler secret put JWT_SECRET`)

## Regras de estilo
- Prefira TypeScript estrito.
- Mantenha o contrato da API compatível com `frontend/index.html`.
- Valide entradas antes de tocar no banco.
- Nunca logue senhas ou tokens.
