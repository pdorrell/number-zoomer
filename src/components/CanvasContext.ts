import { ScreenVector, CanvasGridLines, CanvasEquationGraph } from '@/types/CanvasTypes';

export class CanvasContext {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private extensionOffset: ScreenVector;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, extensionOffset: ScreenVector) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.extensionOffset = extensionOffset;
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

  drawEquationGraph(graph: CanvasEquationGraph, equationColor: string = '#dc3545'): void {
    const { screenPoints, shouldDrawAsCurve } = graph;

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
        this.ctx.lineTo(adjusted.x, adjusted.y);
      }
    } else {
      // Draw as straight line for linear equations or high zoom quadratic
      const lastPoint = screenPoints[screenPoints.length - 1];
      const adjustedLast = lastPoint.add(this.extensionOffset);
      this.ctx.lineTo(adjustedLast.x, adjustedLast.y);
    }
    this.ctx.stroke();
  }
}
