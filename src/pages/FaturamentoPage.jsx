import React, { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { RefreshCw } from "lucide-react";
import { Panel, KPI, selectCls } from "../components/ui/Primitives.jsx";
import { fmtBRL, fmtBRLShort, fmtData } from "../utils/formatUtils.js";
import { getDataAtualSistema } from "../utils/dateUtils.js";
import {
  BRAND, SEMANTIC, tooltipProps, gradienteBarraStops,
  GRID, EIXO, ANIM, RAIO_BARRA,
} from "../utils/chartTheme.js";

// ─── Plano de contas de receita ───────────────────────────────────────────────
const LINHAS_PRODUTO = [
  { id: "pc1.01.01.01", label: "Tintas Imobiliárias",   cor: BRAND.azul },
  { id: "pc1.01.01.02", label: "Tintas Industriais",    cor: BRAND.ciano },
  { id: "pc1.01.01.03", label: "Vernizes e Stains",     cor: "#0EA5E9" },
  { id: "pc1.01.01.04", label: "Impermeabilizantes",    cor: "#6366F1" },
  { id: "pc1.01.01.05", label: "Texturas e Grafiato",   cor: "#8B5CF6" },
  { id: "pc1.01.02",    label: "Serviços Técnicos",     cor: SEMANTIC.laranja },
];

// ─── Recorrências sintéticas (contratos fixos mensais) ───────────────────────
// Representam contratos de fornecimento recorrente — base para a engine
// de faturamento automático (P3). Em produção virão do banco de dados.
const RECORRENCIAS_DEMO = [
  { id: "r1", descricao: "Construtora Delta Paulista — Fornecimento mensal tintas imobiliárias", valor: 48000, diaVencimento: 15, contaId: "pc1.01.01.01", ativa: true },
  { id: "r2", descricao: "Pinturas Horizonte Engenharia — Contrato anual vernizes",              valor: 22500, diaVencimento: 20, contaId: "pc1.01.01.03", ativa: true },
  { id: "r3", descricao: "Max Construções Centro-Oeste — Impermeabilizantes trimestral",         valor: 31000, diaVencimento: 5,  contaId: "pc1.01.01.04", ativa: true },
  { id: "r4", descricao: "Distribuidora Cores do Nordeste — Repasse mensal linha industrial",    valor: 67000, diaVencimento: 28, contaId: "pc1.01.01.02", ativa: true },
  { id: "r5", descricao: "Volare Empreendimentos — Serviços técnicos de aplicação",             valor: 15000, diaVencimento: 10, contaId: "pc1.01.02",    ativa: false },
];

// Calcula próxima data de emissão a partir de hoje
function proximaEmissao(diaVencimento, hoje) {
  const [ano, mes] = hoje.split("-").map(Number);
  const diaAtual = Number(hoje.slice(8, 10));
  const candidato = `${ano}-${String(mes).padStart(2, "0")}-${String(diaVencimento).padStart(2, "0")}`;
  if (diaAtual <= diaVencimento) return candidato;
  // já passou: próximo mês
  const d = new Date(ano, mes, diaVencimento); // mes é 1-based aqui → Date usa 0-based, então mes = mes
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(diaVencimento).padStart(2, "0")}`;
}

export default function FaturamentoPage({ data }) {
  const hoje = getDataAtualSistema();
  const [anoFiltro, setAnoFiltro] = useState(Number(hoje.slice(0, 4)));
  const [mesFiltro, setMesFiltro] = useState(Number(hoje.slice(5, 7)) - 1); // 0-based

  const { entidades } = data ?? {};

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

  // ── Lançamentos recentes (últimos 20 realizados) ──────────────────────────
  const recentes = useMemo(
    () => [...entradas.filter((l) => l.situacao === "Realizado")]
            .sort((a, b) => (b.dataPagamento || "").localeCompare(a.dataPagamento || ""))
            .slice(0, 20),
    [entradas]
  );

  const nomeCliente = (l) => {
    const c = entidades?.clientes?.find((x) => x.id === l.clienteFornecedorId);
    return c?.nome || l.clienteFornecedorId || "—";
  };
  const nomeConta = (id) => LINHAS_PRODUTO.find((x) => x.id === id)?.label || id;

  // ── Recorrências ─────────────────────────────────────────────────────────
  const recorrencias = RECORRENCIAS_DEMO.map((r) => ({
    ...r,
    proximaData: proximaEmissao(r.diaVencimento, hoje),
  }));

  const ANOS = [2024, 2025, 2026, 2027];
  const MESES_LABEL = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

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
        <KPI label={`YTD ${anoFiltro}`}  value={fmtBRL(fatYTD)}         />
        <KPI label="Ticket Médio / NF"   value={fmtBRL(ticketMedio)}    />
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
                    {gradienteBarraStops(BRAND.azul)}
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

        <Panel title="Por Linha de Produto">
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

      {/* Contratos recorrentes */}
      <Panel title="Faturamento Recorrente — Contratos Ativos">
        <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          <RefreshCw size={13} className="shrink-0 text-blue-400" />
          <span>Engine de recorrência P3 — próximas emissões calculadas a partir de hoje ({fmtData(hoje)}). Em produção, os lançamentos serão gerados automaticamente.</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
                <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Valor</th>
                <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Conta</th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Próxima Emissão</th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {recorrencias.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-2 text-slate-700">{r.descricao}</td>
                  <td className="py-2 px-2 text-right font-medium text-slate-800">{fmtBRL(r.valor)}</td>
                  <td className="py-2 px-2 text-slate-500 text-xs">{nomeConta(r.contaId)}</td>
                  <td className="py-2 px-2 text-center text-slate-600">{fmtData(r.proximaData)}</td>
                  <td className="py-2 px-2 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.ativa ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {r.ativa ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Últimos lançamentos */}
      <Panel title="Últimos Recebimentos Realizados">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Data Pgto</th>
                <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Linha de Produto</th>
                <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Valor</th>
                <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Doc.</th>
              </tr>
            </thead>
            <tbody>
              {recentes.map((l) => (
                <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-2 text-slate-600">{fmtData(l.dataPagamento)}</td>
                  <td className="py-2 px-2 text-slate-700 max-w-[180px] truncate">{nomeCliente(l)}</td>
                  <td className="py-2 px-2 text-slate-500 text-xs">{nomeConta(l.contaGerencialId)}</td>
                  <td className="py-2 px-2 text-right font-medium text-slate-800">{fmtBRL(l.valor)}</td>
                  <td className="py-2 px-2 text-slate-400 text-xs">{l.documento || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

    </div>
  );
}
