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

  private isPointYVisible(y: number): boolean {
    // Extended viewport includes extension beyond the normal viewport
    // Extension offset represents the negative offset, so actual extended range is:
    const minY = this.extensionOffset.y; // This is negative
    const maxY = this.screenViewport.height - this.extensionOffset.y; // This accounts for extension
    return y >= minY && y <= maxY;
  }

  private findVisibleLineSegment(screenPoints: any[], worldPoints: any[]): { startIdx: number; endIdx: number } | null {
    if (screenPoints.length === 0) return null;

    // Find starting point
    let startIdx = -1;
    
    // If first point is visible, use it
    if (this.isPointYVisible(screenPoints[0].y)) {
      startIdx = 0;
    } else {
      // Find last invisible point where next point is visible OR crosses visible area
      for (let i = 0; i < screenPoints.length - 1; i++) {
        const currY = screenPoints[i].y;
        const nextY = screenPoints[i + 1].y;
        
        if (!this.isPointYVisible(currY)) {
          // Next point is visible, or they're on opposite sides of visible area
          if (this.isPointYVisible(nextY) || 
              (currY < this.extensionOffset.y && nextY > this.screenViewport.height - this.extensionOffset.y) ||
              (currY > this.screenViewport.height - this.extensionOffset.y && nextY < this.extensionOffset.y)) {
            startIdx = i;
            break;
          }
        }
      }
    }
    
    if (startIdx === -1) return null; // No visible segment found

    // Find ending point
    let endIdx = -1;
    
    // If last point is visible, use it
    if (this.isPointYVisible(screenPoints[screenPoints.length - 1].y)) {
      endIdx = screenPoints.length - 1;
    } else {
      // Search backwards from the end
      for (let i = screenPoints.length - 1; i > 0; i--) {
        const currY = screenPoints[i].y;
        const prevY = screenPoints[i - 1].y;
        
        if (!this.isPointYVisible(currY)) {
          // Previous point is visible, or they're on opposite sides of visible area
          if (this.isPointYVisible(prevY) ||
              (currY < this.extensionOffset.y && prevY > this.screenViewport.height - this.extensionOffset.y) ||
              (currY > this.screenViewport.height - this.extensionOffset.y && prevY < this.extensionOffset.y)) {
            endIdx = i;
            break;
          }
        }
      }
    }
    
    if (endIdx === -1 || endIdx < startIdx) return null;
    
    return { startIdx, endIdx };
  }

  drawEquationGraph(graph: CanvasEquationGraph, equationColor: string = '#dc3545'): void {
    const { screenPoints, worldPoints, shouldDrawAsCurve } = graph;

    if (screenPoints.length === 0) return;

    this.ctx.strokeStyle = equationColor;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    if (shouldDrawAsCurve && screenPoints.length > 2) {
      // Draw as smooth curve for quadratic equations at low zoom
      const adjustedFirst = screenPoints[0].add(this.extensionOffset);
      this.ctx.moveTo(adjustedFirst.x, adjustedFirst.y);
      
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
      // Find the visible segment to draw
      const visibleSegment = this.findVisibleLineSegment(screenPoints, worldPoints);
      
      if (visibleSegment) {
        const startPoint = screenPoints[visibleSegment.startIdx];
        const endPoint = screenPoints[visibleSegment.endIdx];
        const startWorld = worldPoints[visibleSegment.startIdx];
        const endWorld = worldPoints[visibleSegment.endIdx];
        
        const adjustedStart = startPoint.add(this.extensionOffset);
        const adjustedEnd = endPoint.add(this.extensionOffset);
        
        console.log(`📏 Drawing visible line segment (${visibleSegment.startIdx} → ${visibleSegment.endIdx}):
  World: (${startWorld[0].toFixed(6)}, ${startWorld[1].toFixed(6)}) → (${endWorld[0].toFixed(6)}, ${endWorld[1].toFixed(6)})
  Screen: (${startPoint.x.toFixed(2)}, ${startPoint.y.toFixed(2)}) → (${endPoint.x.toFixed(2)}, ${endPoint.y.toFixed(2)})`);
        
        this.ctx.moveTo(adjustedStart.x, adjustedStart.y);
        this.ctx.lineTo(adjustedEnd.x, adjustedEnd.y);
      } else {
        console.log('📏 No visible line segment found - not drawing anything');
        return; // Don't stroke if nothing to draw
      }
    }
    this.ctx.stroke();
  }
}
