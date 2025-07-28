import { Point } from './Coordinate';
import { GridLine } from '../components/GridRenderer';

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

  constructor(screenPoints: ScreenPoint[]) {
    this.screenPoints = screenPoints;
  }
}