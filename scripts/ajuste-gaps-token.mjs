// Ajuste final após restaurar-calibracoes-completo.mjs:
//
//  1) Reduz valores dos gap de novembro para valores token (R$500 cada),
//     mantendo a satisfação do invariante Composição do Recebimento mas
//     sem inflar o Faturamento (page que usa dataPagamento).
//
//  2) Adiciona 3 gaps de outubro (Oct 21, 26, 28) que ficaram sem
//     Entrada Realizado para e1 após a redistribuição de entradas.
//
// LÊ estado atual do arquivo — não regenera do zero.
import fs from "node:fs";

const PATH = new URL("../src/data/lancamentosImportados.json", import.meta.url);
const data = JSON.parse(fs.readFileSync(PATH, "utf8"));

// ── 1) Reduzir valores dos gaps de novembro para token ──────────────────
const idsNovGap = ["gap1104e1","gap1109e1","gap1110e1","gap1111e1","gap1112e1","gap1113e1","gap1116e1"];
// Valores token diferenciados por dia (modulação dia a dia conforme regra permanente)
const tokenValores = { gap1104e1: 480, gap1109e1: 520, gap1110e1: 495, gap1111e1: 510, gap1112e1: 505, gap1113e1: 490, gap1116e1: 500 };

for (const l of data) {
  if (idsNovGap.includes(l.id)) {
    l.valor = tokenValores[l.id];
  }
}
console.log("[1] Gaps de novembro reduzidos para valores token (~R$500 cada)");

// ── 2) Adicionar gaps de outubro (Oct 21, 26, 28) ──────────────────────
const idsExist = new Set(data.map(l => l.id));

// Verificar se já existem
const gapOut = [
  {
    id: "gap1021e1",
    dataPagamento: "2026-10-21", dataVencimento: "2026-10-16", // Atrasado (5 dias)
    dataEmissao: "2026-10-11", competencia: "2026-10", valor: 460,
    contaGerencialId: "pc1.01.01.01", documento: "NF-202610-GAP-O21",
  },
  {
    id: "gap1026e1",
    dataPagamento: "2026-10-26", dataVencimento: "2026-10-26", // Em dia
    dataEmissao: "2026-10-21", competencia: "2026-10", valor: 530,
    contaGerencialId: "pc1.01.01.02", documento: "NF-202610-GAP-O26",
  },
  {
    id: "gap1028e1",
    dataPagamento: "2026-10-28", dataVencimento: "2026-11-02", // Antecipado (5 dias)
    dataEmissao: "2026-10-23", competencia: "2026-10", valor: 510,
    contaGerencialId: "pc1.01.01.03", documento: "NF-202610-GAP-O28",
  },
];

let added = 0;
for (const g of gapOut) {
  if (idsExist.has(g.id)) { console.log(`[2] ${g.id} já existe, skip.`); continue; }
  data.push({
    empresaId: "e1", unidadeId: null,
    contaGerencialId: g.contaGerencialId, centroCustoId: "cc2100",
    projetoId: null, tipoParceiro: "Cliente",
    clienteFornecedorId: "cli5",
    bancoId: null, contaBancariaId: "cb1",
    documento: g.documento,
    dataEmissao: g.dataEmissao,
    competencia: g.competencia,
    dataVencimento: g.dataVencimento,
    dataPagamento: g.dataPagamento,
    tipo: "Entrada", situacao: "Realizado",
    valor: g.valor,
    observacao: "Gerado — preenchimento de gap de dia útil sem recebimento (Composição do Recebimento, ajuste-gaps-token)",
    transferencia: false,
    id: g.id,
  });
  added++;
}
console.log(`[2] Gaps de outubro adicionados: ${added}`);

// ── escreve ────────────────────────────────────────────────────────────
fs.writeFileSync(PATH, JSON.stringify(data));

const novTotal = data.filter(l=>l.tipo==="Entrada"&&l.situacao==="Realizado"&&l.dataPagamento?.startsWith("2026-11")).reduce((s,l)=>s+l.valor,0);
const gerCount = data.filter(l=>l.observacao?.startsWith("Gerado —")).length;
console.log(`\n✓ Novembro (dataPagamento): R$${novTotal.toFixed(0)} | Gerado—: ${gerCount} | Total lançamentos: ${data.length}`);
