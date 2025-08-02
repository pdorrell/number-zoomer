import { GridLine } from '@/components/GridRenderer';

export class ScreenVector {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export class ScreenPoint {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  add(vector: ScreenVector): ScreenPoint {
    return new ScreenPoint(this.x + vector.x, this.y + vector.y);
  }
}

export class CanvasGridLines {
  horizontalLines: GridLine[][];
  verticalLines: GridLine[][];

  constructor(horizontalLines: GridLine[][], verticalLines: GridLine[][]) {
    this.horizontalLines = horizontalLines;
    this.verticalLines = verticalLines;
  }
}

export class CanvasEquationGraph {
  screenPoints: ScreenPoint[];
  worldPoints: [number, number][]; // Store world coordinates for debugging
  shouldDrawAsCurve: boolean;

  constructor(screenPoints: ScreenPoint[], worldPoints: [number, number][], shouldDrawAsCurve: boolean) {
    this.screenPoints = screenPoints;
    this.worldPoints = worldPoints;
    this.shouldDrawAsCurve = shouldDrawAsCurve;
  }
}
