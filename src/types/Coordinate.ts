import { PreciseDecimal } from './Decimal';

export interface Point {
  x: PreciseDecimal;
  y: PreciseDecimal;
}

export interface Rectangle {
  bottomLeft: Point;
  topRight: Point;
}

export interface ScreenDimensions {
  width: number;
  height: number;
}

export class CoordinateMapping {
  constructor(
    private screenDimensions: ScreenDimensions,
    private xyRectangle: Rectangle
  ) {}

  screenToXY(screenX: number, screenY: number): Point {
    const xRange = this.xyRectangle.topRight.x.sub(this.xyRectangle.bottomLeft.x);
    const yRange = this.xyRectangle.topRight.y.sub(this.xyRectangle.bottomLeft.y);
    
    const xRatio = screenX / this.screenDimensions.width;
    const yRatio = (this.screenDimensions.height - screenY) / this.screenDimensions.height;
    
    const x = this.xyRectangle.bottomLeft.x.add(xRange.mul(new PreciseDecimal(xRatio)));
    const y = this.xyRectangle.bottomLeft.y.add(yRange.mul(new PreciseDecimal(yRatio)));
    
    return { x, y };
  }

  xyToScreen(point: Point): { x: number; y: number } {
    const xRange = this.xyRectangle.topRight.x.sub(this.xyRectangle.bottomLeft.x);
    const yRange = this.xyRectangle.topRight.y.sub(this.xyRectangle.bottomLeft.y);
    
    const xOffset = point.x.sub(this.xyRectangle.bottomLeft.x);
    const yOffset = point.y.sub(this.xyRectangle.bottomLeft.y);
    
    const screenX = xOffset.div(xRange).toNumber() * this.screenDimensions.width;
    const screenY = this.screenDimensions.height - (yOffset.div(yRange).toNumber() * this.screenDimensions.height);
    
    return { x: screenX, y: screenY };
  }

  getPixelsPerXUnit(): number {
    const xRange = this.xyRectangle.topRight.x.sub(this.xyRectangle.bottomLeft.x);
    return this.screenDimensions.width / xRange.toNumber();
  }

  getPixelsPerYUnit(): number {
    const yRange = this.xyRectangle.topRight.y.sub(this.xyRectangle.bottomLeft.y);
    return this.screenDimensions.height / yRange.toNumber();
  }

  getScreenDimensions(): ScreenDimensions {
    return this.screenDimensions;
  }
}