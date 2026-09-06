import { Landing } from "./routes/Landing.jsx";
import { Solve } from "./routes/Solve.jsx";
import { usePath } from "./router.jsx";

export function App() {
  const path = usePath();
  return path.startsWith("/solve") ? <Solve /> : <Landing />;
}
