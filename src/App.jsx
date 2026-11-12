import React, { useState, useMemo, useEffect } from "react";
import {
  LayoutGrid, Landmark, ArrowDownCircle, ArrowUpCircle, TrendingUp, FileText,
  Scale, Wallet, Activity, GitBranch, Upload, Settings2, Sparkles, Save,
  Table2, AlertOctagon, PanelLeft, List, Lightbulb, LogOut,
  PiggyBank, ChevronLeft,
} from "lucide-react";
import { APP_NAME, APP_DISCLAIMER } from "./config/appConfig.js";
import { useLanguage } from "./i18n/LanguageContext.jsx";
import { IDIOMAS } from "./i18n/translations.js";
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
import AplicacoesFinanceirasPage from "./pages/AplicacoesFinanceirasPage.jsx";
import ContasAPagarPage from "./pages/ContasAPagarPage.jsx";
import ContasAReceberPage from "./pages/ContasAReceberPage.jsx";
import FluxoCaixaPage from "./pages/FluxoCaixaPage.jsx";
import DFCDiretoPage from "./pages/DFCDiretoPage.jsx";
import DREPage from "./pages/DREPage.jsx";
import InadimplenciaPage from "./pages/InadimplenciaPage.jsx";
import OrcadoRealizadoPage from "./pages/OrcadoRealizadoPage.jsx";
import OrcamentoPage from "./pages/OrcamentoPage.jsx";
import ForecastPage from "./pages/ForecastPage.jsx";
import CenariosPage from "./pages/CenariosPage.jsx";
import PlanoDeContasPage from "./pages/PlanoDeContasPage.jsx";
import ImportarDadosPage from "./pages/ImportarDadosPage.jsx";
import ImportarOrcamentoPage from "./pages/ImportarOrcamentoPage.jsx";
// Produto é camada de indicadores/analytics sobre dado de origem, nunca um
// sistema transacional com cadastro manual — toda base mestre (Empresas,
// Unidades, Clientes, Fornecedores, Bancos, Contas Bancárias, Centros de
// Custo, Projetos, Plano de Contas) chega pronta via upload de planilha
// (ImportarDadosPage cria automaticamente o que faltar). Único dado editável
// na UI é o Orçamento (OrcamentoPage). Plano de Contas tem tela própria
// (PlanoDeContasPage) mas é somente leitura — ver item 12/Etapa 4 e comando
// consolidado Bloco 3.
//
// Menu reorganizado (comando consolidado, Bloco 3): "Fluxo de Caixa" e "DFC
// Gerencial" viraram uma tela só (FluxoCaixaPage) — ver comentário na
// própria página. "DFC Direto" virou só "DFC" (dfc-direto id preservado).
// "Lançamentos" (formulário manual) foi removida — contradiz o modelo
// "tudo por upload, zero intervenção manual".
// "label" abaixo é o fallback em português (chave de tradução em
// i18n/translations.js é "nav.<id>") — usado só se o idioma selecionado não
// tiver a chave, nunca renderizado direto (ver t("nav." + id) no JSX).
const NAV = [
  { id: "dashboard", label: "Dashboard Executivo", icon: LayoutGrid, Page: DashboardPage },
  { id: "tesouraria", label: "Tesouraria", icon: Landmark, Page: TesourariaPage },
  { id: "aplicacoes-financeiras", label: "Aplicações Financeiras", icon: PiggyBank, Page: AplicacoesFinanceirasPage },
  { id: "fluxo-caixa", label: "Fluxo de Caixa", icon: TrendingUp, Page: FluxoCaixaPage },
  { id: "dfc-direto", label: "DFC", icon: Table2, Page: DFCDiretoPage },
  { id: "contas-pagar", label: "Contas a Pagar", icon: ArrowDownCircle, Page: ContasAPagarPage },
  { id: "contas-receber", label: "Contas a Receber", icon: ArrowUpCircle, Page: ContasAReceberPage },
  { id: "inadimplencia", label: "Inadimplência", icon: AlertOctagon, Page: InadimplenciaPage },
  { id: "orcamento", label: "Orçamento", icon: Wallet, Page: OrcamentoPage },
  { id: "orcado-realizado", label: "Orçado x Realizado", icon: Scale, Page: OrcadoRealizadoPage },
  { id: "forecast", label: "Forecast", icon: Activity, Page: ForecastPage },
  { id: "cenarios", label: "Cenários", icon: GitBranch, Page: CenariosPage },
  { id: "dre", label: "DRE Gerencial", icon: FileText, Page: DREPage },
  { id: "plano-de-contas", label: "Plano de Contas", icon: List, Page: PlanoDeContasPage },
  { id: "importar", label: "Importar Dados", icon: Upload, Page: ImportarDadosPage },
  { id: "importar-orcamento", label: "Importar Orçamento", icon: Upload, Page: ImportarOrcamentoPage },
];

// Módulos de FATO: sempre a data real do sistema (getDataAtualSistema), sem
// Data de Referência/Período/Mês/Ano editáveis — nada aqui pode dessincronizar
// porque não existe mais estado de período para esses módulos lerem.
// "fluxo-caixa" e "dre" SAÍRAM daqui no Bloco 3: a projeção de Fluxo de
// Caixa continua sempre a partir de hoje (isso não muda), mas a síntese DFC
// e o DRE agora usam o Mês/Ano do Filtro Global — precisam do seletor
// visível. "dfc-direto" continua FATO porque já tem filtro de mês PRÓPRIO,
// independente do Filtro Global (ver comentário em DFCDiretoPage.jsx).
// "dashboard" SAIU daqui no Bloco 4 (pendência 2): os cards de caixa/EBITDA
// YTD continuam sempre "hoje real" (não usam o filtro), mas o novo painel
// "Comparativo Mensal" precisa do seletor Mês/Ano visível — ver
// DashboardPage.jsx.
const NAV_FATO = new Set(["tesouraria", "aplicacoes-financeiras", "dfc-direto", "contas-pagar", "contas-receber", "inadimplencia"]);

// Governança é roteada à parte de NAV (ver JSX), mas entra no modo ícones
// como mais um item do grupo Dados — por isso precisa de ícone/label aqui.
const GOVERNANCA_ITEM = { id: "governanca", label: "Governança", icon: Settings2 };
const ALL_NAV_ITEMS = [...NAV, GOVERNANCA_ITEM];

// Agrupamento do modo ícones — puramente de apresentação, não afeta
// roteamento. "id" é a chave estável de tradução (i18n/translations.js,
// "group.<id>") e de lookup interno (GROUP_ACCENT, memória de animação);
// "title" é só o fallback em português.
const ICON_GROUPS = [
  { id: "visao-geral", title: "Visão Geral", ids: ["dashboard"] },
  { id: "controle-caixa", title: "Controle de Caixa", ids: ["tesouraria", "aplicacoes-financeiras", "fluxo-caixa", "dfc-direto"] },
  { id: "ap-ar", title: "AP/AR", ids: ["contas-pagar", "contas-receber", "inadimplencia"] },
  { id: "planejamento", title: "Planejamento (FP&A)", ids: ["orcamento", "orcado-realizado", "forecast", "cenarios", "dre"] },
  { id: "dados", title: "Dados", ids: ["plano-de-contas", "importar", "importar-orcamento", "governanca"] },
];

// Classes literais (não interpoladas) para o Tailwind JIT conseguir detectar.
const GROUP_ACCENT = {
  "Visão Geral": "bg-violet-600",
  "Controle de Caixa": "bg-blue-500",
  "AP/AR": "bg-amber-500",
  "Planejamento (FP&A)": "bg-cyan-500",
  "Dados": "bg-slate-500",
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
  const { t } = useLanguage();
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
        const label = t(`nav.${id}`);
        return (
          <button key={id} onClick={() => onSelect(id)} title={label}
            className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border text-center transition-colors ${ativo ? "border-violet-300 bg-violet-50" : "border-transparent hover:bg-slate-50 hover:border-slate-200"}${ordemMudou ? " landing-tile-reorder" : ""}`}
            style={ordemMudou ? { animationDelay: `${idx * 35}ms` } : undefined}>
            <div className="relative">
              <div className={`${badgeSize} flex items-center justify-center text-white shadow-sm ${GROUP_ACCENT[group.title]}`}><Icon size={iconSize} /></div>
              {status && <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${STATUS_DOT[status]}`} title={`Estado: ${status === "red" ? "atenção" : status === "amber" ? "monitorar" : "saudável"}`} />}
            </div>
            <span className={`text-[11px] leading-tight ${ativo ? "text-violet-700 font-medium" : "text-slate-600"}`}>{label}</span>
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

// Config de cor e ícone representativo por grupo (estilo Omie)
const GROUP_TILE_CFG = {
  "visao-geral":    { bg: "#7C3AED", Icon: LayoutGrid },
  "controle-caixa": { bg: "#0A6CFF", Icon: Landmark },
  "ap-ar":          { bg: "#F59E0B", Icon: Scale },
  "planejamento":   { bg: "#0D9488", Icon: TrendingUp },
  "dados":          { bg: "#475569", Icon: Table2 },
};

// Tela de entrada estilo Omie — tiles grandes coloridos por grupo
function LandingPage({ onSelect, onLogout, resumo, saude, usage }) {
  const { t } = useLanguage();
  const insight = useMemo(() => gerarInsightDoDia(resumo), [resumo]);
  const insightTone = saude.dashboard ?? "green";

  const alertasPorGrupo = useMemo(() => {
    const out = {};
    ICON_GROUPS.forEach((g) => {
      out[g.id] = g.ids.filter((id) => saude[id] === "red" || saude[id] === "amber").length;
    });
    return out;
  }, [saude]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f8fafc" }}>
      <LogoutButton onLogout={onLogout} />

      {/* ── Header ── */}
      <div className="flex flex-col items-center pt-10 pb-6 px-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
          style={{ background: "linear-gradient(140deg,#7C3AED,#0A6CFF,#12D8FF)", boxShadow: "0 8px 24px rgba(10,108,255,.35)" }}
        >
          <Sparkles size={26} className="text-white" />
        </div>
        <div className="font-bold text-2xl text-slate-800">{APP_NAME}</div>
        <div className="text-sm text-slate-400 mt-1">{t("chrome.tagline")}</div>
      </div>

      {/* Insight */}
      <div className="px-8 pb-6 max-w-3xl mx-auto w-full">
        <InsightDoDia texto={insight} tone={insightTone} />
      </div>

      {/* ── Grid Omie ── */}
      <div className="flex-1 px-8 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {ICON_GROUPS.map((group, gi) => {
            const cfg = GROUP_TILE_CFG[group.id] ?? { bg: "#64748b", Icon: LayoutGrid };
            const TileIcon = cfg.Icon;
            const alertas = alertasPorGrupo[group.id] ?? 0;
            const firstId = group.ids[0];
            return (
              <button
                key={group.id}
                onClick={() => onSelect(firstId)}
                className="rounded-2xl flex flex-col items-center justify-center gap-3 py-8 px-4 text-white relative transition-all duration-200 hover:scale-[1.03] hover:shadow-2xl active:scale-[0.98]"
                style={{
                  background: cfg.bg,
                  boxShadow: `0 4px 20px ${cfg.bg}55`,
                  animation: `vxFadeUp 350ms ${gi * 60}ms both`,
                  minHeight: 160,
                }}
              >
                {alertas > 0 && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                    {alertas}
                  </span>
                )}
                <TileIcon size={40} strokeWidth={1.5} className="opacity-90" />
                <span className="font-semibold text-sm text-center leading-tight opacity-95">
                  {t(`group.${group.id}`)}
                </span>
                {/* Sub-itens como chips clicáveis */}
                <div className="flex flex-wrap gap-1 justify-center mt-1">
                  {group.ids.map((id) => (
                    <span
                      key={id}
                      onClick={(e) => { e.stopPropagation(); onSelect(id); }}
                      className="text-[10px] px-2 py-0.5 rounded-full cursor-pointer transition-colors"
                      style={{ background: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.9)" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.35)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                    >
                      {t(`nav.${id}`)}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Modo ícones compacto (toggle sidebar↔ícones dentro de uma tela) — mesmo
// visual da Landing (blocos por categoria, cores, badge de saúde), só mais
// denso, pra caber acima do conteúdo da página em vez de ocupar a tela toda.
function IconGridNav({ view, setView, saude, usage }) {
  const { t } = useLanguage();
  return (
    <div className="bg-white border-b border-slate-200 px-8 py-4 flex flex-wrap gap-3">
      {ICON_GROUPS.map((group) => (
        <div key={group.title} className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col gap-2">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{t(`group.${group.id}`)}</div>
          <IconGroupGrid group={group} usage={usage} saude={saude} onSelect={setView} activeId={view} compact />
        </div>
      ))}
    </div>
  );
}

function grupoDoId(id) {
  return ICON_GROUPS.find((g) => g.ids.includes(id))?.title;
}

// Sidebar estilo Conta Azul — estrutura limpa, fundo degradê roxo→azul→ciano
function SidebarNav({ view, irPara, saude, expanded }) {
  const { t } = useLanguage();
  const [tooltip, setTooltip] = React.useState(null);

  return (
    <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">

      {ICON_GROUPS.map((group, gi) => (
        <div key={group.title}>
          {/* Separador entre grupos */}
          {gi > 0 && (
            <div style={{ height: 1, margin: "6px 12px", background: "rgba(255,255,255,0.15)" }} />
          )}
          {/* Label do grupo */}
          {expanded && (
            <div
              className="px-4 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {t(`group.${group.id}`)}
            </div>
          )}
          {group.ids.map((id) => {
            const item = ALL_NAV_ITEMS.find((n) => n.id === id);
            if (!item) return null;
            const Icon = item.icon;
            const active = view === id;
            const status = saude?.[id];
            const label = t(`nav.${id}`);
            return (
              <div key={id} className="px-2 py-0.5">
                <button
                  onClick={() => irPara(id)}
                  className="relative w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-150"
                  style={{
                    color: "rgba(255,255,255,0.95)",
                    background: active ? "rgba(255,255,255,0.18)" : "transparent",
                    boxShadow: active ? "inset 0 0 0 1px rgba(255,255,255,0.25)" : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.10)";
                    if (!expanded) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({ id, y: rect.top + rect.height / 2 });
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                    setTooltip(null);
                  }}
                >
                  {/* Barra esquerda no item ativo */}
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2"
                      style={{
                        width: 3, height: 20,
                        borderRadius: "0 3px 3px 0",
                        background: "#fff",
                        opacity: 0.9,
                      }}
                    />
                  )}
                  <span className="relative shrink-0">
                    <Icon size={16} style={{ opacity: active ? 1 : 0.75 }} />
                    {status && (
                      <span
                        className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${STATUS_DOT[status]}`}
                        style={{ border: "1px solid rgba(255,255,255,0.3)" }}
                      />
                    )}
                  </span>
                  <span
                    className="whitespace-nowrap truncate font-medium transition-opacity duration-200"
                    style={{ opacity: expanded ? 1 : 0, pointerEvents: expanded ? "auto" : "none", fontWeight: active ? 600 : 400 }}
                  >
                    {label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      ))}

      {/* Tooltip flutuante — só no modo colapsado */}
      {tooltip && !expanded && (
        <div
          className="pointer-events-none fixed z-[200]"
          style={{ top: tooltip.y, left: 72, transform: "translateY(-50%)" }}
        >
          <div
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
            style={{
              background: "#fff",
              color: "#0A6CFF",
              border: "1px solid rgba(10,108,255,.25)",
              boxShadow: "0 4px 16px rgba(10,108,255,.25)",
            }}
          >
            {tooltip.id && t(`nav.${tooltip.id}`)}
            <span
              className="absolute right-full top-1/2 -translate-y-1/2"
              style={{
                borderTop: "5px solid transparent",
                borderBottom: "5px solid transparent",
                borderRight: "5px solid #fff",
                display: "block",
                width: 0,
              }}
            />
          </div>
        </div>
      )}
    </nav>
  );
}

// Pills PT/EN/ES — Bloco 4 (item 1, escopo "só rótulos-chave": menu,
// títulos, marca/tagline e KPI do Dashboard, sem tocar gráfico/tooltip/
// tabela). Reaproveitado nos dois pontos fixos de topo (NavModeToggle e
// LogoutButton — este último só existe sozinho na landing).
function LanguageSwitcherPills() {
  const { idioma, setIdioma } = useLanguage();
  const pillLang = (active) => `flex items-center justify-center min-w-7 h-8 px-1 rounded-md text-[10px] font-semibold transition-colors ${active ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`;
  return (
    <>
      {IDIOMAS.map((l) => (
        <button key={l} onClick={() => setIdioma(l)} title={l.toUpperCase()} className={pillLang(idioma === l)}>{l.toUpperCase()}</button>
      ))}
    </>
  );
}

function NavModeToggle({ navMode, setNavMode, onLogout }) {
  const { t } = useLanguage();
  const pill = (active) => `flex items-center justify-center w-8 h-8 rounded-md transition-colors ${active ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`;
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg shadow-sm p-1">
      <LanguageSwitcherPills />
      <span className="w-px h-5 bg-slate-200 mx-0.5" />
      <button onClick={() => setNavMode("sidebar")} title={t("chrome.sidebar")} className={pill(navMode === "sidebar")}><PanelLeft size={15} /></button>
      <button onClick={() => setNavMode("icons")} title={t("chrome.icons")} className={pill(navMode === "icons")}><LayoutGrid size={15} /></button>
      <span className="w-px h-5 bg-slate-200 mx-0.5" />
      <button onClick={onLogout} title={t("chrome.logout")} className="flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"><LogOut size={15} /></button>
    </div>
  );
}

// Mesmo controle de "Sair" (+ idioma) da NavModeToggle, mas sozinho — usado
// na landing, que não tem o toggle sidebar/ícones (não existe tela ativa lá).
function LogoutButton({ onLogout }) {
  const { t } = useLanguage();
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg shadow-sm p-1">
      <LanguageSwitcherPills />
      <span className="w-px h-5 bg-slate-200 mx-0.5" />
      <button onClick={onLogout} title={t("chrome.logout")} className="flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"><LogOut size={15} /></button>
    </div>
  );
}

export default function App() {
  const { t } = useLanguage();
  // view=null é a tela de entrada (landing) — mostrada ao abrir o app e ao
  // clicar no logo/"Início". Selecionar qualquer tela sai da landing.
  const [view, setView] = useState(null);
  const [navMode, setNavMode] = useState("sidebar");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [usage, setUsage] = useState(lerUsoModulos);
  const appData = useAppData();

  // Mesma fonte usada pelo Dashboard/Finance Copilot — a landing não
  // recalcula indicador nenhum, só lê o Resumo Executivo já existente.
  const resumo = useMemo(
    () => construirResumoExecutivo({ entidades: appData.entidades, filtros: appData.filtros, parametros: appData.parametros }),
    [appData.entidades, appData.filtros, appData.parametros]
  );
  const saude = useMemo(() => calcularSaudeModulos(resumo), [resumo]);

  // Header: alertas e grupo atual — devem ficar ANTES de qualquer return
  // condicional para não violar as Rules of Hooks.
  const totalAlertas = useMemo(
    () => Object.values(saude).filter((s) => s === "red" || s === "amber").length,
    [saude]
  );
  const grupoAtual = useMemo(
    () => ICON_GROUPS.find((g) => g.ids.includes(view)),
    [view]
  );

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
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">{t("chrome.carregando")}</div>;
  }

  if (view === null) {
    return (
      <LandingPage
        resumo={resumo}
        saude={saude}
        usage={usage}
        onSelect={(id) => { irPara(id); setNavMode("sidebar"); }}
        onLogout={sair}
      />
    );
  }

  const navAtivo = NAV.find((n) => n.id === view);
  const tituloAtual = t(`nav.${navAtivo?.id ?? "governanca"}`);

  const conteudo = (
    <>
      <header className="border-b border-slate-200 bg-white px-6 py-0 flex items-center gap-4 h-14">
        {/* breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
          {grupoAtual && (
            <>
              <span className="text-slate-400 truncate hidden sm:block">{t(`group.${grupoAtual.id}`)}</span>
              <span className="text-slate-300 hidden sm:block">/</span>
            </>
          )}
          <span className="text-slate-800 font-semibold truncate">{tituloAtual}</span>
        </div>

        {/* badge de alertas */}
        {totalAlertas > 0 && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
            style={{
              background: "rgba(220,38,38,.12)",
              border: "1px solid rgba(220,38,38,.25)",
              color: "#fb7185",
            }}
            title={`${totalAlertas} módulo${totalAlertas > 1 ? "s" : ""} com alerta`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"
            />
            {totalAlertas}
          </div>
        )}

        {/* avatar com iniciais */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 select-none"
          style={{
            background: "linear-gradient(140deg,#0A6CFF,#12D8FF)",
            color: "#fff",
            boxShadow: "0 0 12px rgba(10,108,255,.35)",
          }}
          title="Velmetryx"
        >
          CF
        </div>
      </header>

      {/* filter bar separada — linha própria abaixo do header */}
      <div className="border-b border-slate-200 bg-white px-6 py-2.5">
        <GlobalFilterBar filtros={appData.filtros} empresas={appData.entidades.empresas} unidades={appData.entidades.unidades} updateFiltros={appData.updateFiltros} mostrarPeriodo={!NAV_FATO.has(view)} />
      </div>

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
        <aside
          className="shrink-0 flex flex-col overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(.4,0,.2,1)]"
          style={{
            width: sidebarExpanded ? 240 : 64,
            background: "linear-gradient(180deg, #7C3AED 0%, #0A6CFF 55%, #12D8FF 100%)",
            borderRight: "none",
          }}
        >
          {/* Logo + toggle */}
          <div
            className="px-3 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}
          >
            <button onClick={() => setView(null)} title={t("chrome.inicio")} className="flex items-center gap-2 text-left hover:opacity-90 transition-opacity flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}>
                <Sparkles size={15} className="text-white" />
              </div>
              <div
                className="overflow-hidden transition-opacity duration-200"
                style={{ opacity: sidebarExpanded ? 1 : 0 }}
              >
                <div className="font-bold text-sm leading-none whitespace-nowrap text-white">{APP_NAME}</div>
                <div className="text-[10px] mt-0.5 whitespace-nowrap" style={{ color: "rgba(255,255,255,0.6)" }}>{t("chrome.subtitle")}</div>
              </div>
            </button>
            {/* Botão toggle */}
            <button
              onClick={() => setSidebarExpanded((v) => !v)}
              className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200"
              style={{ color: "rgba(255,255,255,0.5)" }}
              title={sidebarExpanded ? "Recolher menu" : "Expandir menu"}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "transparent"; }}
            >
              <ChevronLeft
                size={14}
                className="transition-transform duration-300"
                style={{ transform: sidebarExpanded ? "rotate(0deg)" : "rotate(180deg)" }}
              />
            </button>
          </div>

          <SidebarNav view={view} irPara={irPara} saude={saude} expanded={sidebarExpanded} />

          {/* ── Mascote ── */}
          <div className="flex flex-col items-center py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
            <svg viewBox="0 0 64 72" width={sidebarExpanded ? 64 : 36} className="transition-all duration-300 drop-shadow-lg" xmlns="http://www.w3.org/2000/svg">
              {/* Corpo */}
              <rect x="12" y="28" width="40" height="34" rx="10" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              {/* Cabeça */}
              <rect x="16" y="10" width="32" height="26" rx="10" fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"/>
              {/* Antena */}
              <line x1="32" y1="10" x2="32" y2="4" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="32" cy="3" r="2.5" fill="#12D8FF"/>
              {/* Olhos */}
              <rect x="21" y="17" width="8" height="6" rx="3" fill="#12D8FF" opacity="0.9"/>
              <rect x="35" y="17" width="8" height="6" rx="3" fill="#12D8FF" opacity="0.9"/>
              {/* Sorriso */}
              <path d="M24 29 Q32 34 40 29" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              {/* Gravatinha */}
              <polygon points="32,38 29,43 32,42 35,43" fill="#12D8FF" opacity="0.8"/>
              {/* Braços */}
              <rect x="4" y="32" width="10" height="6" rx="3" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2"/>
              <rect x="50" y="32" width="10" height="6" rx="3" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2"/>
              {/* Pernas */}
              <rect x="19" y="58" width="10" height="10" rx="4" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2"/>
              <rect x="35" y="58" width="10" height="10" rx="4" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2"/>
              {/* Cifrão no peito */}
              <text x="32" y="52" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.65)" fontWeight="bold">$</text>
            </svg>
            {sidebarExpanded && (
              <div className="text-[9px] mt-1 font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.45)" }}>CFO Bot</div>
            )}
          </div>

          <div
            className="px-3 py-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div className="flex items-center gap-2 text-[11px] overflow-hidden" style={{ color: "rgba(255,255,255,0.55)" }}>
              <Save size={12} className={`shrink-0 ${appData.savedFlash ? "text-violet-400" : ""}`} />
              <span
                className="whitespace-nowrap truncate transition-opacity duration-200"
                style={{ opacity: sidebarExpanded ? 1 : 0 }}
              >
                {appData.savedFlash ? t("chrome.salvo") : `${t("chrome.ultimaAtualizacao")}: ${appData.lastUpdated ? fmtDataHora(appData.lastUpdated) : "—"}`}
              </span>
            </div>
          </div>
        </aside>
      )}

      <main className="flex-1 min-w-0">
        {navMode === "icons" && (
          <div className="bg-white border-b border-slate-200 px-8 py-3 flex items-center gap-2">
            <button onClick={() => setView(null)} title={t("chrome.inicio")} className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 via-blue-500 to-cyan-500 flex items-center justify-center shrink-0"><Sparkles size={15} className="text-white" /></div>
              <div>
                <div className="text-slate-900 font-semibold text-sm leading-none">{APP_NAME}</div>
                <div className="text-slate-400 text-[10px] mt-0.5">{t("chrome.tagline")}</div>
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
