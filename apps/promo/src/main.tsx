import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@handamade/psi-tokens/base.css";
import "@handamade/psi-tokens/light.css";
import "@handamade/psi-tokens/dark.css";
import "@handamade/psi-tokens/acme.css";
import "@handamade/psi-tokens/ember.css";
import "@handamade/psi-tokens/components.css";
import "@handamade/psi-tokens/utilities.css";
import "@handamade/psi-react/styles";
import "./promo.css";

import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
