import { valorComSinal } from "./lancamentos.js";
import { CLASSIFICACAO_DRE } from "../config/appConfig.js";

/**
 * Recebe lançamentos já filtrados pelo chamador (ex.: só Realizado para a
 * coluna Realizado; Realizado + Previsto/Em aberto futuro para Forecast) e
 * monta a estrutura do DRE Gerencial a partir da classificacaoDRE de cada
 * Conta Gerencial. Nunca reclassifica nada fora do Plano de Contas.
 */
export function calcularDRE(lancamentos, planoDeContas) {
  const buckets = {};
  CLASSIFICACAO_DRE.forEach((c) => { buckets[c] = 0; });

  lancamentos.forEach((l) => {
    const conta = planoDeContas.find((c) => c.id === l.contaGerencialId);
    if (!conta) return; // transferências e lançamentos sem conta não entram no DRE
    buckets[conta.classificacaoDRE] = (buckets[conta.classificacaoDRE] || 0) + valorComSinal(l);
  });

  const receitaBruta = buckets["Receita Bruta"];
  const deducoes = buckets["Deduções"];
  const receitaLiquida = receitaBruta + deducoes;
  const custos = buckets["Custos"];
  const margemBruta = receitaLiquida + custos;
  const despesasPessoal = buckets["Despesas com Pessoal"];
  const despesasAdministrativas = buckets["Despesas Administrativas"];
  const despesasComerciais = buckets["Despesas Comerciais"];
  const outrasDespesasOperacionais = buckets["Outras Despesas Operacionais"];
  const ebitda = margemBruta + despesasPessoal + despesasAdministrativas + despesasComerciais + outrasDespesasOperacionais;
  const receitasFinanceiras = buckets["Receitas Financeiras"];
  const despesasFinanceiras = buckets["Despesas Financeiras"];
  const resultadoFinanceiro = receitasFinanceiras + despesasFinanceiras;
  // IRPJ/CSLL vivem aqui, não em Deduções (que fica só com ICMS ST/PIS/
  // COFINS/ISS — tributos sobre a receita, não sobre o lucro).
  const impostosSobreLucro = buckets["Impostos sobre o Lucro"];
  const resultadoGerencial = ebitda + resultadoFinanceiro + impostosSobreLucro;

  return {
    receitaBruta, deducoes, receitaLiquida, custos, margemBruta,
    despesasPessoal, despesasAdministrativas, despesasComerciais, outrasDespesasOperacionais,
    ebitda, receitasFinanceiras, despesasFinanceiras, resultadoFinanceiro, impostosSobreLucro, resultadoGerencial,
  };
}

/** Estrutura de linhas do DRE, na ordem de exibição, com rótulo e valor. */
export function linhasDRE(dre) {
  return [
    { label: "Receita Bruta", valor: dre.receitaBruta, nivel: 0 },
    { label: "(-) Deduções", valor: dre.deducoes, nivel: 0 },
    { label: "= Receita Líquida", valor: dre.receitaLiquida, nivel: 0, destaque: true },
    { label: "(-) Custos", valor: dre.custos, nivel: 0 },
    { label: "= Margem Bruta", valor: dre.margemBruta, nivel: 0, destaque: true },
    { label: "(-) Despesas com Pessoal", valor: dre.despesasPessoal, nivel: 0 },
    { label: "(-) Despesas Administrativas", valor: dre.despesasAdministrativas, nivel: 0 },
    { label: "(-) Despesas Comerciais", valor: dre.despesasComerciais, nivel: 0 },
    { label: "(-) Outras Despesas Operacionais", valor: dre.outrasDespesasOperacionais, nivel: 0 },
    { label: "= EBITDA", valor: dre.ebitda, nivel: 0, destaque: true },
    { label: "(+/-) Resultado Financeiro", valor: dre.resultadoFinanceiro, nivel: 0 },
    { label: "(-) Impostos sobre o Lucro", valor: dre.impostosSobreLucro, nivel: 0 },
    { label: "= Resultado Gerencial", valor: dre.resultadoGerencial, nivel: 0, destaque: true },
  ];
}
