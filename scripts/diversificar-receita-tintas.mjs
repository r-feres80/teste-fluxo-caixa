/**
 * diversificar-receita-tintas.mjs
 * Redistribui lancamentos e orcamento da conta genérica "Venda de Produtos"
 * (pc1.01.01) entre sub-contas por linha de produto de tintas.
 *
 * Lê o estado ATUAL dos arquivos antes de editar (regra permanente CLAUDE.md).
 * Usa semente fixa para reprodutibilidade entre recargas.
 */

import { readFileSync, writeFileSync } from "fs";

const LANC_PATH  = "src/data/lancamentosImportados.json";
const ORC_PATH   = "src/data/orcamentoItensGerados.json";

// ── Novas contas analíticas (inseridas em demoData.js separadamente) ──────
// Conta-pai pc1.01.01 (Venda de Produtos) permanece Sintética após a edição
// manual em demoData.js; as filhas recebem os lançamentos.
const PRODUTOS = [
  { id: "pc1.01.01.01", peso: 0.40, descricao: "Tintas Imobiliárias" },
  { id: "pc1.01.01.02", peso: 0.25, descricao: "Tintas Industriais" },
  { id: "pc1.01.01.03", peso: 0.15, descricao: "Vernizes e Stains" },
  { id: "pc1.01.01.04", peso: 0.12, descricao: "Impermeabilizantes" },
  { id: "pc1.01.01.05", peso: 0.08, descricao: "Texturas e Grafiato" },
];

// seeded LCG
let seed = 20261118;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

function sortearConta() {
  const r = rnd();
  let acum = 0;
  for (const p of PRODUTOS) { acum += p.peso; if (r < acum) return p.id; }
  return PRODUTOS[PRODUTOS.length - 1].id;
}

// ── Lançamentos ────────────────────────────────────────────────────────────
const lancs = JSON.parse(readFileSync(LANC_PATH, "utf8"));
let contLanc = 0;
const distribLanc = {};
for (const l of lancs) {
  if (l.contaGerencialId === "pc1.01.01") {
    const nova = sortearConta();
    l.contaGerencialId = nova;
    distribLanc[nova] = (distribLanc[nova] || 0) + 1;
    contLanc++;
  }
}
writeFileSync(LANC_PATH, JSON.stringify(lancs, null, 2));
console.log(`\nLançamentos redistribuídos: ${contLanc}`);
Object.entries(distribLanc).sort().forEach(([k,v]) => {
  const p = PRODUTOS.find(p => p.id === k);
  console.log(`  ${k} (${p?.descricao}): ${v}`);
});

// ── Orçamento ──────────────────────────────────────────────────────────────
const orc = JSON.parse(readFileSync(ORC_PATH, "utf8"));
let contOrc = 0;
const distribOrc = {};
for (const o of orc) {
  if (o.contaGerencialId === "pc1.01.01") {
    const nova = sortearConta();
    o.contaGerencialId = nova;
    distribOrc[nova] = (distribOrc[nova] || 0) + 1;
    contOrc++;
  }
}
writeFileSync(ORC_PATH, JSON.stringify(orc, null, 2));
console.log(`\nItens de orçamento redistribuídos: ${contOrc}`);
Object.entries(distribOrc).sort().forEach(([k,v]) => {
  const p = PRODUTOS.find(p => p.id === k);
  console.log(`  ${k} (${p?.descricao}): ${v}`);
});

console.log("\n✅ Pronto. Agora edite demoData.js: transforme pc1.01.01 em Sintética e adicione as 5 sub-contas filhas.");
