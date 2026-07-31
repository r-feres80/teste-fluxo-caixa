import React, { useState, useMemo } from "react";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, ReferenceLine } from "recharts";
import { Wallet, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { Panel, KPI, InfoNote, selectCls } from "../components/ui/Primitives.jsx";
import { fmtBRL, fmtBRLShort, fmtData } from "../utils/formatUtils.js";
import { calcularPosicaoConsolidada } from "../financial-engine/tesouraria.js";
import { buildFluxoCaixaDiario, menorPontoDaSerie, HORIZONTES_DIAS } from "../financial-engine/fluxoCaixa.js";
import { aggregateSerie } from "../financial-engine/projecaoAgregada.js";

export default function FluxoCaixaPage({ data }) {
  const { entidades, filtros, parametros } = data;
  const [horizonte, setHorizonte] = useState(30);
  const [granularidade, setGranularidade] = useState("diaria");

  const contasFiltradas = entidades.contasBancarias.filter((c) => c.ativo && (filtros.empresaId === "TODAS" || c.empresaId === filtros.empresaId));
  const lancamentosFiltrados = entidades.lancamentos.filter((l) => filtros.empresaId === "TODAS" || l.empresaId === filtros.empresaId);

  const posicao = useMemo(() => calcularPosicaoConsolidada(contasFiltradas, lancamentosFiltrados, filtros.dataReferencia), [contasFiltradas, lancamentosFiltrados, filtros.dataReferencia]);
  const serieDiaria = useMemo(() => buildFluxoCaixaDiario({ lancamentos: lancamentosFiltrados, saldoInicialConsolidado: posicao.total, dataReferencia: filtros.dataReferencia, diasHorizonte: horizonte }), [lancamentosFiltrados, posicao.total, filtros.dataReferencia, horizonte]);
  const agregada = useMemo(() => aggregateSerie(serieDiaria, granularidade), [serieDiaria, granularidade]);
  const menor = useMemo(() => menorPontoDaSerie(serieDiaria), [serieDiaria]);
  const fim = serieDiaria[serieDiaria.length - 1];

  const entradasPeriodo = serieDiaria.reduce((s, p) => s + p.entradas, 0);
  const saidasPeriodo = serieDiaria.reduce((s, p) => s + p.saidas, 0);
  const necessidade = menor.saldo < 0 ? Math.abs(menor.saldo) : 0;

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Saldo Inicial + Entradas − Saídas = Saldo Final"
        right={
          <div className="flex items-center gap-2">
            <select value={horizonte} onChange={(e) => setHorizonte(Number(e.target.value))} className={selectCls + " w-auto"}>
              {HORIZONTES_DIAS.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
            </select>
            <select value={granularidade} onChange={(e) => setGranularidade(e.target.value)} className={selectCls + " w-auto"}>
              <option value="diaria">Diária</option><option value="semanal">Semanal</option><option value="mensal">Mensal</option>
            </select>
          </div>
        }>
        <div className="grid grid-cols-4 gap-4">
          <KPI label="Saldo Inicial" value={fmtBRL(posicao.total)} icon={Wallet} />
          <KPI label="Entradas no Período" value={fmtBRL(entradasPeriodo)} tone="positive" icon={ArrowUpRight} />
          <KPI label="Saídas no Período" value={fmtBRL(saidasPeriodo)} tone="negative" icon={ArrowDownRight} />
          <KPI label="Saldo Final" value={fmtBRL(fim?.saldo ?? posicao.total)} tone={(fim?.saldo ?? 0) < 0 ? "negative" : "neutral"} icon={TrendingUp} />
        </div>
        {necessidade > 0 && <div className="mt-3"><InfoNote tone="amber">Necessidade de caixa: {fmtBRL(necessidade)} em {fmtData(menor.data)}.</InfoNote></div>}
      </Panel>

      <Panel title={`Evolução do Caixa (${granularidade})`} subtitle={`Menor posição no horizonte: ${fmtBRL(menor.saldo)} em ${fmtData(menor.data)}`}>
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={agregada}>
            <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} interval={Math.max(0, Math.floor(agregada.length / 14))} />
            <YAxis stroke="#64748b" fontSize={11} tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} formatter={(v) => fmtBRL(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="3 3" />
            {parametros.caixaMinimo != null && <ReferenceLine y={parametros.caixaMinimo} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Mínimo", fill: "#f59e0b", fontSize: 10 }} />}
            <Bar dataKey="entradas" fill="#10b981" radius={[2, 2, 0, 0]} name="Entradas" />
            <Bar dataKey="saidas" fill="#f43f5e" radius={[2, 2, 0, 0]} name="Saídas" />
            <Line type="monotone" dataKey="saldoFim" stroke="#4f46e5" strokeWidth={2} dot={false} name="Saldo" />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}
