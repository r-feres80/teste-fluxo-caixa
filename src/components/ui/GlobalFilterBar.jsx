import React from "react";
import { selectCls, inputCls, Field, DateInputBR } from "./Primitives.jsx";
import { MESES, TIPOS_PERIODO } from "../../config/appConfig.js";
import { parseISO } from "../../utils/dateUtils.js";

// mostrarPeriodo=false nos módulos de FATO (Tesouraria, DFC, Contas a
// Pagar/Receber, Inadimplência): esses módulos nunca leem Data de
// Referência/Período/Mês/Ano do estado editável (sempre a data real do
// sistema — ver getDataAtualSistema em dateUtils.js), então esses campos
// não fazem sentido na tela e são removidos por completo. Módulos de
// PROJEÇÃO (Forecast, Cenários, Orçado x Realizado, Orçamento, DRE) e o
// Dashboard (Bloco 4 — só o painel "Comparativo Mensal" usa o filtro; os
// cards de caixa/EBITDA YTD continuam hoje-real) continuam com o seletor
// de período completo.
export function GlobalFilterBar({ filtros, empresas, unidades, updateFiltros, mostrarPeriodo = true }) {
  const unidadesDaEmpresa = filtros.empresaId === "TODAS" ? unidades : unidades.filter((u) => u.empresaId === filtros.empresaId);

  // Ao trocar a Data de Referência, o filtro de Mês/Ano é realinhado junto —
  // evita telas mostrando um mês diferente do que a Data de Referência indica.
  const onChangeDataReferencia = (novaData) => {
    if (!novaData) { updateFiltros({ dataReferencia: novaData }); return; }
    const d = parseISO(novaData);
    updateFiltros({ dataReferencia: novaData, anoRef: d.getFullYear(), mesRef: d.getMonth() });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {mostrarPeriodo && (
        <Field label="Data de Referência" className="w-36">
          <DateInputBR value={filtros.dataReferencia} onChange={onChangeDataReferencia} className={inputCls} />
        </Field>
      )}
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
      {mostrarPeriodo && (
        <>
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
        </>
      )}
    </div>
  );
}
