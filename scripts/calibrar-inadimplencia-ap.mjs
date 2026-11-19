/**
 * calibrar-inadimplencia-ap.mjs
 *
 * Lê o estado ATUAL do arquivo (nunca regenera do zero).
 * Aplica duas correções:
 *   1. Inadimplência AR: reduz de ~24% para faixa 3-4% (meta: ~3,5%)
 *      - Move dataVencimento dos títulos AR vencidos excedentes para datas futuras
 *      - Preserva lançamentos com observacao "Gerado —" e os do cenário de aperto
 *   2. AP vencido: move dataVencimento de todos os títulos AP em aberto/previsto
 *      vencidos para datas futuras (mantém os lançamentos, zera o "atraso")
 *
 * Hábito obrigatório (CLAUDE.md):
 *   - Roda verificar-massa-sintetica.mjs ANTES (baseline) → aplica → roda DEPOIS → compara
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARQUIVO = path.join(__dirname, '../src/data/lancamentosImportados.json');
const HOJE = '2026-11-19';

// --- helpers ---
function diasAteVencer(dv) {
  return Math.ceil((new Date(dv) - new Date(HOJE)) / 86400000);
}
function somarDias(data, dias) {
  const d = new Date(data);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

// --- carrega arquivo atual ---
const raw = fs.readFileSync(ARQUIVO, 'utf8');
const lancamentos = JSON.parse(raw);
console.log(`Lançamentos carregados: ${lancamentos.length}`);

// --- identifica subconjuntos ---
const arAberto = lancamentos.filter(l =>
  l.tipo === 'Entrada' &&
  (l.situacao === 'Em aberto' || l.situacao === 'Previsto') &&
  !l.dataPagamento
);
const arVencido = arAberto.filter(l => l.dataVencimento < HOJE);
const totalAR = arAberto.reduce((s, l) => s + l.valor, 0);
const totalARVencido = arVencido.reduce((s, l) => s + l.valor, 0);
const inadAtual = totalAR > 0 ? (totalARVencido / totalAR * 100).toFixed(1) : '0';

console.log(`\n=== ANTES ===`);
console.log(`AR em aberto: R$ ${totalAR.toFixed(0)} (${arAberto.length} títulos)`);
console.log(`AR vencido: R$ ${totalARVencido.toFixed(0)} (${arVencido.length} títulos) → ${inadAtual}%`);

const apAberto = lancamentos.filter(l =>
  l.tipo === 'Saída' &&
  (l.situacao === 'Em aberto' || l.situacao === 'Previsto') &&
  !l.dataPagamento
);
const apVencido = apAberto.filter(l => l.dataVencimento < HOJE);
console.log(`AP vencido: R$ ${apVencido.reduce((s,l)=>s+l.valor,0).toFixed(0)} (${apVencido.length} títulos)`);

// --- meta inadimplência: 3,5% do AR em aberto total ---
const META_INAD = 0.035;
const metaValorInad = totalAR * META_INAD;
console.log(`\nMeta inadimplência: 3,5% → R$ ${metaValorInad.toFixed(0)}`);

// --- seleciona quais AR vencidos FICAM como inadimplentes ---
// Protege: observacao com "Gerado —"
// Ordena por valor desc e mantém até bater a meta
const protegidos = arVencido.filter(l => l.observacao?.includes('Gerado —'));
const candidatos = arVencido.filter(l => !l.observacao?.includes('Gerado —'))
  .sort((a, b) => b.valor - a.valor); // maiores primeiro para manter poucos

let acumuladoInad = protegidos.reduce((s, l) => s + l.valor, 0);
const idsManterInad = new Set(protegidos.map(l => l.id));

for (const l of candidatos) {
  if (acumuladoInad + l.valor <= metaValorInad) {
    acumuladoInad += l.valor;
    idsManterInad.add(l.id);
  }
}
// Garante pelo menos 1 se protegidos insuficientes
if (idsManterInad.size === 0 && candidatos.length > 0) {
  idsManterInad.add(candidatos[0].id);
  acumuladoInad += candidatos[0].valor;
}

const arMoverParaFuturo = arVencido.filter(l => !idsManterInad.has(l.id));
console.log(`AR a mover para futuro: ${arMoverParaFuturo.length} títulos`);
console.log(`AR que ficam vencidos (inadimplentes): ${idsManterInad.size} títulos / R$ ${acumuladoInad.toFixed(0)}`);
console.log(`Inadimplência resultante: ${(acumuladoInad/totalAR*100).toFixed(1)}%`);

// --- aplica as mudanças ---
let contAR = 0, contAP = 0;

const novoLancamentos = lancamentos.map(l => {
  // AR: mover vencidos excedentes para futuro (escalonado +10 a +60 dias)
  if (arMoverParaFuturo.some(x => x.id === l.id)) {
    const novaData = somarDias(HOJE, 10 + (contAR % 50));
    contAR++;
    return { ...l, dataVencimento: novaData };
  }

  // AP: mover todos os vencidos para futuro (escalonado +5 a +45 dias)
  if (apVencido.some(x => x.id === l.id)) {
    const novaData = somarDias(HOJE, 5 + (contAP % 40));
    contAP++;
    return { ...l, dataVencimento: novaData };
  }

  return l;
});

// --- verifica resultado antes de salvar ---
const arAbertoNew = novoLancamentos.filter(l =>
  l.tipo === 'Entrada' &&
  (l.situacao === 'Em aberto' || l.situacao === 'Previsto') &&
  !l.dataPagamento
);
const arVencidoNew = arAbertoNew.filter(l => l.dataVencimento < HOJE);
const totalARNew = arAbertoNew.reduce((s, l) => s + l.valor, 0);
const totalARVencidoNew = arVencidoNew.reduce((s, l) => s + l.valor, 0);
const inadNova = totalARNew > 0 ? (totalARVencidoNew / totalARNew * 100).toFixed(1) : '0';

const apAbertoNew = novoLancamentos.filter(l =>
  l.tipo === 'Saída' &&
  (l.situacao === 'Em aberto' || l.situacao === 'Previsto') &&
  !l.dataPagamento
);
const apVencidoNew = apAbertoNew.filter(l => l.dataVencimento < HOJE);

console.log(`\n=== DEPOIS ===`);
console.log(`AR vencido: R$ ${totalARVencidoNew.toFixed(0)} (${arVencidoNew.length} títulos) → ${inadNova}%`);
console.log(`AP vencido: R$ ${apVencidoNew.reduce((s,l)=>s+l.valor,0).toFixed(0)} (${apVencidoNew.length} títulos)`);

if (parseFloat(inadNova) < 2.5 || parseFloat(inadNova) > 4.5) {
  console.error(`\n⚠️ Inadimplência fora da faixa alvo (2,5–4,5%): ${inadNova}% — NÃO salvando.`);
  process.exit(1);
}

// --- salva ---
fs.writeFileSync(ARQUIVO, JSON.stringify(novoLancamentos, null, 2));
console.log(`\n✅ Salvo. AR movidos: ${contAR} | AP movidos: ${contAP}`);
console.log(`Inadimplência final: ${inadNova}% ✓`);
console.log(`AP vencido final: ${apVencidoNew.length} títulos ✓`);
