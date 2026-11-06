import React from "react";
import { ContasPagarReceberView } from "../components/ContasPagarReceberView.jsx";

export default function ContasAPagarPage({ data }) {
  return <ContasPagarReceberView data={data} tipo="Saída" />;
}
