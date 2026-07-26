-- Perfis dos anunciantes (imobiliárias, corretores, construtoras etc.)
CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo_perfil TEXT NOT NULL,
  nome_exibicao TEXT NOT NULL,
  nome TEXT NOT NULL,
  creci TEXT,
  whatsapp TEXT,
  chave_pix TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Usuários autenticáveis
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Imóveis publicados
CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  modalidade TEXT NOT NULL CHECK(modalidade IN ('agio','venda_direta','locacao_residencial')),
  preco_face INTEGER NOT NULL,
  localizacao TEXT NOT NULL,
  agio_pago INTEGER,
  saldo_devedor INTEGER,
  prestacao_mensal INTEGER,
  banco_credor TEXT,
  memorial_descritivo TEXT,
  video_tour_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Fotos e vídeos vinculados a imóveis
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK(tipo IN ('foto','video')),
  url TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Leads / contatos de interessados
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER REFERENCES listings(id) ON DELETE SET NULL,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_listings_modalidade ON listings(modalidade);
CREATE INDEX IF NOT EXISTS idx_listings_tenant ON listings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
