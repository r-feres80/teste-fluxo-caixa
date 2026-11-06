// Funções puras sobre a tabela fato Lancamento. Nenhuma tela ou hook deve
// reimplementar estas regras — Tesouraria, AP, AR, Fluxo de Caixa, DFC e DRE
// todos chamam estas funções.

import { isDataVencida } from "../utils/dateUtils.js";

/** Valor com sinal: Entrada é positivo, Saída é negativo. */
export function valorComSinal(l) {
  return l.tipo === "Entrada" ? l.valor : -l.valor;
}

/**
 * Situação efetiva: a situação armazenada (Previsto/Em aberto/Realizado/Cancelado)
 * é elevada a "Vencido" automaticamente quando ainda não foi Realizada/Cancelada
 * e a Data de Vencimento já passou em relação à Data de Referência. O usuário
 * nunca precisa alternar manualmente para "Vencido".
 */
export function situacaoEfetiva(l, dataReferencia) {
  if (l.situacao === "Realizado" || l.situacao === "Cancelado") return l.situacao;
  if (isDataVencida(l.dataVencimento, dataReferencia)) return "Vencido";
  return l.situacao; // Previsto | Em aberto
}

/** Um lançamento conta para caixa (já pagou/recebeu de fato). */
export function estaRealizado(l) {
  return l.situacao === "Realizado";
}

/** Filtra lançamentos pelas dimensões dos Filtros Globais (empresa/unidade) + intervalo de datas em um campo de data específico. */
export function filtrarLancamentos(lancamentos, { empresaId, unidadeId, inicio, fim, campoData = "competencia" }) {
  return lancamentos.filter((l) => {
    if (empresaId && empresaId !== "TODAS" && l.empresaId !== empresaId) return false;
    if (unidadeId && unidadeId !== "TODAS" && l.unidadeId !== unidadeId) return false;
    const valor = campoData === "competencia" ? `${l.competencia}-01` : l[campoData];
    if (!valor) return false;
    if (inicio && valor < inicio) return false;
    if (fim && valor > fim) return false;
    return true;
  });
}

/** Exclui transferências internas — usado onde só o movimento operacional importa (Entradas/Saídas do dia, DRE, Orçado x Realizado). */
export function excluirTransferencias(lancamentos) {
  return lancamentos.filter((l) => !l.transferencia);
}

/**
 * Lançamentos que de fato afetam o CAIXA DISPONÍVEL (contas líquidas,
 * semLiquidez != "true") — usado só no DFC (dfc.js). Comando DFC-caixa-real:
 * "caixa" deixou de ser o Total Consolidado (Disponível + Aplicações) e virou
 * só o Disponível — aplicação financeira é USO de caixa, não caixa em si.
 * Duas regras, aplicadas juntas:
 *   1. Lançamento normal (não-transferência) só conta se a contaBancariaId
 *      apontar pra uma conta líquida — ex.: rendimento de aplicação (pc4.04)
 *      creditado DENTRO da própria conta de aplicação nunca tocou o
 *      Disponível, mesmo sendo Receita Financeira "de verdade" na DRE.
 *   2. Transferência só conta se tiver contaGerencialId preenchido — hoje só
 *      o lado de CONTA CORRENTE do aporte/resgate de Aplicações Financeiras
 *      tem isso (pc5.06, classificacaoDFC=Investimento); toda transferência
 *      comum (entre contas correntes) e o lado que entra/sai da própria
 *      aplicação continuam com contaGerencialId nulo, fora do DFC como
 *      sempre foram — a regra 1 já os barra de qualquer forma (o lado da
 *      aplicação não é conta líquida), mas a regra 2 é o que garante que uma
 *      transferência comum entre 2 contas líquidas (contaGerencialId nulo)
 *      não seja contada por engano.
 */
export function filtrarParaCaixaDisponivel(lancamentos, contasBancarias) {
  const idsContasLiquidas = new Set(contasBancarias.filter((c) => c.semLiquidez !== "true").map((c) => c.id));
  return lancamentos.filter((l) => {
    if (l.transferencia && !l.contaGerencialId) return false;
    return idsContasLiquidas.has(l.contaBancariaId);
  });
}
