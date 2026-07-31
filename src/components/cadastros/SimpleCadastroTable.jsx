import React, { useState } from "react";
import { Plus, Check, X, Pencil, Trash2 } from "lucide-react";
import { Panel, Field, inputCls, selectCls, IconBtn, Toggle, EmptyState, useConfirm } from "../ui/Primitives.jsx";

/**
 * `campos`: [{ key, label, tipo: "text"|"select", opcoes?: [{value,label}], largura?: "col-span-2" }]
 * `colunasTabela`: opcional — se omitido, usa `campos`.
 */
export function SimpleCadastroTable({ titulo, subtitulo, campos, itens, onAdd, onUpdate, onRemove, nomeEntidadeSingular = "registro" }) {
  const vazio = () => ({ ...campos.reduce((acc, c) => ({ ...acc, [c.key]: "" }), {}), ativo: true });
  const [form, setForm] = useState(vazio());
  const [editingId, setEditingId] = useState(null);
  const { pedirConfirmacao, ConfirmDialogSlot } = useConfirm();

  const submit = () => {
    const obrigatorios = campos.filter((c) => c.obrigatorio !== false);
    if (obrigatorios.some((c) => !form[c.key])) return;
    if (editingId) { onUpdate(editingId, form); setEditingId(null); } else { onAdd(form); }
    setForm(vazio());
  };
  const startEdit = (item) => { setEditingId(item.id); setForm(campos.reduce((acc, c) => ({ ...acc, [c.key]: item[c.key] }), {})); };
  const cancelEdit = () => { setEditingId(null); setForm(vazio()); };
  const confirmarExclusao = (item) => {
    pedirConfirmacao(`Excluir ${nomeEntidadeSingular}?`, `Esta ação não pode ser desfeita. Deseja excluir "${item.nome || item.descricao}"?`, () => onRemove(item.id));
  };

  return (
    <div className="flex flex-col gap-6">
      <Panel title={editingId ? `Editar ${nomeEntidadeSingular}` : `Novo ${nomeEntidadeSingular}`} subtitle={subtitulo}>
        <div className="grid grid-cols-6 gap-3 items-end">
          {campos.map((c) => (
            <Field key={c.key} label={c.label} className={c.largura || ""}>
              {c.tipo === "select" ? (
                <select value={form[c.key] ?? ""} onChange={(e) => setForm({ ...form, [c.key]: e.target.value })} className={selectCls}>
                  <option value="">Selecione...</option>
                  {c.opcoes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input value={form[c.key] ?? ""} onChange={(e) => setForm({ ...form, [c.key]: c.tipo === "number" ? e.target.value : e.target.value })}
                  type={c.tipo === "number" ? "number" : "text"} className={inputCls} placeholder={c.placeholder || ""} />
              )}
            </Field>
          ))}
          <div className="flex gap-2 col-span-6 justify-end">
            {editingId && <button onClick={cancelEdit} className="px-3 py-1.5 rounded text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1"><X size={14} /> Cancelar</button>}
            <button onClick={submit} className="px-4 py-1.5 rounded text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5">
              {editingId ? <Check size={14} /> : <Plus size={14} />}{editingId ? "Salvar alterações" : "Adicionar"}
            </button>
          </div>
        </div>
      </Panel>

      <Panel title={titulo}>
        {itens.length === 0 ? (
          <EmptyState titulo={`Nenhum registro cadastrado`} descricao={`Cadastre o primeiro ${nomeEntidadeSingular} acima, ou carregue os Dados Demonstrativos em Governança.`} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 text-xs uppercase tracking-wide border-b border-slate-200">
                  {campos.map((c) => <th key={c.key} className="py-2 pr-4">{c.label}</th>)}
                  <th className="py-2 pr-4">Situação</th>
                  <th className="py-2 pr-2"></th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                    {campos.map((c) => (
                      <td key={c.key} className="py-2 pr-4 text-slate-700">
                        {c.tipo === "select" ? (c.opcoes.find((o) => o.value === item[c.key])?.label ?? "—") : c.tipo === "toggle" ? null : (item[c.key] || "—")}
                      </td>
                    ))}
                    <td className="py-2 pr-4"><Toggle value={item.ativo} onChange={() => onUpdate(item.id, { ativo: !item.ativo })} /></td>
                    <td className="py-2 pr-2">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <IconBtn onClick={() => startEdit(item)} title="Editar"><Pencil size={14} /></IconBtn>
                        <IconBtn onClick={() => confirmarExclusao(item)} title="Excluir" tone="rose"><Trash2 size={14} /></IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <ConfirmDialogSlot />
    </div>
  );
}
