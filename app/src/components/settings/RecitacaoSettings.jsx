import React from 'react';
import { Mic } from 'lucide-react';
import Card from '../ui/Card';

export default function RecitacaoSettings() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-2xl">
      <section className="space-y-6">
        <div className="flex flex-col gap-1 px-2">
          <h3 className="text-lg font-serif font-bold text-text-hi">Recitação (Whisper)</h3>
          <p className="text-xs text-text-lo/40">Configurações de transcrição de áudio.</p>
        </div>
        <Card className="bg-transparent border border-white/5 p-8 flex flex-col gap-4">
          <Mic size={24} className="text-accent-main" />
          <div>
            <p className="text-base font-bold text-text-hi">Motor Whisper</p>
            <p className="text-xs text-text-lo/40 mt-1">Transcrição de áudio para flashcards.</p>
          </div>
        </Card>
      </section>
    </div>
  );
}