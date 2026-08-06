import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@handamade/psi-tokens/base.css";
import "@handamade/psi-tokens/light.css";
import "@handamade/psi-tokens/components.css";
import "@handamade/psi-tokens/utilities.css";
import "@handamade/psi-react/styles";
import { ToastProvider } from "@handamade/psi-react";
import { TransactionsScreen } from "./TransactionsScreen.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <TransactionsScreen />
    </ToastProvider>
  </StrictMode>,
);
