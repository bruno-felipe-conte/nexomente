import { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import { useUIStore } from './store/useUIStore';
import Dashboard from './pages/Dashboard';
import Notas from './pages/Notas';
import Study from './pages/Study';
import Flashcards from './pages/Flashcards';
import Graph from './pages/Graph';
import Statistics from './pages/Statistics';
import Settings from './pages/Settings';
import Poemas from './pages/Poemas';
import AIChat from './pages/AIChat';
import Gerador from './pages/Gerador';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { sidebarOpen, toggleSidebar, loading, error } = useUIStore();
  
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
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'notes' && <Notas />}
          {currentPage === 'study' && <Study />}
          {currentPage === 'flashcards' && <Flashcards />}
          {currentPage === 'graph' && <Graph />}
          {currentPage === 'statistics' && <Statistics />}
          {currentPage === 'settings' && <Settings />}
          {currentPage === 'poemas' && <Poemas />}
          {currentPage === 'ai' && <AIChat onNavigate={setCurrentPage} />}
          {currentPage === 'gerador' && <Gerador />}
        </main>
      </div>
    </div>
  );
}

export default App;