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
    const xRange = this.worldWindow.topRight.x.sub(this.worldWindow.bottomLeft.x);
    const yRange = this.worldWindow.topRight.y.sub(this.worldWindow.bottomLeft.y);
    
    const xRatio = screenX / this.screenViewport.width;
    const yRatio = (this.screenViewport.height - screenY) / this.screenViewport.height;
    
    const x = this.worldWindow.bottomLeft.x.add(xRange.mul(new PreciseDecimal(xRatio)));
    const y = this.worldWindow.bottomLeft.y.add(yRange.mul(new PreciseDecimal(yRatio)));
    
    return { x, y };
  }

  worldToScreen(point: Point): { x: number; y: number } {
    const xRange = this.worldWindow.topRight.x.sub(this.worldWindow.bottomLeft.x);
    const yRange = this.worldWindow.topRight.y.sub(this.worldWindow.bottomLeft.y);
    
    const xOffset = point.x.sub(this.worldWindow.bottomLeft.x);
    const yOffset = point.y.sub(this.worldWindow.bottomLeft.y);
    
    const screenX = xOffset.div(xRange).toNumber() * this.screenViewport.width;
    const screenY = this.screenViewport.height - (yOffset.div(yRange).toNumber() * this.screenViewport.height);
    
    return { x: screenX, y: screenY };
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