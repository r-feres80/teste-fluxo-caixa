import React, { useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Legend } from "recharts";
import { Panel, KPI, InfoNote, selectCls } from "./ui/Primitives.jsx";
import { fmtBRL, fmtBRLShort, fmtData } from "../utils/formatUtils.js";
import { MESES } from "../config/appConfig.js";
import {
  calcularCarteiraEAging, calcularConcentracaoPorParceiro, calcularDespesasInternas, vencimentosProximos,
  FAIXAS_AGING, calcularComposicaoRecebido,
  calcularPrevistoRealizadoDiario, construirReguaDiasUteis,
  calcularComposicaoPorDiaSemana,
} from "../financial-engine/aging.js";
import { situacaoEfetiva } from "../financial-engine/lancamentos.js";
import { addDaysISO, diffDaysISO, getDataAtualSistema } from "../utils/dateUtils.js";

// Contas a Pagar/Receber são módulos de FATO: aging e vencimentos sempre
// contam a partir de "hoje" real, nunca da Data de Referência editável —
// ver getDataAtualSistema.
export function ContasPagarReceberView({ data, tipo }) {
  const { entidades, filtros, parametros } = data;
  const hoje = getDataAtualSistema();
  const listaParceiros = tipo === "Entrada" ? entidades.clientes : entidades.fornecedores;
  const rotuloParceiro = tipo === "Entrada" ? "Cliente" : "Fornecedor";

  const lancamentosDoTipo = useMemo(() => entidades.lancamentos.filter((l) =>
    l.tipo === tipo && !l.transferencia && (filtros.empresaId === "TODAS" || l.empresaId === filtros.empresaId)
  ), [entidades.lancamentos, tipo, filtros.empresaId]);

  const { abertos, buckets, totalVencido, totalCarteira } = useMemo(
    () => calcularCarteiraEAging(lancamentosDoTipo, hoje), [lancamentosDoTipo, hoje]
  );
  const concentracao = useMemo(() => calcularConcentracaoPorParceiro(abertos, 5), [abertos]);
  const despesasInternas = useMemo(() => calcularDespesasInternas(abertos), [abertos]);
  const proximos7 = useMemo(() => vencimentosProximos(abertos, hoje, parametros.diasParaAlertas), [abertos, hoje, parametros.diasParaAlertas]);
  const proximos15 = useMemo(() => vencimentosProximos(abertos, hoje, 15), [abertos, hoje]);
  const proximos30 = useMemo(() => vencimentosProximos(abertos, hoje, 30), [abertos, hoje]);
  const vencimentosHoje = abertos.filter((l) => diffDaysISO(hoje, l.dataVencimento) === 0);
  const regua = useMemo(() => construirReguaDiasUteis(abertos, hoje, 10), [abertos, hoje]);

  // Filtro de "Títulos em Aberto": vencimento (faixa em dias) + mês de
  // vencimento + status, com totalizador do resultado filtrado — ver item
  // 8/Etapa 3 (faixa+status) e Bloco 4 (mês, além do filtro por dia).
  const [fVencimento, setFVencimento] = useState("todos");
  const [fMes, setFMes] = useState("todos");
  const [fSituacao, setFSituacao] = useState("TODAS");
  const mesesDisponiveis = useMemo(() => {
    const set = new Set(abertos.map((l) => l.dataVencimento.slice(0, 7)));
    return Array.from(set).sort();
  }, [abertos]);
  const abertosFiltrados = useMemo(() => abertos.filter((l) => {
    const sit = situacaoEfetiva(l, hoje);
    if (fSituacao !== "TODAS" && sit !== fSituacao) return false;
    if (fMes !== "todos" && !l.dataVencimento.startsWith(fMes)) return false;
    if (fVencimento === "todos") return true;
    const diasAteVencer = diffDaysISO(hoje, l.dataVencimento);
    if (fVencimento === "vencidos") return diasAteVencer < 0;
    if (fVencimento === "hoje") return diasAteVencer === 0;
    return diasAteVencer >= 0 && diasAteVencer <= Number(fVencimento);
  }), [abertos, fSituacao, fMes, fVencimento, hoje]);
  const totalFiltrado = abertosFiltrados.reduce((s, l) => s + l.valor, 0);

  const realizadoNoMes = useMemo(() => {
    const [ano, mes] = hoje.slice(0, 7).split("-").map(Number);
    return lancamentosDoTipo.filter((l) => l.situacao === "Realizado" && l.dataPagamento?.startsWith(`${ano}-${String(mes).padStart(2, "0")}`)).reduce((s, l) => s + l.valor, 0);
  }, [lancamentosDoTipo, hoje]);

  const inadimplenciaPct = totalCarteira > 0 ? (totalVencido / totalCarteira) * 100 : 0;

  // Régua de aging estendida (9 faixas de vencido) — ver FAIXAS_AGING em
  // aging.js. Só vencidos: "A vencer" não é aging, já aparece nos KPIs de
  // Vencimentos Hoje/Próximos dias acima.
  const chartData = FAIXAS_AGING.map((f) => ({ faixa: f.label, valor: buckets[f.key] }));

  // Composição do Recebido: só em Contas a Receber (tipo === "Entrada") —
  // ver item 9, escopo explícito de AR. "Aging de Vencidos Recebidos" e
  // "Evolução Mensal de Inadimplência" moraram aqui antes; agora vivem só em
  // Inadimplência (Bloco 4) — não recalcular/duplicar aqui.
  const lancamentosRealizados = useMemo(() => lancamentosDoTipo.filter((l) => l.situacao === "Realizado"), [lancamentosDoTipo]);
  const composicaoRecebido = useMemo(() => tipo === "Entrada" ? calcularComposicaoRecebido(lancamentosRealizados) : null, [tipo, lancamentosRealizados]);
  const composicaoPorDiaSemana = useMemo(() => tipo === "Entrada" ? calcularComposicaoPorDiaSemana(lancamentosRealizados) : null, [tipo, lancamentosRealizados]);

  // Previsto x Realizado: visualização única compartilhada por AP e AR (item
  // 10/Etapa 3 — antes só existia para AR). PDD mora em InadimplenciaPage.jsx
  // (Etapa 2 item 3) — não recalcular aqui.
  const previstoRealizado = useMemo(() => calcularPrevistoRealizadoDiario(lancamentosDoTipo, hoje, 30), [lancamentosDoTipo, hoje]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">
        <KPI label="Total da Carteira (em aberto)" value={fmtBRL(totalCarteira)} tone="neutral" />
        <KPI label="Vencido" value={fmtBRL(totalVencido)} tone={totalVencido > 0 ? "negative" : "neutral"} />
        <KPI label={`Realizado no mês`} value={fmtBRL(realizadoNoMes)} tone="positive" basis="caixa" />
        <KPI label={tipo === "Entrada" ? "Inadimplência" : "Atraso de Pagamento"} value={`${inadimplenciaPct.toFixed(1)}%`} tone={inadimplenciaPct > 10 ? "negative" : "neutral"} />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KPI label="Vencimentos Hoje" value={fmtBRL(vencimentosHoje.reduce((s, l) => s + l.valor, 0))} sub={`${vencimentosHoje.length} título(s)`} />
        <KPI label={`Próximos ${parametros.diasParaAlertas} dias`} value={fmtBRL(proximos7.reduce((s, l) => s + l.valor, 0))} sub={`${proximos7.length} título(s)`} />
        <KPI label="Próximos 15 dias" value={fmtBRL(proximos15.reduce((s, l) => s + l.valor, 0))} sub={`${proximos15.length} título(s)`} />
        <KPI label="Próximos 30 dias" value={fmtBRL(proximos30.reduce((s, l) => s + l.valor, 0))} sub={`${proximos30.length} título(s)`} />
      </div>

      <Panel
        title={tipo === "Entrada" ? "Régua de Próximos Recebimentos (dias úteis)" : "Régua de Próximos Pagamentos (dias úteis)"}
        subtitle="Próximos 10 dias úteis — vencimentos de fim de semana somados ao próximo dia útil"
      >
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={regua}>
            <XAxis dataKey="data" tickFormatter={(d) => fmtData(d).slice(0, 5)} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} />
            <Tooltip labelFormatter={(d) => fmtData(d)} formatter={(v) => fmtBRL(v)} contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} />
            <Bar dataKey="valor" radius={[3, 3, 0, 0]} fill={tipo === "Entrada" ? "#10b981" : "#f43f5e"} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid grid-cols-2 gap-4">
        <Panel title={tipo === "Entrada" ? "Aging AR" : "Aging AP"}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <XAxis dataKey="faixa" stroke="#64748b" fontSize={10} tickLine={false} interval={0} angle={-40} textAnchor="end" height={50} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} formatter={(v) => fmtBRL(v)} />
              <Bar dataKey="valor" radius={[3, 3, 0, 0]} fill={tipo === "Entrada" ? "#10b981" : "#f43f5e"} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={`Concentração por ${rotuloParceiro}`} subtitle={`Top 5 — alerta configurado em ${parametros.limiteConcentracaoPct}%`}>
          {concentracao.length === 0 ? <span className="text-sm text-slate-400">Nenhum título em aberto.</span> : (
            <div className="flex flex-col gap-2">
              {concentracao.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{listaParceiros.find((p) => p.id === c.id)?.nome ?? "—"}</span>
                  <span className={`font-mono tabular-nums ${c.pct >= parametros.limiteConcentracaoPct ? "text-rose-600" : "text-slate-700"}`}>{fmtBRL(c.valor)} ({c.pct.toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          )}
          {despesasInternas > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
              <span>Despesas internas (sem {rotuloParceiro.toLowerCase()} vinculado)</span>
              <span className="font-mono tabular-nums">{fmtBRL(despesasInternas)}</span>
            </div>
          )}
        </Panel>
      </div>

      {/* "Aging de Vencidos Recebidos" e "Top 5 Devedores" mudaram para a
          página Inadimplência (Bloco 4) — é o módulo dedicado a atraso, não
          precisa duplicar aqui. "Evolução Mensal de Inadimplência" também
          saiu daqui pelo mesmo motivo (já existe em Inadimplência). */}

      {tipo === "Entrada" && (
        <div className="grid grid-cols-2 gap-4">
          <Panel title="Composição do Recebido" subtitle="Antecipado / Em dia / Atrasado — baixa (recebimento) vs. vencimento, títulos Realizados">
            {composicaoRecebido.total === 0 ? <span className="text-sm text-slate-400">Nenhum título Realizado no momento.</span> : (
              <div className="flex flex-col gap-3">
                <div className="w-full h-6 rounded overflow-hidden flex">
                  {composicaoRecebido.antecipadoPct > 0 && <div className="bg-emerald-500" style={{ width: `${composicaoRecebido.antecipadoPct}%` }} title="Antecipado" />}
                  {composicaoRecebido.emDiaPct > 0 && <div className="bg-indigo-400" style={{ width: `${composicaoRecebido.emDiaPct}%` }} title="Em dia" />}
                  {composicaoRecebido.atrasadoPct > 0 && <div className="bg-rose-500" style={{ width: `${composicaoRecebido.atrasadoPct}%` }} title="Atrasado" />}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Antecipado <span className="font-mono">{composicaoRecebido.antecipadoPct.toFixed(0)}%</span></span>
                  <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-400 inline-block" />Em dia <span className="font-mono">{composicaoRecebido.emDiaPct.toFixed(0)}%</span></span>
                  <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />Atrasado <span className="font-mono">{composicaoRecebido.atrasadoPct.toFixed(0)}%</span></span>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Composição do Recebido por Dia da Semana" subtitle="Soma do valor Realizado por dia da semana da Data de baixa (mín. Seg-Sex)">
            {composicaoPorDiaSemana.every((d) => d.valor === 0) ? <span className="text-sm text-slate-400">Nenhum título Realizado no momento.</span> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={composicaoPorDiaSemana}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} width={56} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} formatter={(v) => fmtBRL(v)} />
                  <Bar dataKey="valor" radius={[3, 3, 0, 0]} fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>
        </div>
      )}

      <Panel
        title={tipo === "Entrada" ? "Previsto x Recebido" : "Previsto x Pago"}
        subtitle={tipo === "Entrada" ? "Últimos 30 dias, por Data de Vencimento — % aderência = do que venceu no dia, quanto já foi recebido" : "Últimos 30 dias, por Data de Vencimento — % aderência = do que venceu no dia, quanto já foi pago"}
      >
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={previstoRealizado}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="data" tickFormatter={(d) => d.slice(8, 10)} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis yAxisId="valor" stroke="#94a3b8" fontSize={10} tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} width={56} />
            <YAxis yAxisId="pct" orientation="right" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${v.toFixed(0)}%`} tickLine={false} axisLine={false} width={44} />
            <Tooltip labelFormatter={(d) => d.split("-").reverse().join("/")} formatter={(v, n) => n === "% Aderência" ? (v == null ? "—" : `${v.toFixed(0)}%`) : fmtBRL(v)} contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="valor" dataKey="previsto" name="Venceu no Dia" fill="#818cf8" radius={[3, 3, 0, 0]} />
            <Bar yAxisId="valor" dataKey="realizado" name={tipo === "Entrada" ? "Já Recebido (do que venceu no dia)" : "Já Pago (do que venceu no dia)"} fill={tipo === "Entrada" ? "#10b981" : "#f43f5e"} radius={[3, 3, 0, 0]} />
            <Line yAxisId="pct" type="monotone" dataKey="aderenciaPct" name="% Aderência" stroke="#f97316" strokeWidth={2} dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
        <InfoNote>
          Cada dia representa a coorte de títulos com Vencimento naquele dia (a "safra" que venceu ali).{" "}
          <span className="font-medium text-slate-600">Venceu no Dia</span> é o total dessa safra;{" "}
          <span className="font-medium text-slate-600">{tipo === "Entrada" ? "Já Recebido" : "Já Pago"}</span> é quanto dessa MESMA safra já está com situação Realizado, não importa quando foi liquidado;{" "}
          <span className="font-medium text-slate-600">% Aderência</span> é a razão entre os dois — por isso fica sempre entre 0% e 100%, nunca acima. Dias recentes tendem a % baixo porque ainda não deu tempo de liquidar; isso não é atraso.
        </InfoNote>
      </Panel>

      {/* PDD (Provisão para Devedores Duvidosos) mora em Inadimplência agora
          — é o módulo dedicado a risco de recebíveis vencidos, PDD não
          precisa ser duplicado aqui em Contas a Receber. */}

      <Panel
        title={`Títulos em Aberto — ${rotuloParceiro}`}
        right={
          <div className="flex items-center gap-2">
            <select value={fMes} onChange={(e) => setFMes(e.target.value)} className={selectCls + " w-auto"}>
              <option value="todos">Todos os meses</option>
              {mesesDisponiveis.map((m) => {
                const [ano, mes] = m.split("-");
                return <option key={m} value={m}>{MESES[Number(mes) - 1]}/{ano}</option>;
              })}
            </select>
            <select value={fVencimento} onChange={(e) => setFVencimento(e.target.value)} className={selectCls + " w-auto"}>
              <option value="todos">Todos vencimentos</option>
              <option value="vencidos">Vencidos</option>
              <option value="hoje">Hoje</option>
              <option value="7">Próximos 7 dias</option>
              <option value="15">Próximos 15 dias</option>
              <option value="30">Próximos 30 dias</option>
            </select>
            <select value={fSituacao} onChange={(e) => setFSituacao(e.target.value)} className={selectCls + " w-auto"}>
              <option value="TODAS">Todas situações</option>
              <option value="Previsto">Previsto</option>
              <option value="Em aberto">Em aberto</option>
              <option value="Vencido">Vencido</option>
            </select>
          </div>
        }
      >
        {abertosFiltrados.length === 0 ? <InfoNote>Nenhum título em aberto para os filtros atuais.</InfoNote> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 text-xs uppercase border-b border-slate-200"><th className="py-2 pr-4">Vencimento</th><th className="py-2 pr-4">{rotuloParceiro}</th><th className="py-2 pr-4">Documento</th><th className="py-2 pr-4">Situação</th><th className="py-2 pr-4 text-right">Valor</th></tr></thead>
              <tbody>
                {abertosFiltrados.sort((a, b) => (a.dataVencimento < b.dataVencimento ? -1 : 1)).map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-4 text-slate-500 font-mono text-xs">{fmtData(l.dataVencimento)}</td>
                    <td className="py-2 pr-4 text-slate-700">{listaParceiros.find((p) => p.id === l.clienteFornecedorId)?.nome ?? "—"}</td>
                    <td className="py-2 pr-4 text-slate-500 text-xs">{l.documento}</td>
                    <td className="py-2 pr-4 text-xs">{situacaoEfetiva(l, hoje)}</td>
                    <td className="py-2 pr-4 text-right font-mono tabular-nums">{fmtBRL(l.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between items-center text-sm font-medium text-slate-600 mt-3 pt-3 border-t border-slate-200">
              <span>{abertosFiltrados.length} título(s)</span>
              <span className="font-mono tabular-nums">{fmtBRL(totalFiltrado)}</span>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
