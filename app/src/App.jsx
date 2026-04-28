/**
 * @module App
 * @description Ponto de entrada do frontend do NexoMente. 
 * Responsável por orquestrar o layout principal (Sidebar + Header + Main), 
 * gerenciar atalhos globais de teclado (ex: navegação de abas), 
 * e prover Code Splitting nativo através de `React.lazy` e `<Suspense>`.
 * Todo o roteamento é baseado em estado (`currentPage`) e ouvintes de eventos customizados (`navigate`).
 */
import { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import { useUIStore } from './store/useUIStore';
import ErrorBoundary from './components/ErrorBoundary';
import LevelUpOverlay from './components/gamification/LevelUpOverlay';
import BottomNav from './components/layout/BottomNav';

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
  const { 
    sidebarOpen, toggleSidebar, loadingGlobal, 
    activeTab: currentPage, setActiveTab: setCurrentPage 
  } = useUIStore();

  useEffect(() => {
    // ─── Configurações Padrão de Inicialização (GitHub/Fresh Install) ───
    const defaults = {
      'nexomente_ai_provider': window.electronAPI ? 'embedded' : 'cloud',
      'nexomente_ai_language': 'Português Brasileiro',
      'nexomente_tema': 'dark',
      'nexomente_ai_temp': '0.7',
      'nexomente_ai_max_tokens': '1024',
      'nexomente_embedded_path': './electron/models/llama-3-8b-instruct.gguf',
      'nexomente_ai_system_prompt': 'Você é o NexoMente, um assistente de estudos de alto desempenho. Responda de forma lógica, profunda e estruturada.'
    };

    Object.entries(defaults).forEach(([key, val]) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, val);
      }
    });

    try {
      import('./store/useDBStore').then(m => {
        if (m.useDBStore.getState().init) {
          m.useDBStore.getState().init();
        }
      }).catch(err => console.error("Erro ao carregar DBStore:", err));
    } catch (e) {
      console.error("Falha crítica na inicialização:", e);
    }

    const savedTema = localStorage.getItem('nexomente_tema') || 'dark';
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(savedTema);
  }, []);

  // ── Sincronização de XP DB -> Tamagotchi ──
  useEffect(() => {
    const unsub = import('./store/useDBStore').then(m => {
      return m.useDBStore.subscribe(
        state => state.totalXP,
        totalXP => {
          import('./store/useTamagotchiStore').then(t => {
             // O tamagotchi já calcula o progresso baseado no XP
             // Aqui podemos disparar check de HP ou outras reações
          });
        }
      );
    });
    return () => unsub.then(u => u && u());
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
  const PAGES = ['dashboard', 'notes', 'study', 'flashcards', 'poemas', 'gerador', 'ai', 'graph', 'statistics', 'settings'];
  const pageIndex = PAGES.indexOf(currentPage);

  useEffect(() => {
    const ATALHOS = {
      '1': 'dashboard', '2': 'notes',      '3': 'study',
      '4': 'flashcards','5': 'gerador',    '6': 'ai',
      '7': 'graph',     '8': 'statistics', '9': 'settings',
    };
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && ATALHOS[e.key]) {
        e.preventDefault();
        setCurrentPage(ATALHOS[e.key]);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      // Arrow keys for page navigation
      if (e.key === 'ArrowLeft' && pageIndex > 0) {
        e.preventDefault();
        setCurrentPage(PAGES[pageIndex - 1]);
      } else if (e.key === 'ArrowRight' && pageIndex < PAGES.length - 1) {
        e.preventDefault();
        setCurrentPage(PAGES[pageIndex + 1]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleSidebar, currentPage, pageIndex]);


  if (loadingGlobal) {
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
    <div className="flex h-full w-full bg-[#0B0C13] relative overflow-hidden text-text-hi selection:bg-accent-main/30">
      <LevelUpOverlay />
      {/* Skip to main content link para navegação por teclado (Tarefa 6.7) */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-bg-secondary focus:text-accent-main focus:rounded-br-lg"
      >
        Pular para o conteúdo principal
      </a>

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
        className="z-[100]"
      />

      <div className="flex flex-col flex-1 min-w-0 relative h-full">
        {/* LINHA DE HORIZONTE (Ajustada para o novo header h-20) */}
        <div className="absolute top-20 left-0 right-0 h-[1px] bg-white/5 z-0 pointer-events-none" />
        
        <Header
          title={currentPage}
          onToggleSidebar={toggleSidebar}
          onNavigate={setCurrentPage}
        />

        <main
          id="main-content"
          className="main-content flex-1 overflow-auto focus:outline-none relative z-10 custom-scrollbar pb-16 md:pb-0"
          tabIndex="-1"
        >
          {/* ErrorBoundary por página + Suspense para lazy loading */}
          <ErrorBoundary context={currentPage} key={currentPage}>
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
      <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
    </div>
  );
}

export default App;