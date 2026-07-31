import React from "react";
import { SimpleCadastroTable } from "../../components/cadastros/SimpleCadastroTable.jsx";

export default function ProjetosPage({ data }) {
  const { entidades, addItem, updateItem, removeItem } = data;
  const campos = [
    { key: "nome", label: "Nome do Projeto", largura: "col-span-4", placeholder: "Ex: Expansão Filial Campinas" },
    { key: "empresaId", label: "Empresa", tipo: "select", largura: "col-span-2", opcoes: entidades.empresas.map((e) => ({ value: e.id, label: e.nome })) },
  ];
  return (
    <SimpleCadastroTable
      titulo="Projetos cadastrados" subtitulo="Dimensão opcional para lançamentos e orçamento"
      campos={campos} itens={entidades.projetos} nomeEntidadeSingular="projeto"
      onAdd={(item) => addItem("projetos", item)} onUpdate={(id, patch) => updateItem("projetos", id, patch)} onRemove={(id) => removeItem("projetos", id)}
    />
  );
}
