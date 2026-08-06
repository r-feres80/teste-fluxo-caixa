import React, { useState, useMemo, useEffect } from "react";
import {
  LayoutGrid, Landmark, ArrowDownCircle, ArrowUpCircle, TrendingUp, FileBarChart, FileText,
  Scale, Wallet, Activity, GitBranch, ListPlus, Upload, Settings2, Sparkles, Save,
  Table2, AlertOctagon, PanelLeft, List, Lightbulb, LogOut, ChevronRight, ChevronDown,
} from "lucide-react";
import { APP_NAME, APP_TAGLINE, APP_DISCLAIMER } from "./config/appConfig.js";
import { useAppData } from "./hooks/useAppData.js";
import { GlobalFilterBar } from "./components/ui/GlobalFilterBar.jsx";
import { fmtDataHora } from "./utils/formatUtils.js";
import { construirResumoExecutivo } from "./financial-engine/resumoExecutivo.js";
import { calcularSaudeModulos, gerarInsightDoDia } from "./utils/moduleHealth.js";
import { limparSessaoDesbloqueio } from "./components/PasswordGate.jsx";
import FinanceCopilotWidget from "./components/copilot/FinanceCopilotWidget.jsx";

import GovernancaPage from "./pages/GovernancaPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import TesourariaPage from "./pages/TesourariaPage.jsx";
import ContasAPagarPage from "./pages/ContasAPagarPage.jsx";
import ContasAReceberPage from "./pages/ContasAReceberPage.jsx";
import FluxoCaixaPage from "./pages/FluxoCaixaPage.jsx";
import DFCPage from "./pages/DFCPage.jsx";
import DFCDiretoPage from "./pages/DFCDiretoPage.jsx";
import DREPage from "./pages/DREPage.jsx";
import InadimplenciaPage from "./pages/InadimplenciaPage.jsx";
import OrcadoRealizadoPage from "./pages/OrcadoRealizadoPage.jsx";
import OrcamentoPage from "./pages/OrcamentoPage.jsx";
import ForecastPage from "./pages/ForecastPage.jsx";
import CenariosPage from "./pages/CenariosPage.jsx";
import LancamentosPage from "./pages/LancamentosPage.jsx";
import ImportarDadosPage from "./pages/ImportarDadosPage.jsx";
import ImportarOrcamentoPage from "./pages/ImportarOrcamentoPage.jsx";
// Produto é camada de indicadores/analytics sobre dado de origem, nunca um
// sistema transacional com cadastro manual — toda base mestre (Empresas,
// Unidades, Clientes, Fornecedores, Bancos, Contas Bancárias, Centros de
// Custo, Projetos, Plano de Contas) chega pronta via upload de planilha
// (ImportarDadosPage cria automaticamente o que faltar). Único dado editável
// na UI é o Orçamento (OrcamentoPage). Ver item 12/Etapa 4: as antigas telas
// de cadastro manual (inclusive Plano de Contas) foram removidas do produto.
const NAV = [
  { id: "dashboard", label: "Dashboard Executivo", icon: LayoutGrid, Page: DashboardPage },
  { id: "tesouraria", label: "Tesouraria", icon: Landmark, Page: TesourariaPage },
  { id: "contas-pagar", label: "Contas a Pagar", icon: ArrowDownCircle, Page: ContasAPagarPage },
  { id: "contas-receber", label: "Contas a Receber", icon: ArrowUpCircle, Page: ContasAReceberPage },
  { id: "inadimplencia", label: "Inadimplência", icon: AlertOctagon, Page: InadimplenciaPage },
  { id: "fluxo-caixa", label: "Fluxo de Caixa", icon: TrendingUp, Page: FluxoCaixaPage },
  { id: "dfc", label: "DFC Gerencial", icon: FileBarChart, Page: DFCPage },
  { id: "dfc-direto", label: "DFC Direto", icon: Table2, Page: DFCDiretoPage },
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
const NAV_FATO = new Set(["dashboard", "tesouraria", "fluxo-caixa", "dfc", "dfc-direto", "contas-pagar", "contas-receber", "dre", "inadimplencia"]);

// Governança é roteada à parte de NAV (ver JSX), mas entra no modo ícones
// como mais um item do grupo Controladoria — por isso precisa de ícone/label aqui.
const GOVERNANCA_ITEM = { id: "governanca", label: "Governança", icon: Settings2 };
const ALL_NAV_ITEMS = [...NAV, GOVERNANCA_ITEM];

// Agrupamento do modo ícones — puramente de apresentação, não afeta roteamento.
const ICON_GROUPS = [
  { title: "Visão Geral", ids: ["dashboard"] },
  { title: "Tesouraria", ids: ["tesouraria"] },
  { title: "AP/AR", ids: ["contas-pagar", "contas-receber", "inadimplencia"] },
  { title: "Fluxo de Caixa", ids: ["fluxo-caixa", "dfc", "dfc-direto"] },
  { title: "Planejamento (FP&A)", ids: ["orcamento", "orcado-realizado", "forecast", "cenarios"] },
  { title: "Controladoria", ids: ["dre", "lancamentos", "importar", "importar-orcamento", "governanca"] },
];

// Classes literais (não interpoladas) para o Tailwind JIT conseguir detectar.
const GROUP_ACCENT = {
  "Visão Geral": "bg-emerald-500",
  "Tesouraria": "bg-blue-500",
  "AP/AR": "bg-amber-500",
  "Fluxo de Caixa": "bg-teal-500",
  "Planejamento (FP&A)": "bg-violet-500",
  "Controladoria": "bg-slate-500",
};

// Contagem de acesso por módulo (item 3 — ordenação adaptativa da landing).
// Puramente local: nunca sai do navegador, não é dado de negócio nem é
// persistido junto do estado financeiro (chave própria no localStorage).
const USAGE_STORAGE_KEY = "cfo-fi-v2-module-usage";

function lerUsoModulos() {
  try {
    return JSON.parse(window.localStorage.getItem(USAGE_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function gravarUsoModulos(usage) {
  try {
    window.localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(usage));
  } catch {
    // localStorage indisponível — a ordenação simplesmente não persiste entre sessões.
  }
}

// Classes literais (não interpoladas) para o Tailwind JIT — cor do pontinho
// de saúde por trás dos cortes de calcularSaudeModulos().
const STATUS_DOT = { red: "bg-rose-500", amber: "bg-amber-500", green: "bg-emerald-500" };

const INSIGHT_TONE = {
  red: { wrap: "bg-rose-50 border-rose-200 text-rose-700", icon: "text-rose-500" },
  amber: { wrap: "bg-amber-50 border-amber-200 text-amber-700", icon: "text-amber-500" },
  green: { wrap: "bg-emerald-50 border-emerald-200 text-emerald-700", icon: "text-emerald-500" },
};

// Memória entre montagens da LandingPage (ela desmonta a cada navegação, então
// um "antes/depois" de posição em DOM não sobrevive entre uma visita e outra —
// por isso a comparação de ordem fica aqui fora, no módulo, não em ref de
// componente). Guarda a última ordem exibida por grupo para detectar mudança.
const ultimaOrdemPorGrupo = {};

// Grade interna de um bloco/categoria — mesmo componente visual usado na
// Landing (cores por categoria, badge de saúde, reordenação por uso) e no
// modo ícones compacto dentro de uma tela (toggle sidebar↔ícones) — só muda
// a densidade (`compact`) e, no modo compacto, qual item está ativo
// (`activeId`, sem efeito na Landing, que nunca passa essa prop). 2-3 ícones
// por linha dentro do próprio bloco, com reordenação por uso (mais acessado
// primeiro no grupo); quando a ordem muda em relação à última vez que esse
// grid foi mostrado, os ícones entram com uma pequena transição em cascata.
function IconGroupGrid({ group, usage, saude, onSelect, activeId, compact = false }) {
  const idsOrdenados = useMemo(
    () => [...group.ids].sort((a, b) => (usage[b] || 0) - (usage[a] || 0)),
    [group.ids, usage]
  );
  const chaveOrdem = idsOrdenados.join(",");

  const [ordemMudou] = useState(() => {
    const anterior = ultimaOrdemPorGrupo[group.title];
    return anterior != null && anterior !== chaveOrdem;
  });
  useEffect(() => { ultimaOrdemPorGrupo[group.title] = chaveOrdem; }, [group.title, chaveOrdem]);

  const badgeSize = compact ? "w-9 h-9 rounded-lg" : "w-11 h-11 rounded-xl";
  const iconSize = compact ? 16 : 19;

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {idsOrdenados.map((id, idx) => {
        const item = ALL_NAV_ITEMS.find((n) => n.id === id);
        if (!item) return null;
        const Icon = item.icon;
        const status = saude?.[id];
        const ativo = activeId === id;
        return (
          <button key={id} onClick={() => onSelect(id)} title={item.label}
            className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border text-center transition-colors ${ativo ? "border-emerald-300 bg-emerald-50" : "border-transparent hover:bg-slate-50 hover:border-slate-200"}${ordemMudou ? " landing-tile-reorder" : ""}`}
            style={ordemMudou ? { animationDelay: `${idx * 35}ms` } : undefined}>
            <div className="relative">
              <div className={`${badgeSize} flex items-center justify-center text-white shadow-sm ${GROUP_ACCENT[group.title]}`}><Icon size={iconSize} /></div>
              {status && <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${STATUS_DOT[status]}`} title={`Estado: ${status === "red" ? "atenção" : status === "amber" ? "monitorar" : "saudável"}`} />}
            </div>
            <span className={`text-[11px] leading-tight ${ativo ? "text-emerald-700 font-medium" : "text-slate-600"}`}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Faixa "Insight do dia" — frase curta derivada localmente do Resumo
// Executivo (mesmos alertas do Dashboard), sem chamada externa.
function InsightDoDia({ texto, tone }) {
  const cores = INSIGHT_TONE[tone] ?? INSIGHT_TONE.green;
  return (
    <div className={`flex items-center gap-2.5 border rounded-lg px-4 py-2.5 text-sm ${cores.wrap}`}>
      <Lightbulb size={16} className={`shrink-0 ${cores.icon}`} />
      <span>{texto}</span>
    </div>
  );
}

// Tela de entrada (landing) estilo Omie — launcher em grade colorida por
// categoria, mostrada ao abrir o app pela primeira vez ou ao clicar no logo.
function LandingPage({ onSelect, onVerComoLista, onLogout, resumo, saude, usage }) {
  const insight = useMemo(() => gerarInsightDoDia(resumo), [resumo]);
  const insightTone = saude.dashboard ?? "green";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center px-6 py-10">
      <LogoutButton onLogout={onLogout} />
      <div className="w-full max-w-6xl flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-sm"><Sparkles size={26} className="text-slate-950" /></div>
          <div>
            <div className="text-slate-900 font-semibold text-2xl leading-tight">{APP_NAME}</div>
            <div className="text-slate-400 text-sm mt-1">{APP_TAGLINE}</div>
          </div>
          <button onClick={onVerComoLista}
            className="mt-2 flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700 transition-colors">
            <List size={14} />Ver como lista
          </button>
        </div>

        <InsightDoDia texto={insight} tone={insightTone} />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ICON_GROUPS.map((group) => (
            <div key={group.title} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{group.title}</div>
              <IconGroupGrid group={group} usage={usage} saude={saude} onSelect={onSelect} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Modo ícones compacto (toggle sidebar↔ícones dentro de uma tela) — mesmo
// visual da Landing (blocos por categoria, cores, badge de saúde), só mais
// denso, pra caber acima do conteúdo da página em vez de ocupar a tela toda.
function IconGridNav({ view, setView, saude, usage }) {
  return (
    <div className="bg-white border-b border-slate-200 px-8 py-4 flex flex-wrap gap-3">
      {ICON_GROUPS.map((group) => (
        <div key={group.title} className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col gap-2">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{group.title}</div>
          <IconGroupGrid group={group} usage={usage} saude={saude} onSelect={setView} activeId={view} compact />
        </div>
      ))}
    </div>
  );
}

function grupoDoId(id) {
  return ICON_GROUPS.find((g) => g.ids.includes(id))?.title;
}

// Barra lateral em árvore Categoria → tela, mesmo padrão de expand/colapso já
// usado em DFC Direto (Grupo → Subgrupo → Conta): cada categoria é um item
// recolhível: clicar no cabeçalho abre/fecha, clicar numa tela dentro navega
// direto. O grupo da tela ativa abre automaticamente ao navegar (sem fechar
// grupos que o usuário tenha aberto manualmente) — sempre fica visível qual
// categoria está "corrente", mesmo que o usuário tenha recolhido outras.
function SidebarNav({ view, irPara, saude }) {
  const [gruposAbertos, setGruposAbertos] = useState(() => {
    const grupo = grupoDoId(view);
    return new Set(grupo ? [grupo] : []);
  });

  useEffect(() => {
    const grupo = grupoDoId(view);
    if (!grupo) return;
    setGruposAbertos((atual) => (atual.has(grupo) ? atual : new Set(atual).add(grupo)));
  }, [view]);

  const toggleGrupo = (title) => setGruposAbertos((atual) => {
    const novo = new Set(atual);
    if (novo.has(title)) novo.delete(title); else novo.add(title);
    return novo;
  });

  return (
    <nav className="flex-1 py-2 overflow-y-auto">
      {ICON_GROUPS.map((group) => {
        const aberto = gruposAbertos.has(group.title);
        const grupoAtivo = grupoDoId(view) === group.title;
        return (
          <div key={group.title}>
            <button onClick={() => toggleGrupo(group.title)}
              className={`w-full flex items-center gap-2 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors ${grupoAtivo ? "text-emerald-700" : "text-slate-400 hover:text-slate-600"}`}>
              {aberto ? <ChevronDown size={13} className="shrink-0" /> : <ChevronRight size={13} className="shrink-0" />}
              <span className={`w-2 h-2 rounded-full shrink-0 ${GROUP_ACCENT[group.title]}`} />
              <span className="flex-1 text-left truncate">{group.title}</span>
            </button>

            {aberto && group.ids.map((id) => {
              const item = ALL_NAV_ITEMS.find((n) => n.id === id);
              if (!item) return null;
              const Icon = item.icon;
              const active = view === id;
              const status = saude?.[id];
              return (
                <button key={id} onClick={() => irPara(id)}
                  className={`w-full flex items-center gap-3 pl-11 pr-5 py-2 text-sm transition-colors ${active ? "bg-emerald-50 text-emerald-700 border-r-2 border-emerald-500" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}>
                  <span className="relative shrink-0">
                    <Icon size={15} />
                    {status && <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white ${STATUS_DOT[status]}`} />}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

function NavModeToggle({ navMode, setNavMode, onLogout }) {
  const pill = (active) => `flex items-center justify-center w-8 h-8 rounded-md transition-colors ${active ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`;
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg shadow-sm p-1">
      <button onClick={() => setNavMode("sidebar")} title="Barra lateral" className={pill(navMode === "sidebar")}><PanelLeft size={15} /></button>
      <button onClick={() => setNavMode("icons")} title="Ícones" className={pill(navMode === "icons")}><LayoutGrid size={15} /></button>
      <span className="w-px h-5 bg-slate-200 mx-0.5" />
      <button onClick={onLogout} title="Sair" className="flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"><LogOut size={15} /></button>
    </div>
  );
}

// Mesmo controle de "Sair" da NavModeToggle, mas sozinho — usado na landing,
// que não tem o toggle sidebar/ícones (não existe tela ativa lá).
function LogoutButton({ onLogout }) {
  return (
    <button onClick={onLogout} title="Sair"
      className="fixed top-4 right-4 z-50 flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
      <LogOut size={15} />
    </button>
  );
}

export default function App() {
  // view=null é a tela de entrada (landing) — mostrada ao abrir o app e ao
  // clicar no logo/"Início". Selecionar qualquer tela sai da landing.
  const [view, setView] = useState(null);
  const [navMode, setNavMode] = useState("sidebar");
  const [usage, setUsage] = useState(lerUsoModulos);
  const appData = useAppData();

  // Mesma fonte usada pelo Dashboard/Finance Copilot — a landing não
  // recalcula indicador nenhum, só lê o Resumo Executivo já existente.
  const resumo = useMemo(
    () => construirResumoExecutivo({ entidades: appData.entidades, filtros: appData.filtros, parametros: appData.parametros }),
    [appData.entidades, appData.filtros, appData.parametros]
  );
  const saude = useMemo(() => calcularSaudeModulos(resumo), [resumo]);

  // Navegação instrumentada: toda troca de tela (landing, sidebar ou modo
  // ícones) conta como acesso ao módulo, para a ordenação adaptativa da landing.
  const irPara = (id) => {
    setUsage((atual) => {
      const proximo = { ...atual, [id]: (atual[id] || 0) + 1 };
      gravarUsoModulos(proximo);
      return proximo;
    });
    setView(id);
  };

  // Encerra a sessão autenticada (PasswordGate) e recarrega — mais simples e
  // robusto que tentar repropagar "trancado de novo" por props/estado: a
  // recarga garante que nenhum estado da sessão anterior sobra na tela.
  const sair = () => {
    limparSessaoDesbloqueio();
    window.location.reload();
  };

  if (!appData.loaded) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">Carregando…</div>;
  }

  if (view === null) {
    return (
      <LandingPage
        resumo={resumo}
        saude={saude}
        usage={usage}
        onSelect={(id) => { irPara(id); setNavMode("sidebar"); }}
        onVerComoLista={() => { irPara("dashboard"); setNavMode("sidebar"); }}
        onLogout={sair}
      />
    );
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
      <NavModeToggle navMode={navMode} setNavMode={setNavMode} onLogout={sair} />

      {navMode === "sidebar" && (
        <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col">
          <div className="px-5 py-5 border-b border-slate-200">
            <button onClick={() => setView(null)} title="Início" className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded bg-emerald-500 flex items-center justify-center shrink-0"><Sparkles size={15} className="text-slate-950" /></div>
              <div>
                <div className="text-slate-900 font-semibold text-sm leading-none">{APP_NAME}</div>
                <div className="text-slate-600 text-[11px] mt-0.5">Gestão Financeira Gerencial</div>
              </div>
            </button>
            <div className="text-slate-400 text-[10px] mt-3 leading-snug">{APP_TAGLINE}</div>
          </div>

          <SidebarNav view={view} irPara={irPara} saude={saude} />

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
            <button onClick={() => setView(null)} title="Início" className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded bg-emerald-500 flex items-center justify-center shrink-0"><Sparkles size={15} className="text-slate-950" /></div>
              <div>
                <div className="text-slate-900 font-semibold text-sm leading-none">{APP_NAME}</div>
                <div className="text-slate-400 text-[10px] mt-0.5">{APP_TAGLINE}</div>
              </div>
            </button>
          </div>
        )}

        {navMode === "icons" && <IconGridNav view={view} setView={irPara} saude={saude} usage={usage} />}

        {conteudo}
      </main>

      <FinanceCopilotWidget data={appData} />
    </div>
  );
}
