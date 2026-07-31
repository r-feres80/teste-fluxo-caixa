import React, { useState } from "react";
import { Check, X } from "lucide-react";
import { Panel, Field, inputCls, selectCls, InfoNote, useConfirm } from "../../components/ui/Primitives.jsx";
import { TreeView } from "../../components/ui/TreeView.jsx";
import { temFilhos, candidatosAPai } from "../../financial-engine/treeUtils.js";

const VAZIO = { codigo: "", nome: "", centroPaiId: "", empresaId: "", responsavel: "", ativo: true };

export default function CentrosCustoPage({ data }) {
  const { entidades, addItem, updateItem, removeItem } = data;
  const centros = entidades.centrosCusto;
  const [form, setForm] = useState(null);
  const { pedirConfirmacao, ConfirmDialogSlot } = useConfirm();

  const abrirNovaRaiz = () => setForm({ ...VAZIO, centroPaiId: null });
  const abrirNovoFilho = (pai) => setForm({ ...VAZIO, centroPaiId: pai.id, empresaId: pai.empresaId });
  const abrirEdicao = (item) => setForm({ ...item });
  const fechar = () => setForm(null);

  const salvar = () => {
    if (!form.codigo || !form.nome || !form.empresaId) return;
    if (form.id) { updateItem("centrosCusto", form.id, form); } else { addItem("centrosCusto", form); }
    fechar();
  };

  const excluir = (item) => {
    if (temFilhos(centros, item.id, "centroPaiId")) return;
    pedirConfirmacao("Excluir centro de custo?", `O centro "${item.codigo} - ${item.nome}" será removido. Esta ação não pode ser desfeita.`, () => removeItem("centrosCusto", item.id));
  };

  const opcoesPai = candidatosAPai(centros, form?.id, "centroPaiId");

  return (
    <div className="flex flex-col gap-6">
      <InfoNote>Centro de Custo responde <b>onde/por quem</b> foi gasto ou gerado — é independente do Plano de Contas, que responde <b>o que</b> foi gasto/recebido.</InfoNote>

      {form && (
        <Panel title={form.id ? "Editar Centro de Custo" : "Novo Centro de Custo"}>
          <div className="grid grid-cols-6 gap-3">
            <Field label="Código" className="col-span-1"><input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className={inputCls} placeholder="1100" /></Field>
            <Field label="Nome" className="col-span-3"><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputCls} placeholder="Ex: Financeiro" /></Field>
            <Field label="Centro Pai" className="col-span-2">
              <select value={form.centroPaiId ?? ""} onChange={(e) => setForm({ ...form, centroPaiId: e.target.value || null })} className={selectCls}>
                <option value="">(Centro raiz)</option>
                {opcoesPai.map((c) => <option key={c.id} value={c.id}>{c.codigo} - {c.nome}</option>)}
              </select>
            </Field>
            <Field label="Empresa" className="col-span-3">
              <select value={form.empresaId ?? ""} onChange={(e) => setForm({ ...form, empresaId: e.target.value })} className={selectCls}>
                <option value="">Selecione...</option>
                {entidades.empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </Field>
            <Field label="Responsável" className="col-span-3"><input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} className={inputCls} placeholder="Nome do responsável" /></Field>
            <div className="col-span-6 flex justify-end gap-2 mt-2">
              <button onClick={fechar} className="px-3 py-1.5 rounded text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1"><X size={14} /> Cancelar</button>
              <button onClick={salvar} className="px-4 py-1.5 rounded text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5"><Check size={14} /> Salvar</button>
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Centros de Custo">
        <TreeView
          itens={centros} paiIdField="centroPaiId" labelNovaRaiz="Novo centro raiz"
          colunas={[
            { key: "empresa", render: (c) => entidades.empresas.find((e) => e.id === c.empresaId)?.nome ?? "—" },
            { key: "responsavel", render: (c) => c.responsavel || "—" },
          ]}
          onAddRoot={abrirNovaRaiz} onAddChild={abrirNovoFilho} onEdit={abrirEdicao}
          onToggleAtivo={(item) => updateItem("centrosCusto", item.id, { ativo: !item.ativo })}
          onDelete={excluir}
        />
      </Panel>
      <ConfirmDialogSlot />
    </div>
  );
}
