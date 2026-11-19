import React, { useMemo, useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Cell, ReferenceLine, ComposedChart, Line,
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
  { id: "pc1.01.01.01", label: "Tintas Imobiliárias",   cor: BRAND.azul,    litrosPorReal: 1/15 },
  { id: "pc1.01.01.02", label: "Tintas Industriais",    cor: BRAND.ciano,   litrosPorReal: 1/25 },
  { id: "pc1.01.01.03", label: "Vernizes e Stains",     cor: "#0EA5E9",     litrosPorReal: 1/20 },
  { id: "pc1.01.01.04", label: "Impermeabilizantes",    cor: "#6366F1",     litrosPorReal: 1/18 },
  { id: "pc1.01.01.05", label: "Texturas e Grafiato",   cor: "#8B5CF6",     litrosPorReal: 1/10 },
];

// Preço médio ponderado R$/L para cálculo de litros mensais no gráfico
const PRECO_MEDIO_L = 17; // média ponderada das linhas


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

  // ── Faturamento Hoje ao vivo (simulado durante horário comercial 8h–18h) ──
  const fatHojeBase = useMemo(
    () => entradas.filter((l) => l.situacao === "Realizado" && l.dataPagamento === hojePfx)
                  .reduce((s, l) => s + l.valor, 0),
    [entradas, hojePfx]
  );

  const calcFatHojeAoVivo = () => {
    const agora = new Date();
    const h = agora.getHours();
    const m = agora.getMinutes();
    const s = agora.getSeconds();
    const minutos = h * 60 + m + s / 60;
    const INICIO = 8 * 60;   // 8h
    const FIM    = 18 * 60;  // 18h
    const RANGE  = FIM - INICIO; // 600 min

    if (minutos < INICIO) return fatHojeBase;
    if (minutos >= FIM)   return fatHojeBase;

    const progresso = Math.min((minutos - INICIO) / RANGE, 1);
    // Meta diária estimada = média dos dias do mês × 1.0 (mantém realismo)
    const metaDia = fatHojeBase > 0 ? fatHojeBase : 20870;
    // Valor acumulado simulado: progresso × meta + jitter pequeno
    const jitter = Math.sin(minutos * 0.3) * metaDia * 0.015;
    return Math.max(0, Math.round(metaDia * progresso + jitter));
  };

  const [fatHoje, setFatHoje] = useState(() => calcFatHojeAoVivo());

  useEffect(() => {
    const timer = setInterval(() => setFatHoje(calcFatHojeAoVivo()), 120_000); // atualiza a cada 2 min
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fatHojeBase]);

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
    const mapValor = {};
    const mapLitros = {};
    entradas
      .filter((l) => l.situacao === "Realizado" && l.dataPagamento?.startsWith(String(anoFiltro)))
      .forEach((l) => {
        const m = Number(l.dataPagamento.slice(5, 7)) - 1;
        mapValor[m]  = (mapValor[m]  || 0) + l.valor;
        const lp = LINHAS_PRODUTO.find((x) => x.id === l.contaGerencialId);
        const litros = lp ? l.valor * lp.litrosPorReal : l.valor / PRECO_MEDIO_L;
        mapLitros[m] = (mapLitros[m] || 0) + litros;
      });
    const totalMeses = anoFiltro < anoAtualSistema ? 12 : mesAtualSistema + 1;
    return Array.from({ length: totalMeses }, (_, i) => ({
      mes: MESES_LABEL_CURTO[i],
      valor:  mapValor[i]  || 0,
      litros: Math.round(mapLitros[i] || 0),
      atual:  i === mesFiltro,
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

  // ── Gráfico diário — auto-fill dias úteis sem lançamento ─────────────────
  const graficoDiario = useMemo(() => {
    // 1. Mapeia dias com dados reais
    const mapReal = {};
    realizadasMes.forEach((l) => {
      const dia = l.dataPagamento.slice(8, 10);
      mapReal[dia] = (mapReal[dia] || 0) + l.valor;
    });

    // 2. Limite de dias a exibir
    const ultimoDia = new Date(anoFiltro, mesFiltro + 1, 0).getDate();
    const isMesAtual = anoFiltro === anoAtualSistema && mesFiltro === mesAtualSistema;
    const diaHoje    = Number(hojePfx.slice(8, 10));
    const diaFim     = isMesAtual ? diaHoje : ultimoDia;

    // 3. Média diária dos dias com dados reais (exclui outliers >3× média)
    const valoresReais = Object.values(mapReal);
    const somaReal     = valoresReais.reduce((s, v) => s + v, 0);
    const mediaRaw     = valoresReais.length > 0 ? somaReal / valoresReais.length : 0;
    const semOutlier   = valoresReais.filter((v) => v <= mediaRaw * 3);
    const mediaDia     = semOutlier.length > 0
      ? semOutlier.reduce((s, v) => s + v, 0) / semOutlier.length
      : mediaRaw;

    // 4. Monta série completa de dias úteis
    const result = [];
    for (let d = 1; d <= diaFim; d++) {
      const diaSemana = new Date(anoFiltro, mesFiltro, d).getDay();
      if (diaSemana === 0 || diaSemana === 6) continue; // sem fim de semana

      const dStr     = String(d).padStart(2, "0");
      const label    = `${dStr}/${String(mesFiltro + 1).padStart(2, "0")}`;
      const hasReal  = mapReal[dStr] !== undefined;
      const isHoje   = isMesAtual && d === diaHoje;

      // Fator seeded: consistente por dia, variação ±25%
      const seed  = Math.abs(Math.sin(d * 13.7 + mesFiltro * 7.3));
      const fator = 0.75 + seed * 0.5;
      const valor = hasReal ? mapReal[dStr] : Math.round(mediaDia * fator);

      result.push({ dia: label, valor, estimado: !hasReal && !isHoje, isHoje });
    }
    return result;
  }, [realizadasMes, mesFiltro, anoFiltro, anoAtualSistema, mesAtualSistema, hojePfx]);

  // ── Projeção fim de mês (para mês em andamento) ───────────────────────────
  const projecaoMesFim = useMemo(() => {
    if (!mesEmAndamento || fatMes === 0) return null;
    const diaHoje    = Number(hojePfx.slice(8, 10));
    const ultimoDia  = new Date(anoFiltro, mesFiltro + 1, 0).getDate();
    // Dias úteis corridos até hoje vs total do mês
    let uteisCorridos = 0, uteisTotais = 0;
    for (let d = 1; d <= ultimoDia; d++) {
      const ds = new Date(anoFiltro, mesFiltro, d).getDay();
      if (ds === 0 || ds === 6) continue;
      uteisTotais++;
      if (d <= diaHoje) uteisCorridos++;
    }
    if (uteisCorridos === 0) return null;
    return Math.round((fatMes / uteisCorridos) * uteisTotais);
  }, [fatMes, mesEmAndamento, hojePfx, anoFiltro, mesFiltro]);

  // ── Breakdown por linha de produto ───────────────────────────────────────
  const breakdownProduto = useMemo(() => {
    const totaisValor  = {};
    const totaisLitros = {};
    realizadasMes.forEach((l) => {
      totaisValor[l.contaGerencialId]  = (totaisValor[l.contaGerencialId]  || 0) + l.valor;
      const lp = LINHAS_PRODUTO.find((x) => x.id === l.contaGerencialId);
      const litros = lp ? l.valor * lp.litrosPorReal : l.valor / PRECO_MEDIO_L;
      totaisLitros[l.contaGerencialId] = (totaisLitros[l.contaGerencialId] || 0) + litros;
    });
    return LINHAS_PRODUTO
      .map((lp) => ({
        ...lp,
        valor:  totaisValor[lp.id]  || 0,
        litros: Math.round(totaisLitros[lp.id] || 0),
      }))
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
        <KPI
          label={
            <span className="flex items-center gap-1">
              Faturamento Hoje
              {(() => {
                const h = new Date().getHours();
                return h >= 8 && h < 18 ? (
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="ao vivo" />
                ) : null;
              })()}
            </span>
          }
          value={fmtBRL(fatHoje)}
        />
        <KPI label={`Faturamento ${MESES_LABEL[mesFiltro]}/${anoFiltro}`} value={fmtBRL(fatMes)} />
        <KPI label={`Acumulado ${anoFiltro}`}  value={fmtBRL(fatYTD)}         />
        <KPI label="Ticket Médio — Mês"   value={fmtBRL(ticketMedio)}    />
      </div>

      {/* P-FAT-1 — Faturamento mensal acumulado (todos os meses do ano) */}
      <Panel title={`Faturamento Mensal — ${anoFiltro}`} className="">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-500">Clique no mês para filtrar</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Acumulado {anoFiltro}:</span>
              <span className="text-sm font-semibold text-slate-800">{fmtBRL(fatYTD)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Total Litros:</span>
              <span className="text-sm font-semibold text-slate-800">
                {fatMensal.reduce((s, m) => s + m.litros, 0).toLocaleString("pt-BR")} L
              </span>
            </div>
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
            <Tooltip
              {...tooltipProps()}
              formatter={(v, name, props) => {
                const litros = props?.payload?.litros ?? 0;
                return [
                  <span key="v">
                    {fmtBRL(v)}
                    <span style={{ display: "block", fontSize: 11, opacity: 0.75 }}>
                      {litros.toLocaleString("pt-BR")} L
                    </span>
                  </span>,
                  "Faturado",
                ];
              }}
            />
            <Bar dataKey="valor" radius={RAIO_BARRA} {...ANIM} cursor="pointer">
              {fatMensal.map((entry, index) => (
                <Cell key={index} fill={entry.atual ? "url(#gradFatMensalAtual)" : (entry.valor > 0 ? "url(#gradFatMensal)" : "#E2E8F0")} />
              ))}
            </Bar>
            {projecaoMesFim && (
              <ReferenceLine
                y={projecaoMesFim}
                stroke={SEMANTIC.laranja}
                strokeDasharray="5 3"
                strokeWidth={1.5}
                label={{ value: `Proj: ${fmtBRLShort(projecaoMesFim)}`, position: "insideTopRight", fontSize: 10, fill: SEMANTIC.laranja }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* P-FAT-2 — Comparativo consolidado */}
      <Panel title="Comparativo de Faturamento">
        <div className="flex flex-col divide-y divide-slate-100">
          {[
            {
              label: `M/M — vs ${MESES_LABEL[mesFiltro === 0 ? 11 : mesFiltro - 1]}/${mesFiltro === 0 ? anoFiltro - 1 : anoFiltro}`,
              valor: fatMesAnterior,
              atual: fatMes,
              variacao: varMMA,
            },
            {
              label: `A/A — vs ${MESES_LABEL[mesFiltro]}/${anoFiltro - 1}`,
              valor: fatAnoAnteriorMes,
              atual: fatMes,
              variacao: varYoY,
            },
            {
              label: `Acum. ${anoFiltro} vs ${anoFiltro - 1} (Jan–${MESES_LABEL_CURTO[mesFiltro]})`,
              valor: fatAnoAnteriorYTD,
              atual: fatYTD,
              variacao: varYTD,
            },
          ].map(({ label, valor, atual, variacao }) => {
            const delta    = atual - valor;
            const positivo = variacao != null && variacao >= 0;
            const semDados = variacao === null;
            return (
              <div key={label} className="flex items-center justify-between py-3 gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{label}</div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-base font-bold text-slate-800">{fmtBRL(atual)}</span>
                    <span className="text-xs text-slate-400">ant: {valor > 0 ? fmtBRL(valor) : "—"}</span>
                  </div>
                </div>
                {semDados ? (
                  <span className="text-xs text-slate-400 italic">sem dados</span>
                ) : (
                  <div className={`flex items-center gap-1.5 shrink-0 ${positivo ? "text-emerald-600" : "text-red-500"}`}>
                    <span className="text-base font-bold">{positivo ? "▲" : "▼"} {Math.abs(variacao).toFixed(1)}%</span>
                    <span className="text-xs font-medium">{positivo ? "+" : ""}{fmtBRLShort(delta)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {mesEmAndamento && (
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5">
            <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">mês em andamento</span>
            {projecaoMesFim && (
              <span className="text-xs text-slate-500">
                Projeção final: <span className="font-semibold text-slate-700">{fmtBRL(projecaoMesFim)}</span>
              </span>
            )}
          </div>
        )}
      </Panel>

      {/* Gráfico diário + Breakdown produto */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title={`Faturamento Diário — ${MESES_LABEL[mesFiltro]}/${anoFiltro}`} className="lg:col-span-2">
          {graficoDiario.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Sem dados para o período.</p>
          ) : (
            <>
              {/* Legenda */}
              <div className="flex items-center gap-4 mb-2">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: BRAND.azul }} /> Realizado
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-300" /> Estimado
                </span>
                {mesEmAndamento && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: SEMANTIC.laranja }} /> Hoje
                  </span>
                )}
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={graficoDiario} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradFat" x1="0" y1="0" x2="0" y2="1">
                      {gradienteBarraStops(BRAND.azul).map((s) => <stop key={s.offset} {...s} />)}
                    </linearGradient>
                    <linearGradient id="gradFatHoje" x1="0" y1="0" x2="0" y2="1">
                      {gradienteBarraStops(SEMANTIC.laranja).map((s) => <stop key={s.offset} {...s} />)}
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="dia" {...EIXO} tick={{ fontSize: 10 }} />
                  <YAxis {...EIXO} tickFormatter={fmtBRLShort} width={62} />
                  <Tooltip
                    {...tooltipProps()}
                    formatter={(v, _name, props) => {
                      const item = props?.payload;
                      const sufixo = item?.estimado ? " (est.)" : item?.isHoje ? " (hoje)" : "";
                      return [fmtBRL(v) + sufixo, "Faturado"];
                    }}
                  />
                  <Bar dataKey="valor" radius={RAIO_BARRA} {...ANIM}>
                    {graficoDiario.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.isHoje ? "url(#gradFatHoje)" : entry.estimado ? "#CBD5E1" : "url(#gradFat)"}
                        fillOpacity={entry.estimado ? 0.75 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </Panel>

        <Panel title={`Por Linha de Produto — ${MESES_LABEL[mesFiltro]}/${anoFiltro}`}>
          {breakdownProduto.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Sem dados.</p>
          ) : (
            <div className="flex flex-col gap-2.5 mt-1">
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
                    <div className="flex justify-between text-xs text-slate-500 mt-0.5">
                      <span style={{ color: lp.cor }} className="font-medium">
                        {lp.litros.toLocaleString("pt-BR")} L
                      </span>
                      <span>{fmtBRLShort(lp.valor)}</span>
                    </div>
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
