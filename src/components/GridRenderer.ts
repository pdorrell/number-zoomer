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
    
    for (let precision = 0; precision <= 10; precision++) {
      const step = new PreciseDecimal(Math.pow(10, -precision));
      const separation = pixelsPerYUnit * step.toNumber();
      
      if (separation < minSeparation) continue;
      
      const thickness = this.calculateThickness(separation, precision);
      const isThick = precision <= 2;
      
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
    
    for (let precision = 0; precision <= 10; precision++) {
      const step = new PreciseDecimal(Math.pow(10, -precision));
      const separation = pixelsPerXUnit * step.toNumber();
      
      if (separation < minSeparation) continue;
      
      const thickness = this.calculateThickness(separation, precision);
      const isThick = precision <= 2;
      
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

  private calculateThickness(separation: number, precision: number): number {
    const baseThickness = Math.max(1, Math.round(separation * 0.1));
    
    switch (precision) {
      case 0:
      case 1:
      case 2:
        return baseThickness * 3;
      case 3:
        return baseThickness * 2;
      default:
        return baseThickness;
    }
  }

  private getScreenDimensions() {
    return this.mapping.getScreenDimensions();
  }
}