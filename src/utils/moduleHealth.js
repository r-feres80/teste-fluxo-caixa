// Sinais de saúde por módulo + insight do dia para a landing page (App.jsx).
// Reaproveita exclusivamente o Resumo Executivo (financial-engine/resumoExecutivo.js)
// e os mesmos limiares já usados nos velocímetros do Dashboard — nenhuma regra
// de negócio nova é criada aqui, só leitura/composição do que já existe.
import { fmtBRL, fmtData } from "./formatUtils.js";

// Mesmos cortes do <Gauge label="Liquidez" .../> em DashboardPage.jsx:
// <1,0x vermelho, 1,0-1,5x amarelo, >1,5x verde.
export function classificarLiquidez(indice) {
  if (indice == null || Number.isNaN(indice)) return null;
  if (indice < 1) return "red";
  if (indice < 1.5) return "amber";
  return "green";
}

// Mesmos cortes do <Gauge label="Inadimplência" .../> em DashboardPage.jsx:
// <5% verde, 5-10% amarelo, >10% vermelho.
export function classificarInadimplencia(pct) {
  if (pct == null || Number.isNaN(pct)) return null;
  if (pct < 5) return "green";
  if (pct <= 10) return "amber";
  return "red";
}

const RANK = { red: 3, amber: 2, green: 1 };

// Pior severidade entre um conjunto de tipos de alerta já calculados em
// resumo.alertas (Alta -> red, Média -> amber). Sem alerta do tipo -> green.
function piorPorTipoDeAlerta(alertasPorTipo, tipos) {
  let pior = "green";
  for (const tipo of tipos) {
    for (const a of alertasPorTipo[tipo] || []) {
      const cor = a.severidade === "Alta" ? "red" : "amber";
      if (RANK[cor] > RANK[pior]) pior = cor;
    }
  }
  return pior;
}

// Mapa { moduleId: "red" | "amber" | "green" | null } — null quando o módulo
// não tem indicador de saúde associado (evita poluir com sinal inventado).
export function calcularSaudeModulos(resumo) {
  const alertasPorTipo = {};
  for (const a of resumo.alertas) {
    (alertasPorTipo[a.tipo] ||= []).push(a);
  }

  const liquidez = classificarLiquidez(resumo.caixa.indiceLiquidezCaixa);
  const inadimplencia = classificarInadimplencia(resumo.contasReceber.inadimplenciaPct);
  const contasPagar = piorPorTipoDeAlerta(alertasPorTipo, ["titulos_vencidos_pagar", "pagamentos_proximos", "concentracao_fornecedor"]);
  const contasReceber = piorPorTipoDeAlerta(alertasPorTipo, ["titulos_vencidos_receber", "recebimentos_atraso_relevantes", "concentracao_cliente"]);
  const fluxoCaixa = piorPorTipoDeAlerta(alertasPorTipo, ["liquidez", "caixa_abaixo_minimo", "caixa_projetado_abaixo_minimo"]);
  const orcadoRealizado = piorPorTipoDeAlerta(alertasPorTipo, ["desvio_orcamentario"]);

  const saude = {
    tesouraria: liquidez,
    "composicao-caixa": null,
    "contas-pagar": contasPagar,
    "contas-receber": contasReceber,
    inadimplencia,
    "plano-de-contas": null,
    "fluxo-caixa": fluxoCaixa,
    "dfc-direto": null,
    "orcado-realizado": orcadoRealizado,
    orcamento: null,
    forecast: null,
    cenarios: null,
    dre: null,
    importar: null,
    "importar-orcamento": null,
    governanca: null,
  };

  // Visão Geral resume o pior sinal entre os módulos com indicador — dá pra
  // saber que algo pede atenção sem precisar abrir cada categoria.
  const pior = Object.values(saude).reduce((acc, v) => (v && RANK[v] > RANK[acc] ? v : acc), "green");
  saude.dashboard = pior;

  return saude;
}

// Frase curta para a faixa "Insight do dia" — deriva do alerta mais severo já
// calculado em resumo.alertas (mesma fonte do Dashboard), sem chamada externa.
export function gerarInsightDoDia(resumo) {
  const alerta = resumo.alertas[0]; // resumo.alertas já vem ordenado (Alta primeiro)
  if (alerta) {
    switch (alerta.tipo) {
      case "liquidez":
        return `Atenção: caixa projetado fica negativo (${fmtBRL(alerta.saldo)}) em ${fmtData(alerta.data)}.`;
      case "caixa_abaixo_minimo":
        return `Caixa consolidado (${fmtBRL(alerta.valor)}) está abaixo do mínimo configurado.`;
      case "caixa_projetado_abaixo_minimo":
        return `Caixa projetado cai abaixo do mínimo em ${fmtData(alerta.data)}.`;
      case "titulos_vencidos_receber":
        return `${fmtBRL(alerta.valor)} em títulos vencidos a receber pedem atenção.`;
      case "titulos_vencidos_pagar":
        return `${fmtBRL(alerta.valor)} em títulos vencidos a pagar pedem atenção.`;
      case "pagamentos_proximos":
        return `${alerta.qtd} pagamento(s) somando ${fmtBRL(alerta.valor)} vencem nos próximos ${alerta.dias} dias.`;
      case "recebimentos_atraso_relevantes":
        return `${alerta.qtd} recebimento(s) somando ${fmtBRL(alerta.valor)} estão próximos ou em atraso.`;
      case "desvio_orcamentario":
        return `Desvio orçamentário relevante em ${alerta.nome}: ${alerta.pct.toFixed(0)}%.`;
      case "concentracao_cliente":
        return `Concentração de carteira: ${alerta.pct.toFixed(0)}% em um único cliente.`;
      case "concentracao_fornecedor":
        return `Concentração de carteira: ${alerta.pct.toFixed(0)}% em um único fornecedor.`;
      default:
        return "Há pontos de atenção nos indicadores financeiros.";
    }
  }
  if (resumo.caixa.indiceLiquidezSeca == null) {
    return "Nenhum alerta ativo. Carregue dados em Governança para ver os indicadores desta base.";
  }
  return `Liquidez Seca em ${resumo.caixa.indiceLiquidezSeca.toFixed(2)}x, inadimplência em ${resumo.contasReceber.inadimplenciaPct.toFixed(1)}% e nenhum alerta ativo — operação sob controle.`;
}
