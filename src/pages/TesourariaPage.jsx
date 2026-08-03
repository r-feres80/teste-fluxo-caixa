import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Wallet, Landmark, PiggyBank, ArrowUpRight, ArrowDownCircle } from "lucide-react";
import { Panel, KPI, InfoNote } from "../components/ui/Primitives.jsx";
import { fmtBRL, fmtBRLShort } from "../utils/formatUtils.js";
import { calcularSaldosPorConta, calcularSaldoPorBanco, calcularSaldoPorEmpresa, calcularPosicaoConsolidada, calcularMovimentoDoDia, listarTransferencias } from "../financial-engine/tesouraria.js";
import { calcularComposicaoDiaria } from "../financial-engine/composicaoCaixa.js";
import { estaRealizado, excluirTransferencias } from "../financial-engine/lancamentos.js";
import { getDataAtualSistema } from "../utils/dateUtils.js";

const CORES_COMPOSICAO = { antecipado: "#10b981", emDia: "#818cf8", atrasado: "#f43f5e" };

// Tesouraria é módulo de FATO: saldo é sempre "hoje" real, nunca a Data de
// Referência editável — ver getDataAtualSistema.
export default function TesourariaPage({ data }) {
  const { entidades, filtros } = data;
  const hoje = getDataAtualSistema();
  const contasFiltradas = entidades.contasBancarias.filter((c) => c.ativo && (filtros.empresaId === "TODAS" || c.empresaId === filtros.empresaId));

  const posicao = useMemo(() => calcularPosicaoConsolidada(contasFiltradas, entidades.lancamentos, hoje), [contasFiltradas, entidades.lancamentos, hoje]);
  const porBanco = useMemo(() => calcularSaldoPorBanco(contasFiltradas, entidades.lancamentos, hoje), [contasFiltradas, entidades.lancamentos, hoje]);
  const porEmpresa = useMemo(() => calcularSaldoPorEmpresa(contasFiltradas, entidades.lancamentos, hoje), [contasFiltradas, entidades.lancamentos, hoje]);
  const movimentoHoje = useMemo(() => calcularMovimentoDoDia(entidades.lancamentos.filter((l) => filtros.empresaId === "TODAS" || l.empresaId === filtros.empresaId), hoje), [entidades.lancamentos, filtros.empresaId, hoje]);
  const transferencias = useMemo(() => listarTransferencias(entidades.lancamentos), [entidades.lancamentos]);

  const realizados = useMemo(() => excluirTransferencias(entidades.lancamentos)
    .filter((l) => estaRealizado(l) && (filtros.empresaId === "TODAS" || l.empresaId === filtros.empresaId)),
    [entidades.lancamentos, filtros.empresaId]);
  const composicao30dias = useMemo(() => calcularComposicaoDiaria(realizados, hoje, 30), [realizados, hoje]);

  if (contasFiltradas.length === 0) {
    return <InfoNote tone="amber">Nenhuma conta bancária ativa para os filtros atuais. Cadastre em Cadastros → Contas Bancárias.</InfoNote>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">
        <KPI label="Saldo Consolidado" value={fmtBRL(posicao.total)} tone={posicao.total >= 0 ? "positive" : "negative"} icon={Wallet} />
        <KPI label="Saldo Disponível (Livre)" value={fmtBRL(posicao.disponivel)} tone="neutral" icon={Landmark} />
        <KPI label="Aplicações Financeiras" value={fmtBRL(posicao.aplicacoes)} tone="neutral" icon={PiggyBank} />
        <KPI label="Movimento de Hoje"
          value={<span className="flex items-baseline gap-1.5 text-lg"><span className="text-emerald-600">{fmtBRL(movimentoHoje.entradas)}</span><span className="text-slate-300 text-sm">/</span><span className="text-rose-600">{fmtBRL(movimentoHoje.saidas)}</span></span>}
          sub="Entradas / Saídas (exclui transferências)" tone="neutral" icon={ArrowUpRight} />
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

      <Panel title="Composição do Caixa — Últimos 30 dias" subtitle="Antecipado / Em dia / Atrasado, por Data de baixa (Entradas e Saídas Realizadas)">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={composicao30dias}>
            <XAxis dataKey="data" tickFormatter={(d) => d.slice(8, 10)} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} width={56} />
            <Tooltip labelFormatter={(d) => d.split("-").reverse().join("/")} formatter={(v) => fmtBRL(v)} contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="antecipado" name="Antecipado" stackId="c" fill={CORES_COMPOSICAO.antecipado} />
            <Bar dataKey="emDia" name="Em dia" stackId="c" fill={CORES_COMPOSICAO.emDia} />
            <Bar dataKey="atrasado" name="Atrasado" stackId="c" fill={CORES_COMPOSICAO.atrasado} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

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
