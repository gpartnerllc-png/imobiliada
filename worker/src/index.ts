import { Hono } from 'hono';
import { verify, sign } from '@tsndr/cloudflare-worker-jwt';

// Tipos das bindings do wrangler.toml
interface Env {
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  JWT_SECRET: string;
}

interface UserJwt {
  sub: string;
  tenant_id: number;
  email: string;
}

type Variables = {
  user: UserJwt;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ===== Helpers =====
const respostaErro = (c: any, status: number, mensagem: string) =>
  c.json({ erro: mensagem }, status);

async function hashSenha(senha: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(senha),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

async function authMiddleware(c: any, next: any) {
  const header = c.req.header('Authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token) return respostaErro(c, 401, 'Token ausente.');
  try {
    const ok = await verify(token, c.env.JWT_SECRET);
    if (!ok) throw new Error('invalid');
    const payload = JSON.parse(atob(token.split('.')[1])) as UserJwt;
    c.set('user', payload);
    await next();
  } catch {
    return respostaErro(c, 401, 'Token inválido.');
  }
}

// ===== CORS =====
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin') || '*';
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (c.req.method === 'OPTIONS') return new Response(null, { status: 204 });
  await next();
});

// ===== Auth: cadastro =====
app.post('/api/auth/cadastro', async (c) => {
  const body = await c.req.json();
  const {
    tipo_perfil,
    nome_exibicao,
    nome,
    creci,
    whatsapp,
    chave_pix,
    email,
    senha,
  } = body;

  if (!tipo_perfil || !nome_exibicao || !nome || !email || !senha) {
    return respostaErro(c, 400, 'Preencha os campos obrigatórios.');
  }

  const existente = await c.env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email).first();
  if (existente) return respostaErro(c, 409, 'E-mail já cadastrado.');

  const tenant = await c.env.DB.prepare(
    `INSERT INTO tenants (tipo_perfil, nome_exibicao, nome, creci, whatsapp, chave_pix)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(tipo_perfil, nome_exibicao, nome, creci || null, whatsapp || null, chave_pix || null).first<{ id: number }>();

  if (!tenant) return respostaErro(c, 500, 'Erro ao criar perfil.');

  const salt = crypto.randomUUID();
  const passwordHash = await hashSenha(senha, salt);
  const user = await c.env.DB.prepare(
    `INSERT INTO users (tenant_id, email, password_hash) VALUES (?, ?, ?) RETURNING id`
  ).bind(tenant.id, email, `${salt}:${passwordHash}`).first<{ id: number }>();

  if (!user) return respostaErro(c, 500, 'Erro ao criar usuário.');

  const token = await sign(
    { sub: String(user.id), tenant_id: tenant.id, email },
    c.env.JWT_SECRET
  );

  return c.json({
    token,
    user: { id: user.id, email, nome },
    tenant: { id: tenant.id, nome_exibicao, tipo_perfil },
  });
});

// ===== Auth: login =====
app.post('/api/auth/login', async (c) => {
  const { email, senha } = await c.req.json();
  if (!email || !senha) return respostaErro(c, 400, 'E-mail e senha são obrigatórios.');

  const row = await c.env.DB.prepare(
    `SELECT u.id, u.tenant_id, u.email, u.password_hash, t.nome_exibicao, t.tipo_perfil, t.nome
     FROM users u JOIN tenants t ON t.id = u.tenant_id WHERE u.email = ?`
  ).bind(email).first<any>();

  if (!row) return respostaErro(c, 401, 'Credenciais inválidas.');

  const [salt, hash] = row.password_hash.split(':');
  const hashTentativa = await hashSenha(senha, salt);
  if (hashTentativa !== hash) return respostaErro(c, 401, 'Credenciais inválidas.');

  const token = await sign(
    { sub: String(row.id), tenant_id: row.tenant_id, email },
    c.env.JWT_SECRET
  );

  return c.json({
    token,
    user: { id: row.id, email: row.email, nome: row.nome },
    tenant: { id: row.tenant_id, nome_exibicao: row.nome_exibicao, tipo_perfil: row.tipo_perfil },
  });
});

// ===== Listings: listar =====
app.get('/api/listings', async (c) => {
  const modalidade = c.req.query('modalidade') || 'todas';
  const q = (c.req.query('q') || '').trim();

  let sql = `SELECT l.*, t.nome_exibicao AS tenant_nome
             FROM listings l JOIN tenants t ON t.id = l.tenant_id
             WHERE 1=1`;
  const params: any[] = [];

  if (modalidade !== 'todas') {
    sql += ' AND l.modalidade = ?';
    params.push(modalidade);
  }
  if (q) {
    sql += ' AND (l.titulo LIKE ? OR l.localizacao LIKE ? OR l.memorial_descritivo LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY l.created_at DESC';

  const { results } = await c.env.DB.prepare(sql).bind(...params).all<any>();

  const listings = await Promise.all(
    results.map(async (l) => {
      const { results: media } = await c.env.DB.prepare(
        'SELECT tipo, url FROM media WHERE listing_id = ? ORDER BY created_at'
      ).bind(l.id).all<{ tipo: string; url: string }>();
      return { ...l, media };
    })
  );

  return c.json({ listings });
});

// ===== Listings: publicar =====
app.post('/api/listings', authMiddleware, async (c) => {
  const user = c.get('user') as { tenant_id: number };
  const body = await c.req.json();

  const required = ['titulo', 'modalidade', 'preco_face', 'localizacao'];
  for (const field of required) {
    if (body[field] === undefined || body[field] === '') {
      return respostaErro(c, 400, `Campo obrigatório: ${field}`);
    }
  }

  const listing = await c.env.DB.prepare(
    `INSERT INTO listings
     (tenant_id, titulo, modalidade, preco_face, localizacao, agio_pago, saldo_devedor,
      prestacao_mensal, banco_credor, memorial_descritivo, video_tour_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(
    user.tenant_id,
    body.titulo,
    body.modalidade,
    Number(body.preco_face),
    body.localizacao,
    body.agio_pago ? Number(body.agio_pago) : null,
    body.saldo_devedor ? Number(body.saldo_devedor) : null,
    body.prestacao_mensal ? Number(body.prestacao_mensal) : null,
    body.banco_credor || null,
    body.memorial_descritivo || null,
    body.video_tour_url || null
  ).first<{ id: number }>();

  if (!listing) return respostaErro(c, 500, 'Erro ao publicar imóvel.');

  // Vincula mídia pendente enviada previamente
  if (Array.isArray(body.media_urls) && body.media_urls.length) {
    for (const m of body.media_urls) {
      await c.env.DB.prepare(
        'INSERT INTO media (listing_id, tenant_id, tipo, url) VALUES (?, ?, ?, ?)'
      ).bind(listing.id, user.tenant_id, m.tipo, m.url).run();
    }
  }

  return c.json({ id: listing.id, ok: true });
});

// ===== Upload de mídia =====
app.post('/api/media/upload', authMiddleware, async (c) => {
  const user = c.get('user') as { tenant_id: number };
  const form = await c.req.formData();
  const file = form.get('file') as File | null;
  if (!file) return respostaErro(c, 400, 'Nenhum arquivo enviado.');

  const key = `${user.tenant_id}/${crypto.randomUUID()}-${file.name}`;
  await c.env.MEDIA_BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  // URL pública via Worker — em produção use um subdomínio R2 ou Images.
  const url = `${new URL(c.req.url).origin}/media/${key}`;
  const tipo = file.type.startsWith('video') ? 'video' : 'foto';

  return c.json({ tipo, url, key });
});

// ===== Servir mídia =====
app.get('/media/:key{.+}', async (c) => {
  const key = c.req.param('key');
  const obj = await c.env.MEDIA_BUCKET.get(key);
  if (!obj) return respostaErro(c, 404, 'Mídia não encontrada.');

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  return new Response(obj.body as ReadableStream, { headers });
});

// ===== Leads =====
app.post('/api/leads', async (c) => {
  const { tenant_id, listing_id, nome, whatsapp } = await c.req.json();
  if (!tenant_id || !nome || !whatsapp) {
    return respostaErro(c, 400, 'Dados incompletos.');
  }

  await c.env.DB.prepare(
    'INSERT INTO leads (tenant_id, listing_id, nome, whatsapp) VALUES (?, ?, ?, ?)'
  ).bind(tenant_id, listing_id || null, nome, whatsapp).run();

  return c.json({ ok: true });
});

// ===== Health =====
app.get('/api/health', (c) => c.json({ ok: true, time: Date.now() }));

export default app;
