import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Panel, KPI, InfoNote } from "../components/ui/Primitives.jsx";
import { fmtBRL, fmtBRLShort } from "../utils/formatUtils.js";
import { getDataAtualSistema, parseISO } from "../utils/dateUtils.js";
import { estaRealizado, excluirTransferencias } from "../financial-engine/lancamentos.js";
import { calcularComposicaoRecebido } from "../financial-engine/aging.js";
import {
  calcularComposicaoDiaria, calcularComposicaoMensal, calcularComposicaoPorParceiro, calcularComposicaoPorContaBancaria,
} from "../financial-engine/composicaoCaixa.js";

const CORES = { antecipado: "#10b981", emDia: "#818cf8", atrasado: "#f43f5e" };

function MiniDonut({ item, nome }) {
  const partes = [
    { key: "antecipado", label: "Antecipado", valor: item.antecipado },
    { key: "emDia", label: "Em dia", valor: item.emDia },
    { key: "atrasado", label: "Atrasado", valor: item.atrasado },
  ].filter((p) => p.valor > 0);
  return (
    <div className="flex flex-col items-center gap-1">
      <ResponsiveContainer width={92} height={92}>
        <PieChart>
          <Pie data={partes} dataKey="valor" nameKey="label" innerRadius={26} outerRadius={40} paddingAngle={2}>
            {partes.map((p) => <Cell key={p.key} fill={CORES[p.key]} />)}
          </Pie>
          <Tooltip formatter={(v) => fmtBRL(v)} contentStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="text-xs text-slate-600 text-center truncate w-24" title={nome}>{nome}</div>
      <div className="text-[11px] text-slate-400 font-mono">{fmtBRLShort(item.total)}</div>
    </div>
  );
}

// Composição do Caixa é módulo de FATO: sempre "hoje" real — ver getDataAtualSistema.
export default function ComposicaoCaixaPage({ data }) {
  const { entidades, filtros } = data;
  const hoje = getDataAtualSistema();
  const agora = parseISO(hoje);

  const realizados = useMemo(() => excluirTransferencias(entidades.lancamentos)
    .filter((l) => estaRealizado(l) && (filtros.empresaId === "TODAS" || l.empresaId === filtros.empresaId)),
    [entidades.lancamentos, filtros.empresaId]);

  const geral = useMemo(() => calcularComposicaoRecebido(realizados), [realizados]);
  const diaria = useMemo(() => calcularComposicaoDiaria(realizados, hoje, 30), [realizados, hoje]);
  const mensal = useMemo(() => calcularComposicaoMensal(realizados, agora.getFullYear(), agora.getMonth(), 6), [realizados, agora]);
  const porParceiro = useMemo(() => calcularComposicaoPorParceiro(realizados, 6), [realizados]);
  const porContaBancaria = useMemo(() => calcularComposicaoPorContaBancaria(realizados), [realizados]);

  const nomeParceiro = (item) => {
    const lista = item.tipoParceiro === "Cliente" ? entidades.clientes : entidades.fornecedores;
    return lista.find((p) => p.id === item.id)?.nome ?? "—";
  };
  const nomeContaBancaria = (id) => entidades.contasBancarias.find((c) => c.id === id)?.apelido ?? "—";

  return (
    <div className="flex flex-col gap-6">
      <InfoNote>
        Composição do Caixa realizado: Antecipado (baixa antes do vencimento), Em dia (baixa no vencimento) e Atrasado
        (baixa depois do vencimento) — considera Entradas e Saídas Realizadas, exclui transferências internas.
      </InfoNote>

      <div className="grid grid-cols-3 gap-4">
        <KPI label="Antecipado" value={fmtBRL(geral.antecipado)} sub={`${geral.antecipadoPct.toFixed(0)}% do total`} tone="positive" />
        <KPI label="Em dia" value={fmtBRL(geral.emDia)} sub={`${geral.emDiaPct.toFixed(0)}% do total`} tone="neutral" />
        <KPI label="Atrasado" value={fmtBRL(geral.atrasado)} sub={`${geral.atrasadoPct.toFixed(0)}% do total`} tone={geral.atrasadoPct > 20 ? "negative" : "neutral"} />
      </div>

      <Panel title="Composição Diária" subtitle="Últimos 30 dias, por Data de baixa">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={diaria}>
            <XAxis dataKey="data" tickFormatter={(d) => d.slice(8, 10)} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} width={56} />
            <Tooltip labelFormatter={(d) => d.split("-").reverse().join("/")} formatter={(v) => fmtBRL(v)} contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="antecipado" name="Antecipado" stackId="c" fill={CORES.antecipado} />
            <Bar dataKey="emDia" name="Em dia" stackId="c" fill={CORES.emDia} />
            <Bar dataKey="atrasado" name="Atrasado" stackId="c" fill={CORES.atrasado} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid grid-cols-2 gap-4">
        <Panel title="Composição Mensal" subtitle="Últimos 6 meses">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mensal}>
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} width={56} />
              <Tooltip formatter={(v) => fmtBRL(v)} contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="antecipado" name="Antecipado" stackId="c" fill={CORES.antecipado} />
              <Bar dataKey="emDia" name="Em dia" stackId="c" fill={CORES.emDia} />
              <Bar dataKey="atrasado" name="Atrasado" stackId="c" fill={CORES.atrasado} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Quebra por Conta Bancária">
          {porContaBancaria.length === 0 ? <span className="text-sm text-slate-400">Sem movimento Realizado.</span> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 text-xs uppercase border-b border-slate-200">
                <th className="py-2 pr-4">Conta</th><th className="py-2 pr-4 text-right">Antecipado</th><th className="py-2 pr-4 text-right">Em dia</th><th className="py-2 text-right">Atrasado</th>
              </tr></thead>
              <tbody>
                {porContaBancaria.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4 text-slate-700">{nomeContaBancaria(c.id)}</td>
                    <td className="py-2 pr-4 text-right font-mono tabular-nums text-emerald-600">{c.antecipadoPct.toFixed(0)}%</td>
                    <td className="py-2 pr-4 text-right font-mono tabular-nums text-indigo-500">{c.emDiaPct.toFixed(0)}%</td>
                    <td className="py-2 text-right font-mono tabular-nums text-rose-600">{c.atrasadoPct.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <Panel title="Composição por Cliente/Fornecedor" subtitle="Top 6 por volume Realizado">
        {porParceiro.length === 0 ? <span className="text-sm text-slate-400">Sem movimento Realizado com parceiro vinculado.</span> : (
          <div className="flex flex-wrap gap-6 justify-around">
            {porParceiro.map((item) => <MiniDonut key={item.id} item={item} nome={nomeParceiro(item)} />)}
          </div>
        )}
      </Panel>
    </div>
  );
}
