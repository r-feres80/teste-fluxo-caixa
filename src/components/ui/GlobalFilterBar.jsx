import React from "react";
import { selectCls, inputCls, Field } from "./Primitives.jsx";
import { MESES, TIPOS_PERIODO } from "../../config/appConfig.js";

export function GlobalFilterBar({ filtros, empresas, unidades, updateFiltros }) {
  const unidadesDaEmpresa = filtros.empresaId === "TODAS" ? unidades : unidades.filter((u) => u.empresaId === filtros.empresaId);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Field label="Data de Referência" className="w-36">
        <input type="date" value={filtros.dataReferencia} onChange={(e) => updateFiltros({ dataReferencia: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Empresa" className="w-44">
        <select value={filtros.empresaId} onChange={(e) => updateFiltros({ empresaId: e.target.value, unidadeId: "TODAS" })} className={selectCls}>
          <option value="TODAS">Todas as empresas</option>
          {empresas.filter((e) => e.ativo).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </Field>
      <Field label="Unidade" className="w-40">
        <select value={filtros.unidadeId} onChange={(e) => updateFiltros({ unidadeId: e.target.value })} className={selectCls}>
          <option value="TODAS">Todas as unidades</option>
          {unidadesDaEmpresa.filter((u) => u.ativo).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
      </Field>
      <Field label="Período" className="w-40">
        <select value={filtros.tipoPeriodo} onChange={(e) => updateFiltros({ tipoPeriodo: e.target.value })} className={selectCls}>
          {TIPOS_PERIODO.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </Field>
      {filtros.tipoPeriodo === "mes" && (
        <Field label="Mês" className="w-28">
          <select value={filtros.mesRef} onChange={(e) => updateFiltros({ mesRef: Number(e.target.value) })} className={selectCls}>
            {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
        </Field>
      )}
      <Field label="Ano" className="w-24">
        <select value={filtros.anoRef} onChange={(e) => updateFiltros({ anoRef: Number(e.target.value) })} className={selectCls}>
          {[2024, 2025, 2026, 2027].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </Field>
    </div>
  );
}
