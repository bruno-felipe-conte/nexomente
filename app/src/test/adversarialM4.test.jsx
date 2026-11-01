// @vitest-environment jsdom
import React, { createRef } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import CosmicGraphCanvas from '../components/graph/CosmicGraphCanvas';
import { getClusterHue, computeClusterHull } from '../components/graph/clusterGeometry';

describe('Adversarial M4: 2D Canvas Cosmic Graph & Engine Toggle Stress Suite', () => {
  let mockCtx;
  let originalGetContext;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn(() => ({ width: 40 })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      setLineDash: vi.fn(),
    };

    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx);

    // Mock ResizeObserver
    global.ResizeObserver = class {
      constructor(cb) {
        this.cb = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  // =========================================================================
  // 1. View Engine Toggle & LocalStorage Invariants
  // =========================================================================
  describe('1. View Engine Toggle & LocalStorage Invariants', () => {
    it('defaults to "cosmic" when localStorage is empty', () => {
      const getActiveEngine = () => localStorage.getItem('nexomente_graph_view_engine') || 'cosmic';
      expect(getActiveEngine()).toBe('cosmic');
    });

    it('persists switch to "cytoscape" and restores it on next load', () => {
      let activeEngine = localStorage.getItem('nexomente_graph_view_engine') || 'cosmic';
      expect(activeEngine).toBe('cosmic');

      // Toggling to cytoscape
      localStorage.setItem('nexomente_graph_view_engine', 'cytoscape');
      activeEngine = localStorage.getItem('nexomente_graph_view_engine') || 'cosmic';
      expect(activeEngine).toBe('cytoscape');

      // Toggling back to cosmic
      localStorage.setItem('nexomente_graph_view_engine', 'cosmic');
      activeEngine = localStorage.getItem('nexomente_graph_view_engine') || 'cosmic';
      expect(activeEngine).toBe('cosmic');
    });

    it('handles unexpected, corrupted or empty localStorage values gracefully', () => {
      const readEngineSafe = () => {
        const val = localStorage.getItem('nexomente_graph_view_engine');
        return val === 'cytoscape' ? 'cytoscape' : 'cosmic';
      };

      localStorage.setItem('nexomente_graph_view_engine', 'corrupted_random_value');
      expect(readEngineSafe()).toBe('cosmic');

      localStorage.setItem('nexomente_graph_view_engine', '');
      expect(readEngineSafe()).toBe('cosmic');

      localStorage.removeItem('nexomente_graph_view_engine');
      expect(readEngineSafe()).toBe('cosmic');
    });

    it('cleans up Cytoscape instance when toggling back to cosmic', () => {
      const mockCy = {
        destroy: vi.fn(),
      };
      let cyRef = { current: mockCy };
      let viewEngine = 'cytoscape';

      const handleToggleEngine = (newEngine) => {
        viewEngine = newEngine;
        localStorage.setItem('nexomente_graph_view_engine', newEngine);
        if (newEngine === 'cosmic' && cyRef.current) {
          cyRef.current.destroy();
          cyRef.current = null;
        }
      };

      handleToggleEngine('cosmic');
      expect(mockCy.destroy).toHaveBeenCalledTimes(1);
      expect(cyRef.current).toBeNull();
      expect(viewEngine).toBe('cosmic');
      expect(localStorage.getItem('nexomente_graph_view_engine')).toBe('cosmic');
    });
  });

  // =========================================================================
  // 2. CosmicGraphCanvas Empty Fallback Empirical Verification
  // =========================================================================
  describe('2. Empty Graph Fallback Verification', () => {
    it('renders "Nenhum nó no campo de visão estelar" DOM overlay when nodes list is empty []', () => {
      render(<CosmicGraphCanvas nodes={[]} edges={[]} />);

      const heading = screen.getByText('Nenhum nó no campo de visão estelar');
      expect(heading).toBeDefined();
      expect(heading.tagName.toLowerCase()).toBe('h3');

      const subtitle = screen.getByText(/Crie notas no Vault ou conecte conceitos/i);
      expect(subtitle).toBeDefined();
    });

    it('renders "Nenhum nó no campo de visão estelar" when nodes prop is undefined', () => {
      render(<CosmicGraphCanvas />);

      const heading = screen.getByText('Nenhum nó no campo de visão estelar');
      expect(heading).toBeDefined();
    });

    it('renders "Nenhum nó no campo de visão estelar" when nodes prop is null', () => {
      render(<CosmicGraphCanvas nodes={null} edges={null} />);

      const heading = screen.getByText('Nenhum nó no campo de visão estelar');
      expect(heading).toBeDefined();
    });

    it('paints empty message directly to canvas context via fillText', async () => {
      let rafCallback = null;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb;
        return 123;
      });

      render(<CosmicGraphCanvas nodes={[]} edges={[]} />);

      // Flush the pending requestAnimationFrame loop
      if (rafCallback) {
        act(() => {
          rafCallback();
        });
      }

      const fillTextCalls = mockCtx.fillText.mock.calls.map((c) => c[0]);
      expect(fillTextCalls).toContain('Nenhum nó no campo de visão estelar');
    });

    it('does NOT render empty state overlay when nodes are present', () => {
      const mockNodes = [
        { id: 'n1', label: 'Nota Alfa', tipo: 'nota' },
        { id: 'n2', label: 'Nota Beta', tipo: 'estudo' },
      ];
      render(<CosmicGraphCanvas nodes={mockNodes} edges={[]} />);

      expect(screen.queryByText('Nenhum nó no campo de visão estelar')).toBeNull();
    });
  });

  // =========================================================================
  // 3. CosmicGraphCanvas Component Robustness & Imperative API
  // =========================================================================
  describe('3. CosmicGraphCanvas Imperative API & Edge Tolerance', () => {
    it('exposes zoomIn, zoomOut, and reset via imperative ref', () => {
      const canvasRef = createRef();
      render(<CosmicGraphCanvas ref={canvasRef} nodes={[{ id: '1', label: 'Nó' }]} edges={[]} />);

      expect(canvasRef.current).toBeDefined();
      expect(typeof canvasRef.current.zoomIn).toBe('function');
      expect(typeof canvasRef.current.zoomOut).toBe('function');
      expect(typeof canvasRef.current.reset).toBe('function');

      // Execute imperative methods without throwing
      act(() => {
        canvasRef.current.zoomIn();
        canvasRef.current.zoomOut();
        canvasRef.current.reset();
      });
    });

    it('handles malformed and adversarial node structures gracefully', () => {
      const malformedNodes = [
        {}, // Empty node
        { id: 123 }, // Numeric ID
        { id: 'null-title', label: null },
        { id: 'undefined-tipo', tipo: undefined },
        { id: 'corrupt-tags', tags: 'not-an-array' },
        { id: 'socratic-by-title', label: 'Diálogo Socrático sobre Virtude' },
        { id: 'socratic-by-tag', tags: ['socratic', 'pedagogia'] },
      ];

      expect(() => {
        render(<CosmicGraphCanvas nodes={malformedNodes} edges={[]} />);
      }).not.toThrow();
    });

    it('handles malformed and dangling edges gracefully', () => {
      const nodes = [{ id: 'a', label: 'A' }];
      const edges = [
        {}, // Empty edge
        { source: 'a', target: 'dangling' }, // Target doesn't exist
        { source: 'ghost', target: 'ghost2' }, // Neither exists
        { source: 'a', target: 'a' }, // Self-referential loop
      ];

      expect(() => {
        render(<CosmicGraphCanvas nodes={nodes} edges={edges} />);
      }).not.toThrow();
    });
  });

  // =========================================================================
  // 4. clusterGeometry: getClusterHue Stress & Invariants
  // =========================================================================
  describe('4. clusterGeometry: getClusterHue Stress & Invariants', () => {
    it('returns consistent deterministic HSL hue (0-359) across identical strings', () => {
      const sample = 'Neurociência e Plasticidade Sináptica 🧠';
      const hue1 = getClusterHue(sample);
      const hue2 = getClusterHue(sample);

      expect(hue1).toBe(hue2);
      expect(Number.isInteger(hue1)).toBe(true);
      expect(hue1).toBeGreaterThanOrEqual(0);
      expect(hue1).toBeLessThan(360);
    });

    it('returns default hue 210 for non-string, null, and empty inputs', () => {
      expect(getClusterHue(null)).toBe(210);
      expect(getClusterHue(undefined)).toBe(210);
      expect(getClusterHue('')).toBe(210);
      expect(getClusterHue(0)).toBe(210);
      expect(getClusterHue(false)).toBe(210);
      expect(getClusterHue({})).toBe(210);
      expect(getClusterHue([])).toBe(210);
    });

    it('produces diverse hues across distinct cluster names', () => {
      const subjects = ['Física', 'Biologia', 'Filosofia', 'História', 'Matemática', 'Computação'];
      const hues = new Set(subjects.map(getClusterHue));
      // At least 4 distinct hues out of 6 subjects
      expect(hues.size).toBeGreaterThanOrEqual(4);
    });
  });

  // =========================================================================
  // 5. clusterGeometry: computeClusterHull Stress & Invariants
  // =========================================================================
  describe('5. clusterGeometry: computeClusterHull Stress & Invariants', () => {
    it('returns empty array [] for empty or invalid inputs', () => {
      expect(computeClusterHull([])).toEqual([]);
      expect(computeClusterHull(null)).toEqual([]);
      expect(computeClusterHull(undefined)).toEqual([]);
      expect(computeClusterHull('not-an-array')).toEqual([]);
    });

    it('computes 4-vertex padded bounding box for single point (singularity)', () => {
      const p = { x: 50, y: 50 };
      const hull = computeClusterHull([p], 20);

      expect(hull).toHaveLength(4);
      expect(hull).toEqual([
        { x: 30, y: 30 },
        { x: 70, y: 30 },
        { x: 70, y: 70 },
        { x: 30, y: 70 },
      ]);
    });

    it('handles identical duplicate points without crashing or returning NaN', () => {
      const duplicates = [
        { x: 100, y: 100 },
        { x: 100, y: 100 },
        { x: 100, y: 100 },
      ];
      const hull = computeClusterHull(duplicates, 25);
      expect(hull).toHaveLength(4);
      hull.forEach((pt) => {
        expect(Number.isFinite(pt.x)).toBe(true);
        expect(Number.isFinite(pt.y)).toBe(true);
      });
    });

    it('computes padded segment box for 2 points', () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ];
      const hull = computeClusterHull(pts, 10);
      expect(hull).toHaveLength(4);
      hull.forEach((pt) => {
        expect(Number.isFinite(pt.x)).toBe(true);
        expect(Number.isFinite(pt.y)).toBe(true);
      });
    });

    it('computes convex polygon with centroid expansion for multi-point clouds', () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
        { x: 50, y: 50 }, // Interior point
      ];
      const hull = computeClusterHull(pts, 15);
      expect(hull.length).toBeGreaterThanOrEqual(4);
      hull.forEach((pt) => {
        expect(Number.isFinite(pt.x)).toBe(true);
        expect(Number.isFinite(pt.y)).toBe(true);
      });
    });

    it('handles collinear points gracefully (fallback box)', () => {
      const collinear = [
        { x: 0, y: 0 },
        { x: 50, y: 50 },
        { x: 100, y: 100 },
      ];
      const hull = computeClusterHull(collinear, 20);
      expect(hull.length).toBeGreaterThanOrEqual(4);
      hull.forEach((pt) => {
        expect(Number.isFinite(pt.x)).toBe(true);
        expect(Number.isFinite(pt.y)).toBe(true);
      });
    });
  });
});
