# Guia de configuração de credenciais

Este documento explica exatamente onde obter e colar os tokens necessários para conectar GitHub, Cloudflare Workers e Cloudflare Pages.

---

## 1. Cloudflare API Token

### Onde criar
1. Acesse https://dash.cloudflare.com/profile/api-tokens
2. Clique em **Create Token**.
3. Use o template **Edit Cloudflare Workers** e depois adicione permissões extras:
   - Zone:Read (se for usar domínio próprio)
   - Account:Read
   - Workers Scripts:Edit
   - Workers KV Storage:Edit (se usar KV)
   - D1:Edit
   - R2:Edit
   - Page:Edit (para Cloudflare Pages)
4. Em **Account Resources**, selecione sua conta.
5. Em **Zone Resources**, selecione o domínio `droppfy.com` (se aplicável).
6. Crie o token e copie o valor.

### Onde colar no GitHub
Vá em `https://github.com/gpartnerllc-png/imobiliaria/settings/secrets/actions` e crie:
- **Name:** `CLOUDFLARE_API_TOKEN`
- **Value:** cole o token copiado acima.

---

## 2. Cloudflare Account ID

### Onde encontrar
1. Acesse https://dash.cloudflare.com
2. No menu lateral direito, clique no nome da conta.
3. O **Account ID** aparece na seção **API**.

Para este projeto, o Account ID já conhecido é:
```
533aa092c7f3571e13fdc103ba716bdf
```

### Onde colar no GitHub
No mesmo local dos secrets (`Settings > Secrets and variables > Actions`), crie:
- **Name:** `CLOUDFLARE_ACCOUNT_ID`
- **Value:** `533aa092c7f3571e13fdc103ba716bdf`

---

## 3. GitHub Personal Access Token (para push/deploy manual)

### Onde criar
1. Acesse https://github.com/settings/tokens
2. Clique em **Generate new token (classic)**.
3. Dê um nome, por exemplo: `imobi-deploy`.
4. Selecione o escopo `repo`.
5. Gere e copie o token.

### Como usar neste ambiente
Se quiser que o agente faça push automaticamente, cole o token na próxima mensagem. Ele será usado apenas para autenticação temporária.

---

## 4. Configurar o Worker no Cloudflare

### Criar o banco D1
```bash
cd worker
npx wrangler d1 create imobi-db
```
Copie o `database_id` retornado e cole em `worker/wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "imobi-db"
database_id = "COLE_AQUI_O_DATABASE_ID"
```

### Aplicar migrations
```bash
npx wrangler d1 migrations apply imobi-db --remote
```

### Criar bucket R2
```bash
npx wrangler r2 bucket create imobi-media
```

### Definir JWT_SECRET como secret
```bash
npx wrangler secret put JWT_SECRET
# digite uma string aleatória de pelo menos 32 caracteres
```

---

## 5. Configurar domínio customizado (opcional)

O frontend usa o domínio `imobi.droppfy.com` (veja `frontend/CNAME`).
Para publicar no Cloudflare Pages com esse domínio:
1. Crie um projeto Pages chamado `imobi-frontend`.
2. Conecte ao repo `gpartnerllc-png/imobiliaria`.
3. Configure o domínio customizado `imobi.droppfy.com`.

---

## 6. Verificação final

Após colar os secrets no GitHub e fazer push na `main`, os workflows devem:
1. Fazer deploy do Worker `imobi-api`.
2. Fazer deploy do frontend no Cloudflare Pages.

Para testar:
```bash
curl https://imobi-api.contatodroppfy.workers.dev/api/health
curl https://imobi.droppfy.com
```

---

## Resumo dos secrets no GitHub

| Secret | Valor |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | Token criado no passo 1 |
| `CLOUDFLARE_ACCOUNT_ID` | `533aa092c7f3571e13fdc103ba716bdf` |

> O `GITHUB_TOKEN` é gerado automaticamente pelo GitHub Actions e não precisa ser criado manualmente.
