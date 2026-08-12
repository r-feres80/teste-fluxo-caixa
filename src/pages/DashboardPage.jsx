import React, { useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, BarChart, Bar, Cell, LabelList } from "recharts";
import { AlertTriangle, Info } from "lucide-react";
import { Panel, Badge, BasisHint, Gauge, InfoNote } from "../components/ui/Primitives.jsx";
import { fmtBRL, fmtBRLShort, fmtData } from "../utils/formatUtils.js";
import { construirResumoExecutivo } from "../financial-engine/resumoExecutivo.js";
import { calcularDRE } from "../financial-engine/dre.js";
import { excluirTransferencias } from "../financial-engine/lancamentos.js";
import { classificarInadimplencia } from "../utils/moduleHealth.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { getDataAtualSistema, parseISO, mesesDoPeriodo } from "../utils/dateUtils.js";
import { MESES } from "../config/appConfig.js";

const COR_WATERFALL = { total: "#475569", positivo: "#10b981", negativo: "#f43f5e" };

// Transforma o DFC do mês (Caixa Inicial + FCO + FCI + FCF = Caixa Final) em
// dados de waterfall: cada barra intermediária "flutua" a partir do saldo
// acumulado até então (base invisível + delta visível); as barras de total
// (Caixa Inicial/Final) partem sempre de zero.
function construirWaterfall(dfc) {
  const passos = [
    { label: "Caixa Inicial", valor: dfc.caixaInicial, total: true },
    { label: "Operacional", valor: dfc.Operacional },
    { label: "Investimentos", valor: dfc.Investimento },
    { label: "Financiamentos", valor: dfc.Financiamento },
    { label: "Caixa Final", valor: dfc.caixaFinal, total: true },
  ];
  let acumulado = 0;
  return passos.map((p) => {
    if (p.total) {
      acumulado = p.valor;
      return { label: p.label, base: 0, delta: Math.abs(p.valor), valorReal: p.valor, cor: "total" };
    }
    const antes = acumulado;
    acumulado += p.valor;
    return { label: p.label, base: Math.min(antes, acumulado), delta: Math.abs(p.valor), valorReal: p.valor, cor: p.valor >= 0 ? "positivo" : "negativo" };
  });
}

// Mesmos cortes de classificarInadimplencia (moduleHealth.js): <5% verde,
// 5-10% amber, >10% vermelho — reaproveitado aqui para colorir os cards de
// Contas a Receber/Pagar (aberto) pelo % de atraso da carteira, não pelo
// valor bruto (que não tem "bom"/"ruim" por si só).
function toneDeSaude(cor) {
  return cor === "red" ? "negative" : cor === "amber" ? "warning" : "positive";
}

function KpiCard({ label, value, sub, tone = "neutral", basis, tooltip }) {
  const cor = tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-rose-600" : tone === "warning" ? "text-amber-600" : "text-slate-900";
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex flex-col gap-1">
      <span className="text-[11px] text-slate-500 uppercase tracking-wide flex items-center gap-1">
        {label}<BasisHint basis={basis} />
        {tooltip && <Info size={11} className="text-slate-300 shrink-0 cursor-help" title={tooltip} />}
      </span>
      <span className={`font-mono tabular-nums text-xl font-semibold ${cor}`}>{value}</span>
      {sub && <span className="text-[11px] text-slate-400">{sub}</span>}
    </div>
  );
}

// Estes 3 tipos avisam sobre uma queda projetada de caixa — a mesma
// informação (em R$) já está nos cards "Caixa Disponível"/"Caixa Projetado
// 30 dias" acima; o alerta aqui vira uma linha de destaque que aponta pro
// card em vez de repetir o número.
const TEXTO_ALERTA = {
  liquidez: (a) => `Caixa projetado fica negativo em ${fmtData(a.data)} — ver "Caixa Projetado 30 dias" acima e a tela Fluxo de Caixa.`,
  caixa_abaixo_minimo: () => `Caixa consolidado abaixo do mínimo configurado em Governança — ver card "Caixa Disponível" acima.`,
  caixa_projetado_abaixo_minimo: (a) => `Caixa projetado cai abaixo do mínimo configurado em Governança, em ${fmtData(a.data)} — ver "Caixa Projetado 30 dias" acima.`,
  titulos_vencidos_receber: (a) => `Títulos vencidos a receber: ${fmtBRL(a.valor)} — ver tela Contas a Receber ou Inadimplência.`,
  titulos_vencidos_pagar: (a) => `Títulos vencidos a pagar: ${fmtBRL(a.valor)} — ver tela Contas a Pagar.`,
  pagamentos_proximos: (a) => `${a.qtd} pagamento(s) relevante(s) nos próximos ${a.dias} dias (${fmtBRL(a.valor)}) — ver "Régua de Próximos Pagamentos" em Contas a Pagar.`,
  recebimentos_atraso_relevantes: (a) => `${a.qtd} recebimento(s) relevante(s) próximos/atrasados (${fmtBRL(a.valor)}) — ver Contas a Receber.`,
  desvio_orcamentario: (a) => `Desvio orçamentário em ${a.nome}: ${fmtBRL(a.valor)}${a.pct != null ? ` (${a.pct.toFixed(0)}%)` : " (orçado muito baixo, % não comparável)"} — ver tela Orçado x Realizado.`,
  concentracao_cliente: (a) => `Concentração de cliente: ${a.pct.toFixed(0)}% da carteira em um único cliente — ver "Concentração por Cliente" em Contas a Receber.`,
  concentracao_fornecedor: (a) => `Concentração de fornecedor: ${a.pct.toFixed(0)}% da carteira em um único fornecedor — ver "Concentração por Fornecedor" em Contas a Pagar.`,
  sweep_executado: (a) => `Sweep executado: ${fmtBRL(a.valor)} → Aplicação (${fmtData(a.data)}) — ver "Transferências Internas" em Tesouraria.`,
};

// Dashboard consome exclusivamente o Resumo Executivo (financial-engine/resumoExecutivo.js) —
// a mesma fonte usada pelo Finance Copilot (IA). Isso garante que o número que o usuário vê
// na tela é sempre o mesmo que a IA usa para explicar causa-raiz; nenhum dos dois recalcula
// por conta própria.
export default function DashboardPage({ data }) {
  const { entidades, filtros, parametros } = data;
  const { t } = useLanguage();

  const resumo = useMemo(
    () => construirResumoExecutivo({ entidades, filtros, parametros }),
    [entidades, filtros, parametros]
  );

  const sparkData = resumo.caixa.serieDiaria30dias.map((p) => ({ data: p.data.slice(8, 10), saldo: p.saldo }));
  const waterfallData = useMemo(() => construirWaterfall(resumo.dfcMesAtual), [resumo.dfcMesAtual]);

  // Comparativo Mensal (Bloco 4, pendência 2): único trecho do Dashboard que
  // usa o filtro Mês/Ano — os cards de caixa/EBITDA YTD acima continuam
  // hoje-real (resumo, de resumoExecutivo.js, nunca lê filtros de período).
  // Calculado localmente com calcularDRE (mesma função do DRE Gerencial),
  // não duplica lógica nem toca resumoExecutivo.js.
  const mesRefIdx = mesesDoPeriodo(filtros).slice(-1)[0] ?? filtros.mesRef ?? parseISO(getDataAtualSistema()).getMonth();
  const anoRefComp = filtros.anoRef;
  const mesAnteriorAno = mesRefIdx === 0 ? anoRefComp - 1 : anoRefComp;
  const mesAnteriorIdx = mesRefIdx === 0 ? 11 : mesRefIdx - 1;
  const comparativoMensal = useMemo(() => {
    const lancsBase = excluirTransferencias(entidades.lancamentos).filter(
      (l) => l.situacao === "Realizado" && (filtros.empresaId === "TODAS" || l.empresaId === filtros.empresaId)
    );
    const doMes = (ano, mes) => lancsBase.filter((l) => {
      const [a, m] = l.competencia.split("-").map(Number);
      return a === ano && m - 1 === mes;
    });
    const atual = calcularDRE(doMes(anoRefComp, mesRefIdx), entidades.planoDeContas);
    const anterior = calcularDRE(doMes(mesAnteriorAno, mesAnteriorIdx), entidades.planoDeContas);
    const deltaPct = (a, b) => (b !== 0 ? ((a - b) / Math.abs(b)) * 100 : null);
    return {
      atual, anterior,
      deltaReceitaPct: deltaPct(atual.receitaBruta, anterior.receitaBruta),
      deltaEbitdaPct: deltaPct(atual.ebitda, anterior.ebitda),
    };
  }, [entidades.lancamentos, entidades.planoDeContas, filtros.empresaId, anoRefComp, mesRefIdx, mesAnteriorAno, mesAnteriorIdx]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("kpi.caixaDisponivel")} value={fmtBRL(resumo.caixa.disponivel)} tone={resumo.caixa.disponivel >= 0 ? "positive" : "negative"} sub={`Data-base: ${fmtData(resumo.dataReferencia)}`} basis="caixa" />
        <KpiCard label={t("kpi.contasReceberAberto")} value={fmtBRL(resumo.contasReceber.totalEmAberto)} tone={toneDeSaude(classificarInadimplencia(resumo.contasReceber.inadimplenciaPct))}
          sub={`Vencido: ${fmtBRL(resumo.contasReceber.totalVencido)} (${resumo.contasReceber.inadimplenciaPct.toFixed(1)}%)`} tooltip="Cor pelo % da carteira vencido: verde <5%, amarelo 5-10%, vermelho >10% — mesmo corte do velocímetro de Inadimplência abaixo." />
        <KpiCard label={t("kpi.contasPagarAberto")} value={fmtBRL(resumo.contasPagar.totalEmAberto)} tone={toneDeSaude(classificarInadimplencia(resumo.contasPagar.atrasoPct))}
          sub={`Vencido: ${fmtBRL(resumo.contasPagar.totalVencido)} (${resumo.contasPagar.atrasoPct.toFixed(1)}%)`} tooltip="Cor pelo % da carteira em atraso: verde <5%, amarelo 5-10%, vermelho >10%." />
        <KpiCard label={t("kpi.caixaProjetado30")} value={fmtBRL(resumo.caixa.projetado30dias)} tone={resumo.caixa.projetado30dias >= 0 ? "positive" : "negative"} sub={`Data-base: ${fmtData(resumo.dataReferencia)} + 30 dias`} basis="caixa"
          tooltip="Projeção de caixa: parte do Caixa Disponível de hoje e soma/subtrai os títulos já cadastrados (Previsto/Vencido) com vencimento nos próximos 30 dias — não é o saldo real desses dias, é uma estimativa com a carteira atual." />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("kpi.receitaBrutaAno")} value={fmtBRL(resumo.dreYTD.receitaBruta)} tone="positive" basis="competencia"
          tooltip="Soma da Receita Bruta (DRE, regime de Competência) de todos os meses do ano corrente até hoje (Year-to-Date) — usa Data de Competência, não Data de Vencimento/Pagamento." />
        <KpiCard label={t("kpi.ebitdaAno")} value={fmtBRL(resumo.dreYTD.ebitda)} tone={resumo.dreYTD.ebitda >= 0 ? "positive" : "negative"} basis="competencia" />
        <KpiCard label={t("kpi.desvioOrcamento")} value={fmtBRL(resumo.orcadoRealizado.desvioTotalVsOrcamento)} tone={resumo.orcadoRealizado.desvioTotalVsOrcamento >= 0 ? "positive" : "negative"} basis="competencia"
          tooltip="Número LÍQUIDO: soma o desvio (favorável menos desfavorável) dos 6 grupos do DRE. Grupos favoráveis podem mascarar grupos desfavoráveis — um total pequeno aqui não significa que todo grupo está dentro do orçado. Ver 'Alertas Executivos' abaixo para a composição por grupo." />
        <KpiCard label={t("kpi.inadimplenciaReceber")} value={`${resumo.contasReceber.inadimplenciaPct.toFixed(1)}%`} tone={resumo.contasReceber.totalVencido > 0 ? "negative" : "neutral"} />
      </div>

      <Panel title="Comparativo Mensal" subtitle={`${MESES[mesRefIdx]}/${anoRefComp} vs. ${MESES[mesAnteriorIdx]}/${mesAnteriorAno} — Regime de Competência, use o filtro Mês/Ano acima pra escolher outro mês`}>
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 uppercase tracking-wide">Receita Bruta</span>
            <div className="flex items-baseline gap-3">
              <span className="font-mono tabular-nums text-xl font-semibold text-slate-900">{fmtBRL(comparativoMensal.atual.receitaBruta)}</span>
              {comparativoMensal.deltaReceitaPct != null && (
                <span className={`text-sm font-medium ${comparativoMensal.deltaReceitaPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {comparativoMensal.deltaReceitaPct >= 0 ? "▲" : "▼"} {Math.abs(comparativoMensal.deltaReceitaPct).toFixed(0)}%
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400">{MESES[mesAnteriorIdx]}/{mesAnteriorAno}: {fmtBRL(comparativoMensal.anterior.receitaBruta)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 uppercase tracking-wide">EBITDA</span>
            <div className="flex items-baseline gap-3">
              <span className={`font-mono tabular-nums text-xl font-semibold ${comparativoMensal.atual.ebitda >= 0 ? "text-slate-900" : "text-rose-600"}`}>{fmtBRL(comparativoMensal.atual.ebitda)}</span>
              {comparativoMensal.deltaEbitdaPct != null && (
                <span className={`text-sm font-medium ${comparativoMensal.deltaEbitdaPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {comparativoMensal.deltaEbitdaPct >= 0 ? "▲" : "▼"} {Math.abs(comparativoMensal.deltaEbitdaPct).toFixed(0)}%
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400">{MESES[mesAnteriorIdx]}/{mesAnteriorAno}: {fmtBRL(comparativoMensal.anterior.ebitda)}</span>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-3 gap-4">
        <Gauge
          label="Liquidez Seca"
          value={resumo.caixa.indiceLiquidezSeca}
          min={0} max={3}
          meta={parametros.metaLiquidezSeca}
          bands={[{ upTo: parametros.metaLiquidezSeca * 0.67, color: "#f43f5e" }, { upTo: parametros.metaLiquidezSeca, color: "#f59e0b" }, { upTo: 3, color: "#10b981" }]}
          formatValue={(v) => `${v.toFixed(2)}x`}
          sub={`(Caixa Disponível + Contas a Receber em aberto) ÷ Contas a Pagar em aberto — meta ${parametros.metaLiquidezSeca.toFixed(2)}x configurável em Governança`}
          tooltip="O que já é caixa ou vai virar caixa via cobrança, sem contar aplicações."
        />
        <Gauge
          label="Liquidez Corrente"
          value={resumo.caixa.indiceLiquidezCorrente}
          min={0} max={3}
          meta={parametros.metaLiquidezCorrente}
          bands={[{ upTo: parametros.metaLiquidezCorrente * 0.67, color: "#f43f5e" }, { upTo: parametros.metaLiquidezCorrente, color: "#f59e0b" }, { upTo: 3, color: "#10b981" }]}
          formatValue={(v) => `${v.toFixed(2)}x`}
          sub={`(Caixa Disponível + Aplicações + Contas a Receber em aberto) ÷ Contas a Pagar em aberto — meta ${parametros.metaLiquidezCorrente.toFixed(2)}x configurável em Governança`}
          tooltip="Tudo somado, incluindo o que pode ser resgatado de aplicações."
        />
        <Gauge
          label="Inadimplência"
          value={resumo.contasReceber.inadimplenciaPct}
          min={0} max={20}
          meta={16}
          bands={[{ upTo: 5, color: "#10b981" }, { upTo: 10, color: "#f59e0b" }, { upTo: 20, color: "#f43f5e" }]}
          formatValue={(v) => `${v.toFixed(1)}%`}
          sub="Vencido ÷ Carteira AR — <5% verde, 5-10% amarelo, >10% vermelho"
        />
      </div>

      <Panel title="Composição do Caixa do Mês" subtitle={`Caixa Inicial → Operacional → Investimentos → Financiamentos → Caixa Final — Data-base: ${fmtData(resumo.dataReferencia)} (sempre o mês corrente real, não segue o filtro Mês/Ano abaixo)`}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={waterfallData} margin={{ top: 20 }}>
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} width={56} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} formatter={(v, name, props) => name === "delta" ? [fmtBRL(props.payload.valorReal), "Valor"] : [null, null]} />
            <Bar dataKey="base" stackId="wf" fill="transparent" />
            <Bar dataKey="delta" stackId="wf" radius={[3, 3, 3, 3]}>
              {waterfallData.map((d, i) => <Cell key={i} fill={COR_WATERFALL[d.cor]} />)}
              <LabelList dataKey="valorReal" position="top" formatter={fmtBRLShort} style={{ fontSize: 11, fill: "#475569" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Alertas Executivos" subtitle={resumo.alertas.length === 0 ? "Nenhum alerta sustentado pelos dados atuais" : `${resumo.alertas.length} ponto(s) de atenção`}>
        <InfoNote>
          Cada linha aponta pro card/tela onde o número completo está. Severidade <span className="text-rose-600 font-medium">Alta</span> = liquidez
          projetada fica negativa, caixa consolidado ATUAL abaixo do mínimo configurado, ou título já vencido; <span className="text-amber-600 font-medium">Média</span> = caixa
          projetado (futuro) abaixo do mínimo, pagamento/recebimento relevante próximo, concentração de carteira acima de {parametros.limiteConcentracaoPct}%,
          ou desvio orçamentário acima de {fmtBRL(parametros.materialidadeValor)} e {parametros.materialidadePct}% ao mesmo tempo — cortes configuráveis em Governança;
          <span className="text-indigo-600 font-medium"> Informativa</span> = evento de rotina (ex.: sweep automático de caixa), não é risco.
        </InfoNote>
        {resumo.alertas.length === 0 ? <span className="text-sm text-slate-400">Sem alertas no momento.</span> : (
          <div className="flex flex-col gap-2 mt-3">
            {resumo.alertas.map((a, i) => {
              const cor = a.severidade === "Alta" ? "text-rose-600" : a.severidade === "Média" ? "text-amber-600" : "text-indigo-600";
              const tone = a.severidade === "Alta" ? "rose" : a.severidade === "Média" ? "amber" : "indigo";
              const Icon = a.severidade === "Informativa" ? Info : AlertTriangle;
              return (
                <div key={i} className={`flex items-start gap-2 text-sm ${cor}`}>
                  <Icon size={14} className="mt-0.5 shrink-0" />
                  <span>{TEXTO_ALERTA[a.tipo]?.(a) ?? a.tipo}</span>
                  <Badge tone={tone}>{a.severidade}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-3 gap-4">
        <Panel title="Evolução do Caixa (30 dias)" className="col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={sparkData}>
              <defs><linearGradient id="gradDash" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.25} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="data" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              {/* Achado (comando dashboard-causa-raiz, 2b): a série diária JÁ
                  oscila de verdade dia a dia (entradas/saídas reais variam)
                  — o que achatava a linha era o eixo Y partindo de 0 por
                  padrão, espremendo uma variação real de ~R$ 20-30k lá no
                  topo de uma escala de ~R$ 800k+. Mesmo ajuste já usado no
                  sparkline de Câmbio (TesourariaPage.jsx): domain
                  dataMin/dataMax em vez de deixar o Recharts assumir [0,
                  max]. Não mexemos em buildFluxoCaixaDiario — os valores
                  continuam os mesmos, só a escala do eixo mudou. */}
              <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} width={56} domain={["dataMin", "dataMax"]} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} formatter={(v) => fmtBRL(v)} />
              <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="2 4" />
              <Area type="monotone" dataKey="saldo" stroke="#10b981" fill="url(#gradDash)" strokeWidth={1.75} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Despesas por Centro de Custo (Top 6)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={resumo.despesasPorCentroCusto} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="nome" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={90} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} formatter={(v) => fmtBRL(v)} />
              <Bar dataKey="valor" fill="#f43f5e" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Panel title="Top Clientes (em aberto)">
          {resumo.contasReceber.concentracaoTop5.map((c) => (
            <div key={c.id} className="flex justify-between text-sm py-1 border-b border-slate-100"><span className="text-slate-600">{c.nome}</span><span className="font-mono">{fmtBRL(c.valor)}</span></div>
          ))}
        </Panel>
        <Panel title="Top Fornecedores (em aberto)">
          {resumo.contasPagar.concentracaoTop5.map((c) => (
            <div key={c.id} className="flex justify-between text-sm py-1 border-b border-slate-100"><span className="text-slate-600">{c.nome}</span><span className="font-mono">{fmtBRL(c.valor)}</span></div>
          ))}
          {resumo.contasPagar.despesasInternas > 0 && (
            <div className="flex justify-between text-xs text-slate-400 pt-2 mt-1">
              <span>Despesas internas (sem fornecedor vinculado)</span><span className="font-mono">{fmtBRL(resumo.contasPagar.despesasInternas)}</span>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
