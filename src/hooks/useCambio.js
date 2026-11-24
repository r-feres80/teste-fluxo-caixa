import { useCallback, useEffect, useState } from "react";
import { buscarCambio, limparCacheCambio } from "../services/cambioService.js";

/** Estado de carregamento do card de Câmbio — nunca propaga exceção: em
 * caso de falha total, `dados` fica null e a tela mostra "indisponível". */
export function useCambio() {
  const [carregando, setCarregando] = useState(true);
  const [dados, setDados] = useState(null);
  const [rev, setRev] = useState(0); // incrementado para forçar re-fetch

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    buscarCambio()
      .then((r) => { if (ativo) setDados(r); })
      .catch(() => { if (ativo) setDados(null); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [rev]);

  const recarregar = useCallback(() => {
    limparCacheCambio();
    setRev((v) => v + 1);
  }, []);

  return { carregando, dados, recarregar };
}
