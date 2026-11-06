// Vercel Serverless Function — porta de netlify/functions/finance-ai.js pro
// formato de API Route da Vercel (qualquer arquivo em /api na raiz do
// projeto vira uma function automaticamente). Mesma lógica exata do
// original: única peça do sistema que conhece a chave de API, o front-end
// nunca vê ANTHROPIC_API_KEY (vive só nas env vars da Vercel — Project
// Settings → Environment Variables). Coexiste de propósito com a function
// Netlify original — a decisão de plataforma de deploy definitiva ainda
// não foi tomada, ver netlify/functions/finance-ai.js.
//
// Única mudança real é o formato do handler: Netlify usa
// `exports.handler = async (event) => ({ statusCode, body })`, Vercel usa
// `export default async function handler(req, res)` com `res.status().json()`.

const SYSTEM_PROMPT = `Você é o Finance Copilot de um aplicativo financeiro gerencial (CFO Finance Intelligence).

Seu papel: interpretar o resumo executivo (JSON) que será fornecido e responder à pergunta do usuário em português, seguindo estritamente estas regras:

1. Use APENAS os dados do resumo executivo fornecido. Nunca invente números, causas ou dados que não estejam no JSON.
2. Se o resumo não contiver dado suficiente para responder com segurança, diga isso explicitamente em vez de especular.
3. Estruture a resposta como: Fato (o que os dados mostram) → Causa mais provável (hipótese, deixando claro que é hipótese) → Recomendação (ação sugerida) → Confiança (Alta/Média/Baixa).
4. Nunca apresente uma recomendação como certeza absoluta.
5. Se a pergunta pedir uma causa-raiz (ex.: "por que o caixa caiu"), decomponha entre variação de Contas a Receber, Contas a Pagar, despesas por Centro de Custo e desvios de Orçado x Realizado — nessa ordem de investigação.
6. Seja objetivo e executivo. Sem saudação, sem preâmbulo. Português do Brasil.
7. Nunca dê conselho jurídico, contábil ou tributário definitivo — apenas leitura financeira gerencial dos dados apresentados.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY não configurada no ambiente da Vercel." });
    return;
  }

  let payload;
  if (req.body && typeof req.body === "object") {
    payload = req.body;
  } else {
    try {
      payload = JSON.parse(req.body || "{}");
    } catch {
      res.status(400).json({ error: "Corpo da requisição inválido." });
      return;
    }
  }

  const { pergunta, resumoExecutivo } = payload;
  if (!pergunta || typeof pergunta !== "string" || !pergunta.trim()) {
    res.status(400).json({ error: "Pergunta ausente." });
    return;
  }
  if (!resumoExecutivo) {
    res.status(400).json({ error: "Resumo executivo ausente." });
    return;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Resumo executivo (JSON):\n${JSON.stringify(resumoExecutivo)}\n\nPergunta: ${pergunta}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(502).json({ error: "Falha ao consultar a IA.", detail: errText });
      return;
    }

    const data = await response.json();
    const texto = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .filter(Boolean)
      .join("\n");

    res.status(200).json({ resposta: texto || "Não foi possível gerar uma resposta." });
  } catch (err) {
    res.status(500).json({ error: "Erro interno ao processar a pergunta.", detail: String(err) });
  }
}
