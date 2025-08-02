import { PreciseDecimal } from '@/types/Decimal';
import { CoordinateMapping, CoordinateAxisMapping } from '@/types/Coordinate';
import { ScaledFloat } from '@/types/ScaledFloat';
import { makeAutoObservable } from 'mobx';
import { CanvasGridLines } from '@/types/CanvasTypes';

export interface GridLine {
  position: PreciseDecimal;
  screenPosition: number;
  thickness: number;
  precision: number;
  isThick: boolean;
  color: string;
}

export class GridRenderer {
  private mapping: CoordinateMapping;

  constructor(mapping: CoordinateMapping) {
    this.mapping = mapping;
    makeAutoObservable(this);
  }

  get canvasGridLines(): CanvasGridLines {
    const maxPrecision = this.calculateMaxPrecision();
    const horizontalLines = this.calculateHorizontalGridLines(maxPrecision);
    const verticalLines = this.calculateVerticalGridLines(maxPrecision);
    return new CanvasGridLines(horizontalLines, verticalLines);
  }

  calculateMaxPrecision(): number {
    // Use X dimension for precision calculation to ensure consistent grid resolution
    const pixelsPerXUnitScaled = this.mapping.x.getPixelsPerUnitScaled();
    const minSeparation = new ScaledFloat(5);

    // Calculate ratio using ScaledFloat to avoid overflow/underflow
    const ratio = ScaledFloat.fromMantissaExponent(
      pixelsPerXUnitScaled.getMantissa() / minSeparation.getMantissa(),
      pixelsPerXUnitScaled.getExponent() - minSeparation.getExponent()
    );

    // Use ScaledFloat.log10() for safe and accurate calculation
    const maxPrecision = Math.floor(ratio.log10());

    return maxPrecision;
  }

  calculateHorizontalGridLines(maxPrecision: number): GridLine[][] {
    return this.calculateGridLines(maxPrecision, this.mapping.y);
  }

  calculateVerticalGridLines(maxPrecision: number): GridLine[][] {
    return this.calculateGridLines(maxPrecision, this.mapping.x);
  }

  private calculateGridLines(maxPrecision: number, axisMapping: CoordinateAxisMapping): GridLine[][] {
    // Group lines by thickness - thinnest first
    const linesByThickness = new Map<number, GridLine[]>();

    // Use the extended world bounds for rendering beyond viewport
    const minWorldPosition = axisMapping.getExtendedMinWindowPosition();
    const maxWorldPosition = axisMapping.getExtendedMaxWindowPosition();

    // Generate lines with correct thickness based on grid weight hierarchy
    // Only generate lines for the 3 precision levels that have different thicknesses
    const minPrecision = maxPrecision - 2;
    for (let precision = minPrecision; precision <= maxPrecision; precision++) {
      const thickness = this.calculateThickness(precision, maxPrecision);
      // Show labels for all grid lines except the thinnest (1px) ones
      const isThick = thickness > 1;

      // Initialize thickness group if not exists
      if (!linesByThickness.has(thickness)) {
        linesByThickness.set(thickness, []);
      }

      // Use PreciseDecimal for all calculations to avoid floating-point errors
      // For negative precision, we need the step size, not the multiplier
      const stepSize = precision >= 0
        ? new PreciseDecimal(1).div(new PreciseDecimal(10).pow(precision))  // 0.1, 0.01, 0.001, etc.
        : new PreciseDecimal(10).pow(-precision);  // 10, 100, 1000, etc.

      const startDivided = minWorldPosition.div(stepSize);
      const endDivided = maxWorldPosition.div(stepSize);

      const startIndex = startDivided.floor();
      const endIndex = endDivided.ceil();

      // Calculate initial window position and screen position
      let windowPosition = startIndex.mul(stepSize);
      let screenPosition = axisMapping.worldToScreen(windowPosition);

      // Calculate steps for incremental arithmetic
      const windowStep = stepSize;
      const screenStep = axisMapping.worldToScreenRange(windowStep, 1000000);

      // Use incremental arithmetic instead of repeated coordinate transformations
      let i = startIndex;
      while (i.lte(endIndex)) {
        if (windowPosition.isWithinInterval(minWorldPosition, maxWorldPosition)) {
          const color = this.calculateGridLineColor(precision, maxPrecision);
          const line = { position: windowPosition.quantize(precision), screenPosition, thickness, precision, isThick, color };
          linesByThickness.get(thickness)!.push(line);
        }

        // Increment for next iteration
        i = i.add(new PreciseDecimal(1));
        windowPosition = windowPosition.add(windowStep);
        screenPosition += screenStep;
      }
    }

    // Convert to array sorted by thickness (thinnest first)
    const sortedThicknesses = Array.from(linesByThickness.keys()).sort((a, b) => a - b);
    return sortedThicknesses.map(thickness => linesByThickness.get(thickness)!);
  }

  private calculateThickness(precision: number, maxPrecision: number): number {
    // Grid weight hierarchy: 1px + min(2, trailing_zeros)
    // Per design spec: Essential precision N = 1px, N-1 = 2px, N-2 or smaller = 3px
    const precisionFromMax = maxPrecision - precision;
    return Math.min(precisionFromMax + 1, 3);
  }

  private calculateGridLineColor(precision: number, maxPrecision: number): string {
    const thickness = this.calculateThickness(precision, maxPrecision);

    // Calculate pixels per unit for the current precision level using ScaledFloat
    const pixelsPerUnitScaled = this.mapping.x.getPixelsPerUnitScaled();
    const precisionScale = new ScaledFloat(1, -precision);
    const pixelsSeparationScaled = pixelsPerUnitScaled.mulScaled(precisionScale);
    const pixelsSeparation = pixelsSeparationScaled.toFloatBounded(0, 20);

    // Define color transition: 10% grey at 5px to normal grey at 10px
    const thinColor = "#495057";  // Normal grey (thick lines)
    const lightColor = "#adb5bd"; // Light grey (thin lines)

    if (thickness > 1) {
      // Thick lines use normal colors
      return thinColor;
    } else {
      // Thin lines use color interpolation based on pixel separation
      if (pixelsSeparation <= 5) {
        // At 5px or less, use 10% of normal grey (almost white)
        return this.interpolateColor(lightColor, "#ffffff", 0.9); // 10% grey, 90% white
      } else if (pixelsSeparation >= 10) {
        // At 10px or more, use normal light grey
        return lightColor;
      } else {
        // Linear interpolation between 5px and 10px
        const ratio = (pixelsSeparation - 5) / (10 - 5); // 0 to 1
        const whiteAmount = 0.9 * (1 - ratio); // 90% white at 5px, 0% white at 10px
        return this.interpolateColor(lightColor, "#ffffff", whiteAmount);
      }
    }
  }

  private interpolateColor(color1: string, color2: string, ratio: number): string {
    // Convert hex colors to RGB
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');

    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);

    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);

    // Interpolate
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);

    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private getScreenViewport() {
    return this.mapping.getScreenViewport();
  }

  // Legacy method for backward compatibility
  private getScreenDimensions() {
    return this.getScreenViewport();
  }
}
