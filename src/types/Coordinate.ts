import { PreciseDecimal } from './Decimal';
import { ScaledFloat, float } from './ScaledFloat';

export type Point = readonly [x: PreciseDecimal, y: PreciseDecimal];

export interface WorldWindow {
  bottomLeft: Point;
  topRight: Point;
}

export interface ScreenViewport {
  width: number;
  height: number;
}

export interface ScaledWorldMapping {
  screenAnchor: [float, float];
  worldAnchor: Point;
  pixelsPerUnit: ScaledFloat;
  precision: number;
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

  worldToScreenXScaled(worldX: PreciseDecimal): ScaledFloat {
    const xOffset = worldX.sub(this.worldWindow.bottomLeft[0]);
    const pixelsPerUnit = this.getPixelsPerXUnitScaled();
    return pixelsPerUnit.mul(xOffset.toScaledFloat().toFloat());
  }

  worldToScreenYScaled(worldY: PreciseDecimal): ScaledFloat {
    const yOffset = worldY.sub(this.worldWindow.bottomLeft[1]);
    const pixelsPerUnit = this.getPixelsPerYUnitScaled();
    const screenY = pixelsPerUnit.mul(yOffset.toScaledFloat().toFloat());
    return new ScaledFloat(this.screenViewport.height).add(-screenY.toFloat());
  }

  getPixelsPerXUnit(): number {
    const xRange = this.worldWindow.topRight[0].sub(this.worldWindow.bottomLeft[0]);
    return this.screenViewport.width / xRange.toNumber();
  }

  getPixelsPerYUnit(): number {
    const yRange = this.worldWindow.topRight[1].sub(this.worldWindow.bottomLeft[1]);
    return this.screenViewport.height / yRange.toNumber();
  }

  getPixelsPerXUnitScaled(): ScaledFloat {
    const xRange = this.worldWindow.topRight[0].sub(this.worldWindow.bottomLeft[0]);
    const xRangeScaled = xRange.toScaledFloat();
    const screenWidth = new ScaledFloat(this.screenViewport.width);
    return ScaledFloat.fromMantissaExponent(
      screenWidth.getMantissa() / xRangeScaled.getMantissa(),
      screenWidth.getExponent() - xRangeScaled.getExponent()
    );
  }

  getPixelsPerYUnitScaled(): ScaledFloat {
    const yRange = this.worldWindow.topRight[1].sub(this.worldWindow.bottomLeft[1]);
    const yRangeScaled = yRange.toScaledFloat();
    const screenHeight = new ScaledFloat(this.screenViewport.height);
    return ScaledFloat.fromMantissaExponent(
      screenHeight.getMantissa() / yRangeScaled.getMantissa(),
      screenHeight.getExponent() - yRangeScaled.getExponent()
    );
  }

  getScreenViewport(): ScreenViewport {
    return this.screenViewport;
  }

  // Legacy methods for backward compatibility during transition
  screenToXY = this.screenToWorld;
  xyToScreen = this.worldToScreen;
  getScreenDimensions = this.getScreenViewport;
}