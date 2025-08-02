import { CoordinateMapping, ScreenViewport, WorldWindow } from '../src/types/Coordinate';
import { PreciseDecimal } from '../src/types/Decimal';

describe('CoordinateMapping', () => {
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
  });

  describe('2D coordinate transformations', () => {
    describe('screenToWorld', () => {
      it('should convert screen coordinates to world coordinates', () => {
        const [worldX, worldY] = mapping.screenToWorld(400, 300);

        expect(worldX.toString()).toBe('0');
        expect(worldY.toString()).toBe('0');
      });

      it('should handle screen corners correctly', () => {
        // Bottom-left corner of screen
        const [blX, blY] = mapping.screenToWorld(0, 600);
        expect(blX.toString()).toBe('-4');
        expect(blY.toString()).toBe('-3');

        // Top-right corner of screen
        const [trX, trY] = mapping.screenToWorld(800, 0);
        expect(trX.toString()).toBe('4');
        expect(trY.toString()).toBe('3');
      });

      it('should handle arbitrary screen positions', () => {
        const [worldX, worldY] = mapping.screenToWorld(200, 150);

        expect(worldX.toString()).toBe('-2');
        expect(worldY.toString()).toBe('1.5');
      });
    });

    describe('worldToScreen', () => {
      it('should convert world coordinates to screen coordinates', () => {
        const point = [new PreciseDecimal(0, 1), new PreciseDecimal(0, 1)] as const;
        const screen = mapping.worldToScreen(point);

        expect(screen.x).toBe(400);
        expect(screen.y).toBe(300);
      });

      it('should handle world corners correctly', () => {
        // Bottom-left world corner
        const blPoint = [new PreciseDecimal(-4, 1), new PreciseDecimal(-3, 1)] as const;
        const blScreen = mapping.worldToScreen(blPoint);
        expect(blScreen.x).toBe(0);
        expect(blScreen.y).toBe(600);

        // Top-right world corner
        const trPoint = [new PreciseDecimal(4, 1), new PreciseDecimal(3, 1)] as const;
        const trScreen = mapping.worldToScreen(trPoint);
        expect(trScreen.x).toBe(800);
        expect(trScreen.y).toBe(0);
      });

      it('should handle arbitrary world positions', () => {
        const point = [new PreciseDecimal(-2, 1), new PreciseDecimal(1.5, 1)] as const;
        const screen = mapping.worldToScreen(point);

        expect(screen.x).toBe(200);
        expect(screen.y).toBe(150);
      });
    });
  });

  describe('Individual axis methods', () => {
    describe('X-axis methods', () => {
      it('should convert screen X to world X', () => {
        const worldX = mapping.x.screenToWorld(600);
        expect(worldX.toString()).toBe('2');
      });

      it('should convert world X to screen X', () => {
        const screenX = mapping.x.worldToScreen(new PreciseDecimal(-2, 1));
        expect(screenX).toBe(200);
      });
    });

    describe('Y-axis methods', () => {
      it('should convert screen Y to world Y', () => {
        const worldY = mapping.y.screenToWorld(450);
        expect(worldY.toString()).toBe('-1.5');
      });

      it('should convert world Y to screen Y', () => {
        const screenY = mapping.y.worldToScreen(new PreciseDecimal(1.5, 1));
        expect(screenY).toBe(150);
      });
    });
  });

  describe('Scaled coordinate transformations', () => {
    describe('worldToScreenXScaled', () => {
      it('should return ScaledFloat for X transformations', () => {
        const scaledX = mapping.x.worldToScreenScaled(new PreciseDecimal(2, 1));
        expect(scaledX.toFloat()).toBe(600);
      });
    });

    describe('worldToScreenYScaled', () => {
      it('should return ScaledFloat for Y transformations', () => {
        const scaledY = mapping.y.worldToScreenScaled(new PreciseDecimal(-1.5, 1));
        expect(scaledY.toFloat()).toBe(450);
      });
    });
  });

  describe('Pixels per unit calculations', () => {
    describe('getPixelsPerXUnit', () => {
      it('should calculate X pixels per unit correctly', () => {
        // World X range: 8 units, Screen width: 800 pixels
        const pixelsPerUnit = mapping.x.getPixelsPerUnitScaled();
        expect(pixelsPerUnit.toFloat()).toBe(100);
      });
    });

    describe('getPixelsPerYUnit', () => {
      it('should calculate Y pixels per unit correctly', () => {
        // World Y range: 6 units, Screen height: 600 pixels
        const pixelsPerUnit = mapping.y.getPixelsPerUnitScaled();
        expect(pixelsPerUnit.toFloat()).toBe(100);
      });
    });

    describe('getPixelsPerXUnitScaled', () => {
      it('should return ScaledFloat for X pixels per unit', () => {
        const scaledPixelsPerUnit = mapping.x.getPixelsPerUnitScaled();
        expect(scaledPixelsPerUnit.toFloat()).toBe(100);
      });
    });

    describe('getPixelsPerYUnitScaled', () => {
      it('should return ScaledFloat for Y pixels per unit', () => {
        const scaledPixelsPerUnit = mapping.y.getPixelsPerUnitScaled();
        expect(scaledPixelsPerUnit.toFloat()).toBe(100);
      });
    });
  });

  describe('Asymmetric world windows', () => {
    beforeEach(() => {
      // Non-square world window with different X and Y scales
      worldWindow = {
        bottomLeft: [new PreciseDecimal(-10, 1), new PreciseDecimal(-2, 1)],
        topRight: [new PreciseDecimal(10, 1), new PreciseDecimal(2, 1)]
      };
      mapping = new CoordinateMapping(screenViewport, worldWindow);
    });

    it('should handle different X and Y scales correctly', () => {
      const xPixelsPerUnit = mapping.x.getPixelsPerUnitScaled();
      const yPixelsPerUnit = mapping.y.getPixelsPerUnitScaled();

      expect(xPixelsPerUnit.toFloat()).toBe(40);  // 800 pixels / 20 X units
      expect(yPixelsPerUnit.toFloat()).toBe(150); // 600 pixels / 4 Y units
    });

    it('should maintain correct aspect ratios', () => {
      const centerPoint = [new PreciseDecimal(0, 1), new PreciseDecimal(0, 1)] as const;
      const screen = mapping.worldToScreen(centerPoint);

      expect(screen.x).toBe(400);
      expect(screen.y).toBe(300);
    });
  });

  describe('Extreme world windows', () => {
    it('should handle very small world windows', () => {
      const tinyWorldWindow: WorldWindow = {
        bottomLeft: [new PreciseDecimal('0.001', 3), new PreciseDecimal('0.001', 3)],
        topRight: [new PreciseDecimal('0.002', 3), new PreciseDecimal('0.002', 3)]
      };

      const tinyMapping = new CoordinateMapping(screenViewport, tinyWorldWindow);

      const pixelsPerXUnit = tinyMapping.x.getPixelsPerUnitScaled();
      const pixelsPerYUnit = tinyMapping.y.getPixelsPerUnitScaled();

      expect(pixelsPerXUnit.toFloat()).toBe(800000);  // 800 / 0.001
      expect(pixelsPerYUnit.toFloat()).toBe(600000);  // 600 / 0.001
    });

    it('should handle very large world windows', () => {
      const hugeWorldWindow: WorldWindow = {
        bottomLeft: [new PreciseDecimal(-1000, 0), new PreciseDecimal(-1000, 0)],
        topRight: [new PreciseDecimal(1000, 0), new PreciseDecimal(1000, 0)]
      };

      const hugeMapping = new CoordinateMapping(screenViewport, hugeWorldWindow);

      const pixelsPerXUnit = hugeMapping.x.getPixelsPerUnitScaled();
      const pixelsPerYUnit = hugeMapping.y.getPixelsPerUnitScaled();

      expect(pixelsPerXUnit.toFloat()).toBe(0.4);   // 800 / 2000
      expect(pixelsPerYUnit.toFloat()).toBeCloseTo(0.3, 10);   // 600 / 2000 (handle floating point precision)
    });
  });

  describe('Coordinate roundtrip accuracy', () => {
    it('should maintain precision in screen->world->screen roundtrips', () => {
      const originalScreenX = 333;
      const originalScreenY = 444;

      const [worldX, worldY] = mapping.screenToWorld(originalScreenX, originalScreenY);
      const finalScreen = mapping.worldToScreen([worldX, worldY]);

      expect(Math.abs(finalScreen.x - originalScreenX)).toBeLessThan(1e-10);
      expect(Math.abs(finalScreen.y - originalScreenY)).toBeLessThan(1e-10);
    });

    it('should maintain precision in world->screen->world roundtrips', () => {
      const originalPoint = [new PreciseDecimal('1.234567', 6), new PreciseDecimal('-2.987654', 6)] as const;

      const screen = mapping.worldToScreen(originalPoint);
      const [finalWorldX, finalWorldY] = mapping.screenToWorld(screen.x, screen.y);

      expect(Math.abs(finalWorldX.toNumber() - originalPoint[0].toNumber())).toBeLessThan(1e-10);
      expect(Math.abs(finalWorldY.toNumber() - originalPoint[1].toNumber())).toBeLessThan(1e-10);
    });
  });

  describe('Axis mapping access', () => {
    it('should provide access to X axis mapping', () => {
      expect(mapping.x).toBeDefined();

      const worldX = mapping.x.screenToWorld(400);
      expect(worldX.toString()).toBe('0');
    });

    it('should provide access to Y axis mapping', () => {
      expect(mapping.y).toBeDefined();

      const worldY = mapping.y.screenToWorld(300);
      expect(worldY.toString()).toBe('0');
    });

    it('should allow direct axis operations', () => {
      const xPixelsPerUnit = mapping.x.getPixelsPerUnitScaled();
      const yPixelsPerUnit = mapping.y.getPixelsPerUnitScaled();

      expect(xPixelsPerUnit.toFloat()).toBe(mapping.x.getPixelsPerUnitScaled().toFloat());
      expect(yPixelsPerUnit.toFloat()).toBe(mapping.y.getPixelsPerUnitScaled().toFloat());
    });
  });
});
