import React, { useState } from "react";
import { Check, X } from "lucide-react";
import { Panel, Field, inputCls, selectCls, InfoNote, useConfirm } from "../../components/ui/Primitives.jsx";
import { TreeView } from "../../components/ui/TreeView.jsx";
import { TIPO_CONTA, NATUREZA_CONTA, ENTRADA_SAIDA, CLASSIFICACAO_DRE, CLASSIFICACAO_DFC } from "../../config/appConfig.js";
import { temFilhos, candidatosAPai } from "../../financial-engine/treeUtils.js";

const VAZIO = {
  codigo: "", descricao: "", contaPaiId: "", tipo: "Analítica", natureza: "Devedora",
  classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", entradaSaida: "Saída",
  centroCustoObrigatorio: false, aceitaOrcamento: true, ativo: true,
};

export default function PlanoDeContasPage({ data }) {
  const { entidades, addItem, updateItem, removeItem } = data;
  const contas = entidades.planoDeContas;
  const [form, setForm] = useState(null); // null = fechado; {} = novo; {...item} = edição

  const { pedirConfirmacao, ConfirmDialogSlot } = useConfirm();

  const abrirNovaRaiz = () => setForm({ ...VAZIO, contaPaiId: null });
  const abrirNovoFilho = (pai) => setForm({ ...VAZIO, contaPaiId: pai.id, tipo: "Analítica" });
  const abrirEdicao = (item) => setForm({ ...item });
  const fechar = () => setForm(null);

  const salvar = () => {
    if (!form.codigo || !form.descricao) return;
    if (form.id) { updateItem("planoDeContas", form.id, form); } else { addItem("planoDeContas", form); }
    fechar();
  };

  const excluir = (item) => {
    if (temFilhos(contas, item.id, "contaPaiId")) return;
    pedirConfirmacao("Excluir conta?", `A conta "${item.codigo} - ${item.descricao}" será removida do Plano de Contas. Esta ação não pode ser desfeita.`, () => removeItem("planoDeContas", item.id));
  };

  const opcoesPai = candidatosAPai(contas, form?.id, "contaPaiId").filter((c) => c.tipo === "Sintética" || !form?.id);

  return (
    <div className="flex flex-col gap-6">
      <InfoNote>Contas <b>Sintéticas</b> agrupam (não recebem lançamento). Contas <b>Analíticas</b> recebem lançamento e alimentam DRE/DFC/Orçamento nas próximas fases.</InfoNote>

      {form && (
        <Panel title={form.id ? "Editar Conta" : "Nova Conta"}>
          <div className="grid grid-cols-6 gap-3">
            <Field label="Código" className="col-span-1"><input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className={inputCls} placeholder="1.01.01" /></Field>
            <Field label="Descrição" className="col-span-3"><input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className={inputCls} placeholder="Ex: Venda de Produtos" /></Field>
            <Field label="Conta Pai" className="col-span-2">
              <select value={form.contaPaiId ?? ""} onChange={(e) => setForm({ ...form, contaPaiId: e.target.value || null })} className={selectCls}>
                <option value="">(Conta raiz)</option>
                {opcoesPai.map((c) => <option key={c.id} value={c.id}>{c.codigo} - {c.descricao}</option>)}
              </select>
            </Field>
            <Field label="Tipo" className="col-span-1"><select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={selectCls}>{TIPO_CONTA.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
            <Field label="Natureza" className="col-span-1"><select value={form.natureza} onChange={(e) => setForm({ ...form, natureza: e.target.value })} className={selectCls}>{NATUREZA_CONTA.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
            <Field label="Entrada/Saída" className="col-span-1"><select value={form.entradaSaida} onChange={(e) => setForm({ ...form, entradaSaida: e.target.value })} className={selectCls}>{ENTRADA_SAIDA.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
            <Field label="Classificação DRE" className="col-span-2"><select value={form.classificacaoDRE} onChange={(e) => setForm({ ...form, classificacaoDRE: e.target.value })} className={selectCls}>{CLASSIFICACAO_DRE.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
            <Field label="Classificação DFC" className="col-span-2"><select value={form.classificacaoDFC} onChange={(e) => setForm({ ...form, classificacaoDFC: e.target.value })} className={selectCls}>{CLASSIFICACAO_DFC.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
            <Field label="Centro de Custo Obrigatório?" className="col-span-2">
              <select value={String(form.centroCustoObrigatorio)} onChange={(e) => setForm({ ...form, centroCustoObrigatorio: e.target.value === "true" })} className={selectCls}>
                <option value="false">Não</option><option value="true">Sim</option>
              </select>
            </Field>
            <Field label="Aceita Orçamento?" className="col-span-2">
              <select value={String(form.aceitaOrcamento)} onChange={(e) => setForm({ ...form, aceitaOrcamento: e.target.value === "true" })} className={selectCls}>
                <option value="false">Não</option><option value="true">Sim</option>
              </select>
            </Field>
            <div className="col-span-6 flex justify-end gap-2 mt-2">
              <button onClick={fechar} className="px-3 py-1.5 rounded text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1"><X size={14} /> Cancelar</button>
              <button onClick={salvar} className="px-4 py-1.5 rounded text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5"><Check size={14} /> Salvar</button>
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Plano de Contas Gerencial">
        <TreeView
          itens={contas} paiIdField="contaPaiId" labelNovaRaiz="Nova conta raiz"
          colunas={[
            { key: "tipo", render: (c) => c.tipo },
            { key: "dre", render: (c) => c.classificacaoDRE },
            { key: "dfc", render: (c) => c.classificacaoDFC },
          ]}
          onAddRoot={abrirNovaRaiz} onAddChild={abrirNovoFilho} onEdit={abrirEdicao}
          onToggleAtivo={(item) => updateItem("planoDeContas", item.id, { ativo: !item.ativo })}
          onDelete={excluir}
        />
      </Panel>
      <ConfirmDialogSlot />
    </div>
  );
}
