import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import PasswordGate from "./components/PasswordGate.jsx";
import { LanguageProvider } from "./i18n/LanguageContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <PasswordGate>
        <App />
      </PasswordGate>
    </LanguageProvider>
  </React.StrictMode>
);
