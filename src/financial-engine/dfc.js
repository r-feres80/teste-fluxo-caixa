import { valorComSinal, estaRealizado, excluirTransferencias } from "./lancamentos.js";
import { getValorOrcadoPeriodo } from "./orcamento.js";

/**
 * DFC Gerencial: Caixa Inicial + Fluxo Operacional + Fluxo de Investimentos +
 * Fluxo de Financiamentos = Variação de Caixa = Caixa Final.
 * A classificação (Operacional/Investimento/Financiamento) vem do Plano de
 * Contas (classificacaoDFC) — nunca é decidida pela tela.
 */
export function calcularDFC({ lancamentosNoPeriodo, planoDeContas, caixaInicial }) {
  const porClassificacao = { Operacional: 0, Investimento: 0, Financiamento: 0 };
  excluirTransferencias(lancamentosNoPeriodo)
    .filter((l) => estaRealizado(l))
    .forEach((l) => {
      const conta = planoDeContas.find((c) => c.id === l.contaGerencialId);
      const classif = conta?.classificacaoDFC;
      if (classif && porClassificacao[classif] !== undefined) porClassificacao[classif] += valorComSinal(l);
    });
  const variacaoCaixa = porClassificacao.Operacional + porClassificacao.Investimento + porClassificacao.Financiamento;
  return { caixaInicial, ...porClassificacao, variacaoCaixa, caixaFinal: caixaInicial + variacaoCaixa };
}

/**
 * Detalhamento do DFC por conta gerencial (Real x Orçado), para a tabela
 * "DFC do período" — só entra conta com classificacaoDFC preenchida
 * (Operacional/Investimento/Financiamento) e que tenha movimento real
 * ou orçado no período. Orçado vem sempre de OrcamentoItem (nunca de
 * lançamento), conforme a separação definida em orcamento.js.
 */
export function calcularDFCPorConta({ lancamentosNoPeriodo, planoDeContas, orcamentoItens, ano, meses, empresaId }) {
  const realizados = excluirTransferencias(lancamentosNoPeriodo).filter((l) => estaRealizado(l));
  const contas = planoDeContas.filter((c) => c.tipo === "Analítica" && c.classificacaoDFC && c.classificacaoDFC !== "Fora do DFC");

  return contas
    .map((conta) => {
      const real = realizados.filter((l) => l.contaGerencialId === conta.id).reduce((s, l) => s + valorComSinal(l), 0);
      const orcado = conta.aceitaOrcamento
        ? getValorOrcadoPeriodo(orcamentoItens, { ano, meses, contaGerencialId: conta.id, empresaId: empresaId && empresaId !== "TODAS" ? empresaId : undefined })
        : 0;
      const varPct = orcado !== 0 ? ((real - orcado) / Math.abs(orcado)) * 100 : (real !== 0 ? 100 : 0);
      return { id: conta.id, descricao: conta.descricao, classificacaoDFC: conta.classificacaoDFC, real, orcado, varPct };
    })
    .filter((l) => l.real !== 0 || l.orcado !== 0)
    .sort((a, b) => Math.abs(b.real) - Math.abs(a.real));
}
