import React from "react";
import { SimpleCadastroTable } from "../../components/cadastros/SimpleCadastroTable.jsx";

export default function UnidadesPage({ data }) {
  const { entidades, addItem, updateItem, removeItem } = data;
  const campos = [
    { key: "nome", label: "Nome", largura: "col-span-3", placeholder: "Ex: Filial - Campinas" },
    { key: "empresaId", label: "Empresa", tipo: "select", largura: "col-span-2", opcoes: entidades.empresas.map((e) => ({ value: e.id, label: e.nome })) },
  ];
  return (
    <SimpleCadastroTable
      titulo="Unidades cadastradas" subtitulo="Filiais/unidades vinculadas a uma empresa"
      campos={campos} itens={entidades.unidades} nomeEntidadeSingular="unidade"
      onAdd={(item) => addItem("unidades", item)} onUpdate={(id, patch) => updateItem("unidades", id, patch)} onRemove={(id) => removeItem("unidades", id)}
    />
  );
}
