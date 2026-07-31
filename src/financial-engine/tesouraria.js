import { valorComSinal, estaRealizado, excluirTransferencias } from "./lancamentos.js";

/** Saldo de uma conta bancária = saldo inicial + todo Realizado pago/recebido até a Data de Referência (inclui transferências — dinheiro que de fato mudou de conta). */
export function calcularSaldoConta(conta, lancamentos, dataReferencia) {
  const movimento = lancamentos
    .filter((l) => l.contaBancariaId === conta.id && estaRealizado(l) && l.dataPagamento && l.dataPagamento <= dataReferencia)
    .reduce((s, l) => s + valorComSinal(l), 0);
  return conta.saldoInicial + movimento;
}

export function calcularSaldosPorConta(contasBancarias, lancamentos, dataReferencia) {
  return contasBancarias.map((conta) => ({ conta, saldo: calcularSaldoConta(conta, lancamentos, dataReferencia) }));
}

export function calcularSaldoPorBanco(contasBancarias, lancamentos, dataReferencia) {
  const saldos = calcularSaldosPorConta(contasBancarias, lancamentos, dataReferencia);
  const porBanco = new Map();
  saldos.forEach(({ conta, saldo }) => porBanco.set(conta.bancoId, (porBanco.get(conta.bancoId) || 0) + saldo));
  return porBanco;
}

export function calcularSaldoPorEmpresa(contasBancarias, lancamentos, dataReferencia) {
  const saldos = calcularSaldosPorConta(contasBancarias, lancamentos, dataReferencia);
  const porEmpresa = new Map();
  saldos.forEach(({ conta, saldo }) => porEmpresa.set(conta.empresaId, (porEmpresa.get(conta.empresaId) || 0) + saldo));
  return porEmpresa;
}

export function calcularPosicaoConsolidada(contasBancarias, lancamentos, dataReferencia) {
  const saldos = calcularSaldosPorConta(contasBancarias.filter((c) => c.ativo), lancamentos, dataReferencia);
  const total = saldos.reduce((s, { saldo }) => s + saldo, 0);
  const aplicacoes = saldos.filter(({ conta }) => conta.semLiquidez === "true").reduce((s, { saldo }) => s + saldo, 0);
  const disponivel = total - aplicacoes;
  return { total, aplicacoes, disponivel, saldos };
}

/** Entradas/Saídas do dia — só movimento operacional real (exclui transferências internas). */
export function calcularMovimentoDoDia(lancamentos, data) {
  const doDia = excluirTransferencias(lancamentos).filter((l) => estaRealizado(l) && l.dataPagamento === data);
  const entradas = doDia.filter((l) => l.tipo === "Entrada").reduce((s, l) => s + l.valor, 0);
  const saidas = doDia.filter((l) => l.tipo === "Saída").reduce((s, l) => s + l.valor, 0);
  return { entradas, saidas, lancamentos: doDia };
}

export function listarTransferencias(lancamentos) {
  const grupos = new Map();
  lancamentos.filter((l) => l.transferencia).forEach((l) => {
    const g = grupos.get(l.transferenciaGrupoId) || [];
    g.push(l);
    grupos.set(l.transferenciaGrupoId, g);
  });
  return Array.from(grupos.entries()).map(([id, itens]) => ({ id, itens }));
}
