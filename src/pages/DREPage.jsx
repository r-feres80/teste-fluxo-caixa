import React, { useState, useMemo } from "react";
import { Panel, Badge } from "../components/ui/Primitives.jsx";
import { TabelaArvoreOrcadoRealizado } from "../components/orcadoRealizadoTree.jsx";
import { fmtBRL } from "../utils/formatUtils.js";
import { getDataAtualSistema, parseISO, mesesDoPeriodo } from "../utils/dateUtils.js";
import { calcularDRE, linhasDRE } from "../financial-engine/dre.js";
import { excluirTransferencias } from "../financial-engine/lancamentos.js";
import { getValorOrcadoPeriodo } from "../financial-engine/orcamento.js";
import { construirOrcadoRealizado } from "../financial-engine/orcadoRealizado.js";
import { CLASSIFICACAO_DRE } from "../config/appConfig.js";

// Comando consolidado, Bloco 3: DRE Gerencial mudou de módulo de FATO
// (sempre mês corrente) para usar o Mês/Ano do Filtro Global — mesma
// convenção das outras telas de Planejamento (FP&A), pra onde esta tela se
// mudou. Ganhou também a árvore Grupo → Subgrupo → Conta (mesmo componente
// de Orçamento/Orçado x Realizado/Forecast, Bloco 2) logo abaixo do resumo
// de 13 linhas — a coluna "Orçado" explícita já existia no resumo, ficou
// mantida.
export default function DREPage({ data }) {
  const { entidades, filtros, parametros } = data;
  const anoRef = filtros.anoRef;
  const meses = mesesDoPeriodo(filtros);
  const [expandidos, setExpandidos] = useState(new Set(entidades.planoDeContas.map((c) => c.id)));
  const toggle = (id) => setExpandidos((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const arvore = useMemo(() => construirOrcadoRealizado({
    planoDeContas: entidades.planoDeContas, orcamentoItens: entidades.orcamentoItens, lancamentos: entidades.lancamentos,
    ano: anoRef, meses, empresaId: filtros.empresaId,
  }), [entidades.planoDeContas, entidades.orcamentoItens, entidades.lancamentos, anoRef, meses, filtros.empresaId]);

  const lancamentosPeriodo = useMemo(() => excluirTransferencias(entidades.lancamentos).filter((l) => {
    if (filtros.empresaId !== "TODAS" && l.empresaId !== filtros.empresaId) return false;
    const [ano, mes] = l.competencia.split("-").map(Number);
    return ano === anoRef && meses.includes(mes - 1);
  }), [entidades.lancamentos, filtros.empresaId, anoRef, meses]);

  const realizado = useMemo(() => calcularDRE(lancamentosPeriodo.filter((l) => l.situacao === "Realizado"), entidades.planoDeContas), [lancamentosPeriodo, entidades.planoDeContas]);
  const forecastLanc = useMemo(() => lancamentosPeriodo.filter((l) => l.situacao === "Realizado" || l.situacao === "Previsto" || l.situacao === "Em aberto"), [lancamentosPeriodo]);
  const forecast = useMemo(() => calcularDRE(forecastLanc, entidades.planoDeContas), [forecastLanc, entidades.planoDeContas]);

  const orcado = useMemo(() => {
    const buckets = {};
    CLASSIFICACAO_DRE.forEach((c) => { buckets[c] = 0; });
    entidades.planoDeContas.filter((c) => c.tipo === "Analítica" && c.aceitaOrcamento).forEach((conta) => {
      const v = getValorOrcadoPeriodo(entidades.orcamentoItens, { ano: anoRef, meses, contaGerencialId: conta.id, empresaId: filtros.empresaId !== "TODAS" ? filtros.empresaId : undefined });
      buckets[conta.classificacaoDRE] += v;
    });
    const receitaLiquida = buckets["Receita Bruta"] + buckets["Deduções"];
    const margemBruta = receitaLiquida + buckets["Custos"];
    const ebitda = margemBruta + buckets["Despesas com Pessoal"] + buckets["Despesas Administrativas"] + buckets["Despesas Comerciais"] + buckets["Outras Despesas Operacionais"];
    const resultadoFinanceiro = buckets["Receitas Financeiras"] + buckets["Despesas Financeiras"];
    const impostosSobreLucro = buckets["Impostos sobre o Lucro"];
    return { receitaBruta: buckets["Receita Bruta"], deducoes: buckets["Deduções"], receitaLiquida, custos: buckets["Custos"], margemBruta, despesasPessoal: buckets["Despesas com Pessoal"], despesasAdministrativas: buckets["Despesas Administrativas"], despesasComerciais: buckets["Despesas Comerciais"], outrasDespesasOperacionais: buckets["Outras Despesas Operacionais"], ebitda, receitasFinanceiras: buckets["Receitas Financeiras"], despesasFinanceiras: buckets["Despesas Financeiras"], resultadoFinanceiro, impostosSobreLucro, resultadoGerencial: ebitda + resultadoFinanceiro + impostosSobreLucro };
  }, [entidades.planoDeContas, entidades.orcamentoItens, anoRef, filtros.empresaId, meses]);

  const linhasReal = linhasDRE(realizado);
  const linhasForecast = linhasDRE(forecast);
  const linhasOrc = linhasDRE(orcado);

  // Visão Comparativa Mensal: 10 meses lado a lado terminando no Mês/Ano do
  // Filtro Global (antes era sempre "hoje" — agora acompanha o mesmo
  // período selecionado no resto da tela). Reaproveita calcularDRE (mesma
  // função da tabela acima) — só muda a apresentação de 1 coluna pra N.
  const mesRefIdx = meses[meses.length - 1] ?? parseISO(getDataAtualSistema()).getMonth();
  const mesesComparativo = useMemo(() => {
    const arr = [];
    for (let i = 9; i >= 0; i--) {
      const d = new Date(anoRef, mesRefIdx - i, 1);
      arr.push({ ano: d.getFullYear(), mes: d.getMonth() });
    }
    return arr;
  }, [anoRef, mesRefIdx]);

  const comparativoMensal = useMemo(() => mesesComparativo.map(({ ano, mes }) => {
    const competenciaDoMes = `${ano}-${String(mes + 1).padStart(2, "0")}`;
    const lancamentosDoMes = excluirTransferencias(entidades.lancamentos).filter((l) =>
      (filtros.empresaId === "TODAS" || l.empresaId === filtros.empresaId) &&
      l.competencia === competenciaDoMes && l.situacao === "Realizado"
    );
    return {
      label: new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", ""),
      ...calcularDRE(lancamentosDoMes, entidades.planoDeContas),
    };
  }), [mesesComparativo, entidades.lancamentos, entidades.planoDeContas, filtros.empresaId]);

  const LINHAS_COMPARATIVO = [
    { label: "Receita Bruta", campo: "receitaBruta", destaque: true },
    { label: "(-) Despesas com Pessoal", campo: "despesasPessoal" },
    { label: "(-) Despesas Administrativas", campo: "despesasAdministrativas" },
    { label: "(-) Despesas Comerciais", campo: "despesasComerciais" },
    { label: "(-) Outras Despesas Operacionais", campo: "outrasDespesasOperacionais" },
    { label: "= EBITDA", campo: "ebitda", destaque: true },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Panel title="DRE Gerencial" subtitle="Realizado x Forecast (Realizado + Previsto) x Orçado, por Competência">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 text-xs uppercase border-b border-slate-200"><th className="py-2 pr-4">Linha</th><th className="py-2 pr-4 text-right">Realizado</th><th className="py-2 pr-4 text-right">Forecast</th><th className="py-2 pr-4 text-right">Orçado</th><th className="py-2 pr-4 text-right">Δ Forecast x Orçado</th></tr></thead>
          <tbody>
            {linhasReal.map((l, i) => {
              const delta = linhasForecast[i].valor - linhasOrc[i].valor;
              return (
                <tr key={l.label} className={`border-b border-slate-100 ${l.destaque ? "font-semibold bg-slate-50" : ""}`}>
                  <td className="py-2 pr-4 text-slate-700">{l.label}</td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums">{fmtBRL(l.valor)}</td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums text-brand-violet-deep">{fmtBRL(linhasForecast[i].valor)}</td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums text-slate-500">{fmtBRL(linhasOrc[i].valor)}</td>
                  <td className={`py-2 pr-4 text-right font-mono tabular-nums ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmtBRL(delta)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      <Panel title="DRE por Conta" subtitle="Clique numa linha com subcontas para expandir/recolher (Grupo → Subgrupo → Conta)">
        <TabelaArvoreOrcadoRealizado arvore={arvore} expandidos={expandidos} toggle={toggle} parametros={parametros} />
      </Panel>

      <Panel title="Visão Comparativa Mensal" subtitle="Realizado — 10 meses lado a lado, terminando no Mês/Ano do Filtro Global">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase border-b border-slate-200">
                <th className="py-2 pr-4 sticky left-0 bg-white">Conta</th>
                {comparativoMensal.map((m) => <th key={m.label} className="py-2 px-3 text-right whitespace-nowrap">{m.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {LINHAS_COMPARATIVO.map((linha) => (
                <tr key={linha.campo} className={`border-b border-slate-100 ${linha.destaque ? "font-semibold bg-slate-50" : ""}`}>
                  <td className="py-2 pr-4 text-slate-700 sticky left-0 bg-white whitespace-nowrap">{linha.label}</td>
                  {comparativoMensal.map((m) => (
                    <td key={m.label} className="py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap">{fmtBRL(m[linha.campo])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
