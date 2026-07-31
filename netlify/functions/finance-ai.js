// Netlify Function — única peça do sistema que conhece a chave de API.
// O front-end nunca vê ANTHROPIC_API_KEY; ela vive apenas nas variáveis de
// ambiente do Netlify (Site settings → Environment variables).
//
// Responsabilidade desta função: receber a pergunta do usuário + o resumo
// executivo já calculado no front-end (financial-engine/resumoExecutivo.js),
// e repassar para o modelo aplicando o comportamento definido na skill
// `finance-ai` (fato x hipótese x recomendação, confiança explícita, nunca
// inventar causa não sustentada pelos dados).

const SYSTEM_PROMPT = `Você é o Finance Copilot de um aplicativo financeiro gerencial (CFO Finance Intelligence).

Seu papel: interpretar o resumo executivo (JSON) que será fornecido e responder à pergunta do usuário em português, seguindo estritamente estas regras:

1. Use APENAS os dados do resumo executivo fornecido. Nunca invente números, causas ou dados que não estejam no JSON.
2. Se o resumo não contiver dado suficiente para responder com segurança, diga isso explicitamente em vez de especular.
3. Estruture a resposta como: Fato (o que os dados mostram) → Causa mais provável (hipótese, deixando claro que é hipótese) → Recomendação (ação sugerida) → Confiança (Alta/Média/Baixa).
4. Nunca apresente uma recomendação como certeza absoluta.
5. Se a pergunta pedir uma causa-raiz (ex.: "por que o caixa caiu"), decomponha entre variação de Contas a Receber, Contas a Pagar, despesas por Centro de Custo e desvios de Orçado x Realizado — nessa ordem de investigação.
6. Seja objetivo e executivo. Sem saudação, sem preâmbulo. Português do Brasil.
7. Nunca dê conselho jurídico, contábil ou tributário definitivo — apenas leitura financeira gerencial dos dados apresentados.`;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método não permitido." }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada no ambiente do Netlify." }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Corpo da requisição inválido." }) };
  }

  const { pergunta, resumoExecutivo } = payload;
  if (!pergunta || typeof pergunta !== "string" || !pergunta.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: "Pergunta ausente." }) };
  }
  if (!resumoExecutivo) {
    return { statusCode: 400, body: JSON.stringify({ error: "Resumo executivo ausente." }) };
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
      return { statusCode: 502, body: JSON.stringify({ error: "Falha ao consultar a IA.", detail: errText }) };
    }

    const data = await response.json();
    const texto = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .filter(Boolean)
      .join("\n");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resposta: texto || "Não foi possível gerar uma resposta." }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Erro interno ao processar a pergunta.", detail: String(err) }) };
  }
};
