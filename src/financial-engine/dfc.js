import { valorComSinal, estaRealizado, excluirTransferencias } from "./lancamentos.js";
import { getValorOrcadoPeriodo } from "./orcamento.js";
import { calcularVariacaoPct } from "./variacao.js";

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
      const varPct = calcularVariacaoPct(real - orcado, orcado);
      return { id: conta.id, descricao: conta.descricao, classificacaoDFC: conta.classificacaoDFC, real, orcado, varPct };
    })
    .filter((l) => l.real !== 0 || l.orcado !== 0)
    .sort((a, b) => Math.abs(b.real) - Math.abs(a.real));
}

/**
 * DFC Direto: árvore Grupo (classificacaoDFC) → Subgrupo (subgrupoDFC) →
 * Conta, com uma coluna por dia do período (soma de valorComSinal dos
 * Realizados daquele dia) + Total Realizado (soma do período) + Total
 * Previsto (Orçamento do período, getValorOrcadoPeriodo). Grupo e Subgrupo
 * são somas (rollup) das linhas abaixo — nunca recalculados a partir dos
 * lançamentos diretamente, para nunca divergir do detalhe por conta.
 */
export function calcularDFCDiretoArvore({ lancamentosNoPeriodo, planoDeContas, orcamentoItens, ano, meses, empresaId, dias }) {
  const realizados = excluirTransferencias(lancamentosNoPeriodo).filter((l) => estaRealizado(l));
  const contasComMovimento = planoDeContas.filter((c) => c.tipo === "Analítica" && c.classificacaoDFC && c.classificacaoDFC !== "Fora do DFC");

  const somarLinhas = (linhas) => ({
    porDia: dias.map((_, i) => linhas.reduce((s, l) => s + l.porDia[i], 0)),
    totalRealizado: linhas.reduce((s, l) => s + l.totalRealizado, 0),
    totalPrevisto: linhas.reduce((s, l) => s + l.totalPrevisto, 0),
  });

  const linhaConta = (conta) => {
    const doConta = realizados.filter((l) => l.contaGerencialId === conta.id);
    const porDia = dias.map((d) => doConta.filter((l) => l.dataPagamento === d).reduce((s, l) => s + valorComSinal(l), 0));
    const totalPrevisto = conta.aceitaOrcamento
      ? getValorOrcadoPeriodo(orcamentoItens, { ano, meses, contaGerencialId: conta.id, empresaId: empresaId && empresaId !== "TODAS" ? empresaId : undefined })
      : 0;
    return { id: conta.id, nome: conta.descricao, porDia, totalRealizado: porDia.reduce((s, v) => s + v, 0), totalPrevisto };
  };

  return ["Operacional", "Investimento", "Financiamento"].map((grupo) => {
    const contasDoGrupo = contasComMovimento.filter((c) => c.classificacaoDFC === grupo);
    const subgrupoNomes = Array.from(new Set(contasDoGrupo.map((c) => c.subgrupoDFC || "(Sem subgrupo)")));
    const subgrupos = subgrupoNomes
      .map((sub) => {
        const contas = contasDoGrupo
          .filter((c) => (c.subgrupoDFC || "(Sem subgrupo)") === sub)
          .map(linhaConta)
          .filter((l) => l.totalRealizado !== 0 || l.totalPrevisto !== 0);
        return { nome: sub, contas, ...somarLinhas(contas) };
      })
      .filter((s) => s.contas.length > 0);
    return { nome: grupo, subgrupos, ...somarLinhas(subgrupos) };
  }).filter((g) => g.subgrupos.length > 0);
}
