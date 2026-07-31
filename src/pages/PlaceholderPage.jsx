import React from "react";
import { Construction } from "lucide-react";

export default function PlaceholderPage({ nome, fase }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
      <Construction size={28} className="text-slate-300" />
      <div className="text-slate-700 font-medium">{nome}</div>
      <div className="text-slate-500 text-sm max-w-md">
        Este módulo entra na {fase} do projeto, depois que Cadastros estiver validado. O menu já está aqui para você conferir a estrutura completa combinada.
      </div>
    </div>
  );
}
