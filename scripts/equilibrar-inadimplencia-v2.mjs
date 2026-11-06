// Segue a regra do Grupo 3 (comando restaurar-e-prevenir): carrega o
// estado ATUAL do arquivo (não uma cópia antiga, não regenera do zero) e
// aplica mudanças em cima dele.
//
// Versão corrigida do comando "equilibrar-inadimplencia" (b40012d) — a v1
// (scripts/_equilibrar_inadimplencia.mjs, já deletado) tinha um efeito
// colateral não previsto: reclassificava TODO o restante do pool de
// Realizado como Antecipado com offset fresco a partir do dataVencimento,
// sem nenhuma noção de "em qual dia do calendário isso cai" — isso
// embaralhou a distribuição por dia dentro da janela de 30 dias da
// "Composição do Recebimento" (fez o dia 10 sumir, criou recebimento
// fantasma em 11/08 "hoje", quebrando o invariante de defasagem bancária)
// e a amostra de títulos usada pra subir a inadimplência de e2 pegou
// candidatos com dataVencimento = hoje, zerando parte do "Previsto p/
// hoje".
//
// Fix: mesmo objetivo (Em dia 65-70% / Atrasado 10-15% / Antecipado resto,
// Inadimplência 3,0-4,0%), mas:
// 1) só reclassifica dataPagamento de títulos Realizados cujo
//    dataPagamento ATUAL já está FORA da janela de 30 dias mostrada em
//    "Composição do Recebimento" — a janela visível nunca é tocada (nem
//    os 3 lançamentos "Gerado —", que já ficam de fora por estarem
//    dentro da janela).
// 2) nunca deixa o resultado (dataPagamento novo) cair dentro da janela.
// 3) na amostra de inadimplência, exclui explicitamente qualquer título
//    com dataVencimento = hoje (protege "Previsto p/ hoje").
import fs from "node:fs";

const REAL_PATH = new URL("../src/data/lancamentosImportados.json", import.meta.url);
const data = JSON.parse(fs.readFileSync(REAL_PATH, "utf8"));
// "hoje" É SEMPRE a data real do sistema no momento em que o script roda —
// nunca um valor congelado. O app inteiro (getDataAtualSistema) já segue
// esse princípio; um "hoje" fixo aqui ficaria desalinhado da primeira vez
// que alguém rodasse o script num dia diferente (foi exatamente essa
// dessincronia de relógio, seed real avançando durante a sessão, que
// motivou parte da investigação desta rodada — ver relatório).
function addDaysISO(iso, n) { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
const hoje = new Date().toISOString().slice(0, 10);
const JANELA_INICIO = addDaysISO(hoje, -29); // mesma janela de 30d da Composição do Recebimento

let seed = 20260812;
function rand() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function randInt(min, max) { return min + Math.floor(rand() * (max - min + 1)); }
function diffDays(a, b) { return Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 86400000); }
function dentroDaJanela(iso) { return iso >= JANELA_INICIO && iso <= hoje; }
function protegido(l) { return l.observacao && l.observacao.startsWith("Gerado — "); }

// ---- 1) Composição do Realizado AR, só usando títulos já fora da janela ----
const composicaoCfg = [
  { empresaId: "e1", emDiaPct: 0.66, atrasadoPct: 0.13 },
  { empresaId: "e2", emDiaPct: 0.69, atrasadoPct: 0.11 },
];

for (const cfg of composicaoCfg) {
  const todos = data.filter((l) => l.empresaId === cfg.empresaId && l.tipo === "Entrada" && !l.transferencia && l.situacao === "Realizado" && !protegido(l));
  const total = todos.reduce((s, l) => s + l.valor, 0);
  const targetEmDia = total * cfg.emDiaPct;
  const targetAtrasado = total * cfg.atrasadoPct;

  // Só entram no pool reclassificável títulos cujo dataPagamento JÁ está
  // fora da janela — preserva 100% a forma diária já validada visualmente.
  const foraDaJanela = todos.filter((l) => !dentroDaJanela(l.dataPagamento));
  const dentroDaJanelaAtual = todos.filter((l) => dentroDaJanela(l.dataPagamento));

  function classificar(l) {
    const dias = diffDays(l.dataVencimento, l.dataPagamento);
    if (dias > 0) return "Atrasado";
    if (dias < 0) return "Antecipado";
    return "Em dia";
  }
  let emDiaAcum = 0, atrasadoAcum = 0;
  dentroDaJanelaAtual.forEach((l) => {
    const c = classificar(l);
    if (c === "Em dia") emDiaAcum += l.valor;
    else if (c === "Atrasado") atrasadoAcum += l.valor;
  });

  const shuffled = [...foraDaJanela];
  for (let i = shuffled.length - 1; i > 0; i--) { const j = randInt(0, i); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }

  const marcados = new Set();
  for (const l of shuffled) {
    if (emDiaAcum >= targetEmDia) break;
    const novo = l.dataVencimento; // Em dia
    if (dentroDaJanela(novo)) continue; // nunca reintroduz na janela
    l.dataPagamento = novo;
    emDiaAcum += l.valor;
    marcados.add(l);
  }
  for (const l of shuffled) {
    if (marcados.has(l)) continue;
    if (atrasadoAcum >= targetAtrasado) break;
    let diasAtraso = randInt(1, 25);
    if (diffDays(l.dataVencimento, hoje) < diasAtraso) diasAtraso = Math.max(1, diffDays(l.dataVencimento, hoje));
    const novo = addDaysISO(l.dataVencimento, diasAtraso);
    if (dentroDaJanela(novo) || novo > hoje) continue;
    l.dataPagamento = novo;
    atrasadoAcum += l.valor;
    marcados.add(l);
  }
  for (const l of shuffled) {
    if (marcados.has(l)) continue;
    let diasAntecip = randInt(1, 15);
    let novo = addDaysISO(l.dataVencimento, -diasAntecip);
    // se cair dentro da janela, empurra mais pra trás até sair
    let tentativas = 0;
    while (dentroDaJanela(novo) && tentativas < 10) { diasAntecip += 5; novo = addDaysISO(l.dataVencimento, -diasAntecip); tentativas++; }
    if (dentroDaJanela(novo)) continue; // desiste, deixa como está (raro)
    l.dataPagamento = novo;
    marcados.add(l);
  }
}

// ---- 2) Inadimplência por empresa — nunca mexe em título com vencimento = hoje ----
function situacaoEfetivaLocal(l) { return diffDays(l.dataVencimento, hoje) > 0 ? "Vencido" : l.situacao; }

{
  const abertos = data.filter((l) => l.empresaId === "e1" && l.tipo === "Entrada" && !l.transferencia && l.situacao !== "Realizado" && l.situacao !== "Cancelado" && !protegido(l));
  const totalAberto = abertos.reduce((s, l) => s + l.valor, 0);
  const vencidos = abertos.filter((l) => situacaoEfetivaLocal(l) === "Vencido" && l.dataVencimento !== hoje);
  const totalVencidoAtual = abertos.filter((l) => situacaoEfetivaLocal(l) === "Vencido").reduce((s, l) => s + l.valor, 0);
  const targetVencido = totalAberto * 0.035;
  const reduzirEm = totalVencidoAtual - targetVencido;

  const shuffled = [...vencidos];
  for (let i = shuffled.length - 1; i > 0; i--) { const j = randInt(0, i); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  let reduzidoAcum = 0;
  for (const l of shuffled) {
    if (reduzidoAcum >= reduzirEm) break;
    const diasFuturo = randInt(3, 25);
    const novo = addDaysISO(hoje, diasFuturo);
    if (novo === hoje) continue;
    l.dataVencimento = novo;
    reduzidoAcum += l.valor;
  }
}

{
  const abertos = data.filter((l) => l.empresaId === "e2" && l.tipo === "Entrada" && !l.transferencia && l.situacao !== "Realizado" && l.situacao !== "Cancelado" && !protegido(l));
  const totalAberto = abertos.reduce((s, l) => s + l.valor, 0);
  const totalVencidoAtual = abertos.filter((l) => situacaoEfetivaLocal(l) === "Vencido").reduce((s, l) => s + l.valor, 0);
  // candidatos: NÃO vencidos e com vencimento != hoje (protege Previsto p/ hoje)
  const naoVencidos = abertos.filter((l) => situacaoEfetivaLocal(l) !== "Vencido" && l.dataVencimento !== hoje).sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
  const targetVencido = totalAberto * 0.035;
  const aumentarEm = targetVencido - totalVencidoAtual;

  let aumentadoAcum = 0;
  for (const l of naoVencidos.slice(0, 80)) {
    if (aumentadoAcum >= aumentarEm) break;
    const diasPassado = randInt(3, 20);
    const novo = addDaysISO(hoje, -diasPassado);
    if (novo === hoje) continue;
    l.dataVencimento = novo;
    aumentadoAcum += l.valor;
  }
}

fs.writeFileSync(REAL_PATH, JSON.stringify(data));
console.log("Recalibração v2 aplicada (janela de 30 dias e Previsto-hoje protegidos).");
