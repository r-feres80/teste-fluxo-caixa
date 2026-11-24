import React, { useMemo, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Panel, InfoNote, selectCls } from "../components/ui/Primitives.jsx";
import { fmtBRL, fmtBRLShort } from "../utils/formatUtils.js";
import { getDataAtualSistema, parseISO, startOfMonthISO, endOfMonthISO, diffDaysISO, addDaysISO, proximoDiaUtil } from "../utils/dateUtils.js";
import { calcularDFCDiretoArvore } from "../financial-engine/dfc.js";
import { calcularPosicaoConsolidada } from "../financial-engine/tesouraria.js";

// ---- DFC Mensal com Centro de Custo ----------------------------------------

/** Retorna 4 janelas de período: mês atual + 3 meses calendário seguintes */
function buildPeriodos(hojeISO) {
  const hoje = parseISO(hojeISO);
  const anoHoje = hoje.getFullYear();
  const mesHoje = hoje.getMonth();
  const periodos = [];
  for (let i = 0; i < 4; i++) {
    const ano = new Date(anoHoje, mesHoje + i, 1).getFullYear();
    const mes = new Date(anoHoje, mesHoje + i, 1).getMonth();
    const inicio = i === 0 ? proximoDiaUtil(startOfMonthISO(ano, mes)) : startOfMonthISO(ano, mes);
    const fim = endOfMonthISO(ano, mes);
    const label = `${["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][mes]}/${ano}`;
    const isMesAtual = i === 0;
    periodos.push({ ano, mes, inicio, fim, label, isMesAtual });
  }
  return periodos;
}

/**
 * Para cada período, agrega lançamentos por tipo (Entrada/Saída) e centro de custo.
 * Mês atual: inclui Realizado + Em aberto/Previsto dentro do intervalo.
 * Meses futuros: inclui apenas Em aberto/Previsto (sem Realizado).
 */
function buildDFCPorCC({ lancamentos, centrosCusto, periodos, empresaId }) {
  const ccMap = new Map(centrosCusto.map((c) => [c.id, c.nome]));

  return periodos.map(({ inicio, fim, isMesAtual, label }) => {
    const lsPeriodo = lancamentos.filter((l) => {
      if (empresaId !== "TODAS" && l.empresaId !== empresaId) return false;
      if (l.transferencia) return false;
      const dataRef = l.dataPagamento || l.dataVencimento;
      if (!dataRef) return false;
      if (dataRef < inicio || dataRef > fim) return false;
      if (!isMesAtual && l.situacao === "Realizado") return false; // futuros: só Em aberto/Previsto
      return true;
    });

    const entradas = new Map();
    const saidas = new Map();
    lsPeriodo.forEach((l) => {
      const ccId = l.centroCustoId ?? "__sem__";
      const ccNome = l.centroCustoId ? (ccMap.get(l.centroCustoId) ?? l.centroCustoId) : "Sem Centro de Custo";
      const mapa = l.tipo === "Entrada" ? entradas : saidas;
      const prev = mapa.get(ccId) ?? { ccId, ccNome, valor: 0 };
      mapa.set(ccId, { ...prev, valor: prev.valor + l.valor });
    });

    const toArr = (m) => Array.from(m.values()).sort((a, b) => b.valor - a.valor);
    const totalEntradas = Array.from(entradas.values()).reduce((s, r) => s + r.valor, 0);
    const totalSaidas = Array.from(saidas.values()).reduce((s, r) => s + r.valor, 0);

    return { label, isMesAtual, entradas: toArr(entradas), saidas: toArr(saidas), totalEntradas, totalSaidas, saldo: totalEntradas - totalSaidas };
  });
}

function MenorValor({ v, bold }) {
  if (v === 0) return <span className="text-slate-300">—</span>;
  const cls = bold ? "font-semibold " : "";
  return <span className={cls + (v < 0 ? "text-rose-600" : "text-slate-700")}>{fmtBRLShort(v)}</span>;
}

const GRUPO_LABEL = { Operacional: "Atividades Operacionais", Investimento: "Atividades de Investimento", Financiamento: "Atividades de Financiamento" };
const NOMES_MES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function Valor({ v }) {
  if (v === 0) return <span className="text-slate-300">—</span>;
  return <span className={v < 0 ? "text-rose-600" : "text-slate-700"} title={fmtBRL(v)}>{fmtBRLShort(v)}</span>;
}

// ---- Componente DFC Mensal com CC ----------------------------------------
function DFCMensalCC({ entidades, filtros, hoje }) {
  const periodos = useMemo(() => buildPeriodos(hoje), [hoje]);
  const dfcCC = useMemo(() => buildDFCPorCC({
    lancamentos: entidades.lancamentos,
    centrosCusto: entidades.centrosCusto,
    periodos,
    empresaId: filtros.empresaId,
  }), [entidades.lancamentos, entidades.centrosCusto, periodos, filtros.empresaId]);

  const [expandEntradas, setExpandEntradas] = useState(true);
  const [expandSaidas, setExpandSaidas] = useState(true);

  // União de todos os CCs presentes em qualquer período
  const allCCEntradas = useMemo(() => {
    const seen = new Map();
    dfcCC.forEach((p) => p.entradas.forEach((r) => { if (!seen.has(r.ccId)) seen.set(r.ccId, r.ccNome); }));
    return Array.from(seen.entries()).map(([ccId, ccNome]) => ({ ccId, ccNome }));
  }, [dfcCC]);
  const allCCSaidas = useMemo(() => {
    const seen = new Map();
    dfcCC.forEach((p) => p.saidas.forEach((r) => { if (!seen.has(r.ccId)) seen.set(r.ccId, r.ccNome); }));
    return Array.from(seen.entries()).map(([ccId, ccNome]) => ({ ccId, ccNome }));
  }, [dfcCC]);

  const getVal = (arr, ccId) => arr.find((r) => r.ccId === ccId)?.valor ?? 0;

  return (
    <Panel
      title="DFC por Mês e Centro de Custo"
      subtitle={`${periodos[0].label} (1º dia útil → fim) + projeção ${periodos[1].label} · ${periodos[2].label} · ${periodos[3].label} — Em aberto/Previsto`}
    >
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse w-full">
          <thead>
            <tr className="text-slate-500 uppercase border-b border-slate-200">
              <th className="sticky left-0 bg-white py-2 pr-4 text-left min-w-[200px] z-10">Conta / Centro de Custo</th>
              {dfcCC.map((p) => (
                <th key={p.label} className={`py-2 px-3 text-right min-w-[110px] ${p.isMesAtual ? "text-blue-700 bg-blue-50" : ""}`}>
                  {p.label}
                  {p.isMesAtual && <div className="text-[9px] font-normal normal-case text-blue-500">Realizado + Prev.</div>}
                  {!p.isMesAtual && <div className="text-[9px] font-normal normal-case text-slate-400">Em aberto / Prev.</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* ---- Entradas ---- */}
            <tr className="bg-emerald-50 border-b border-emerald-100 cursor-pointer" onClick={() => setExpandEntradas((v) => !v)}>
              <td className="sticky left-0 bg-emerald-50 py-2 pr-4 font-semibold text-emerald-800 z-10 flex items-center gap-1.5">
                {expandEntradas ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                (+) Entradas
              </td>
              {dfcCC.map((p) => (
                <td key={p.label} className={`py-2 px-3 text-right font-semibold ${p.isMesAtual ? "bg-emerald-100" : "bg-emerald-50"}`}>
                  <MenorValor v={p.totalEntradas} bold />
                </td>
              ))}
            </tr>
            {expandEntradas && allCCEntradas.map(({ ccId, ccNome }) => (
              <tr key={ccId} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="sticky left-0 bg-white py-1.5 pr-4 pl-7 text-slate-500 z-10">{ccNome}</td>
                {dfcCC.map((p) => (
                  <td key={p.label} className={`py-1.5 px-3 text-right font-mono tabular-nums ${p.isMesAtual ? "bg-blue-50/30" : ""}`}>
                    <MenorValor v={getVal(p.entradas, ccId)} />
                  </td>
                ))}
              </tr>
            ))}

            {/* ---- Saídas ---- */}
            <tr className="bg-rose-50 border-b border-rose-100 cursor-pointer" onClick={() => setExpandSaidas((v) => !v)}>
              <td className="sticky left-0 bg-rose-50 py-2 pr-4 font-semibold text-rose-800 z-10 flex items-center gap-1.5">
                {expandSaidas ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                (−) Saídas
              </td>
              {dfcCC.map((p) => (
                <td key={p.label} className={`py-2 px-3 text-right font-semibold ${p.isMesAtual ? "bg-rose-100" : "bg-rose-50"}`}>
                  <MenorValor v={p.totalSaidas} bold />
                </td>
              ))}
            </tr>
            {expandSaidas && allCCSaidas.map(({ ccId, ccNome }) => (
              <tr key={ccId} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="sticky left-0 bg-white py-1.5 pr-4 pl-7 text-slate-500 z-10">{ccNome}</td>
                {dfcCC.map((p) => (
                  <td key={p.label} className={`py-1.5 px-3 text-right font-mono tabular-nums ${p.isMesAtual ? "bg-blue-50/30" : ""}`}>
                    <MenorValor v={getVal(p.saidas, ccId)} />
                  </td>
                ))}
              </tr>
            ))}

            {/* ---- Variação ---- */}
            <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
              <td className="sticky left-0 bg-slate-50 py-2.5 pr-4 z-10 text-slate-700">(=) Variação de Caixa</td>
              {dfcCC.map((p) => (
                <td key={p.label} className={`py-2.5 px-3 text-right font-mono tabular-nums ${p.isMesAtual ? "bg-blue-50" : ""}`}>
                  <MenorValor v={p.saldo} bold />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
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

      {arvore.length > 0 && arvore.every((g) => g.totalRealizado === 0) && (
        <InfoNote tone="amber">
          Nenhum lançamento Realizado encontrado para {NOMES_MES[mesSel]}/{anoSel} com os filtros atuais.
          Os valores "—" na tabela refletem que os títulos ainda não foram baixados (somente Previsto disponível).
          Verifique se há lançamentos com Data de Pagamento neste período em Contas a Pagar/Receber.
        </InfoNote>
      )}

      <Panel
        title="DFC"
        right={
          <div className="flex items-center gap-2">
            <button onClick={() => irParaMes(-1)} className="px-2.5 py-1.5 rounded text-xs border border-slate-300 text-slate-600 hover:bg-slate-50">Mês Passado</button>
            <button onClick={() => irParaMes(0)} disabled={mesEhCorrente} className={`px-2.5 py-1.5 rounded text-xs border ${mesEhCorrente ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>Mês Atual</button>
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

      <DFCMensalCC entidades={entidades} filtros={filtros} hoje={dataReferencia} />

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
