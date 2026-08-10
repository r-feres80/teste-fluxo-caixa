import React, { useState, useMemo } from "react";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, ReferenceLine } from "recharts";
import { Wallet, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { Panel, KPI, InfoNote, selectCls } from "../components/ui/Primitives.jsx";
import { fmtBRL, fmtBRLShort, fmtData } from "../utils/formatUtils.js";
import { calcularPosicaoConsolidada } from "../financial-engine/tesouraria.js";
import { buildFluxoCaixaDiario, menorPontoDaSerie, HORIZONTES_DIAS } from "../financial-engine/fluxoCaixa.js";
import { aggregateSerie } from "../financial-engine/projecaoAgregada.js";
import { getDataAtualSistema, startOfMonthISO, endOfMonthISO, diffDaysISO, addDaysISO } from "../utils/dateUtils.js";
import { calcularDFC, calcularDFCPorConta } from "../financial-engine/dfc.js";
import { calcularCarteiraEAging, calcularDSOouDPO } from "../financial-engine/aging.js";
import { calcularCoberturaCaixaDias, calcularIndiceLiquidezCaixa, buildFluxoCaixaMensal } from "../financial-engine/indicadoresCaixa.js";

const CLASSIF_LABEL = { Operacional: "Atividades Operacionais", Investimento: "Atividades de Investimento", Financiamento: "Atividades de Financiamento" };

// Comando consolidado, Bloco 3: fusão de "Fluxo de Caixa" (projeção a partir
// de hoje, com filtro de dias/granularidade) + "DFC Gerencial" (KPIs
// DSO/DPO/Cobertura/Liquidez, síntese do mês). São dois eixos de tempo
// diferentes e os dois ficam — a projeção é SEMPRE a partir de hoje real
// (getDataAtualSistema, não dá pra projetar "a partir de um mês passado"),
// já a síntese/KPIs do DFC agora usam o Mês/Ano do Filtro Global (deixou de
// ser módulo de FATO travado no mês corrente) — é o "filtro de mês/
// comparativo entre meses" pedido, sem perder o filtro de dias que já
// existia na tela de projeção.
export default function FluxoCaixaPage({ data }) {
  const { entidades, filtros, parametros } = data;
  const [horizonte, setHorizonte] = useState(30);
  const [granularidade, setGranularidade] = useState("diaria");
  const hoje = getDataAtualSistema();

  // ---- Projeção (a partir de hoje real) ----
  const contasFiltradas = entidades.contasBancarias.filter((c) => c.ativo && (filtros.empresaId === "TODAS" || c.empresaId === filtros.empresaId));
  const lancamentosFiltrados = entidades.lancamentos.filter((l) => filtros.empresaId === "TODAS" || l.empresaId === filtros.empresaId);

  const posicao = useMemo(() => calcularPosicaoConsolidada(contasFiltradas, lancamentosFiltrados, hoje), [contasFiltradas, lancamentosFiltrados, hoje]);
  const serieDiaria = useMemo(() => buildFluxoCaixaDiario({ lancamentos: lancamentosFiltrados, saldoInicialConsolidado: posicao.total, dataReferencia: hoje, diasHorizonte: horizonte }), [lancamentosFiltrados, posicao.total, hoje, horizonte]);
  const agregada = useMemo(() => aggregateSerie(serieDiaria, granularidade), [serieDiaria, granularidade]);
  const menor = useMemo(() => menorPontoDaSerie(serieDiaria), [serieDiaria]);
  const fimProjecao = serieDiaria[serieDiaria.length - 1];

  const entradasPeriodo = serieDiaria.reduce((s, p) => s + p.entradas, 0);
  const saidasPeriodo = serieDiaria.reduce((s, p) => s + p.saidas, 0);
  const necessidade = menor.saldo < 0 ? Math.abs(menor.saldo) : 0;

  // ---- Síntese DFC (Mês/Ano do Filtro Global) ----
  const anoRef = filtros.anoRef;
  const mesRef = filtros.mesRef;
  const inicioMes = startOfMonthISO(anoRef, mesRef);
  const fimMes = endOfMonthISO(anoRef, mesRef);
  const diasPeriodo = Math.max(1, diffDaysISO(inicioMes, fimMes) + 1);

  const lancamentosNoPeriodo = useMemo(() => entidades.lancamentos.filter((l) => {
    if (filtros.empresaId !== "TODAS" && l.empresaId !== filtros.empresaId) return false;
    if (!l.dataPagamento) return false;
    return l.dataPagamento >= inicioMes && l.dataPagamento <= fimMes;
  }), [entidades.lancamentos, filtros.empresaId, inicioMes, fimMes]);

  const caixaInicialMes = useMemo(() => {
    const vespera = addDaysISO(inicioMes, -1);
    return calcularPosicaoConsolidada(contasFiltradas, entidades.lancamentos, vespera).total;
  }, [contasFiltradas, entidades.lancamentos, inicioMes]);

  const posicaoFimMes = useMemo(() => calcularPosicaoConsolidada(contasFiltradas, entidades.lancamentos, fimMes), [contasFiltradas, entidades.lancamentos, fimMes]);

  const dfc = useMemo(() => calcularDFC({ lancamentosNoPeriodo, planoDeContas: entidades.planoDeContas, caixaInicial: caixaInicialMes }), [lancamentosNoPeriodo, entidades.planoDeContas, caixaInicialMes]);

  const dfcPorConta = useMemo(() => calcularDFCPorConta({
    lancamentosNoPeriodo, planoDeContas: entidades.planoDeContas, orcamentoItens: entidades.orcamentoItens,
    ano: anoRef, meses: [mesRef], empresaId: filtros.empresaId,
  }), [lancamentosNoPeriodo, entidades.planoDeContas, entidades.orcamentoItens, anoRef, mesRef, filtros.empresaId]);

  const lancamentosGlobaisFiltrados = useMemo(() => entidades.lancamentos.filter((l) => filtros.empresaId === "TODAS" || l.empresaId === filtros.empresaId), [entidades.lancamentos, filtros.empresaId]);
  const agingAR = useMemo(() => calcularCarteiraEAging(lancamentosGlobaisFiltrados.filter((l) => l.tipo === "Entrada" && !l.transferencia), fimMes), [lancamentosGlobaisFiltrados, fimMes]);
  const agingAP = useMemo(() => calcularCarteiraEAging(lancamentosGlobaisFiltrados.filter((l) => l.tipo === "Saída" && !l.transferencia), fimMes), [lancamentosGlobaisFiltrados, fimMes]);

  const totalRecebidoPeriodo = lancamentosNoPeriodo.filter((l) => l.tipo === "Entrada" && !l.transferencia).reduce((s, l) => s + l.valor, 0);
  const totalPagoPeriodo = lancamentosNoPeriodo.filter((l) => l.tipo === "Saída" && !l.transferencia).reduce((s, l) => s + l.valor, 0);

  const dso = calcularDSOouDPO(agingAR.totalCarteira, totalRecebidoPeriodo, diasPeriodo);
  const dpo = calcularDSOouDPO(agingAP.totalCarteira, totalPagoPeriodo, diasPeriodo);
  const coberturaCaixaDias = calcularCoberturaCaixaDias(posicaoFimMes.disponivel, totalPagoPeriodo, diasPeriodo);
  const indiceLiquidezCaixa = calcularIndiceLiquidezCaixa(posicaoFimMes.disponivel, agingAP.totalCarteira);

  const evolucaoMensal = useMemo(() => buildFluxoCaixaMensal({
    lancamentos: entidades.lancamentos, empresaId: filtros.empresaId, anoRef, mesRef, quantidadeMeses: 6,
  }), [entidades.lancamentos, filtros.empresaId, anoRef, mesRef]);

  const porClassificacao = { Operacional: [], Investimento: [], Financiamento: [] };
  dfcPorConta.forEach((l) => porClassificacao[l.classificacaoDFC]?.push(l));

  return (
    <div className="flex flex-col gap-6">
      {/* ---- KPIs no topo ---- */}
      <Panel title="Saldo Inicial + Entradas − Saídas = Saldo Final" subtitle="Projeção a partir de hoje"
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
          <KPI label="Saldo Inicial" value={fmtBRL(posicao.total)} icon={Wallet} basis="caixa" />
          <KPI label="Entradas no Período" value={fmtBRL(entradasPeriodo)} tone="positive" icon={ArrowUpRight} basis="caixa" />
          <KPI label="Saídas no Período" value={fmtBRL(saidasPeriodo)} tone="negative" icon={ArrowDownRight} basis="caixa" />
          <KPI label="Saldo Final" value={fmtBRL(fimProjecao?.saldo ?? posicao.total)} tone={(fimProjecao?.saldo ?? 0) < 0 ? "negative" : "neutral"} icon={TrendingUp} basis="caixa" />
        </div>
        {necessidade > 0 && <div className="mt-3"><InfoNote tone="amber">Necessidade de caixa: {fmtBRL(necessidade)} em {fmtData(menor.data)}.</InfoNote></div>}
      </Panel>

      <div className="grid grid-cols-4 gap-4">
        <KPI
          label="DSO / PMR"
          value={dso != null ? `${dso.toFixed(0)} dias` : "—"}
          tone={dso == null ? "neutral" : dso <= 24 ? "positive" : "negative"}
          sub="Prazo médio de recebimento — meta: 24 dias"
        />
        <KPI
          label="DPO / PMP"
          value={dpo != null ? `${dpo.toFixed(0)} dias` : "—"}
          tone={dpo == null ? "neutral" : dpo <= 31 ? "positive" : "negative"}
          sub="Prazo médio de pagamento — meta: 31 dias"
        />
        <KPI
          label="Cobertura de Caixa"
          value={coberturaCaixaDias != null ? `${coberturaCaixaDias.toFixed(0)} dias` : "—"}
          tone={coberturaCaixaDias == null ? "neutral" : coberturaCaixaDias > 0 ? "positive" : "negative"}
          sub="Caixa ÷ saída operacional diária — meta: positiva"
          basis="caixa"
        />
        <KPI
          label="Índice de Liquidez de Caixa"
          value={indiceLiquidezCaixa != null ? `${indiceLiquidezCaixa.toFixed(2)}x` : "—"}
          tone={indiceLiquidezCaixa == null ? "neutral" : indiceLiquidezCaixa >= 1.5 ? "positive" : indiceLiquidezCaixa >= 1.0 ? "neutral" : "negative"}
          sub="Caixa ÷ Contas a Pagar em aberto (proxy) — meta: ≥1,5x (sem teto)"
          basis="caixa"
        />
      </div>

      {/* ---- Gráfico de evolução ---- */}
      <Panel title={`Evolução do Caixa (${granularidade})`} subtitle={`Menor posição no horizonte: ${fmtBRL(menor.saldo)} em ${fmtData(menor.data)}`}>
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={agregada} margin={{ top: 5, right: 28, left: 4, bottom: 0 }}>
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

      <Panel title="Evolução Mensal do Fluxo de Caixa" subtitle="Realizado — 6 meses até o Mês/Ano do Filtro Global (comparativo entre meses)">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={evolucaoMensal}>
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} width={56} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} formatter={(v) => fmtBRL(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[3, 3, 0, 0]} />
            <Bar dataKey="saidas" name="Saídas" fill="#f97316" radius={[0, 0, 3, 3]} />
            <Line type="monotone" dataKey="saldoLiquido" name="Saldo líquido" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>

      {/* ---- Síntese estruturada (por último) ---- */}
      <div className="grid grid-cols-3 gap-4">
        <Panel title="DFC do Mês" subtitle="Real x Orçado (Var%)" className="col-span-2">
          <div className="max-h-[260px] overflow-y-auto -mx-1 px-1">
            {Object.entries(porClassificacao).map(([classif, linhas]) => linhas.length > 0 && (
              <div key={classif} className="mb-3">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{CLASSIF_LABEL[classif]}</div>
                <table className="w-full text-xs">
                  <tbody>
                    {linhas.map((l) => (
                      <tr key={l.id} className="border-b border-slate-100">
                        <td className="py-1.5 pr-2 text-slate-600">{l.descricao}</td>
                        <td className="py-1.5 text-right font-mono tabular-nums text-slate-800">{fmtBRL(l.real)}</td>
                        <td className={`py-1.5 pl-2 text-right font-mono tabular-nums text-[11px] ${l.varPct == null ? "text-slate-400" : l.varPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {l.varPct == null ? "não comparável" : `${l.varPct >= 0 ? "+" : ""}${l.varPct.toFixed(1)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {dfcPorConta.length === 0 && <span className="text-sm text-slate-400">Sem movimento no período.</span>}
          </div>
        </Panel>

        <Panel title="Demonstração de Fluxo de Caixa Gerencial" subtitle={`${inicioMes.split("-").reverse().join("/")} a ${fimMes.split("-").reverse().join("/")}`}>
          <table className="w-full text-sm">
            <tbody>
              {[
                { label: "Caixa Inicial", valor: dfc.caixaInicial, destaque: true },
                { label: "(+/-) Atividades Operacionais", valor: dfc.Operacional },
                { label: "(+/-) Atividades de Investimento", valor: dfc.Investimento },
                { label: "(+/-) Atividades de Financiamento", valor: dfc.Financiamento },
                { label: "= Variação de Caixa", valor: dfc.variacaoCaixa, destaque: true },
                { label: "= Caixa Final", valor: dfc.caixaFinal, destaque: true },
              ].map((l) => (
                <tr key={l.label} className={`border-b border-slate-100 ${l.destaque ? "font-semibold" : ""}`}>
                  <td className="py-2.5 pr-4 text-slate-700">{l.label}</td>
                  <td className={`py-2.5 text-right font-mono tabular-nums ${l.valor >= 0 ? "text-slate-800" : "text-rose-600"}`}>{fmtBRL(l.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <InfoNote>
        A projeção (KPIs e gráfico de evolução no topo) é sempre a partir de hoje — não muda com o Mês/Ano do Filtro Global. Os índices
        DSO/DPO/Cobertura/Liquidez e a síntese do DFC usam o Mês/Ano selecionado no Filtro Global (comparativo entre meses). Transferências
        internas entre contas próprias são excluídas do DFC. O <strong>Índice de Liquidez de Caixa</strong> é uma aproximação (Caixa
        Disponível ÷ Contas a Pagar em aberto) — o Cash Ratio contábil completo (Caixa ÷ Passivo Circulante) exige um módulo de Balanço
        Patrimonial ainda não implementado neste produto.
      </InfoNote>
    </div>
  );
}
