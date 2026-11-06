import React, { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import { montarArvore, temFilhos } from "../../financial-engine/treeUtils.js";
import { IconBtn, Toggle } from "./Primitives.jsx";

/**
 * TreeView genérico. `colunas` define o que exibir ao lado do rótulo
 * (ex.: tipo, natureza, classificações). `paiIdField` diz qual campo liga
 * ao pai (contaPaiId ou centroPaiId).
 */
export function TreeView({ itens, paiIdField, colunas = [], onAddChild, onAddRoot, onEdit, onToggleAtivo, onDelete, labelNovaRaiz = "Novo item raiz" }) {
  const [expandidos, setExpandidos] = useState(() => new Set(itens.map((i) => i.id)));
  const arvore = useMemo(() => montarArvore(itens, paiIdField), [itens, paiIdField]);

  const toggle = (id) => setExpandidos((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const Linha = ({ no, profundidade }) => {
    const podeExcluir = !temFilhos(itens, no.id, paiIdField);
    const temFilhosVisiveis = no.filhos.length > 0;
    const aberto = expandidos.has(no.id);
    return (
      <>
        <div className={`flex items-center gap-2 py-2 border-b border-slate-100 hover:bg-slate-50 ${!no.ativo ? "opacity-50" : ""}`}
          style={{ paddingLeft: `${profundidade * 20 + 8}px` }}>
          <button onClick={() => temFilhosVisiveis && toggle(no.id)} className="w-4 shrink-0 text-slate-400">
            {temFilhosVisiveis ? (aberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
          </button>
          <span className="font-mono text-xs text-slate-400 w-20 shrink-0">{no.codigo}</span>
          <span className="text-sm text-slate-800 flex-1 min-w-0 truncate">{no.descricao || no.nome}</span>
          <div className="flex items-center gap-2 shrink-0">
            {colunas.map((c) => <span key={c.key} className="text-xs text-slate-500 w-32 truncate">{c.render(no)}</span>)}
            <Toggle value={no.ativo} onChange={() => onToggleAtivo(no)} />
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <IconBtn onClick={() => onAddChild(no)} title="Adicionar filho"><Plus size={14} /></IconBtn>
            <IconBtn onClick={() => onEdit(no)} title="Editar"><Pencil size={14} /></IconBtn>
            <IconBtn onClick={() => onDelete(no)} title={podeExcluir ? "Excluir" : "Não é possível excluir: possui subcontas"} tone="rose" disabled={!podeExcluir}><Trash2 size={14} /></IconBtn>
          </div>
        </div>
        {aberto && no.filhos.map((f) => <Linha key={f.id} no={f} profundidade={profundidade + 1} />)}
      </>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-2">
          <button onClick={() => setExpandidos(new Set(itens.map((i) => i.id)))} className="text-xs text-slate-500 hover:text-slate-800">Expandir tudo</button>
          <span className="text-slate-300">|</span>
          <button onClick={() => setExpandidos(new Set())} className="text-xs text-slate-500 hover:text-slate-800">Recolher tudo</button>
        </div>
        <button onClick={onAddRoot} className="px-3 py-1.5 rounded text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1">
          <Plus size={13} /> {labelNovaRaiz}
        </button>
      </div>
      <div>{arvore.map((no) => <Linha key={no.id} no={no} profundidade={0} />)}</div>
    </div>
  );
}
