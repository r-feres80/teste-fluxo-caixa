import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Panel, Badge, InfoNote } from "../components/ui/Primitives.jsx";
import { montarArvore } from "../financial-engine/treeUtils.js";

// Comando consolidado, Bloco 3: Plano de Contas somente leitura — o cadastro
// manual foi removido do produto faz tempo (item 12/Etapa 4, "produto é
// analytics sobre dado de origem"); esta tela existe só pra CONSULTAR a
// hierarquia que rege DRE/DFC/Orçado x Realizado, nunca pra editar. Toda
// conta chega pronta no código (demoData.js) ou é auto-criada durante o
// import (financial-engine/importacao.js) — nunca por aqui.
function LinhaConta({ conta, profundidade, expandidos, toggle }) {
  const aberto = expandidos.has(conta.id);
  const temFilhos = conta.filhos.length > 0;
  return (
    <>
      <tr className={`border-b border-slate-100 hover:bg-slate-50 ${temFilhos ? "cursor-pointer" : ""}`} onClick={() => temFilhos && toggle(conta.id)}>
        <td className="py-2 pr-4" style={{ paddingLeft: `${profundidade * 18 + 12}px` }}>
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            {temFilhos ? (aberto ? <ChevronDown size={13} className="text-slate-400" /> : <ChevronRight size={13} className="text-slate-400" />) : <span className="w-3" />}
            <span className="font-mono text-xs text-slate-400">{conta.codigo}</span> {conta.descricao}
          </span>
        </td>
        <td className="py-2 pr-4"><Badge tone={conta.tipo === "Sintética" ? "slate" : "emerald"}>{conta.tipo}</Badge></td>
        <td className="py-2 pr-4 text-slate-500 text-xs">{conta.natureza}</td>
        <td className="py-2 pr-4 text-slate-500 text-xs">{conta.classificacaoDRE}</td>
        <td className="py-2 pr-4 text-slate-500 text-xs">{conta.classificacaoDFC}{conta.subgrupoDFC ? ` / ${conta.subgrupoDFC}` : ""}</td>
        <td className="py-2 pr-4 text-center">{conta.centroCustoObrigatorio ? <Badge tone="amber">obrigatório</Badge> : ""}</td>
        <td className="py-2 pr-4 text-center">{conta.aceitaOrcamento ? <Badge tone="emerald">sim</Badge> : ""}</td>
      </tr>
      {aberto && conta.filhos.map((f) => <LinhaConta key={f.id} conta={f} profundidade={profundidade + 1} expandidos={expandidos} toggle={toggle} />)}
    </>
  );
}

export default function PlanoDeContasPage({ data }) {
  const { entidades } = data;
  const [expandidos, setExpandidos] = useState(new Set(entidades.planoDeContas.map((c) => c.id)));
  const toggle = (id) => setExpandidos((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const arvore = useMemo(() => montarArvore(entidades.planoDeContas, "contaPaiId"), [entidades.planoDeContas]);

  return (
    <div className="flex flex-col gap-6">
      <InfoNote>
        Somente leitura — o Plano de Contas chega pronto no produto ou é auto-criado durante a importação (Importar Dados/Importar
        Orçamento), nunca editado manualmente aqui. {entidades.planoDeContas.length} conta(s) no total.
      </InfoNote>
      <Panel title="Plano de Contas" subtitle="Clique numa linha com subcontas para expandir/recolher (Grupo → Subgrupo → Conta)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase border-b border-slate-200">
                <th className="py-2 pr-4">Conta</th>
                <th className="py-2 pr-4">Tipo</th>
                <th className="py-2 pr-4">Natureza</th>
                <th className="py-2 pr-4">Classificação DRE</th>
                <th className="py-2 pr-4">Classificação DFC / Subgrupo</th>
                <th className="py-2 pr-4 text-center">Centro de Custo</th>
                <th className="py-2 pr-4 text-center">Aceita Orçamento</th>
              </tr>
            </thead>
            <tbody>
              {arvore.map((c) => <LinhaConta key={c.id} conta={c} profundidade={0} expandidos={expandidos} toggle={toggle} />)}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
