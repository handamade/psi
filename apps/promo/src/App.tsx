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
import { useTheme } from "./theme";

export function App() {
  const [theme, setTheme] = useTheme();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header theme={theme} onTheme={setTheme} />
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
