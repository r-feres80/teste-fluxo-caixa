import React from "react";
import { ContasPagarReceberView } from "../components/ContasPagarReceberView.jsx";

export default function ContasAReceberPage({ data }) {
  return <ContasPagarReceberView data={data} tipo="Entrada" />;
}
