import React, { useState } from "react";
import { Panel, Field, selectCls, InfoNote, EditableCell } from "../components/ui/Primitives.jsx";
import { MESES } from "../config/appConfig.js";
import { getValorOrcado } from "../financial-engine/orcamento.js";

export default function OrcamentoPage({ data }) {
  const { entidades, filtros, addItem, updateItem } = data;
  const [empresaSel, setEmpresaSel] = useState(filtros.empresaId !== "TODAS" ? filtros.empresaId : entidades.empresas[0]?.id ?? "");

  // c.ativo !== false (não c.ativo estrito): unifica com DRE/Orçado x Realizado,
  // que nunca checam "ativo" e sempre reconheceram essas contas. Contas
  // criadas automaticamente na importação não tinham o campo "ativo" setado
  // (undefined), então a checagem estrita as escondia aqui mesmo já em uso
  // no DRE — a causa raiz era a ausência do campo, corrigida em importacao.js.
  const contasOrcaveis = entidades.planoDeContas.filter((c) => c.tipo === "Analítica" && c.aceitaOrcamento && c.ativo !== false);

  const atualizarValor = (contaId, mes, valor) => {
    const existente = entidades.orcamentoItens.find((o) => o.ano === filtros.anoRef && o.empresaId === empresaSel && o.contaGerencialId === contaId && o.mes === mes && !o.centroCustoId);
    if (existente) updateItem("orcamentoItens", existente.id, { valor });
    else addItem("orcamentoItens", { ano: filtros.anoRef, empresaId: empresaSel, contaGerencialId: contaId, centroCustoId: null, projetoId: null, mes, valor });
  };

  if (entidades.empresas.length === 0) return <InfoNote tone="amber">Cadastre ao menos uma empresa antes de orçar.</InfoNote>;

  return (
    <div className="flex flex-col gap-6">
      <InfoNote>Orçamento tem base própria — nunca é misturado com Lançamentos. Editando aqui não altera nenhum Realizado/Previsto.</InfoNote>
      <Panel title={`Orçamento ${filtros.anoRef}`} right={
        <Field label="Empresa" className="w-56">
          <select value={empresaSel} onChange={(e) => setEmpresaSel(e.target.value)} className={selectCls}>
            {entidades.empresas.filter((e) => e.ativo).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </Field>
      }>
        {contasOrcaveis.length === 0 ? <InfoNote tone="amber">Nenhuma conta do Plano de Contas está marcada como "Aceita Orçamento".</InfoNote> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 text-xs uppercase border-b border-slate-200"><th className="py-2 pr-3 sticky left-0 bg-white">Conta</th>{MESES.map((m) => <th key={m} className="py-2 px-2 text-right">{m}</th>)}</tr></thead>
              <tbody>
                {contasOrcaveis.map((conta) => (
                  <tr key={conta.id} className="border-b border-slate-100">
                    <td className="py-1.5 pr-3 text-slate-700 sticky left-0 bg-white whitespace-nowrap">{conta.codigo} {conta.descricao}</td>
                    {MESES.map((_, mesIdx) => {
                      const valor = getValorOrcado(entidades.orcamentoItens, { ano: filtros.anoRef, mes: mesIdx, contaGerencialId: conta.id, empresaId: empresaSel });
                      return <td key={mesIdx} className="py-1.5 px-1"><EditableCell value={valor} onChange={(v) => atualizarValor(conta.id, mesIdx, v)} /></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
