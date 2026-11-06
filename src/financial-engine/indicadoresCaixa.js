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
 * Liquidez Seca (Quick Ratio) — mesma aproximação de Passivo Circulante
 * acima (Contas a Pagar em aberto), no numerador soma Caixa Disponível +
 * Contas a Receber em aberto (o que já é caixa ou vai virar caixa via
 * cobrança). NÃO inclui Aplicações Financeiras — por definição, Liquidez
 * Seca exclui ativos que exigem conversão/resgate.
 */
export function calcularLiquidezSeca(caixaDisponivel, contasReceberEmAberto, totalContasAPagarEmAberto) {
  if (!totalContasAPagarEmAberto) return null;
  return (caixaDisponivel + contasReceberEmAberto) / totalContasAPagarEmAberto;
}

/**
 * Liquidez Corrente (Current Ratio) — mesma aproximação acima, no numerador
 * soma TODOS os ativos de curto prazo do sistema hoje: Caixa Disponível +
 * Aplicações Financeiras + Contas a Receber em aberto.
 */
export function calcularLiquidezCorrente(caixaDisponivel, aplicacoesFinanceiras, contasReceberEmAberto, totalContasAPagarEmAberto) {
  if (!totalContasAPagarEmAberto) return null;
  return (caixaDisponivel + aplicacoesFinanceiras + contasReceberEmAberto) / totalContasAPagarEmAberto;
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
