import React, { useMemo } from "react";
import { ComposedChart, Bar, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { KPI, Panel, InfoNote } from "../components/ui/Primitives.jsx";
import { fmtBRL, fmtBRLShort } from "../utils/formatUtils.js";
import { diffDaysISO, getDataAtualSistema, startOfMonthISO, endOfMonthISO, parseISO } from "../utils/dateUtils.js";
import { calcularDFC, calcularDFCPorConta } from "../financial-engine/dfc.js";
import { calcularPosicaoConsolidada } from "../financial-engine/tesouraria.js";
import { calcularCarteiraEAging, calcularDSOouDPO } from "../financial-engine/aging.js";
import { calcularCoberturaCaixaDias, calcularIndiceLiquidezCaixa, buildFluxoCaixaMensal } from "../financial-engine/indicadoresCaixa.js";

const CLASSIF_LABEL = { Operacional: "Atividades Operacionais", Investimento: "Atividades de Investimento", Financiamento: "Atividades de Financiamento" };

// DFC Gerencial é módulo de FATO: sempre o mês corrente real do sistema —
// nunca Período/Mês/Ano editáveis — ver getDataAtualSistema.
export default function DFCPage({ data }) {
  const { entidades, filtros } = data;
  const dataReferencia = getDataAtualSistema();
  const hoje = parseISO(dataReferencia);
  const anoRef = hoje.getFullYear();
  const mesRef = hoje.getMonth();
  const inicio = startOfMonthISO(anoRef, mesRef);
  const fim = endOfMonthISO(anoRef, mesRef);
  const diasPeriodo = Math.max(1, diffDaysISO(inicio, fim) + 1);

  const lancamentosNoPeriodo = useMemo(() => entidades.lancamentos.filter((l) => {
    if (filtros.empresaId !== "TODAS" && l.empresaId !== filtros.empresaId) return false;
    if (!l.dataPagamento) return false;
    return l.dataPagamento >= inicio && l.dataPagamento <= fim;
  }), [entidades.lancamentos, filtros.empresaId, inicio, fim]);

  const contasFiltradas = entidades.contasBancarias.filter((c) => c.ativo && (filtros.empresaId === "TODAS" || c.empresaId === filtros.empresaId));

  const caixaInicial = useMemo(() => {
    const vespera = new Date(inicio + "T00:00:00"); vespera.setDate(vespera.getDate() - 1);
    const iso = vespera.toISOString().slice(0, 10);
    return calcularPosicaoConsolidada(contasFiltradas, entidades.lancamentos, iso).total;
  }, [contasFiltradas, entidades.lancamentos, inicio]);

  const posicaoAtual = useMemo(() => calcularPosicaoConsolidada(contasFiltradas, entidades.lancamentos, dataReferencia), [contasFiltradas, entidades.lancamentos, dataReferencia]);

  const dfc = useMemo(() => calcularDFC({ lancamentosNoPeriodo, planoDeContas: entidades.planoDeContas, caixaInicial }), [lancamentosNoPeriodo, entidades.planoDeContas, caixaInicial]);

  const dfcPorConta = useMemo(() => calcularDFCPorConta({
    lancamentosNoPeriodo, planoDeContas: entidades.planoDeContas, orcamentoItens: entidades.orcamentoItens,
    ano: anoRef, meses: [mesRef], empresaId: filtros.empresaId,
  }), [lancamentosNoPeriodo, entidades.planoDeContas, entidades.orcamentoItens, anoRef, mesRef, filtros.empresaId]);

  const lancamentosGlobaisFiltrados = useMemo(() => entidades.lancamentos.filter((l) => filtros.empresaId === "TODAS" || l.empresaId === filtros.empresaId), [entidades.lancamentos, filtros.empresaId]);
  const agingAR = useMemo(() => calcularCarteiraEAging(lancamentosGlobaisFiltrados.filter((l) => l.tipo === "Entrada" && !l.transferencia), dataReferencia), [lancamentosGlobaisFiltrados, dataReferencia]);
  const agingAP = useMemo(() => calcularCarteiraEAging(lancamentosGlobaisFiltrados.filter((l) => l.tipo === "Saída" && !l.transferencia), dataReferencia), [lancamentosGlobaisFiltrados, dataReferencia]);

  const totalRecebidoPeriodo = lancamentosNoPeriodo.filter((l) => l.tipo === "Entrada" && !l.transferencia).reduce((s, l) => s + l.valor, 0);
  const totalPagoPeriodo = lancamentosNoPeriodo.filter((l) => l.tipo === "Saída" && !l.transferencia).reduce((s, l) => s + l.valor, 0);

  const dso = calcularDSOouDPO(agingAR.totalCarteira, totalRecebidoPeriodo, diasPeriodo);
  const dpo = calcularDSOouDPO(agingAP.totalCarteira, totalPagoPeriodo, diasPeriodo);
  const coberturaCaixaDias = calcularCoberturaCaixaDias(posicaoAtual.disponivel, totalPagoPeriodo, diasPeriodo);
  const indiceLiquidezCaixa = calcularIndiceLiquidezCaixa(posicaoAtual.disponivel, agingAP.totalCarteira);

  const evolucaoMensal = useMemo(() => buildFluxoCaixaMensal({
    lancamentos: entidades.lancamentos, empresaId: filtros.empresaId, anoRef, mesRef, quantidadeMeses: 6,
  }), [entidades.lancamentos, filtros.empresaId, anoRef, mesRef]);

  const porClassificacao = { Operacional: [], Investimento: [], Financiamento: [] };
  dfcPorConta.forEach((l) => porClassificacao[l.classificacaoDFC]?.push(l));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">
        <KPI label="Saldo Inicial" value={fmtBRL(dfc.caixaInicial)} basis="caixa" />
        <KPI label="Saldo Final" value={fmtBRL(dfc.caixaFinal)} tone={dfc.variacaoCaixa >= 0 ? "positive" : "negative"} sub={dfc.variacaoCaixa >= 0 ? "▲ crescimento" : "▼ queda"} basis="caixa" />
        <KPI label="FCO" value={fmtBRL(dfc.Operacional)} tone={dfc.Operacional >= 0 ? "positive" : "negative"} sub="Geração operacional" basis="caixa" />
        <KPI label="FCI" value={fmtBRL(dfc.Investimento)} tone="neutral" sub="Investimentos" basis="caixa" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KPI label="FCF" value={fmtBRL(dfc.Financiamento)} tone="neutral" sub="Financiamentos" basis="caixa" />
        <KPI label="DSO / PMR" value={dso != null ? `${dso.toFixed(0)} dias` : "—"} sub="Prazo médio de recebimento" />
        <KPI label="DPO / PMP" value={dpo != null ? `${dpo.toFixed(0)} dias` : "—"} sub="Prazo médio de pagamento" />
        <KPI label="Cobertura de Caixa" value={coberturaCaixaDias != null ? `${coberturaCaixaDias.toFixed(0)} dias` : "—"} sub="Caixa ÷ saída operacional diária" basis="caixa" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KPI label="Índice de Liquidez de Caixa" value={indiceLiquidezCaixa != null ? `${indiceLiquidezCaixa.toFixed(2)}x` : "—"} tone={indiceLiquidezCaixa != null && indiceLiquidezCaixa >= 1 ? "positive" : "negative"} sub="Caixa ÷ Contas a Pagar em aberto (proxy)" basis="caixa" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Panel title="Evolução Mensal do Fluxo de Caixa" className="col-span-2">
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

        <Panel title="DFC do Período" subtitle="Real x Orçado (Var%)">
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
                        <td className={`py-1.5 pl-2 text-right font-mono tabular-nums text-[11px] ${l.varPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{l.varPct >= 0 ? "+" : ""}{l.varPct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {dfcPorConta.length === 0 && <span className="text-sm text-slate-400">Sem movimento no período.</span>}
          </div>
        </Panel>
      </div>

      <Panel title="Demonstração de Fluxo de Caixa Gerencial (síntese)" subtitle={`Período: ${inicio} a ${fim} — classificação vem do campo "Classificação DFC" do Plano de Contas`}>
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

      <InfoNote>
        Transferências internas entre contas próprias são excluídas do DFC. O <strong>Índice de Liquidez de Caixa</strong> é uma aproximação
        (Caixa Disponível ÷ Contas a Pagar em aberto) — o Cash Ratio contábil completo (Caixa ÷ Passivo Circulante) exige um módulo de
        Balanço Patrimonial ainda não implementado neste produto.
      </InfoNote>
    </div>
  );
}
