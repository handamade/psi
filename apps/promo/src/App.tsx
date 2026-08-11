import { Header } from "./sections/Header";
import { Hero } from "./sections/Hero";
import { Principles } from "./sections/Principles";
import { Playground } from "./sections/Playground";
import { Theming } from "./sections/Theming";
import { Pipeline } from "./sections/Pipeline";
import { AgentReady } from "./sections/AgentReady";
import { Roadmap } from "./sections/Roadmap";
import { Updates } from "./sections/Updates";
import { Footer } from "./sections/Footer";
import { useMode } from "./theme";

export function App() {
  const [mode, setMode] = useMode();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header mode={mode} onMode={setMode} />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Principles />
        <Playground />
        <Theming />
        <Pipeline />
        <AgentReady />
        <Roadmap />
        <Updates />
      </main>
      <Footer />
    </>
  );
}
