import { PreciseDecimal } from '../types/Decimal';
import { CoordinateMapping, Point } from '../types/Coordinate';

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

  calculateHorizontalGridLines(): GridLine[] {
    // Use X dimension for precision calculation to ensure consistent grid resolution
    const pixelsPerXUnit = this.mapping.getPixelsPerXUnit();
    const minSeparation = 5;
    
    const screenViewport = this.getScreenViewport();
    const yMin = this.mapping.screenToWorld(0, screenViewport.height).y;
    const yMax = this.mapping.screenToWorld(0, 0).y;
    
    const lines: GridLine[] = [];
    let maxPrecision = -1;
    
    // Find maximum precision based on X dimension only (per design spec)
    for (let precision = 0; precision <= 15; precision++) {
      const step = new PreciseDecimal(Math.pow(10, -precision));
      const separation = pixelsPerXUnit * step.toNumber();
      
      if (separation >= minSeparation) {
        maxPrecision = precision;
      } else {
        break;
      }
    }
    
    // Generate lines with correct thickness based on grid weight hierarchy
    for (let precision = 0; precision <= maxPrecision; precision++) {
      const step = new PreciseDecimal(Math.pow(10, -precision));
      const thickness = this.calculateThickness(precision, maxPrecision);
      const isThick = precision >= maxPrecision - 1; // Show labels on thickest lines
      
      const startValue = Math.floor(yMin.toNumber() * Math.pow(10, precision)) / Math.pow(10, precision);
      const endValue = Math.ceil(yMax.toNumber() * Math.pow(10, precision)) / Math.pow(10, precision);
      
      for (let value = startValue; value <= endValue; value += step.toNumber()) {
        const position = new PreciseDecimal(value.toFixed(precision), precision);
        if (position.isWithinInterval(yMin, yMax)) {
          lines.push({ position, thickness, precision, isThick });
        }
      }
    }
    
    return lines.sort((a, b) => a.precision - b.precision);
  }

  calculateVerticalGridLines(): GridLine[] {
    // Use X dimension for precision calculation to ensure consistent grid resolution
    const pixelsPerXUnit = this.mapping.getPixelsPerXUnit();
    const minSeparation = 5;
    
    const screenViewport = this.getScreenViewport();
    const xMin = this.mapping.screenToWorld(0, 0).x;
    const xMax = this.mapping.screenToWorld(screenViewport.width, 0).x;
    
    const lines: GridLine[] = [];
    let maxPrecision = -1;
    
    // Find maximum precision based on X dimension only (per design spec)
    for (let precision = 0; precision <= 15; precision++) {
      const step = new PreciseDecimal(Math.pow(10, -precision));
      const separation = pixelsPerXUnit * step.toNumber();
      
      if (separation >= minSeparation) {
        maxPrecision = precision;
      } else {
        break;
      }
    }
    
    // Generate lines with correct thickness based on grid weight hierarchy
    for (let precision = 0; precision <= maxPrecision; precision++) {
      const step = new PreciseDecimal(Math.pow(10, -precision));
      const thickness = this.calculateThickness(precision, maxPrecision);
      const isThick = precision >= maxPrecision - 1; // Show labels on thickest lines
      
      const startValue = Math.floor(xMin.toNumber() * Math.pow(10, precision)) / Math.pow(10, precision);
      const endValue = Math.ceil(xMax.toNumber() * Math.pow(10, precision)) / Math.pow(10, precision);
      
      for (let value = startValue; value <= endValue; value += step.toNumber()) {
        const position = new PreciseDecimal(value.toFixed(precision), precision);
        if (position.isWithinInterval(xMin, xMax)) {
          lines.push({ position, thickness, precision, isThick });
        }
      }
    }
    
    return lines.sort((a, b) => a.precision - b.precision);
  }

  private calculateThickness(precision: number, maxPrecision: number): number {
    // Grid weight hierarchy: 1px + min(2, trailing_zeros)
    // Per design spec: Essential precision N = 1px, N-1 = 2px, N-2 or smaller = 3px
    const precisionFromMax = maxPrecision - precision;
    
    if (precisionFromMax === 0) {
      return 1; // Maximum precision (finest grid resolution)
    } else if (precisionFromMax === 1) {
      return 2; // One step coarser
    } else {
      return 3; // Two or more steps coarser
    }
  }

  private getScreenViewport() {
    return this.mapping.getScreenViewport();
  }

  // Legacy method for backward compatibility
  private getScreenDimensions() {
    return this.getScreenViewport();
  }
}