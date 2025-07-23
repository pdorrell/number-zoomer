import { PreciseDecimal } from '../types/Decimal';
import { CoordinateMapping, Point } from '../types/Coordinate';
import { ScaledFloat } from '../types/ScaledFloat';

export interface GridLine {
  position: PreciseDecimal;
  thickness: number;
  precision: number;
  isThick: boolean;
}

export class GridRenderer {
  private mapping: CoordinateMapping;

  constructor(mapping: CoordinateMapping) {
    this.mapping = mapping;
  }

  calculateMaxPrecision(): number {
    // Use X dimension for precision calculation to ensure consistent grid resolution
    const pixelsPerXUnitScaled = this.mapping.getPixelsPerXUnitScaled();
    const minSeparation = new ScaledFloat(5);

    // Calculate ratio using ScaledFloat to avoid overflow/underflow
    const ratio = ScaledFloat.fromMantissaExponent(
      pixelsPerXUnitScaled.getMantissa() / minSeparation.getMantissa(),
      pixelsPerXUnitScaled.getExponent() - minSeparation.getExponent()
    );

    // Convert to regular number for log calculation (safe as we're only using for precision calculation)
    const ratioFloat = ratio.toFloatInBounds(-1e308, 1e308);
    if (ratioFloat === null) {
      // Handle extreme cases
      return ratio.getExponent() > 0 ? 1000 : -1;
    }

    const maxPrecision = Math.floor(Math.log10(ratioFloat));

    // Ensure we don't exceed reasonable bounds and handle edge cases
    return Math.max(-1, Math.min(1000, maxPrecision));
  }

  calculateHorizontalGridLines(maxPrecision: number): GridLine[] {
    const screenViewport = this.getScreenViewport();
    const yMin = this.mapping.screenToWorldY(screenViewport.height);
    const yMax = this.mapping.screenToWorldY(0);

    const lines: GridLine[] = [];

    // Generate lines with correct thickness based on grid weight hierarchy
    // Only generate lines for the 3 precision levels that have different thicknesses
    const minPrecision = Math.max(0, maxPrecision - 2);
    for (let precision = minPrecision; precision <= maxPrecision; precision++) {
      const step = new PreciseDecimal(10, 0).pow(-precision);

      const thickness = this.calculateThickness(precision, maxPrecision);
      // Show labels for all grid lines except the thinnest (1px) ones
      const isThick = thickness > 1;

      // Use PreciseDecimal for all calculations to avoid floating-point errors
      const multiplier = new PreciseDecimal(10, 0).pow(precision);
      const startMultiplied = yMin.mul(multiplier);
      const endMultiplied = yMax.mul(multiplier);


      const startIndex = startMultiplied.floor();
      const endIndex = endMultiplied.ceil();

      const numGridLines = endIndex.toInteger() + 1 - startIndex.toInteger();

      for (let i = startIndex; i.lte(endIndex); i = i.add(new PreciseDecimal(1, 0))) {
        const position = i.div(multiplier);
        if (position.isWithinInterval(yMin, yMax)) {
          lines.push({ position: position.setPrecision(precision), thickness, precision, isThick });
        }
      }
    }

    return lines.sort((a, b) => a.precision - b.precision);
  }

  calculateVerticalGridLines(maxPrecision: number): GridLine[] {
    const screenViewport = this.getScreenViewport();
    const xMin = this.mapping.screenToWorldX(0);
    const xMax = this.mapping.screenToWorldX(screenViewport.width);

    const lines: GridLine[] = [];

    // Generate lines with correct thickness based on grid weight hierarchy
    // Only generate lines for the 3 precision levels that have different thicknesses
    const minPrecision = Math.max(0, maxPrecision - 2);
    for (let precision = minPrecision; precision <= maxPrecision; precision++) {
      const step = new PreciseDecimal(10, 0).pow(-precision);
      const thickness = this.calculateThickness(precision, maxPrecision);
      // Show labels for all grid lines except the thinnest (1px) ones
      const isThick = thickness > 1;

      // Use PreciseDecimal for all calculations to avoid floating-point errors
      const multiplier = new PreciseDecimal(10, 0).pow(precision);
      const startMultiplied = xMin.mul(multiplier);
      const endMultiplied = xMax.mul(multiplier);

      const startIndex = startMultiplied.floor();
      const endIndex = endMultiplied.ceil();

      const numGridLines = endIndex.toInteger() + 1 - startIndex.toInteger();

      for (let i = startIndex; i.lte(endIndex); i = i.add(new PreciseDecimal(1, 0))) {
        const position = i.div(multiplier);
        if (position.isWithinInterval(xMin, xMax)) {
          lines.push({ position: position.setPrecision(precision), thickness, precision, isThick });
        }
      }
    }

    return lines.sort((a, b) => a.precision - b.precision);
  }

  private calculateThickness(precision: number, maxPrecision: number): number {
    // Grid weight hierarchy: 1px + min(2, trailing_zeros)
    // Per design spec: Essential precision N = 1px, N-1 = 2px, N-2 or smaller = 3px
    const precisionFromMax = maxPrecision - precision;
    return Math.min(precisionFromMax + 1, 3);
  }

  private getScreenViewport() {
    return this.mapping.getScreenViewport();
  }

  // Legacy method for backward compatibility
  private getScreenDimensions() {
    return this.getScreenViewport();
  }
}
