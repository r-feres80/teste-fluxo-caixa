import React, { useState } from "react";
import {
  LayoutGrid, Landmark, ArrowDownCircle, ArrowUpCircle, TrendingUp, FileBarChart, FileText,
  Scale, Wallet, Activity, GitBranch, ListPlus, Upload, FolderCog, Settings2, Sparkles, Save,
  Building2, Building, Users, Truck, University, CreditCard, Network, FolderKanban, ChevronDown, ChevronRight,
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
import DREPage from "./pages/DREPage.jsx";
import OrcadoRealizadoPage from "./pages/OrcadoRealizadoPage.jsx";
import OrcamentoPage from "./pages/OrcamentoPage.jsx";
import ForecastPage from "./pages/ForecastPage.jsx";
import CenariosPage from "./pages/CenariosPage.jsx";
import LancamentosPage from "./pages/LancamentosPage.jsx";
import ImportarDadosPage from "./pages/ImportarDadosPage.jsx";
import EmpresasPage from "./pages/cadastros/EmpresasPage.jsx";
import UnidadesPage from "./pages/cadastros/UnidadesPage.jsx";
import ClientesPage from "./pages/cadastros/ClientesPage.jsx";
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
  { id: "fluxo-caixa", label: "Fluxo de Caixa", icon: TrendingUp, Page: FluxoCaixaPage },
  { id: "dfc", label: "DFC Gerencial", icon: FileBarChart, Page: DFCPage },
  { id: "dre", label: "DRE Gerencial", icon: FileText, Page: DREPage },
  { id: "orcado-realizado", label: "Orçado x Realizado", icon: Scale, Page: OrcadoRealizadoPage },
  { id: "orcamento", label: "Orçamento", icon: Wallet, Page: OrcamentoPage },
  { id: "forecast", label: "Forecast", icon: Activity, Page: ForecastPage },
  { id: "cenarios", label: "Cenários", icon: GitBranch, Page: CenariosPage },
  { id: "lancamentos", label: "Lançamentos", icon: ListPlus, Page: LancamentosPage },
  { id: "importar", label: "Importar Dados", icon: Upload, Page: ImportarDadosPage },
];

const CADASTROS = [
  { id: "cad-empresas", label: "Empresas", icon: Building2, Page: EmpresasPage },
  { id: "cad-unidades", label: "Unidades", icon: Building, Page: UnidadesPage },
  { id: "cad-clientes", label: "Clientes", icon: Users, Page: ClientesPage },
  { id: "cad-fornecedores", label: "Fornecedores", icon: Truck, Page: FornecedoresPage },
  { id: "cad-bancos", label: "Bancos", icon: University, Page: BancosPage },
  { id: "cad-contas-bancarias", label: "Contas Bancárias", icon: CreditCard, Page: ContasBancariasPage },
  { id: "cad-plano-contas", label: "Plano de Contas", icon: Network, Page: PlanoDeContasPage },
  { id: "cad-centros-custo", label: "Centros de Custo", icon: FolderCog, Page: CentrosCustoPage },
  { id: "cad-projetos", label: "Projetos", icon: FolderKanban, Page: ProjetosPage },
];

export default function App() {
  const [view, setView] = useState("dashboard");
  const [cadastrosAbertos, setCadastrosAbertos] = useState(true);
  const appData = useAppData();

  if (!appData.loaded) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">Carregando…</div>;
  }

  const cadastroAtivo = CADASTROS.find((c) => c.id === view);
  const navAtivo = NAV.find((n) => n.id === view);
  const tituloAtual = cadastroAtivo?.label ?? navAtivo?.label ?? "Governança";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex">
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

          <button onClick={() => setCadastrosAbertos((v) => !v)} className="w-full flex items-center justify-between gap-2 px-5 py-2.5 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-50">
            <span className="flex items-center gap-3">{cadastrosAbertos ? <ChevronDown size={16} /> : <ChevronRight size={16} />}Cadastros</span>
          </button>
          {cadastrosAbertos && CADASTROS.map((c) => {
            const Icon = c.icon;
            const active = view === c.id;
            return (
              <button key={c.id} onClick={() => setView(c.id)}
                className={`w-full flex items-center gap-3 pl-11 pr-5 py-2 text-sm transition-colors ${active ? "bg-emerald-50 text-emerald-700 border-r-2 border-emerald-500" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}>
                <Icon size={14} />{c.label}
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

      <main className="flex-1 min-w-0">
        <header className="border-b border-slate-200 bg-white px-8 py-4 flex flex-col gap-3">
          <h1 className="text-slate-900 font-semibold text-lg tracking-tight">{tituloAtual}</h1>
          <GlobalFilterBar filtros={appData.filtros} empresas={appData.entidades.empresas} unidades={appData.entidades.unidades} updateFiltros={appData.updateFiltros} />
        </header>

        <div className="p-8">
          {cadastroAtivo && <cadastroAtivo.Page data={appData} />}
          {view === "governanca" && <GovernancaPage data={appData} />}
          {navAtivo && <navAtivo.Page data={appData} />}
        </div>
      </main>

      <FinanceCopilotWidget data={appData} />
    </div>
  );
}
