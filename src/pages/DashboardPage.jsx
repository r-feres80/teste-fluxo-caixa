import React, { useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, BarChart, Bar } from "recharts";
import { AlertTriangle } from "lucide-react";
import { Panel, Badge } from "../components/ui/Primitives.jsx";
import { fmtBRL, fmtBRLShort } from "../utils/formatUtils.js";
import { construirResumoExecutivo } from "../financial-engine/resumoExecutivo.js";

function KpiCard({ label, value, sub, tone = "neutral" }) {
  const cor = tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-rose-600" : "text-slate-900";
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex flex-col gap-1">
      <span className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</span>
      <span className={`font-mono tabular-nums text-xl font-semibold ${cor}`}>{value}</span>
      {sub && <span className="text-[11px] text-slate-400">{sub}</span>}
    </div>
  );
}

const TEXTO_ALERTA = {
  liquidez: (a) => `Risco de liquidez: caixa projetado negativo (${fmtBRL(a.saldo)}) em ${a.data}.`,
  caixa_abaixo_minimo: (a) => `Caixa (${fmtBRL(a.valor)}) abaixo do mínimo configurado.`,
  caixa_projetado_abaixo_minimo: (a) => `Caixa projetado fica abaixo do mínimo (${fmtBRL(a.valor)}) em ${a.data}.`,
  titulos_vencidos_receber: (a) => `Títulos vencidos a receber: ${fmtBRL(a.valor)}.`,
  titulos_vencidos_pagar: (a) => `Títulos vencidos a pagar: ${fmtBRL(a.valor)}.`,
  pagamentos_proximos: (a) => `${a.qtd} pagamento(s) relevante(s) nos próximos ${a.dias} dias (${fmtBRL(a.valor)}).`,
  recebimentos_atraso_relevantes: (a) => `${a.qtd} recebimento(s) relevante(s) próximos/atrasados (${fmtBRL(a.valor)}).`,
  desvio_orcamentario: (a) => `Desvio orçamentário em ${a.nome}: ${fmtBRL(a.valor)} (${a.pct.toFixed(0)}%).`,
  concentracao_cliente: (a) => `Concentração de cliente: ${a.pct.toFixed(0)}% da carteira em um único cliente.`,
  concentracao_fornecedor: (a) => `Concentração de fornecedor: ${a.pct.toFixed(0)}% da carteira em um único fornecedor.`,
};

// Dashboard consome exclusivamente o Resumo Executivo (financial-engine/resumoExecutivo.js) —
// a mesma fonte usada pelo Finance Copilot (IA). Isso garante que o número que o usuário vê
// na tela é sempre o mesmo que a IA usa para explicar causa-raiz; nenhum dos dois recalcula
// por conta própria.
export default function DashboardPage({ data }) {
  const { entidades, filtros, parametros } = data;

  const resumo = useMemo(
    () => construirResumoExecutivo({ entidades, filtros, parametros }),
    [entidades, filtros, parametros]
  );

  const sparkData = resumo.caixa.serieDiaria30dias.map((p) => ({ data: p.data.slice(8, 10), saldo: p.saldo }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Caixa Disponível" value={fmtBRL(resumo.caixa.disponivel)} tone={resumo.caixa.disponivel >= 0 ? "positive" : "negative"} />
        <KpiCard label="Contas a Receber (aberto)" value={fmtBRL(resumo.contasReceber.totalEmAberto)} />
        <KpiCard label="Contas a Pagar (aberto)" value={fmtBRL(resumo.contasPagar.totalEmAberto)} />
        <KpiCard label="Caixa Projetado 30 dias" value={fmtBRL(resumo.caixa.projetado30dias)} tone={resumo.caixa.projetado30dias >= 0 ? "positive" : "negative"} />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Receita Bruta YTD" value={fmtBRL(resumo.dreYTD.receitaBruta)} tone="positive" />
        <KpiCard label="EBITDA YTD" value={fmtBRL(resumo.dreYTD.ebitda)} tone={resumo.dreYTD.ebitda >= 0 ? "positive" : "negative"} />
        <KpiCard label="Desvio vs. Orçamento (período)" value={fmtBRL(resumo.orcadoRealizado.desvioTotalVsOrcamento)} tone={resumo.orcadoRealizado.desvioTotalVsOrcamento >= 0 ? "positive" : "negative"} />
        <KpiCard label="Inadimplência (Receber)" value={`${resumo.contasReceber.inadimplenciaPct.toFixed(1)}%`} tone={resumo.contasReceber.totalVencido > 0 ? "negative" : "neutral"} />
      </div>

      <Panel title="Alertas Executivos" subtitle={resumo.alertas.length === 0 ? "Nenhum alerta sustentado pelos dados atuais" : `${resumo.alertas.length} ponto(s) de atenção`}>
        {resumo.alertas.length === 0 ? <span className="text-sm text-slate-400">Sem alertas no momento.</span> : (
          <div className="flex flex-col gap-2">
            {resumo.alertas.map((a, i) => (
              <div key={i} className={`flex items-start gap-2 text-sm ${a.severidade === "Alta" ? "text-rose-600" : "text-amber-600"}`}>
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>{TEXTO_ALERTA[a.tipo]?.(a) ?? a.tipo}</span>
                <Badge tone={a.severidade === "Alta" ? "rose" : "amber"}>{a.severidade}</Badge>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-3 gap-4">
        <Panel title="Evolução do Caixa (30 dias)" className="col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={sparkData}>
              <defs><linearGradient id="gradDash" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.25} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="data" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} width={56} />
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
        </Panel>
      </div>
    </div>
  );
}
