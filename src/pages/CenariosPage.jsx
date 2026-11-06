import React, { useState, useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Panel, Field, inputCls, InfoNote } from "../components/ui/Primitives.jsx";
import { fmtBRL, fmtBRLShort } from "../utils/formatUtils.js";
import { mesesDoPeriodo } from "../utils/dateUtils.js";
import { calcularDRE } from "../financial-engine/dre.js";
import { excluirTransferencias } from "../financial-engine/lancamentos.js";
import { calcularPosicaoConsolidada } from "../financial-engine/tesouraria.js";
import { buildFluxoCaixaDiario, menorPontoDaSerie } from "../financial-engine/fluxoCaixa.js";
import { aplicarPremissasDRE, aplicarPremissasCaixa, PREMISSAS_BASE } from "../financial-engine/cenarios.js";
import { calcularCarteiraEAging } from "../financial-engine/aging.js";

const SLIDER = ({ label, value, onChange }) => (
  <Field label={label}><input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} className={inputCls} /></Field>
);

export default function CenariosPage({ data }) {
  const { entidades, filtros } = data;
  const meses = mesesDoPeriodo(filtros);
  const [otimista, setOtimista] = useState({ receitaPct: 0, custosPct: 0, despesasPct: 0, percNaoRecebimento: 0, percAtrasoPagamento: 0 });
  const [pessimista, setPessimista] = useState({ receitaPct: 0, custosPct: 0, despesasPct: 0, percNaoRecebimento: 0, percAtrasoPagamento: 0 });

  const lancamentosPeriodo = useMemo(() => excluirTransferencias(entidades.lancamentos).filter((l) => {
    if (filtros.empresaId !== "TODAS" && l.empresaId !== filtros.empresaId) return false;
    const [ano, mes] = l.competencia.split("-").map(Number);
    return ano === filtros.anoRef && meses.includes(mes - 1);
  }), [entidades.lancamentos, filtros.empresaId, filtros.anoRef, meses]);

  const forecastDRE = useMemo(() => calcularDRE(lancamentosPeriodo.filter((l) => l.situacao !== "Cancelado"), entidades.planoDeContas), [lancamentosPeriodo, entidades.planoDeContas]);

  const contasFiltradas = entidades.contasBancarias.filter((c) => c.ativo && (filtros.empresaId === "TODAS" || c.empresaId === filtros.empresaId));
  const posicao = useMemo(() => calcularPosicaoConsolidada(contasFiltradas, entidades.lancamentos, filtros.dataReferencia), [contasFiltradas, entidades.lancamentos, filtros.dataReferencia]);
  const serie = useMemo(() => buildFluxoCaixaDiario({ lancamentos: entidades.lancamentos.filter((l) => filtros.empresaId === "TODAS" || l.empresaId === filtros.empresaId), saldoInicialConsolidado: posicao.total, dataReferencia: filtros.dataReferencia, diasHorizonte: 90 }), [entidades.lancamentos, filtros.empresaId, posicao.total, filtros.dataReferencia]);
  const menor = useMemo(() => menorPontoDaSerie(serie), [serie]);
  const caixaFim = serie[serie.length - 1]?.saldo ?? posicao.total;

  const recebiveisAbertos = useMemo(() => calcularCarteiraEAging(entidades.lancamentos.filter((l) => l.tipo === "Entrada" && !l.transferencia), filtros.dataReferencia).totalCarteira, [entidades.lancamentos, filtros.dataReferencia]);
  const pagaveisAbertos = useMemo(() => calcularCarteiraEAging(entidades.lancamentos.filter((l) => l.tipo === "Saída" && !l.transferencia), filtros.dataReferencia).totalCarteira, [entidades.lancamentos, filtros.dataReferencia]);

  const dreOtimista = aplicarPremissasDRE(forecastDRE, otimista);
  const drePessimista = aplicarPremissasDRE(forecastDRE, pessimista);
  const caixaOtimista = aplicarPremissasCaixa({ caixaProjetadoBase: caixaFim, menorProjetadoBase: menor.saldo, recebiveisEmAberto: recebiveisAbertos, pagaveisEmAberto: pagaveisAbertos }, otimista);
  const caixaPessimista = aplicarPremissasCaixa({ caixaProjetadoBase: caixaFim, menorProjetadoBase: menor.saldo, recebiveisEmAberto: recebiveisAbertos, pagaveisEmAberto: pagaveisAbertos }, pessimista);

  const chartEbitda = [
    { cenario: "Pessimista", EBITDA: drePessimista.ebitda, Resultado: drePessimista.resultadoGerencial },
    { cenario: "Base (Forecast)", EBITDA: forecastDRE.ebitda, Resultado: forecastDRE.resultadoGerencial },
    { cenario: "Otimista", EBITDA: dreOtimista.ebitda, Resultado: dreOtimista.resultadoGerencial },
  ];
  const chartCaixa = [
    { cenario: "Pessimista", "Caixa (90d)": caixaPessimista.caixaProjetado, "Menor Ponto": caixaPessimista.menorProjetado },
    { cenario: "Base", "Caixa (90d)": caixaFim, "Menor Ponto": menor.saldo },
    { cenario: "Otimista", "Caixa (90d)": caixaOtimista.caixaProjetado, "Menor Ponto": caixaOtimista.menorProjetado },
  ];

  return (
    <div className="flex flex-col gap-6">
      <InfoNote>Cenários usam só as premissas que você define abaixo — com tudo em 0%, Otimista e Pessimista ficam idênticos ao Base (Forecast).</InfoNote>

      <div className="grid grid-cols-2 gap-4">
        <Panel title="Premissas — Cenário Otimista">
          <div className="grid grid-cols-2 gap-3">
            <SLIDER label="Receita (%)" value={otimista.receitaPct} onChange={(v) => setOtimista({ ...otimista, receitaPct: v })} />
            <SLIDER label="Custos (%)" value={otimista.custosPct} onChange={(v) => setOtimista({ ...otimista, custosPct: v })} />
            <SLIDER label="Despesas (%)" value={otimista.despesasPct} onChange={(v) => setOtimista({ ...otimista, despesasPct: v })} />
            <SLIDER label="% Pagamentos adiados (melhora caixa)" value={otimista.percAtrasoPagamento} onChange={(v) => setOtimista({ ...otimista, percAtrasoPagamento: v })} />
          </div>
        </Panel>
        <Panel title="Premissas — Cenário Pessimista">
          <div className="grid grid-cols-2 gap-3">
            <SLIDER label="Receita (%)" value={pessimista.receitaPct} onChange={(v) => setPessimista({ ...pessimista, receitaPct: v })} />
            <SLIDER label="Custos (%)" value={pessimista.custosPct} onChange={(v) => setPessimista({ ...pessimista, custosPct: v })} />
            <SLIDER label="Despesas (%)" value={pessimista.despesasPct} onChange={(v) => setPessimista({ ...pessimista, despesasPct: v })} />
            <SLIDER label="% Recebimentos não confirmados" value={pessimista.percNaoRecebimento} onChange={(v) => setPessimista({ ...pessimista, percNaoRecebimento: v })} />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Panel title="Impacto sobre EBITDA e Resultado">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartEbitda}>
              <XAxis dataKey="cenario" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} formatter={(v) => fmtBRL(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="EBITDA" fill="#4f46e5" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Resultado" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Impacto sobre o Caixa (90 dias)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartCaixa}>
              <XAxis dataKey="cenario" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} formatter={(v) => fmtBRL(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Menor Ponto" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Caixa (90d)" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}
