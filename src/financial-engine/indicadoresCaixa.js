import { valorComSinal, estaRealizado, excluirTransferencias } from "./lancamentos.js";

/**
 * Cobertura de Caixa (Days Cash on Hand): quantos dias o caixa disponível
 * sustenta o ritmo atual de saídas OPERACIONAIS (não inclui investimento/
 * financiamento, porque são eventos não recorrentes e distorceriam a leitura
 * de "fôlego" do caixa no dia a dia do negócio).
 * Fórmula: Caixa Disponível ÷ (Saídas Operacionais do período ÷ dias do período).
 */
export function calcularCoberturaCaixaDias(caixaDisponivel, saidasOperacionaisPeriodo, diasPeriodo) {
  const mediaDiaria = Math.abs(saidasOperacionaisPeriodo) / diasPeriodo;
  if (!mediaDiaria) return null;
  return caixaDisponivel / mediaDiaria;
}

/**
 * Índice de Liquidez de Caixa — proxy do Cash Ratio clássico (Caixa ÷ Passivo
 * Circulante). Como este produto ainda não tem Balanço Patrimonial/Passivo
 * Circulante implementado, usamos Contas a Pagar em aberto como a obrigação
 * de curto prazo disponível no sistema hoje. Isso é uma aproximação — não é
 * o Cash Ratio contábil completo, e essa ressalva deve sempre acompanhar o
 * indicador na tela.
 */
export function calcularIndiceLiquidezCaixa(caixaDisponivel, totalContasAPagarEmAberto) {
  if (!totalContasAPagarEmAberto) return null;
  return caixaDisponivel / totalContasAPagarEmAberto;
}

/**
 * Índice de Liquidez Total — mesma aproximação acima (Contas a Pagar em
 * aberto como proxy do Passivo Circulante), mas somando ao numerador o que
 * está em Aplicações Financeiras (sem liquidez imediata, mas resgatável).
 * Mostra o fôlego real considerando resgate, não só o caixa já disponível.
 */
export function calcularIndiceLiquidezTotal(caixaDisponivel, aplicacoesFinanceiras, totalContasAPagarEmAberto) {
  if (!totalContasAPagarEmAberto) return null;
  return (caixaDisponivel + aplicacoesFinanceiras) / totalContasAPagarEmAberto;
}

/**
 * Evolução mensal do fluxo de caixa (Entradas, Saídas, Saldo líquido) para os
 * últimos N meses até o mês de referência — usa dataPagamento (caixa
 * realizado), nunca competência, e exclui transferências internas.
 */
export function buildFluxoCaixaMensal({ lancamentos, empresaId, anoRef, mesRef, quantidadeMeses = 6 }) {
  const base = excluirTransferencias(lancamentos).filter(
    (l) => (empresaId === "TODAS" || l.empresaId === empresaId) && estaRealizado(l) && l.dataPagamento
  );

  const meses = [];
  for (let i = quantidadeMeses - 1; i >= 0; i--) {
    const d = new Date(anoRef, mesRef - i, 1);
    meses.push({ ano: d.getFullYear(), mes: d.getMonth() });
  }

  return meses.map(({ ano, mes }) => {
    const doMes = base.filter((l) => {
      const [a, m] = l.dataPagamento.split("-").map(Number);
      return a === ano && m - 1 === mes;
    });
    const entradas = doMes.filter((l) => l.tipo === "Entrada").reduce((s, l) => s + l.valor, 0);
    const saidas = doMes.filter((l) => l.tipo === "Saída").reduce((s, l) => s + l.valor, 0);
    return {
      label: new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", ""),
      ano, mes, entradas, saidas: -saidas, saldoLiquido: entradas - saidas,
    };
  });
}
