import React, { useMemo, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { Panel, InfoNote } from "../components/ui/Primitives.jsx";
import { TabelaArvoreOrcadoRealizado } from "../components/orcadoRealizadoTree.jsx";
import { fmtBRL, fmtBRLShort, fmtData } from "../utils/formatUtils.js";
import { mesesDoPeriodo } from "../utils/dateUtils.js";
import { calcularPosicaoConsolidada } from "../financial-engine/tesouraria.js";
import { buildFluxoCaixaDiario, menorPontoDaSerie } from "../financial-engine/fluxoCaixa.js";
import { construirOrcadoRealizado } from "../financial-engine/orcadoRealizado.js";

export default function ForecastPage({ data }) {
  const { entidades, filtros, parametros } = data;
  const meses = mesesDoPeriodo(filtros);
  const [expandidos, setExpandidos] = useState(new Set(entidades.planoDeContas.map((c) => c.id)));
  const toggle = (id) => setExpandidos((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const contasFiltradas = entidades.contasBancarias.filter((c) => c.ativo && (filtros.empresaId === "TODAS" || c.empresaId === filtros.empresaId));
  const lancamentosFiltrados = entidades.lancamentos.filter((l) => filtros.empresaId === "TODAS" || l.empresaId === filtros.empresaId);
  const posicao = useMemo(() => calcularPosicaoConsolidada(contasFiltradas, lancamentosFiltrados, filtros.dataReferencia), [contasFiltradas, lancamentosFiltrados, filtros.dataReferencia]);
  const serie90 = useMemo(() => buildFluxoCaixaDiario({ lancamentos: lancamentosFiltrados, saldoInicialConsolidado: posicao.total, dataReferencia: filtros.dataReferencia, diasHorizonte: 90 }), [lancamentosFiltrados, posicao.total, filtros.dataReferencia]);
  const menor = useMemo(() => menorPontoDaSerie(serie90), [serie90]);

  const arvore = useMemo(() => construirOrcadoRealizado({
    planoDeContas: entidades.planoDeContas, orcamentoItens: entidades.orcamentoItens, lancamentos: entidades.lancamentos,
    ano: filtros.anoRef, meses, empresaId: filtros.empresaId,
  }), [entidades.planoDeContas, entidades.orcamentoItens, entidades.lancamentos, filtros.anoRef, meses, filtros.empresaId]);

  const chartData = serie90.map((p) => ({ data: p.data.slice(8, 10), saldo: p.saldo }));

  return (
    <div className="flex flex-col gap-6">
      <InfoNote>Forecast = Realizado até a Data de Referência + Previsão futura (Previsto/Em aberto). Nunca considera Realizado em data futura.</InfoNote>

      <Panel title="Projeção de Caixa — 90 dias" subtitle={`Menor posição: ${fmtBRL(menor.saldo)} em ${fmtData(menor.data)}`}>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData}>
            <defs><linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f46e5" stopOpacity={0.2} /><stop offset="100%" stopColor="#4f46e5" stopOpacity={0} /></linearGradient></defs>
            <XAxis dataKey="data" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} minTickGap={20} />
            <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} width={56} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} formatter={(v) => fmtBRL(v)} />
            <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="2 4" />
            <Area type="monotone" dataKey="saldo" stroke="#4f46e5" fill="url(#gradForecast)" strokeWidth={1.75} />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Realizado x Orçado x Forecast" subtitle="Clique numa linha com subcontas para expandir/recolher (Grupo → Subgrupo → Conta)">
        <TabelaArvoreOrcadoRealizado arvore={arvore} expandidos={expandidos} toggle={toggle} parametros={parametros} />
      </Panel>
    </div>
  );
}
