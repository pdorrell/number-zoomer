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
    const screenX = this.worldToScreenXScaled(worldX);
    const result = screenX.toFloatInBounds(-1e10, 1e10);
    return result !== null ? result : 0;
  }

  worldToScreenY(worldY: PreciseDecimal): number {
    const screenY = this.worldToScreenYScaled(worldY);
    const result = screenY.toFloatInBounds(-1e10, 1e10);
    return result !== null ? result : 0;
  }

  worldToScreenXScaled(worldX: PreciseDecimal): ScaledFloat {
    const xOffset = worldX.sub(this.worldWindow.bottomLeft[0]);
    const pixelsPerUnit = this.getPixelsPerXUnitScaled();
    const xOffsetScaled = xOffset.toScaledFloat();
    return pixelsPerUnit.mulScaled(xOffsetScaled);
  }

  worldToScreenYScaled(worldY: PreciseDecimal): ScaledFloat {
    const yOffset = worldY.sub(this.worldWindow.bottomLeft[1]);
    const pixelsPerUnit = this.getPixelsPerYUnitScaled();
    const yOffsetScaled = yOffset.toScaledFloat();
    const screenY = pixelsPerUnit.mulScaled(yOffsetScaled);
    const screenHeight = new ScaledFloat(this.screenViewport.height);
    return screenHeight.sub(screenY);
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

}
