export interface Nota {
  id: string;
  pasta_id: string;
  tipo: 'nota' | 'livro' | 'projeto' | 'ideia' | 'diario' | 'biblia' | 'estudo' | 'lembrete';
  titulo: string;
  conteudo?: string;
  tags?: string[];
  status?: 'ativo' | 'arquivado' | 'lixo';
  created_at?: string;
  updated_at?: string;
}

export interface Pasta {
  id: string;
  nome: string;
  parent_id?: string;
  cor: string;
  icone: string;
  created_at?: string;
}

export interface Materia {
  id: string;
  nome: string;
  cor: string;
  icone: string;
  meta_horas: number;
  created_at?: string;
}

export interface Flashcard {
  id: string;
  materia_id: string;
  pergunta: string;
  resposta: string;
  qualidade?: number;
  intervalo?: number;
  repeticoes?: number;
  efactor?: number;
  next_review?: string;
  created_at?: string;
}

export interface SessaoEstudo {
  id: string;
  materia_id?: string;
  tipo: 'pomodoro' | 'leitura' | 'flashcards';
  duracao_minutos: number;
  completada: boolean;
  started_at?: string;
  completed_at?: string;
}

export interface XPEntry {
  id: string;
  xp: number;
  motivo: string;
  source_type?: string;
  source_id?: string;
  created_at?: string;
}

export interface DBService {
  notas: {
    getAll(): Nota[];
    getById(id: string): Nota | null;
    create(nota: Omit<Nota, 'id' | 'created_at' | 'updated_at'>): Nota;
    update(id: string, updates: Partial<Nota>): Nota;
    delete(id: string): void;
  };
  pastas: {
    getAll(): Pasta[];
    create(pasta: Omit<Pasta, 'id' | 'created_at'>): Pasta;
  };
  materias: {
    getAll(): Materia[];
    create(materia: Omit<Materia, 'id' | 'created_at'>): Materia;
  };
  flashcards: {
    getAll(): Flashcard[];
    getParaRevisao(): Flashcard[];
    create(card: Omit<Flashcard, 'id' | 'created_at'>): Flashcard;
    revisar(id: string, qualidade: number): Flashcard;
  };
  sessoes: {
    getAll(): SessaoEstudo[];
    create(sessao: Omit<SessaoEstudo, 'id'>): SessaoEstudo;
    completar(id: string): SessaoEstudo;
  };
  xp: {
    getTotal(): number;
    add(xp: number, motivo: string, source_type?: string, source_id?: string): XPEntry;
  };
}