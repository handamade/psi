import { Header } from "./sections/Header";
import { Hero } from "./sections/Hero";
import { Principles } from "./sections/Principles";
import { Playground } from "./sections/Playground";
import { Theming } from "./sections/Theming";
import { Pipeline } from "./sections/Pipeline";
import { Roadmap } from "./sections/Roadmap";
import { Updates } from "./sections/Updates";
import { Footer } from "./sections/Footer";
import { useTheme } from "./theme";

export function App() {
  const [theme, setTheme] = useTheme();

  return (
    <>
      <Header theme={theme} onTheme={setTheme} />
      <main>
        <Hero />
        <Principles />
        <Playground />
        <Theming />
        <Pipeline />
        <Roadmap />
        <Updates />
      </main>
      <Footer />
    </>
  );
}
