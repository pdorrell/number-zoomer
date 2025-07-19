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
    const pixelsPerYUnit = this.mapping.getPixelsPerYUnit();
    const minSeparation = 5;
    
    const screenDims = this.getScreenDimensions();
    const yMin = this.mapping.screenToXY(0, screenDims.height).y;
    const yMax = this.mapping.screenToXY(0, 0).y;
    
    const lines: GridLine[] = [];
    let maxPrecision = -1;
    
    // First pass: find maximum precision that has adequate separation
    for (let precision = 0; precision <= 15; precision++) {
      const step = new PreciseDecimal(Math.pow(10, -precision));
      const separation = pixelsPerYUnit * step.toNumber();
      
      if (separation >= minSeparation) {
        maxPrecision = precision;
      } else {
        break;
      }
    }
    
    // Second pass: generate lines with correct thickness
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
    const pixelsPerXUnit = this.mapping.getPixelsPerXUnit();
    const minSeparation = 5;
    
    const screenDims = this.getScreenDimensions();
    const xMin = this.mapping.screenToXY(0, 0).x;
    const xMax = this.mapping.screenToXY(screenDims.width, 0).x;
    
    const lines: GridLine[] = [];
    let maxPrecision = -1;
    
    // First pass: find maximum precision that has adequate separation
    for (let precision = 0; precision <= 15; precision++) {
      const step = new PreciseDecimal(Math.pow(10, -precision));
      const separation = pixelsPerXUnit * step.toNumber();
      
      if (separation >= minSeparation) {
        maxPrecision = precision;
      } else {
        break;
      }
    }
    
    // Second pass: generate lines with correct thickness
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
    // Per design: N (max precision) = 1px, N-1 = 2px, N-2 or smaller = 3px
    const precisionFromMax = maxPrecision - precision;
    
    if (precisionFromMax === 0) {
      return 1; // Maximum precision (finest grid)
    } else if (precisionFromMax === 1) {
      return 2; // One step coarser
    } else {
      return 3; // Two or more steps coarser
    }
  }

  private getScreenDimensions() {
    return this.mapping.getScreenDimensions();
  }
}