#!/usr/bin/env node
/**
 * Curadoria do Plano de Contas — comando "revisar plano de contas, DFC e DRE".
 *
 * HÁBITO DE VERIFICAÇÃO (regra permanente do CLAUDE.md): este script LÊ o
 * estado atual de src/data/demoData.js e aplica a mudança em cima dele.
 * Nunca regenera do zero, nunca parte de cópia antiga. Rode
 * `node scripts/verificar-massa-sintetica.mjs` antes e depois e compare.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POLÍTICA CONTÁBIL ADOTADA (curadoria, 13/11/2026)
 *
 * O CPC 03 (R2) permite classificar juros e rendimentos tanto em Operacional
 * quanto em Financiamento/Investimento, desde que consistente. A base estava
 * nos dois ao mesmo tempo: Receitas Financeiras em Financiamento numa conta
 * e em Operacional/Entradas em outra, com a MESMA classificação de DRE.
 *
 * Critério escolhido: cada fluxo financeiro fica junto da atividade que o
 * gerou, e o Operacional fica livre de decisão de financiamento — senão o
 * FCO melhora só por se tomar um empréstimo bem aplicado, e deixa de ser
 * comparável ao EBITDA.
 *
 *   - Juros pagos            → Financiamento  (custo do funding, junto de Captações)
 *   - Rendimento de aplicação → Investimento  (retorno do caixa aplicado,
 *                                              junto do principal em 5.06)
 *   - Tarifas bancárias      → Operacional    (custo de OPERAR a empresa:
 *                                              manutenção de conta, TED, boleto.
 *                                              Não é custo de se financiar.)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * O QUE SAI, E POR QUÊ
 *
 * As 30 analíticas sem movimento não são "dado faltando": parte delas não
 * deveria existir. Removidas só as que duplicam outra conta ou não são
 * natureza de despesa. Todas verificadas antes: zero lançamento, zero item
 * de orçamento, zero conta filha.
 *
 * Ficam no plano, mesmo sem movimento, as naturezas legítimas e distintas
 * (13º, Férias, INSS, IRRF, Condomínio, Jurídico, Veículos, Captações,
 * Recuperação de Créditos, impostos detalhados). Essas precisam de
 * CALIBRAÇÃO da massa, não de poda — é outro comando.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const arquivo = join(raiz, "src/data/demoData.js");

// Duplicata ou não-natureza → sai do plano.
const REMOVER = [
  ["pc1.01.03", "Vendas duplica 1.01.01 Venda de Produtos (R$ 4,47M de movimento)"],
  ["pc1.01.04", "Serviços Prestados duplica 1.01.02 Prestação de Serviços (R$ 1,05M)"],
  ["pc2.01.04", "Compra de Matéria-Prima duplica 2.01.01 Matéria-Prima (R$ 505k)"],
  ["pc2.01.05", "Pagamento a Fornecedores é forma de liquidação, não natureza de despesa"],
  ["pc3.02.07", "Suporte em TI e Softwares sobrepõe 3.02.03 Sistemas (que tem movimento)"],
  ["pc3.03.03", "Comissões Externas é detalhe de 3.03.02 Comissões sobre Vendas"],
  ["pc3.03.04", "Comissões Internas idem, e ainda estava em subgrupo DFC Pessoal"],
  ["pc4.04", "Aplicações Financeiras duplica 5.06 e tinha DRE=Receitas Financeiras — aplicar caixa não é receita"],
  ["pc5.04", "Aquisição de Imobilizado é genérica: máquinas, tecnologia e veículos já são imobilizado"],
];

// Reclassificações: [id, campo, valorNovo, motivo]
const RECLASSIFICAR = [
  ["pc4.01", "classificacaoDFC", "Investimento", "rendimento de aplicação é retorno do caixa aplicado, não funding"],
  ["pc4.01", "subgrupoDFC", "Aplicações e Resgates", "fica junto do principal (5.06), tornando a atividade legível"],
  ["pc4.03", "classificacaoDFC", "Operacional", "tarifa bancária é custo de operar, não de se financiar"],
  ["pc4.03", "subgrupoDFC", "Despesas Bancárias", "subgrupo próprio: em Outros Operacionais não informa nada"],
  ["pc3.03.02", "subgrupoDFC", "Comissões", "estava em Outros Operacionais, que virou lixeira de 6 contas"],
  ["pc3.03.05", "subgrupoDFC", "Viagens", "idem"],
  ["pc3.02.03", "descricao", "Sistemas e Suporte em TI", "absorve o escopo de 3.02.07, removida"],
];

let texto = readFileSync(arquivo, "utf8");
const antes = texto;

console.log("=== REMOÇÕES ===");
for (const [id, motivo] of REMOVER) {
  // Casa a linha inteira do objeto daquela conta, pelo id exato.
  const re = new RegExp(`^\\s*\\{ id: "${id.replace(/\./g, "\\.")}",.*\\},?\\n`, "m");
  const m = texto.match(re);
  if (!m) { console.log(`  ✗ ${id} NÃO ENCONTRADA — abortando`); process.exit(1); }
  texto = texto.replace(re, "");
  console.log(`  ✓ ${id} — ${motivo}`);
}

console.log("\n=== RECLASSIFICAÇÕES ===");
for (const [id, campo, valor, motivo] of RECLASSIFICAR) {
  const reLinha = new RegExp(`(^\\s*\\{ id: "${id.replace(/\./g, "\\.")}",.*$)`, "m");
  const linha = texto.match(reLinha);
  if (!linha) { console.log(`  ✗ ${id} NÃO ENCONTRADA — abortando`); process.exit(1); }
  const reCampo = new RegExp(`(${campo}: )"[^"]*"`);
  if (!reCampo.test(linha[1])) { console.log(`  ✗ ${id}.${campo} ausente — abortando`); process.exit(1); }
  const nova = linha[1].replace(reCampo, `$1"${valor}"`);
  texto = texto.replace(linha[1], nova);
  console.log(`  ✓ ${id}.${campo} → "${valor}" — ${motivo}`);
}

if (texto === antes) { console.log("\nNada mudou."); process.exit(1); }
writeFileSync(arquivo, texto);
console.log("\ndemoData.js gravado.");
