import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Self-hosted, subset by the bundler, preloaded by Vite — never a render-blocking
// third-party stylesheet, and no layout shift when the face swaps in.
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/landing.css";
import "./styles/app.css";

import { App } from "./App.jsx";

// Set before the first paint: entrance animations only hide content on the promise
// that something will show it again.
document.documentElement.classList.add("js");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
