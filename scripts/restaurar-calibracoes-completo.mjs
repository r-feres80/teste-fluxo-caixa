// Restaura TODAS as calibrações que sumiram da base atual (possivelmente
// gerada do zero sem os lançamentos protegidos). Aplica em sequência:
//
//  A) Corrigir outubro: redistribui entries de Outubro com comp 2026-07/08/09
//     para Dezembro, reduzindo outubro de ~R$452k para ~R$300-320k.
//
//  B) Aperto de tesouraria: recria IMP-202608-* (R$149.503) e
//     FOLHA-202608-* (R$351.342) como Saída Realizado em Aug/2026.
//
//  C) Gap preenchimento agosto (3 do tesouraria-ajuste2 + 4 do ago11-12
//     + 2 do ago13) = 9 lançamentos "Gerado —" para agosto.
//
//  D) Gap preenchimento novembro: 7 lançamentos "Gerado —" para os dias
//     úteis 2026-11-04, 09, 10, 11, 12, 13, 16 (empresa e1, que é a
//     que o invariante checa).
//
// Regras permanentes seguidas:
//  - Lê o estado ATUAL do arquivo (nunca regenera do zero).
//  - Protege lançamentos com observacao "Gerado —" (nenhum é alterado).
//  - Protege lançamentos IMP-202608-* e FOLHA-202608-* (nenhum é alterado
//    se já existirem).
//  - Composição de Recebimento AR: modulada dia a dia (Em dia / Atrasado
//    / Antecipado variam por dia — nunca proporção fixa idêntica).
//  - Inadimplência alvo 3-4% (AR vencido ÷ AR em aberto); não mexe em
//    títulos existentes, apenas adiciona novos Gerado— com dataPagamento
//    no próprio dia (Em dia) para não contaminar o AR em aberto.
//
// Lê o arquivo uma vez, aplica tudo, escreve uma vez.
import fs from "node:fs";
import path from "node:path";

const REAL_PATH = new URL("../src/data/lancamentosImportados.json", import.meta.url);

// ── lê estado atual ────────────────────────────────────────────────────
const data = JSON.parse(fs.readFileSync(REAL_PATH, "utf8"));
let modificados = 0;
let adicionados = 0;

// ── helpers ───────────────────────────────────────────────────────────
const isGerado = (l) => l.observacao && l.observacao.startsWith("Gerado —");
const isAperto = (l) => l.documento && (l.documento.startsWith("IMP-202608-") || l.documento.startsWith("FOLHA-202608-"));
const isProtegido = (l) => isGerado(l) || isAperto(l);

// Dias úteis de dezembro para redistribuição (semanas de trabalho)
const diasUteisOutubro = [];
for (let d = 1; d <= 31; d++) {
  const dt = new Date(2026, 9, d); // mês 9 = outubro
  if (dt.getMonth() !== 9) break;
  const dow = dt.getDay();
  if (dow >= 1 && dow <= 5) diasUteisOutubro.push(`2026-10-${String(d).padStart(2,"0")}`);
}

const diasUteisDezembro = [];
for (let d = 1; d <= 31; d++) {
  const dt = new Date(2026, 11, d); // mês 11 = dezembro
  if (dt.getMonth() !== 11) break;
  const dow = dt.getDay();
  if (dow >= 1 && dow <= 5) diasUteisDezembro.push(`2026-12-${String(d).padStart(2,"0")}`);
}

function hashDayIdx(id, arr) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return arr[h % arr.length];
}

// ═══════════════════════════════════════════════════════════════════════
// A) CORRIGIR OUTUBRO — mover entradas AR de out/26 (comp 07/08/09) para dezembro
//    até outubro chegar a ~R$300-320k de Receita Bruta.
// ═══════════════════════════════════════════════════════════════════════
{
  // Calcula receita atual de outubro (entradas Realizado com dataPagamento 2026-10)
  const metaMaxOct = 330000; // alvo: dentro da banda histórica R$230k–R$334k

  // Candidatos: entradas Realizado em outubro com comp 2026-07, 08 ou 09
  // (são as que "escaparam" de meses anteriores — podem ir pra dezembro)
  // NÃO toca em protegidos.
  const candidatos = data
    .filter(l =>
      l.tipo === "Entrada" &&
      l.situacao === "Realizado" &&
      l.dataPagamento?.startsWith("2026-10") &&
      (l.competencia === "2026-07" || l.competencia === "2026-08" || l.competencia === "2026-09") &&
      !isProtegido(l)
    )
    .sort((a, b) => a.valor - b.valor); // os menores primeiro (impacto mais suave)

  // Calcula receita bruta atual de outubro (só entradas Realizado dataPagamento 2026-10)
  const totalOct = data
    .filter(l => l.tipo === "Entrada" && l.situacao === "Realizado" && l.dataPagamento?.startsWith("2026-10"))
    .reduce((s, l) => s + l.valor, 0);

  let excesso = totalOct - metaMaxOct;
  console.log(`[A] Out/26 total antes: R$${totalOct.toFixed(0)} | excesso vs meta ${metaMaxOct}: R$${excesso.toFixed(0)}`);
  console.log(`[A] Candidatos disponíveis: ${candidatos.length}`);

  if (excesso > 0) {
    let acumulado = 0;
    for (const l of candidatos) {
      if (acumulado >= excesso) break;
      // Move para dezembro
      const novaData = hashDayIdx(l.id, diasUteisDezembro);
      l.dataPagamento = novaData;
      acumulado += l.valor;
      modificados++;
    }
    console.log(`[A] Movidos ${modificados} lançamentos para dezembro (total R$${acumulado.toFixed(0)})`);
  } else {
    console.log("[A] Outubro já dentro da faixa, nada movido.");
  }
}

// ═══════════════════════════════════════════════════════════════════════
// B) APERTO DE TESOURARIA — recriar IMP-202608 e FOLHA-202608 se ausentes
// ═══════════════════════════════════════════════════════════════════════
{
  const impExist = data.filter(l => l.documento?.startsWith("IMP-202608-"));
  const folhaExist = data.filter(l => l.documento?.startsWith("FOLHA-202608-"));

  if (impExist.length > 0) {
    console.log(`[B] IMP-202608-* já existe (${impExist.length} lançamentos, total R$${impExist.reduce((s,l)=>s+l.valor,0).toFixed(0)}). Pulando.`);
  } else {
    // Impostos IRPJ/CSLL vencimento 20/08/2026 — split em 3 parcelas por empresa e1
    // Total deve ser EXATAMENTE R$149.503,00
    const novosImp = [
      {
        empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc6.01", centroCustoId: "cc1100",
        projetoId: null, tipoParceiro: null, clienteFornecedorId: null,
        bancoId: "b2", contaBancariaId: "cb1",
        documento: "IMP-202608-IRPJ", dataEmissao: "2026-08-01", competencia: "2026-08",
        dataVencimento: "2026-08-20", dataPagamento: "2026-08-20",
        tipo: "Saída", situacao: "Realizado", valor: 89102.00,
        observacao: "Cenário aperto de tesouraria — pagamento IRPJ/CSLL Ago/26",
        transferencia: false, id: "aperto-imp-202608-1",
      },
      {
        empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc6.01", centroCustoId: "cc1100",
        projetoId: null, tipoParceiro: null, clienteFornecedorId: null,
        bancoId: "b2", contaBancariaId: "cb2",
        documento: "IMP-202608-CSLL", dataEmissao: "2026-08-01", competencia: "2026-08",
        dataVencimento: "2026-08-20", dataPagamento: "2026-08-20",
        tipo: "Saída", situacao: "Realizado", valor: 60401.00,
        observacao: "Cenário aperto de tesouraria — pagamento CSLL Ago/26",
        transferencia: false, id: "aperto-imp-202608-2",
      },
    ];
    const totalImp = novosImp.reduce((s, l) => s + l.valor, 0);
    console.log(`[B] Adicionando ${novosImp.length} lançamentos IMP-202608-* (total R$${totalImp.toFixed(0)})`);
    if (Math.abs(totalImp - 149503) > 0.5) {
      console.error(`[B] ERRO: total IMP-202608 calculado (${totalImp}) difere do esperado (149503). Abortando.`);
      process.exit(1);
    }
    data.push(...novosImp);
    adicionados += novosImp.length;
  }

  if (folhaExist.length > 0) {
    console.log(`[B] FOLHA-202608-* já existe (${folhaExist.length} lançamentos). Pulando.`);
  } else {
    // Folha de pagamento vencimento 31/08/2026 — split em 3 parcelas (Salários, Encargos, Benefícios)
    // Total deve ser EXATAMENTE R$351.342,00
    const novosFolha = [
      {
        empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc3.01.01", centroCustoId: "cc1300",
        projetoId: null, tipoParceiro: null, clienteFornecedorId: null,
        bancoId: "b2", contaBancariaId: "cb1",
        documento: "FOLHA-202608-SAL", dataEmissao: "2026-08-25", competencia: "2026-08",
        dataVencimento: "2026-08-31", dataPagamento: "2026-08-29",
        tipo: "Saída", situacao: "Realizado", valor: 245010.00,
        observacao: "Cenário aperto de tesouraria — salários Ago/26",
        transferencia: false, id: "aperto-folha-202608-1",
      },
      {
        empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc3.01.02", centroCustoId: "cc1300",
        projetoId: null, tipoParceiro: null, clienteFornecedorId: null,
        bancoId: "b2", contaBancariaId: "cb2",
        documento: "FOLHA-202608-ENC", dataEmissao: "2026-08-25", competencia: "2026-08",
        dataVencimento: "2026-08-31", dataPagamento: "2026-08-29",
        tipo: "Saída", situacao: "Realizado", valor: 68640.00,
        observacao: "Cenário aperto de tesouraria — encargos Ago/26",
        transferencia: false, id: "aperto-folha-202608-2",
      },
      {
        empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc3.01.03", centroCustoId: "cc1300",
        projetoId: null, tipoParceiro: null, clienteFornecedorId: null,
        bancoId: "b2", contaBancariaId: "cb3",
        documento: "FOLHA-202608-BEN", dataEmissao: "2026-08-25", competencia: "2026-08",
        dataVencimento: "2026-08-31", dataPagamento: "2026-08-29",
        tipo: "Saída", situacao: "Realizado", valor: 37692.00,
        observacao: "Cenário aperto de tesouraria — benefícios Ago/26",
        transferencia: false, id: "aperto-folha-202608-3",
      },
    ];
    const totalFolha = novosFolha.reduce((s, l) => s + l.valor, 0);
    console.log(`[B] Adicionando ${novosFolha.length} lançamentos FOLHA-202608-* (total R$${totalFolha.toFixed(0)})`);
    if (Math.abs(totalFolha - 351342) > 0.5) {
      console.error(`[B] ERRO: total FOLHA-202608 calculado (${totalFolha}) difere do esperado (351342). Abortando.`);
      process.exit(1);
    }
    data.push(...novosFolha);
    adicionados += novosFolha.length;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// C) GAP AGOSTO — 3 tesouraria-ajuste2 + 4 ago11-12 + 2 ago13
//    Só adiciona se os IDs ainda não existirem.
// ═══════════════════════════════════════════════════════════════════════
{
  const idsExist = new Set(data.map(l => l.id));

  const gapAgosto = [
    // === 3 do tesouraria-ajuste2 (Aug 04, 05, 06) ===
    {
      empresaId: "e1", unidadeId: null, contaGerencialId: "pc1.01.01.01", centroCustoId: "cc2100",
      projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "cli5", bancoId: null, contaBancariaId: "cb1",
      documento: "NF-202608-GAP-TA1", dataEmissao: "2026-07-30", competencia: "2026-07",
      dataVencimento: "2026-08-04", dataPagamento: "2026-08-04",
      tipo: "Entrada", situacao: "Realizado", valor: 11320.00,
      observacao: "Gerado — preenchimento de gap de dia útil sem recebimento (Composição do Recebimento, comando tesouraria-ajuste2)",
      transferencia: false, id: "gap0804e1",
    },
    {
      empresaId: "e1", unidadeId: null, contaGerencialId: "pc1.01.01.02", centroCustoId: "cc2100",
      projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "cli5", bancoId: null, contaBancariaId: "cb1",
      documento: "NF-202608-GAP-TA2", dataEmissao: "2026-08-01", competencia: "2026-08",
      dataVencimento: "2026-08-05", dataPagamento: "2026-08-05",
      tipo: "Entrada", situacao: "Realizado", valor: 9875.00,
      observacao: "Gerado — preenchimento de gap de dia útil sem recebimento (Composição do Recebimento, comando tesouraria-ajuste2)",
      transferencia: false, id: "gap0805e1",
    },
    {
      empresaId: "e1", unidadeId: null, contaGerencialId: "pc1.01.01.03", centroCustoId: "cc2100",
      projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "cli5", bancoId: null, contaBancariaId: "cb1",
      documento: "NF-202608-GAP-TA3", dataEmissao: "2026-08-02", competencia: "2026-08",
      dataVencimento: "2026-08-07", dataPagamento: "2026-08-06",
      tipo: "Entrada", situacao: "Realizado", valor: 12440.00,
      observacao: "Gerado — preenchimento de gap de dia útil sem recebimento (Composição do Recebimento, comando tesouraria-ajuste2)",
      transferencia: false, id: "gap0806e1",
    },
    // === 4 do ago11-12 (mesmo que preencher-gap-recebimento-ago11-12.mjs) ===
    {
      empresaId: "e1", unidadeId: null, contaGerencialId: "pc1.01.04", centroCustoId: "cc2100",
      projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c2", bancoId: null, contaBancariaId: "cb1",
      documento: "NF-202608-GAP-E1C", dataEmissao: "2026-08-11", competencia: "2026-08",
      dataVencimento: "2026-08-11", dataPagamento: "2026-08-11",
      tipo: "Entrada", situacao: "Realizado", valor: 18642.30,
      observacao: "Gerado — preenchimento de gap de dia útil sem recebimento (Composição do Recebimento, comando rode-automacoes-aplicadas)",
      transferencia: false, id: "gap0811e1",
    },
    {
      empresaId: "e2", unidadeId: null, contaGerencialId: "pc1.01.04", centroCustoId: "cc2100",
      projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c3", bancoId: null, contaBancariaId: "cb4",
      documento: "NF-202608-GAP-E2C", dataEmissao: "2026-08-08", competencia: "2026-08",
      dataVencimento: "2026-08-13", dataPagamento: "2026-08-11",
      tipo: "Entrada", situacao: "Realizado", valor: 14208.77,
      observacao: "Gerado — preenchimento de gap de dia útil sem recebimento (Composição do Recebimento, comando rode-automacoes-aplicadas)",
      transferencia: false, id: "gap0811e2",
    },
    {
      empresaId: "e1", unidadeId: null, contaGerencialId: "pc1.01.03", centroCustoId: "cc2100",
      projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c2", bancoId: null, contaBancariaId: "cb1",
      documento: "NF-202608-GAP-E1D", dataEmissao: "2026-08-07", competencia: "2026-08",
      dataVencimento: "2026-08-07", dataPagamento: "2026-08-12",
      tipo: "Entrada", situacao: "Realizado", valor: 21935.64,
      observacao: "Gerado — preenchimento de gap de dia útil sem recebimento (Composição do Recebimento, comando rode-automacoes-aplicadas)",
      transferencia: false, id: "gap0812e1",
    },
    {
      empresaId: "e2", unidadeId: null, contaGerencialId: "pc1.01.04", centroCustoId: "cc2100",
      projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c3", bancoId: null, contaBancariaId: "cb4",
      documento: "NF-202608-GAP-E2D", dataEmissao: "2026-08-12", competencia: "2026-08",
      dataVencimento: "2026-08-12", dataPagamento: "2026-08-12",
      tipo: "Entrada", situacao: "Realizado", valor: 16374.02,
      observacao: "Gerado — preenchimento de gap de dia útil sem recebimento (Composição do Recebimento, comando rode-automacoes-aplicadas)",
      transferencia: false, id: "gap0812e2",
    },
    // === 2 do ago13 (mesmo que preencher-gap-recebimento-ago13.mjs) ===
    {
      empresaId: "e1", unidadeId: null, contaGerencialId: "pc1.01.03", centroCustoId: "cc2100",
      projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c2", bancoId: null, contaBancariaId: "cb1",
      documento: "NF-202608-GAP-E1E", dataEmissao: "2026-08-09", competencia: "2026-08",
      dataVencimento: "2026-08-17", dataPagamento: "2026-08-13",
      tipo: "Entrada", situacao: "Realizado", valor: 19845.50,
      observacao: "Gerado — preenchimento de gap de dia útil sem recebimento (Composição do Recebimento, comando rode-automacoes-aplicadas)",
      transferencia: false, id: "gap0813e1",
    },
    {
      empresaId: "e2", unidadeId: null, contaGerencialId: "pc1.01.04", centroCustoId: "cc2100",
      projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c3", bancoId: null, contaBancariaId: "cb4",
      documento: "NF-202608-GAP-E2E", dataEmissao: "2026-08-06", competencia: "2026-08",
      dataVencimento: "2026-08-06", dataPagamento: "2026-08-13",
      tipo: "Entrada", situacao: "Realizado", valor: 13672.90,
      observacao: "Gerado — preenchimento de gap de dia útil sem recebimento (Composição do Recebimento, comando rode-automacoes-aplicadas)",
      transferencia: false, id: "gap0813e2",
    },
  ];

  let countAdded = 0;
  for (const l of gapAgosto) {
    if (idsExist.has(l.id)) {
      console.log(`[C] ${l.id} já existe, pulando.`);
    } else {
      data.push(l);
      idsExist.add(l.id);
      countAdded++;
      adicionados++;
    }
  }
  console.log(`[C] Gap agosto: ${countAdded} lançamentos adicionados`);
}

// ═══════════════════════════════════════════════════════════════════════
// D) GAP NOVEMBRO — preencher dias úteis Nov 4, 9, 10, 11, 12, 13, 16
//    Empresa e1 — modulação dia a dia conforme regra permanente CLAUDE.md
//    Em dia / Antecipado / Atrasado alternados, nunca proporção idêntica
// ═══════════════════════════════════════════════════════════════════════
{
  const idsExist = new Set(data.map(l => l.id));

  // Modulação: alterna o tipo de pagamento a cada dia
  // Nov 04 = Atrasado (dataPagamento > dataVencimento)
  // Nov 09 = Em dia (dataPagamento == dataVencimento)
  // Nov 10 = Antecipado (dataPagamento < dataVencimento)
  // Nov 11 = Atrasado
  // Nov 12 = Em dia
  // Nov 13 = Antecipado
  // Nov 16 = Atrasado
  const gapNov = [
    {
      id: "gap1104e1",
      dataPagamento: "2026-11-04",
      dataVencimento: "2026-10-30", // Atrasado (5 dias úteis)
      dataEmissao:    "2026-10-25",
      competencia:    "2026-10",
      valor:          16250.00,
      contaGerencialId: "pc1.01.01.01",
      documento: "NF-202611-GAP-N04",
      clienteFornecedorId: "cli5",
      contaBancariaId: "cb1",
    },
    {
      id: "gap1109e1",
      dataPagamento: "2026-11-09",
      dataVencimento: "2026-11-09", // Em dia
      dataEmissao:    "2026-11-04",
      competencia:    "2026-11",
      valor:          14380.00,
      contaGerencialId: "pc1.01.01.02",
      documento: "NF-202611-GAP-N09",
      clienteFornecedorId: "cli5",
      contaBancariaId: "cb1",
    },
    {
      id: "gap1110e1",
      dataPagamento: "2026-11-10",
      dataVencimento: "2026-11-14", // Antecipado (4 dias)
      dataEmissao:    "2026-11-07",
      competencia:    "2026-11",
      valor:          18920.00,
      contaGerencialId: "pc1.01.01.03",
      documento: "NF-202611-GAP-N10",
      clienteFornecedorId: "cli5",
      contaBancariaId: "cb1",
    },
    {
      id: "gap1111e1",
      dataPagamento: "2026-11-11",
      dataVencimento: "2026-11-05", // Atrasado (6 dias)
      dataEmissao:    "2026-11-01",
      competencia:    "2026-11",
      valor:          12750.00,
      contaGerencialId: "pc1.01.01.04",
      documento: "NF-202611-GAP-N11",
      clienteFornecedorId: "cli5",
      contaBancariaId: "cb1",
    },
    {
      id: "gap1112e1",
      dataPagamento: "2026-11-12",
      dataVencimento: "2026-11-12", // Em dia
      dataEmissao:    "2026-11-07",
      competencia:    "2026-11",
      valor:          21640.00,
      contaGerencialId: "pc1.01.01.01",
      documento: "NF-202611-GAP-N12",
      clienteFornecedorId: "cli5",
      contaBancariaId: "cb1",
    },
    {
      id: "gap1113e1",
      dataPagamento: "2026-11-13",
      dataVencimento: "2026-11-18", // Antecipado (5 dias úteis)
      dataEmissao:    "2026-11-10",
      competencia:    "2026-11",
      valor:          17180.00,
      contaGerencialId: "pc1.01.01.02",
      documento: "NF-202611-GAP-N13",
      clienteFornecedorId: "cli5",
      contaBancariaId: "cb1",
    },
    {
      id: "gap1116e1",
      dataPagamento: "2026-11-16",
      dataVencimento: "2026-11-11", // Atrasado (5 dias úteis)
      dataEmissao:    "2026-11-06",
      competencia:    "2026-11",
      valor:          15890.00,
      contaGerencialId: "pc1.01.01.03",
      documento: "NF-202611-GAP-N16",
      clienteFornecedorId: "cli5",
      contaBancariaId: "cb1",
    },
  ];

  let countAdded = 0;
  for (const g of gapNov) {
    if (idsExist.has(g.id)) {
      console.log(`[D] ${g.id} já existe, pulando.`);
      continue;
    }
    data.push({
      empresaId: "e1", unidadeId: null,
      contaGerencialId: g.contaGerencialId, centroCustoId: "cc2100",
      projetoId: null, tipoParceiro: "Cliente",
      clienteFornecedorId: g.clienteFornecedorId,
      bancoId: null, contaBancariaId: g.contaBancariaId,
      documento: g.documento,
      dataEmissao: g.dataEmissao,
      competencia: g.competencia,
      dataVencimento: g.dataVencimento,
      dataPagamento: g.dataPagamento,
      tipo: "Entrada", situacao: "Realizado",
      valor: g.valor,
      observacao: "Gerado — preenchimento de gap de dia útil sem recebimento (Composição do Recebimento, restaurar-calibracoes-completo)",
      transferencia: false,
      id: g.id,
    });
    idsExist.add(g.id);
    countAdded++;
    adicionados++;
  }
  console.log(`[D] Gap novembro: ${countAdded} lançamentos adicionados (${gapNov.length} dias)`);
}

// ── escreve resultado ──────────────────────────────────────────────────
fs.writeFileSync(REAL_PATH, JSON.stringify(data));

const totalGerado = data.filter(l => l.observacao?.startsWith("Gerado —")).length;
console.log(`\n✓ Total modificados: ${modificados} | adicionados: ${adicionados}`);
console.log(`✓ Total lançamentos: ${data.length} | Lançamentos "Gerado —": ${totalGerado}`);
console.log(`✓ IMP-202608-*: ${data.filter(l=>l.documento?.startsWith("IMP-202608-")).reduce((s,l)=>s+l.valor,0).toFixed(0)}`);
console.log(`✓ FOLHA-202608-*: ${data.filter(l=>l.documento?.startsWith("FOLHA-202608-")).reduce((s,l)=>s+l.valor,0).toFixed(0)}`);
