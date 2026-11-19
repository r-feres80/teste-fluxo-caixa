import React, { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { Panel, KPI, selectCls } from "../components/ui/Primitives.jsx";
import { fmtBRL, fmtBRLShort, fmtData } from "../utils/formatUtils.js";
import { getDataAtualSistema } from "../utils/dateUtils.js";
import {
  BRAND, SEMANTIC, tooltipProps, gradienteBarraStops,
  GRID, EIXO, ANIM, RAIO_BARRA,
} from "../utils/chartTheme.js";

// ─── Constantes de período ────────────────────────────────────────────────────
const ANOS = [2024, 2025, 2026, 2027];
const MESES_LABEL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MESES_LABEL_CURTO = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ─── Plano de contas de receita ───────────────────────────────────────────────
const LINHAS_PRODUTO = [
  { id: "pc1.01.01.01", label: "Tintas Imobiliárias",   cor: BRAND.azul },
  { id: "pc1.01.01.02", label: "Tintas Industriais",    cor: BRAND.ciano },
  { id: "pc1.01.01.03", label: "Vernizes e Stains",     cor: "#0EA5E9" },
  { id: "pc1.01.01.04", label: "Impermeabilizantes",    cor: "#6366F1" },
  { id: "pc1.01.01.05", label: "Texturas e Grafiato",   cor: "#8B5CF6" },
];


export default function FaturamentoPage({ data }) {
  const hoje = getDataAtualSistema();
  const [anoFiltro, setAnoFiltro] = useState(Number(hoje.slice(0, 4)));
  const [mesFiltro, setMesFiltro] = useState(Number(hoje.slice(5, 7)) - 1); // 0-based

  const { entidades } = data ?? {};

  const anoAtualSistema = Number(hoje.slice(0, 4));
  const mesAtualSistema = Number(hoje.slice(5, 7)) - 1; // 0-based
  const mesEmAndamento  = mesFiltro === mesAtualSistema && anoFiltro === anoAtualSistema;

  const anoMesPfx = `${anoFiltro}-${String(mesFiltro + 1).padStart(2, "0")}`;
  const hojePfx = hoje.slice(0, 10);

  // ── Base: só lançamentos de Entrada (receitas)
  const entradas = useMemo(
    () => (entidades?.lancamentos ?? []).filter((l) => l.tipo === "Entrada" && !l.transferencia),
    [entidades?.lancamentos]
  );

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const fatHoje = useMemo(
    () => entradas.filter((l) => l.situacao === "Realizado" && l.dataPagamento === hojePfx)
                  .reduce((s, l) => s + l.valor, 0),
    [entradas, hojePfx]
  );

  const fatMes = useMemo(
    () => entradas.filter((l) => l.situacao === "Realizado" && l.dataPagamento?.startsWith(anoMesPfx))
                  .reduce((s, l) => s + l.valor, 0),
    [entradas, anoMesPfx]
  );

  const fatYTD = useMemo(
    () => entradas.filter((l) => l.situacao === "Realizado" && l.dataPagamento?.startsWith(String(anoFiltro)))
                  .reduce((s, l) => s + l.valor, 0),
    [entradas, anoFiltro]
  );

  const realizadasMes = useMemo(
    () => entradas.filter((l) => l.situacao === "Realizado" && l.dataPagamento?.startsWith(anoMesPfx)),
    [entradas, anoMesPfx]
  );
  const ticketMedio = realizadasMes.length > 0 ? fatMes / realizadasMes.length : 0;

  // ── Faturamento mensal acumulado (todos os meses do ano) ──────────────────
  const fatMensal = useMemo(() => {
    const map = {};
    entradas
      .filter((l) => l.situacao === "Realizado" && l.dataPagamento?.startsWith(String(anoFiltro)))
      .forEach((l) => {
        const m = Number(l.dataPagamento.slice(5, 7)) - 1; // 0-based
        map[m] = (map[m] || 0) + l.valor;
      });
    // Não exibe meses futuros no ano corrente
    const totalMeses = anoFiltro < anoAtualSistema ? 12 : mesAtualSistema + 1;
    return Array.from({ length: totalMeses }, (_, i) => ({
      mes: MESES_LABEL_CURTO[i],
      valor: map[i] || 0,
      atual: i === mesFiltro,
    }));
  }, [entradas, anoFiltro, mesFiltro, anoAtualSistema, mesAtualSistema]);

  // ── Comparativo Mês/Ano anterior ─────────────────────────────────────────
  const mesAnteriorPfx = (() => {
    const d = new Date(anoFiltro, mesFiltro - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();
  const anoAnteriorMesPfx = `${anoFiltro - 1}-${String(mesFiltro + 1).padStart(2, "0")}`;

  const fatMesAnterior = useMemo(
    () => entradas.filter((l) => l.situacao === "Realizado" && l.dataPagamento?.startsWith(mesAnteriorPfx))
                  .reduce((s, l) => s + l.valor, 0),
    [entradas, mesAnteriorPfx]
  );
  const fatAnoAnteriorMes = useMemo(
    () => entradas.filter((l) => l.situacao === "Realizado" && l.dataPagamento?.startsWith(anoAnteriorMesPfx))
                  .reduce((s, l) => s + l.valor, 0),
    [entradas, anoAnteriorMesPfx]
  );
  // YTD do ano anterior até o mesmo mês (Jan–mesFiltro), para comparação justa
  const fatAnoAnteriorYTD = useMemo(
    () => entradas
      .filter((l) => {
        if (l.situacao !== "Realizado" || !l.dataPagamento?.startsWith(String(anoFiltro - 1))) return false;
        return Number(l.dataPagamento.slice(5, 7)) <= mesFiltro + 1;
      })
      .reduce((s, l) => s + l.valor, 0),
    [entradas, anoFiltro, mesFiltro]
  );

  const varMMA  = fatMesAnterior  > 0 ? ((fatMes - fatMesAnterior)  / fatMesAnterior)  * 100 : null;
  const varYoY  = fatAnoAnteriorMes > 0 ? ((fatMes - fatAnoAnteriorMes) / fatAnoAnteriorMes) * 100 : null;
  const varYTD  = fatAnoAnteriorYTD > 0 ? ((fatYTD - fatAnoAnteriorYTD) / fatAnoAnteriorYTD) * 100 : null;

  // ── Gráfico diário do mês selecionado ────────────────────────────────────
  const graficoDiario = useMemo(() => {
    const map = {};
    realizadasMes.forEach((l) => {
      const dia = l.dataPagamento.slice(8, 10);
      map[dia] = (map[dia] || 0) + l.valor;
    });
    return Object.entries(map)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([dia, valor]) => ({ dia: `${dia}/${String(mesFiltro + 1).padStart(2, "0")}`, valor }));
  }, [realizadasMes, mesFiltro]);

  // ── Breakdown por linha de produto ───────────────────────────────────────
  const breakdownProduto = useMemo(() => {
    const totais = {};
    realizadasMes.forEach((l) => {
      totais[l.contaGerencialId] = (totais[l.contaGerencialId] || 0) + l.valor;
    });
    return LINHAS_PRODUTO
      .map((lp) => ({ ...lp, valor: totais[lp.id] || 0 }))
      .filter((lp) => lp.valor > 0)
      .sort((a, b) => b.valor - a.valor);
  }, [realizadasMes]);

  const nomeCliente = (id) => {
    const c = entidades?.clientes?.find((x) => x.id === id);
    return c?.nome || id || "—";
  };
  const nomeConta = (id) => LINHAS_PRODUTO.find((x) => x.id === id)?.label || id;

  // ── Breakdown por cliente ─────────────────────────────────────────────────
  const breakdownClientes = useMemo(() => {
    const totais = {};
    realizadasMes.forEach((l) => {
      if (!l.clienteFornecedorId) return;
      if (!totais[l.clienteFornecedorId]) {
        totais[l.clienteFornecedorId] = { valor: 0, contas: {} };
      }
      totais[l.clienteFornecedorId].valor += l.valor;
      totais[l.clienteFornecedorId].contas[l.contaGerencialId] =
        (totais[l.clienteFornecedorId].contas[l.contaGerencialId] || 0) + l.valor;
    });
    const total = Object.values(totais).reduce((acc, d) => acc + d.valor, 0);
    return Object.entries(totais)
      .map(([id, d]) => {
        // Linha principal = conta com maior valor faturado para este cliente
        const contaId = Object.entries(d.contas).sort(([, a], [, b]) => b - a)[0][0];
        return { id, valor: d.valor, contaId, pct: total > 0 ? (d.valor / total) * 100 : 0 };
      })
      .sort((a, b) => b.valor - a.valor);
  }, [realizadasMes]);



  return (
    <div className="flex flex-col gap-6">

      {/* Filtro período */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Mês</span>
          <select value={mesFiltro} onChange={(e) => setMesFiltro(Number(e.target.value))} className={selectCls}>
            {MESES_LABEL.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ano</span>
          <select value={anoFiltro} onChange={(e) => setAnoFiltro(Number(e.target.value))} className={selectCls}>
            {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Faturamento Hoje"    value={fmtBRL(fatHoje)}        />
        <KPI label={`Faturamento ${MESES_LABEL[mesFiltro]}/${anoFiltro}`} value={fmtBRL(fatMes)} />
        <KPI label={`Acumulado ${anoFiltro}`}  value={fmtBRL(fatYTD)}         />
        <KPI label="Ticket Médio / NF"   value={fmtBRL(ticketMedio)}    />
      </div>

      {/* P-FAT-1 — Faturamento mensal acumulado (todos os meses do ano) */}
      <Panel title={`Faturamento Mensal — ${anoFiltro}`} className="">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-500">Clique no mês para filtrar</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Acumulado {anoFiltro}:</span>
            <span className="text-sm font-semibold text-slate-800">{fmtBRL(fatYTD)}</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={fatMensal} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            onClick={(d) => { if (d?.activeTooltipIndex != null) setMesFiltro(d.activeTooltipIndex); }}>
            <defs>
              <linearGradient id="gradFatMensal" x1="0" y1="0" x2="0" y2="1">
                {gradienteBarraStops(BRAND.azul).map((s) => <stop key={s.offset} {...s} />)}
              </linearGradient>
              <linearGradient id="gradFatMensalAtual" x1="0" y1="0" x2="0" y2="1">
                {gradienteBarraStops(SEMANTIC.laranja).map((s) => <stop key={s.offset} {...s} />)}
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="mes" {...EIXO} tick={{ fontSize: 11 }} />
            <YAxis {...EIXO} tickFormatter={fmtBRLShort} width={62} />
            <Tooltip {...tooltipProps()} formatter={(v) => [fmtBRL(v), "Faturado"]} />
            <Bar dataKey="valor" radius={RAIO_BARRA} {...ANIM} cursor="pointer">
              {fatMensal.map((entry, index) => (
                <Cell key={index} fill={entry.atual ? "url(#gradFatMensalAtual)" : (entry.valor > 0 ? "url(#gradFatMensal)" : "#E2E8F0")} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* P-FAT-2 — Comparativo Mês / Ano anterior */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: `M/M — vs ${MESES_LABEL[mesFiltro === 0 ? 11 : mesFiltro - 1]}/${mesFiltro === 0 ? anoFiltro - 1 : anoFiltro}`,
            valor: fatMesAnterior,
            atual: fatMes,
            variacao: varMMA,
            parcial: mesEmAndamento,
          },
          {
            label: `A/A — vs ${MESES_LABEL[mesFiltro]}/${anoFiltro - 1}`,
            valor: fatAnoAnteriorMes,
            atual: fatMes,
            variacao: varYoY,
            parcial: mesEmAndamento,
          },
          {
            label: `Acum. ${anoFiltro} vs ${anoFiltro - 1}`,
            valor: fatAnoAnteriorYTD,
            atual: fatYTD,
            variacao: varYTD,
            parcial: mesEmAndamento,
          },
        ].map(({ label, valor, atual, variacao, parcial }) => {
          const delta = atual - valor;
          const positivo = variacao != null && variacao >= 0;
          const semDados = variacao === null;
          return (
            <div key={label} className="bg-white border border-slate-100 rounded-xl p-4 flex flex-col gap-2 shadow-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide leading-tight">{label}</span>
                {parcial && <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">em andamento</span>}
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className="text-lg font-bold text-slate-800">{fmtBRL(atual)}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Anterior: {valor > 0 ? fmtBRL(valor) : "—"}</div>
                </div>
                {semDados ? (
                  <span className="text-xs text-slate-400 italic">sem dados</span>
                ) : (
                  <div className={`flex flex-col items-end gap-0.5 ${positivo ? "text-emerald-600" : "text-red-500"}`}>
                    <span className="text-xl font-bold leading-none">{positivo ? "▲" : "▼"}</span>
                    <span className="text-sm font-semibold">{Math.abs(variacao).toFixed(1)}%</span>
                    <span className="text-xs">{positivo ? "+" : ""}{fmtBRLShort(delta)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráfico diário + Breakdown produto */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title={`Faturamento Diário — ${MESES_LABEL[mesFiltro]}/${anoFiltro}`} className="lg:col-span-2">
          {graficoDiario.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Sem dados para o período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={graficoDiario} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradFat" x1="0" y1="0" x2="0" y2="1">
                    {gradienteBarraStops(BRAND.azul).map((s) => <stop key={s.offset} {...s} />)}
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="dia" {...EIXO} tick={{ fontSize: 10 }} />
                <YAxis {...EIXO} tickFormatter={fmtBRLShort} width={62} />
                <Tooltip {...tooltipProps()} formatter={(v) => [fmtBRL(v), "Faturado"]} />
                <Bar dataKey="valor" fill="url(#gradFat)" radius={RAIO_BARRA} {...ANIM} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title={`Por Linha de Produto — ${MESES_LABEL[mesFiltro]}/${anoFiltro}`}>
          {breakdownProduto.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Sem dados.</p>
          ) : (
            <div className="flex flex-col gap-2 mt-1">
              {breakdownProduto.map((lp) => {
                const pct = fatMes > 0 ? (lp.valor / fatMes) * 100 : 0;
                return (
                  <div key={lp.id}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-700 truncate max-w-[70%]">{lp.label}</span>
                      <span className="font-medium text-slate-800">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: lp.cor }} />
                    </div>
                    <div className="text-right text-xs text-slate-500 mt-0.5">{fmtBRLShort(lp.valor)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Clientes Faturados */}
      <Panel title={`Clientes Faturados — ${MESES_LABEL[mesFiltro]}/${anoFiltro}`}>
        {breakdownClientes.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">Sem dados para o período.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide pb-2 pr-4">Cliente</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide pb-2 pr-4">Linha Principal</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide pb-2 pr-4">Valor</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide pb-2">% do Total</th>
                </tr>
              </thead>
              <tbody>
                {breakdownClientes.map((c, idx) => (
                  <tr key={c.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2 pr-4 font-medium text-slate-800">{nomeCliente(c.id)}</td>
                    <td className="py-2 pr-4 text-slate-500 text-xs">{nomeConta(c.contaId)}</td>
                    <td className="py-2 pr-4 text-right font-semibold text-slate-800">{fmtBRL(c.valor)}</td>
                    <td className="py-2 text-right">
                      <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded ${c.pct >= 20 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                        {c.pct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td colSpan={2} className="pt-2 text-xs text-slate-500 font-medium">{breakdownClientes.length} cliente{breakdownClientes.length !== 1 ? "s" : ""}</td>
                  <td className="pt-2 text-right font-bold text-slate-800">{fmtBRL(breakdownClientes.reduce((s, c) => s + c.valor, 0))}</td>
                  <td className="pt-2 text-right text-xs font-medium text-slate-600">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Panel>

    </div>
  );
}
