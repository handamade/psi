import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@handamade/tokens/base.css";
import "@handamade/tokens/light.css";
import "@handamade/tokens/dark.css";
import "@handamade/tokens/acme.css";
import "@handamade/tokens/components.css";
import "@handamade/tokens/utilities.css";
import "@handamade/react/styles";
import "./promo.css";

import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
