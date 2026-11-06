import { diffDaysISO } from "../utils/dateUtils.js";
import { estaRealizado } from "./lancamentos.js";

/**
 * IR regressivo sobre renda fixa (padrão Receita Federal) — comando
 * DFC-mapeamento item 2b. Valores fixos, não editáveis pelo usuário (não é
 * parâmetro de Governança como PDD_FAIXAS_PADRAO): a tabela é definida em lei,
 * não é uma política interna da empresa.
 */
export const FAIXAS_IR_REGRESSIVO = [
  { max: 180, aliquota: 0.225, label: "22,5% (até 180 dias)" },
  { max: 360, aliquota: 0.20, label: "20,0% (181 a 360 dias)" },
  { max: 720, aliquota: 0.175, label: "17,5% (361 a 720 dias)" },
  { max: Infinity, aliquota: 0.15, label: "15,0% (acima de 720 dias)" },
];

export function calcularFaixaIR(prazoDias) {
  return FAIXAS_IR_REGRESSIVO.find((f) => prazoDias <= f.max) ?? FAIXAS_IR_REGRESSIVO[FAIXAS_IR_REGRESSIVO.length - 1];
}

/**
 * Uma linha por conta bancária de Aplicação (semLiquidez="true"): Modalidade,
 * Valor Aplicado (principal), Rendimento Bruto, Prazo, Alíquota de IR, IR
 * Calculado, Rendimento Líquido.
 *
 * Valor Aplicado = saldoInicial + transferências (aporte/resgate) Realizadas
 * até a data de referência — só o PRINCIPAL, não inclui rendimento. Toda
 * transferência com contaBancariaId apontando pra uma conta semLiquidez=
 * "true" é, por definição, aporte ou resgate dessa aplicação (nenhuma outra
 * transferência do app tem uma conta de aplicação como ponta) — não precisa
 * de um campo extra pra marcar isso. Rendimento Bruto é uma soma SEPARADA:
 * lançamentos de "Aplicações Financeiras" (pc4.04, Realizado) daquela conta.
 * As duas somas propositalmente NÃO se misturam: o saldo real da conta em
 * Tesouraria (calcularSaldoConta) soma tudo (principal + rendimento
 * creditado), mas aqui a tela precisa separar "quanto é capital aportado" de
 * "quanto rendeu" para o cálculo de IR fazer sentido.
 *
 * Aporte/resgate NÃO aparece no DFC (Tela DFC / DFC Direto) — os dois lados
 * de toda transferência somam zero na árvore por conta gerencial, e não tem
 * como mostrar esse movimento sem quebrar a reconciliação "Saldo Final do
 * DFC bate com Tesouraria" (ver comentário em dfc.js). Decisão de
 * arquitetura pendente de confirmação do usuário — não implementada.
 */
export function calcularAplicacoesFinanceiras({ contasBancarias, lancamentos, dataReferencia, contaGerencialRendimentoId = "pc4.04" }) {
  const aplicacoes = contasBancarias.filter((c) => c.semLiquidez === "true" && c.ativo);

  const linhas = aplicacoes.map((conta) => {
    const daConta = lancamentos.filter((l) => l.contaBancariaId === conta.id && estaRealizado(l) && l.dataPagamento && l.dataPagamento <= dataReferencia);

    const principal = conta.saldoInicial + daConta
      .filter((l) => l.transferencia)
      .reduce((s, l) => s + (l.tipo === "Entrada" ? l.valor : -l.valor), 0);

    const rendimentoBruto = daConta
      .filter((l) => l.contaGerencialId === contaGerencialRendimentoId)
      .reduce((s, l) => s + l.valor, 0);

    const semDadoDePrazo = !conta.dataAplicacao;
    const prazoDias = semDadoDePrazo ? null : diffDaysISO(conta.dataAplicacao, dataReferencia);
    const faixaIR = prazoDias == null ? null : calcularFaixaIR(prazoDias);
    const irCalculado = faixaIR ? rendimentoBruto * faixaIR.aliquota : null;
    const rendimentoLiquido = irCalculado == null ? null : rendimentoBruto - irCalculado;

    return {
      id: conta.id,
      apelido: conta.apelido,
      bancoId: conta.bancoId,
      empresaId: conta.empresaId,
      modalidade: conta.modalidade ?? null,
      principal,
      rendimentoBruto,
      prazoDias,
      faixaIR,
      irCalculado,
      rendimentoLiquido,
      incompleto: semDadoDePrazo || !conta.modalidade,
    };
  });

  const totais = linhas.reduce((acc, l) => ({
    principal: acc.principal + l.principal,
    rendimentoBruto: acc.rendimentoBruto + l.rendimentoBruto,
    irCalculado: acc.irCalculado + (l.irCalculado ?? 0),
    rendimentoLiquido: acc.rendimentoLiquido + (l.rendimentoLiquido ?? l.rendimentoBruto),
  }), { principal: 0, rendimentoBruto: 0, irCalculado: 0, rendimentoLiquido: 0 });

  return { linhas, totais };
}
