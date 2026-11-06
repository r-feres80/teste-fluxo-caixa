import { useState, useEffect, useCallback, useRef } from "react";
import { storageService } from "../services/storageService.js";
import { STORAGE_KEY, DEFAULT_PARAMETROS } from "../config/appConfig.js";
import { todayISO, parseISO } from "../utils/dateUtils.js";
import { uid } from "../utils/formatUtils.js";
import { calcularSweepCaixa } from "../financial-engine/sweepCaixa.js";
import {
  demoEmpresas, demoUnidades, demoClientes, demoFornecedores, demoBancos,
  demoContasBancarias, demoProjetos, demoPlanoDeContas, demoCentrosCusto, demoLancamentos, demoOrcamentoItens,
} from "../data/demoData.js";

// Fábrica (nunca um objeto único compartilhado): o importador cria Empresa/
// Conta Gerencial/Centro de Custo/Cliente-Fornecedor/Conta Bancária via
// .push() direto no objeto entidades recebido. Se "vazio" fosse um único
// objeto reaproveitado, essas criações contaminariam permanentemente seus
// arrays, e "Limpar Base" passaria a reaplicar um molde já sujo — cada
// chamada aqui precisa devolver arrays novos.
const criarEntidadesVazias = () => ({
  empresas: [], unidades: [], clientes: [], fornecedores: [], bancos: [],
  contasBancarias: [], projetos: [], planoDeContas: [], centrosCusto: [],
  lancamentos: [], orcamentoItens: [], sweepLog: [],
});

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

// Snapshot da massa demo pronta pra usar — os arrays demo* já são gerados
// (gerarMassaSintetica) com HOJE real desta carga de página, então isto é
// sempre "fresco" no momento em que o módulo é avaliado.
const demoFresco = () => ({
  entidades: {
    empresas: [...demoEmpresas], unidades: [...demoUnidades], clientes: [...demoClientes], fornecedores: [...demoFornecedores],
    bancos: [...demoBancos], contasBancarias: [...demoContasBancarias], projetos: [...demoProjetos],
    planoDeContas: [...demoPlanoDeContas], centrosCusto: [...demoCentrosCusto],
    lancamentos: [...demoLancamentos], orcamentoItens: [...demoOrcamentoItens], sweepLog: [],
  },
  origemBase: "demo", demoGeradoEm: HOJE_ISO,
});

export function useAppData() {
  const [loaded, setLoaded] = useState(false);
  const [entidades, setEntidades] = useState(criarEntidadesVazias);
  const [filtros, setFiltros] = useState(DEFAULT_FILTROS);
  const [parametros, setParametros] = useState(DEFAULT_PARAMETROS);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [savedFlash, setSavedFlash] = useState(false);
  // origemBase rastreia se a base atual é "demo" (auto-gerada) ou "usuario"
  // (qualquer addItem/updateItem/removeItem já marca "usuario", pra nunca
  // sobrescrever dado real). Só serve pra decidir se é seguro auto-atualizar
  // a base ao detectar que ela ficou de um dia anterior — ver useEffect abaixo.
  const origemBaseRef = useRef(null);
  const initialLoad = useRef(true);

  useEffect(() => {
    (async () => {
      const s = await storageService.getItem(STORAGE_KEY);
      if (s) {
        // Base demo persistida de um dia anterior ("hoje" real já mudou):
        // módulos de FATO (Tesouraria, Dashboard, ...) leem sempre a data
        // real do sistema, então lançamentos com datas relativas ao HOJE de
        // ontem (ex.: "Movimento de Hoje") ficam permanentemente zerados até
        // alguém clicar "Carregar Dados Demonstrativos" de novo. Como é
        // 100% dado fictício (nunca real do usuário), é seguro regenerar
        // silenciosamente aqui — nunca faríamos isso se origemBase for
        // "usuario".
        if (s.origemBase === "demo" && s.demoGeradoEm !== HOJE_ISO) {
          const fresco = demoFresco();
          origemBaseRef.current = fresco.origemBase;
          // Achado do comando sweep-automatico-b: essa regeneração silenciosa
          // (pensada só pra manter texto/data relativa da demo "fresca")
          // colidia direto com o sweep automático — toda virada de dia
          // apagava o sweepLog inteiro E os lançamentos SWEEP-* que ele
          // tinha criado no dia anterior, fazendo o sweep "recalcular do
          // zero" e nunca acumular histórico de verdade. Preserva os dois
          // através da regeneração: sweepLog é trilha de auditoria (mesmo
          // raciocínio de por que sobrevive a "Limpar Base"), e os
          // lançamentos SWEEP-* precisam vir junto pra "Transferências
          // Internas" em Tesouraria continuar batendo com o que o log diz
          // que aconteceu.
          const sweepLancamentosAnteriores = (s.entidades?.lancamentos || []).filter((l) => l.documento?.startsWith("SWEEP-"));
          setEntidades({
            ...fresco.entidades,
            lancamentos: [...fresco.entidades.lancamentos, ...sweepLancamentosAnteriores],
            sweepLog: s.entidades?.sweepLog || [],
          });
        } else {
          origemBaseRef.current = s.origemBase ?? null;
          // sweepLog: default defensivo pra sessão salva antes deste campo
          // existir (comando sweep-automatico-b) não quebrar com undefined.
          setEntidades(s.entidades ? { sweepLog: [], ...s.entidades } : criarEntidadesVazias());
        }
        setFiltros(s.filtros ?? DEFAULT_FILTROS);
        setParametros(s.parametros ? { ...DEFAULT_PARAMETROS, ...s.parametros } : DEFAULT_PARAMETROS);
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
      await storageService.setItem(STORAGE_KEY, {
        entidades, filtros, parametros, lastUpdated: now,
        origemBase: origemBaseRef.current, demoGeradoEm: origemBaseRef.current === "demo" ? HOJE_ISO : undefined,
      });
      setLastUpdated(now);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1200);
    }, 400);
    return () => clearTimeout(t);
  }, [entidades, filtros, parametros, loaded]);

  // ---- Sweep automático de caixa (comando sweep-automatico-b, Modelo B) ----
  // Dispara 1x por dia, no primeiro carregamento do app após a virada de
  // data — nunca a cada render/reload dentro do mesmo dia. Idempotente por
  // construção: a fonte da verdade de "já rodou hoje" é o PRÓPRIO log
  // (entidades.sweepLog), não uma flag separada que possa dessincronizar.
  // Reaproveita a mesma lógica de cálculo de scripts/varredura-caixa-
  // aplicacao.mjs via financial-engine/sweepCaixa.js (script manual
  // continua intocado, fora de escopo deste comando) — nunca uma versão
  // paralela do algoritmo.
  // Guarda por DIA (não um boolean simples): React.StrictMode (ativo em
  // src/main.jsx) invoca efeitos 2x em dev de propósito, e um boolean que
  // volta pra false no fim do corpo do efeito não pega esse re-entry —
  // guardar "já disparei uma checagem pra ESTE hoje" resolve tanto o
  // double-invoke do StrictMode quanto permite disparar de novo numa
  // virada de dia real numa aba que ficou aberta.
  const sweepChecadoParaRef = useRef(null);
  useEffect(() => {
    if (!loaded) return;
    if (entidades.contasBancarias.length === 0) return; // sem base carregada, nada a varrer
    if (parametros.caixaMinimo == null) return; // sweep desligado até Governança configurar um mínimo
    const hoje = todayISO();
    const jaRodouHoje = (entidades.sweepLog || []).some((r) => r.dataExecucao === hoje);
    if (jaRodouHoje || sweepChecadoParaRef.current === hoje) return;
    sweepChecadoParaRef.current = hoje;

    const resultado = calcularSweepCaixa({
      contasBancarias: entidades.contasBancarias, lancamentos: entidades.lancamentos,
      hoje, caixaMinimo: parametros.caixaMinimo,
    });

    const registroBase = {
      id: uid(), dataExecucao: hoje, timestamp: new Date().toISOString(),
      caixaMinimoVigente: parametros.caixaMinimo,
    };

    if (!resultado.executar) {
      setEntidades((prev) => ({ ...prev, sweepLog: [...prev.sweepLog, { ...registroBase, executado: false, motivo: "sem excedente", valorTotalVarrido: 0, movimentos: [] }] }));
      return;
    }

    const novosLancamentos = [];
    const movimentosLog = [];
    resultado.movimentos.forEach((m) => {
      const grupoId = uid();
      const base = {
        empresaId: m.empresaId, unidadeId: null, centroCustoId: null, projetoId: null,
        tipoParceiro: null, clienteFornecedorId: null, bancoId: null,
        dataEmissao: hoje, competencia: hoje.slice(0, 7), dataVencimento: hoje, dataPagamento: hoje,
        situacao: "Realizado", valor: m.valor, transferencia: true, transferenciaGrupoId: grupoId,
      };
      const idSaida = uid(), idEntrada = uid();
      novosLancamentos.push({
        ...base, id: idSaida, contaBancariaId: m.contaOrigemId, tipo: "Saída",
        documento: `SWEEP-${hoje.replace(/-/g, "")}-${m.contaOrigemId}-SAI`, contaGerencialId: "pc5.06",
        observacao: "Gerado — varredura automática de caixa acima do mínimo operacional (sweep diário, virada de dia)",
      });
      novosLancamentos.push({
        ...base, id: idEntrada, contaBancariaId: m.contaDestinoId, tipo: "Entrada",
        documento: `SWEEP-${hoje.replace(/-/g, "")}-${m.contaOrigemId}-ENT`, contaGerencialId: null,
        observacao: "Gerado — varredura automática de caixa acima do mínimo operacional (sweep diário, virada de dia)",
      });
      movimentosLog.push({ ...m, lancamentoIdSaida: idSaida, lancamentoIdEntrada: idEntrada });
    });

    setEntidades((prev) => ({
      ...prev,
      lancamentos: [...prev.lancamentos, ...novosLancamentos],
      sweepLog: [...prev.sweepLog, {
        ...registroBase, executado: true, valorTotalVarrido: resultado.excedenteTotal, movimentos: movimentosLog,
      }],
    }));
  }, [loaded, entidades.contasBancarias, entidades.lancamentos, entidades.sweepLog, parametros.caixaMinimo]);

  // ---- Filtros e Governança ----

  const updateFiltros = useCallback((patch) => setFiltros((prev) => ({ ...prev, ...patch })), []);
  const updateParametros = useCallback((patch) => setParametros((prev) => ({ ...prev, ...patch })), []);

  // Realinha Mês/Ano com a Data de Referência atual. Chamado sempre que a base
  // muda de forma abrupta (Limpar Base, Carregar Demo, importação concluída) —
  // sem isso o filtro de mês fica "preso" no último valor manual, ainda que
  // não reflita mais o período que a Data de Referência indica.
  const sincronizarPeriodoComReferencia = useCallback(() => {
    setFiltros((prev) => {
      const d = parseISO(prev.dataReferencia);
      return { ...prev, anoRef: d.getFullYear(), mesRef: d.getMonth() };
    });
  }, []);

  // ---- CRUD genérico por entidade ----
  // Qualquer edição manual marca a base como "usuario" — a partir daqui o
  // auto-refresh de base demo obsoleta (ver useEffect de carga) nunca mais
  // se aplica a esta base, mesmo que ela tenha começado como demo.

  const addItem = useCallback((entidade, item) => {
    origemBaseRef.current = "usuario";
    setEntidades((prev) => ({ ...prev, [entidade]: [...prev[entidade], { ...item, id: uid() }] }));
  }, []);
  const updateItem = useCallback((entidade, id, patch) => {
    origemBaseRef.current = "usuario";
    setEntidades((prev) => ({ ...prev, [entidade]: prev[entidade].map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  }, []);
  const removeItem = useCallback((entidade, id) => {
    origemBaseRef.current = "usuario";
    setEntidades((prev) => ({ ...prev, [entidade]: prev[entidade].filter((i) => i.id !== id) }));
  }, []);

  // ---- Dados: Carregar Demonstrativo / Limpar Base ----

  const carregarDemo = useCallback(() => {
    const fresco = demoFresco();
    origemBaseRef.current = fresco.origemBase;
    setEntidades(fresco.entidades);
    sincronizarPeriodoComReferencia();
    // Comando fix-sweeplog-carregar-demo: fresco.entidades já vem com
    // sweepLog: [] (novo cenário, log antigo não é mais auditoria válida
    // — referencia um mundo que acabou de ser substituído). Sem resetar
    // este ref também, o efeito do sweep via "sweepChecadoParaRef.current
    // === hoje" (já setado por uma execução anterior no mesmo dia) ficava
    // bloqueado até um reload de página — o saldo recém-recalibrado ficava
    // visivelmente "sem sweep" até alguém lembrar de apertar F5. Resetando
    // aqui, o sweep reavalia e dispara de novo na mesma sessão, sem
    // precisar reload.
    sweepChecadoParaRef.current = null;
  }, [sincronizarPeriodoComReferencia]);

  // Limpar Base reseta dado TRANSACIONAL (lançamentos, orçamento, contas
  // bancárias, clientes/fornecedores/projetos/centros de custo/unidades) mas
  // PRESERVA estrutura de configuração (Empresas, Bancos, Plano de Contas) —
  // decisão já registrada de que Plano de Contas não é dado transacional.
  // Achado real (comando dashboard-causa-raiz): apagar o Plano de Contas
  // junto fazia um reimport de planilha real (sem colunas de classificação)
  // recriar toda conta gerencial como "Não classificado"/"Operacional"
  // genérico, zerando Receita Bruta/EBITDA/DFC — sem o usuário nunca ter
  // pedido pra apagar a classificação que ele já tinha configurado.
  const limparBase = useCallback(() => {
    // Vira "usuario" (nunca mais auto-regenera demo obsoleta): a partir
    // daqui a estrutura preservada (Empresas/Bancos/Plano de Contas) é
    // intencional, não "sobra de demo esperando reload".
    origemBaseRef.current = "usuario";
    setEntidades((prev) => ({
      ...criarEntidadesVazias(),
      empresas: prev.empresas,
      bancos: prev.bancos,
      planoDeContas: prev.planoDeContas,
      // sweepLog é trilha de auditoria (rastreabilidade do que o sweep
      // automático já fez), não dado transacional operacional — decisão:
      // sobrevive a Limpar Base (só "Resetar Tudo" apaga), senão o próprio
      // "log que nunca é apagado silenciosamente" perderia o sentido. O
      // comando pediu isso de forma um pouco ambígua ("tabela no dado
      // transacional" + "deve sobreviver a Limpar Base") — fica registrado
      // aqui qual leitura foi escolhida.
      sweepLog: prev.sweepLog,
    }));
    sincronizarPeriodoComReferencia();
    // Mesmo raciocínio do carregarDemo: contasBancarias/lancamentos mudam
    // aqui, então o sweep precisa poder reavaliar na mesma sessão.
    sweepChecadoParaRef.current = null;
  }, [sincronizarPeriodoComReferencia]);

  // Resetar Tudo: o "recomeçar do zero de verdade" — apaga também Empresas/
  // Bancos/Plano de Contas. Ação separada de Limpar Base (que só mexe em
  // dado transacional) pra não ser possível apagar configuração sem querer.
  const resetarTudo = useCallback(() => {
    origemBaseRef.current = null;
    sweepChecadoParaRef.current = null;
    setEntidades(criarEntidadesVazias());
    sincronizarPeriodoComReferencia();
  }, [sincronizarPeriodoComReferencia]);

  return {
    loaded, savedFlash, lastUpdated,
    entidades, filtros, updateFiltros, parametros, updateParametros,
    addItem, updateItem, removeItem,
    carregarDemo, limparBase, resetarTudo, sincronizarPeriodoComReferencia,
  };
}
