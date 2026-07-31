/**
 * Orçamento tem base própria (OrcamentoItem), por Ano + Empresa + Conta
 * Gerencial + Centro de Custo + Projeto + Mês — nunca é um lançamento.
 */
export function getValorOrcado(orcamentoItens, { ano, mes, contaGerencialId, empresaId, centroCustoId, projetoId }) {
  return orcamentoItens
    .filter((o) =>
      o.ano === ano && o.mes === mes && o.contaGerencialId === contaGerencialId &&
      (empresaId === undefined || o.empresaId === empresaId) &&
      (centroCustoId === undefined || !o.centroCustoId || o.centroCustoId === centroCustoId) &&
      (projetoId === undefined || !o.projetoId || o.projetoId === projetoId)
    )
    .reduce((s, o) => s + o.valor, 0);
}

export function getValorOrcadoPeriodo(orcamentoItens, { ano, meses, contaGerencialId, empresaId }) {
  return meses.reduce((s, mes) => s + getValorOrcado(orcamentoItens, { ano, mes, contaGerencialId, empresaId }), 0);
}
