import React, { useMemo } from "react";
import { BarChart, Bar, LineChart, Line, ReferenceLine, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Wallet, Landmark, PiggyBank, ArrowUpRight, ArrowDownCircle, DollarSign, Info } from "lucide-react";
import { Panel, KPI, InfoNote } from "../components/ui/Primitives.jsx";
import { fmtBRL, fmtBRLShort, fmtTaxaCambio, fmtData } from "../utils/formatUtils.js";
import { calcularSaldosPorConta, calcularSaldoPorBanco, calcularSaldoPorEmpresa, calcularPosicaoConsolidada, calcularMovimentoDoDia, listarTransferencias } from "../financial-engine/tesouraria.js";
import { calcularComposicaoDiaria } from "../financial-engine/composicaoCaixa.js";
import { estaRealizado, excluirTransferencias } from "../financial-engine/lancamentos.js";
import { getDataAtualSistema } from "../utils/dateUtils.js";
import { useCambio } from "../hooks/useCambio.js";

const CORES_COMPOSICAO = { antecipado: "#10b981", emDia: "#818cf8", atrasado: "#f43f5e" };

// Tooltip do sparkline — mesma informação (Data + Valor) já disponível na
// tabela ao lado, só que sob hover no gráfico. Conteúdo customizado (em vez
// de formatter/labelFormatter) porque sem <XAxis dataKey> explícito o
// "label" padrão do Recharts é o índice, não a data.
function TooltipSparklineCambio({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded shadow-sm px-2 py-1 text-[11px] leading-tight">
      <div className="text-slate-500">{fmtData(p.data)}</div>
      <div className="font-mono font-semibold text-slate-800">{fmtTaxaCambio(p.valor)}</div>
    </div>
  );
}

// Sparkline compacto: só a forma da linha + linha pontilhada da média —
// sem eixos numéricos visíveis (o YAxis existe só para corrigir o domínio,
// ver comentário abaixo). Cada ponto é colorido pela variação em relação
// ao pregão anterior da própria série (verde subiu, vermelho desceu, cinza
// para o primeiro ponto, que não tem "anterior" dentro da janela mostrada).
function SparklineCambio({ dias }) {
  if (!dias || dias.length === 0) return null;
  const media = dias.reduce((s, p) => s + p.valor, 0) / dias.length;
  const CorDot = (props) => {
    const { cx, cy, index } = props;
    const anterior = index > 0 ? dias[index - 1].valor : null;
    const cor = anterior == null ? "#94a3b8" : dias[index].valor >= anterior ? "#10b981" : "#f43f5e";
    return <circle key={`dot-${index}`} cx={cx} cy={cy} r={3} fill={cor} stroke="none" />;
  };
  return (
    <ResponsiveContainer width="100%" height={52}>
      <LineChart data={dias} margin={{ top: 6, right: 8, bottom: 6, left: 8 }}>
        <XAxis dataKey="data" hide />
        {/* Sem domain explícito o Recharts assume [0, max] — com cotações
            ~5,40 a variação real (poucos centavos) fica espremida perto do
            topo e a linha parece achatada. "dataMin/dataMax" ajusta o eixo
            à própria faixa de valores da janela de 5 dias. */}
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <ReferenceLine y={media} stroke="#cbd5e1" strokeDasharray="2 2" />
        <Tooltip content={<TooltipSparklineCambio />} cursor={{ stroke: "#cbd5e1", strokeDasharray: "2 2" }} />
        <Line type="monotone" dataKey="valor" stroke="#64748b" strokeWidth={1.5} dot={CorDot} activeDot={{ r: 4 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Card de uma moeda dentro do painel de Câmbio — nunca mostra undefined/NaN:
// sem dado ou API fora do ar, mostra "indisponível" e segue em frente.
function CambioMoeda({ nome, d }) {
  if (!d || d.indisponivel) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-slate-500 uppercase tracking-wide">{nome}</span>
        <span className="text-sm text-slate-400">indisponível</span>
      </div>
    );
  }
  const alta = d.variacaoPct != null && d.variacaoPct >= 0;
  const tituloEMA5 = `Estimativa estatística de curtíssimo prazo (média móvel exponencial de 5 pregões) — não é cotação futura oficial nem previsão de mercado.${d.ema5AmostraReduzida ? ` Amostra reduzida: ${d.ema5AmostraTamanho} dia(s).` : ""}`;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-500 uppercase tracking-wide">{nome}</span>
      <div className="flex items-baseline gap-2">
        <span className="font-mono tabular-nums text-lg font-semibold text-slate-800">{fmtTaxaCambio(d.hoje)}</span>
        {d.variacaoPct != null && (
          <span className={`text-xs font-mono ${alta ? "text-emerald-600" : "text-rose-600"}`}>{alta ? "+" : ""}{d.variacaoPct.toFixed(2)}%</span>
        )}
      </div>
      <span className="text-[11px] text-slate-400">Semana anterior: {fmtTaxaCambio(d.semanaAnterior)}</span>
      <span className="text-[11px] text-slate-500 flex items-center gap-1">
        {nome.split(" ")[0]} — projeção próximo dia útil (EMA5): <span className="font-mono">{fmtTaxaCambio(d.ema5)}</span>
        <Info size={10} className="text-slate-300 shrink-0 cursor-help" title={tituloEMA5} />
      </span>
      {d.ultimosDias && d.ultimosDias.length > 0 && (
        <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-slate-100">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">Últimos {d.ultimosDias.length} pregões</span>
          <SparklineCambio dias={d.ultimosDias} />
          <table className="w-auto self-start text-[11px] mt-1">
            <tbody>
              {d.ultimosDias.map((p, i) => {
                const maisRecente = i === d.ultimosDias.length - 1;
                return (
                  <tr key={p.data} className={maisRecente ? "text-slate-800 font-semibold" : "text-slate-500"}>
                    <td className="pr-3 leading-tight">{fmtData(p.data)}</td>
                    <td className="text-right font-mono tabular-nums leading-tight">{fmtTaxaCambio(p.valor)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Tesouraria é módulo de FATO: saldo é sempre "hoje" real, nunca a Data de
// Referência editável — ver getDataAtualSistema.
export default function TesourariaPage({ data }) {
  const { entidades, filtros } = data;
  const hoje = getDataAtualSistema();
  const contasFiltradas = entidades.contasBancarias.filter((c) => c.ativo && (filtros.empresaId === "TODAS" || c.empresaId === filtros.empresaId));
  const { carregando: cambioCarregando, dados: cambioDados } = useCambio();

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
        <KPI label="Saldo Consolidado" value={fmtBRL(posicao.total)} tone={posicao.total >= 0 ? "positive" : "negative"} icon={Wallet} basis="caixa" />
        <KPI label="Saldo Disponível (Livre)" value={fmtBRL(posicao.disponivel)} tone="neutral" icon={Landmark} basis="caixa" />
        <KPI label="Aplicações Financeiras" value={fmtBRL(posicao.aplicacoes)} tone="neutral" icon={PiggyBank} basis="caixa" />
        <KPI label="Movimento de Hoje"
          value={<span className="flex items-baseline gap-1.5 text-lg"><span className="text-emerald-600">{fmtBRL(movimentoHoje.entradas)}</span><span className="text-slate-300 text-sm">/</span><span className="text-rose-600">{fmtBRL(movimentoHoje.saidas)}</span></span>}
          sub="Entradas / Saídas (exclui transferências)" tone="neutral" icon={ArrowUpRight} basis="caixa" />
      </div>

      <Panel title="Câmbio" subtitle="Referência PTAX (Banco Central) — não integra o caixa consolidado acima" right={<DollarSign size={15} className="text-slate-300" />}>
        {cambioCarregando ? <span className="text-sm text-slate-400">Carregando cotações…</span> : (
          <div className="grid grid-cols-2 gap-x-10">
            <div className="pr-5 border-r border-slate-100"><CambioMoeda nome="Dólar (USD)" d={cambioDados?.USD} /></div>
            <div className="pl-5"><CambioMoeda nome="Euro (EUR)" d={cambioDados?.EUR} /></div>
          </div>
        )}
      </Panel>

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
