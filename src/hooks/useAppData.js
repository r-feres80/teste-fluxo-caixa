import { useState, useEffect, useCallback, useRef } from "react";
import { storageService } from "../services/storageService.js";
import { STORAGE_KEY, DEFAULT_PARAMETROS } from "../config/appConfig.js";
import { todayISO, parseISO } from "../utils/dateUtils.js";
import { uid } from "../utils/formatUtils.js";
import {
  demoEmpresas, demoUnidades, demoClientes, demoFornecedores, demoBancos,
  demoContasBancarias, demoProjetos, demoPlanoDeContas, demoCentrosCusto, demoLancamentos, demoOrcamentoItens,
} from "../data/demoData.js";

const ENTIDADES_VAZIAS = {
  empresas: [], unidades: [], clientes: [], fornecedores: [], bancos: [],
  contasBancarias: [], projetos: [], planoDeContas: [], centrosCusto: [],
  lancamentos: [], orcamentoItens: [],
};

// anoRef/mesRef sempre derivados da Data de Referência (nunca de new Date()
// isoladamente), para que o filtro de mês nasce sincronizado com ela.
const HOJE_ISO = todayISO();
const DEFAULT_FILTROS = {
  dataReferencia: HOJE_ISO,
  empresaId: "TODAS",
  unidadeId: "TODAS",
  anoRef: parseISO(HOJE_ISO).getFullYear(),
  mesRef: parseISO(HOJE_ISO).getMonth(),
  tipoPeriodo: "mes",
};

export function useAppData() {
  const [loaded, setLoaded] = useState(false);
  const [entidades, setEntidades] = useState(ENTIDADES_VAZIAS);
  const [filtros, setFiltros] = useState(DEFAULT_FILTROS);
  const [parametros, setParametros] = useState(DEFAULT_PARAMETROS);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const initialLoad = useRef(true);

  useEffect(() => {
    (async () => {
      const s = await storageService.getItem(STORAGE_KEY);
      if (s) {
        setEntidades(s.entidades ?? ENTIDADES_VAZIAS);
        setFiltros(s.filtros ?? DEFAULT_FILTROS);
        setParametros(s.parametros ?? DEFAULT_PARAMETROS);
        setLastUpdated(s.lastUpdated ?? null);
      }
      setLoaded(true);
      initialLoad.current = false;
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(async () => {
      const now = new Date().toISOString();
      await storageService.setItem(STORAGE_KEY, { entidades, filtros, parametros, lastUpdated: now });
      setLastUpdated(now);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1200);
    }, 400);
    return () => clearTimeout(t);
  }, [entidades, filtros, parametros, loaded]);

  // ---- Filtros e Governança ----

  const updateFiltros = useCallback((patch) => setFiltros((prev) => ({ ...prev, ...patch })), []);
  const updateParametros = useCallback((patch) => setParametros((prev) => ({ ...prev, ...patch })), []);

  // ---- CRUD genérico por entidade ----

  const addItem = useCallback((entidade, item) => {
    setEntidades((prev) => ({ ...prev, [entidade]: [...prev[entidade], { ...item, id: uid() }] }));
  }, []);
  const updateItem = useCallback((entidade, id, patch) => {
    setEntidades((prev) => ({ ...prev, [entidade]: prev[entidade].map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  }, []);
  const removeItem = useCallback((entidade, id) => {
    setEntidades((prev) => ({ ...prev, [entidade]: prev[entidade].filter((i) => i.id !== id) }));
  }, []);

  // ---- Dados: Carregar Demonstrativo / Limpar Base ----

  const carregarDemo = useCallback(() => {
    setEntidades({
      empresas: demoEmpresas, unidades: demoUnidades, clientes: demoClientes, fornecedores: demoFornecedores,
      bancos: demoBancos, contasBancarias: demoContasBancarias, projetos: demoProjetos,
      planoDeContas: demoPlanoDeContas, centrosCusto: demoCentrosCusto,
      lancamentos: demoLancamentos, orcamentoItens: demoOrcamentoItens,
    });
  }, []);

  const limparBase = useCallback(() => {
    setEntidades(ENTIDADES_VAZIAS);
  }, []);

  return {
    loaded, savedFlash, lastUpdated,
    entidades, filtros, updateFiltros, parametros, updateParametros,
    addItem, updateItem, removeItem,
    carregarDemo, limparBase,
  };
}
