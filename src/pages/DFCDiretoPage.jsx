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
  if (v === 0) return <span className="text-slate-300">—</span>;
  return <span className={v < 0 ? "text-rose-600" : "text-slate-700"} title={fmtBRL(v)}>{fmtBRLShort(v)}</span>;
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

  const arvore = useMemo(() => calcularDFCDiretoArvore({
    lancamentosNoPeriodo, planoDeContas: entidades.planoDeContas, orcamentoItens: entidades.orcamentoItens,
    ano: anoSel, meses: [mesSel], empresaId: filtros.empresaId, dias,
  }), [lancamentosNoPeriodo, entidades.planoDeContas, entidades.orcamentoItens, anoSel, mesSel, filtros.empresaId, dias]);

  // Saldo Final (comando consolidado, Bloco 3): Caixa Inicial do mês + soma
  // de tudo que passou pela árvore = saldo final teórico. Comparado com o
  // saldo consolidado real de Tesouraria no último dia do período — mesmo
  // dado, dois caminhos de cálculo, tem que bater (senão alguma conta
  // Realizada não está classificada em nenhum Grupo DFC).
  const contasFiltradas = useMemo(() => entidades.contasBancarias.filter((c) => c.ativo && (filtros.empresaId === "TODAS" || c.empresaId === filtros.empresaId)), [entidades.contasBancarias, filtros.empresaId]);
  const caixaInicialMes = useMemo(() => calcularPosicaoConsolidada(contasFiltradas, entidades.lancamentos, addDaysISO(inicio, -1)).total, [contasFiltradas, entidades.lancamentos, inicio]);
  const saldoFinalCalculado = caixaInicialMes + arvore.reduce((s, g) => s + g.totalRealizado, 0);
  const saldoFinalReal = useMemo(() => calcularPosicaoConsolidada(contasFiltradas, entidades.lancamentos, fim).total, [contasFiltradas, entidades.lancamentos, fim]);
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
            <button onClick={() => irParaMes(-1)} className="px-2.5 py-1.5 rounded text-xs border border-slate-300 text-slate-600 hover:bg-slate-50">Mês Passado</button>
            <button onClick={() => irParaMes(0)} disabled={mesEhCorrente} className={`px-2.5 py-1.5 rounded text-xs border ${mesEhCorrente ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>Mês Atual</button>
            <button onClick={() => irParaMes(1)} className="px-2.5 py-1.5 rounded text-xs border border-slate-300 text-slate-600 hover:bg-slate-50">Próximo Mês</button>
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
          <span className="text-sm text-slate-400">Sem movimento Realizado em {NOMES_MES[mesSel]}/{anoSel} para os filtros atuais.</span>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr className="text-slate-500 uppercase border-b border-slate-200">
                  <th className="sticky left-0 bg-white py-2 pr-4 text-left min-w-[220px] z-10">Conta</th>
                  {dias.map((d) => <th key={d} className="py-2 px-1.5 text-right font-mono min-w-[48px]">{d.slice(8, 10)}</th>)}
                  <th className="py-2 px-3 text-right min-w-[100px] border-l border-slate-200">Total Real.</th>
                  <th className="py-2 px-3 text-right min-w-[100px]">Total Prev.</th>
                </tr>
              </thead>
              <tbody>
                {arvore.map((grupo) => (
                  <React.Fragment key={grupo.nome}>
                    <tr className="bg-slate-50 font-semibold border-b border-slate-200">
                      <td className="sticky left-0 bg-slate-50 py-2 pr-4 z-10">
                        <button onClick={() => toggle(grupo.nome)} className="flex items-center gap-1.5 text-slate-800">
                          {aberto(grupo.nome) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          {GRUPO_LABEL[grupo.nome]}
                        </button>
                      </td>
                      {grupo.porDia.map((v, i) => <td key={i} className="py-2 px-1.5 text-right"><Valor v={v} /></td>)}
                      <td className="py-2 px-3 text-right border-l border-slate-200"><Valor v={grupo.totalRealizado} /></td>
                      <td className="py-2 px-3 text-right"><Valor v={grupo.totalPrevisto} /></td>
                    </tr>

                    {aberto(grupo.nome) && grupo.subgrupos.map((sub) => {
                      const subKey = `${grupo.nome}::${sub.nome}`;
                      return (
                        <React.Fragment key={subKey}>
                          <tr className="border-b border-slate-100">
                            <td className="sticky left-0 bg-white py-1.5 pr-4 pl-5 z-10">
                              <button onClick={() => toggle(subKey)} className="flex items-center gap-1.5 text-slate-600">
                                {aberto(subKey) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                {sub.nome}
                              </button>
                            </td>
                            {sub.porDia.map((v, i) => <td key={i} className="py-1.5 px-1.5 text-right"><Valor v={v} /></td>)}
                            <td className="py-1.5 px-3 text-right border-l border-slate-200"><Valor v={sub.totalRealizado} /></td>
                            <td className="py-1.5 px-3 text-right"><Valor v={sub.totalPrevisto} /></td>
                          </tr>
                          {aberto(subKey) && sub.contas.map((conta) => (
                            <tr key={conta.id} className="border-b border-slate-50">
                              <td className="sticky left-0 bg-white py-1 pr-4 pl-10 text-slate-500 z-10">{conta.nome}</td>
                              {conta.porDia.map((v, i) => <td key={i} className="py-1 px-1.5 text-right"><Valor v={v} /></td>)}
                              <td className="py-1 px-3 text-right border-l border-slate-100"><Valor v={conta.totalRealizado} /></td>
                              <td className="py-1 px-3 text-right"><Valor v={conta.totalPrevisto} /></td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                ))}
                <tr className="border-t-2 border-slate-300">
                  <td className="sticky left-0 bg-white py-2 pr-4 text-slate-500 z-10">Caixa Inicial</td>
                  {dias.map((_, i) => <td key={i} />)}
                  <td className="py-2 px-3 text-right border-l border-slate-200 font-mono tabular-nums text-slate-500" colSpan={2}>{fmtBRL(caixaInicialMes)}</td>
                </tr>
                <tr className="font-semibold bg-slate-50 border-b-2 border-slate-300">
                  <td className="sticky left-0 bg-slate-50 py-2 pr-4 z-10">Saldo Final (Caixa Inicial + Total Real.)</td>
                  {dias.map((_, i) => <td key={i} />)}
                  <td className="py-2 px-3 text-right border-l border-slate-200 font-mono tabular-nums" colSpan={2}>{fmtBRL(saldoFinalCalculado)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <InfoNote tone={saldoBate ? undefined : "amber"}>
        Saldo Final calculado (Caixa Inicial + Total Realizado do período): <strong>{fmtBRL(saldoFinalCalculado)}</strong>.
        Saldo real consolidado em Tesouraria no último dia do período: <strong>{fmtBRL(saldoFinalReal)}</strong>.
        {saldoBate ? " Os dois batem — nenhuma conta Realizada ficou fora da classificação de Grupo DFC." : " Os dois NÃO batem — há lançamento(s) Realizado(s) sem Classificação DFC preenchida, fora da árvore acima."}
      </InfoNote>
    </div>
  );
}
