import React, { useMemo } from "react";
import { Wallet, Landmark, PiggyBank, ArrowUpRight, ArrowDownCircle } from "lucide-react";
import { Panel, KPI, InfoNote } from "../components/ui/Primitives.jsx";
import { fmtBRL } from "../utils/formatUtils.js";
import { calcularSaldosPorConta, calcularSaldoPorBanco, calcularSaldoPorEmpresa, calcularPosicaoConsolidada, calcularMovimentoDoDia, listarTransferencias } from "../financial-engine/tesouraria.js";

export default function TesourariaPage({ data }) {
  const { entidades, filtros } = data;
  const contasFiltradas = entidades.contasBancarias.filter((c) => c.ativo && (filtros.empresaId === "TODAS" || c.empresaId === filtros.empresaId));

  const posicao = useMemo(() => calcularPosicaoConsolidada(contasFiltradas, entidades.lancamentos, filtros.dataReferencia), [contasFiltradas, entidades.lancamentos, filtros.dataReferencia]);
  const porBanco = useMemo(() => calcularSaldoPorBanco(contasFiltradas, entidades.lancamentos, filtros.dataReferencia), [contasFiltradas, entidades.lancamentos, filtros.dataReferencia]);
  const porEmpresa = useMemo(() => calcularSaldoPorEmpresa(contasFiltradas, entidades.lancamentos, filtros.dataReferencia), [contasFiltradas, entidades.lancamentos, filtros.dataReferencia]);
  const movimentoHoje = useMemo(() => calcularMovimentoDoDia(entidades.lancamentos.filter((l) => filtros.empresaId === "TODAS" || l.empresaId === filtros.empresaId), filtros.dataReferencia), [entidades.lancamentos, filtros.empresaId, filtros.dataReferencia]);
  const transferencias = useMemo(() => listarTransferencias(entidades.lancamentos), [entidades.lancamentos]);

  if (contasFiltradas.length === 0) {
    return <InfoNote tone="amber">Nenhuma conta bancária ativa para os filtros atuais. Cadastre em Cadastros → Contas Bancárias.</InfoNote>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">
        <KPI label="Saldo Consolidado" value={fmtBRL(posicao.total)} tone={posicao.total >= 0 ? "positive" : "negative"} icon={Wallet} />
        <KPI label="Saldo Disponível (Livre)" value={fmtBRL(posicao.disponivel)} tone="neutral" icon={Landmark} />
        <KPI label="Aplicações Financeiras" value={fmtBRL(posicao.aplicacoes)} tone="neutral" icon={PiggyBank} />
        <KPI label="Movimento de Hoje" value={`${fmtBRL(movimentoHoje.entradas)} / ${fmtBRL(movimentoHoje.saidas)}`} sub="Entradas / Saídas (exclui transferências)" tone="neutral" icon={ArrowUpRight} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Panel title="Saldo por Conta">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500 text-xs uppercase border-b border-slate-200"><th className="py-2 pr-4">Conta</th><th className="py-2 pr-4">Banco</th><th className="py-2 pr-4 text-right">Saldo</th></tr></thead>
            <tbody>
              {posicao.saldos.map(({ conta, saldo }) => (
                <tr key={conta.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">{conta.apelido} {conta.semLiquidez === "true" && <span className="text-[10px] text-amber-600 ml-1">(sem liquidez)</span>}</td>
                  <td className="py-2 pr-4 text-slate-500 text-xs">{entidades.bancos.find((b) => b.id === conta.bancoId)?.nome}</td>
                  <td className={`py-2 pr-4 text-right font-mono tabular-nums ${saldo >= 0 ? "text-slate-800" : "text-rose-600"}`}>{fmtBRL(saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Saldo por Banco e por Empresa">
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-xs text-slate-500 uppercase mb-1.5">Por Banco</div>
              {Array.from(porBanco.entries()).map(([bancoId, saldo]) => (
                <div key={bancoId} className="flex justify-between text-sm py-1"><span className="text-slate-600">{entidades.bancos.find((b) => b.id === bancoId)?.nome}</span><span className="font-mono tabular-nums">{fmtBRL(saldo)}</span></div>
              ))}
            </div>
            <div className="h-px bg-slate-100" />
            <div>
              <div className="text-xs text-slate-500 uppercase mb-1.5">Por Empresa</div>
              {Array.from(porEmpresa.entries()).map(([empresaId, saldo]) => (
                <div key={empresaId} className="flex justify-between text-sm py-1"><span className="text-slate-600">{entidades.empresas.find((e) => e.id === empresaId)?.nome}</span><span className="font-mono tabular-nums">{fmtBRL(saldo)}</span></div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Transferências Internas" subtitle="Movimentos entre contas próprias — não entram em Entradas/Saídas operacionais">
        {transferencias.length === 0 ? <span className="text-sm text-slate-400">Nenhuma transferência registrada.</span> : (
          <div className="flex flex-col gap-2">
            {transferencias.map((grupo) => (
              <div key={grupo.id} className="text-sm flex items-center gap-2 text-slate-600">
                <ArrowDownCircle size={14} className="text-indigo-500" />
                {grupo.itens.map((i) => `${entidades.contasBancarias.find((c) => c.id === i.contaBancariaId)?.apelido} (${i.tipo})`).join(" → ")}
                <span className="font-mono text-xs text-slate-500 ml-auto">{fmtBRL(grupo.itens[0]?.valor)}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
