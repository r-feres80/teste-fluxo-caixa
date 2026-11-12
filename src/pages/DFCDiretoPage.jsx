import React, { useMemo, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Panel, InfoNote, selectCls } from "../components/ui/Primitives.jsx";
import { fmtBRL, fmtBRLShort } from "../utils/formatUtils.js";
import { getDataAtualSistema, parseISO, startOfMonthISO, endOfMonthISO, diffDaysISO, addDaysISO } from "../utils/dateUtils.js";
import { calcularDFCDiretoArvore } from "../financial-engine/dfc.js";
import { calcularPosicaoConsolidada } from "../financial-engine/tesouraria.js";

const GRUPO_LABEL = { Operacional: "Atividades Operacionais", Investimento: "Atividades de Investimento", Financiamento: "Atividades de Financiamento" };
const NOMES_MES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function Valor({ v }) {
  if (v === 0) return <span className="text-vel-text-muted">—</span>;
  return <span className={v < 0 ? "text-rose-400" : "text-vel-text-sub"} title={fmtBRL(v)}>{fmtBRLShort(v)}</span>;
}

// DFC Direto é módulo de FATO (Realizado sempre por Data de baixa, nunca por
// Data de Referência editável), mas — diferente dos demais módulos de FATO —
// tem filtro local de Mês/Ano (item 4/Etapa 4): olhar só o mês corrente fazia
// a tabela aparecer "zerada" nos primeiros dias do mês (poucos dias já
// realizados) e não dava pra conferir um mês passado inteiro. O padrão
// getDataAtualSistema/NAV_FATO continua intacto — isso é navegação de
// período dentro da própria página, não a Data de Referência global.
export default function DFCDiretoPage({ data }) {
  const { entidades, filtros } = data;
  const dataReferencia = getDataAtualSistema();
  const hoje = parseISO(dataReferencia);
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();
  const [anoSel, setAnoSel] = useState(anoAtual);
  const [mesSel, setMesSel] = useState(mesAtual);
  const inicio = startOfMonthISO(anoSel, mesSel);
  const fim = endOfMonthISO(anoSel, mesSel);
  const totalDias = diffDaysISO(inicio, fim) + 1;
  const dias = useMemo(() => Array.from({ length: totalDias }, (_, i) => addDaysISO(inicio, i)), [inicio, totalDias]);
  const mesEhCorrente = anoSel === anoAtual && mesSel === mesAtual;

  const irParaMes = (deltaMeses) => {
    const d = new Date(anoAtual, mesAtual + deltaMeses, 1);
    setAnoSel(d.getFullYear());
    setMesSel(d.getMonth());
  };

  const lancamentosNoPeriodo = useMemo(() => entidades.lancamentos.filter((l) => {
    if (filtros.empresaId !== "TODAS" && l.empresaId !== filtros.empresaId) return false;
    if (!l.dataPagamento) return false;
    return l.dataPagamento >= inicio && l.dataPagamento <= fim;
  }), [entidades.lancamentos, filtros.empresaId, inicio, fim]);

  const contasFiltradas = useMemo(() => entidades.contasBancarias.filter((c) => c.ativo && (filtros.empresaId === "TODAS" || c.empresaId === filtros.empresaId)), [entidades.contasBancarias, filtros.empresaId]);

  const arvore = useMemo(() => calcularDFCDiretoArvore({
    lancamentosNoPeriodo, planoDeContas: entidades.planoDeContas, contasBancarias: contasFiltradas, orcamentoItens: entidades.orcamentoItens,
    ano: anoSel, meses: [mesSel], empresaId: filtros.empresaId, dias,
  }), [lancamentosNoPeriodo, entidades.planoDeContas, contasFiltradas, entidades.orcamentoItens, anoSel, mesSel, filtros.empresaId, dias]);

  // Saldo Final (comando consolidado, Bloco 3; atualizado no comando
  // DFC-caixa-real): Caixa Inicial do mês + soma de tudo que passou pela
  // árvore = saldo final teórico. Comparado com o CAIXA DISPONÍVEL real de
  // Tesouraria no último dia do período (não mais o Total Consolidado —
  // aplicação financeira é uso de caixa, não caixa em si) — mesmo dado, dois
  // caminhos de cálculo, tem que bater (senão alguma conta Realizada não
  // está classificada em nenhum Grupo DFC, ou algum lançamento não-
  // transferência está postado numa conta de aplicação sem ser Rendimento).
  const caixaInicialMes = useMemo(() => calcularPosicaoConsolidada(contasFiltradas, entidades.lancamentos, addDaysISO(inicio, -1)).disponivel, [contasFiltradas, entidades.lancamentos, inicio]);
  const saldoFinalCalculado = caixaInicialMes + arvore.reduce((s, g) => s + g.totalRealizado, 0);
  const saldoFinalReal = useMemo(() => calcularPosicaoConsolidada(contasFiltradas, entidades.lancamentos, fim).disponivel, [contasFiltradas, entidades.lancamentos, fim]);
  const saldoBate = Math.abs(saldoFinalCalculado - saldoFinalReal) < 0.01;

  // Recolhidos (não expandidos) — por padrão tudo aberto, como no TreeView do
  // Plano de Contas: guardamos só as chaves que o usuário fechou.
  const [recolhidos, setRecolhidos] = useState(() => new Set());
  const aberto = (key) => !recolhidos.has(key);
  const toggle = (key) => setRecolhidos((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  return (
    <div className="flex flex-col gap-6">
      <InfoNote>
        Movimento Realizado (Data de baixa) de {inicio.split("-").reverse().join("/")} a {fim.split("-").reverse().join("/")},
        organizado por Grupo → Subgrupo → Conta (campos "Classificação DFC" e "Subgrupo" do Plano de Contas).
        "Total Previsto" vem do Orçamento do mês selecionado.
      </InfoNote>

      <Panel
        title="DFC"
        right={
          <div className="flex items-center gap-2">
            <button onClick={() => irParaMes(-1)} className="px-2.5 py-1.5 rounded text-xs border border-vel-border text-vel-text-sub hover:bg-vel-surface-alt">Mês Passado</button>
            <button onClick={() => irParaMes(0)} disabled={mesEhCorrente} className={`px-2.5 py-1.5 rounded text-xs border ${mesEhCorrente ? "border-emerald-700/40 bg-emerald-900/20 text-emerald-400" : "border-vel-border text-vel-text-sub hover:bg-vel-surface-alt"}`}>Mês Atual</button>
            <button onClick={() => irParaMes(1)} className="px-2.5 py-1.5 rounded text-xs border border-vel-border text-vel-text-sub hover:bg-vel-surface-alt">Próximo Mês</button>
            <select value={mesSel} onChange={(e) => setMesSel(Number(e.target.value))} className={selectCls + " w-auto"}>
              {NOMES_MES.map((nome, i) => <option key={nome} value={i}>{nome}</option>)}
            </select>
            <select value={anoSel} onChange={(e) => setAnoSel(Number(e.target.value))} className={selectCls + " w-auto"}>
              {[anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1].map((ano) => <option key={ano} value={ano}>{ano}</option>)}
            </select>
          </div>
        }
      >
        {arvore.length === 0 ? (
          <span className="text-sm text-vel-text-muted">Sem movimento Realizado em {NOMES_MES[mesSel]}/{anoSel} para os filtros atuais.</span>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr className="text-vel-text-muted uppercase border-b border-vel-border">
                  <th className="sticky left-0 bg-vel-surface py-2 pr-4 text-left min-w-[220px] z-10">Conta</th>
                  {dias.map((d) => <th key={d} className="py-2 px-1.5 text-right font-mono min-w-[48px]">{d.slice(8, 10)}</th>)}
                  <th className="py-2 px-3 text-right min-w-[100px] border-l border-vel-border">Total Real.</th>
                  <th className="py-2 px-3 text-right min-w-[100px]">Total Prev.</th>
                </tr>
              </thead>
              <tbody>
                {arvore.map((grupo) => (
                  <React.Fragment key={grupo.nome}>
                    <tr className="bg-vel-surface-alt font-semibold border-b border-vel-border">
                      <td className="sticky left-0 bg-vel-surface-alt py-2 pr-4 z-10">
                        <button onClick={() => toggle(grupo.nome)} className="flex items-center gap-1.5 text-vel-text">
                          {aberto(grupo.nome) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          {GRUPO_LABEL[grupo.nome]}
                        </button>
                      </td>
                      {grupo.porDia.map((v, i) => <td key={i} className="py-2 px-1.5 text-right"><Valor v={v} /></td>)}
                      <td className="py-2 px-3 text-right border-l border-vel-border"><Valor v={grupo.totalRealizado} /></td>
                      <td className="py-2 px-3 text-right"><Valor v={grupo.totalPrevisto} /></td>
                    </tr>

                    {aberto(grupo.nome) && grupo.subgrupos.map((sub) => {
                      const subKey = `${grupo.nome}::${sub.nome}`;
                      return (
                        <React.Fragment key={subKey}>
                          <tr className="border-b border-vel-border/50">
                            <td className="sticky left-0 bg-vel-surface py-1.5 pr-4 pl-5 z-10">
                              <button onClick={() => toggle(subKey)} className="flex items-center gap-1.5 text-vel-text-sub">
                                {aberto(subKey) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                {sub.nome}
                              </button>
                            </td>
                            {sub.porDia.map((v, i) => <td key={i} className="py-1.5 px-1.5 text-right"><Valor v={v} /></td>)}
                            <td className="py-1.5 px-3 text-right border-l border-vel-border"><Valor v={sub.totalRealizado} /></td>
                            <td className="py-1.5 px-3 text-right"><Valor v={sub.totalPrevisto} /></td>
                          </tr>
                          {aberto(subKey) && sub.contas.map((conta) => (
                            <tr key={conta.id} className="border-b border-vel-border/30">
                              <td className="sticky left-0 bg-vel-surface py-1 pr-4 pl-10 text-vel-text-muted z-10">{conta.nome}</td>
                              {conta.porDia.map((v, i) => <td key={i} className="py-1 px-1.5 text-right"><Valor v={v} /></td>)}
                              <td className="py-1 px-3 text-right border-l border-vel-border/50"><Valor v={conta.totalRealizado} /></td>
                              <td className="py-1 px-3 text-right"><Valor v={conta.totalPrevisto} /></td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                ))}
                <tr className="border-t-2 border-vel-border">
                  <td className="sticky left-0 bg-vel-surface py-2 pr-4 text-vel-text-muted z-10">Caixa Inicial</td>
                  {dias.map((_, i) => <td key={i} />)}
                  <td className="py-2 px-3 text-right border-l border-vel-border font-mono tabular-nums text-vel-text-muted" colSpan={2}>{fmtBRL(caixaInicialMes)}</td>
                </tr>
                <tr className="font-semibold bg-vel-surface-alt border-b-2 border-vel-border">
                  <td className="sticky left-0 bg-vel-surface-alt py-2 pr-4 z-10">Saldo Final (Caixa Inicial + Total Real.)</td>
                  {dias.map((_, i) => <td key={i} />)}
                  <td className="py-2 px-3 text-right border-l border-vel-border font-mono tabular-nums" colSpan={2}>{fmtBRL(saldoFinalCalculado)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <InfoNote tone={saldoBate ? undefined : "amber"}>
        Saldo Final calculado (Caixa Inicial + Total Realizado do período): <strong>{fmtBRL(saldoFinalCalculado)}</strong>.
        Caixa Disponível real em Tesouraria no último dia do período: <strong>{fmtBRL(saldoFinalReal)}</strong>.
        {saldoBate ? " Os dois batem — nenhuma conta Realizada ficou fora da classificação de Grupo DFC." : " Os dois NÃO batem — há lançamento(s) Realizado(s) sem Classificação DFC preenchida, fora da árvore acima."}
        {" "}"Caixa" aqui é o Disponível (contas líquidas) — Aplicações Financeiras não entram: aporte/resgate aparecem na árvore como Atividades de
        Investimento, mas o saldo da própria conta de aplicação fica de fora da reconciliação.
      </InfoNote>
    </div>
  );
}
