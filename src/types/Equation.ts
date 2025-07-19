import { PreciseDecimal } from './Decimal';
import { Point, WorldWindow } from './Coordinate';

export type EquationType = 'quadratic' | 'linear';

export interface EquationConfig {
  type: EquationType;
  c?: number; // For y = cx, defaults to 1
}

export abstract class Equation {
  abstract evaluate(x: PreciseDecimal): PreciseDecimal;
  abstract getType(): EquationType;
  abstract getDisplayName(): string;
  abstract shouldDrawAsCurve(worldWindow: WorldWindow): boolean;
  abstract generatePoints(worldWindow: WorldWindow, screenWidth: number): Point[];
}

export class QuadraticEquation extends Equation {
  evaluate(x: PreciseDecimal): PreciseDecimal {
    return x.pow(2);
  }

  getType(): EquationType {
    return 'quadratic';
  }

  getDisplayName(): string {
    return 'y = x²';
  }

  shouldDrawAsCurve(worldWindow: WorldWindow): boolean {
    // At high zoom levels, y=x² appears linear within small intervals
    const xRange = worldWindow.topRight.x.sub(worldWindow.bottomLeft.x);
    const rangeSize = Math.abs(xRange.toNumber());
    
    // If the x range is very small, draw as line (appears linear at high zoom)
    return rangeSize > 0.01;
  }

  generatePoints(worldWindow: WorldWindow, screenWidth: number): Point[] {
    const points: Point[] = [];
    const xMin = worldWindow.bottomLeft.x;
    const xMax = worldWindow.topRight.x;
    const xRange = xMax.sub(xMin);
    
    // Generate points across the screen width
    const numPoints = Math.min(screenWidth, 200); // Cap at 200 points for performance
    
    for (let i = 0; i <= numPoints; i++) {
      const ratio = i / numPoints;
      const x = xMin.add(xRange.mul(new PreciseDecimal(ratio)));
      const y = this.evaluate(x);
      points.push({ x, y });
    }
    
    return points;
  }
}

export class LinearEquation extends Equation {
  constructor(private c: number = 1) {
    super();
  }

  evaluate(x: PreciseDecimal): PreciseDecimal {
    return x.mul(new PreciseDecimal(this.c));
  }

  getType(): EquationType {
    return 'linear';
  }

  getDisplayName(): string {
    if (this.c === 1) {
      return 'y = x';
    }
    return `y = ${this.c}x`;
  }

  shouldDrawAsCurve(): boolean {
    // Linear equations are always drawn as straight lines
    return false;
  }

  generatePoints(worldWindow: WorldWindow): Point[] {
    // For linear equations, we only need two points
    const xMin = worldWindow.bottomLeft.x;
    const xMax = worldWindow.topRight.x;
    
    return [
      { x: xMin, y: this.evaluate(xMin) },
      { x: xMax, y: this.evaluate(xMax) }
    ];
  }

  getC(): number {
    return this.c;
  }

  setC(c: number): LinearEquation {
    return new LinearEquation(c);
  }
}

export function createEquation(config: EquationConfig): Equation {
  switch (config.type) {
    case 'quadratic':
      return new QuadraticEquation();
    case 'linear':
      return new LinearEquation(config.c || 1);
    default:
      throw new Error(`Unknown equation type: ${config.type}`);
  }
}