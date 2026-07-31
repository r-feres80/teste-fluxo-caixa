import React from "react";
import { SimpleCadastroTable } from "../../components/cadastros/SimpleCadastroTable.jsx";

const CAMPOS = [
  { key: "nome", label: "Nome", largura: "col-span-3", placeholder: "Ex: Mercado Central Ltda" },
  { key: "documento", label: "CNPJ/CPF", largura: "col-span-2", placeholder: "00.000.000/0001-00", obrigatorio: false },
];

export default function ClientesPage({ data }) {
  const { entidades, addItem, updateItem, removeItem } = data;
  return (
    <SimpleCadastroTable
      titulo="Clientes cadastrados" subtitulo="Usados em Contas a Receber e nos lançamentos de entrada"
      campos={CAMPOS} itens={entidades.clientes} nomeEntidadeSingular="cliente"
      onAdd={(item) => addItem("clientes", item)} onUpdate={(id, patch) => updateItem("clientes", id, patch)} onRemove={(id) => removeItem("clientes", id)}
    />
  );
}
