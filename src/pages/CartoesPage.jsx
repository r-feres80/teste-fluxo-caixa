import React from "react";
import { CreditCard, CalendarClock, Gauge as GaugeIcon, Info } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Panel, KPI, InfoNote } from "../components/ui/Primitives.jsx";
import { fmtBRL, fmtBRLShort, fmtData } from "../utils/formatUtils.js";
import { getDataAtualSistema, diffDaysISO } from "../utils/dateUtils.js";
import {
  calcularPosicaoCartoes, consolidarCartoes, despesasPorCentroCusto,
} from "../financial-engine/cartoes.js";
import {
  BRAND, SEMANTIC, EIXO, GRID, ANIM, RAIO_BARRA_H,
  tooltipProps, gradienteBarraStops, BORDA_CARD, SOMBRA_CARD,
} from "../utils/chartTheme.js";

// Módulo de FATO: cartão é posição viva (limite, utilizado, vencimento),
// não período fechado — mesmo padrão de Tesouraria e Aplicações, sem filtro
// de Mês/Ano. Segue o filtro de Empresa, porque cada cartão pertence a uma.
//
// As despesas vêm de `entidades.despesasCartao`, coleção separada de
// `lancamentos` por decisão de manter o módulo isolado: compra no cartão não
// sai do caixa na data da compra, então injetá-la no motor de lançamentos
// distorceria DPO, projeção de fluxo e liquidez.

// Cor do consumo: até 60% do limite é confortável, 60-85% exige atenção,
// acima de 85% é risco de estourar antes do próximo fechamento.
function corPorUso(pct) {
  if (pct >= 85) return SEMANTIC.vermelho;
  if (pct >= 60) return SEMANTIC.laranja;
  return SEMANTIC.verde;
}

function BarraUso({ pct }) {
  const cor = corPorUso(pct);
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#EEF0F7" }}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${Math.min(100, pct)}%`, background: `linear-gradient(90deg, ${cor}CC, ${cor})` }}
      />
    </div>
  );
}

function CartaoCard({ pos, nomeBanco }) {
  const { cartao, limite, utilizado, disponivel, pctUtilizado, proximoVencimento, valorProximaFatura, valorFaturasFechadas, valorCicloCorrente } = pos;
  const hoje = getDataAtualSistema();
  const diasAteVencer = proximoVencimento ? diffDaysISO(hoje, proximoVencimento) : null;

  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDA_CARD}`, boxShadow: SOMBRA_CARD }}>
      {/* Faixa superior com a identidade do cartão */}
      <div
        className="px-5 py-4 flex items-start justify-between gap-3"
        style={{ background: "linear-gradient(135deg,#7C3AED 0%,#2563EB 55%,#06B6D4 100%)" }}
      >
        <div className="min-w-0">
          <div className="text-white font-semibold text-sm truncate">{cartao.apelido}</div>
          <div className="text-white/75 text-xs mt-0.5 truncate">{nomeBanco}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-white font-mono tabular-nums text-sm tracking-widest">•••• {cartao.final}</div>
          <div className="text-white/70 text-[11px] mt-0.5 truncate">{cartao.titular}</div>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4">
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[11px] uppercase tracking-wide text-slate-500">Utilizado</span>
            <span className="font-mono tabular-nums text-sm font-semibold" style={{ color: corPorUso(pctUtilizado) }}>
              {pctUtilizado.toFixed(1)}%
            </span>
          </div>
          <BarraUso pct={pctUtilizado} />
          <div className="flex items-baseline justify-between mt-2 text-xs">
            <span className="font-mono tabular-nums font-semibold text-slate-800">{fmtBRL(utilizado)}</span>
            <span className="text-slate-400">limite {fmtBRL(limite)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-slate-500 text-[11px] uppercase tracking-wide">Disponível</div>
            <div className="font-mono tabular-nums font-semibold text-emerald-600 mt-0.5">{fmtBRL(disponivel)}</div>
          </div>
          <div>
            <div className="text-slate-500 text-[11px] uppercase tracking-wide flex items-center gap-1">
              Vencimento
              <Info size={10} className="text-slate-300 cursor-help" title="Fatura em aberto mais próxima. Se há fatura fechada aguardando pagamento, é a dela; senão, a do ciclo corrente." />
            </div>
            <div className="font-mono tabular-nums font-semibold text-slate-800 mt-0.5">
              {proximoVencimento ? fmtData(proximoVencimento) : "—"}
            </div>
            {diasAteVencer != null && (
              <div className="text-[11px] mt-0.5" style={{ color: diasAteVencer <= 5 ? SEMANTIC.laranja : "#94A3B8" }}>
                {diasAteVencer === 0 ? "vence hoje" : diasAteVencer > 0 ? `em ${diasAteVencer} dias` : `vencida há ${-diasAteVencer} dias`}
                {valorProximaFatura > 0 && ` · ${fmtBRL(valorProximaFatura)}`}
              </div>
            )}
          </div>
        </div>

        {/* Composição do "em aberto": o que já fechou e aguarda pagamento
            versus o que ainda está correndo e pode crescer até o fechamento */}
        <div className="pt-3 flex items-center justify-between text-[11px]" style={{ borderTop: `1px solid ${BORDA_CARD}` }}>
          <span className="text-slate-500">
            Fatura fechada <span className="font-mono tabular-nums text-slate-700 font-semibold">{fmtBRL(valorFaturasFechadas)}</span>
          </span>
          <span className="text-slate-500">
            Ciclo corrente <span className="font-mono tabular-nums text-slate-700 font-semibold">{fmtBRL(valorCicloCorrente)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CartoesPage({ data }) {
  const { entidades, filtros } = data;
  const hoje = getDataAtualSistema();

  const posicoes = React.useMemo(() => {
    const f = filtros.empresaId && filtros.empresaId !== "TODAS" ? { empresaId: filtros.empresaId } : {};
    return calcularPosicaoCartoes(entidades.cartoes, entidades.despesasCartao, hoje, f);
  }, [entidades.cartoes, entidades.despesasCartao, filtros.empresaId, hoje]);

  const consolidado = React.useMemo(() => consolidarCartoes(posicoes), [posicoes]);
  const porCC = React.useMemo(
    () => despesasPorCentroCusto(posicoes, entidades.centrosCusto),
    [posicoes, entidades.centrosCusto],
  );
  const nomeBanco = React.useMemo(() => {
    const m = new Map((entidades.bancos ?? []).map((b) => [b.id, b.nome]));
    return (id) => m.get(id) ?? "—";
  }, [entidades.bancos]);

  if (posicoes.length === 0) {
    return (
      <div className="p-6">
        <InfoNote>
          Nenhum cartão cadastrado para o filtro atual. Carregue a base demonstrativa em
          Dados → Governança para ver o módulo com números.
        </InfoNote>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <InfoNote>
        Posição viva dos cartões — não segue o filtro de Mês/Ano. "Utilizado" é o total em
        aberto: ciclo corrente mais faturas já fechadas e ainda não pagas. As compras de
        cartão não entram no Fluxo de Caixa nem no DRE: o caixa só sai no pagamento da
        fatura, num lançamento único.
      </InfoNote>

      <div className="grid grid-cols-4 gap-4">
        <KPI label="Limite total" value={fmtBRL(consolidado.limite)} icon={CreditCard} tone="neutral"
             sub={`${consolidado.qtdCartoes} cartão(ões) ativo(s)`} />
        <KPI label="Utilizado" value={fmtBRL(consolidado.utilizado)} icon={GaugeIcon}
             tone={consolidado.pctUtilizado >= 85 ? "negative" : consolidado.pctUtilizado >= 60 ? "warning" : "neutral"}
             sub={`${consolidado.pctUtilizado.toFixed(1)}% do limite`} />
        <KPI label="Disponível" value={fmtBRL(consolidado.disponivel)} icon={CreditCard} tone="positive"
             sub="Para novas compras" />
        <KPI label="Próxima fatura" value={consolidado.proximoVencimento ? fmtData(consolidado.proximoVencimento) : "—"}
             icon={CalendarClock} tone="warning"
             sub={consolidado.cartaoProximaFatura ? `${consolidado.cartaoProximaFatura.apelido} · ${fmtBRL(consolidado.valorProximaFatura)}` : "—"} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {posicoes.map((p) => (
          <CartaoCard key={p.cartao.id} pos={p} nomeBanco={nomeBanco(p.cartao.bancoId)} />
        ))}
      </div>

      <Panel
        title="Despesas por Centro de Custo"
        subtitle="Só o que está em aberto — casa com o número de Utilizado acima"
      >
        <ResponsiveContainer width="100%" height={Math.max(220, porCC.length * 34)}>
          <BarChart data={porCC} layout="vertical" margin={{ left: 20 }}>
            <defs>
              <linearGradient id="gradCartaoCC" x1="0" y1="0" x2="1" y2="0">
                {gradienteBarraStops(BRAND.roxo, { topo: 1, base: 0.55 }).map((s) => <stop key={s.offset} {...s} />)}
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID} vertical horizontal={false} />
            <XAxis type="number" {...EIXO} tickFormatter={fmtBRLShort} />
            <YAxis type="category" dataKey="nome" {...EIXO} width={140} />
            <Tooltip {...tooltipProps()} formatter={(v) => fmtBRL(v)} />
            {/* Sem <Cell> aqui: Cell sobrescreve o fill da Bar, e Cells sem
                fill próprio deixam a barra transparente. */}
            <Bar dataKey="valor" fill="url(#gradCartaoCC)" radius={RAIO_BARRA_H} {...ANIM} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Faturas por Cartão" subtitle="Ciclos em aberto e já pagos">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500" style={{ borderBottom: `1px solid ${BORDA_CARD}` }}>
                <th className="py-2 pr-4 font-semibold">Cartão</th>
                <th className="py-2 pr-4 font-semibold">Ciclo</th>
                <th className="py-2 pr-4 font-semibold">Fechamento</th>
                <th className="py-2 pr-4 font-semibold">Vencimento</th>
                <th className="py-2 pr-4 font-semibold text-right">Valor</th>
                <th className="py-2 font-semibold">Situação</th>
              </tr>
            </thead>
            <tbody>
              {posicoes.flatMap((p) =>
                p.ciclos.slice().reverse().map((c) => (
                  <tr key={`${p.cartao.id}-${c.ciclo}`} className="hover:bg-slate-50" style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td className="py-2 pr-4 text-slate-700">
                      {p.cartao.apelido} <span className="font-mono text-slate-400">••••{p.cartao.final}</span>
                    </td>
                    <td className="py-2 pr-4 font-mono tabular-nums text-slate-600">{c.ciclo}</td>
                    <td className="py-2 pr-4 font-mono tabular-nums text-slate-600">{fmtData(c.fechamento)}</td>
                    <td className="py-2 pr-4 font-mono tabular-nums text-slate-600">{fmtData(c.vencimento)}</td>
                    <td className="py-2 pr-4 font-mono tabular-nums text-right font-semibold text-slate-800">{fmtBRL(c.valor)}</td>
                    <td className="py-2">
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                        style={
                          c.pago ? { background: "#ECFDF5", color: SEMANTIC.verde }
                          : c.corrente ? { background: "#EEF3FF", color: BRAND.azul }
                          : { background: "#FFF7ED", color: SEMANTIC.laranja }
                        }
                      >
                        {c.pago ? "Paga" : c.corrente ? "Ciclo corrente" : "Fechada — a pagar"}
                      </span>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
