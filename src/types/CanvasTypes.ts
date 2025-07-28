import { Point } from './Coordinate';
import { GridLine } from '../components/GridRenderer';

export interface ScreenPoint {
  x: number;
  y: number;
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