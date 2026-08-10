import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Panel, Field, selectCls, InfoNote, EditableCell } from "../components/ui/Primitives.jsx";
import { MESES } from "../config/appConfig.js";
import { fmtBRL } from "../utils/formatUtils.js";
import { getValorOrcado } from "../financial-engine/orcamento.js";
import { montarArvore } from "../financial-engine/treeUtils.js";

// c.ativo !== false (não c.ativo estrito): unifica com DRE/Orçado x Realizado,
// que nunca checam "ativo" e sempre reconheceram essas contas. Contas
// criadas automaticamente na importação não tinham o campo "ativo" setado
// (undefined), então a checagem estrita as escondia aqui mesmo já em uso
// no DRE — a causa raiz era a ausência do campo, corrigida em importacao.js.
const ehOrcavel = (c) => c.tipo === "Analítica" && c.aceitaOrcamento && c.ativo !== false;

/** Descendentes Analíticos orçáveis de um nó — usado tanto pra decidir se um
 * ramo aparece (nada orçável = ramo inteiro escondido) quanto pra somar o
 * total do grupo por mês. */
function coletarOrcaveis(no) {
  const proprio = ehOrcavel(no) ? [no] : [];
  return [...proprio, ...no.filhos.flatMap(coletarOrcaveis)];
}

function LinhaOrcamento({ no, profundidade, expandidos, toggle, orcamentoItens, ano, empresaSel, atualizarValor }) {
  const orcaveis = useMemo(() => coletarOrcaveis(no), [no]);
  if (orcaveis.length === 0) return null; // ramo sem nenhuma conta orçável — não mostra

  const ehGrupo = no.filhos.length > 0;
  const aberto = expandidos.has(no.id);

  if (ehGrupo) {
    return (
      <>
        <tr className="border-b border-slate-100 bg-slate-50/60 hover:bg-slate-100/60 cursor-pointer font-medium" onClick={() => toggle(no.id)}>
          <td className="py-2 pr-3 sticky left-0 bg-slate-50/60" style={{ paddingLeft: `${profundidade * 18 + 12}px` }}>
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              {aberto ? <ChevronDown size={13} className="text-slate-400" /> : <ChevronRight size={13} className="text-slate-400" />}
              {no.codigo} {no.descricao}
            </span>
          </td>
          {MESES.map((_, mesIdx) => {
            const soma = orcaveis.reduce((s, c) => s + getValorOrcado(orcamentoItens, { ano, mes: mesIdx, contaGerencialId: c.id, empresaId: empresaSel }), 0);
            return <td key={mesIdx} className="py-2 px-2 text-right font-mono tabular-nums text-slate-500">{soma !== 0 ? fmtBRL(soma) : "—"}</td>;
          })}
        </tr>
        {aberto && no.filhos.map((f) => (
          <LinhaOrcamento key={f.id} no={f} profundidade={profundidade + 1} expandidos={expandidos} toggle={toggle} orcamentoItens={orcamentoItens} ano={ano} empresaSel={empresaSel} atualizarValor={atualizarValor} />
        ))}
      </>
    );
  }

  return (
    <tr className="border-b border-slate-100">
      <td className="py-1.5 pr-3 text-slate-700 sticky left-0 bg-white whitespace-nowrap" style={{ paddingLeft: `${profundidade * 18 + 12}px` }}>{no.codigo} {no.descricao}</td>
      {MESES.map((_, mesIdx) => {
        const valor = getValorOrcado(orcamentoItens, { ano, mes: mesIdx, contaGerencialId: no.id, empresaId: empresaSel });
        return <td key={mesIdx} className="py-1.5 px-1"><EditableCell value={valor} onChange={(v) => atualizarValor(no.id, mesIdx, v)} /></td>;
      })}
    </tr>
  );
}

export default function OrcamentoPage({ data }) {
  const { entidades, filtros, addItem, updateItem } = data;
  const [empresaSel, setEmpresaSel] = useState(filtros.empresaId !== "TODAS" ? filtros.empresaId : entidades.empresas[0]?.id ?? "");
  const [expandidos, setExpandidos] = useState(new Set(entidades.planoDeContas.map((c) => c.id)));

  const arvore = useMemo(() => montarArvore(entidades.planoDeContas, "contaPaiId"), [entidades.planoDeContas]);
  const toggle = (id) => setExpandidos((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const atualizarValor = (contaId, mes, valor) => {
    const existente = entidades.orcamentoItens.find((o) => o.ano === filtros.anoRef && o.empresaId === empresaSel && o.contaGerencialId === contaId && o.mes === mes && !o.centroCustoId);
    if (existente) updateItem("orcamentoItens", existente.id, { valor });
    else addItem("orcamentoItens", { ano: filtros.anoRef, empresaId: empresaSel, contaGerencialId: contaId, centroCustoId: null, projetoId: null, mes, valor });
  };

  if (entidades.empresas.length === 0) return <InfoNote tone="amber">Cadastre ao menos uma empresa antes de orçar.</InfoNote>;

  const temAlgumOrcavel = entidades.planoDeContas.some(ehOrcavel);

  return (
    <div className="flex flex-col gap-6">
      <InfoNote>Orçamento tem base própria — nunca é misturado com Lançamentos. Editando aqui não altera nenhum Realizado/Previsto.</InfoNote>
      <Panel title={`Orçamento ${filtros.anoRef}`} subtitle="Clique num grupo para expandir/recolher (Grupo → Subgrupo → Conta)" right={
        <Field label="Empresa" className="w-56">
          <select value={empresaSel} onChange={(e) => setEmpresaSel(e.target.value)} className={selectCls}>
            {entidades.empresas.filter((e) => e.ativo).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </Field>
      }>
        {!temAlgumOrcavel ? <InfoNote tone="amber">Nenhuma conta do Plano de Contas está marcada como "Aceita Orçamento".</InfoNote> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 text-xs uppercase border-b border-slate-200"><th className="py-2 pr-3 sticky left-0 bg-white">Conta</th>{MESES.map((m) => <th key={m} className="py-2 px-2 text-right">{m}</th>)}</tr></thead>
              <tbody>
                {arvore.map((no) => (
                  <LinhaOrcamento key={no.id} no={no} profundidade={0} expandidos={expandidos} toggle={toggle} orcamentoItens={entidades.orcamentoItens} ano={filtros.anoRef} empresaSel={empresaSel} atualizarValor={atualizarValor} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
