// Comando "restaurar-e-prevenir", Grupo 2 — varredura de caixa (sweep) pra
// Aplicação. Segue o padrão de calibração desta sessão: carrega o estado
// ATUAL do arquivo (não uma cópia antiga, não regenera do zero) e usa os
// MESMOS cálculos reais do financial-engine (calcularSaldoConta), nunca
// uma versão paralela — mesmo princípio de verificar-massa-sintetica.mjs.
//
// DECISÃO DE IMPLEMENTAÇÃO (runtime vs on-demand): o comando ofereceu as
// duas opções. Escolhido ON-DEMAND (rodar sob demanda, não automático no
// carregamento do app) porque:
// - Introduzir uma mutação de dado AUTOMÁTICA e SILENCIOSA a cada load do
//   app é uma mudança de comportamento de risco maior — especialmente
//   nesta mesma rodada em que um script de calibração anterior
//   (_equilibrar_inadimplencia.mjs, b40012d) já causou uma regressão real
//   por efeito colateral não previsto (ver relatório desta rodada). Não
//   faz sentido empilhar uma automação nova em runtime bem no momento em
//   que estamos reforçando justamente o cuidado com scripts de
//   calibração.
// - Rodar sob demanda permite validar a lógica do sweep (e sua interação
//   com o cenário de aperto, os lançamentos "Gerado —", etc.) em uma ou
//   duas rodadas manuais antes de promover pra automação de verdade no
//   runtime — decisão de uma rodada futura, não desta. O caminho
//   "runtime" fica pronto pra ser implementado depois reaproveitando
//   exatamente a mesma lógica de cálculo daqui.
//
// Regra de negócio: qualquer saldo em conta líquida ACIMA de
// parametros.caixaMinimo (reaproveitado — já existe em Governança como
// "Caixa Mínimo Operacional", default R$10.000, ver appConfig.js) é
// varrido pra Aplicação. O alvo é o TOTAL líquido consolidado (todas as
// empresas), pois é isso que caixaMinimo já representa em todo o resto do
// app (alertas de caixa, linha de referência do Fluxo de Caixa) — mas
// cada transferência respeita fronteira de empresa (não existe
// transferência entre empresas diferentes neste schema), então o
// excedente é varrido conta por conta, das contas líquidas com maior
// saldo primeiro, até a agregação bater no mínimo.
//
// "Conta principal" de Aplicação por empresa: a de MENOR id numérico
// cadastrada pra aquela empresa (cb3 pra e1, cb8 pra e2) — regra simples e
// determinística, documentada aqui pra não precisar decidir de novo a
// cada rodada.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { demoLancamentos, demoContasBancarias } from "../src/data/demoData.js";
import { calcularSaldoConta } from "../src/financial-engine/tesouraria.js";
import { DEFAULT_PARAMETROS } from "../src/config/appConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "../src/data/lancamentosImportados.json");

const hoje = new Date().toISOString().slice(0, 10);
const CAIXA_MINIMO = DEFAULT_PARAMETROS.caixaMinimo;

const contasLiquidas = demoContasBancarias.filter((c) => c.ativo && c.semLiquidez !== "true");
const saldosLiquidos = contasLiquidas
  .map((conta) => ({ conta, saldo: calcularSaldoConta(conta, demoLancamentos, hoje) }))
  .sort((a, b) => b.saldo - a.saldo);

const totalLiquido = saldosLiquidos.reduce((s, x) => s + x.saldo, 0);
const excedenteTotal = totalLiquido - CAIXA_MINIMO;

console.log(`Data de referência (hoje): ${hoje}`);
console.log(`Total líquido atual: R$ ${totalLiquido.toFixed(2)} | Mínimo operacional: R$ ${CAIXA_MINIMO.toFixed(2)}`);

if (excedenteTotal <= 0) {
  console.log("Nada a varrer — total líquido já está no mínimo operacional ou abaixo.");
  process.exit(0);
}
console.log(`Excedente a varrer: R$ ${excedenteTotal.toFixed(2)}\n`);

const contasAplicacao = demoContasBancarias.filter((c) => c.ativo && c.semLiquidez === "true");
function contaPrincipalAplicacao(empresaId) {
  const doEmpresa = contasAplicacao.filter((c) => c.empresaId === empresaId).sort((a, b) => Number(a.id.slice(2)) - Number(b.id.slice(2)));
  return doEmpresa[0];
}

let restante = excedenteTotal;
const novosLancamentos = [];
let seed = Date.now() % 1000000007;
function nextId() { seed = (seed * 48271) % 2147483647; return "sweep" + seed.toString(36); }

for (const { conta, saldo } of saldosLiquidos) {
  if (restante <= 0) break;
  if (saldo <= 0) continue;
  const varrer = Math.min(saldo, restante);
  const destino = contaPrincipalAplicacao(conta.empresaId);
  if (!destino) {
    console.log(`AVISO: ${conta.apelido} (${conta.id}, empresa ${conta.empresaId}) tem excedente mas a empresa não tem conta de Aplicação cadastrada — pulado.`);
    continue;
  }
  const grupoId = nextId();
  const base = {
    empresaId: conta.empresaId, unidadeId: null, centroCustoId: null, projetoId: null,
    tipoParceiro: null, clienteFornecedorId: null, bancoId: null,
    dataEmissao: hoje, competencia: hoje.slice(0, 7), dataVencimento: hoje, dataPagamento: hoje,
    situacao: "Realizado", valor: Number(varrer.toFixed(2)), transferencia: true, transferenciaGrupoId: grupoId,
  };
  novosLancamentos.push({
    ...base, contaBancariaId: conta.id, tipo: "Saída", documento: `SWEEP-${hoje.replace(/-/g, "")}-${conta.id}-SAI`,
    contaGerencialId: "pc5.06", observacao: "Gerado — varredura automática de caixa acima do mínimo operacional (sweep diário)",
    id: nextId(),
  });
  novosLancamentos.push({
    ...base, contaBancariaId: destino.id, tipo: "Entrada", documento: `SWEEP-${hoje.replace(/-/g, "")}-${conta.id}-ENT`,
    contaGerencialId: null, observacao: "Gerado — varredura automática de caixa acima do mínimo operacional (sweep diário)",
    id: nextId(),
  });
  console.log(`${conta.apelido} (${conta.id}) → ${destino.apelido} (${destino.id}): R$ ${varrer.toFixed(2)}`);
  restante -= varrer;
}

if (restante > 0.01) {
  console.log(`\nAVISO: sobrou R$ ${restante.toFixed(2)} de excedente sem conta líquida com saldo suficiente pra varrer — confira manualmente.`);
}

const lancamentosAtuais = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const dataAtualizado = [...lancamentosAtuais, ...novosLancamentos];
fs.writeFileSync(DATA_PATH, JSON.stringify(dataAtualizado));
console.log(`\n${novosLancamentos.length / 2} transferência(s) de sweep adicionada(s). Total lançamentos agora: ${dataAtualizado.length}`);
