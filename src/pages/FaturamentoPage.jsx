import React, { useMemo, useState } from "react";
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

// Meta histórica 2025 (Jan–Jun) — meses sem lançamentos reais no dataset
// Valores calibrados para consistência com H2/2025 real (Jul–Dez) e H1/2026 observado.
// Declarado em escopo de módulo (regra TDZ: nunca dentro do componente se usado em useMemo).
const META_HISTORICO_2025 = {
  0: 158000, // Jan
  1: 171000, // Fev
  2: 207000, // Mar
  3: 234000, // Abr
  4: 221000, // Mai
  5: 189000, // Jun
};


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

  // ── Faturamento Hoje — valor real realizado (mesmo critério do Dashboard) ──
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

  // ── Orçamento por mês (precisa estar antes de fatMensal — evitar TDZ) ─────
  const orcItens = useMemo(
    () => (entidades?.orcamentoItens ?? []).filter(
      (o) => o.ano === anoFiltro && o.contaGerencialId.startsWith("pc1.01.01")
    ),
    [entidades?.orcamentoItens, anoFiltro]
  );

  const orcPorMes = useMemo(() => {
    const map = {};
    orcItens.forEach((o) => {
      map[o.mes] = (map[o.mes] || 0) + o.valor;
    });
    return map;
  }, [orcItens]);

  // ── Faturamento mensal acumulado (todos os meses do ano) ──────────────────
  const fatMensal = useMemo(() => {
    const mapValor = {}, mapLitros = {}, mapMeta = {};
    entradas
      .filter((l) => l.situacao === "Realizado" && l.dataPagamento?.startsWith(String(anoFiltro)))
      .forEach((l) => {
        const m = Number(l.dataPagamento.slice(5, 7)) - 1;
        mapValor[m]  = (mapValor[m]  || 0) + l.valor;
        const lp = LINHAS_PRODUTO.find((x) => x.id === l.contaGerencialId);
        const litros = lp ? l.valor * lp.litrosPorReal : l.valor / PRECO_MEDIO_L;
        mapLitros[m] = (mapLitros[m] || 0) + litros;
      });
    // Meta = mesmo mês do ano anterior (linha de referência no gráfico)
    entradas
      .filter((l) => l.situacao === "Realizado" && l.dataPagamento?.startsWith(String(anoFiltro - 1)))
      .forEach((l) => {
        const m = Number(l.dataPagamento.slice(5, 7)) - 1;
        mapMeta[m] = (mapMeta[m] || 0) + l.valor;
      });
    // Fallback: se anoFiltro-1 === 2025, substituir Jan–Jun por histórico estático
    // Override incondicional: Jan-Jun/2025 não tem dados reais (entradas residuais como
    // s76 eram espúrias e foram removidas; override garante linha de meta completa).
    if (anoFiltro - 1 === 2025) {
      Object.entries(META_HISTORICO_2025).forEach(([m, v]) => {
        mapMeta[Number(m)] = v; // incondicional para Jan–Jun
      });
    }
    const totalMeses = anoFiltro < anoAtualSistema ? 12 : mesAtualSistema + 1;
    return Array.from({ length: totalMeses }, (_, i) => ({
      mes:    MESES_LABEL_CURTO[i],
      valor:  mapValor[i]  || 0,
      litros: Math.round(mapLitros[i] || 0),
      meta:   mapMeta[i]   || null, // referência ano anterior
      orcado: orcPorMes[i] || 0,
      atual:  i === mesFiltro,
    }));
  }, [entradas, anoFiltro, mesFiltro, anoAtualSistema, mesAtualSistema, orcPorMes]);

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

  // ── Orçamento vs Realizado (orcItens/orcPorMes declarados acima de fatMensal) ─
  const orcMes = orcPorMes[mesFiltro] ?? 0;

  const orcYTD = useMemo(
    () => Array.from({ length: mesFiltro + 1 }, (_, i) => orcPorMes[i] || 0)
              .reduce((s, v) => s + v, 0),
    [orcPorMes, mesFiltro]
  );

  const varOrcMes = orcMes > 0 ? ((fatMes - orcMes) / orcMes) * 100 : null;
  const varOrcYTD = orcYTD > 0 ? ((fatYTD - orcYTD) / orcYTD) * 100 : null;

  // ── Gráfico diário — apenas dias com lançamento real (+ hoje) ───────────
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

    // 3. Média dos dias reais (exclui outliers >3× média — só pra calcular cap)
    const valoresReais = Object.values(mapReal);
    const somaReal     = valoresReais.reduce((s, v) => s + v, 0);
    const mediaRaw     = valoresReais.length > 0 ? somaReal / valoresReais.length : 0;
    const semOutlier   = valoresReais.filter((v) => v <= mediaRaw * 3);
    const mediaDia     = semOutlier.length > 0
      ? semOutlier.reduce((s, v) => s + v, 0) / semOutlier.length
      : mediaRaw;

    // 4. Só dias úteis com dado real (ou hoje)
    const result = [];
    for (let d = 1; d <= diaFim; d++) {
      const diaSemana = new Date(anoFiltro, mesFiltro, d).getDay();
      if (diaSemana === 0 || diaSemana === 6) continue;

      const dStr    = String(d).padStart(2, "0");
      const hasReal = mapReal[dStr] !== undefined;
      const isHoje  = isMesAtual && d === diaHoje;

      // Só inclui dias com dado real ou o dia atual (mesmo sem dado ainda)
      if (!hasReal && !isHoje) continue;

      const label    = `${dStr}/${String(mesFiltro + 1).padStart(2, "0")}`;
      const valorReal = hasReal ? mapReal[dStr] : 0;
      const isOutlier = hasReal && valorReal > mediaDia * 3;
      // Capa outlier para display — valor real aparece só no tooltip
      const valor     = isOutlier ? Math.round(mediaDia * 3.05) : valorReal;

      result.push({ dia: label, valor, valorReal, isHoje, isOutlier });
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
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs text-slate-500">Clique no mês para filtrar</span>
            {orcMes > 0 || fatMensal.some(m => m.orcado > 0) ? (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <span className="inline-block w-6 border-t-2 border-dashed" style={{ borderColor: "#F59E0B" }} />
                Orçado {anoFiltro}
              </span>
            ) : fatMensal.some(m => m.meta) ? (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <span className="inline-block w-6 border-t border-dashed" style={{ borderColor: "#8B5CF6" }} />
                Meta ({anoFiltro - 1})
              </span>
            ) : null}
          </div>
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
        <ResponsiveContainer width="100%" height={190}>
          <ComposedChart data={fatMensal} margin={{ top: 4, right: 8, left: 2, bottom: 0 }}
            onClick={(d) => { if (d?.activeTooltipIndex != null) setMesFiltro(d.activeTooltipIndex); }}>
            <defs>
              <linearGradient id="gradFatMensal" x1="0" y1="0" x2="0" y2="1">
                {gradienteBarraStops(BRAND.azul).map((s) => <stop key={s.offset} {...s} />)}
              </linearGradient>
              <linearGradient id="gradFatMensalAtual" x1="0" y1="0" x2="0" y2="1">
                {gradienteBarraStops(SEMANTIC.laranja).map((s) => <stop key={s.offset} {...s} />)}
              </linearGradient>
              <linearGradient id="gradFatMensalMeta" x1="0" y1="0" x2="0" y2="1">
                {gradienteBarraStops(SEMANTIC.verde).map((s) => <stop key={s.offset} {...s} />)}
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="mes" {...EIXO} tick={{ fontSize: 11 }} />
            <YAxis {...EIXO} tickFormatter={fmtBRLShort} width={65} />
            <Tooltip
              {...tooltipProps()}
              formatter={(v, name, props) => {
                if (name === "orcado") return v ? [fmtBRL(v), `Orçado ${anoFiltro}`] : [null, null];
                if (name === "meta") return v ? [fmtBRL(v), `Meta (${anoFiltro - 1})`] : [null, null];
                const litros = props?.payload?.litros ?? 0;
                const orcRef = props?.payload?.orcado;
                const bateu  = orcRef > 0 ? v >= orcRef : (props?.payload?.meta && v >= props.payload.meta);
                return [
                  <span key="v">
                    {fmtBRL(v)}
                    {litros > 0 && <span style={{ display: "block", fontSize: 11, opacity: 0.75 }}>{litros.toLocaleString("pt-BR")} L</span>}
                    {bateu && <span style={{ display: "block", fontSize: 11, color: SEMANTIC.verde }}>✓ orçamento atingido</span>}
                  </span>,
                  "Faturado",
                ];
              }}
            />
            <Bar dataKey="valor" radius={RAIO_BARRA} {...ANIM} cursor="pointer">
              {fatMensal.map((entry, index) => {
                const bateuMeta = entry.meta && entry.valor >= entry.meta;
                const fill = entry.atual
                  ? "url(#gradFatMensalAtual)"
                  : bateuMeta
                    ? "url(#gradFatMensalMeta)"
                    : entry.valor > 0 ? "url(#gradFatMensal)" : "#E2E8F0";
                return <Cell key={index} fill={fill} />;
              })}
            </Bar>
            {/* Linha de orçado (orçamento do ano corrente) */}
            {fatMensal.some(m => m.orcado > 0) && (
              <Line
                dataKey="orcado"
                type="monotone"
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={true}
                name="orcado"
              />
            )}
            {/* Linha de meta (ano anterior) — fallback quando não há orçamento */}
            {!fatMensal.some(m => m.orcado > 0) && fatMensal.some(m => m.meta) && (
              <Line
                dataKey="meta"
                type="monotone"
                stroke="#8B5CF6"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={{ fill: "#8B5CF6", r: 2.5, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
                connectNulls={false}
                name="meta"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>

      {/* P-FAT-2 — Comparativo consolidado — 2 cards Orçado + 3 KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Cards Realizado vs Orçado */}
        {[
          {
            key: "orc-mes",
            titulo: `Realizado vs Orçado`,
            label: `${MESES_LABEL[mesFiltro]}/${anoFiltro}`,
            orçado: orcMes,
            atual: fatMes,
            variacao: varOrcMes,
            showAndamento: mesEmAndamento,
            destaque: true,
          },
          {
            key: "orc-ytd",
            titulo: `Acum. vs Orçado`,
            label: `Jan–${MESES_LABEL_CURTO[mesFiltro]}/${anoFiltro}`,
            orçado: orcYTD,
            atual: fatYTD,
            variacao: varOrcYTD,
            showAndamento: mesEmAndamento,
            destaque: true,
          },
        ].map(({ key, titulo, label, orçado, atual, variacao, showAndamento, destaque }) => {
          const delta    = atual - orçado;
          const positivo = variacao != null && variacao >= 0;
          const semDados = variacao === null || orçado === 0;
          return (
            <div key={key} className={`rounded-xl border shadow-sm p-4 flex flex-col gap-2 ${destaque ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}>
              <div>
                <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-widest">{titulo}</div>
                <div className="text-xs text-amber-600 mt-0.5">{label}</div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-800 tabular-nums">{fmtBRL(atual)}</span>
              </div>
              <div className="text-xs text-slate-400">
                orçado: <span className="font-medium text-amber-700">{orçado > 0 ? fmtBRL(orçado) : "—"}</span>
              </div>
              {semDados ? (
                <span className="text-xs text-slate-400 italic">sem orçamento</span>
              ) : (
                <div className={`flex items-center gap-2 mt-auto pt-2 border-t border-amber-100 ${positivo ? "text-emerald-600" : "text-red-500"}`}>
                  <span className="text-lg font-bold">{positivo ? "▲" : "▼"}{Math.abs(variacao).toFixed(1)}%</span>
                  <span className="text-sm font-semibold">{positivo ? "+" : ""}{fmtBRLShort(delta)}</span>
                </div>
              )}
              {showAndamento && (
                <div>
                  <span className="text-[10px] font-medium bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">mês em andamento</span>
                </div>
              )}
            </div>
          );
        })}
        {/* Cards M/M, A/A, Acum. YoY */}
        {[
          {
            key: "mm",
            titulo: "Mês a Mês",
            label: `vs ${MESES_LABEL[mesFiltro === 0 ? 11 : mesFiltro - 1]}/${mesFiltro === 0 ? anoFiltro - 1 : anoFiltro}`,
            valor: fatMesAnterior,
            atual: fatMes,
            variacao: varMMA,
            showAndamento: mesEmAndamento,
          },
          {
            key: "aa",
            titulo: "Ano a Ano",
            label: `vs ${MESES_LABEL[mesFiltro]}/${anoFiltro - 1}`,
            valor: fatAnoAnteriorMes,
            atual: fatMes,
            variacao: varYoY,
            showAndamento: mesEmAndamento,
          },
          {
            key: "ytd",
            titulo: `Acumulado ${anoFiltro}`,
            label: `Jan–${MESES_LABEL_CURTO[mesFiltro]} vs ${anoFiltro - 1}`,
            valor: fatAnoAnteriorYTD,
            atual: fatYTD,
            variacao: varYTD,
            showAndamento: mesEmAndamento,
          },
        ].map(({ key, titulo, label, valor, atual, variacao, showAndamento }) => {
          const delta    = atual - valor;
          const positivo = variacao != null && variacao >= 0;
          const semDados = variacao === null;
          return (
            <div key={key} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-2">
              {/* Cabeçalho tile */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{titulo}</div>
                <div className="text-xs text-slate-400 mt-0.5">{label}</div>
              </div>
              {/* Valor principal */}
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-800 tabular-nums">{fmtBRL(atual)}</span>
              </div>
              {/* Comparativo anterior */}
              <div className="text-xs text-slate-400">
                anterior: <span className="font-medium text-slate-500">{valor > 0 ? fmtBRL(valor) : "—"}</span>
              </div>
              {/* Variação */}
              {semDados ? (
                <span className="text-xs text-slate-400 italic">sem dados anteriores</span>
              ) : (
                <div className={`flex items-center gap-2 mt-auto pt-2 border-t border-slate-100 ${positivo ? "text-emerald-600" : "text-red-500"}`}>
                  <span className="text-lg font-bold">{positivo ? "▲" : "▼"}{Math.abs(variacao).toFixed(1)}%</span>
                  <span className="text-sm font-semibold">{positivo ? "+" : ""}{fmtBRLShort(delta)}</span>
                </div>
              )}
              {/* Badge mês em andamento */}
              {showAndamento && key !== "ytd" && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">mês em andamento</span>
                  {key === "mm" && projecaoMesFim && (
                    <span className="text-[10px] text-slate-500">
                      proj: <span className="font-semibold text-slate-700">{fmtBRL(projecaoMesFim)}</span>
                    </span>
                  )}
                </div>
              )}
              {showAndamento && key === "ytd" && (
                <div>
                  <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">mês em andamento</span>
                </div>
              )}
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
            <>
              {/* Legenda */}
              <div className="flex items-center gap-4 mb-2 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: BRAND.azul }} /> Realizado
                </span>
                {mesEmAndamento && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: SEMANTIC.laranja }} /> Hoje
                  </span>
                )}
                {graficoDiario.some((d) => d.isOutlier) && (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-400" /> Pico (capado na escala — real no tooltip)
                  </span>
                )}
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={graficoDiario} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
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
                  <YAxis {...EIXO} tickFormatter={fmtBRLShort} width={65} />
                  <Tooltip
                    {...tooltipProps()}
                    formatter={(v, _name, props) => {
                      const item = props?.payload;
                      if (item?.isOutlier) return [fmtBRL(item.valorReal) + " ⚠ pico", "Faturado"];
                      return [fmtBRL(v) + (item?.isHoje ? " (hoje)" : ""), "Faturado"];
                    }}
                  />
                  <Bar dataKey="valor" radius={RAIO_BARRA} {...ANIM}>
                    {graficoDiario.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.isOutlier ? "#94A3B8"
                          : entry.isHoje   ? "url(#gradFatHoje)"
                          : "url(#gradFat)"
                        }
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
