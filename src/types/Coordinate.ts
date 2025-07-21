import { PreciseDecimal } from './Decimal';

export interface Point {
  x: PreciseDecimal;
  y: PreciseDecimal;
}

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
    
    return { x, y };
  }

  screenToWorldX(screenX: number): PreciseDecimal {
    const xRange = this.worldWindow.topRight.x.sub(this.worldWindow.bottomLeft.x);
    const xRatio = screenX / this.screenViewport.width;
    return this.worldWindow.bottomLeft.x.add(xRange.mul(new PreciseDecimal(xRatio)));
  }

  screenToWorldY(screenY: number): PreciseDecimal {
    const yRange = this.worldWindow.topRight.y.sub(this.worldWindow.bottomLeft.y);
    const yRatio = (this.screenViewport.height - screenY) / this.screenViewport.height;
    return this.worldWindow.bottomLeft.y.add(yRange.mul(new PreciseDecimal(yRatio)));
  }

  worldToScreen(point: Point): { x: number; y: number } {
    const x = this.worldToScreenX(point.x);
    const y = this.worldToScreenY(point.y);
    
    return { x, y };
  }

  worldToScreenX(worldX: PreciseDecimal): number {
    const xRange = this.worldWindow.topRight.x.sub(this.worldWindow.bottomLeft.x);
    const xOffset = worldX.sub(this.worldWindow.bottomLeft.x);
    return xOffset.div(xRange).toNumber() * this.screenViewport.width;
  }

  worldToScreenY(worldY: PreciseDecimal): number {
    const yRange = this.worldWindow.topRight.y.sub(this.worldWindow.bottomLeft.y);
    const yOffset = worldY.sub(this.worldWindow.bottomLeft.y);
    return this.screenViewport.height - (yOffset.div(yRange).toNumber() * this.screenViewport.height);
  }

  getPixelsPerXUnit(): number {
    const xRange = this.worldWindow.topRight.x.sub(this.worldWindow.bottomLeft.x);
    return this.screenViewport.width / xRange.toNumber();
  }

  getPixelsPerYUnit(): number {
    const yRange = this.worldWindow.topRight.y.sub(this.worldWindow.bottomLeft.y);
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