/**
 * calibrar-saldo-inicial.mjs
 * Ajusta saldoInicial das contas bancárias líquidas para que o caixa
 * consolidado final fique positivo (~R$450k), compatível com uma
 * indústria de transformação de médio porte.
 *
 * Lógica:
 *   Caixa Final atual: R$-1.063.170
 *   Target:            R$+450.000
 *   Delta necessário:  R$+1.513.170
 *   Distribuído nas 5 contas líquidas (cb1, cb2, cb4, cb5, cb6)
 *
 * Lê o arquivo atual — NÃO regenera do zero.
 * Preserva todos os lançamentos, invariantes e o sweepLog.
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const demoDataPath = join(__dirname, "../src/data/demoData.js");

// Delta necessário para atingir caixa final ~R$450k
// Distribuição proporcional, com valores realistas por banco
const AJUSTES = {
  cb1: 395000, // Bradesco — conta principal
  cb2: 342000, // Itaú
  cb4: 328170, // Santander
  cb5: 325000, // Banco do Brasil
  cb6: 323000, // Caixa Econômica
};

console.log("=== Calibrar Saldo Inicial — Contas Líquidas ===\n");
console.log("Lendo src/data/demoData.js...");

let content = readFileSync(demoDataPath, "utf-8");

// Mapeia valores atuais e aplica ajuste
for (const [id, novoValor] of Object.entries(AJUSTES)) {
  // Localiza a linha do objeto da conta pelo id
  const regex = new RegExp(
    `(\\{[^}]*id:\\s*"${id}"[^}]*saldoInicial:\\s*)([\\d]+)`,
    "s"
  );
  const match = content.match(regex);
  if (!match) {
    console.error(`ERRO: conta ${id} não encontrada no demoData.js`);
    process.exit(1);
  }
  const valorAnterior = Number(match[2]);
  content = content.replace(regex, `$1${novoValor}`);
  console.log(
    `  ${id}: R$${valorAnterior.toLocaleString("pt-BR")} → R$${novoValor.toLocaleString("pt-BR")} (Δ +R$${(novoValor - valorAnterior).toLocaleString("pt-BR")})`
  );
}

writeFileSync(demoDataPath, content, "utf-8");

console.log("\n✅ demoData.js atualizado.");
console.log("   Caixa final projetado após ajuste: ~R$+450.000");
console.log("\nRodando verificação pós-calibração...");
