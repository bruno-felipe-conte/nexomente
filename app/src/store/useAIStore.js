import { create } from 'zustand';
import * as aiProvider from '../lib/ai/aiProvider';

export const useAIStore = create((set, get) => ({
  status: 'checking',
  provider: localStorage.getItem('nexomente_ai_provider') || aiProvider.getActiveProvider() || 'embedded',
  modelos: [],
  modeloAtual: localStorage.getItem('nexomente_ai_model') || 'gemini-1.5-flash',
  temperatura: parseFloat(localStorage.getItem('nexomente_ai_temp')) || 0.7,
  apiKey: localStorage.getItem('nexomente_gemini_key') || '',
  loading: false,

  setStatus: (status) => set({ status }),
  setLoading: (loading) => set({ loading }),
  
  setProvider: (p) => {
    aiProvider.setActiveProvider(p);
    localStorage.setItem('nexomente_ai_provider', p);
    set({ provider: p });
  },

  setModeloAtual: (m) => {
    localStorage.setItem('nexomente_ai_model', m);
    set({ modeloAtual: m });
  },

  setTemperatura: (t) => {
    localStorage.setItem('nexomente_ai_temp', t);
    set({ temperatura: t });
  },

  setApiKey: (key) => {
    localStorage.setItem('nexomente_gemini_key', key);
    set({ apiKey: key });
  },

  setModelos: (modelos) => set({ modelos }),

  verificarStatus: async () => {
    set({ loading: true, status: 'checking' });
    try {
      const res = await aiProvider.checkStatus();
      if (res.status === 'online') {
        const mods = res.models.length > 0
          ? res.models.map(m => typeof m === 'string' ? m : (m.id || m.name || 'unknown'))
          : [get().modeloAtual];
        
        set({ status: 'online', modelos: mods });
        
        // Se o modelo atual não estiver na lista, seleciona o primeiro
        if (!mods.includes(get().modeloAtual) && mods.length > 0) {
          get().setModeloAtual(mods[0]);
        }
      } else {
        set({ status: 'offline' });
      }
    } catch {
      set({ status: 'offline' });
    }
    set({ loading: false });
  }
}));
