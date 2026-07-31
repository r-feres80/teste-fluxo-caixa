import React, { useState, useMemo } from "react";
import { Plus, Check, X, Pencil, Trash2 } from "lucide-react";
import { Panel, Field, Badge, IconBtn, inputCls, selectCls, EmptyState, useConfirm } from "../components/ui/Primitives.jsx";
import { fmtBRL, fmtData } from "../utils/formatUtils.js";
import { situacaoEfetiva } from "../financial-engine/lancamentos.js";
import { SITUACOES_LANCAMENTO } from "../config/appConfig.js";

function emptyLancamento() {
  return {
    empresaId: "", unidadeId: "", contaGerencialId: "", centroCustoId: "", projetoId: "",
    tipoParceiro: "", clienteFornecedorId: "", bancoId: "", contaBancariaId: "", documento: "",
    dataEmissao: "", competencia: "", dataVencimento: "", dataPagamento: "",
    tipo: "Saída", situacao: "Previsto", valor: "", observacao: "", transferencia: false,
  };
}

const badgeToneSituacao = { Realizado: "emerald", Vencido: "rose", "Em aberto": "amber", Previsto: "slate", Cancelado: "slate" };

export default function LancamentosPage({ data }) {
  const { entidades, filtros, addItem, updateItem, removeItem } = data;
  const [form, setForm] = useState(emptyLancamento());
  const [editingId, setEditingId] = useState(null);
  const [fSituacao, setFSituacao] = useState("TODAS");
  const [busca, setBusca] = useState("");
  const { pedirConfirmacao, ConfirmDialogSlot } = useConfirm();

  const contasAnaliticas = entidades.planoDeContas.filter((c) => c.tipo === "Analítica" && c.ativo);
  const contaSelecionada = contasAnaliticas.find((c) => c.id === form.contaGerencialId);
  const unidadesDaEmpresa = entidades.unidades.filter((u) => u.empresaId === form.empresaId);
  const contasBancariasDaEmpresa = entidades.contasBancarias.filter((c) => c.empresaId === form.empresaId);
  const centrosDaEmpresa = entidades.centrosCusto.filter((c) => c.empresaId === form.empresaId);
  const parceiros = form.tipoParceiro === "Cliente" ? entidades.clientes : form.tipoParceiro === "Fornecedor" ? entidades.fornecedores : [];

  const lancamentosFiltrados = useMemo(() => {
    return entidades.lancamentos
      .filter((l) => filtros.empresaId === "TODAS" || l.empresaId === filtros.empresaId)
      .filter((l) => fSituacao === "TODAS" || situacaoEfetiva(l, filtros.dataReferencia) === fSituacao)
      .filter((l) => !busca.trim() || l.documento?.toLowerCase().includes(busca.toLowerCase()) || l.observacao?.toLowerCase().includes(busca.toLowerCase()))
      .sort((a, b) => (a.dataVencimento < b.dataVencimento ? 1 : -1));
  }, [entidades.lancamentos, filtros.empresaId, filtros.dataReferencia, fSituacao, busca]);

  const submit = () => {
    if (!form.empresaId || !form.tipo || !form.valor || !form.competencia) return;
    if (!form.transferencia && !form.contaGerencialId) return;
    if (contaSelecionada?.centroCustoObrigatorio && !form.centroCustoId) return;
    const payload = { ...form, valor: Number(form.valor), contaGerencialId: form.contaGerencialId || null, centroCustoId: form.centroCustoId || null, projetoId: form.projetoId || null, clienteFornecedorId: form.clienteFornecedorId || null };
    if (editingId) { updateItem("lancamentos", editingId, payload); setEditingId(null); } else { addItem("lancamentos", payload); }
    setForm(emptyLancamento());
  };
  const startEdit = (l) => { setEditingId(l.id); setForm({ ...emptyLancamento(), ...l, contaGerencialId: l.contaGerencialId || "", centroCustoId: l.centroCustoId || "", projetoId: l.projetoId || "", clienteFornecedorId: l.clienteFornecedorId || "" }); };
  const cancelEdit = () => { setEditingId(null); setForm(emptyLancamento()); };
  const confirmarExclusao = (l) => pedirConfirmacao("Excluir lançamento?", `O lançamento "${l.documento || l.id}" será removido. Esta ação não pode ser desfeita.`, () => removeItem("lancamentos", l.id));

  const nomeParceiro = (l) => {
    if (!l.clienteFornecedorId) return "—";
    const lista = l.tipoParceiro === "Cliente" ? entidades.clientes : entidades.fornecedores;
    return lista.find((p) => p.id === l.clienteFornecedorId)?.nome ?? "—";
  };
  const nomeConta = (l) => entidades.planoDeContas.find((c) => c.id === l.contaGerencialId)?.descricao ?? (l.transferencia ? "Transferência interna" : "—");

  return (
    <div className="flex flex-col gap-6">
      <Panel title={editingId ? "Editar Lançamento" : "Novo Lançamento"}>
        <div className="grid grid-cols-6 gap-3 items-end">
          <Field label="Empresa" className="col-span-2">
            <select value={form.empresaId} onChange={(e) => setForm({ ...form, empresaId: e.target.value, unidadeId: "", contaBancariaId: "", centroCustoId: "" })} className={selectCls}>
              <option value="">Selecione...</option>{entidades.empresas.filter((e) => e.ativo).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </Field>
          <Field label="Unidade" className="col-span-2">
            <select value={form.unidadeId} onChange={(e) => setForm({ ...form, unidadeId: e.target.value })} className={selectCls}>
              <option value="">Selecione...</option>{unidadesDaEmpresa.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </Field>
          <Field label="Tipo" className="col-span-1">
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={selectCls}>
              <option value="Entrada">Entrada</option><option value="Saída">Saída</option>
            </select>
          </Field>
          <Field label="Situação" className="col-span-1">
            <select value={form.situacao} onChange={(e) => setForm({ ...form, situacao: e.target.value })} className={selectCls}>
              {SITUACOES_LANCAMENTO.filter((s) => s !== "Vencido").map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="Conta Gerencial" className="col-span-3">
            <select value={form.contaGerencialId} onChange={(e) => setForm({ ...form, contaGerencialId: e.target.value })} className={selectCls} disabled={form.transferencia}>
              <option value="">{form.transferencia ? "(Transferência não usa conta)" : "Selecione..."}</option>
              {contasAnaliticas.map((c) => <option key={c.id} value={c.id}>{c.codigo} - {c.descricao}</option>)}
            </select>
          </Field>
          <Field label={`Centro de Custo${contaSelecionada?.centroCustoObrigatorio ? " *" : ""}`} className="col-span-2">
            <select value={form.centroCustoId} onChange={(e) => setForm({ ...form, centroCustoId: e.target.value })} className={selectCls}>
              <option value="">Selecione...</option>{centrosDaEmpresa.map((c) => <option key={c.id} value={c.id}>{c.codigo} - {c.nome}</option>)}
            </select>
          </Field>
          <Field label="Projeto" className="col-span-1">
            <select value={form.projetoId} onChange={(e) => setForm({ ...form, projetoId: e.target.value })} className={selectCls}>
              <option value="">—</option>{entidades.projetos.filter((p) => p.empresaId === form.empresaId).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Field>

          <Field label="Tipo de Parceiro" className="col-span-1">
            <select value={form.tipoParceiro} onChange={(e) => setForm({ ...form, tipoParceiro: e.target.value, clienteFornecedorId: "" })} className={selectCls}>
              <option value="">—</option><option value="Cliente">Cliente</option><option value="Fornecedor">Fornecedor</option>
            </select>
          </Field>
          <Field label="Cliente/Fornecedor" className="col-span-3">
            <select value={form.clienteFornecedorId} onChange={(e) => setForm({ ...form, clienteFornecedorId: e.target.value })} className={selectCls} disabled={!form.tipoParceiro}>
              <option value="">—</option>{parceiros.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Field>
          <Field label="Documento" className="col-span-2"><input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} className={inputCls} placeholder="Ex: NF-1001" /></Field>

          <Field label="Banco" className="col-span-1">
            <select value={form.bancoId} onChange={(e) => setForm({ ...form, bancoId: e.target.value })} className={selectCls}>
              <option value="">—</option>{entidades.bancos.filter((b) => b.ativo).map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
          </Field>
          <Field label="Conta Bancária" className="col-span-2">
            <select value={form.contaBancariaId} onChange={(e) => setForm({ ...form, contaBancariaId: e.target.value })} className={selectCls}>
              <option value="">—</option>{contasBancariasDaEmpresa.map((c) => <option key={c.id} value={c.id}>{c.apelido} ({c.numero})</option>)}
            </select>
          </Field>
          <Field label="Valor (R$)" className="col-span-1"><input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} className={inputCls} placeholder="0,00" /></Field>
          <Field label="É transferência interna?" className="col-span-2">
            <select value={String(form.transferencia)} onChange={(e) => setForm({ ...form, transferencia: e.target.value === "true", contaGerencialId: e.target.value === "true" ? "" : form.contaGerencialId })} className={selectCls}>
              <option value="false">Não</option><option value="true">Sim</option>
            </select>
          </Field>

          <Field label="Data de Emissão" className="col-span-1"><input type="date" value={form.dataEmissao} onChange={(e) => setForm({ ...form, dataEmissao: e.target.value })} className={inputCls} /></Field>
          <Field label="Competência (mês)" className="col-span-1"><input type="month" value={form.competencia} onChange={(e) => setForm({ ...form, competencia: e.target.value })} className={inputCls} /></Field>
          <Field label="Data de Vencimento" className="col-span-1"><input type="date" value={form.dataVencimento} onChange={(e) => setForm({ ...form, dataVencimento: e.target.value })} className={inputCls} /></Field>
          <Field label="Data de Pagamento/Recebimento" className="col-span-1"><input type="date" value={form.dataPagamento} onChange={(e) => setForm({ ...form, dataPagamento: e.target.value })} className={inputCls} /></Field>
          <Field label="Observação" className="col-span-2"><input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} className={inputCls} /></Field>

          <div className="col-span-6 flex justify-end gap-2 mt-2">
            {editingId && <button onClick={cancelEdit} className="px-3 py-1.5 rounded text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1"><X size={14} /> Cancelar</button>}
            <button onClick={submit} className="px-4 py-1.5 rounded text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5">
              {editingId ? <Check size={14} /> : <Plus size={14} />}{editingId ? "Salvar alterações" : "Adicionar lançamento"}
            </button>
          </div>
          {contaSelecionada?.centroCustoObrigatorio && !form.centroCustoId && (
            <div className="col-span-6 text-xs text-amber-600">Esta conta gerencial exige Centro de Custo.</div>
          )}
        </div>
      </Panel>

      <Panel
        title="Base de Lançamentos"
        subtitle="Situação exibida já considera 'Vencido' automaticamente quando o vencimento passou da Data de Referência"
        right={
          <div className="flex items-center gap-2">
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar documento..." className={inputCls + " w-40"} />
            <select value={fSituacao} onChange={(e) => setFSituacao(e.target.value)} className={selectCls + " w-40"}>
              <option value="TODAS">Todas situações</option>{SITUACOES_LANCAMENTO.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        }
      >
        {lancamentosFiltrados.length === 0 ? (
          <EmptyState titulo="Nenhum lançamento encontrado" descricao="Cadastre o primeiro lançamento acima ou carregue os Dados Demonstrativos em Governança." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 text-xs uppercase tracking-wide border-b border-slate-200">
                  <th className="py-2 pr-4">Vencimento</th><th className="py-2 pr-4">Situação</th><th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Conta Gerencial</th><th className="py-2 pr-4">Parceiro</th><th className="py-2 pr-4">Documento</th>
                  <th className="py-2 pr-4 text-right">Valor</th><th className="py-2 pr-2"></th>
                </tr>
              </thead>
              <tbody>
                {lancamentosFiltrados.map((l) => {
                  const sit = situacaoEfetiva(l, filtros.dataReferencia);
                  return (
                    <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                      <td className="py-2 pr-4 text-slate-500 font-mono text-xs">{fmtData(l.dataVencimento)}</td>
                      <td className="py-2 pr-4"><Badge tone={badgeToneSituacao[sit]}>{sit}{l.transferencia ? " (transf.)" : ""}</Badge></td>
                      <td className="py-2 pr-4 text-slate-500 text-xs">{l.tipo}</td>
                      <td className="py-2 pr-4 text-slate-600 text-xs">{nomeConta(l)}</td>
                      <td className="py-2 pr-4 text-slate-700">{nomeParceiro(l)}</td>
                      <td className="py-2 pr-4 text-slate-500 text-xs">{l.documento}</td>
                      <td className={`py-2 pr-4 text-right font-mono tabular-nums ${l.tipo === "Entrada" ? "text-emerald-600" : "text-rose-600"}`}>{fmtBRL(l.tipo === "Entrada" ? l.valor : -l.valor)}</td>
                      <td className="py-2 pr-2"><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><IconBtn onClick={() => startEdit(l)} title="Editar"><Pencil size={14} /></IconBtn><IconBtn onClick={() => confirmarExclusao(l)} title="Excluir" tone="rose"><Trash2 size={14} /></IconBtn></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <ConfirmDialogSlot />
    </div>
  );
}
