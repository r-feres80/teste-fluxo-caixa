import React from "react";
import { Database, Trash2, Sparkles, Download } from "lucide-react";
import { Panel, Field, inputCls, InfoNote, useConfirm, DateInputBR } from "../components/ui/Primitives.jsx";
import { fmtDataHora } from "../utils/formatUtils.js";
import { APP_DISCLAIMER, PDD_FAIXAS_PADRAO } from "../config/appConfig.js";

export default function GovernancaPage({ data }) {
  const { parametros, updateParametros, filtros, updateFiltros, lastUpdated, carregarDemo, limparBase, resetarTudo, entidades } = data;
  const { pedirConfirmacao, ConfirmDialogSlot } = useConfirm();

  const totalRegistros = Object.values(entidades).reduce((s, arr) => s + arr.length, 0);
  const totalLancamentos = entidades.lancamentos?.length ?? 0;
  // Limpar Base só mexe em dado transacional (Plano de Contas/Empresas/
  // Bancos são preservados — ver comentário em useAppData.js/limparBase).
  const totalTransacional = ["lancamentos", "orcamentoItens", "contasBancarias", "clientes", "fornecedores", "projetos", "centrosCusto", "unidades"]
    .reduce((s, chave) => s + (entidades[chave]?.length ?? 0), 0);

  // Backup local -> arquivo, fora do localStorage: gera e baixa um .json com
  // toda a base (inclui lançamentos) direto no navegador, sem passar por
  // servidor nenhum. É o único jeito de tirar a cópia da base real de quem
  // está usando o app pra fora do ambiente único do navegador dela.
  const exportarBackup = () => {
    const payload = { exportadoEm: new Date().toISOString(), totalRegistros, totalLancamentos, entidades, parametros, filtros };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-cfo-fi-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const confirmarLimpeza = () => {
    pedirConfirmacao(
      "Limpar Base (dado transacional)?",
      `Isso removerá os ${totalTransacional} registro(s) de movimento (lançamentos, itens de orçamento, contas bancárias, clientes, fornecedores, centros de custo, projetos e unidades). Empresas, Bancos e Plano de Contas são PRESERVADOS — é configuração, não dado transacional. Esta ação não pode ser desfeita.`,
      limparBase
    );
  };
  const confirmarResetTudo = () => {
    pedirConfirmacao(
      "Resetar Tudo (incluindo Plano de Contas)?",
      `Isso removerá TODOS os ${totalRegistros} registros cadastrados, incluindo Empresas, Bancos e Plano de Contas — use só se for genuinamente recomeçar do zero. Esta ação não pode ser desfeita.`,
      resetarTudo
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

      <Panel title="Dados" subtitle="Carregue o cenário demonstrativo, exporte um backup da base atual, ou comece do zero">
        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={confirmarCargaDemo} className="px-4 py-2 rounded text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-2">
            <Sparkles size={15} /> Carregar Dados Demonstrativos
          </button>
          <button onClick={exportarBackup} disabled={totalRegistros === 0}
            className="px-4 py-2 rounded text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white">
            <Download size={15} /> Exportar Backup (JSON)
          </button>
          <button onClick={confirmarLimpeza} className="px-4 py-2 rounded text-sm bg-white border border-rose-300 hover:bg-rose-50 text-rose-600 font-medium flex items-center gap-2">
            <Trash2 size={15} /> Limpar Base
          </button>
          <button onClick={confirmarResetTudo} className="px-4 py-2 rounded text-sm bg-white border border-rose-300 hover:bg-rose-50 text-rose-600 font-medium flex items-center gap-2">
            <Trash2 size={15} /> Resetar Tudo
          </button>
          <div className="text-xs text-slate-500 flex items-center gap-1.5"><Database size={13} /> {totalRegistros} registro(s) na base atual ({totalLancamentos} lançamento(s))</div>
        </div>
        <div className="text-xs text-slate-400 mt-3">
          <strong>Limpar Base</strong> reseta só dado transacional (lançamentos, contas bancárias, clientes/fornecedores...) e preserva Empresas/Bancos/Plano de Contas.{" "}
          <strong>Resetar Tudo</strong> apaga também a configuração — use só pra recomeçar do zero de verdade.
        </div>
      </Panel>

      <Panel title="Parâmetros Centrais">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Data de Referência (hoje)"><DateInputBR value={filtros.dataReferencia} onChange={(v) => updateFiltros({ dataReferencia: v })} className={inputCls} /></Field>
          <Field label="Caixa Mínimo Operacional (opcional)">
            <input type="number" placeholder="Não configurado" value={parametros.caixaMinimo ?? ""} onChange={(e) => updateParametros({ caixaMinimo: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Materialidade — Δ% mínimo"><input type="number" value={parametros.materialidadePct} onChange={(e) => updateParametros({ materialidadePct: Number(e.target.value) || 0 })} className={inputCls} /></Field>
          <Field label="Materialidade — Δ R$ mínimo"><input type="number" value={parametros.materialidadeValor} onChange={(e) => updateParametros({ materialidadeValor: Number(e.target.value) || 0 })} className={inputCls} /></Field>
          <Field label="Dias para alertas de vencimento"><input type="number" value={parametros.diasParaAlertas} onChange={(e) => updateParametros({ diasParaAlertas: Number(e.target.value) || 0 })} className={inputCls} /></Field>
          <Field label="Limite de concentração (%)"><input type="number" value={parametros.limiteConcentracaoPct} onChange={(e) => updateParametros({ limiteConcentracaoPct: Number(e.target.value) || 0 })} className={inputCls} /></Field>
          <Field label="Meta Liquidez Seca (x)"><input type="number" step="0.1" value={parametros.metaLiquidezSeca} onChange={(e) => updateParametros({ metaLiquidezSeca: Number(e.target.value) || 0 })} className={inputCls} /></Field>
          <Field label="Meta Liquidez Corrente (x)"><input type="number" step="0.1" value={parametros.metaLiquidezCorrente} onChange={(e) => updateParametros({ metaLiquidezCorrente: Number(e.target.value) || 0 })} className={inputCls} /></Field>
        </div>
      </Panel>

      <Panel title="PDD — Provisão para Devedores Duvidosos" subtitle="Percentual de provisão aplicado ao saldo vencido de Contas a Receber, por faixa de dias de atraso">
        <div className="grid grid-cols-6 gap-4">
          {(parametros.pddFaixas || PDD_FAIXAS_PADRAO).map((f, i) => (
            <Field key={f.key} label={`${f.label} dias (%)`}>
              <input type="number" value={f.pct} onChange={(e) => {
                const atuais = parametros.pddFaixas || PDD_FAIXAS_PADRAO;
                const novo = atuais.map((x, j) => (j === i ? { ...x, pct: Number(e.target.value) || 0 } : x));
                updateParametros({ pddFaixas: novo });
              }} className={inputCls} />
            </Field>
          ))}
        </div>
        <InfoNote>
          A faixa "1-30 dias" vem com 0% de provisão por padrão — decisão intencional (não bug): atraso recente ainda não
          é considerado risco de perda, então não provisiona. Enquanto todo o saldo vencido de um cliente estiver dentro
          dessa faixa, o card "Provisão (PDD)" em Inadimplência mostra R$ 0,00 corretamente. A provisão só passa a
          aparecer quando o atraso avança pra faixas seguintes (31-60, 61-90...), conforme os percentuais acima.
        </InfoNote>
      </Panel>

      <Panel title="Reconciliações" subtitle="Onde cada identidade contábil é exibida na prática">
        <InfoNote>
          Saldo Inicial + Entradas − Saídas = Caixa Final → Tesouraria e Fluxo de Caixa (regime de Caixa) e DFC.
          Realizado + Previsto = Forecast → Orçado x Realizado e Forecast.
          Forecast − Orçamento = Desvio → Orçado x Realizado e o KPI "Desvio vs. Orçamento" no Dashboard Executivo (regime de Competência).
        </InfoNote>
      </Panel>

      <Panel title="Dicionário de KPIs" subtitle="Onde cada indicador é calculado, e em qual regime">
        <InfoNote>
          A maioria dos KPIs monetários indica o próprio regime ao passar o mouse sobre o ícone <span className="italic">i</span> ao lado do rótulo
          (Regime de Caixa = Data de Baixa/Pagamento; Regime de Competência = Data de Competência). Principais indicadores por módulo:
          Dashboard Executivo (Caixa Disponível, Receita Bruta/EBITDA no ano, velocímetros de Liquidez e Inadimplência, Composição do Caixa do Mês) ·
          Tesouraria (Saldo Consolidado/Disponível, Aplicações, Câmbio) ·
          Fluxo de Caixa (projeção diária/semanal/mensal, FCO/FCI/FCF, DSO/DPO, Cobertura de Caixa, Índice de Liquidez) ·
          DFC (Grupo → Subgrupo → Conta, Saldo Final reconciliado com Tesouraria) ·
          Contas a Pagar/Receber e Inadimplência (Aging, PDD, DSO) · DRE Gerencial e Orçado x Realizado (Competência).
          Última atualização de dados: {lastUpdated ? fmtDataHora(lastUpdated) : "—"}.
        </InfoNote>
      </Panel>

      <ConfirmDialogSlot />
    </div>
  );
}
