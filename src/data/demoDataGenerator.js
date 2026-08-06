// Gerador determinístico da massa de dados sintética (Bloco B, Etapa 1).
// Produz lançamentos + orçamento cobrindo ~24 meses de histórico Realizado
// (backbone de DRE/DFC/caixa) + uma carteira explícita de títulos em aberto
// (AR/AP) com distribuição de vencimento controlada. Todas as datas são
// relativas a HOJE (nunca fixas) — mesma disciplina já usada no resto do
// dataset demonstrativo, pra nunca "expirar" conforme o relógio real avança.
//
// Calibração dos alvos numéricos (Caixa Disponível 600k-850k, AR/AP aberto
// proporcional à receita, mix de vencimento 48/29/23): feita ajustando os
// PARÂMETROS DE ENTRADA deste gerador (tickets médios, contagens, saldo
// inicial das contas bancárias) até o resultado do CÁLCULO REAL do app bater
// a faixa — nunca ajustando o número já calculado. Ver verificação em
// scripts/verificar-massa-sintetica.mjs — rode-o de novo após qualquer
// mudança nos parâmetros abaixo, antes de considerar a calibração válida.

import { addDaysISO, addMonthsISO, todayISO, diffDaysISO } from "../utils/dateUtils.js";

function mulberry32(seed) {
  let a = seed;
  return function rand() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 20260806;

function criarFerramentasAleatorias(seed) {
  const rand = mulberry32(seed);
  const uniforme = (min, max) => min + rand() * (max - min);
  const inteiro = (min, max) => Math.floor(uniforme(min, max + 1));
  const escolha = (lista) => lista[inteiro(0, lista.length - 1)];
  const escolhaPonderada = (pares) => {
    const total = pares.reduce((s, [, peso]) => s + peso, 0);
    let r = rand() * total;
    for (const [valor, peso] of pares) { r -= peso; if (r <= 0) return valor; }
    return pares[pares.length - 1][0];
  };
  return { rand, uniforme, inteiro, escolha, escolhaPonderada };
}

// ---------------------------------------------------------------------
// Config — únicos números que precisam mudar se a calibração pedir ajuste.
// ---------------------------------------------------------------------
const MESES_HISTORICO = 18; // inclui o mês corrente (parcial, até HOJE)
// Contagem de receita NÃO escala com MESES_HISTORICO — é uma taxa mensal
// (define a Receita Bruta/mês do DRE), independente de quantos meses de
// histórico existem. Só o volume total de lançamentos depende dos dois.
const REVENUE_E1_POR_MES = { count: 27, ticketMin: 3500, ticketMax: 12000 };
const REVENUE_E2_POR_MES = { count: 11, ticketMin: 4000, ticketMax: 11000 };
const CUSTOS_POR_MES = { count: 17, min: 3200, max: 10500 };
const FIXOS_MENSAIS_E1 = { salarios: 36000, encargos: 10000, beneficios: 5500, aluguel: 9800, energia: 2800, sistemas: 3300, marketing: 7000, comissoes: 8600, diversas: 2600, tarifas: 380 };
const FIXOS_MENSAIS_E2 = { salarios: 22500, encargos: 6400, beneficios: 3300, aluguel: 6700, energia: 4400, sistemas: 1500, diversas: 1700, tarifas: 260 };

// Carteira em aberto (Fase B) — dimensionada proporcional à receita mensal
// (~270k), não em milhões: ~1 mês de receita em AR, um pouco menos em AP.
// Contagem alta (vs. poucas dezenas) só pra dar volume de lançamentos sem
// mexer no total-alvo (que é quem importa pro tamanho da carteira) nem no
// backbone histórico (que é quem importa pra margem/caixa acumulado).
const AR_ABERTO = { count: 360, totalAlvo: 245000 };
const AP_ABERTO = { count: 280, totalAlvo: 172000 };
// Mix pedido: Antecipado ~48% / Em dia ~29% / Atrasado ~23%.
const MIX_VENCIMENTO = [
  ["antecipado", 0.48],
  ["emDia", 0.29],
  ["atrasado", 0.23],
];

// Caixa Disponível/Projetado — alvo de calibração do saldo inicial das
// contas de liquidez (exclui a aplicação sem liquidez, calibrada à parte
// logo abaixo) e da aplicação. "Total consolidado" (Disponível + Aplicação)
// é o ponto de partida do "Projetado 30 dias" (Fluxo de Caixa) — por isso a
// aplicação também precisa de alvo pequeno: senão o total já nasce perto do
// teto da faixa antes de qualquer projeção.
const ALVO_CAIXA_DISPONIVEL = 680000;
const ALVO_APLICACAO = 55000;

export function gerarMassaSintetica({ clientesIds, fornecedoresIds, contasBancariasBase }) {
  const { rand, uniforme, inteiro, escolha, escolhaPonderada } = criarFerramentasAleatorias(SEED);
  const HOJE = todayISO();
  let seq = 0;
  const nextId = (prefixo) => `${prefixo}${++seq}`;

  const lancamentos = [];
  const push = (l) => lancamentos.push({ ...l, id: nextId("s") });

  // Sorteia uma data de baixa em torno do vencimento, pra Composição do
  // Caixa (Antecipado/Em dia/Atrasado de itens JÁ REALIZADOS) não ficar
  // 100% concentrada num único rótulo — independente do mix de aberto.
  function dataPagamentoRealista(vencimento) {
    const r = rand();
    if (r < 0.35) return addDaysISO(vencimento, -inteiro(1, 6)); // Antecipado
    if (r < 0.65) return vencimento; // Em dia
    return addDaysISO(vencimento, inteiro(1, 10)); // Atrasado (mas já baixado)
  }

  // ---- Fase A: backbone histórico 100% Realizado (DRE/DFC/caixa) ----
  for (let m = MESES_HISTORICO - 1; m >= 0; m--) {
    const inicioMes = addMonthsISO(HOJE, -m).slice(0, 8) + "01";
    const ehMesCorrente = m === 0;
    // Mês corrente é parcial (só até HOJE) — escala as contagens pelo
    // quanto do mês já passou, senão o mês corrente pareceria "murcho" no
    // gráfico por ainda não ter terminado (não é uma queda real).
    const diaHoje = Number(HOJE.slice(8, 10));
    const fator = ehMesCorrente ? Math.max(diaHoje / 30, 0.15) : 1;
    const diaMaximo = ehMesCorrente ? diaHoje : 28;

    const dataNoMes = () => `${inicioMes.slice(0, 7)}-${String(inteiro(1, diaMaximo)).padStart(2, "0")}`;

    const gerarRealizado = ({ empresaId, unidadeId, contaGerencialId, centroCustoId, tipo, tipoParceiro, parceiroId, bancoId, contaBancariaId, valor, prazoDias, documento }) => {
      const emissao = dataNoMes();
      const vencimento = addDaysISO(emissao, prazoDias);
      const pagamento = dataPagamentoRealista(vencimento);
      // Nunca deixa o backbone histórico "vazar" pro futuro do mês corrente.
      const pagamentoFinal = pagamento > HOJE ? HOJE : pagamento;
      push({
        empresaId, unidadeId, contaGerencialId, centroCustoId, projetoId: null,
        tipoParceiro, clienteFornecedorId: parceiroId, bancoId, contaBancariaId,
        documento, dataEmissao: emissao, competencia: emissao.slice(0, 7),
        dataVencimento: vencimento, dataPagamento: pagamentoFinal, tipo,
        situacao: "Realizado", valor: Math.round(valor), observacao: "", transferencia: false,
      });
    };

    // Receita e1 (Comércio ABC) — Venda de Produtos / Prestação de Serviços.
    const qtdRevE1 = Math.max(1, Math.round(REVENUE_E1_POR_MES.count * fator));
    for (let i = 0; i < qtdRevE1; i++) {
      const servico = rand() < 0.25;
      gerarRealizado({
        empresaId: "e1", unidadeId: rand() < 0.75 ? "u1" : "u2",
        contaGerencialId: servico ? "pc1.01.02" : "pc1.01.01", centroCustoId: "cc2100",
        tipo: "Entrada", tipoParceiro: "Cliente", parceiroId: escolha(clientesIds),
        bancoId: "b2", contaBancariaId: "cb1",
        valor: uniforme(REVENUE_E1_POR_MES.ticketMin, REVENUE_E1_POR_MES.ticketMax),
        prazoDias: inteiro(0, 3), documento: `NF-${1000 + seq}`,
      });
    }
    // Receita e2 (Indústria XYZ) — Venda de Produtos.
    const qtdRevE2 = Math.max(1, Math.round(REVENUE_E2_POR_MES.count * fator));
    for (let i = 0; i < qtdRevE2; i++) {
      gerarRealizado({
        empresaId: "e2", unidadeId: "u3", contaGerencialId: "pc1.01.01", centroCustoId: "cc3000",
        tipo: "Entrada", tipoParceiro: "Cliente", parceiroId: escolha(clientesIds),
        bancoId: "b3", contaBancariaId: "cb4",
        valor: uniforme(REVENUE_E2_POR_MES.ticketMin, REVENUE_E2_POR_MES.ticketMax),
        prazoDias: inteiro(0, 3), documento: `NF-9${100 + seq}`,
      });
    }

    // Impostos sobre vendas (Deduções) — proporcional à receita do mês.
    ["e1", "e2"].forEach((empresaId) => {
      const banco = empresaId === "e1" ? ["b2", "cb1"] : ["b3", "cb4"];
      gerarRealizado({
        empresaId, unidadeId: empresaId === "e1" ? "u1" : "u3", contaGerencialId: "pc1.02.01",
        centroCustoId: empresaId === "e1" ? "cc1100" : "cc3000", tipo: "Saída", tipoParceiro: null, parceiroId: null,
        bancoId: banco[0], contaBancariaId: banco[1],
        valor: (empresaId === "e1" ? qtdRevE1 * 7500 : qtdRevE2 * 7000) * 0.085,
        prazoDias: 0, documento: `Impostos-${inicioMes.slice(0, 7)}`,
      });
    });

    // Custos (Mercadorias/Matéria-Prima/Fretes).
    const qtdCustos = Math.max(1, Math.round(CUSTOS_POR_MES.count * fator));
    for (let i = 0; i < qtdCustos; i++) {
      const empresaId = rand() < 0.7 ? "e1" : "e2";
      const conta = escolhaPonderada([["pc2.01.02", empresaId === "e1" ? 3 : 0.3], ["pc2.01.01", empresaId === "e2" ? 3 : 0.2], ["pc2.01.03", 1]]);
      gerarRealizado({
        empresaId, unidadeId: empresaId === "e1" ? "u1" : "u3", contaGerencialId: conta,
        centroCustoId: empresaId === "e1" ? "cc2100" : "cc3100", tipo: "Saída",
        tipoParceiro: "Fornecedor", parceiroId: escolha(fornecedoresIds),
        bancoId: empresaId === "e1" ? "b2" : "b3", contaBancariaId: empresaId === "e1" ? "cb1" : "cb4",
        valor: uniforme(CUSTOS_POR_MES.min, CUSTOS_POR_MES.max), prazoDias: inteiro(15, 40),
        documento: `NF-C${2000 + seq}`,
      });
    }

    // Fixos mensais (folha, facilities, comercial, financeiro) por empresa.
    {
      const bancoE1 = ["b2", "cb1"]; const bancoE2 = ["b3", "cb4"];
      const linha = (empresaId, banco, cc, contaGer, valor, doc) => gerarRealizado({
        empresaId, unidadeId: empresaId === "e1" ? "u1" : "u3", contaGerencialId: contaGer, centroCustoId: cc,
        tipo: "Saída", tipoParceiro: null, parceiroId: null, bancoId: banco[0], contaBancariaId: banco[1],
        valor, prazoDias: 0, documento: `${doc}-${inicioMes.slice(0, 7)}`,
      });
      const f1 = FIXOS_MENSAIS_E1, f2 = FIXOS_MENSAIS_E2;
      linha("e1", bancoE1, "cc1300", "pc3.01.01", f1.salarios * fator, "Folha");
      linha("e1", bancoE1, "cc1300", "pc3.01.02", f1.encargos * fator, "Encargos");
      linha("e1", bancoE1, "cc1300", "pc3.01.03", f1.beneficios * fator, "Beneficios");
      linha("e1", bancoE1, "cc1100", "pc3.02.01", f1.aluguel * fator, "Aluguel");
      linha("e1", bancoE1, "cc1100", "pc3.02.02", f1.energia * fator, "Energia");
      linha("e1", bancoE1, "cc1100", "pc3.02.03", f1.sistemas * fator, "Sistemas");
      linha("e1", bancoE1, "cc2200", "pc3.03.01", f1.marketing * fator, "Marketing");
      linha("e1", bancoE1, "cc2100", "pc3.03.02", f1.comissoes * fator, "Comissoes");
      linha("e1", bancoE1, "cc1100", "pc3.04", f1.diversas * fator, "Diversas");
      linha("e1", bancoE1, "cc1100", "pc4.03", f1.tarifas * fator, "Tarifas");

      linha("e2", bancoE2, "cc3100", "pc3.01.01", f2.salarios * fator, "Folha-XYZ");
      linha("e2", bancoE2, "cc3100", "pc3.01.02", f2.encargos * fator, "Encargos-XYZ");
      linha("e2", bancoE2, "cc3100", "pc3.01.03", f2.beneficios * fator, "Beneficios-XYZ");
      linha("e2", bancoE2, "cc3000", "pc3.02.01", f2.aluguel * fator, "Aluguel-XYZ");
      linha("e2", bancoE2, "cc3000", "pc3.02.02", f2.energia * fator, "Energia-XYZ");
      linha("e2", bancoE2, "cc3000", "pc3.02.03", f2.sistemas * fator, "Sistemas-XYZ");
      linha("e2", bancoE2, "cc3000", "pc3.04", f2.diversas * fator, "Diversas-XYZ");
      linha("e2", bancoE2, "cc3000", "pc4.03", f2.tarifas * fator, "Tarifas-XYZ");

      // Financeiro: pequena receita financeira (rendimento da aplicação) e juros ocasionais.
      gerarRealizado({ empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc4.01", centroCustoId: "cc1100", tipo: "Entrada", tipoParceiro: null, parceiroId: null, bancoId: "b2", contaBancariaId: "cb3", valor: uniforme(800, 1800) * fator, prazoDias: 0, documento: `Rend-${inicioMes.slice(0, 7)}` });
      if (rand() < 0.4) gerarRealizado({ empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc4.02", centroCustoId: "cc1100", tipo: "Saída", tipoParceiro: null, parceiroId: null, bancoId: "b2", contaBancariaId: "cb1", valor: uniforme(900, 2600), prazoDias: 0, documento: `Juros-${inicioMes.slice(0, 7)}` });

      // Investimento — esporádico, mantém FCI negativo de tempos em tempos.
      if (rand() < 0.3) {
        const contaInv = escolha(["pc5.01", "pc5.02", "pc5.03"]);
        gerarRealizado({ empresaId: "e1", unidadeId: "u1", contaGerencialId: contaInv, centroCustoId: "cc1100", tipo: "Saída", tipoParceiro: null, parceiroId: null, bancoId: "b2", contaBancariaId: "cb1", valor: uniforme(8000, 26000), prazoDias: 0, documento: `Capex-${inicioMes.slice(0, 7)}` });
      }

      // IRPJ/CSLL mensal, proporcional a uma margem estimada simples.
      const margemEstimada = (qtdRevE1 * 7500 + qtdRevE2 * 7000) * 0.12;
      if (margemEstimada > 0) {
        gerarRealizado({ empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc6.01", centroCustoId: "cc1200", tipo: "Saída", tipoParceiro: null, parceiroId: null, bancoId: "b2", contaBancariaId: "cb1", valor: margemEstimada * 0.34, prazoDias: 0, documento: `IRPJCSLL-${inicioMes.slice(0, 7)}` });
      }
    }
  }

  // ---- Fase B: carteira em aberto (AR/AP), mix de vencimento controlado ----
  function sortearVencimento() {
    const grupo = escolhaPonderada(MIX_VENCIMENTO);
    if (grupo === "antecipado") return addDaysISO(HOJE, inteiro(20, 75));
    if (grupo === "emDia") return addDaysISO(HOJE, inteiro(-2, 2));
    // Atrasado — concentra mais perto do vencimento recente (realista: poucos títulos muito antigos ainda em aberto).
    const dias = escolhaPonderada([[inteiro(3, 30), 5], [inteiro(31, 60), 3], [inteiro(61, 90), 1.5], [inteiro(91, 150), 1]]);
    return addDaysISO(HOJE, -dias);
  }

  function gerarCarteiraAberta({ count, totalAlvo, tipo, contasGerenciais, parceiros, tipoParceiro }) {
    const itens = [];
    for (let i = 0; i < count; i++) {
      const vencimento = sortearVencimento();
      const prazo = inteiro(15, 40);
      const emissao = addDaysISO(vencimento, -prazo);
      const empresaId = rand() < 0.78 ? "e1" : "e2";
      const [contaGerencialId, centroCustoId, banco] = escolha(contasGerenciais(empresaId));
      itens.push({
        empresaId, unidadeId: empresaId === "e1" ? (rand() < 0.7 ? "u1" : "u2") : "u3",
        contaGerencialId, centroCustoId, projetoId: null,
        tipoParceiro, clienteFornecedorId: escolha(parceiros), bancoId: banco[0], contaBancariaId: banco[1],
        documento: `${tipo === "Entrada" ? "NF-AB" : "NF-AP-AB"}-${1000 + i}`,
        dataEmissao: emissao, competencia: emissao.slice(0, 7), dataVencimento: vencimento, dataPagamento: null,
        tipo, situacao: rand() < 0.72 ? "Em aberto" : "Previsto",
        valor: 1, observacao: "", transferencia: false,
      });
    }
    // Recalibra os valores pra somar exatamente o total-alvo (mesma lógica
    // que uma pessoa dimensionando 50 notas fiscais "de verdade" pra bater
    // uma meta de carteira — não é ajuste de exibição, é o dado de entrada).
    const pesos = itens.map(() => uniforme(0.5, 1.8));
    const somaPesos = pesos.reduce((s, w) => s + w, 0);
    itens.forEach((item, i) => { item.valor = Math.round((pesos[i] / somaPesos) * totalAlvo); });
    return itens;
  }

  const arAberto = gerarCarteiraAberta({
    ...AR_ABERTO, tipo: "Entrada", tipoParceiro: "Cliente", parceiros: clientesIds,
    contasGerenciais: (empresaId) => empresaId === "e1"
      ? [["pc1.01.01", "cc2100", ["b2", "cb1"]], ["pc1.01.02", "cc2100", ["b2", "cb1"]]]
      : [["pc1.01.01", "cc3000", ["b3", "cb4"]]],
  });
  const apAberto = gerarCarteiraAberta({
    ...AP_ABERTO, tipo: "Saída", tipoParceiro: "Fornecedor", parceiros: fornecedoresIds,
    contasGerenciais: (empresaId) => empresaId === "e1"
      ? [["pc2.01.02", "cc2100", ["b2", "cb1"]], ["pc2.01.03", "cc2100", ["b2", "cb1"]], ["pc3.03.02", "cc2100", ["b2", "cb1"]]]
      : [["pc2.01.01", "cc3100", ["b3", "cb4"]], ["pc2.01.03", "cc3200", ["b3", "cb4"]]],
  });
  arAberto.forEach((l) => push(l));
  apAberto.forEach((l) => push(l));

  // ---- Transferência interna recorrente (evergreen, ecoa o padrão antigo) ----
  const dataTransf = addDaysISO(HOJE, -inteiro(3, 15));
  const grupoId = "tr-sintetico-1";
  push({ empresaId: "e1", unidadeId: "u1", contaGerencialId: null, centroCustoId: null, projetoId: null, tipoParceiro: null, clienteFornecedorId: null, bancoId: "b1", contaBancariaId: "cb2", documento: "TED-INTERNA-SINT", dataEmissao: dataTransf, competencia: dataTransf.slice(0, 7), dataVencimento: dataTransf, dataPagamento: dataTransf, tipo: "Saída", situacao: "Realizado", valor: 25000, observacao: "Transferência para aplicação", transferencia: true, transferenciaGrupoId: grupoId });
  push({ empresaId: "e1", unidadeId: "u1", contaGerencialId: null, centroCustoId: null, projetoId: null, tipoParceiro: null, clienteFornecedorId: null, bancoId: "b2", contaBancariaId: "cb3", documento: "TED-INTERNA-SINT", dataEmissao: dataTransf, competencia: dataTransf.slice(0, 7), dataVencimento: dataTransf, dataPagamento: dataTransf, tipo: "Entrada", situacao: "Realizado", valor: 25000, observacao: "Transferência para aplicação", transferencia: true, transferenciaGrupoId: grupoId });

  // ---- Calibração do saldo inicial das contas de liquidez ----
  // Caixa Disponível (Tesouraria/Dashboard) = soma(saldoInicial + Realizado
  // até HOJE) das contas com semLiquidez !== "true". Resolve o saldoInicial
  // necessário pra essa MESMA fórmula do app bater ALVO_CAIXA_DISPONIVEL,
  // preservando o peso relativo original de cada conta líquida.
  const contasLiquidas = contasBancariasBase.filter((c) => c.semLiquidez !== "true");
  const movimentoLiquido = (contaId) => lancamentos
    .filter((l) => l.contaBancariaId === contaId && l.situacao === "Realizado" && l.dataPagamento && l.dataPagamento <= HOJE)
    .reduce((s, l) => s + (l.tipo === "Entrada" ? l.valor : -l.valor), 0);

  const movimentoPorConta = Object.fromEntries(contasLiquidas.map((c) => [c.id, movimentoLiquido(c.id)]));
  const totalMovimentoLiquido = Object.values(movimentoPorConta).reduce((s, v) => s + v, 0);
  const pesoOriginalTotal = contasLiquidas.reduce((s, c) => s + c.saldoInicial, 0);
  const saldoInicialNecessarioTotal = ALVO_CAIXA_DISPONIVEL - totalMovimentoLiquido;

  // A aplicação (semLiquidez="true") fica de fora de "Disponível", mas entra
  // em "Total consolidado" — que é o ponto de partida do "Projetado 30 dias"
  // no Fluxo de Caixa. Calibrada à parte com o mesmo método, pra não deixar
  // o total nascer perto do teto da faixa antes de qualquer projeção.
  const contasAplicacao = contasBancariasBase.filter((c) => c.semLiquidez === "true");
  const movimentoAplicacao = contasAplicacao.reduce((s, c) => s + movimentoLiquido(c.id), 0);
  const pesoAplicacaoTotal = contasAplicacao.reduce((s, c) => s + c.saldoInicial, 0);
  const saldoInicialAplicacaoTotal = ALVO_APLICACAO - movimentoAplicacao;

  const contasBancarias = contasBancariasBase.map((c) => {
    if (c.semLiquidez === "true") {
      const peso = pesoAplicacaoTotal > 0 ? c.saldoInicial / pesoAplicacaoTotal : 1 / contasAplicacao.length;
      return { ...c, saldoInicial: Math.round(saldoInicialAplicacaoTotal * peso) };
    }
    const peso = pesoOriginalTotal > 0 ? c.saldoInicial / pesoOriginalTotal : 1 / contasLiquidas.length;
    return { ...c, saldoInicial: Math.round(saldoInicialNecessarioTotal * peso) };
  });

  return { lancamentos, orcamentoItens: gerarOrcamentoCoerente(lancamentos), contasBancarias };
}

// ---------------------------------------------------------------------
// Orçamento sintético 2026 — coerente com o Realizado (±10-15%): calcula a
// média mensal realizada de cada conta orçável (Receita e Despesa, todas)
// nos últimos 12 meses e aplica uma variação determinística por conta.
// ---------------------------------------------------------------------
function gerarOrcamentoCoerente(lancamentos) {
  const { uniforme } = criarFerramentasAleatorias(SEED + 1);
  const HOJE = todayISO();
  const anoAtual = Number(HOJE.slice(0, 4));
  const doze_meses_atras = addMonthsISO(HOJE, -12);

  const contasOrcaveis = [
    ["pc1.01.01", "e1"], ["pc1.01.02", "e1"], ["pc1.02.01", "e1"], ["pc2.01.02", "e1"], ["pc2.01.03", "e1"],
    ["pc3.01.01", "e1"], ["pc3.01.02", "e1"], ["pc3.01.03", "e1"], ["pc3.02.01", "e1"], ["pc3.02.02", "e1"],
    ["pc3.02.03", "e1"], ["pc3.03.01", "e1"], ["pc3.03.02", "e1"], ["pc3.04", "e1"], ["pc4.01", "e1"],
    ["pc4.02", "e1"], ["pc4.03", "e1"], ["pc5.01", "e1"], ["pc5.02", "e1"], ["pc5.03", "e1"], ["pc6.01", "e1"],
    ["pc1.01.01", "e2"], ["pc2.01.01", "e2"], ["pc2.01.03", "e2"], ["pc3.01.01", "e2"], ["pc3.01.02", "e2"],
    ["pc3.01.03", "e2"], ["pc3.02.01", "e2"], ["pc3.02.02", "e2"], ["pc3.02.03", "e2"], ["pc3.04", "e2"], ["pc4.03", "e2"],
  ];

  const itens = [];
  contasOrcaveis.forEach(([contaGerencialId, empresaId]) => {
    const doConta = lancamentos.filter((l) =>
      l.contaGerencialId === contaGerencialId && l.empresaId === empresaId &&
      l.situacao === "Realizado" && !l.transferencia && l.dataPagamento >= doze_meses_atras && l.dataPagamento <= HOJE
    );
    const total = doConta.reduce((s, l) => s + (l.tipo === "Entrada" ? l.valor : -l.valor), 0);
    const mediaMensal = total / 12;
    if (mediaMensal === 0) return;
    // ±10-15% de variação — determinístico por conta (não por mês), pra
    // simular uma meta orçamentária estável ao longo do ano, coerente com
    // o Realizado, sem ficar 100% idêntica a ele.
    const variacao = uniforme(0.85, 1.15);
    const valorMensal = Math.round(mediaMensal * variacao);
    for (let mes = 0; mes < 12; mes++) {
      itens.push({ id: `orc-${empresaId}-${contaGerencialId}-${anoAtual}-${mes}`, ano: anoAtual, empresaId, contaGerencialId, centroCustoId: null, projetoId: null, mes, valor: valorMensal });
    }
  });
  return itens;
}

// ---------------------------------------------------------------------
// Leva 3 (dado real importado): mesma técnica de calibração de saldoInicial
// usada por gerarMassaSintetica (ver "Calibração do saldo inicial" acima),
// mas exposta como função pura reutilizável — o dado real vem pronto de
// fora (planilha), não precisa da geração de lançamentos, só da calibração
// de contas bancárias sobre o líquido Realizado que a planilha trouxe.
//
// Calibração POR EMPRESA e POR CONTA (não um pote único global): duas
// correções sobre a técnica original de gerarMassaSintetica, necessárias
// porque o dado real (Leva 3) não distribui movimento uniformemente como a
// massa sintética distribuía por construção:
//
// 1) Por empresa: o alvo agregado é repartido entre empresas (proporcional
//    ao peso-base das contas líquidas de cada uma) antes de repartir entre
//    contas — senão duas empresas de perfil de caixa muito diferente podem
//    ver uma delas inteira negativa mesmo com o agregado batendo a faixa.
//
// 2) Por conta, saldoFinal (não saldoInicial) proporcional ao peso: a
//    planilha real concentra 100% do movimento de cada empresa numa única
//    conta bancária (a única "Conta Bancária" que aparece no CSV daquela
//    empresa) — as demais contas da empresa ficam com movimento zero.
//    Repartir o saldoInicial-NECESSÁRIO-TOTAL por peso (como antes) deixa a
//    conta que concentra o movimento subfinanciada: seu peso-base (ex.: 36%
//    do pote) não cobre um movimento que é 100% dela. A fórmula certa é
//    saldoInicial_i = (peso_i/pesoTotal × alvo) − movimento_i — cada conta
//    TERMINA (saldoInicial+movimento) com sua fração de peso do alvo,
//    sempre positiva, não importa onde o movimento real se concentrou.
// ---------------------------------------------------------------------
export function calibrarContasBancarias(lancamentos, contasBancariasBase, alvoCaixaDisponivel = ALVO_CAIXA_DISPONIVEL, alvoAplicacao = ALVO_APLICACAO) {
  const HOJE = todayISO();
  const movimentoLiquido = (contaId) => lancamentos
    .filter((l) => l.contaBancariaId === contaId && l.situacao === "Realizado" && l.dataPagamento && l.dataPagamento <= HOJE)
    .reduce((s, l) => s + (l.tipo === "Entrada" ? l.valor : -l.valor), 0);

  const calibrarGrupo = (contas, alvoTotal) => {
    const pesoTotal = contas.reduce((s, c) => s + c.saldoInicial, 0);
    return new Map(contas.map((c) => {
      const peso = pesoTotal > 0 ? c.saldoInicial / pesoTotal : 1 / contas.length;
      const alvoConta = alvoTotal * peso;
      return [c.id, Math.round(alvoConta - movimentoLiquido(c.id))];
    }));
  };

  const contasLiquidas = contasBancariasBase.filter((c) => c.semLiquidez !== "true");
  const pesoLiquidoTotal = contasLiquidas.reduce((s, c) => s + c.saldoInicial, 0);
  const empresaIds = [...new Set(contasLiquidas.map((c) => c.empresaId))];
  const saldosLiquidos = new Map();
  empresaIds.forEach((empresaId) => {
    const contasDaEmpresa = contasLiquidas.filter((c) => c.empresaId === empresaId);
    const pesoEmpresa = contasDaEmpresa.reduce((s, c) => s + c.saldoInicial, 0);
    const alvoEmpresa = pesoLiquidoTotal > 0 ? alvoCaixaDisponivel * (pesoEmpresa / pesoLiquidoTotal) : alvoCaixaDisponivel / empresaIds.length;
    calibrarGrupo(contasDaEmpresa, alvoEmpresa).forEach((v, k) => saldosLiquidos.set(k, v));
  });

  // Aplicação (semLiquidez="true") calibrada à parte, também por empresa —
  // hoje só a1 tem, mas a função fica genérica se isso mudar.
  const contasAplicacao = contasBancariasBase.filter((c) => c.semLiquidez === "true");
  const pesoAplicacaoTotal = contasAplicacao.reduce((s, c) => s + c.saldoInicial, 0);
  const empresaIdsAplicacao = [...new Set(contasAplicacao.map((c) => c.empresaId))];
  const saldosAplicacao = new Map();
  empresaIdsAplicacao.forEach((empresaId) => {
    const contasDaEmpresa = contasAplicacao.filter((c) => c.empresaId === empresaId);
    const pesoEmpresa = contasDaEmpresa.reduce((s, c) => s + c.saldoInicial, 0);
    const alvoEmpresa = pesoAplicacaoTotal > 0 ? alvoAplicacao * (pesoEmpresa / pesoAplicacaoTotal) : alvoAplicacao / empresaIdsAplicacao.length;
    calibrarGrupo(contasDaEmpresa, alvoEmpresa).forEach((v, k) => saldosAplicacao.set(k, v));
  });

  return contasBancariasBase.map((c) => ({
    ...c,
    saldoInicial: c.semLiquidez === "true" ? saldosAplicacao.get(c.id) : saldosLiquidos.get(c.id),
  }));
}

// ---------------------------------------------------------------------
// Leva 3 (dado real importado): mesma técnica de "Orçamento coerente com o
// Realizado" (±10-15%, ver gerarOrcamentoCoerente acima), mas com a lista de
// contas orçáveis derivada automaticamente do próprio dado real (toda conta
// Analítica com aceitaOrcamento=true que teve Realizado nos últimos 12
// meses), em vez de uma lista fixa amarrada à massa sintética antiga.
// ---------------------------------------------------------------------
export function gerarOrcamentoAutomatico(lancamentos, planoDeContas) {
  const { uniforme } = criarFerramentasAleatorias(SEED + 1);
  const HOJE = todayISO();
  const anoAtual = Number(HOJE.slice(0, 4));
  const doze_meses_atras = addMonthsISO(HOJE, -12);
  const contasOrcaveisPorId = new Map(planoDeContas.filter((c) => c.tipo === "Analítica" && c.aceitaOrcamento).map((c) => [c.id, c]));

  const paresUsados = new Set();
  lancamentos.forEach((l) => {
    if (l.situacao !== "Realizado" || l.transferencia) return;
    if (!contasOrcaveisPorId.has(l.contaGerencialId)) return;
    if (l.dataPagamento < doze_meses_atras || l.dataPagamento > HOJE) return;
    paresUsados.add(`${l.contaGerencialId}::${l.empresaId}`);
  });

  const itens = [];
  [...paresUsados].sort().forEach((chave) => {
    const [contaGerencialId, empresaId] = chave.split("::");
    const doConta = lancamentos.filter((l) =>
      l.contaGerencialId === contaGerencialId && l.empresaId === empresaId &&
      l.situacao === "Realizado" && !l.transferencia && l.dataPagamento >= doze_meses_atras && l.dataPagamento <= HOJE
    );
    const total = doConta.reduce((s, l) => s + (l.tipo === "Entrada" ? l.valor : -l.valor), 0);
    const mediaMensal = total / 12;
    if (mediaMensal === 0) return;
    const variacao = uniforme(0.85, 1.15);
    const valorMensal = Math.round(mediaMensal * variacao);
    for (let mes = 0; mes < 12; mes++) {
      itens.push({ id: `orc-${empresaId}-${contaGerencialId}-${anoAtual}-${mes}`, ano: anoAtual, empresaId, contaGerencialId, centroCustoId: null, projetoId: null, mes, valor: valorMensal });
    }
  });
  return itens;
}
