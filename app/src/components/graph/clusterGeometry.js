/**
 * app/src/components/graph/clusterGeometry.js
 *
 * Algoritmos geométricos e determinísticos de cor para o Grafo Cósmico (LearnHarness):
 * 1. getClusterHue: Hash determinístico djb2 mapeado para o espectro de matizes HSL (0-359).
 * 2. computeClusterHull: Cálculo de envoltória convexa / bounding hull para nuvens estelares de nós.
 */

/**
 * Retorna um matiz HSL determinístico (0-359) para o nome de um cluster, matéria ou tag.
 * Utiliza o algoritmo de hashing djb2 para distribuição uniforme e estabilidade entre sessões.
 *
 * @param {string} str - Nome do agrupamento (ex: 'Biologia', 'Física', 'Química Orgânica 🧪')
 * @returns {number} Inteiro entre 0 e 359 representando o matiz HSL.
 */
export function getClusterHue(str) {
  if (!str || typeof str !== 'string') {
    return 210; // Matiz neutro azul-cósmico padrão
  }

  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }

  return Math.abs(hash) % 360;
}

/**
 * Produto vetorial 2D (Cross Product) para determinar orientação de curva.
 * > 0: Curva no sentido anti-horário
 * <= 0: Curva no sentido horário ou colinear
 */
function crossProduct(o, a, b) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/**
 * Calcula o polígono envolvente (Convex Hull com padding radial) para uma nuvem de pontos 2D.
 * Implementa o algoritmo de Andrew (Monotone Chain) com expansão radial por centróide.
 *
 * @param {Array<{ x: number, y: number }>} points - Lista de coordenadas no espaço mundial.
 * @param {number} [padding=32] - Expansão radial em pixels para suavidade da nebulosa.
 * @returns {Array<{ x: number, y: number }>} Vértices do polígono envolvente.
 */
export function computeClusterHull(points, padding = 32) {
  if (!points || !Array.isArray(points) || points.length === 0) {
    return [];
  }

  // Caso 1: Ponto único (Singularidade cósmica) -> Retorna caixa delimitadora com padding
  if (points.length === 1) {
    const p = points[0];
    return [
      { x: p.x - padding, y: p.y - padding },
      { x: p.x + padding, y: p.y - padding },
      { x: p.x + padding, y: p.y + padding },
      { x: p.x - padding, y: p.y + padding },
    ];
  }

  // Ordenação por x e depois por y
  const sorted = [...points].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

  // Remoção de nós coincidentes (mesma coordenada)
  const unique = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (Math.abs(curr.x - prev.x) > 0.001 || Math.abs(curr.y - prev.y) > 0.001) {
      unique.push(curr);
    }
  }

  // Se todos os nós eram coincidentes
  if (unique.length === 1) {
    const p = unique[0];
    return [
      { x: p.x - padding, y: p.y - padding },
      { x: p.x + padding, y: p.y - padding },
      { x: p.x + padding, y: p.y + padding },
      { x: p.x - padding, y: p.y + padding },
    ];
  }

  // Caso 2: Dois pontos distintos -> Expande o segmento de reta em um retângulo acolchoado
  if (unique.length === 2) {
    const [p1, p2] = unique;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * padding;
    const ny = (dx / len) * padding;
    const px = (dx / len) * padding;
    const py = (dy / len) * padding;

    return [
      { x: p1.x - px + nx, y: p1.y - py + ny },
      { x: p2.x + px + nx, y: p2.y + py + ny },
      { x: p2.x + px - nx, y: p2.y + py - ny },
      { x: p1.x - px - nx, y: p1.y - py - ny },
    ];
  }

  // Caso 3: Três ou mais pontos -> Monotone Chain (Andrew's Algorithm)
  const lower = [];
  for (const p of unique) {
    while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper = [];
  for (let i = unique.length - 1; i >= 0; i--) {
    const p = unique[i];
    while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  // Remove o último elemento de cada lista pois é duplicado nas extremidades
  lower.pop();
  upper.pop();
  const hull = lower.concat(upper);

  // Fallback se todos os pontos forem colineares
  if (hull.length < 3) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return [
      { x: minX - padding, y: minY - padding },
      { x: maxX + padding, y: minY - padding },
      { x: maxX + padding, y: maxY + padding },
      { x: minX - padding, y: maxY + padding },
    ];
  }

  // Cálculo do centróide geométrico da envoltória
  let cx = 0;
  let cy = 0;
  for (const p of hull) {
    cx += p.x;
    cy += p.y;
  }
  cx /= hull.length;
  cy /= hull.length;

  // Expansão radial orgânica dos vértices a partir do centróide
  return hull.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    return {
      x: p.x + (dx / dist) * padding,
      y: p.y + (dy / dist) * padding,
    };
  });
}
