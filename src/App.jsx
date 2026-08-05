import React, { useState } from "react";
import {
  LayoutGrid, Landmark, ArrowDownCircle, ArrowUpCircle, TrendingUp, FileBarChart, FileText,
  Scale, Wallet, Activity, GitBranch, ListPlus, Upload, Settings2, Sparkles, Save, FolderTree,
  Table2, PieChart, AlertOctagon, PanelLeft,
} from "lucide-react";
import { APP_NAME, APP_TAGLINE, APP_DISCLAIMER } from "./config/appConfig.js";
import { useAppData } from "./hooks/useAppData.js";
import { GlobalFilterBar } from "./components/ui/GlobalFilterBar.jsx";
import { fmtDataHora } from "./utils/formatUtils.js";
import FinanceCopilotWidget from "./components/copilot/FinanceCopilotWidget.jsx";

import GovernancaPage from "./pages/GovernancaPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import TesourariaPage from "./pages/TesourariaPage.jsx";
import ContasAPagarPage from "./pages/ContasAPagarPage.jsx";
import ContasAReceberPage from "./pages/ContasAReceberPage.jsx";
import FluxoCaixaPage from "./pages/FluxoCaixaPage.jsx";
import DFCPage from "./pages/DFCPage.jsx";
import DFCDiretoPage from "./pages/DFCDiretoPage.jsx";
import ComposicaoCaixaPage from "./pages/ComposicaoCaixaPage.jsx";
import DREPage from "./pages/DREPage.jsx";
import InadimplenciaPage from "./pages/InadimplenciaPage.jsx";
import OrcadoRealizadoPage from "./pages/OrcadoRealizadoPage.jsx";
import OrcamentoPage from "./pages/OrcamentoPage.jsx";
import ForecastPage from "./pages/ForecastPage.jsx";
import CenariosPage from "./pages/CenariosPage.jsx";
import LancamentosPage from "./pages/LancamentosPage.jsx";
import ImportarDadosPage from "./pages/ImportarDadosPage.jsx";
import ImportarOrcamentoPage from "./pages/ImportarOrcamentoPage.jsx";
import EmpresasPage from "./pages/cadastros/EmpresasPage.jsx";
import UnidadesPage from "./pages/cadastros/UnidadesPage.jsx";
import FornecedoresPage from "./pages/cadastros/FornecedoresPage.jsx";
import BancosPage from "./pages/cadastros/BancosPage.jsx";
import ContasBancariasPage from "./pages/cadastros/ContasBancariasPage.jsx";
import PlanoDeContasPage from "./pages/cadastros/PlanoDeContasPage.jsx";
import CentrosCustoPage from "./pages/cadastros/CentrosCustoPage.jsx";
import ProjetosPage from "./pages/cadastros/ProjetosPage.jsx";

// Item 23 — menu completo combinado. Só "Cadastros" e "Governança" estão
// Todos os módulos do item 23 já estão implementados nesta versão.
const NAV = [
  { id: "dashboard", label: "Dashboard Executivo", icon: LayoutGrid, Page: DashboardPage },
  { id: "tesouraria", label: "Tesouraria", icon: Landmark, Page: TesourariaPage },
  { id: "contas-pagar", label: "Contas a Pagar", icon: ArrowDownCircle, Page: ContasAPagarPage },
  { id: "contas-receber", label: "Contas a Receber", icon: ArrowUpCircle, Page: ContasAReceberPage },
  { id: "inadimplencia", label: "Inadimplência", icon: AlertOctagon, Page: InadimplenciaPage },
  { id: "plano-de-contas", label: "Plano de Contas", icon: FolderTree, Page: PlanoDeContasPage },
  { id: "fluxo-caixa", label: "Fluxo de Caixa", icon: TrendingUp, Page: FluxoCaixaPage },
  { id: "dfc", label: "DFC Gerencial", icon: FileBarChart, Page: DFCPage },
  { id: "dfc-direto", label: "DFC Direto", icon: Table2, Page: DFCDiretoPage },
  { id: "composicao-caixa", label: "Composição do Caixa", icon: PieChart, Page: ComposicaoCaixaPage },
  { id: "dre", label: "DRE Gerencial", icon: FileText, Page: DREPage },
  { id: "orcado-realizado", label: "Orçado x Realizado", icon: Scale, Page: OrcadoRealizadoPage },
  { id: "orcamento", label: "Orçamento", icon: Wallet, Page: OrcamentoPage },
  { id: "forecast", label: "Forecast", icon: Activity, Page: ForecastPage },
  { id: "cenarios", label: "Cenários", icon: GitBranch, Page: CenariosPage },
  { id: "lancamentos", label: "Lançamentos", icon: ListPlus, Page: LancamentosPage },
  { id: "importar", label: "Importar Dados", icon: Upload, Page: ImportarDadosPage },
  { id: "importar-orcamento", label: "Importar Orçamento", icon: Upload, Page: ImportarOrcamentoPage },
];

// Módulos de FATO: sempre a data real do sistema (getDataAtualSistema), sem
// Data de Referência/Período/Mês/Ano editáveis — nada aqui pode dessincronizar
// porque não existe mais estado de período para esses módulos lerem.
const NAV_FATO = new Set(["dashboard", "tesouraria", "fluxo-caixa", "dfc", "dfc-direto", "composicao-caixa", "contas-pagar", "contas-receber", "dre", "inadimplencia"]);

// Governança é roteada à parte de NAV (ver JSX), mas entra no modo ícones
// como mais um item do grupo Controladoria — por isso precisa de ícone/label aqui.
const GOVERNANCA_ITEM = { id: "governanca", label: "Governança", icon: Settings2 };
const ALL_NAV_ITEMS = [...NAV, GOVERNANCA_ITEM];

// Agrupamento do modo ícones — puramente de apresentação, não afeta roteamento.
const ICON_GROUPS = [
  { title: "Visão Geral", ids: ["dashboard"] },
  { title: "Tesouraria", ids: ["tesouraria", "composicao-caixa"] },
  { title: "AP/AR", ids: ["contas-pagar", "contas-receber", "inadimplencia"] },
  { title: "Fluxo de Caixa", ids: ["fluxo-caixa", "dfc", "dfc-direto"] },
  { title: "Planejamento (FP&A)", ids: ["orcamento", "orcado-realizado", "forecast", "cenarios"] },
  { title: "Controladoria", ids: ["dre", "plano-de-contas", "lancamentos", "importar", "importar-orcamento", "governanca"] },
];

function IconGridNav({ view, setView }) {
  return (
    <div className="bg-white border-b border-slate-200 px-8 py-5 flex flex-col gap-5">
      {ICON_GROUPS.map((group) => (
        <div key={group.title}>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{group.title}</div>
          <div className="flex flex-wrap gap-2">
            {group.ids.map((id) => {
              const item = ALL_NAV_ITEMS.find((n) => n.id === id);
              if (!item) return null;
              const Icon = item.icon;
              const active = view === id;
              return (
                <button key={id} onClick={() => setView(id)} title={item.label}
                  className={`flex flex-col items-center justify-center gap-1.5 w-24 h-20 rounded-lg border text-center transition-colors ${active ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"}`}>
                  <Icon size={20} />
                  <span className="text-[11px] leading-tight px-1">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function NavModeToggle({ navMode, setNavMode }) {
  const pill = (active) => `flex items-center justify-center w-8 h-8 rounded-md transition-colors ${active ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`;
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg shadow-sm p-1">
      <button onClick={() => setNavMode("sidebar")} title="Barra lateral" className={pill(navMode === "sidebar")}><PanelLeft size={15} /></button>
      <button onClick={() => setNavMode("icons")} title="Ícones" className={pill(navMode === "icons")}><LayoutGrid size={15} /></button>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("dashboard");
  const [navMode, setNavMode] = useState("sidebar");
  const appData = useAppData();

  if (!appData.loaded) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">Carregando…</div>;
  }

  const navAtivo = NAV.find((n) => n.id === view);
  const tituloAtual = navAtivo?.label ?? "Governança";

  const conteudo = (
    <>
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex flex-col gap-3">
        <h1 className="text-slate-900 font-semibold text-lg tracking-tight">{tituloAtual}</h1>
        <GlobalFilterBar filtros={appData.filtros} empresas={appData.entidades.empresas} unidades={appData.entidades.unidades} updateFiltros={appData.updateFiltros} mostrarPeriodo={!NAV_FATO.has(view)} />
      </header>

      <div className="p-8">
        {view === "governanca" && <GovernancaPage data={appData} />}
        {navAtivo && <navAtivo.Page data={appData} />}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex">
      <NavModeToggle navMode={navMode} setNavMode={setNavMode} />

      {navMode === "sidebar" && (
        <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col">
          <div className="px-5 py-5 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-emerald-500 flex items-center justify-center"><Sparkles size={15} className="text-slate-950" /></div>
              <div>
                <div className="text-slate-900 font-semibold text-sm leading-none">{APP_NAME}</div>
                <div className="text-slate-600 text-[11px] mt-0.5">Gestão Financeira Gerencial</div>
              </div>
            </div>
            <div className="text-slate-400 text-[10px] mt-3 leading-snug">{APP_TAGLINE}</div>
          </div>

          <nav className="flex-1 py-3 overflow-y-auto">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = view === n.id;
              return (
                <button key={n.id} onClick={() => setView(n.id)}
                  className={`w-full flex items-center justify-between gap-2 px-5 py-2.5 text-sm transition-colors ${active ? "bg-emerald-50 text-emerald-700 border-r-2 border-emerald-500" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}>
                  <span className="flex items-center gap-3"><Icon size={16} />{n.label}</span>
                </button>
              );
            })}

            <button onClick={() => setView("governanca")}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm mt-1 border-t border-slate-100 transition-colors ${view === "governanca" ? "bg-emerald-50 text-emerald-700 border-r-2 border-emerald-500" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}>
              <Settings2 size={16} />Governança
            </button>
          </nav>

          <div className="px-5 py-4 border-t border-slate-200 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <Save size={12} className={appData.savedFlash ? "text-emerald-500" : "text-slate-300"} />
              {appData.savedFlash ? "Salvo" : `Última atualização: ${appData.lastUpdated ? fmtDataHora(appData.lastUpdated) : "—"}`}
            </div>
            <div className="text-[10px] text-slate-400 leading-snug pt-1 border-t border-slate-100">{APP_DISCLAIMER}</div>
          </div>
        </aside>
      )}

      <main className="flex-1 min-w-0">
        {navMode === "icons" && (
          <div className="bg-white border-b border-slate-200 px-8 py-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-emerald-500 flex items-center justify-center shrink-0"><Sparkles size={15} className="text-slate-950" /></div>
            <div>
              <div className="text-slate-900 font-semibold text-sm leading-none">{APP_NAME}</div>
              <div className="text-slate-400 text-[10px] mt-0.5">{APP_TAGLINE}</div>
            </div>
          </div>
        )}

        {navMode === "icons" && <IconGridNav view={view} setView={setView} />}

        {conteudo}
      </main>

      <FinanceCopilotWidget data={appData} />
    </div>
  );
}
