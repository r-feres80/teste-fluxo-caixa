import React, { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, ComposedChart, Legend } from "recharts";
import { Panel, KPI, InfoNote } from "./ui/Primitives.jsx";
import { fmtBRL, fmtBRLShort, fmtData } from "../utils/formatUtils.js";
import {
  calcularCarteiraEAging, calcularConcentracaoPorParceiro, calcularDespesasInternas, vencimentosProximos,
  FAIXAS_AGING, calcularComposicaoRecebido, calcularEvolucaoInadimplencia,
  FAIXAS_AGING_RECEBIDOS, calcularAgingVencidosRecebidos, calcularPrevistoRecebidoDiario,
} from "../financial-engine/aging.js";
import { situacaoEfetiva } from "../financial-engine/lancamentos.js";
import { addDaysISO, diffDaysISO, getDataAtualSistema } from "../utils/dateUtils.js";

// Contas a Pagar/Receber são módulos de FATO: aging e vencimentos sempre
// contam a partir de "hoje" real, nunca da Data de Referência editável —
// ver getDataAtualSistema.
export function ContasPagarReceberView({ data, tipo }) {
  const { entidades, filtros, parametros } = data;
  const hoje = getDataAtualSistema();
  const listaParceiros = tipo === "Entrada" ? entidades.clientes : entidades.fornecedores;
  const rotuloParceiro = tipo === "Entrada" ? "Cliente" : "Fornecedor";

  const lancamentosDoTipo = useMemo(() => entidades.lancamentos.filter((l) =>
    l.tipo === tipo && !l.transferencia && (filtros.empresaId === "TODAS" || l.empresaId === filtros.empresaId)
  ), [entidades.lancamentos, tipo, filtros.empresaId]);

  const { abertos, buckets, totalVencido, totalCarteira, aVencer } = useMemo(
    () => calcularCarteiraEAging(lancamentosDoTipo, hoje), [lancamentosDoTipo, hoje]
  );
  const concentracao = useMemo(() => calcularConcentracaoPorParceiro(abertos, 5), [abertos]);
  const despesasInternas = useMemo(() => calcularDespesasInternas(abertos), [abertos]);
  const proximos7 = useMemo(() => vencimentosProximos(abertos, hoje, parametros.diasParaAlertas), [abertos, hoje, parametros.diasParaAlertas]);
  const proximos15 = useMemo(() => vencimentosProximos(abertos, hoje, 15), [abertos, hoje]);
  const proximos30 = useMemo(() => vencimentosProximos(abertos, hoje, 30), [abertos, hoje]);
  const vencimentosHoje = abertos.filter((l) => diffDaysISO(hoje, l.dataVencimento) === 0);

  const realizadoNoMes = useMemo(() => {
    const [ano, mes] = hoje.slice(0, 7).split("-").map(Number);
    return lancamentosDoTipo.filter((l) => l.situacao === "Realizado" && l.dataPagamento?.startsWith(`${ano}-${String(mes).padStart(2, "0")}`)).reduce((s, l) => s + l.valor, 0);
  }, [lancamentosDoTipo, hoje]);

  const inadimplenciaPct = totalCarteira > 0 ? (totalVencido / totalCarteira) * 100 : 0;

  // Régua de aging estendida (9 faixas de vencido) — ver FAIXAS_AGING em aging.js.
  const chartData = [
    { faixa: "A vencer", valor: aVencer },
    ...FAIXAS_AGING.map((f) => ({ faixa: f.label, valor: buckets[f.key] })),
  ];

  // Composição do Recebido / Evolução de Inadimplência: só em Contas a Receber
  // (tipo === "Entrada") — ver item 9, escopo explícito de AR.
  const lancamentosRealizados = useMemo(() => lancamentosDoTipo.filter((l) => l.situacao === "Realizado"), [lancamentosDoTipo]);
  const composicaoRecebido = useMemo(() => tipo === "Entrada" ? calcularComposicaoRecebido(lancamentosRealizados) : null, [tipo, lancamentosRealizados]);
  const evolucaoInadimplencia = useMemo(() => tipo === "Entrada" ? calcularEvolucaoInadimplencia(lancamentosDoTipo, hoje, 6) : null, [tipo, lancamentosDoTipo, hoje]);

  // Aging de Vencidos Recebidos: histórico de atraso na liquidação (Data de
  // baixa − Vencimento), aplicável tanto a AR quanto a AP.
  const agingVencidosRecebidos = useMemo(() => calcularAgingVencidosRecebidos(lancamentosDoTipo), [lancamentosDoTipo]);
  const chartAgingRecebidos = FAIXAS_AGING_RECEBIDOS.map((f) => ({ faixa: f.label, valor: agingVencidosRecebidos.buckets[f.key] }));

  // Previsto x Recebido: escopo exclusivo de AR (item 9/Leva 2). PDD mora em
  // InadimplenciaPage.jsx (Etapa 2 item 3) — não recalcular aqui.
  const previstoRecebido = useMemo(() => tipo === "Entrada" ? calcularPrevistoRecebidoDiario(lancamentosDoTipo, hoje, 30) : null, [tipo, lancamentosDoTipo, hoje]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">
        <KPI label="Total da Carteira (em aberto)" value={fmtBRL(totalCarteira)} tone="neutral" />
        <KPI label="Vencido" value={fmtBRL(totalVencido)} tone={totalVencido > 0 ? "negative" : "neutral"} />
        <KPI label={`Realizado no mês`} value={fmtBRL(realizadoNoMes)} tone="positive" basis="caixa" />
        <KPI label={tipo === "Entrada" ? "Inadimplência" : "Atraso de Pagamento"} value={`${inadimplenciaPct.toFixed(1)}%`} tone={inadimplenciaPct > 10 ? "negative" : "neutral"} />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KPI label="Vencimentos Hoje" value={fmtBRL(vencimentosHoje.reduce((s, l) => s + l.valor, 0))} sub={`${vencimentosHoje.length} título(s)`} />
        <KPI label={`Próximos ${parametros.diasParaAlertas} dias`} value={fmtBRL(proximos7.reduce((s, l) => s + l.valor, 0))} sub={`${proximos7.length} título(s)`} />
        <KPI label="Próximos 15 dias" value={fmtBRL(proximos15.reduce((s, l) => s + l.valor, 0))} sub={`${proximos15.length} título(s)`} />
        <KPI label="Próximos 30 dias" value={fmtBRL(proximos30.reduce((s, l) => s + l.valor, 0))} sub={`${proximos30.length} título(s)`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Panel title={tipo === "Entrada" ? "Aging AR" : "Aging AP"}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <XAxis dataKey="faixa" stroke="#64748b" fontSize={10} tickLine={false} interval={0} angle={-40} textAnchor="end" height={50} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} formatter={(v) => fmtBRL(v)} />
              <Bar dataKey="valor" radius={[3, 3, 0, 0]} fill={tipo === "Entrada" ? "#10b981" : "#f43f5e"} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={`Concentração por ${rotuloParceiro}`} subtitle={`Top 5 — alerta configurado em ${parametros.limiteConcentracaoPct}%`}>
          {concentracao.length === 0 ? <span className="text-sm text-slate-400">Nenhum título em aberto.</span> : (
            <div className="flex flex-col gap-2">
              {concentracao.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{listaParceiros.find((p) => p.id === c.id)?.nome ?? "—"}</span>
                  <span className={`font-mono tabular-nums ${c.pct >= parametros.limiteConcentracaoPct ? "text-rose-600" : "text-slate-700"}`}>{fmtBRL(c.valor)} ({c.pct.toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          )}
          {despesasInternas > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
              <span>Despesas internas (sem {rotuloParceiro.toLowerCase()} vinculado)</span>
              <span className="font-mono tabular-nums">{fmtBRL(despesasInternas)}</span>
            </div>
          )}
        </Panel>
      </div>

      {/* "Aging de Vencidos Recebidos" é conceito de AR (histórico de atraso
          no recebimento) — não faz sentido em Contas a Pagar. */}
      {tipo === "Entrada" && (
        <Panel title="Aging de Vencidos Recebidos" subtitle="Títulos Realizados liquidados com atraso — dias_atraso = Data de baixa − Vencimento">
          {agingVencidosRecebidos.total === 0 ? <span className="text-sm text-slate-400">Nenhum título Realizado com atraso na liquidação.</span> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartAgingRecebidos}>
                <XAxis dataKey="faixa" stroke="#64748b" fontSize={10} tickLine={false} interval={0} angle={-30} textAnchor="end" height={45} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} formatter={(v) => fmtBRL(v)} />
                <Bar dataKey="valor" radius={[3, 3, 0, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      )}

      {tipo === "Entrada" && (
        <div className="grid grid-cols-2 gap-4">
          <Panel title="Composição do Recebido" subtitle="Antecipado / Em dia / Atrasado — baixa (recebimento) vs. vencimento, títulos Realizados">
            {composicaoRecebido.total === 0 ? <span className="text-sm text-slate-400">Nenhum título Realizado no momento.</span> : (
              <div className="flex flex-col gap-3">
                <div className="w-full h-6 rounded overflow-hidden flex">
                  {composicaoRecebido.antecipadoPct > 0 && <div className="bg-emerald-500" style={{ width: `${composicaoRecebido.antecipadoPct}%` }} title="Antecipado" />}
                  {composicaoRecebido.emDiaPct > 0 && <div className="bg-indigo-400" style={{ width: `${composicaoRecebido.emDiaPct}%` }} title="Em dia" />}
                  {composicaoRecebido.atrasadoPct > 0 && <div className="bg-rose-500" style={{ width: `${composicaoRecebido.atrasadoPct}%` }} title="Atrasado" />}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Antecipado <span className="font-mono">{composicaoRecebido.antecipadoPct.toFixed(0)}%</span></span>
                  <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-400 inline-block" />Em dia <span className="font-mono">{composicaoRecebido.emDiaPct.toFixed(0)}%</span></span>
                  <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />Atrasado <span className="font-mono">{composicaoRecebido.atrasadoPct.toFixed(0)}%</span></span>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Evolução Mensal de Inadimplência (%)" subtitle="Últimos 6 meses, por Data de Vencimento">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={evolucaoInadimplencia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v.toFixed(0)}%`} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} formatter={(v) => `${v.toFixed(1)}%`} />
                <Line type="monotone" dataKey="pct" name="Inadimplência" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        </div>
      )}

      {tipo === "Entrada" && (
        <Panel title="Previsto x Recebido" subtitle="Últimos 30 dias — % aderência = Recebido no Dia ÷ A Receber no Dia">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={previstoRecebido}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="data" tickFormatter={(d) => d.slice(8, 10)} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis yAxisId="valor" stroke="#94a3b8" fontSize={10} tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} width={56} />
              <YAxis yAxisId="pct" orientation="right" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${v.toFixed(0)}%`} tickLine={false} axisLine={false} width={44} />
              <Tooltip labelFormatter={(d) => d.split("-").reverse().join("/")} formatter={(v, n) => n === "% Aderência" ? (v == null ? "—" : `${v.toFixed(0)}%`) : fmtBRL(v)} contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="valor" dataKey="aReceber" name="A Receber no Dia" fill="#818cf8" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="valor" dataKey="recebido" name="Recebido no Dia" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Line yAxisId="pct" type="monotone" dataKey="aderenciaPct" name="% Aderência" stroke="#f97316" strokeWidth={2} dot={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>
      )}

      {/* PDD (Provisão para Devedores Duvidosos) mora em Inadimplência agora
          — é o módulo dedicado a risco de recebíveis vencidos, PDD não
          precisa ser duplicado aqui em Contas a Receber. */}

      <Panel title={`Títulos em Aberto — ${rotuloParceiro}`}>
        {abertos.length === 0 ? <InfoNote>Nenhum título em aberto para os filtros atuais.</InfoNote> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 text-xs uppercase border-b border-slate-200"><th className="py-2 pr-4">Vencimento</th><th className="py-2 pr-4">{rotuloParceiro}</th><th className="py-2 pr-4">Documento</th><th className="py-2 pr-4">Situação</th><th className="py-2 pr-4 text-right">Valor</th></tr></thead>
              <tbody>
                {abertos.sort((a, b) => (a.dataVencimento < b.dataVencimento ? -1 : 1)).map((l) => (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4 text-slate-500 font-mono text-xs">{fmtData(l.dataVencimento)}</td>
                    <td className="py-2 pr-4 text-slate-700">{listaParceiros.find((p) => p.id === l.clienteFornecedorId)?.nome ?? "—"}</td>
                    <td className="py-2 pr-4 text-slate-500 text-xs">{l.documento}</td>
                    <td className="py-2 pr-4 text-xs">{situacaoEfetiva(l, hoje)}</td>
                    <td className="py-2 pr-4 text-right font-mono tabular-nums">{fmtBRL(l.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
