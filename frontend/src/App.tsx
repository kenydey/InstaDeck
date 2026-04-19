import { Link, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-semibold tracking-tight text-white">
            InstaDeck
          </Link>
          <nav className="flex gap-4 text-sm text-slate-300">
            <Link to="/" className="hover:text-white">
              工作台
            </Link>
            <Link to="/settings" className="hover:text-white">
              设置
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
