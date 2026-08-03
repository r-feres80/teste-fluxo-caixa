import React, { useMemo, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Panel, InfoNote } from "../components/ui/Primitives.jsx";
import { fmtBRL, fmtBRLShort } from "../utils/formatUtils.js";
import { getDataAtualSistema, parseISO, startOfMonthISO, endOfMonthISO, diffDaysISO, addDaysISO } from "../utils/dateUtils.js";
import { calcularDFCDiretoArvore } from "../financial-engine/dfc.js";

const GRUPO_LABEL = { Operacional: "Atividades Operacionais", Investimento: "Atividades de Investimento", Financiamento: "Atividades de Financiamento" };

function Valor({ v }) {
  if (v === 0) return <span className="text-slate-300">—</span>;
  return <span className={v < 0 ? "text-rose-600" : "text-slate-700"} title={fmtBRL(v)}>{fmtBRLShort(v)}</span>;
}

// DFC Direto é módulo de FATO: sempre o mês corrente real do sistema — nunca
// Período/Mês/Ano editáveis — ver getDataAtualSistema, mesmo padrão do DFCPage.
export default function DFCDiretoPage({ data }) {
  const { entidades, filtros } = data;
  const dataReferencia = getDataAtualSistema();
  const hoje = parseISO(dataReferencia);
  const anoRef = hoje.getFullYear();
  const mesRef = hoje.getMonth();
  const inicio = startOfMonthISO(anoRef, mesRef);
  const fim = endOfMonthISO(anoRef, mesRef);
  const totalDias = diffDaysISO(inicio, fim) + 1;
  const dias = useMemo(() => Array.from({ length: totalDias }, (_, i) => addDaysISO(inicio, i)), [inicio, totalDias]);

  const lancamentosNoPeriodo = useMemo(() => entidades.lancamentos.filter((l) => {
    if (filtros.empresaId !== "TODAS" && l.empresaId !== filtros.empresaId) return false;
    if (!l.dataPagamento) return false;
    return l.dataPagamento >= inicio && l.dataPagamento <= fim;
  }), [entidades.lancamentos, filtros.empresaId, inicio, fim]);

  const arvore = useMemo(() => calcularDFCDiretoArvore({
    lancamentosNoPeriodo, planoDeContas: entidades.planoDeContas, orcamentoItens: entidades.orcamentoItens,
    ano: anoRef, meses: [mesRef], empresaId: filtros.empresaId, dias,
  }), [lancamentosNoPeriodo, entidades.planoDeContas, entidades.orcamentoItens, anoRef, mesRef, filtros.empresaId, dias]);

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
        "Total Previsto" vem do Orçamento do mês corrente.
      </InfoNote>

      <Panel title="DFC Direto">
        {arvore.length === 0 ? (
          <span className="text-sm text-slate-400">Sem movimento Realizado no mês corrente para os filtros atuais.</span>
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
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
