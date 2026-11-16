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
  const [mode, setMode, setModeEphemeral] = useMode();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {/* The header toggle is a real, persisted choice; Hero gets the
          ephemeral setter, since a derived brand's own mode is not one. */}
      <Header mode={mode} onMode={setMode} />
      <main id="main" tabIndex={-1}>
        <Hero mode={mode} onMode={setModeEphemeral} />
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
