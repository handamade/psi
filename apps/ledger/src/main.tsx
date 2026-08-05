import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@handamade/psi-tokens/base.css";
import "@handamade/psi-tokens/light.css";
import "@handamade/psi-tokens/components.css";
import "@handamade/psi-tokens/utilities.css";
import "@handamade/psi-react/styles";
import { TransactionsScreen } from "./TransactionsScreen.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TransactionsScreen />
  </StrictMode>,
);
