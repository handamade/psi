import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@dku/tokens/base.css";
import "@dku/tokens/light.css";
import "@dku/tokens/dark.css";
import "@dku/tokens/acme.css";
import "@dku/tokens/components.css";
import "@dku/tokens/utilities.css";
import "@dku/react/styles";
import "./promo.css";

import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
