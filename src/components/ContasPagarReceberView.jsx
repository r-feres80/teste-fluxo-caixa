import React, { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Panel, KPI, InfoNote } from "./ui/Primitives.jsx";
import { fmtBRL, fmtBRLShort, fmtData } from "../utils/formatUtils.js";
import { calcularCarteiraEAging, calcularConcentracaoPorParceiro, vencimentosProximos } from "../financial-engine/aging.js";
import { situacaoEfetiva } from "../financial-engine/lancamentos.js";
import { addDaysISO, diffDaysISO } from "../utils/dateUtils.js";

export function ContasPagarReceberView({ data, tipo }) {
  const { entidades, filtros, parametros } = data;
  const listaParceiros = tipo === "Entrada" ? entidades.clientes : entidades.fornecedores;
  const rotuloParceiro = tipo === "Entrada" ? "Cliente" : "Fornecedor";

  const lancamentosDoTipo = useMemo(() => entidades.lancamentos.filter((l) =>
    l.tipo === tipo && !l.transferencia && (filtros.empresaId === "TODAS" || l.empresaId === filtros.empresaId)
  ), [entidades.lancamentos, tipo, filtros.empresaId]);

  const { abertos, buckets, totalVencido, totalCarteira, aVencer } = useMemo(
    () => calcularCarteiraEAging(lancamentosDoTipo, filtros.dataReferencia), [lancamentosDoTipo, filtros.dataReferencia]
  );
  const concentracao = useMemo(() => calcularConcentracaoPorParceiro(abertos, 5), [abertos]);
  const proximos7 = useMemo(() => vencimentosProximos(abertos, filtros.dataReferencia, parametros.diasParaAlertas), [abertos, filtros.dataReferencia, parametros.diasParaAlertas]);
  const proximos15 = useMemo(() => vencimentosProximos(abertos, filtros.dataReferencia, 15), [abertos, filtros.dataReferencia]);
  const proximos30 = useMemo(() => vencimentosProximos(abertos, filtros.dataReferencia, 30), [abertos, filtros.dataReferencia]);
  const vencimentosHoje = abertos.filter((l) => diffDaysISO(filtros.dataReferencia, l.dataVencimento) === 0);

  const realizadoNoMes = useMemo(() => {
    const [ano, mes] = filtros.dataReferencia.slice(0, 7).split("-").map(Number);
    return lancamentosDoTipo.filter((l) => l.situacao === "Realizado" && l.dataPagamento?.startsWith(`${ano}-${String(mes).padStart(2, "0")}`)).reduce((s, l) => s + l.valor, 0);
  }, [lancamentosDoTipo, filtros.dataReferencia]);

  const inadimplenciaPct = totalCarteira > 0 ? (totalVencido / totalCarteira) * 100 : 0;

  const chartData = [
    { faixa: "A vencer", valor: aVencer },
    { faixa: "1-30", valor: buckets.vencido1a30 },
    { faixa: "31-60", valor: buckets.vencido31a60 },
    { faixa: "61-90", valor: buckets.vencido61a90 },
    { faixa: "+90", valor: buckets.vencidoMais90 },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">
        <KPI label="Total da Carteira (em aberto)" value={fmtBRL(totalCarteira)} tone="neutral" />
        <KPI label="Vencido" value={fmtBRL(totalVencido)} tone={totalVencido > 0 ? "negative" : "neutral"} />
        <KPI label={`Realizado no mês`} value={fmtBRL(realizadoNoMes)} tone="positive" />
        <KPI label="Inadimplência" value={`${inadimplenciaPct.toFixed(1)}%`} tone={inadimplenciaPct > 10 ? "negative" : "neutral"} />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KPI label="Vencimentos Hoje" value={fmtBRL(vencimentosHoje.reduce((s, l) => s + l.valor, 0))} sub={`${vencimentosHoje.length} título(s)`} />
        <KPI label={`Próximos ${parametros.diasParaAlertas} dias`} value={fmtBRL(proximos7.reduce((s, l) => s + l.valor, 0))} sub={`${proximos7.length} título(s)`} />
        <KPI label="Próximos 15 dias" value={fmtBRL(proximos15.reduce((s, l) => s + l.valor, 0))} sub={`${proximos15.length} título(s)`} />
        <KPI label="Próximos 30 dias" value={fmtBRL(proximos30.reduce((s, l) => s + l.valor, 0))} sub={`${proximos30.length} título(s)`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Panel title="Aging">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <XAxis dataKey="faixa" stroke="#64748b" fontSize={11} tickLine={false} />
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
        </Panel>
      </div>

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
                    <td className="py-2 pr-4 text-xs">{situacaoEfetiva(l, filtros.dataReferencia)}</td>
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
