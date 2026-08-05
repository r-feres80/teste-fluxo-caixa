import React, { useState } from "react";
import { Lock, AlertTriangle } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "../config/appConfig.js";
import { inputCls } from "./ui/Primitives.jsx";

// ---------------------------------------------------------------------
// REMENDO TEMPORÁRIO — proteção por senha única e compartilhada (não é
// autenticação por usuário). Existe só para não deixar o app 100% aberto
// enquanto a migração para Supabase (login real, por usuário) não sai.
// Deve ser removido/substituído inteiro quando essa migração acontecer —
// não estender este mecanismo com mais lógica de acesso.
//
// A senha vem de VITE_APP_PASSWORD (variável de ambiente), nunca
// hardcoded no código-fonte — mas como o Vite embute variáveis VITE_* no
// bundle em tempo de BUILD (não de runtime), trocar a senha exige gerar
// um novo build/dist.zip; não é "trocar sem novo deploy" de verdade nesse
// fluxo. Isso só seria possível com uma checagem em servidor (function)
// lendo a env var a cada requisição — fora de escopo deste remendo.
// ---------------------------------------------------------------------

const SENHA_CONFIGURADA = import.meta.env.VITE_APP_PASSWORD;
const CHAVE_SESSAO = "cfo-fi-v2-unlocked";

function jaDesbloqueadoNestaSessao() {
  try {
    return window.sessionStorage.getItem(CHAVE_SESSAO) === "1";
  } catch {
    return false; // sessionStorage indisponível (ex.: modo privado restrito) — pede senha de novo
  }
}

function marcarDesbloqueado() {
  try {
    window.sessionStorage.setItem(CHAVE_SESSAO, "1");
  } catch {
    // Sem sessionStorage a sessão simplesmente não persiste entre reloads — não é crítico.
  }
}

export default function PasswordGate({ children }) {
  const [desbloqueado, setDesbloqueado] = useState(jaDesbloqueadoNestaSessao);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(false);

  if (desbloqueado) return children;

  const semSenhaConfigurada = !SENHA_CONFIGURADA;

  const tentar = (e) => {
    e.preventDefault();
    if (semSenhaConfigurada) return;
    if (senha === SENHA_CONFIGURADA) {
      marcarDesbloqueado();
      setDesbloqueado(true);
    } else {
      setErro(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg shadow-sm p-6 flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><Lock size={18} className="text-slate-500" /></div>
          <div>
            <div className="text-slate-900 font-semibold text-sm">{APP_NAME}</div>
            <div className="text-slate-400 text-[11px] mt-0.5">{APP_TAGLINE}</div>
          </div>
        </div>

        {semSenhaConfigurada ? (
          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>Senha de acesso não configurada (VITE_APP_PASSWORD ausente neste build). Contate quem administra o projeto.</span>
          </div>
        ) : (
          <form onSubmit={tentar} className="flex flex-col gap-3">
            <input
              type="password"
              autoFocus
              value={senha}
              onChange={(e) => { setSenha(e.target.value); setErro(false); }}
              placeholder="Senha de acesso"
              className={inputCls}
            />
            {erro && <span className="text-xs text-rose-600">Senha incorreta.</span>}
            <button type="submit" className="px-4 py-2 rounded text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
              Entrar
            </button>
          </form>
        )}

        <p className="text-[10px] text-slate-300 text-center leading-snug">
          Proteção temporária por senha única — será substituída por autenticação por usuário (Supabase) numa próxima fase.
        </p>
      </div>
    </div>
  );
}
