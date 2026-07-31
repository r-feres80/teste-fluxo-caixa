import React from "react";
import { Database, Trash2, Sparkles } from "lucide-react";
import { Panel, Field, inputCls, InfoNote, useConfirm } from "../components/ui/Primitives.jsx";
import { fmtDataHora } from "../utils/formatUtils.js";
import { APP_DISCLAIMER } from "../config/appConfig.js";

export default function GovernancaPage({ data }) {
  const { parametros, updateParametros, filtros, updateFiltros, lastUpdated, carregarDemo, limparBase, entidades } = data;
  const { pedirConfirmacao, ConfirmDialogSlot } = useConfirm();

  const totalRegistros = Object.values(entidades).reduce((s, arr) => s + arr.length, 0);

  const confirmarLimpeza = () => {
    pedirConfirmacao(
      "Limpar toda a base?",
      `Isso removerá TODOS os ${totalRegistros} registros cadastrados (empresas, unidades, clientes, fornecedores, bancos, contas, plano de contas, centros de custo e projetos). Esta ação não pode ser desfeita.`,
      limparBase
    );
  };
  const confirmarCargaDemo = () => {
    if (totalRegistros === 0) { carregarDemo(); return; }
    pedirConfirmacao(
      "Substituir base atual pelos Dados Demonstrativos?",
      `Você já tem ${totalRegistros} registro(s) cadastrado(s). Carregar os Dados Demonstrativos vai substituir tudo. Esta ação não pode ser desfeita.`,
      carregarDemo
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <InfoNote>{APP_DISCLAIMER}</InfoNote>

      <Panel title="Dados" subtitle="Carregue o cenário demonstrativo para explorar a aplicação, ou comece com uma base vazia">
        <div className="flex items-center gap-4">
          <button onClick={confirmarCargaDemo} className="px-4 py-2 rounded text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-2">
            <Sparkles size={15} /> Carregar Dados Demonstrativos
          </button>
          <button onClick={confirmarLimpeza} className="px-4 py-2 rounded text-sm bg-white border border-rose-300 hover:bg-rose-50 text-rose-600 font-medium flex items-center gap-2">
            <Trash2 size={15} /> Limpar Base
          </button>
          <div className="text-xs text-slate-500 flex items-center gap-1.5"><Database size={13} /> {totalRegistros} registro(s) na base atual</div>
        </div>
      </Panel>

      <Panel title="Parâmetros Centrais">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Data de Referência (hoje)"><input type="date" value={filtros.dataReferencia} onChange={(e) => updateFiltros({ dataReferencia: e.target.value })} className={inputCls} /></Field>
          <Field label="Caixa Mínimo Operacional (opcional)">
            <input type="number" placeholder="Não configurado" value={parametros.caixaMinimo ?? ""} onChange={(e) => updateParametros({ caixaMinimo: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Materialidade — Δ% mínimo"><input type="number" value={parametros.materialidadePct} onChange={(e) => updateParametros({ materialidadePct: Number(e.target.value) || 0 })} className={inputCls} /></Field>
          <Field label="Materialidade — Δ R$ mínimo"><input type="number" value={parametros.materialidadeValor} onChange={(e) => updateParametros({ materialidadeValor: Number(e.target.value) || 0 })} className={inputCls} /></Field>
          <Field label="Dias para alertas de vencimento"><input type="number" value={parametros.diasParaAlertas} onChange={(e) => updateParametros({ diasParaAlertas: Number(e.target.value) || 0 })} className={inputCls} /></Field>
          <Field label="Limite de concentração (%)"><input type="number" value={parametros.limiteConcentracaoPct} onChange={(e) => updateParametros({ limiteConcentracaoPct: Number(e.target.value) || 0 })} className={inputCls} /></Field>
        </div>
      </Panel>

      <Panel title="Reconciliações" subtitle="Ficam disponíveis conforme os módulos financeiros entram em operação">
        <InfoNote tone="amber">
          Ainda não há reconciliações a exibir nesta fase — Tesouraria, Fluxo de Caixa e DRE (Fases 2 a 5) ainda não foram construídos.
          Quando estiverem prontos, esta seção mostrará: Saldo Inicial + Entradas − Saídas = Caixa Final · Realizado + Projeção = Forecast · Forecast − Orçamento = Desvio.
        </InfoNote>
      </Panel>

      <Panel title="Dicionário de KPIs" subtitle="Populado conforme os KPIs entram em operação">
        <InfoNote tone="amber">Nenhum KPI calculado ainda nesta fase. Última atualização de dados: {lastUpdated ? fmtDataHora(lastUpdated) : "—"}.</InfoNote>
      </Panel>

      <ConfirmDialogSlot />
    </div>
  );
}
