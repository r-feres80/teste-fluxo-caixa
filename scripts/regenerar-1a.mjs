// Etapa 1A: regenera lançamentos e orçamento sintéticos atualizados até HOJE
// usando gerarMassaSintetica existente (perfil "PME saudável atual").
//
// - Backup automático de lancamentosImportados.json em scripts/backup/
// - Chama gerarMassaSintetica com clientes/fornecedores/contas atuais
// - Escreve novos lançamentos em src/data/lancamentosImportados.json
// - Escreve orçamento em src/data/orcamentoItensGerados.json (novo arquivo)
// - NÃO altera demoData.js nem contasBancariasBase nesta etapa (será 1B)
//
// Reversível: restaurar backup = copia scripts/backup/<timestamp>/*.json de volta.
//
// Rodar: node scripts/regenerar-1a.mjs

import { writeFileSync, mkdirSync, copyFileSync, existsSync } from "fs";
import { gerarMassaSintetica } from "../src/data/demoDataGenerator.js";
import { demoClientes, demoFornecedores, demoContasBancarias } from "../src/data/demoData.js";

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const BACKUP_DIR = `scripts/backup/1a-${TIMESTAMP}`;

console.log(`\n=== Etapa 1A — regenerar massa sintética ===`);
console.log(`Timestamp: ${TIMESTAMP}`);

// 1. Backup
mkdirSync(BACKUP_DIR, { recursive: true });
const LANC_ORIG = "src/data/lancamentosImportados.json";
if (existsSync(LANC_ORIG)) {
  copyFileSync(LANC_ORIG, `${BACKUP_DIR}/lancamentosImportados.json`);
  console.log(`✓ Backup: ${BACKUP_DIR}/lancamentosImportados.json`);
}

// 2. Gerar
console.log(`\nGerando massa sintética (gerarMassaSintetica existente)...`);
const clientesIds = demoClientes.map((c) => c.id);
const fornecedoresIds = demoFornecedores.map((f) => f.id);
const resultado = gerarMassaSintetica({
  clientesIds,
  fornecedoresIds,
  contasBancariasBase: demoContasBancarias,
});

console.log(`✓ Lançamentos gerados: ${resultado.lancamentos.length}`);
console.log(`✓ Itens de orçamento gerados: ${resultado.orcamentoItens.length}`);
console.log(`✓ Contas bancárias (saldos calibrados): ${resultado.contasBancarias.length}`);

// 3. Escrever novo lancamentosImportados.json
writeFileSync(LANC_ORIG, JSON.stringify(resultado.lancamentos, null, 2), "utf8");
console.log(`\n✓ Escrito: ${LANC_ORIG} (${resultado.lancamentos.length} lançamentos)`);

// 4. Escrever orcamentoItensGerados.json (novo arquivo — demoData.js precisará importar)
const ORC_FILE = "src/data/orcamentoItensGerados.json";
writeFileSync(ORC_FILE, JSON.stringify(resultado.orcamentoItens, null, 2), "utf8");
console.log(`✓ Escrito: ${ORC_FILE} (${resultado.orcamentoItens.length} itens)`);

// 5. Sugestão de saldos (não aplicada nesta etapa — 1B faz)
console.log(`\n=== SUGESTÃO de saldos calibrados (aplicar em 1B) ===`);
resultado.contasBancarias.forEach((c) => {
  const atual = demoContasBancarias.find((x) => x.id === c.id)?.saldoInicial ?? 0;
  if (atual !== c.saldoInicial) {
    console.log(`  ${c.id} (${c.empresaId}): atual=${atual} → sugerido=${c.saldoInicial}`);
  }
});

// 6. Instruções pós-execução
console.log(`\n=== PRÓXIMOS PASSOS ===`);
console.log(`1. Rodar: node scripts/verificar-massa-sintetica.mjs`);
console.log(`2. Conferir se as faixas de alvo batem`);
console.log(`3. Para reverter: cp ${BACKUP_DIR}/lancamentosImportados.json ${LANC_ORIG}`);
console.log(`\nATENÇÃO: Orçamento gerado em ${ORC_FILE} ainda NÃO é lido pelo app.`);
console.log(`demoData.js linha 277 continua "export const demoOrcamentoItens = [];"`);
console.log(`Isso será corrigido na Etapa 1B (alteração manual no demoData.js).\n`);
