import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "./ui/Primitives.jsx";
import { fmtBRL } from "../utils/formatUtils.js";

// Extraído de OrcadoRealizadoPage.jsx (comando consolidado, Bloco 2) pra ser
// reutilizado também em ForecastPage.jsx — mesma árvore Grupo → Subgrupo →
// Conta nas duas telas, em vez de cada uma desenhar sua própria tabela.
export function LinhaArvoreOrcadoRealizado({ no, profundidade, expandidos, toggle, parametros }) {
  // deltaForecastPct é null quando |orçado| é baixo demais pra comparar em %
  // (ver calcularVariacaoPct) — nesse caso a materialidade só considera R$.
  const materialPorPct = no.deltaForecastPct != null && Math.abs(no.deltaForecastPct) >= parametros.materialidadePct;
  const material = no.temOrcamento && (materialPorPct || Math.abs(no.deltaForecast) >= parametros.materialidadeValor);
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
        <td className="py-2 pr-4 text-right font-mono tabular-nums text-brand-violet-deep">{fmtBRL(no.forecast)}</td>
        <td className={`py-2 pr-4 text-right font-mono tabular-nums ${no.deltaForecast >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{no.temOrcamento ? fmtBRL(no.deltaForecast) : "—"}</td>
        <td className="py-2 pr-4 text-right font-mono tabular-nums">
          {!no.temOrcamento ? "—" : no.deltaForecastPct != null ? `${no.deltaForecastPct.toFixed(0)}%` : <span className="text-slate-400 font-sans normal-case text-[11px]">não comparável</span>}
        </td>
      </tr>
      {aberto && no.filhos.map((f) => <LinhaArvoreOrcadoRealizado key={f.id} no={f} profundidade={profundidade + 1} expandidos={expandidos} toggle={toggle} parametros={parametros} />)}
    </>
  );
}

/** Tabela completa (thead + tbody em árvore) — Real/Orçado/Forecast/Δ R$/Δ %. */
export function TabelaArvoreOrcadoRealizado({ arvore, expandidos, toggle, parametros }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-slate-500 text-xs uppercase border-b border-slate-200"><th className="py-2 pr-4">Conta</th><th className="py-2 pr-4 text-right">Real</th><th className="py-2 pr-4 text-right">Orçado</th><th className="py-2 pr-4 text-right">Forecast</th><th className="py-2 pr-4 text-right">Δ R$</th><th className="py-2 pr-4 text-right">Δ %</th></tr></thead>
        <tbody>{arvore.map((no) => <LinhaArvoreOrcadoRealizado key={no.id} no={no} profundidade={0} expandidos={expandidos} toggle={toggle} parametros={parametros} />)}</tbody>
      </table>
    </div>
  );
}
