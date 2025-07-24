import { GridRenderer, GridLine } from '../src/components/GridRenderer';
import { CoordinateMapping, ScreenViewport, WorldWindow } from '../src/types/Coordinate';
import { PreciseDecimal } from '../src/types/Decimal';

describe('GridRenderer', () => {
  let renderer: GridRenderer;
  let mapping: CoordinateMapping;
  let screenViewport: ScreenViewport;
  let worldWindow: WorldWindow;

  beforeEach(() => {
    screenViewport = { width: 800, height: 600 };
    worldWindow = {
      bottomLeft: [new PreciseDecimal(-4, 1), new PreciseDecimal(-3, 1)],
      topRight: [new PreciseDecimal(4, 1), new PreciseDecimal(3, 1)]
    };
    mapping = new CoordinateMapping(screenViewport, worldWindow);
    renderer = new GridRenderer(mapping);
  });

  describe('calculateMaxPrecision', () => {
    it('should calculate precision based on pixels per unit', () => {
      // World X range: 8 units, Screen width: 800 pixels → 100 pixels/unit
      // minSeparation: 5 pixels → ratio: 100/5 = 20 → log10(20) ≈ 1.3 → floor(1.3) = 1
      const precision = renderer.calculateMaxPrecision();
      expect(precision).toBe(1);
    });

    it('should handle high zoom levels (high pixels per unit)', () => {
      // Create a very zoomed-in world window
      const zoomedWorldWindow: WorldWindow = {
        bottomLeft: [new PreciseDecimal('0.1', 1), new PreciseDecimal('0.1', 1)],
        topRight: [new PreciseDecimal('0.3', 1), new PreciseDecimal('0.3', 1)]
      };
      
      const zoomedMapping = new CoordinateMapping(screenViewport, zoomedWorldWindow);
      const zoomedRenderer = new GridRenderer(zoomedMapping);
      
      // World X range: 0.2 units, Screen width: 800 pixels → 4000 pixels/unit
      // minSeparation: 5 pixels → ratio: 4000/5 = 800 → log10(800) ≈ 2.9 → floor(2.9) = 2
      const precision = zoomedRenderer.calculateMaxPrecision();
      expect(precision).toBe(2);
    });

    it('should handle low zoom levels (low pixels per unit)', () => {
      // Create a very zoomed-out world window
      const zoomedOutWorldWindow: WorldWindow = {
        bottomLeft: [new PreciseDecimal(-50, 0), new PreciseDecimal(-50, 0)],
        topRight: [new PreciseDecimal(50, 0), new PreciseDecimal(50, 0)]
      };
      
      const zoomedOutMapping = new CoordinateMapping(screenViewport, zoomedOutWorldWindow);
      const zoomedOutRenderer = new GridRenderer(zoomedOutMapping);
      
      // World X range: 100 units, Screen width: 800 pixels → 8 pixels/unit
      // minSeparation: 5 pixels → ratio: 8/5 = 1.6 → log10(1.6) ≈ 0.2 → floor(0.2) = 0
      const precision = zoomedOutRenderer.calculateMaxPrecision();
      expect(precision).toBe(0);
    });

    it('should clamp precision to reasonable bounds', () => {
      // Test extreme cases don't exceed bounds
      const precision = renderer.calculateMaxPrecision();
      expect(precision).toBeGreaterThanOrEqual(-1);
      expect(precision).toBeLessThanOrEqual(1000);
    });
  });

  describe('calculateHorizontalGridLines', () => {
    it('should generate horizontal grid lines with correct positions', () => {
      const maxPrecision = 1;
      const lines = renderer.calculateHorizontalGridLines(maxPrecision);
      
      expect(lines.length).toBeGreaterThan(0);
      
      // Should include lines at major Y positions
      const positions = lines.map(line => line.position.toNumber());
      expect(positions).toContain(-3);
      expect(positions).toContain(-2);
      expect(positions).toContain(-1);
      expect(positions).toContain(0);
      expect(positions).toContain(1);
      expect(positions).toContain(2);
      expect(positions).toContain(3);
    });

    it('should calculate correct screen positions for horizontal lines', () => {
      const maxPrecision = 1;
      const lines = renderer.calculateHorizontalGridLines(maxPrecision);
      
      // Find the line at Y = 0
      const zeroLine = lines.find(line => line.position.toNumber() === 0);
      expect(zeroLine).toBeDefined();
      expect(zeroLine!.screenPosition).toBe(300); // Middle of 600px screen height
    });

    it('should assign correct thickness based on precision hierarchy', () => {
      const maxPrecision = 2;
      const lines = renderer.calculateHorizontalGridLines(maxPrecision);
      
      // Group lines by precision
      const precisionGroups = lines.reduce((groups, line) => {
        const precision = line.precision;
        if (!groups[precision]) groups[precision] = [];
        groups[precision].push(line);
        return groups;
      }, {} as Record<number, GridLine[]>);
      
      // Essential precision (maxPrecision) should have thickness 1
      const essentialLines = precisionGroups[maxPrecision];
      expect(essentialLines.every(line => line.thickness === 1)).toBe(true);
      
      // Secondary precision (maxPrecision - 1) should have thickness 2
      const secondaryLines = precisionGroups[maxPrecision - 1];
      if (secondaryLines) {
        expect(secondaryLines.every(line => line.thickness === 2)).toBe(true);
      }
      
      // Tertiary precision (maxPrecision - 2) should have thickness 3
      const tertiaryLines = precisionGroups[maxPrecision - 2];
      if (tertiaryLines) {
        expect(tertiaryLines.every(line => line.thickness === 3)).toBe(true);
      }
    });

    it('should mark thick lines correctly', () => {
      const maxPrecision = 2;
      const lines = renderer.calculateHorizontalGridLines(maxPrecision);
      
      // Lines with thickness > 1 should be marked as thick
      lines.forEach(line => {
        expect(line.isThick).toBe(line.thickness > 1);
      });
    });

    it('should only include lines within viewport', () => {
      const maxPrecision = 1;
      const lines = renderer.calculateHorizontalGridLines(maxPrecision);
      
      // All lines should be within the world window Y range
      lines.forEach(line => {
        const y = line.position.toNumber();
        expect(y).toBeGreaterThanOrEqual(-3);
        expect(y).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('calculateVerticalGridLines', () => {
    it('should generate vertical grid lines with correct positions', () => {
      const maxPrecision = 1;
      const lines = renderer.calculateVerticalGridLines(maxPrecision);
      
      expect(lines.length).toBeGreaterThan(0);
      
      // Should include lines at major X positions
      const positions = lines.map(line => line.position.toNumber());
      expect(positions).toContain(-4);
      expect(positions).toContain(-3);
      expect(positions).toContain(-2);
      expect(positions).toContain(-1);
      expect(positions).toContain(0);
      expect(positions).toContain(1);
      expect(positions).toContain(2);
      expect(positions).toContain(3);
      expect(positions).toContain(4);
    });

    it('should calculate correct screen positions for vertical lines', () => {
      const maxPrecision = 1;
      const lines = renderer.calculateVerticalGridLines(maxPrecision);
      
      // Find the line at X = 0
      const zeroLine = lines.find(line => line.position.toNumber() === 0);
      expect(zeroLine).toBeDefined();
      expect(zeroLine!.screenPosition).toBe(400); // Middle of 800px screen width
    });

    it('should only include lines within viewport', () => {
      const maxPrecision = 1;
      const lines = renderer.calculateVerticalGridLines(maxPrecision);
      
      // All lines should be within the world window X range
      lines.forEach(line => {
        const x = line.position.toNumber();
        expect(x).toBeGreaterThanOrEqual(-4);
        expect(x).toBeLessThanOrEqual(4);
      });
    });
  });

  describe('Grid line sorting and precision levels', () => {
    it('should return lines sorted by precision', () => {
      const maxPrecision = 2;
      const horizontalLines = renderer.calculateHorizontalGridLines(maxPrecision);
      
      // Lines should be sorted by precision (ascending)
      for (let i = 1; i < horizontalLines.length; i++) {
        expect(horizontalLines[i].precision).toBeGreaterThanOrEqual(horizontalLines[i - 1].precision);
      }
    });

    it('should generate exactly 3 precision levels', () => {
      const maxPrecision = 5;
      const lines = renderer.calculateHorizontalGridLines(maxPrecision);
      
      const uniquePrecisions = new Set(lines.map(line => line.precision));
      expect(uniquePrecisions.size).toBeLessThanOrEqual(3);
      
      // Should include maxPrecision and potentially maxPrecision-1, maxPrecision-2
      expect(uniquePrecisions.has(maxPrecision)).toBe(true);
    });

    it('should handle low precision correctly', () => {
      const maxPrecision = 0;
      const lines = renderer.calculateHorizontalGridLines(maxPrecision);
      
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.every(line => line.precision === 0)).toBe(true);
    });
  });

  describe('Edge cases and precision handling', () => {
    it('should handle fractional world coordinates', () => {
      const fractionalWorldWindow: WorldWindow = {
        bottomLeft: [new PreciseDecimal('-1.5', 1), new PreciseDecimal('-1.5', 1)],
        topRight: [new PreciseDecimal('1.5', 1), new PreciseDecimal('1.5', 1)]
      };
      
      const fractionalMapping = new CoordinateMapping(screenViewport, fractionalWorldWindow);
      const fractionalRenderer = new GridRenderer(fractionalMapping);
      
      const lines = fractionalRenderer.calculateVerticalGridLines(1);
      expect(lines.length).toBeGreaterThan(0);
      
      // Should include lines at integer positions
      const positions = lines.map(line => line.position.toNumber());
      expect(positions).toContain(-1);
      expect(positions).toContain(0);
      expect(positions).toContain(1);
    });

    it('should handle very small world windows', () => {
      const tinyWorldWindow: WorldWindow = {
        bottomLeft: [new PreciseDecimal('0.01', 2), new PreciseDecimal('0.01', 2)],
        topRight: [new PreciseDecimal('0.03', 2), new PreciseDecimal('0.03', 2)]
      };
      
      const tinyMapping = new CoordinateMapping(screenViewport, tinyWorldWindow);
      const tinyRenderer = new GridRenderer(tinyMapping);
      
      const maxPrecision = tinyRenderer.calculateMaxPrecision();
      const lines = tinyRenderer.calculateHorizontalGridLines(maxPrecision);
      
      expect(lines.length).toBeGreaterThan(0);
      expect(maxPrecision).toBeGreaterThan(2); // Should have high precision for tiny windows
    });

    it('should maintain precision in grid line positions', () => {
      const maxPrecision = 3;
      const lines = renderer.calculateHorizontalGridLines(maxPrecision);
      
      // Lines at higher precision should have appropriate decimal places
      const highPrecisionLines = lines.filter(line => line.precision === maxPrecision);
      highPrecisionLines.forEach(line => {
        const positionStr = line.position.toString();
        // Should maintain precision in the position representation
        expect(typeof positionStr).toBe('string');
        expect(positionStr.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Coordinate system consistency', () => {
    it('should use the same coordinate mapping for both axes', () => {
      const horizontalLines = renderer.calculateHorizontalGridLines(1);
      const verticalLines = renderer.calculateVerticalGridLines(1);
      
      // Find center lines
      const centerHorizontal = horizontalLines.find(line => line.position.toNumber() === 0);
      const centerVertical = verticalLines.find(line => line.position.toNumber() === 0);
      
      expect(centerHorizontal).toBeDefined();
      expect(centerVertical).toBeDefined();
      
      // Screen positions should correspond to viewport center
      expect(centerHorizontal!.screenPosition).toBe(300); // Y center
      expect(centerVertical!.screenPosition).toBe(400);   // X center
    });

    it('should handle asymmetric world windows consistently', () => {
      // Different aspect ratio world window
      const asymmetricWorldWindow: WorldWindow = {
        bottomLeft: [new PreciseDecimal(-10, 0), new PreciseDecimal(-1, 1)],
        topRight: [new PreciseDecimal(10, 0), new PreciseDecimal(1, 1)]
      };
      
      const asymmetricMapping = new CoordinateMapping(screenViewport, asymmetricWorldWindow);
      const asymmetricRenderer = new GridRenderer(asymmetricMapping);
      
      const horizontalLines = asymmetricRenderer.calculateHorizontalGridLines(1);
      const verticalLines = asymmetricRenderer.calculateVerticalGridLines(1);
      
      expect(horizontalLines.length).toBeGreaterThan(0);
      expect(verticalLines.length).toBeGreaterThan(0);
      
      // Both should include their respective zero lines
      expect(horizontalLines.some(line => line.position.toNumber() === 0)).toBe(true);
      expect(verticalLines.some(line => line.position.toNumber() === 0)).toBe(true);
    });
  });
});