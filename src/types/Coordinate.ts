import { PreciseDecimal } from './Decimal';

export type Point = readonly [x: PreciseDecimal, y: PreciseDecimal];

export interface WorldWindow {
  bottomLeft: Point;
  topRight: Point;
}

export interface ScreenViewport {
  width: number;
  height: number;
}

export class CoordinateMapping {
  constructor(
    private screenViewport: ScreenViewport,
    private worldWindow: WorldWindow
  ) {}

  screenToWorld(screenX: number, screenY: number): Point {
    const x = this.screenToWorldX(screenX);
    const y = this.screenToWorldY(screenY);
    
    return [x, y];
  }

  screenToWorldX(screenX: number): PreciseDecimal {
    const xRange = this.worldWindow.topRight[0].sub(this.worldWindow.bottomLeft[0]);
    const xRatio = screenX / this.screenViewport.width;
    return this.worldWindow.bottomLeft[0].add(xRange.mul(new PreciseDecimal(xRatio)));
  }

  screenToWorldY(screenY: number): PreciseDecimal {
    const yRange = this.worldWindow.topRight[1].sub(this.worldWindow.bottomLeft[1]);
    const yRatio = (this.screenViewport.height - screenY) / this.screenViewport.height;
    return this.worldWindow.bottomLeft[1].add(yRange.mul(new PreciseDecimal(yRatio)));
  }

  worldToScreen(point: Point): { x: number; y: number } {
    const x = this.worldToScreenX(point[0]);
    const y = this.worldToScreenY(point[1]);
    
    return { x, y };
  }

  worldToScreenX(worldX: PreciseDecimal): number {
    const xRange = this.worldWindow.topRight[0].sub(this.worldWindow.bottomLeft[0]);
    const xOffset = worldX.sub(this.worldWindow.bottomLeft[0]);
    return xOffset.div(xRange).toNumber() * this.screenViewport.width;
  }

  worldToScreenY(worldY: PreciseDecimal): number {
    const yRange = this.worldWindow.topRight[1].sub(this.worldWindow.bottomLeft[1]);
    const yOffset = worldY.sub(this.worldWindow.bottomLeft[1]);
    return this.screenViewport.height - (yOffset.div(yRange).toNumber() * this.screenViewport.height);
  }

  getPixelsPerXUnit(): number {
    const xRange = this.worldWindow.topRight[0].sub(this.worldWindow.bottomLeft[0]);
    return this.screenViewport.width / xRange.toNumber();
  }

  getPixelsPerYUnit(): number {
    const yRange = this.worldWindow.topRight[1].sub(this.worldWindow.bottomLeft[1]);
    return this.screenViewport.height / yRange.toNumber();
  }

  getScreenViewport(): ScreenViewport {
    return this.screenViewport;
  }

  // Legacy methods for backward compatibility during transition
  screenToXY = this.screenToWorld;
  xyToScreen = this.worldToScreen;
  getScreenDimensions = this.getScreenViewport;
}