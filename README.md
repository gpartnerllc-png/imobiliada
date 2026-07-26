# IMOBI — Vitrine Imobiliária Multi-Marca

Site e API da IMOBI: uma vitrine única para corretores, imobiliárias, construtoras, incorporadoras, correspondentes Caixa e proprietários no Distrito Federal e entorno.

## Estrutura

```
.
├── frontend/          # Site estático (HTML/CSS/JS)
│   ├── index.html
│   └── CNAME
├── worker/            # API no Cloudflare Worker
│   ├── src/index.ts
│   ├── migrations/
│   ├── wrangler.toml
│   └── package.json
├── .github/workflows/ # CI/CD
└── .claude/CLAUDE.md  # Contexto para Claude Code
```

## Tecnologias

- **Frontend:** HTML5, CSS3, JavaScript vanilla
- **Backend:** Cloudflare Worker + Hono (TypeScript)
- **Banco:** Cloudflare D1
- **Armazenamento de mídia:** Cloudflare R2
- **Deploy:** GitHub Actions → Cloudflare Workers; frontend via GitHub Pages

## Como rodar localmente

### Frontend
Basta servir a pasta `frontend/` com qualquer servidor estático:

```bash
cd frontend
npx serve .
```

### Worker

```bash
cd worker
npm install

# Criar banco local e aplicar migrations
npm run db:migrate:local

# Rodar Worker localmente
npm run dev
```

## Configuração para produção

1. **Obtenha suas credenciais da Cloudflare:**
   - Account ID
   - API Token com permissões para Workers, D1 e R2

2. **Configure o `worker/wrangler.toml`:**
   - `account_id`
   - `database_id` do D1
   - `bucket_name` do R2
   - `JWT_SECRET` (mínimo 32 caracteres)

3. **Crie os recursos na Cloudflare:**

```bash
cd worker

# Criar banco D1
npm run db:create

# Aplicar migrations em produção
npm run db:migrate:prod

# Criar bucket R2 (via dashboard ou wrangler)
wrangler r2 bucket create imobi-media

# Definir JWT_SECRET como secret (recomendado)
wrangler secret put JWT_SECRET
```

4. **Adicione os secrets no GitHub** (`Settings > Secrets and variables > Actions`):
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

5. **Deploy manual do Worker (ou push na `main` para ativar CI/CD):**

```bash
cd worker
npm run deploy
```

6. **Frontend:** o site é publicado automaticamente pelo GitHub Pages a cada push na `main`. O domínio `imobi.droppfy.com` deve apontar para os servidores do GitHub Pages.

## Rotas da API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/cadastro` | Criar conta |
| POST | `/api/auth/login` | Entrar |
| GET | `/api/listings` | Listar imóveis |
| POST | `/api/listings` | Publicar imóvel (autenticado) |
| POST | `/api/media/upload` | Enviar mídia (autenticado) |
| GET | `/media/:key` | Acessar mídia |
| POST | `/api/leads` | Enviar lead |
| GET | `/api/health` | Healthcheck |

## Domínios

- Produção: `https://imobi.droppfy.com`
- API: `https://imobi-api.contatodroppfy.workers.dev`

## Licença

Privado — gpartnerllc-png.
