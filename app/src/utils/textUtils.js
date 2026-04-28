/**
 * textUtils.js
 * Utilitários para comparação de texto e análise de recitação
 */

/**
 * Normaliza uma string para comparação (remove acentos, pontuação e converte para lowercase)
 */
export const normalizeText = (text) => {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^\w\s]/gi, '') // Remove pontuação
        .trim();
};

/**
 * Compara duas frases e retorna um breakdown por palavra
 */
export const compareVerses = (original, recited) => {
    const originalWords = original.split(/\s+/);
    const recitedWords = normalizeText(recited).split(/\s+/);
    
    let matches = 0;
    const breakdown = originalWords.map(word => {
        const normalizedOriginal = normalizeText(word);
        const isCorrect = recitedWords.includes(normalizedOriginal);
        if (isCorrect) matches++;
        
        return {
            word,
            isCorrect
        };
    });
    
    const accuracy = (matches / originalWords.length) * 100;
    
    return {
        breakdown,
        accuracy,
        isPassed: accuracy >= 70
    };
};
