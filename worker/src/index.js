// Cabeçalhos padrão de CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    // 1. Tratamento Obrigatório de Preflight (Requisição OPTIONS do navegador)
    if (request.method === "OPTIONS") {
      return new Response(null, { 
        status: 204, 
        headers: corsHeaders 
      });
    }

    try {
      // 2. Processa as rotas normalmente
      const response = await handleRequest(request, env);

      // 3. Injeta os cabeçalhos de CORS em QUALQUER resposta
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });

    } catch (err: any) {
      // 4. Injeta CORS até em respostas de erro (500)
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        },
      });
    }
  }
};

// Exemplo da sua função interna de rotas
async function handleRequest(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/api/listings" || url.pathname === "/listings") {
    const modalidade = url.searchParams.get("modalidade");
    
    // Consulta no banco D1
    const { results } = await env.DB.prepare(
      "SELECT * FROM listings ORDER BY created_at DESC"
    ).all();

    return Response.json({ listings: results });
  }

  return Response.json({ error: "Rota não encontrada" }, { status: 404 });
}
