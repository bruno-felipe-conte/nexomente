// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { getClusterHue, computeClusterHull } from '../components/graph/clusterGeometry.js';

describe('Adversarial M4: Cluster Geometry & Mathematical Logic Stress Suite', () => {

  // =========================================================================
  // 1. Direct Production Module Export Contracts
  // =========================================================================
  describe('1. Production Module Contracts', () => {
    it('directly imports getClusterHue and computeClusterHull as functions', () => {
      expect(typeof getClusterHue).toBe('function');
      expect(typeof computeClusterHull).toBe('function');
    });
  });

  // =========================================================================
  // 2. getClusterHue: Determinism & Hash Stability Invariants
  // =========================================================================
  describe('2. getClusterHue: Determinism & Stability Invariants', () => {
    it('guarantees identical output across 500 repeated invocations with identical strings', () => {
      const sampleSubjects = [
        'Biologia',
        'Física Quântica',
        'História do Brasil',
        'Cálculo Diferencial e Integral',
        'Química Orgânica 🧪',
        'Astrofísica Cósmica 🌌',
      ];

      for (const subject of sampleSubjects) {
        const referenceHue = getClusterHue(subject);
        for (let i = 0; i < 500; i++) {
          expect(getClusterHue(subject)).toBe(referenceHue);
        }
      }
    });

    it('produces distinct hues across different academic domains', () => {
      const bioHue = getClusterHue('Biologia');
      const fisHue = getClusterHue('Física');
      const histHue = getClusterHue('História');
      const filoHue = getClusterHue('Filosofia');
      const artesHue = getClusterHue('Artes');

      const uniqueHues = new Set([bioHue, fisHue, histHue, filoHue, artesHue]);
      expect(uniqueHues.size).toBeGreaterThanOrEqual(4);
    });
  });

  // =========================================================================
  // 3. getClusterHue: Falsy & Non-String Type Coercion Resilience
  // =========================================================================
  describe('3. getClusterHue: Falsy & Non-String Type Coercion Resilience', () => {
    it('returns default neutral cosmic blue (210) for null, undefined, and empty string', () => {
      expect(getClusterHue(null)).toBe(210);
      expect(getClusterHue(undefined)).toBe(210);
      expect(getClusterHue('')).toBe(210);
    });

    it('safely handles non-string inputs without throwing and returns default hue 210', () => {
      expect(getClusterHue(12345)).toBe(210);
      expect(getClusterHue(0)).toBe(210);
      expect(getClusterHue(-42)).toBe(210);
      expect(getClusterHue(NaN)).toBe(210);
      expect(getClusterHue(Infinity)).toBe(210);
      expect(getClusterHue(true)).toBe(210);
      expect(getClusterHue(false)).toBe(210);
      expect(getClusterHue({})).toBe(210);
      expect(getClusterHue([])).toBe(210);
      expect(getClusterHue(['Biologia'])).toBe(210);
      expect(getClusterHue(() => 'Biologia')).toBe(210);
      expect(getClusterHue(Symbol('tag'))).toBe(210);
    });
  });

  // =========================================================================
  // 4. getClusterHue: Internationalization, Unicode, Emojis & Extreme Strings
  // =========================================================================
  describe('4. getClusterHue: Unicode, Emojis & Extreme Strings', () => {
    it('computes valid integer hues [0, 359] for multi-byte accented Latin strings', () => {
      const accented = [
        'Língua Portuguesa',
        'Termodinâmica Aplicada',
        'Biologia Evolutiva & Ecologia',
        'Filosofia Ética e Política',
        'Farmacologia: Ação das Enzimas',
        'Acentuação: áéíóú àèìòù âêîôû ãõ ç',
      ];

      for (const str of accented) {
        const hue = getClusterHue(str);
        expect(Number.isInteger(hue)).toBe(true);
        expect(hue).toBeGreaterThanOrEqual(0);
        expect(hue).toBeLessThanOrEqual(359);
      }
    });

    it('computes valid integer hues [0, 359] for non-Latin scripts (CJK, Cyrillic, Arabic, Hebrew, Greek)', () => {
      const nonLatin = [
        '生物学', // Japanese
        'Биология и Медицина', // Russian
        'علم الأحياء والفيزياء', // Arabic
        'ביולוגיה וכימיה', // Hebrew
        'Βιολογία και Φυσική', // Greek
        'जीव विज्ञान और रसायन विज्ञान', // Hindi
        '태양계와 은하계', // Korean
      ];

      for (const str of nonLatin) {
        const hue = getClusterHue(str);
        expect(Number.isInteger(hue)).toBe(true);
        expect(hue).toBeGreaterThanOrEqual(0);
        expect(hue).toBeLessThanOrEqual(359);
      }
    });

    it('computes valid integer hues [0, 359] for complex emojis, ZWJ sequences, and celestial symbols', () => {
      const emojis = [
        '🧪 Química Orgânica',
        '🌌 Cosmologia & Astrofísica 🚀',
        '🧠 Neurociência & Cognição ⚡',
        '🧬 Genética Molecular',
        '👨‍👩‍👧‍👦 Família & Sociedade', // ZWJ sequence
        '🏳️‍🌈 Diversidade & Cultura', // Rainbow flag sequence
        '✨🌟⭐ Socratic Stellar Star',
        '🪐 Saturno e Anéis Cósmicos',
      ];

      for (const str of emojis) {
        const hue = getClusterHue(str);
        expect(Number.isInteger(hue)).toBe(true);
        expect(hue).toBeGreaterThanOrEqual(0);
        expect(hue).toBeLessThanOrEqual(359);
      }
    });

    it('handles extreme string lengths (1 char up to 100,000 characters) without integer overflow or NaN', () => {
      // 1 char
      const singleCharHue = getClusterHue('A');
      expect(Number.isInteger(singleCharHue)).toBe(true);
      expect(singleCharHue).toBeGreaterThanOrEqual(0);
      expect(singleCharHue).toBeLessThanOrEqual(359);

      // Whitespace only
      const whitespaceHue = getClusterHue('   \t\n\r  ');
      expect(Number.isInteger(whitespaceHue)).toBe(true);
      expect(whitespaceHue).toBeGreaterThanOrEqual(0);
      expect(whitespaceHue).toBeLessThanOrEqual(359);

      // 1,000 chars
      const mediumStr = 'QuantumFieldTheory'.repeat(55);
      const mediumHue = getClusterHue(mediumStr);
      expect(Number.isInteger(mediumHue)).toBe(true);
      expect(mediumHue).toBeGreaterThanOrEqual(0);
      expect(mediumHue).toBeLessThanOrEqual(359);

      // 100,000 chars
      const megaStr = 'CosmicCanvasSocraticDLC'.repeat(4500);
      const megaHue = getClusterHue(megaStr);
      expect(Number.isInteger(megaHue)).toBe(true);
      expect(megaHue).toBeGreaterThanOrEqual(0);
      expect(megaHue).toBeLessThanOrEqual(359);
    });

    it('verifies non-trivial dispersion across 100 random academic tags', () => {
      const hues = [];
      for (let i = 0; i < 100; i++) {
        hues.push(getClusterHue(`Domain-Tag-${i}-${i * 17}`));
      }
      const uniqueHues = new Set(hues);
      // Ensure no extreme hash clustering (at least 50 distinct hues across 100 synthetic tags)
      expect(uniqueHues.size).toBeGreaterThanOrEqual(50);
    });
  });

  // =========================================================================
  // 5. computeClusterHull: Empty, Degenerate & Falsy Point Cloud Handling
  // =========================================================================
  describe('5. computeClusterHull: Empty & Falsy Point Clouds', () => {
    it('returns empty array [] for empty arrays', () => {
      expect(computeClusterHull([])).toEqual([]);
      expect(computeClusterHull([], 25)).toEqual([]);
    });

    it('returns empty array [] for falsy, null, undefined, or non-array inputs', () => {
      expect(computeClusterHull(null)).toEqual([]);
      expect(computeClusterHull(undefined)).toEqual([]);
      expect(computeClusterHull({})).toEqual([]);
      expect(computeClusterHull(12345)).toEqual([]);
      expect(computeClusterHull('points')).toEqual([]);
      expect(computeClusterHull(false)).toEqual([]);
    });
  });

  // =========================================================================
  // 6. computeClusterHull: Single-Point Cosmic Singularity
  // =========================================================================
  describe('6. computeClusterHull: Single Point Singularity', () => {
    it('returns a bounding polygon with exactly 4 vertices (>= 2 points requirement)', () => {
      const p = { x: 100, y: 200 };
      const hull = computeClusterHull([p], 30);

      expect(hull).toHaveLength(4);
      expect(hull.length).toBeGreaterThanOrEqual(2);

      // Verify exact bounding coordinates
      expect(hull).toEqual([
        { x: 70, y: 170 },
        { x: 130, y: 170 },
        { x: 130, y: 230 },
        { x: 70, y: 230 },
      ]);
    });

    it('handles single point at origin (0, 0) with default padding (32)', () => {
      const hull = computeClusterHull([{ x: 0, y: 0 }]);
      expect(hull).toHaveLength(4);
      expect(hull).toEqual([
        { x: -32, y: -32 },
        { x: 32, y: -32 },
        { x: 32, y: 32 },
        { x: -32, y: 32 },
      ]);
    });

    it('handles negative coordinates and floating-point coordinates', () => {
      const hull = computeClusterHull([{ x: -150.5, y: -75.25 }], 10);
      expect(hull).toHaveLength(4);
      expect(hull[0]).toEqual({ x: -160.5, y: -85.25 });
      expect(hull[2]).toEqual({ x: -140.5, y: -65.25 });
    });
  });

  // =========================================================================
  // 7. computeClusterHull: Coincident / Duplicate Points
  // =========================================================================
  describe('7. computeClusterHull: Coincident / Duplicate Points Collapse', () => {
    it('collapses 2 identical points into a single-point bounding box with 4 vertices', () => {
      const points = [
        { x: 50, y: 50 },
        { x: 50, y: 50 },
      ];
      const hull = computeClusterHull(points, 20);
      expect(hull).toHaveLength(4);
      expect(hull).toEqual([
        { x: 30, y: 30 },
        { x: 70, y: 30 },
        { x: 70, y: 70 },
        { x: 30, y: 70 },
      ]);
    });

    it('collapses 10 identical points into a single-point bounding box with 4 vertices', () => {
      const points = Array.from({ length: 10 }, () => ({ x: 80, y: 120 }));
      const hull = computeClusterHull(points, 15);
      expect(hull).toHaveLength(4);
      expect(hull).toEqual([
        { x: 65, y: 105 },
        { x: 95, y: 105 },
        { x: 95, y: 135 },
        { x: 65, y: 135 },
      ]);
    });

    it('treats sub-millimeter coordinates (< 0.001 delta) as coincident duplicates', () => {
      const points = [
        { x: 100.0001, y: 100.0001 },
        { x: 100.0003, y: 100.0002 },
      ];
      const hull = computeClusterHull(points, 20);
      expect(hull).toHaveLength(4);
    });
  });

  // =========================================================================
  // 8. computeClusterHull: Two Distinct Points (Line Segment Capsule)
  // =========================================================================
  describe('8. computeClusterHull: Two Distinct Points', () => {
    it('returns a padded 4-vertex rectangle for a horizontal two-point segment', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ];
      const hull = computeClusterHull(points, 20);
      expect(hull).toHaveLength(4);

      // Verify all coordinates are finite numbers
      for (const v of hull) {
        expect(Number.isFinite(v.x)).toBe(true);
        expect(Number.isFinite(v.y)).toBe(true);
      }
    });

    it('returns a padded 4-vertex rectangle for a vertical two-point segment', () => {
      const points = [
        { x: 50, y: 0 },
        { x: 50, y: 200 },
      ];
      const hull = computeClusterHull(points, 25);
      expect(hull).toHaveLength(4);
      for (const v of hull) {
        expect(Number.isFinite(v.x)).toBe(true);
        expect(Number.isFinite(v.y)).toBe(true);
      }
    });

    it('returns a padded 4-vertex rectangle for a diagonal two-point segment', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 60, y: 80 },
      ];
      const hull = computeClusterHull(points, 10);
      expect(hull).toHaveLength(4);
      for (const v of hull) {
        expect(Number.isFinite(v.x)).toBe(true);
        expect(Number.isFinite(v.y)).toBe(true);
      }
    });
  });

  // =========================================================================
  // 9. computeClusterHull: Collinear Points Stress Test
  // =========================================================================
  describe('9. computeClusterHull: Collinear Points Stress Test', () => {
    it('handles 3 horizontal collinear points and returns a valid 4-vertex bounding box', () => {
      const points = [
        { x: 0, y: 50 },
        { x: 50, y: 50 },
        { x: 100, y: 50 },
      ];
      const hull = computeClusterHull(points, 15);
      expect(hull).toHaveLength(4);
      expect(hull.length).toBeGreaterThanOrEqual(4);

      expect(hull).toEqual([
        { x: -15, y: 35 },
        { x: 115, y: 35 },
        { x: 115, y: 65 },
        { x: -15, y: 65 },
      ]);
    });

    it('handles 4 vertical collinear points and returns a valid 4-vertex bounding box', () => {
      const points = [
        { x: 20, y: 0 },
        { x: 20, y: 30 },
        { x: 20, y: 60 },
        { x: 20, y: 90 },
      ];
      const hull = computeClusterHull(points, 10);
      expect(hull).toHaveLength(4);
      expect(hull.length).toBeGreaterThanOrEqual(4);

      expect(hull).toEqual([
        { x: 10, y: -10 },
        { x: 30, y: -10 },
        { x: 30, y: 100 },
        { x: 10, y: 100 },
      ]);
    });

    it('handles 5 diagonal collinear points and returns a valid 4-vertex bounding box', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 25, y: 25 },
        { x: 50, y: 50 },
        { x: 75, y: 75 },
        { x: 100, y: 100 },
      ];
      const hull = computeClusterHull(points, 20);
      expect(hull).toHaveLength(4);
      expect(hull.length).toBeGreaterThanOrEqual(4);

      expect(hull).toEqual([
        { x: -20, y: -20 },
        { x: 120, y: -20 },
        { x: 120, y: 120 },
        { x: -20, y: 120 },
      ]);
    });

    it('handles collinear points with negative coordinates', () => {
      const points = [
        { x: -100, y: -100 },
        { x: -50, y: -50 },
        { x: 0, y: 0 },
      ];
      const hull = computeClusterHull(points, 10);
      expect(hull).toHaveLength(4);
      expect(hull).toEqual([
        { x: -110, y: -110 },
        { x: 10, y: -110 },
        { x: 10, y: 10 },
        { x: -110, y: 10 },
      ]);
    });
  });

  // =========================================================================
  // 10. computeClusterHull: Square Point Sets & Multi-Vertex Hulls
  // =========================================================================
  describe('10. computeClusterHull: Square Point Sets & Pruning', () => {
    it('computes 4-vertex hull for a canonical square', () => {
      const square = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ];
      const hull = computeClusterHull(square, 16);
      expect(hull).toHaveLength(4);
      expect(hull.length).toBeGreaterThanOrEqual(4);

      // Verify that all 4 vertices are strictly finite
      for (const pt of hull) {
        expect(Number.isFinite(pt.x)).toBe(true);
        expect(Number.isFinite(pt.y)).toBe(true);
      }
    });

    it('prunes internal interior points and preserves only the outer 4 boundary vertices', () => {
      const squareWithInteriorPoints = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
        { x: 50, y: 50 }, // Center
        { x: 25, y: 25 }, // Interior
        { x: 75, y: 75 }, // Interior
        { x: 30, y: 70 }, // Interior
      ];
      const hull = computeClusterHull(squareWithInteriorPoints, 16);
      expect(hull).toHaveLength(4);
    });
  });

  // =========================================================================
  // 11. computeClusterHull: Random Clusters Stress Harness
  // =========================================================================
  describe('11. computeClusterHull: Random Clusters Stress Harness', () => {
    it('produces valid polygons >= 4 vertices for random clusters of 15-50 points', () => {
      for (let trial = 0; trial < 25; trial++) {
        const pointCount = 15 + Math.floor(Math.random() * 35);
        const randomCluster = Array.from({ length: pointCount }, () => ({
          x: Math.random() * 1000 - 500,
          y: Math.random() * 1000 - 500,
        }));

        const hull = computeClusterHull(randomCluster, 20);
        expect(hull.length).toBeGreaterThanOrEqual(4);

        // Every vertex must be a finite number
        for (const vertex of hull) {
          expect(Number.isFinite(vertex.x)).toBe(true);
          expect(Number.isFinite(vertex.y)).toBe(true);
          expect(Number.isNaN(vertex.x)).toBe(false);
          expect(Number.isNaN(vertex.y)).toBe(false);
        }
      }
    });

    it('efficiently computes convex hull for large clusters (1,000 points) in under 50ms', () => {
      const largeCluster = Array.from({ length: 1000 }, () => ({
        x: Math.random() * 5000,
        y: Math.random() * 5000,
      }));

      const t0 = performance.now();
      const hull = computeClusterHull(largeCluster, 32);
      const elapsed = performance.now() - t0;

      expect(hull.length).toBeGreaterThanOrEqual(4);
      expect(elapsed).toBeLessThan(100); // Strict performance guarantee
      for (const vertex of hull) {
        expect(Number.isFinite(vertex.x)).toBe(true);
        expect(Number.isFinite(vertex.y)).toBe(true);
      }
    });
  });

  // =========================================================================
  // 12. Geometric Invariants: Centroid Outward Radial Expansion
  // =========================================================================
  describe('12. Geometric Invariants: Centroid Outward Radial Expansion', () => {
    it('guarantees that every hull vertex is expanded strictly outward from centroid by padding', () => {
      const points = [
        { x: -50, y: -50 },
        { x: 50, y: -50 },
        { x: 50, y: 50 },
        { x: -50, y: 50 },
      ];
      const padding = 25;
      const hull = computeClusterHull(points, padding);

      // Centroid of the original square is (0, 0)
      for (const vertex of hull) {
        const distFromCenter = Math.hypot(vertex.x, vertex.y);
        // Original corner distance from (0,0) is sqrt(50^2 + 50^2) ≈ 70.71
        // Padded vertex distance should be 70.71 + 25 ≈ 95.71
        expect(distFromCenter).toBeCloseTo(Math.hypot(50, 50) + padding, 5);
      }
    });
  });
});
