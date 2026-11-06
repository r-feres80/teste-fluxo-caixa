import React, { useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts";
import { Panel, KPI, Gauge, InfoNote, selectCls, DateInputBR } from "../components/ui/Primitives.jsx";
import { fmtBRL, fmtBRLShort, fmtData } from "../utils/formatUtils.js";
import {
  calcularCarteiraEAging, calcularConcentracaoPorParceiro, calcularEvolucaoInadimplencia, calcularPDD,
  FAIXAS_AGING, calcularDSOouDPO, FAIXAS_AGING_RECEBIDOS, calcularAgingVencidosRecebidos,
} from "../financial-engine/aging.js";
import { diffDaysISO, getDataAtualSistema } from "../utils/dateUtils.js";
import { PDD_FAIXAS_PADRAO, MESES } from "../config/appConfig.js";

// Inadimplência é módulo de FATO (mesma base de Contas a Receber): aging e
// vencimentos sempre a partir de "hoje" real — ver getDataAtualSistema.
export default function InadimplenciaPage({ data }) {
  const { entidades, filtros, parametros } = data;
  const hoje = getDataAtualSistema();

  const lancamentosAR = useMemo(() => entidades.lancamentos.filter((l) =>
    l.tipo === "Entrada" && !l.transferencia && (filtros.empresaId === "TODAS" || l.empresaId === filtros.empresaId)
  ), [entidades.lancamentos, filtros.empresaId]);

  const { abertos, buckets, totalVencido, totalCarteira } = useMemo(
    () => calcularCarteiraEAging(lancamentosAR, hoje), [lancamentosAR, hoje]
  );
  const inadimplenciaPct = totalCarteira > 0 ? (totalVencido / totalCarteira) * 100 : 0;

  const vencidos = useMemo(() => abertos.filter((l) => diffDaysISO(l.dataVencimento, hoje) > 0), [abertos, hoje]);

  // Filtro de "Títulos Vencidos em Aberto": mês de vencimento (mesmo padrão
  // de Contas a Pagar/Receber — Bloco 4, auditoria item 3) + data (De/Até) +
  // cliente + faixa de atraso, com totalizador — ver item 9/Etapa 3.
  const faixaDoAtraso = (l) => {
    const dias = diffDaysISO(l.dataVencimento, hoje);
    return (FAIXAS_AGING.find((f) => dias <= f.max) ?? FAIXAS_AGING[FAIXAS_AGING.length - 1]).key;
  };
  const [fMes, setFMes] = useState("todos");
  const [fDataDe, setFDataDe] = useState("");
  const [fDataAte, setFDataAte] = useState("");
  const [fClienteId, setFClienteId] = useState("TODOS");
  const [fFaixa, setFFaixa] = useState("TODAS");
  const mesesDisponiveis = useMemo(() => {
    const set = new Set(vencidos.map((l) => l.dataVencimento.slice(0, 7)));
    return Array.from(set).sort();
  }, [vencidos]);
  const clientesComVencido = useMemo(() => {
    const ids = new Set(vencidos.map((l) => l.clienteFornecedorId).filter(Boolean));
    return entidades.clientes.filter((c) => ids.has(c.id)).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [vencidos, entidades.clientes]);
  const vencidosFiltrados = useMemo(() => vencidos.filter((l) => {
    if (fClienteId !== "TODOS" && l.clienteFornecedorId !== fClienteId) return false;
    if (fFaixa !== "TODAS" && faixaDoAtraso(l) !== fFaixa) return false;
    if (fMes !== "todos" && !l.dataVencimento.startsWith(fMes)) return false;
    if (fDataDe && l.dataVencimento < fDataDe) return false;
    if (fDataAte && l.dataVencimento > fDataAte) return false;
    return true;
  }), [vencidos, fClienteId, fFaixa, fMes, fDataDe, fDataAte, hoje]);
  const totalFiltrado = vencidosFiltrados.reduce((s, l) => s + l.valor, 0);
  const concentracaoVencidos = useMemo(() => calcularConcentracaoPorParceiro(vencidos, 5), [vencidos]);
  const evolucaoInadimplencia = useMemo(() => calcularEvolucaoInadimplencia(lancamentosAR, hoje, 6), [lancamentosAR, hoje]);
  // Aging de Vencidos Recebidos: mudou de Contas a Receber pra cá (Bloco 4)
  // — histórico de atraso já liquidado (Data de baixa − Vencimento), é
  // conceito de inadimplência, não de carteira em aberto.
  const agingVencidosRecebidos = useMemo(() => calcularAgingVencidosRecebidos(lancamentosAR), [lancamentosAR]);
  const chartAgingRecebidos = FAIXAS_AGING_RECEBIDOS.map((f) => ({ faixa: f.label, valor: agingVencidosRecebidos.buckets[f.key] }));
  const pdd = useMemo(() => calcularPDD(lancamentosAR, hoje, parametros.pddFaixas || PDD_FAIXAS_PADRAO), [lancamentosAR, hoje, parametros.pddFaixas]);

  const realizadoNoMes = useMemo(() => {
    const [ano, mes] = hoje.slice(0, 7).split("-").map(Number);
    return lancamentosAR.filter((l) => l.situacao === "Realizado" && l.dataPagamento?.startsWith(`${ano}-${String(mes).padStart(2, "0")}`)).reduce((s, l) => s + l.valor, 0);
  }, [lancamentosAR, hoje]);
  const dso = calcularDSOouDPO(totalCarteira, realizadoNoMes, 30);

  // Aging da Carteira aqui é escopo exclusivo de vencidos (Inadimplência não
  // é sobre o que ainda vai vencer) — sem a barra "A vencer", que já aparece
  // em Contas a Receber.
  const chartData = FAIXAS_AGING.map((f) => ({ faixa: f.label, valor: buckets[f.key] }));

  return (
    <div className="flex flex-col gap-6">
      <InfoNote>
        Inadimplência de Contas a Receber: títulos com Vencimento já passado em relação a hoje (situação "Vencido"),
        ainda sem baixa. O histórico de atraso já liquidado (títulos Realizados com atraso) está em "Aging de Vencidos Recebidos" abaixo.
      </InfoNote>

      <div className="grid grid-cols-3 gap-4">
        <KPI label="Total Vencido" value={fmtBRL(totalVencido)} tone={totalVencido > 0 ? "negative" : "neutral"} />
        <KPI label="Total da Carteira" value={fmtBRL(totalCarteira)} tone="neutral" />
        <KPI label="DSO / PMR (aprox.)" value={dso != null ? `${dso.toFixed(0)} dias` : "—"} sub="Carteira ÷ Realizado no mês × 30" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KPI label="Contas a Receber Líquido de PDD" value={fmtBRL(totalCarteira - pdd.provisaoTotal)} tone="neutral" />
        <KPI label="Provisão (PDD)" value={fmtBRL(pdd.provisaoTotal)} tone={pdd.provisaoTotal > 0 ? "negative" : "neutral"} sub={`${pdd.saldoVencido > 0 ? ((pdd.provisaoTotal / pdd.saldoVencido) * 100).toFixed(1) : "0.0"}% do saldo vencido`}
          tooltip="R$ 0,00 é esperado, não é bug, sempre que todo o vencido estiver dentro da faixa 1-30 dias — política intencional (configurável em Governança) de não provisionar atraso recente. A provisão só aparece quando o atraso passa de 30 dias." />
        <Panel title="PDD por Faixa de Atraso" subtitle="Percentuais configuráveis em Governança">
          <div className="flex flex-col gap-1 text-xs">
            {pdd.porFaixa.filter((f) => f.saldo > 0).map((f) => (
              <div key={f.key} className="flex justify-between text-slate-600">
                <span>{f.label} dias ({f.pct}%)</span>
                <span className="font-mono tabular-nums">{fmtBRL(f.provisao)}</span>
              </div>
            ))}
            {pdd.porFaixa.every((f) => f.saldo === 0) && <span className="text-slate-400">Nenhum título vencido em aberto.</span>}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Gauge
          label="Inadimplência"
          value={inadimplenciaPct}
          min={0} max={20}
          bands={[{ upTo: 5, color: "#10b981" }, { upTo: 10, color: "#f59e0b" }, { upTo: 20, color: "#f43f5e" }]}
          formatValue={(v) => `${v.toFixed(1)}%`}
          sub="Vencido ÷ Carteira AR — <5% verde, 5-10% amarelo, >10% vermelho"
        />
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

      <div className="grid grid-cols-2 gap-4">
        <Panel title="Aging da Carteira" subtitle="Vencido em aberto, por faixa de dias">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis dataKey="faixa" stroke="#64748b" fontSize={10} tickLine={false} interval={0} angle={-40} textAnchor="end" height={50} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} formatter={(v) => fmtBRL(v)} />
              <Bar dataKey="valor" radius={[3, 3, 0, 0]} fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Top 5 Devedores (Vencido)" subtitle="Concentração só sobre títulos vencidos em aberto">
          {concentracaoVencidos.length === 0 ? <span className="text-sm text-slate-400">Nenhum título vencido em aberto.</span> : (
            <div className="flex flex-col gap-2">
              {concentracaoVencidos.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{entidades.clientes.find((p) => p.id === c.id)?.nome ?? "—"}</span>
                  <span className="font-mono tabular-nums text-slate-700">{fmtBRL(c.valor)} ({c.pct.toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

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

      <Panel
        title="Títulos Vencidos em Aberto"
        right={
          <div className="flex items-center gap-2">
            <select value={fMes} onChange={(e) => setFMes(e.target.value)} className={selectCls + " w-auto"}>
              <option value="todos">Todos os meses</option>
              {mesesDisponiveis.map((m) => {
                const [ano, mes] = m.split("-");
                return <option key={m} value={m}>{MESES[Number(mes) - 1]}/{ano}</option>;
              })}
            </select>
            <DateInputBR value={fDataDe} onChange={setFDataDe} className={selectCls + " w-auto"} />
            <span className="text-slate-400 text-xs">até</span>
            <DateInputBR value={fDataAte} onChange={setFDataAte} className={selectCls + " w-auto"} />
            <select value={fClienteId} onChange={(e) => setFClienteId(e.target.value)} className={selectCls + " w-auto"}>
              <option value="TODOS">Todos os clientes</option>
              {clientesComVencido.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <select value={fFaixa} onChange={(e) => setFFaixa(e.target.value)} className={selectCls + " w-auto"}>
              <option value="TODAS">Todas faixas</option>
              {FAIXAS_AGING.map((f) => <option key={f.key} value={f.key}>{f.label} dias</option>)}
            </select>
          </div>
        }
      >
        {vencidosFiltrados.length === 0 ? <InfoNote>Nenhum título vencido para os filtros atuais.</InfoNote> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 text-xs uppercase border-b border-slate-200"><th className="py-2 pr-4">Vencimento</th><th className="py-2 pr-4">Cliente</th><th className="py-2 pr-4">Documento</th><th className="py-2 pr-4 text-right">Dias em Atraso</th><th className="py-2 pr-4 text-right">Valor</th></tr></thead>
              <tbody>
                {vencidosFiltrados.sort((a, b) => (a.dataVencimento < b.dataVencimento ? -1 : 1)).map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-4 text-slate-500 font-mono text-xs">{fmtData(l.dataVencimento)}</td>
                    <td className="py-2 pr-4 text-slate-700">{entidades.clientes.find((p) => p.id === l.clienteFornecedorId)?.nome ?? "—"}</td>
                    <td className="py-2 pr-4 text-slate-500 text-xs">{l.documento}</td>
                    <td className="py-2 pr-4 text-right font-mono tabular-nums text-rose-600">{diffDaysISO(l.dataVencimento, hoje)}</td>
                    <td className="py-2 pr-4 text-right font-mono tabular-nums">{fmtBRL(l.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between items-center text-sm font-medium text-slate-600 mt-3 pt-3 border-t border-slate-200">
              <span>{vencidosFiltrados.length} título(s)</span>
              <span className="font-mono tabular-nums">{fmtBRL(totalFiltrado)}</span>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
