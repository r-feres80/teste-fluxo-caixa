/**
 * corrigir-faturamento-novembro.mjs
 *
 * Lê o estado ATUAL do arquivo (nunca regenera do zero).
 * Redistribui dataPagamento de entradas novembro com competência em meses
 * anteriores para outubro/dezembro, zerando o spike de R$664k.
 *
 * Meta: novembro ~40 entradas (~R$320-340k), compatível com histórico.
 *
 * Estratégia por competência dos lançamentos atualmente em novembro:
 *   - 2026-07 (2 entradas): → outubro (tardio, 3+ meses, eram de jul)
 *   - 2026-08 (7 entradas): → outubro (tardio, 2+ meses)
 *   - 2026-09 (25 entradas): → 15 para outubro, 10 ficam em novembro
 *   - 2026-10 (38 entradas): → 18 para dezembro, 20 ficam em novembro
 *   - 2026-11 (8 entradas):  → ficam em novembro (competência do mês)
 *
 * Resultado esperado: novembro = 10+20+8 = 38 entradas ≈ R$305-315k
 *
 * Protocolo CLAUDE.md:
 * 1. Roda verificar-massa-sintetica.mjs ANTES (baseline — feito externamente)
 * 2. Aplica mudança
 * 3. NUNCA commita sem rodar verificar depois e conferir regressões
 */

import { createRequire } from "module";
import { writeFileSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dir, "../src/data/lancamentosImportados.json");

// ── Dias úteis disponíveis para redistribuição ────────────────────────────────
// Outubro: todos dias úteis (segunda-sexta)
function diasUteisDoMes(ano, mes) {
  const dias = [];
  const ultimo = new Date(ano, mes, 0).getDate(); // mes é 1-based
  for (let d = 1; d <= ultimo; d++) {
    const dt = `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const wd = new Date(dt + "T12:00:00").getDay();
    if (wd !== 0 && wd !== 6) dias.push(dt);
  }
  return dias;
}

const DIAS_OUTUBRO = diasUteisDoMes(2026, 10);
const DIAS_DEZEMBRO = diasUteisDoMes(2026, 12);

// Embaralha deterministicamente (seed baseado no id do lançamento)
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function escolherDia(dias, seed) {
  return dias[hashCode(seed) % dias.length];
}

// ── Leitura do arquivo atual ──────────────────────────────────────────────────
const raw = readFileSync(DATA_PATH, "utf8");
const dados = JSON.parse(raw);
// lancamentosImportados.json é um array direto (não tem wrapper)
const lancamentos = Array.isArray(dados) ? dados : dados.lancamentos;

console.log("Total lançamentos carregados:", lancamentos.length);

// ── Identificar entradas de novembro por competência ─────────────────────────
const novEntradas = lancamentos.filter(
  (l) =>
    l.tipo === "Entrada" &&
    l.situacao === "Realizado" &&
    l.dataPagamento?.startsWith("2026-11")
);

const byComp = { "2026-07": [], "2026-08": [], "2026-09": [], "2026-10": [], "2026-11": [] };
novEntradas.forEach((l) => {
  const c = l.competencia || "sem";
  if (byComp[c]) byComp[c].push(l.id);
});

console.log("\nDistribuição atual de entradas em novembro por competência:");
Object.entries(byComp).forEach(([k, v]) => console.log(` ${k}: ${v.length} entradas`));

// ── Definir quais mover e para onde ──────────────────────────────────────────
// Jul-comp (2) → outubro
// Ago-comp (7) → outubro
// Set-comp (25) → 15 para outubro, 10 ficam em novembro
// Out-comp (38) → 18 para dezembro, 20 ficam em novembro
// Nov-comp (8) → ficam em novembro

const moverParaOutubro = new Set([
  ...byComp["2026-07"],
  ...byComp["2026-08"],
  ...byComp["2026-09"].slice(0, 15), // primeiros 15 de setembro
]);

const moverParaDezembro = new Set([
  ...byComp["2026-10"].slice(0, 18), // primeiros 18 de outubro
]);

console.log(
  `\nMovendo para outubro: ${moverParaOutubro.size} entradas`
);
console.log(`Movendo para dezembro: ${moverParaDezembro.size} entradas`);
console.log(
  `Ficam em novembro: ${novEntradas.length - moverParaOutubro.size - moverParaDezembro.size} entradas`
);

// ── Aplicar redistribuição ───────────────────────────────────────────────────
let alterados = 0;
lancamentos.forEach((l) => {
  if (moverParaOutubro.has(l.id)) {
    const novaData = escolherDia(DIAS_OUTUBRO, l.id + "_out");
    l.dataPagamento = novaData;
    alterados++;
  } else if (moverParaDezembro.has(l.id)) {
    const novaData = escolherDia(DIAS_DEZEMBRO, l.id + "_dez");
    l.dataPagamento = novaData;
    alterados++;
  }
});

console.log(`\nAlterados: ${alterados} lançamentos`);

// ── Verificação rápida pós-mudança ────────────────────────────────────────────
const counts = {};
lancamentos
  .filter((l) => l.tipo === "Entrada" && l.situacao === "Realizado")
  .forEach((l) => {
    const k = l.dataPagamento?.substring(0, 7) || "sem";
    counts[k] = (counts[k] || 0) + 1;
  });

console.log("\nContagem pós-redistribuição:");
["2026-09", "2026-10", "2026-11", "2026-12"].forEach((k) =>
  console.log(` ${k}: ${counts[k] || 0} entradas`)
);

// ── Gravar ────────────────────────────────────────────────────────────────────
const saida = Array.isArray(dados) ? lancamentos : { ...dados, lancamentos };
writeFileSync(DATA_PATH, JSON.stringify(saida, null, 2), "utf8");
console.log("\n✅ lancamentosImportados.json atualizado.");
console.log(
  "⚠️  OBRIGATÓRIO: rode node scripts/verificar-massa-sintetica.mjs e confirme sem regressões não intencionais antes de commitar."
);
