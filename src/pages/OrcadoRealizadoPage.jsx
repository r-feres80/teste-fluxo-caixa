import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Panel, Badge, Field, selectCls } from "../components/ui/Primitives.jsx";
import { fmtBRL } from "../utils/formatUtils.js";
import { mesesDoPeriodo } from "../utils/dateUtils.js";
import { construirOrcadoRealizado } from "../financial-engine/orcadoRealizado.js";

function LinhaArvore({ no, profundidade, expandidos, toggle, parametros }) {
  const material = no.temOrcamento && (Math.abs(no.deltaForecastPct) >= parametros.materialidadePct || Math.abs(no.deltaForecast) >= parametros.materialidadeValor);
  const aberto = expandidos.has(no.id);
  return (
    <>
      <tr className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${material ? "bg-amber-50/50" : ""}`} onClick={() => no.filhos.length && toggle(no.id)}>
        <td className="py-2 pr-4" style={{ paddingLeft: `${profundidade * 18 + 12}px` }}>
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            {no.filhos.length > 0 ? (aberto ? <ChevronDown size={13} className="text-slate-400" /> : <ChevronRight size={13} className="text-slate-400" />) : <span className="w-3" />}
            {no.codigo} {no.descricao}
            {material && <Badge tone="amber">material</Badge>}
          </span>
        </td>
        <td className="py-2 pr-4 text-right font-mono tabular-nums">{fmtBRL(no.real)}</td>
        <td className="py-2 pr-4 text-right font-mono tabular-nums text-slate-500">{no.temOrcamento ? fmtBRL(no.orcado) : "—"}</td>
        <td className="py-2 pr-4 text-right font-mono tabular-nums text-indigo-600">{fmtBRL(no.forecast)}</td>
        <td className={`py-2 pr-4 text-right font-mono tabular-nums ${no.deltaForecast >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{no.temOrcamento ? fmtBRL(no.deltaForecast) : "—"}</td>
        <td className="py-2 pr-4 text-right font-mono tabular-nums">{no.temOrcamento ? `${no.deltaForecastPct.toFixed(0)}%` : "—"}</td>
      </tr>
      {aberto && no.filhos.map((f) => <LinhaArvore key={f.id} no={f} profundidade={profundidade + 1} expandidos={expandidos} toggle={toggle} parametros={parametros} />)}
    </>
  );
}

export default function OrcadoRealizadoPage({ data }) {
  const { entidades, filtros, parametros } = data;
  const [expandidos, setExpandidos] = useState(new Set(entidades.planoDeContas.map((c) => c.id)));
  const [centroCustoSel, setCentroCustoSel] = useState("TODAS");
  const meses = mesesDoPeriodo(filtros);

  const arvore = useMemo(() => construirOrcadoRealizado({
    planoDeContas: entidades.planoDeContas, orcamentoItens: entidades.orcamentoItens, lancamentos: entidades.lancamentos,
    ano: filtros.anoRef, meses, empresaId: filtros.empresaId, centroCustoId: centroCustoSel,
  }), [entidades.planoDeContas, entidades.orcamentoItens, entidades.lancamentos, filtros.anoRef, meses, filtros.empresaId, centroCustoSel]);

  const toggle = (id) => setExpandidos((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Orçado x Realizado x Forecast" subtitle="Clique numa linha com subcontas para expandir/recolher (Grupo → Subgrupo → Conta)"
        right={
          <Field label="Centro de Custo" className="w-56">
            <select value={centroCustoSel} onChange={(e) => setCentroCustoSel(e.target.value)} className={selectCls}>
              <option value="TODAS">Todos</option>
              {entidades.centrosCusto.filter((c) => filtros.empresaId === "TODAS" || c.empresaId === filtros.empresaId).map((c) => <option key={c.id} value={c.id}>{c.codigo} - {c.nome}</option>)}
            </select>
          </Field>
        }>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500 text-xs uppercase border-b border-slate-200"><th className="py-2 pr-4">Conta</th><th className="py-2 pr-4 text-right">Real</th><th className="py-2 pr-4 text-right">Orçado</th><th className="py-2 pr-4 text-right">Forecast</th><th className="py-2 pr-4 text-right">Δ R$</th><th className="py-2 pr-4 text-right">Δ %</th></tr></thead>
            <tbody>{arvore.map((no) => <LinhaArvore key={no.id} no={no} profundidade={0} expandidos={expandidos} toggle={toggle} parametros={parametros} />)}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
