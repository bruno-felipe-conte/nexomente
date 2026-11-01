/**
 * app/src/components/graph/CosmicGraphCanvas.jsx
 *
 * Visualizador de Grafo Cósmico em HTML5 Canvas 2D nativo de alto desempenho (estilo LearnHarness):
 * - Renderização orientada a dirty-flag (0% CPU quando ocioso via cancelamento do RAF).
 * - Suporte nativo a telas Retina / DPR (devicePixelRatio).
 * - Câmera interativa com Pan e Zoom centrado no cursor do mouse.
 * - Nuvens de agrupamento translúcidas (Cluster Hulls com matiz estável HSL via djb2).
 * - Zoom-gated labels (títulos de galáxias com zoom afastado, notas individuais com zoom aproximado).
 * - Nós estelares socráticos com halo radiante âmbar/dourado (#f59e0b).
 * - Fallback elegante de campo estelar vazio ("Nenhum nó no campo de visão estelar").
 */

import React, { useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { getClusterHue, computeClusterHull } from './clusterGeometry';
import { Sparkles } from 'lucide-react';

// Cores temáticas do NexoMente para tipos de notas
const TIPO_COLORS = {
  nota: '#B85D43',
  livro: '#5A7D68',
  ideia: '#B8832E',
  estudo: '#4A6B82',
  biblia: '#825E3B',
  diario: '#8C6D58',
  lembrete: '#A64B38',
  fantasma: '#7A7268',
};

// Gera estrelas de fundo estáticas para a atmosfera cósmica
function generateAmbientStars(count = 140) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: (Math.random() - 0.5) * 4000,
      y: (Math.random() - 0.5) * 4000,
      radius: Math.random() * 1.4 + 0.4,
      alpha: Math.random() * 0.45 + 0.15,
      hue: Math.random() > 0.8 ? (Math.random() > 0.5 ? 45 : 210) : 0,
    });
  }
  return stars;
}

const CosmicGraphCanvas = forwardRef(function CosmicGraphCanvas(
  {
    nodes = [],
    edges = [],
    onSelectNode,
    selectedNodeId,
    searchFilter = '',
    activeTag = 'todos',
    className = '',
  },
  ref
) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Câmera 2D: x e y representam deslocamento da tela, k representa escala de zoom
  const cameraRef = useRef({ x: 0, y: 0, k: 1.0 });

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      cameraRef.current.k = Math.min(3.8, cameraRef.current.k * 1.25);
      markDirty();
    },
    zoomOut: () => {
      cameraRef.current.k = Math.max(0.18, cameraRef.current.k / 1.25);
      markDirty();
    },
    reset: () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        cameraRef.current = {
          x: rect.width / 2,
          y: rect.height / 2,
          k: normalizedNodes.length > 25 ? 0.75 : 1.0,
        };
        markDirty();
      }
    },
  }));

  // Posições e velocidades físicas dos nós no espaço mundial 2D
  const layoutNodesRef = useRef(new Map());

  // Estado de interação do mouse
  const interactionRef = useRef({
    isDragging: false,
    dragMode: null, // 'pan' | 'node'
    draggedNodeId: null,
    startX: 0,
    startY: 0,
    lastMouseX: 0,
    lastMouseY: 0,
    hoveredNodeId: null,
  });

  // Flag de dirty loop: RAF roda apenas enquanto dirty=true ou durante simulação física
  const isDirtyRef = useRef(true);
  const rafIdRef = useRef(null);
  const simEnergyRef = useRef(1.0); // Energia cinética decrescente
  const ambientStarsRef = useRef(generateAmbientStars(160));

  /**
   * Marca o canvas como sujo e desperta o loop de RAF se estiver dormindo
   */
  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(renderLoop);
    }
  }, []);

  /**
   * Normaliza os nós recebidos para um formato canônico
   */
  const normalizedNodes = useMemo(() => {
    return (nodes || []).map((n) => {
      const data = n.data || n;
      const id = String(data.id || n.id);
      const label = data.label || data.titulo || 'Sem título';
      const tipo = data.tipo || 'nota';
      const tags = Array.isArray(data.tags) ? data.tags : [];
      const ghost = Boolean(data.ghost);
      const isSocratic = Boolean(
        data.isSocratic ||
        n.isSocratic ||
        tipo === 'socratic' ||
        tags.some((t) => typeof t === 'string' && /socrat/i.test(t)) ||
        /socrát|socratic/i.test(label)
      );

      // Determina o agrupamento (cluster) da nota: primeira tag ou tipo
      const cluster = tags.length > 0 ? tags[0] : tipo;

      return {
        id,
        label,
        tipo,
        tags,
        ghost,
        isSocratic,
        cluster,
        original: n,
      };
    });
  }, [nodes]);

  /**
   * Normaliza arestas recebidas
   */
  const normalizedEdges = useMemo(() => {
    return (edges || []).map((e) => {
      const data = e.data || e;
      return {
        id: data.id || `${data.source}->${data.target}`,
        source: String(data.source),
        target: String(data.target),
        tipo: data.tipo || 'normal',
      };
    });
  }, [edges]);

  /**
   * Agrupa nós por cluster para cálculo de nebulosas
   */
  const clustersMap = useMemo(() => {
    const map = new Map();
    normalizedNodes.forEach((node) => {
      const cl = node.cluster || 'Cosmos';
      if (!map.has(cl)) {
        map.set(cl, []);
      }
      map.get(cl).push(node);
    });
    return map;
  }, [normalizedNodes]);

  /**
   * Inicializa ou atualiza posições espaciais dos nós com distribuição galáctica cósmica
   */
  useEffect(() => {
    const layout = layoutNodesRef.current;
    const currentIds = new Set(normalizedNodes.map((n) => n.id));

    // Remove nós que não existem mais
    for (const [id] of layout.entries()) {
      if (!currentIds.has(id)) {
        layout.delete(id);
      }
    }

    // Calcula distribuição em espiral para os clusters
    const clusterNames = Array.from(clustersMap.keys());
    const clusterCenters = new Map();
    const totalClusters = Math.max(1, clusterNames.length);

    clusterNames.forEach((name, idx) => {
      const angle = (idx / totalClusters) * Math.PI * 2;
      const radius = totalClusters > 1 ? 260 + (idx % 2) * 80 : 0;
      clusterCenters.set(name, {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    });

    // Atribui posições iniciais aos nós não posicionados
    normalizedNodes.forEach((node, idx) => {
      if (!layout.has(node.id)) {
        const center = clusterCenters.get(node.cluster) || { x: 0, y: 0 };
        const localAngle = (idx * 137.5 * Math.PI) / 180; // Ângulo áureo
        const localDist = 40 + Math.sqrt(idx + 1) * 26;

        layout.set(node.id, {
          id: node.id,
          x: center.x + Math.cos(localAngle) * localDist,
          y: center.y + Math.sin(localAngle) * localDist,
          vx: 0,
          vy: 0,
          radius: node.isSocratic ? 14 : Math.min(18, Math.max(7, 8 + (node.tags?.length || 0) * 1.5)),
          degree: 0,
        });
      }
    });

    // Atualiza graus (grau de conexões)
    const degreeMap = new Map();
    normalizedEdges.forEach((edge) => {
      degreeMap.set(edge.source, (degreeMap.get(edge.source) || 0) + 1);
      degreeMap.set(edge.target, (degreeMap.get(edge.target) || 0) + 1);
    });

    for (const [id, item] of layout.entries()) {
      const deg = degreeMap.get(id) || 0;
      item.degree = deg;
      const node = normalizedNodes.find((n) => n.id === id);
      if (node && !node.isSocratic) {
        item.radius = Math.min(20, Math.max(7, 7 + Math.sqrt(deg) * 3));
      }
    }

    // Acorda a física por alguns frames para relaxamento suave
    simEnergyRef.current = 1.0;
    markDirty();
  }, [normalizedNodes, normalizedEdges, clustersMap, markDirty]);

  /**
   * Centraliza a câmera no início ou quando os nós mudam
   */
  useEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    cameraRef.current = {
      x: rect.width / 2,
      y: rect.height / 2,
      k: normalizedNodes.length > 25 ? 0.75 : 1.0,
    };
    markDirty();
  }, [normalizedNodes.length, markDirty]);

  /**
   * Passo da simulação física (relaxamento suave de forças que dissipa rapidamente)
   */
  const stepPhysics = useCallback(() => {
    if (simEnergyRef.current <= 0.005) {
      return false; // Estabilizado -> 0% CPU
    }

    const layout = layoutNodesRef.current;
    const items = Array.from(layout.values());
    const count = items.length;
    if (count <= 1) {
      simEnergyRef.current = 0;
      return false;
    }

    let totalMovement = 0;

    // 1. Repulsão entre nós (Coulomb leve)
    for (let i = 0; i < count; i++) {
      const a = items[i];
      for (let j = i + 1; j < count; j++) {
        const b = items[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy || 1;
        if (distSq < 45000) {
          const dist = Math.sqrt(distSq);
          const force = (180 / (distSq + 200)) * simEnergyRef.current;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }
    }

    // 2. Atração por arestas (Molas)
    normalizedEdges.forEach((edge) => {
      const a = layout.get(edge.source);
      const b = layout.get(edge.target);
      if (a && b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const targetLen = 85;
        const force = (dist - targetLen) * 0.035 * simEnergyRef.current;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    });

    // 3. Gravidade central em direção a (0, 0)
    for (let i = 0; i < count; i++) {
      const a = items[i];
      // Ignora nó sendo ativamente arrastado
      if (interactionRef.current.isDragging && interactionRef.current.draggedNodeId === a.id) {
        continue;
      }
      const distCenter = Math.hypot(a.x, a.y) || 1;
      a.vx -= (a.x / distCenter) * 0.12 * simEnergyRef.current;
      a.vy -= (a.y / distCenter) * 0.12 * simEnergyRef.current;

      // Amortecimento
      a.vx *= 0.82;
      a.vy *= 0.82;

      a.x += a.vx;
      a.y += a.vy;

      totalMovement += Math.abs(a.vx) + Math.abs(a.vy);
    }

    // Decaimento de energia exponencial
    simEnergyRef.current *= 0.94;
    if (totalMovement < 0.05 || simEnergyRef.current < 0.005) {
      simEnergyRef.current = 0;
      return false;
    }

    return true;
  }, [normalizedEdges]);

  /**
   * Renderização principal no Canvas 2D
   */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Executa física
    const isSimulating = stepPhysics();

    ctx.save();
    // Limpeza com fundo cósmico profundo
    ctx.fillStyle = '#0c0e14';
    ctx.fillRect(0, 0, width, height);

    // Efeito de vinheta radial estelar
    const bgGrad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.1,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.8
    );
    bgGrad.addColorStop(0, 'rgba(23, 27, 38, 0.85)');
    bgGrad.addColorStop(0.65, 'rgba(12, 14, 20, 0.95)');
    bgGrad.addColorStop(1, '#08090d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Caso de Fallback Estelar Vazio
    if (normalizedNodes.length === 0) {
      // Estrelas ambientais estáticas
      ambientStarsRef.current.forEach((s) => {
        const sx = ((s.x % width) + width) % width;
        const sy = ((s.y % height) + height) % height;
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Mensagem canônica de estado vazio
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
      ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Nenhum nó no campo de visão estelar', width / 2, height / 2 - 12);

      ctx.fillStyle = 'rgba(160, 165, 180, 0.7)';
      ctx.font = '12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(
        'Crie notas no Vault ou conecte conceitos usando [[WikiLinks]] para expandir seu cosmos',
        width / 2,
        height / 2 + 16
      );

      ctx.restore();
      isDirtyRef.current = false;
      return;
    }

    const { x: camX, y: camY, k } = cameraRef.current;

    // Transforma para coordenadas de mundo
    ctx.translate(camX, camY);
    ctx.scale(k, k);

    // 1. Estrelas de fundo com paralaxe suave
    ambientStarsRef.current.forEach((s) => {
      ctx.fillStyle =
        s.hue === 45
          ? `rgba(251, 191, 36, ${s.alpha * 0.6})`
          : s.hue === 210
          ? `rgba(147, 197, 253, ${s.alpha * 0.6})`
          : `rgba(255, 255, 255, ${s.alpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius / Math.max(0.6, k * 0.5), 0, Math.PI * 2);
      ctx.fill();
    });

    const layout = layoutNodesRef.current;
    const hoveredId = interactionRef.current.hoveredNodeId;
    const selectedId = selectedNodeId ? String(selectedNodeId) : null;

    // Calcula nós vizinhos do hovered ou selected para dimming inteligente
    const activeFocusId = hoveredId || selectedId;
    const connectedNodeIds = new Set();
    if (activeFocusId) {
      connectedNodeIds.add(activeFocusId);
      normalizedEdges.forEach((e) => {
        if (e.source === activeFocusId) connectedNodeIds.add(e.target);
        if (e.target === activeFocusId) connectedNodeIds.add(e.source);
      });
    }

    // 2. Nuvens de Agrupamento Orgânicas (Cluster Hulls com matiz HSL determinístico)
    for (const [clusterName, clNodes] of clustersMap.entries()) {
      if (clNodes.length === 0) continue;

      const points = [];
      let centroidX = 0;
      let centroidY = 0;

      clNodes.forEach((n) => {
        const pos = layout.get(n.id);
        if (pos) {
          points.push({ x: pos.x, y: pos.y });
          centroidX += pos.x;
          centroidY += pos.y;
        }
      });

      if (points.length === 0) continue;
      centroidX /= points.length;
      centroidY /= points.length;

      const hue = getClusterHue(clusterName);
      const isClusterFiltered = activeTag !== 'todos' && clusterName !== activeTag;
      const baseAlpha = isClusterFiltered ? 0.03 : 0.12;
      const borderAlpha = isClusterFiltered ? 0.1 : 0.35;

      const hull = computeClusterHull(points, 38);

      if (hull.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(hull[0].x, hull[0].y);
        for (let i = 1; i < hull.length; i++) {
          ctx.lineTo(hull[i].x, hull[i].y);
        }
        ctx.closePath();

        ctx.fillStyle = `hsla(${hue}, 70%, 55%, ${baseAlpha})`;
        ctx.fill();
        ctx.strokeStyle = `hsla(${hue}, 75%, 65%, ${borderAlpha})`;
        ctx.lineWidth = 1.4 / k;
        ctx.stroke();
      }

      // Rótulos de Galáxia / Cluster (Zoom-Gated: visíveis com zoom afastado k < 1.0)
      const galaxyOpacity = Math.max(0, Math.min(1, (1.2 - k) / 0.6));
      if (galaxyOpacity > 0.05 && !isClusterFiltered) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${Math.max(12, 16 / Math.sqrt(k))}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = `hsla(${hue}, 85%, 78%, ${galaxyOpacity * 0.9})`;
        ctx.shadowColor = `hsla(${hue}, 90%, 50%, 0.8)`;
        ctx.shadowBlur = 8;
        ctx.fillText(clusterName.toUpperCase(), centroidX, centroidY);
        ctx.restore();
      }
    }

    // 3. Arestas (Sinapses Cósmicas)
    normalizedEdges.forEach((edge) => {
      const a = layout.get(edge.source);
      const b = layout.get(edge.target);
      if (!a || !b) return;

      const isConnected =
        !activeFocusId ||
        (connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target));

      const isDimmed = activeFocusId && !isConnected;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);

      if (edge.tipo === 'wikilink') {
        ctx.strokeStyle = isDimmed
          ? 'rgba(184, 93, 67, 0.08)'
          : isConnected && activeFocusId
          ? 'rgba(245, 158, 11, 0.85)'
          : 'rgba(184, 93, 67, 0.45)';
        ctx.lineWidth = (isConnected && activeFocusId ? 2.0 : 1.2) / k;
      } else {
        ctx.strokeStyle = isDimmed
          ? 'rgba(150, 160, 180, 0.05)'
          : isConnected && activeFocusId
          ? 'rgba(180, 200, 240, 0.7)'
          : 'rgba(150, 160, 180, 0.22)';
        ctx.lineWidth = (isConnected && activeFocusId ? 1.4 : 0.8) / k;
      }
      ctx.stroke();
    });

    // 4. Rótulos de Nós Individuais (Zoom-Gated: visíveis com zoom aproximado k >= 0.75)
    const noteOpacity = Math.max(0, Math.min(1, (k - 0.7) / 0.5));
    const showNoteLabels = k >= 0.75 && noteOpacity > 0.05;

    // 5. Nós (Corpos Celestes e Estrelas Socráticas)
    normalizedNodes.forEach((node) => {
      const pos = layout.get(node.id);
      if (!pos) return;

      const isHovered = hoveredId === node.id;
      const isSelected = selectedId === node.id;
      const isFocused = !activeFocusId || connectedNodeIds.has(node.id);
      const isMatchingSearch =
        Boolean(searchFilter.trim()) &&
        node.label.toLowerCase().includes(searchFilter.toLowerCase().trim());

      const r = pos.radius;
      const alpha = isFocused ? 1.0 : 0.18;

      if (node.isSocratic) {
        // NÓ SOCRÁTICO DOURADO: Estrela radiante com halo âmbar (#f59e0b)
        // 1. Halo âmbar difuso
        const glowGrad = ctx.createRadialGradient(pos.x, pos.y, 1, pos.x, pos.y, r * 2.8);
        glowGrad.addColorStop(0, `rgba(245, 158, 11, ${0.75 * alpha})`);
        glowGrad.addColorStop(0.5, `rgba(251, 191, 36, ${0.35 * alpha})`);
        glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r * 2.8, 0, Math.PI * 2);
        ctx.fill();

        // 2. Estrela de 4 pontas afiada
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.fillStyle = isSelected ? '#ffffff' : `rgba(251, 191, 36, ${alpha})`;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.6 / k;

        const starR = r * 1.35;
        const innerR = starR * 0.32;
        ctx.beginPath();
        for (let s = 0; s < 8; s++) {
          const currentRadius = s % 2 === 0 ? starR : innerR;
          const a = (s * Math.PI) / 4;
          const px = Math.cos(a) * currentRadius;
          const py = Math.sin(a) * currentRadius;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Núcleo branco reluzente
        ctx.fillStyle = '#fffdf0';
        ctx.beginPath();
        ctx.arc(0, 0, innerR * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (node.ghost) {
        // Nó Fantasma (WikiLink não materializado)
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(90, 85, 78, ${0.35 * alpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(180, 170, 155, ${0.7 * alpha})`;
        ctx.lineWidth = 1.4 / k;
        ctx.setLineDash([3 / k, 3 / k]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Nó Regular Cósmico
        const color = TIPO_COLORS[node.tipo] || `hsl(${getClusterHue(node.cluster)}, 65%, 55%)`;

        // Brilho exterior suave
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + (isHovered || isSelected ? 4 : 2), 0, Math.PI * 2);
        ctx.fillStyle = isSelected
          ? 'rgba(184, 93, 67, 0.45)'
          : isHovered
          ? 'rgba(255, 255, 255, 0.25)'
          : 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        // Corpo do nó
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Anel de seleção ou destaque de busca
        if (isSelected || isMatchingSearch) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, r + 4 / k, 0, Math.PI * 2);
          ctx.strokeStyle = isMatchingSearch ? '#38bdf8' : '#f59e0b';
          ctx.lineWidth = 2.4 / k;
          ctx.stroke();
        }
      }

      // Rótulo da nota individual
      if ((showNoteLabels || isHovered || isSelected || isMatchingSearch) && isFocused) {
        const effectiveOpacity = isHovered || isSelected ? 1.0 : noteOpacity;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = `${isHovered || isSelected ? 'bold' : '600'} ${11 / Math.sqrt(Math.max(0.7, k))}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = isHovered || isSelected
          ? '#ffffff'
          : `rgba(235, 230, 225, ${effectiveOpacity * 0.92})`;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 4;
        ctx.fillText(node.label, pos.x, pos.y + r + 4 / k);
        ctx.restore();
      }
    });

    ctx.restore();

    // Se continuar simulando ou animando, requisita próximo frame; senão, dorme (0% CPU)
    if (isSimulating) {
      rafIdRef.current = requestAnimationFrame(renderLoop);
    } else {
      isDirtyRef.current = false;
      rafIdRef.current = null;
    }
  }, [
    stepPhysics,
    normalizedNodes,
    normalizedEdges,
    clustersMap,
    selectedNodeId,
    searchFilter,
    activeTag,
  ]);

  /**
   * Função executada pelo RAF
   */
  const renderLoop = useCallback(() => {
    rafIdRef.current = null;
    if (isDirtyRef.current || simEnergyRef.current > 0.005) {
      render();
    }
  }, [render]);

  /**
   * Redimensionamento com DPR/Retina e sincronização de tamanho
   */
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      markDirty();
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [markDirty]);

  /**
   * Converte coordenadas de tela para espaço do mundo do grafo
   */
  const screenToWorld = useCallback((screenX, screenY) => {
    const { x: camX, y: camY, k } = cameraRef.current;
    return {
      x: (screenX - camX) / k,
      y: (screenY - camY) / k,
    };
  }, []);

  /**
   * Encontra nó sob a coordenada de tela
   */
  const findNodeAt = useCallback(
    (screenX, screenY) => {
      const world = screenToWorld(screenX, screenY);
      const layout = layoutNodesRef.current;
      const k = cameraRef.current.k;

      for (let i = normalizedNodes.length - 1; i >= 0; i--) {
        const node = normalizedNodes[i];
        const pos = layout.get(node.id);
        if (pos) {
          const hitRadius = Math.max(12, pos.radius + 6 / k);
          const dist = Math.hypot(pos.x - world.x, pos.y - world.y);
          if (dist <= hitRadius) {
            return node;
          }
        }
      }
      return null;
    },
    [screenToWorld, normalizedNodes]
  );

  /**
   * Eventos de Mouse e Câmera
   */
  const handleMouseDown = useCallback(
    (e) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const hitNode = findNodeAt(mouseX, mouseY);
      const interaction = interactionRef.current;

      interaction.startX = mouseX;
      interaction.startY = mouseY;
      interaction.lastMouseX = mouseX;
      interaction.lastMouseY = mouseY;
      interaction.isDragging = true;

      if (hitNode) {
        interaction.dragMode = 'node';
        interaction.draggedNodeId = hitNode.id;
      } else {
        interaction.dragMode = 'pan';
        interaction.draggedNodeId = null;
      }
    },
    [findNodeAt]
  );

  const handleMouseMove = useCallback(
    (e) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const interaction = interactionRef.current;
      const dx = mouseX - interaction.lastMouseX;
      const dy = mouseY - interaction.lastMouseY;

      interaction.lastMouseX = mouseX;
      interaction.lastMouseY = mouseY;

      if (interaction.isDragging) {
        if (interaction.dragMode === 'pan') {
          // Pan na câmera
          cameraRef.current.x += dx;
          cameraRef.current.y += dy;
          markDirty();
        } else if (interaction.dragMode === 'node' && interaction.draggedNodeId) {
          // Arrasto físico de um nó
          const pos = layoutNodesRef.current.get(interaction.draggedNodeId);
          if (pos) {
            pos.x += dx / cameraRef.current.k;
            pos.y += dy / cameraRef.current.k;
            pos.vx = 0;
            pos.vy = 0;
            simEnergyRef.current = Math.max(simEnergyRef.current, 0.4);
            markDirty();
          }
        }
      } else {
        // Hover sobre nó
        const hitNode = findNodeAt(mouseX, mouseY);
        const newHoveredId = hitNode ? hitNode.id : null;
        if (newHoveredId !== interaction.hoveredNodeId) {
          interaction.hoveredNodeId = newHoveredId;
          if (canvasRef.current) {
            canvasRef.current.style.cursor = hitNode ? 'pointer' : 'default';
          }
          markDirty();
        }
      }
    },
    [findNodeAt, markDirty]
  );

  const handleMouseUp = useCallback(
    (e) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      const interaction = interactionRef.current;

      if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const distDragged = Math.hypot(mouseX - interaction.startX, mouseY - interaction.startY);

        // Se moveu menos que 4 pixels, considera clique
        if (distDragged < 4) {
          const hitNode = findNodeAt(mouseX, mouseY);
          if (hitNode) {
            if (onSelectNode) {
              onSelectNode(hitNode.original || hitNode);
            }
          } else {
            if (onSelectNode) {
              onSelectNode(null);
            }
          }
        }
      }

      interaction.isDragging = false;
      interaction.dragMode = null;
      interaction.draggedNodeId = null;
    },
    [findNodeAt, onSelectNode]
  );

  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const cam = cameraRef.current;
      const worldBefore = {
        x: (mouseX - cam.x) / cam.k,
        y: (mouseY - cam.y) / cam.k,
      };

      const zoomFactor = Math.exp(-e.deltaY * 0.0018);
      const nextK = Math.max(0.18, Math.min(3.8, cam.k * zoomFactor));

      cam.x = mouseX - worldBefore.x * nextK;
      cam.y = mouseY - worldBefore.y * nextK;
      cam.k = nextK;

      markDirty();
    },
    [markDirty]
  );

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex-1 overflow-hidden select-none bg-[#0c0e14] ${className}`}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full block cursor-default"
      />
      {normalizedNodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-[#171b26]/90 border border-amber-500/30 flex items-center justify-center mb-3 text-amber-400">
            <Sparkles size={24} />
          </div>
          <h3 className="text-sm font-bold text-amber-400 mb-1 font-display">
            Nenhum nó no campo de visão estelar
          </h3>
          <p className="text-xs text-nx-dim max-w-sm">
            Crie notas no Vault ou conecte conceitos usando [[WikiLinks]] para expandir seu cosmos.
          </p>
        </div>
      )}
    </div>
  );
});

export default CosmicGraphCanvas;
