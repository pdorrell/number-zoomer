import { PreciseDecimal } from './Decimal';
import { ScaledFloat, float, int } from './ScaledFloat';

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

export class CoordinateAxisMapping {
  private windowRange: PreciseDecimal;

  constructor(
    public readonly minWindowPosition: PreciseDecimal,
    public readonly maxWindowPosition: PreciseDecimal,
    public readonly screenBase: float,
    public readonly screenRange: float,
    public readonly screenDirection: int = 1
  ) {
    this.windowRange = maxWindowPosition.sub(minWindowPosition);
  }

  screenToWorld(screenPosition: float): PreciseDecimal {
    // Convert screen position to ratio (0-1) based on screen direction
    const screenOffset = screenPosition - this.screenBase;
    const ratio = this.screenDirection > 0 ? 
      screenOffset / this.screenRange : 
      -screenOffset / this.screenRange;
    
    return this.minWindowPosition.add(this.windowRange.mul(new PreciseDecimal(ratio)));
  }

  worldToScreen(worldPosition: PreciseDecimal): number {
    const worldToScreenScaled = this.worldToScreenScaled(worldPosition);
    const result = worldToScreenScaled.toFloatInBounds(-1e10, 1e10);
    return result !== null ? result : 0;
  }

  worldToScreenScaled(worldPosition: PreciseDecimal): ScaledFloat {
    const worldOffset = worldPosition.sub(this.minWindowPosition);
    const pixelsPerUnit = this.getPixelsPerUnitScaled();
    const worldOffsetScaled = worldOffset.toScaledFloat();
    const screenOffset = pixelsPerUnit.mulScaled(worldOffsetScaled);
    
    const screenBase = new ScaledFloat(this.screenBase);
    return this.screenDirection > 0 ? 
      screenBase.add(screenOffset.toFloat()) :
      screenBase.add(-screenOffset.toFloat());
  }

  getPixelsPerUnit(): number {
    const pixelsPerUnitScaled = this.getPixelsPerUnitScaled();
    const result = pixelsPerUnitScaled.toFloatInBounds(-1e308, 1e308);
    return result !== null ? result : 0;
  }

  getPixelsPerUnitScaled(): ScaledFloat {
    const windowRangeScaled = this.windowRange.toScaledFloat();
    const screenRangeScaled = new ScaledFloat(Math.abs(this.screenRange));
    return ScaledFloat.fromMantissaExponent(
      screenRangeScaled.getMantissa() / windowRangeScaled.getMantissa(),
      screenRangeScaled.getExponent() - windowRangeScaled.getExponent()
    );
  }

  worldToScreenRange(worldRange: PreciseDecimal): number {
    // Convert world distance to screen distance, accounting for screen direction
    const pixelsPerUnit = this.getPixelsPerUnit();
    const screenDistance = worldRange.toNumber() * pixelsPerUnit;
    return this.screenDirection > 0 ? screenDistance : -screenDistance;
  }

  positionIsInScreen(screenPosition: float): boolean {
    // Check if screen position is within the axis range
    if (this.screenDirection > 0) {
      // Positive direction: screen goes from screenBase to screenBase + screenRange
      return screenPosition >= this.screenBase && screenPosition <= this.screenBase + this.screenRange;
    } else {
      // Negative direction: screen goes from screenBase to screenBase - screenRange
      return screenPosition <= this.screenBase && screenPosition >= this.screenBase - this.screenRange;
    }
  }
}

export class CoordinateMapping {
  public readonly x: CoordinateAxisMapping;
  public readonly y: CoordinateAxisMapping;

  constructor(
    private screenViewport: ScreenViewport,
    private worldWindow: WorldWindow
  ) {
    this.x = new CoordinateAxisMapping(
      worldWindow.bottomLeft[0],
      worldWindow.topRight[0],
      0,
      screenViewport.width,
      1  // X increases rightward
    );

    this.y = new CoordinateAxisMapping(
      worldWindow.bottomLeft[1],
      worldWindow.topRight[1],
      screenViewport.height,
      screenViewport.height,
      -1  // Y increases upward, screen increases downward
    );
  }

  screenToWorld(screenX: number, screenY: number): Point {
    return [this.x.screenToWorld(screenX), this.y.screenToWorld(screenY)];
  }

  worldToScreen(point: Point): { x: number; y: number } {
    return { x: this.x.worldToScreen(point[0]), y: this.y.worldToScreen(point[1]) };
  }

  getScreenViewport(): ScreenViewport {
    return this.screenViewport;
  }

}
