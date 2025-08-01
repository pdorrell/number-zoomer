import { CoordinateAxisMapping } from '../src/types/Coordinate';
import { PreciseDecimal } from '../src/types/Decimal';

describe('CoordinateAxisMapping', () => {
  describe('X-axis mapping (positive direction)', () => {
    let xMapping: CoordinateAxisMapping;

    beforeEach(() => {
      // X-axis: world range [-2, 3], screen range [0, 500], direction +1
      xMapping = new CoordinateAxisMapping(
        new PreciseDecimal(-2, 1),  // minWindowPosition
        new PreciseDecimal(3, 1),   // maxWindowPosition
        0,                          // screenBase
        500,                        // screenRange
        1                           // screenDirection (+1)
      );
    });

    describe('screenToWorld', () => {
      it('should map screenBase to minWindowPosition', () => {
        const result = xMapping.screenToWorld(0);
        expect(result.toString()).toBe('-2');
      });

      it('should map screenBase + screenRange to maxWindowPosition', () => {
        const result = xMapping.screenToWorld(500);
        expect(result.toString()).toBe('3');
      });

      it('should map mid-screen to mid-world', () => {
        const result = xMapping.screenToWorld(250);
        expect(result.toString()).toBe('0.5');
      });

      it('should handle fractional screen positions', () => {
        const result = xMapping.screenToWorld(100);
        expect(result.toString()).toBe('-1');
      });
    });

    describe('worldToScreen', () => {
      it('should map minWindowPosition to screenBase', () => {
        const result = xMapping.worldToScreen(new PreciseDecimal(-2, 1));
        expect(result).toBe(0);
      });

      it('should map maxWindowPosition to screenRange', () => {
        const result = xMapping.worldToScreen(new PreciseDecimal(3, 1));
        expect(result).toBe(500);
      });

      it('should map mid-world to mid-screen', () => {
        const result = xMapping.worldToScreen(new PreciseDecimal(0.5, 1));
        expect(result).toBe(250);
      });

      it('should handle world positions outside range', () => {
        const result = xMapping.worldToScreen(new PreciseDecimal(5, 1));
        expect(result).toBe(700);
      });
    });

    describe('getPixelsPerUnit', () => {
      it('should calculate correct pixels per unit', () => {
        // World range: 5 units, Screen range: 500 pixels
        const result = xMapping.getPixelsPerUnit();
        expect(result).toBe(100);
      });
    });
  });

  describe('Y-axis mapping (negative direction)', () => {
    let yMapping: CoordinateAxisMapping;

    beforeEach(() => {
      // Y-axis: world range [-1, 4], screen range [0, 400], direction -1
      yMapping = new CoordinateAxisMapping(
        new PreciseDecimal(-1, 1),  // minWindowPosition
        new PreciseDecimal(4, 1),   // maxWindowPosition
        400,                        // screenBase (bottom of screen)
        400,                        // screenRange
        -1                          // screenDirection (-1)
      );
    });

    describe('screenToWorld', () => {
      it('should map screenBase to minWindowPosition', () => {
        const result = yMapping.screenToWorld(400);
        expect(result.toString()).toBe('-1');
      });

      it('should map screen top to maxWindowPosition', () => {
        const result = yMapping.screenToWorld(0);
        expect(result.toString()).toBe('4');
      });

      it('should map mid-screen to mid-world', () => {
        const result = yMapping.screenToWorld(200);
        expect(result.toString()).toBe('1.5');
      });

      it('should handle fractional screen positions', () => {
        const result = yMapping.screenToWorld(320);
        // screenOffset = 320 - 400 = -80
        // ratio = -(-80) / 400 = 0.2
        // world = -1 + (5 * 0.2) = 0
        expect(result.toString()).toBe('0');
      });
    });

    describe('worldToScreen', () => {
      it('should map minWindowPosition to screenBase', () => {
        const result = yMapping.worldToScreen(new PreciseDecimal(-1, 1));
        expect(result).toBe(400);
      });

      it('should map maxWindowPosition to screen top', () => {
        const result = yMapping.worldToScreen(new PreciseDecimal(4, 1));
        expect(result).toBe(0);
      });

      it('should map mid-world to mid-screen', () => {
        const result = yMapping.worldToScreen(new PreciseDecimal(1.5, 1));
        expect(result).toBe(200);
      });

      it('should handle world positions outside range', () => {
        const result = yMapping.worldToScreen(new PreciseDecimal(6, 1));
        expect(result).toBe(-160);
      });
    });

    describe('getPixelsPerUnit', () => {
      it('should calculate correct pixels per unit', () => {
        // World range: 5 units, Screen range: 400 pixels
        const result = yMapping.getPixelsPerUnit();
        expect(result).toBe(80);
      });
    });
  });

  describe('Edge cases and precision', () => {
    let mapping: CoordinateAxisMapping;

    beforeEach(() => {
      // Small world range for precision testing
      mapping = new CoordinateAxisMapping(
        new PreciseDecimal('0.1', 1),
        new PreciseDecimal('0.3', 1),
        0,
        100,
        1
      );
    });

    it('should handle small world ranges with high precision', () => {
      const worldPos = new PreciseDecimal('0.2', 1);
      const screenPos = mapping.worldToScreen(worldPos);
      const backToWorld = mapping.screenToWorld(screenPos);

      expect(Math.abs(backToWorld.toNumber() - 0.2)).toBeLessThan(1e-10);
    });

    it('should handle zero screen range gracefully', () => {
      const zeroRangeMapping = new CoordinateAxisMapping(
        new PreciseDecimal(1, 1),
        new PreciseDecimal(2, 1),
        100,
        0,
        1
      );

      const result = zeroRangeMapping.getPixelsPerUnit();
      expect(result).toBe(0);
    });

    it('should handle identical world positions', () => {
      const identicalMapping = new CoordinateAxisMapping(
        new PreciseDecimal(5, 1),
        new PreciseDecimal(5, 1),
        0,
        100,
        1
      );

      const result = identicalMapping.screenToWorld(50);
      expect(result.toString()).toBe('5');
    });
  });

  describe('ScaledFloat operations', () => {
    let mapping: CoordinateAxisMapping;

    beforeEach(() => {
      mapping = new CoordinateAxisMapping(
        new PreciseDecimal(-10, 1),
        new PreciseDecimal(10, 1),
        0,
        800,
        1
      );
    });

    describe('worldToScreenScaled', () => {
      it('should return ScaledFloat for world positions', () => {
        const worldPos = new PreciseDecimal(5, 1);
        const scaledResult = mapping.worldToScreenScaled(worldPos);

        expect(scaledResult.toFloat()).toBe(600);
      });

      it('should handle extreme world positions without overflow', () => {
        const extremePos = new PreciseDecimal('1e100', 0);
        const scaledResult = mapping.worldToScreenScaled(extremePos);

        // Should not throw and should return a valid ScaledFloat
        expect(typeof scaledResult.getMantissa()).toBe('number');
        expect(typeof scaledResult.getExponent()).toBe('number');
      });
    });

    describe('getPixelsPerUnitScaled', () => {
      it('should return ScaledFloat for pixels per unit', () => {
        const scaledResult = mapping.getPixelsPerUnitScaled();

        expect(scaledResult.toFloat()).toBe(40); // 800 pixels / 20 units
      });
    });
  });
});
