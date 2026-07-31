import { parseISO } from "../utils/dateUtils.js";
import { valorComSinal, excluirTransferencias } from "./lancamentos.js";
import { getValorOrcadoPeriodo } from "./orcamento.js";
import { montarArvore } from "./treeUtils.js";

/**
 * Para cada conta Analítica: Real (Realizado), Previsto (curto prazo: realizado até data de referência
 * + lançamentos com situacao="Previsto" e dataVencimento no período), Forecast = Real + Previsto,
 * Orçado (base de orçamento). Com suporte a ajusteManual: true para rastreabilidade.
 * Depois agrega de baixo para cima (Conta → Subgrupo → Grupo) para permitir o drill-down hierárquico.
 */
export function construirOrcadoRealizado({ planoDeContas, orcamentoItens, lancamentos, ano, meses, empresaId, centroCustoId, dataReferencia }) {
  const mesInicio = Math.min(...meses);
  const mesFim = Math.max(...meses);
  const dataInicio = `${ano}-${String(mesInicio + 1).padStart(2, "0")}-01`;
  const dataFim = new Date(ano, mesFim + 1, 0).toISOString().split("T")[0];

  const semTransferencia = excluirTransferencias(lancamentos).filter((l) => {
    const [anoComp, mesComp] = l.competencia.split("-").map(Number);
    if (anoComp !== ano || !meses.includes(mesComp - 1)) return false;
    if (empresaId && empresaId !== "TODAS" && l.empresaId !== empresaId) return false;
    if (centroCustoId && centroCustoId !== "TODAS" && l.centroCustoId !== centroCustoId) return false;
    return true;
  });

  const valoresPorConta = new Map();
  planoDeContas.filter((c) => c.tipo === "Analítica").forEach((conta) => {
    const doConta = semTransferencia.filter((l) => l.contaGerencialId === conta.id);
    const real = doConta.filter((l) => l.situacao === "Realizado").reduce((s, l) => s + valorComSinal(l), 0);

    const realizadoAteHoje = excluirTransferencias(lancamentos)
      .filter((l) => l.contaGerencialId === conta.id && l.situacao === "Realizado" && l.dataPagamento && l.dataPagamento >= dataInicio && l.dataPagamento <= (dataReferencia || new Date().toISOString().split("T")[0]))
      .reduce((s, l) => s + valorComSinal(l), 0);

    const previsto_ajustes = doConta.filter((l) => (l.situacao === "Previsto" || l.situacao === "Em aberto") && l.ajusteManual !== true && l.dataVencimento && l.dataVencimento >= dataInicio && l.dataVencimento <= dataFim)
      .reduce((s, l) => s + valorComSinal(l), 0);

    const ajustesManual = doConta.filter((l) => l.ajusteManual === true).reduce((s, l) => s + valorComSinal(l), 0);

    const previsto = realizadoAteHoje + previsto_ajustes + ajustesManual;
    const forecast = real + previsto;
    const orcado = conta.aceitaOrcamento ? getValorOrcadoPeriodo(orcamentoItens, { ano, meses, contaGerencialId: conta.id, empresaId: empresaId && empresaId !== "TODAS" ? empresaId : undefined }) : 0;
    valoresPorConta.set(conta.id, { real, previsto, forecast, orcado, temOrcamento: conta.aceitaOrcamento, temAjusteManual: ajustesManual !== 0 });
  });

  // Agregação bottom-up: cada nó (Sintética ou Analítica) soma seus próprios
  // valores (se Analítica) + os de todos os descendentes.
  function agregarNo(no) {
    const proprio = valoresPorConta.get(no.id) || { real: 0, previsto: 0, forecast: 0, orcado: 0, temOrcamento: false, temAjusteManual: false };
    const filhosAgregados = no.filhos.map(agregarNo);
    const soma = filhosAgregados.reduce(
      (acc, f) => ({ real: acc.real + f.real, previsto: acc.previsto + f.previsto, forecast: acc.forecast + f.forecast, orcado: acc.orcado + f.orcado, temOrcamento: acc.temOrcamento || f.temOrcamento, temAjusteManual: acc.temAjusteManual || f.temAjusteManual }),
      { ...proprio }
    );
    const deltaForecast = soma.forecast - soma.orcado;
    const deltaForecastPct = soma.orcado !== 0 ? (deltaForecast / Math.abs(soma.orcado)) * 100 : (soma.forecast !== 0 ? 100 : 0);
    return { ...no, ...soma, deltaForecast, deltaForecastPct, filhos: filhosAgregados };
  }

  const arvore = montarArvore(planoDeContas, "contaPaiId");
  return arvore.map(agregarNo);
}

/** Achata a árvore agregada em uma lista com nível, para tabela com indentação. */
export function achatarComNivel(arvore, nivel = 0) {
  return arvore.flatMap((no) => [{ ...no, nivel }, ...achatarComNivel(no.filhos, nivel + 1)]);
}
