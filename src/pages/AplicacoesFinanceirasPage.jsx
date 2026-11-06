import React from "react";
import { PiggyBank, Percent, TrendingDown, TrendingUp, Info } from "lucide-react";
import { Panel, KPI, InfoNote } from "../components/ui/Primitives.jsx";
import { fmtBRL, fmtData } from "../utils/formatUtils.js";
import { calcularAplicacoesFinanceiras } from "../financial-engine/aplicacoesFinanceiras.js";
import { getDataAtualSistema } from "../utils/dateUtils.js";

// Comando DFC-mapeamento item 2e — módulo de FATO (saldo/rendimento sempre
// "hoje" real, mesmo padrão de Tesouraria), sem filtro de Mês/Ano: uma
// aplicação financeira é uma posição viva, não um período fechado.
export default function AplicacoesFinanceirasPage({ data }) {
  const { entidades, filtros } = data;
  const hoje = getDataAtualSistema();

  const contasFiltradas = entidades.contasBancarias.filter((c) => filtros.empresaId === "TODAS" || c.empresaId === filtros.empresaId);
  const { linhas, totais } = calcularAplicacoesFinanceiras({ contasBancarias: contasFiltradas, lancamentos: entidades.lancamentos, dataReferencia: hoje });

  const nomeBanco = (id) => entidades.bancos.find((b) => b.id === id)?.nome ?? "—";
  const nomeEmpresa = (id) => entidades.empresas.find((e) => e.id === id)?.nome ?? "—";

  if (linhas.length === 0) {
    return <InfoNote tone="amber">Nenhuma conta de Aplicação Financeira (semLiquidez) cadastrada para os filtros atuais.</InfoNote>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">
        <KPI label="Valor Aplicado (Principal)" value={fmtBRL(totais.principal)} icon={PiggyBank} tone="neutral" basis="caixa"
          sub={`Data-base: ${fmtData(hoje)}`} />
        <KPI label="Rendimento Bruto" value={fmtBRL(totais.rendimentoBruto)} icon={TrendingUp} tone="positive" basis="caixa" />
        <KPI label="IR Calculado" value={fmtBRL(totais.irCalculado)} icon={Percent} tone="negative" basis="caixa"
          tooltip="Tabela regressiva de IR sobre renda fixa (padrão Receita Federal), aplicada sobre o Rendimento Bruto conforme o prazo desde a Data de Aplicação." />
        <KPI label="Rendimento Líquido" value={fmtBRL(totais.rendimentoLiquido)} icon={TrendingDown} tone="neutral" basis="caixa" />
      </div>

      <Panel title="Aplicações Financeiras" subtitle="Uma linha por conta de aplicação (semLiquidez) — Valor Aplicado é só o principal, não inclui rendimento já creditado">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase border-b border-slate-200">
                <th className="py-2 pr-4">Modalidade</th>
                <th className="py-2 pr-4">Instituição</th>
                <th className="py-2 pr-4">Empresa</th>
                <th className="py-2 pr-4 text-right">Valor Aplicado</th>
                <th className="py-2 pr-4 text-right">Rendimento Bruto</th>
                <th className="py-2 pr-4 text-right">Prazo</th>
                <th className="py-2 pr-4 text-right">Alíquota IR</th>
                <th className="py-2 pr-4 text-right">IR Calculado</th>
                <th className="py-2 text-right">Rendimento Líquido</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700 font-medium">
                    {l.modalidade ?? <span className="text-amber-600 flex items-center gap-1"><Info size={11} />sem modalidade cadastrada</span>}
                    <div className="text-xs text-slate-400 font-normal">{l.apelido}</div>
                  </td>
                  <td className="py-2 pr-4 text-slate-500 text-xs">{nomeBanco(l.bancoId)}</td>
                  <td className="py-2 pr-4 text-slate-500 text-xs">{nomeEmpresa(l.empresaId)}</td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums text-slate-800">{fmtBRL(l.principal)}</td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums text-emerald-600">{fmtBRL(l.rendimentoBruto)}</td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums text-slate-600">{l.prazoDias == null ? "—" : `${l.prazoDias} dias`}</td>
                  <td className="py-2 pr-4 text-right text-slate-600 text-xs" title={l.faixaIR?.label}>
                    {l.faixaIR ? `${(l.faixaIR.aliquota * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums text-rose-600">{l.irCalculado == null ? "—" : fmtBRL(l.irCalculado)}</td>
                  <td className="py-2 text-right font-mono tabular-nums font-semibold text-slate-800">
                    {l.rendimentoLiquido == null ? fmtBRL(l.rendimentoBruto) : fmtBRL(l.rendimentoLiquido)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold text-slate-800 border-t-2 border-slate-200">
                <td className="py-2.5 pr-4" colSpan={3}>Total</td>
                <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{fmtBRL(totais.principal)}</td>
                <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-emerald-600">{fmtBRL(totais.rendimentoBruto)}</td>
                <td className="py-2.5 pr-4" />
                <td className="py-2.5 pr-4" />
                <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-rose-600">{fmtBRL(totais.irCalculado)}</td>
                <td className="py-2.5 text-right font-mono tabular-nums">{fmtBRL(totais.rendimentoLiquido)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {linhas.some((l) => l.incompleto) && (
          <div className="mt-3">
            <InfoNote tone="amber">
              Uma ou mais contas de Aplicação não têm Modalidade/Data de Aplicação cadastrada (típico de conta criada automaticamente pela Importação de Dados,
              que não traz esses campos da planilha) — para essas linhas, Alíquota de IR e IR Calculado ficam em branco em vez de um número inventado.
              Rendimento Líquido exibido é o Rendimento Bruto até a Modalidade/Data de Aplicação serem cadastradas.
            </InfoNote>
          </div>
        )}
      </Panel>

      <InfoNote>
        Valores 100% fictícios (mesmo dataset demonstrativo do restante do app), mas o CÁLCULO é real: Alíquota de IR vem da tabela regressiva de renda fixa
        (Receita Federal) aplicada sobre o Rendimento Bruto conforme os dias corridos entre a Data de Aplicação e hoje — nunca um número fixo digitado. Valor
        Aplicado (principal) considera o saldo inicial da conta mais aportes/resgates realizados (transferências) até hoje; Rendimento Bruto é a soma dos
        lançamentos de "Aplicações Financeiras" (Plano de Contas 4.04) creditados nessa conta. Aportes e resgates entre conta corrente e aplicação aparecem
        em Tesouraria → Transferências Internas, mas NÃO no DFC — ver nota de arquitetura reportada ao usuário.
      </InfoNote>
    </div>
  );
}
