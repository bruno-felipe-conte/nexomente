import { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import { useUIStore } from './store/useUIStore';
import ErrorBoundary from './components/ErrorBoundary';

// ─── Code Splitting — cada página carrega só quando necessária (Tarefa 5.1) ───
const Dashboard    = lazy(() => import('./pages/Dashboard'));
const Notas        = lazy(() => import('./pages/Notas'));
const Study        = lazy(() => import('./pages/Study'));
const Flashcards   = lazy(() => import('./pages/Flashcards'));
const Graph        = lazy(() => import('./pages/Graph'));
const Statistics   = lazy(() => import('./pages/Statistics'));
const Settings     = lazy(() => import('./pages/Settings'));
const Poemas       = lazy(() => import('./pages/Poemas'));
const AIChat       = lazy(() => import('./pages/AIChat'));
const Gerador      = lazy(() => import('./pages/Gerador'));

// Fallback enquanto o chunk carrega
function PageLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="w-8 h-8 border-4 border-accent-main border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { sidebarOpen, toggleSidebar, loading } = useUIStore();

  useEffect(() => {
    useUIStore.getState().init();

    const savedTema = localStorage.getItem('nexomente_tema') || 'dark';
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(savedTema);
  }, []);

  useEffect(() => {
    const handleNavigate = (e) => {
      if (['dashboard', 'notes', 'study', 'flashcards', 'graph', 'statistics', 'settings', 'poemas', 'ai', 'gerador'].includes(e.detail)) {
        setCurrentPage(e.detail);
      }
    };
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  // ── Atalhos de teclado globais (Tarefa 6.1) ──────────────────────────────
  useEffect(() => {
    const ATALHOS = {
      '1': 'dashboard', '2': 'notes',      '3': 'study',
      '4': 'flashcards','5': 'gerador',    '6': 'ai',
      '7': 'graph',     '8': 'statistics', '9': 'settings',
    };
    const handler = (e) => {
      // Ignora quando foco está em input/textarea/contenteditable
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && ATALHOS[e.key]) {
        e.preventDefault();
        setCurrentPage(ATALHOS[e.key]);
      }
      // Ctrl+B → toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleSidebar]);


  if (loading) {
    return (
      <div className="flex h-full w-full bg-bg-primary items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-main border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Carregando NexoMente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-bg-primary">
      {/* Toast global — cobre toda a app (Tarefa 6.2) */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--bg-secondary, #1e1e2e)',
            color: 'var(--text-primary, #cdd6f4)',
            border: '1px solid var(--bg-tertiary, #313244)',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#a6e3a1', secondary: '#1e1e2e' } },
          error:   { iconTheme: { primary: '#f38ba8', secondary: '#1e1e2e' }, duration: 5000 },
        }}
      />

      <Sidebar
        isOpen={sidebarOpen}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <Header
          title={currentPage}
          onToggleSidebar={toggleSidebar}
        />

        <main className="flex-1 overflow-auto">
          {/* ErrorBoundary por página + Suspense para lazy loading */}
          <ErrorBoundary context={currentPage}>
            <Suspense fallback={<PageLoader />}>
              {currentPage === 'dashboard'   && <Dashboard />}
              {currentPage === 'notes'       && <Notas />}
              {currentPage === 'study'       && <Study />}
              {currentPage === 'flashcards'  && <Flashcards />}
              {currentPage === 'graph'       && <Graph />}
              {currentPage === 'statistics'  && <Statistics />}
              {currentPage === 'settings'    && <Settings />}
              {currentPage === 'poemas'      && <Poemas />}
              {currentPage === 'ai'          && <AIChat onNavigate={setCurrentPage} />}
              {currentPage === 'gerador'     && <Gerador />}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default App;