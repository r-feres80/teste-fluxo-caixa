// Cartão de crédito corporativo.
//
// DECISÃO ESTRUTURAL (usuário, 13/11/2026): o módulo é ISOLADO. As despesas
// de cartão vivem em `despesasCartao`, coleção própria, e NÃO entram em
// `lancamentos`. Motivo: `lancamentos` alimenta fluxo de caixa, DRE, DPO/PMP
// e os índices de liquidez. Injetar compra de cartão ali faria a despesa sair
// do caixa na data da compra, o que é falso — o caixa só sai no vencimento da
// fatura, num pagamento só. O efeito colateral apareceria como distorção
// silenciosa nos velocímetros, sem ninguém pedir.
//
// O que o módulo entrega: limite, utilizado, disponível, vencimento da fatura
// e quebra por centro de custo. O total a pagar é exibido em Contas a Pagar
// como informação, sem virar título no motor.
//
// "Utilizado" = TOTAL EM ABERTO (decisão do usuário): ciclo corrente +
// faturas já fechadas e ainda não pagas. É o que de fato consome limite.
// Usar só o ciclo corrente superestimaria o disponível sempre que houvesse
// fatura fechada aguardando pagamento.

import { parseISO, toISO, pad2 } from "../utils/dateUtils.js";

// Data de fechamento/vencimento de um mês, respeitando meses curtos:
// dia 31 em fevereiro vira o último dia do mês, não 03/03.
function diaDoMes(ano, mesIdx, dia) {
  const ultimo = new Date(ano, mesIdx + 1, 0).getDate();
  return `${ano}-${pad2(mesIdx + 1)}-${pad2(Math.min(dia, ultimo))}`;
}

// Ciclo a que uma compra pertence: fecha no diaFechamento; compra feita
// depois do fechamento já cai no ciclo seguinte.
export function cicloDaCompra(dataISO, diaFechamento) {
  const d = parseISO(dataISO);
  let ano = d.getFullYear();
  let mes = d.getMonth();
  if (d.getDate() > diaFechamento) {
    mes += 1;
    if (mes > 11) { mes = 0; ano += 1; }
  }
  return `${ano}-${pad2(mes + 1)}`;
}

// Vencimento da fatura de um ciclo. Quando o vencimento cai antes do
// fechamento no calendário (fecha dia 28, vence dia 5), ele pertence ao
// mês seguinte.
export function vencimentoDoCiclo(ciclo, diaFechamento, diaVencimento) {
  const [ano, mes] = ciclo.split("-").map(Number);
  let a = ano, m = mes - 1;
  if (diaVencimento <= diaFechamento) {
    m += 1;
    if (m > 11) { m = 0; a += 1; }
  }
  return diaDoMes(a, m, diaVencimento);
}

export function fechamentoDoCiclo(ciclo, diaFechamento) {
  const [ano, mes] = ciclo.split("-").map(Number);
  return diaDoMes(ano, mes - 1, diaFechamento);
}

// Posição de um cartão numa data de referência.
export function calcularPosicaoCartao(cartao, despesas, dataRefISO) {
  const minhas = despesas.filter((d) => d.cartaoId === cartao.id);

  const porCiclo = new Map();
  for (const d of minhas) {
    const ciclo = d.ciclo || cicloDaCompra(d.data, cartao.diaFechamento);
    if (!porCiclo.has(ciclo)) porCiclo.set(ciclo, { ciclo, valor: 0, itens: [], pago: false });
    const c = porCiclo.get(ciclo);
    c.valor += d.valor;
    c.itens.push(d);
    if (d.faturaPaga) c.pago = true;
  }

  const cicloCorrente = cicloDaCompra(dataRefISO, cartao.diaFechamento);
  const ciclos = [...porCiclo.values()]
    .map((c) => ({
      ...c,
      fechamento: fechamentoDoCiclo(c.ciclo, cartao.diaFechamento),
      vencimento: vencimentoDoCiclo(c.ciclo, cartao.diaFechamento, cartao.diaVencimento),
      corrente: c.ciclo === cicloCorrente,
    }))
    .sort((a, b) => a.ciclo.localeCompare(b.ciclo));

  const emAberto = ciclos.filter((c) => !c.pago);
  const utilizado = emAberto.reduce((s, c) => s + c.valor, 0);
  const faturasFechadas = emAberto.filter((c) => !c.corrente);
  const corrente = ciclos.find((c) => c.corrente) ?? null;

  // Próximo vencimento: a fatura fechada em aberto mais antiga; se não há
  // nenhuma, o vencimento do ciclo corrente.
  const proxima = faturasFechadas[0]
    ?? (corrente && !corrente.pago ? corrente : null);

  const limite = cartao.limite ?? 0;
  const disponivel = Math.max(0, limite - utilizado);

  return {
    cartao,
    limite,
    utilizado,
    disponivel,
    pctUtilizado: limite > 0 ? (utilizado / limite) * 100 : 0,
    valorCicloCorrente: corrente && !corrente.pago ? corrente.valor : 0,
    valorFaturasFechadas: faturasFechadas.reduce((s, c) => s + c.valor, 0),
    proximoVencimento: proxima?.vencimento ?? null,
    valorProximaFatura: proxima?.valor ?? 0,
    ciclos,
    despesas: minhas,
  };
}

export function calcularPosicaoCartoes(cartoes, despesasCartao, dataRefISO, filtros = {}) {
  const ativos = (cartoes ?? []).filter((c) => c.ativo !== false)
    .filter((c) => !filtros.empresaId || c.empresaId === filtros.empresaId);
  return ativos.map((c) => calcularPosicaoCartao(c, despesasCartao ?? [], dataRefISO));
}

// Consolidado para o card do Dashboard.
export function consolidarCartoes(posicoes) {
  const limite = posicoes.reduce((s, p) => s + p.limite, 0);
  const utilizado = posicoes.reduce((s, p) => s + p.utilizado, 0);
  const comVencimento = posicoes.filter((p) => p.proximoVencimento);
  comVencimento.sort((a, b) => a.proximoVencimento.localeCompare(b.proximoVencimento));
  const prox = comVencimento[0] ?? null;

  // Total a pagar exibido em Contas a Pagar: soma das faturas em aberto.
  const totalAPagar = posicoes.reduce((s, p) => s + p.utilizado, 0);

  return {
    qtdCartoes: posicoes.length,
    limite,
    utilizado,
    disponivel: Math.max(0, limite - utilizado),
    pctUtilizado: limite > 0 ? (utilizado / limite) * 100 : 0,
    proximoVencimento: prox?.proximoVencimento ?? null,
    valorProximaFatura: prox ? prox.valorProximaFatura : 0,
    cartaoProximaFatura: prox?.cartao ?? null,
    totalAPagar,
  };
}

// Despesas de cartão agrupadas por centro de custo. Considera só o que está
// em aberto, para casar com o número de "utilizado".
export function despesasPorCentroCusto(posicoes, centrosCusto) {
  const nome = new Map((centrosCusto ?? []).map((c) => [c.id, c.nome]));
  const acc = new Map();
  for (const p of posicoes) {
    for (const ciclo of p.ciclos) {
      if (ciclo.pago) continue;
      for (const d of ciclo.itens) {
        const k = d.centroCustoId ?? "__sem__";
        acc.set(k, (acc.get(k) ?? 0) + d.valor);
      }
    }
  }
  return [...acc.entries()]
    .map(([id, valor]) => ({ id, nome: nome.get(id) ?? "Sem centro de custo", valor }))
    .sort((a, b) => b.valor - a.valor);
}
