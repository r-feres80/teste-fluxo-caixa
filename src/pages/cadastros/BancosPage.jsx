import React from "react";
import { SimpleCadastroTable } from "../../components/cadastros/SimpleCadastroTable.jsx";

const CAMPOS = [
  { key: "nome", label: "Nome do Banco", largura: "col-span-4", placeholder: "Ex: Itaú Unibanco" },
  { key: "codigo", label: "Código", largura: "col-span-2", placeholder: "Ex: 341", obrigatorio: false },
];

export default function BancosPage({ data }) {
  const { entidades, addItem, updateItem, removeItem } = data;
  return (
    <SimpleCadastroTable
      titulo="Bancos cadastrados" subtitulo="Instituições financeiras — usadas nas Contas Bancárias"
      campos={CAMPOS} itens={entidades.bancos} nomeEntidadeSingular="banco"
      onAdd={(item) => addItem("bancos", item)} onUpdate={(id, patch) => updateItem("bancos", id, patch)} onRemove={(id) => removeItem("bancos", id)}
    />
  );
}
