import { useEffect, useState } from "react";
import { buscarCambio } from "../services/cambioService.js";

/** Estado de carregamento do card de Câmbio — nunca propaga exceção: em
 * caso de falha total, `dados` fica null e a tela mostra "indisponível". */
export function useCambio() {
  const [carregando, setCarregando] = useState(true);
  const [dados, setDados] = useState(null);

  useEffect(() => {
    let ativo = true;
    buscarCambio()
      .then((r) => { if (ativo) setDados(r); })
      .catch(() => { if (ativo) setDados(null); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, []);

  return { carregando, dados };
}
