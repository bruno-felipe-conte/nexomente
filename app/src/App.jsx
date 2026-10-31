/**
 * @module App
 * @description Ponto de entrada do frontend do NexoMente.
 * Responsável por orquestrar o layout principal (Sidebar + Header + Main),
 * gerenciar atalhos globais de teclado (ex: navegação de abas),
 * e prover Code Splitting nativo através de `React.lazy` e `<Suspense>`.
 * Todo o roteamento é baseado em estado (`currentPage`) e ouvintes de eventos customizados (`navigate`).
 */
import { useState, useEffect, useLayoutEffect, useRef, lazy, Suspense } from "react";
import { Toaster } from "react-hot-toast";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import { useUIStore } from "./store/useUIStore";
import ErrorBoundary from "./components/ErrorBoundary";
import LevelUpOverlay from "./components/gamification/LevelUpOverlay";
import BottomNav from "./components/layout/BottomNav";
import { useStudyTimerStore } from "./store/useStudyTimerStore";
import { useTamagotchiStore } from "./store/useTamagotchiStore";

// Code Splitting — cada página carrega só quando necessária (Tarefa 5.1)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Notas = lazy(() => import("./pages/Notas"));
const Flashcards = lazy(() => import("./pages/Flashcards"));
const Graph = lazy(() => import("./pages/Graph"));
const Settings = lazy(() => import("./pages/Settings"));
const Poemas = lazy(() => import("./pages/Poemas"));

import AICopilotDrawer from "./components/ai/AICopilotDrawer";

// Páginas reais navegáveis (Alt+←/→)
const PAGES = ["dashboard", "notes", "flashcards", "poemas", "graph", "settings"];

// Rotas abolidas → destino real (utilitários viram componentes globais ou abas internas)
const LEGACY_ROUTES = {
  ai: "copilot", // Chat Neural → Drawer global (Ctrl+J)
  study: "pomodoro", // Sala de Estudos → Popover do Timer na Topbar
  gerador: "forja", // Forja IA → aba dentro de Flashcards
  statistics: "anual", // Métricas → seção colapsável do Dashboard
};

// Fallback enquanto o chunk carrega
function PageLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-nx-void">
      <div className="w-10 h-10 border-2 border-nx-primary border-t-transparent rounded-full animate-spin shadow-glow-primary" />
    </div>
  );
}

function App() {
  const {
    sidebarOpen,
    toggleSidebar,
    loadingGlobal,
    activeTab: currentPage,
    setActiveTab: setCurrentPage,
    setPendingNoteAction,
  } = useUIStore();

  const [isCopilotOpen, setIsCopilotOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("copilot") === "open";
    }
    return false;
  });

  const studyRodando = useStudyTimerStore((s) => s.rodando);
  const studySessaoId = useStudyTimerStore((s) => s.sessaoId);
  const setIsMiniaturized = useStudyTimerStore((s) => s.setIsMiniaturized);

  // Sincroniza flag de miniatura quando sair da aba Study com sessão ativa
  useLayoutEffect(() => {
    if (currentPage !== "study" && (studyRodando || studySessaoId)) {
      setIsMiniaturized(true);
    } else if (currentPage === "study") {
      setIsMiniaturized(false);
    }
  }, [currentPage, studyRodando, studySessaoId, setIsMiniaturized]);

  // Configurações Padrão de Inicialização desacopladas via bootstrap modular
  useLayoutEffect(() => {
    useTamagotchiStore.getState().checkDailyStatus();

    import("./lib/bootstrap/appDefaults.js").then((m) => {
      m.initAppDefaults();
    }).catch(() => {});

    import("./store/useDBStore.js").then((m) => {
      if (m.useDBStore.getState().init) {
        m.useDBStore.getState().init();
      }
    }).catch(() => {});
  }, []);

  // Event listeners para navegação
  useEffect(() => {
    const handleNavigate = (e) => {
      if (["dashboard", "notes", "flashcards", "graph", "settings", "poemas", ...Object.keys(LEGACY_ROUTES)].includes(e.detail)) {
        setCurrentPage(e.detail);
      }
    };
    const handleToggleCopilot = () => {
      setIsCopilotOpen((v) => !v);
    };
    window.addEventListener("navigate", handleNavigate);
    window.addEventListener("toggle-copilot", handleToggleCopilot);
    return () => {
      window.removeEventListener("navigate", handleNavigate);
      window.removeEventListener("toggle-copilot", handleToggleCopilot);
    };
  }, [setCurrentPage]);

  // Rotas legadas viram componentes globais / abas internas — useLayoutEffect para setState síncrono
  const lastValidPageRef = useRef("dashboard");
  useLayoutEffect(() => {
    if (!LEGACY_ROUTES[currentPage]) {
      lastValidPageRef.current = currentPage;
      return;
    }
    const acao = LEGACY_ROUTES[currentPage];
    const targetPage = lastValidPageRef.current;
    queueMicrotask(() => {
      if (acao === "copilot") {
        setCurrentPage(targetPage);
        setIsCopilotOpen(true);
      } else if (acao === "pomodoro") {
        setCurrentPage(targetPage);
        window.dispatchEvent(new CustomEvent("toggle-pomodoro"));
      } else if (acao === "forja") {
        sessionStorage.setItem("nexomente_flashcards_tab", "forja");
        setCurrentPage("flashcards");
        window.dispatchEvent(new CustomEvent("flashcards-tab", { detail: "forja" }));
      } else if (acao === "anual") {
        sessionStorage.setItem("nexomente_dashboard_anual", "1");
        setCurrentPage("dashboard");
        window.dispatchEvent(new CustomEvent("dashboard-anual"));
      }
    });
  }, [currentPage, setCurrentPage]);

  // Atalhos de teclado globais (Tarefa 6.1)
  const pageIndex = PAGES.indexOf(currentPage);

  useEffect(() => {
    const ATALHOS = {
      "1": "dashboard",
      "2": "notes",
      "3": "study",
      "4": "flashcards",
      "5": "gerador",
      "6": "poemas",
      "7": "ai",
      "8": "graph",
      "9": "statistics",
      "0": "settings",
    };
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setPendingNoteAction({ action: "create" });
        setCurrentPage("notes");
        return;
      }

      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && ATALHOS[e.key]) {
        e.preventDefault();
        setCurrentPage(ATALHOS[e.key]);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      // Alt+ArrowLeft / Alt+ArrowRight para navegação global entre abas sem conflitar com Flashcards/Poemas
      if (e.altKey && e.key === "ArrowLeft" && pageIndex > 0) {
        e.preventDefault();
        setCurrentPage(PAGES[pageIndex - 1]);
      } else if (e.altKey && e.key === "ArrowRight" && pageIndex < PAGES.length - 1) {
        e.preventDefault();
        setCurrentPage(PAGES[pageIndex + 1]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleSidebar, setCurrentPage, setPendingNoteAction, pageIndex]);

  if (loadingGlobal) {
    return (
      <div className="flex h-full w-full bg-nx-void items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-nx-primary border-t-transparent rounded-full animate-spin mx-auto mb-4 shadow-glow-primary"></div>
          <p className="text-nx-dim font-mono text-[10px] uppercase tracking-widest">Iniciando Rede Neural...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full nx-app-bg relative overflow-hidden text-nx-text selection:bg-nx-primary/30">
      <LevelUpOverlay />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-nx-surface focus:text-nx-primary focus:rounded-br-lg"
      >
        Pular para o conteúdo principal
      </a>

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "var(--nx-overlay)",
            color: "var(--nx-bright)",
            border: "1px solid var(--nx-border)",
            fontSize: "13px",
            fontFamily: "var(--nx-font-ui)",
          },
          success: { iconTheme: { primary: "var(--nx-success)", secondary: "var(--nx-void)" } },
          error: { iconTheme: { primary: "var(--nx-error)", secondary: "var(--nx-void)" }, duration: 5000 },
        }}
      />

      <Sidebar
        isOpen={sidebarOpen}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onCloseMobile={toggleSidebar}
        className="z-[100]"
      />

      <div className="flex flex-col flex-1 min-w-0 relative h-full overflow-hidden">
        <Header
          title={currentPage}
          onToggleSidebar={toggleSidebar}
          onNavigate={setCurrentPage}
          onToggleCopilot={() => setIsCopilotOpen((v) => !v)}
        />

        <main
          id="main-content"
          className="main-content flex-1 overflow-hidden focus:outline-none relative z-10 w-full min-h-0"
          tabIndex="-1"
        >
          <ErrorBoundary context={currentPage} key={currentPage}>
            <Suspense fallback={<PageLoader />}>
              {currentPage === "dashboard" && <Dashboard />}
              {currentPage === "notes" && <Notas />}
              {currentPage === "flashcards" && <Flashcards />}
              {currentPage === "graph" && <Graph />}
              {currentPage === "settings" && <Settings />}
              {currentPage === "poemas" && <Poemas />}
            </Suspense>
          </ErrorBoundary>
        </main>

        <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
      </div>

      {/* Copiloto Neural Global (Slide-over Drawer) */}
      <AICopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
      />
    </div>
  );
}

export default App;
