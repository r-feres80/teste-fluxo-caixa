import React, { useState, useMemo } from "react";
import { Panel, Field, selectCls } from "../components/ui/Primitives.jsx";
import { TabelaArvoreOrcadoRealizado } from "../components/orcadoRealizadoTree.jsx";
import { mesesDoPeriodo } from "../utils/dateUtils.js";
import { construirOrcadoRealizado } from "../financial-engine/orcadoRealizado.js";

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
        <TabelaArvoreOrcadoRealizado arvore={arvore} expandidos={expandidos} toggle={toggle} parametros={parametros} />
      </Panel>
    </div>
  );
}
