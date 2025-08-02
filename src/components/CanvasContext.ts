import { ScreenVector, CanvasGridLines, CanvasEquationGraph } from '@/types/CanvasTypes';
import { ScreenViewport } from '@/types/Coordinate';

export class CanvasContext {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private extensionOffset: ScreenVector;
  private screenViewport: ScreenViewport;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, extensionOffset: ScreenVector, screenViewport: ScreenViewport) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.extensionOffset = extensionOffset;
    this.screenViewport = screenViewport;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawBackground(): void {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGridLines(gridLines: CanvasGridLines): void {
    const { horizontalLines, verticalLines } = gridLines;

    // Draw grid lines in interleaved thickness order (thickest last)
    // This ensures thicker lines are drawn over thinner lines in the other direction
    const maxThicknessLevels = Math.max(horizontalLines.length, verticalLines.length);

    for (let thicknessLevel = 0; thicknessLevel < maxThicknessLevels; thicknessLevel++) {
      // Draw horizontal lines of this thickness level
      if (horizontalLines[thicknessLevel]) {
        horizontalLines[thicknessLevel].forEach(line => {
          // Adjust screen coordinates for canvas offset
          const screenY = line.screenPosition + this.extensionOffset.y;

          this.ctx.strokeStyle = line.color;
          this.ctx.lineWidth = line.thickness;
          this.ctx.beginPath();
          this.ctx.moveTo(0, screenY);
          this.ctx.lineTo(this.canvas.width, screenY);
          this.ctx.stroke();
        });
      }

      // Draw vertical lines of this thickness level
      if (verticalLines[thicknessLevel]) {
        verticalLines[thicknessLevel].forEach(line => {
          // Adjust screen coordinates for canvas offset
          const screenX = line.screenPosition + this.extensionOffset.x;

          this.ctx.strokeStyle = line.color;
          this.ctx.lineWidth = line.thickness;
          this.ctx.beginPath();
          this.ctx.moveTo(screenX, 0);
          this.ctx.lineTo(screenX, this.canvas.height);
          this.ctx.stroke();
        });
      }
    }
  }

  private isLineSegmentVisible(
    x1: number, y1: number, x2: number, y2: number
  ): boolean {
    const { width, height } = this.screenViewport;

    // Check if either endpoint is within the screen viewport
    const point1InViewport = x1 >= 0 && x1 <= width && y1 >= 0 && y1 <= height;
    const point2InViewport = x2 >= 0 && x2 <= width && y2 >= 0 && y2 <= height;

    if (point1InViewport || point2InViewport) {
      return true;
    }

    // Use proper line-rectangle intersection algorithm
    // Check if line segment intersects with any edge of the viewport rectangle

    // Viewport edges: left=0, right=width, top=0, bottom=height
    const intersectsLeft = this.lineIntersectsVerticalLine(x1, y1, x2, y2, 0, 0, height);
    const intersectsRight = this.lineIntersectsVerticalLine(x1, y1, x2, y2, width, 0, height);
    const intersectsTop = this.lineIntersectsHorizontalLine(x1, y1, x2, y2, 0, 0, width);
    const intersectsBottom = this.lineIntersectsHorizontalLine(x1, y1, x2, y2, height, 0, width);

    return intersectsLeft || intersectsRight || intersectsTop || intersectsBottom;
  }

  private lineIntersectsVerticalLine(
    x1: number, y1: number, x2: number, y2: number,
    verticalX: number, minY: number, maxY: number
  ): boolean {
    // Check if line segment intersects vertical line at verticalX between minY and maxY
    if (x1 === x2) return false; // Parallel lines

    // Find intersection point
    const t = (verticalX - x1) / (x2 - x1);
    if (t < 0 || t > 1) return false; // Intersection outside segment

    const intersectionY = y1 + t * (y2 - y1);
    return intersectionY >= minY && intersectionY <= maxY;
  }

  private lineIntersectsHorizontalLine(
    x1: number, y1: number, x2: number, y2: number,
    horizontalY: number, minX: number, maxX: number
  ): boolean {
    // Check if line segment intersects horizontal line at horizontalY between minX and maxX
    if (y1 === y2) return false; // Parallel lines

    // Find intersection point
    const t = (horizontalY - y1) / (y2 - y1);
    if (t < 0 || t > 1) return false; // Intersection outside segment

    const intersectionX = x1 + t * (x2 - x1);
    return intersectionX >= minX && intersectionX <= maxX;
  }

  drawEquationGraph(graph: CanvasEquationGraph, equationColor: string = '#dc3545'): void {
    const { screenPoints, worldPoints, shouldDrawAsCurve } = graph;

    if (screenPoints.length === 0) return;

    this.ctx.strokeStyle = equationColor;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    // Adjust first point for canvas offset
    const adjustedFirst = screenPoints[0].add(this.extensionOffset);
    this.ctx.moveTo(adjustedFirst.x, adjustedFirst.y);

    if (shouldDrawAsCurve && screenPoints.length > 2) {
      // Draw as smooth curve for quadratic equations at low zoom
      for (let i = 1; i < screenPoints.length; i++) {
        const adjusted = screenPoints[i].add(this.extensionOffset);

        // Check if this line segment is visible and log it
        const prevPoint = screenPoints[i - 1];
        const currPoint = screenPoints[i];
        const prevWorld = worldPoints[i - 1];
        const currWorld = worldPoints[i];

        if (this.isLineSegmentVisible(prevPoint.x, prevPoint.y, currPoint.x, currPoint.y)) {
          console.log(`📏 Drawing line segment ${i}:
  World: (${prevWorld[0].toFixed(6)}, ${prevWorld[1].toFixed(6)}) → (${currWorld[0].toFixed(6)}, ${currWorld[1].toFixed(6)})
  Screen: (${prevPoint.x.toFixed(2)}, ${prevPoint.y.toFixed(2)}) → (${currPoint.x.toFixed(2)}, ${currPoint.y.toFixed(2)})`);
        }

        this.ctx.lineTo(adjusted.x, adjusted.y);
      }
    } else {
      // Draw as straight line for linear equations or high zoom quadratic
      const lastPoint = screenPoints[screenPoints.length - 1];
      const adjustedLast = lastPoint.add(this.extensionOffset);

      // Log the single line segment for linear equations
      if (screenPoints.length >= 2) {
        const firstPoint = screenPoints[0];
        const firstWorld = worldPoints[0];
        const lastWorld = worldPoints[worldPoints.length - 1];

        if (this.isLineSegmentVisible(firstPoint.x, firstPoint.y, lastPoint.x, lastPoint.y)) {
          console.log(`📏 Drawing single line segment:
  World: (${firstWorld[0].toFixed(6)}, ${firstWorld[1].toFixed(6)}) → (${lastWorld[0].toFixed(6)}, ${lastWorld[1].toFixed(6)})
  Screen: (${firstPoint.x.toFixed(2)}, ${firstPoint.y.toFixed(2)}) → (${lastPoint.x.toFixed(2)}, ${lastPoint.y.toFixed(2)})`);
        }
      }

      this.ctx.lineTo(adjustedLast.x, adjustedLast.y);
    }
    this.ctx.stroke();
  }
}
