// Teste de regressão — sweep automático de caixa x virada de dia.
//
// Nasceu do comando "investigar-duplicidade-sweep": durante o
// desenvolvimento do sweep-automatico-b (commit 19f87a3), uma versão
// intermediária e NUNCA commitada tinha um bug real onde a regeneração
// automática de base demo obsoleta (dispara quando "hoje" muda desde a
// última carga) apagava entidades.sweepLog inteiro e os lançamentos
// SWEEP-* do dia anterior — o sweep então recalculava do zero contra o
// dataset "virgem" e logava um resultado idêntico ao do dia anterior sob
// a nova data, parecendo (visualmente) uma execução duplicada. Corrigido
// antes do commit; este teste garante que não volta.
//
// Cobre especificamente:
// 1. Múltiplos reloads no MESMO dia nunca duplicam a linha do log.
// 2. Múltiplos reloads bem NA VIRADA de dia (a janela de risco de race
//    condition entre a regeneração de demo e o guard "já rodei hoje?")
//    sempre convergem pro mesmo estado final: 2 linhas, sem duplicidade,
//    sem perda do dia anterior.
//
// Pré-requisito: dev server rodando em localhost:5183 com
// VITE_APP_PASSWORD=cfo-teste-2026 (`npm run dev -- --port 5183 --host`).
// Rodar: node test/sweep-dia-rollover.mjs
// Rodar de novo sempre que mexer em useAppData.js (gatilho do sweep OU a
// lógica de regeneração de demo obsoleta) ou em financial-engine/sweepCaixa.js.
import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
const page = await context.newPage();

async function irGovernanca() {
  await page.locator("text=Dados").last().click().catch(() => {});
  await page.waitForTimeout(200);
  await page.locator("text=Governança").first().click();
  await page.waitForTimeout(700);
}
async function contarLinhasLog() {
  return page.locator("table tbody tr").count().catch(() => 0);
}

const dia1 = new Date();
dia1.setHours(9, 0, 0, 0);
await context.clock.install({ time: dia1 });

await page.goto("http://localhost:5183/");
await page.waitForTimeout(500);
const pwInput = page.locator('input[type="password"]');
if (await pwInput.count() > 0) {
  await pwInput.fill("cfo-teste-2026");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
}
await page.waitForSelector("text=Controle de Caixa", { timeout: 15000 });
await irGovernanca();
await page.locator("button:has-text('Carregar Dados Demonstrativos')").click();
await page.waitForTimeout(1500);

assert.equal(await contarLinhasLog(), 1, "esperava exatamente 1 linha no log logo após carregar a demo (dia 1)");

for (let i = 1; i <= 3; i++) {
  await page.reload();
  await page.waitForTimeout(1200);
  await irGovernanca();
  assert.equal(await contarLinhasLog(), 1, `reload #${i} no dia 1 duplicou a linha do log`);
}

const dia2 = new Date(dia1.getTime());
dia2.setDate(dia2.getDate() + 1);
await context.clock.setSystemTime(dia2);

for (let i = 1; i <= 5; i++) {
  await page.reload();
  await page.waitForTimeout(900);
  await irGovernanca();
  assert.equal(await contarLinhasLog(), 2, `reload #${i} bem na virada pro dia 2 não convergiu pra 2 linhas (achado real que este teste existe pra pegar)`);
}

console.log("OK — sweep sobrevive a reload repetido no mesmo dia e na virada de dia, sem duplicidade nem perda de histórico.");
await browser.close();
