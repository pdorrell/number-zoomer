import { makeAutoObservable } from 'mobx';
import { PreciseDecimal } from '../types/Decimal';
import { Point, WorldWindow, ScreenViewport, CoordinateMapping } from '../types/Coordinate';

export class AppStore {
  screenViewport: ScreenViewport = { width: 800, height: 600 };
  worldWindow: WorldWindow;
  currentPoint: Point;
  mapping: CoordinateMapping;

  constructor() {
    this.worldWindow = {
      bottomLeft: { 
        x: new PreciseDecimal(-5, 2), 
        y: new PreciseDecimal(-5, 2) 
      },
      topRight: { 
        x: new PreciseDecimal(5, 2), 
        y: new PreciseDecimal(5, 2) 
      }
    };

    this.currentPoint = {
      x: new PreciseDecimal(0, 3),
      y: new PreciseDecimal(0, 3)
    };

    this.mapping = new CoordinateMapping(this.screenViewport, this.worldWindow);
    
    makeAutoObservable(this);
  }

  updateScreenViewport(width: number, height: number) {
    this.screenViewport = { width, height };
    this.mapping = new CoordinateMapping(this.screenViewport, this.worldWindow);
  }

  updateWorldWindow(bottomLeft: Point, topRight: Point) {
    // Round boundary coordinates according to design spec (precision N+1)
    // Use X dimension only for precision calculation to ensure aspect ratio preservation
    const worldWindowPrecision = this.calculateWorldWindowPrecision() + 1;
    
    this.worldWindow = { 
      bottomLeft: {
        x: bottomLeft.x.setPrecision(worldWindowPrecision),
        y: bottomLeft.y.setPrecision(worldWindowPrecision)
      },
      topRight: {
        x: topRight.x.setPrecision(worldWindowPrecision),
        y: topRight.y.setPrecision(worldWindowPrecision)
      }
    };
    this.mapping = new CoordinateMapping(this.screenViewport, this.worldWindow);
  }

  updateCurrentPoint(point: Point) {
    // Point adopts current world window precision when moved by user
    const currentPrecision = this.calculateCurrentPrecision();
    this.currentPoint = {
      x: point.x.setPrecision(currentPrecision),
      y: point.y.setPrecision(currentPrecision)
    };
  }

  calculateWorldWindowPrecision(): number {
    // Calculate world window precision N based on X dimension only (per design spec)
    // This ensures aspect ratio preservation and identical grid resolution for both axes
    const pixelsPerXUnit = this.mapping.getPixelsPerXUnit();
    
    let maxPrecision = 0;
    
    // Find maximum precision for X dimension that has adequate separation (>= 5 pixels)
    for (let precision = 0; precision <= 15; precision++) {
      const step = Math.pow(10, -precision);
      const separation = pixelsPerXUnit * step;
      
      if (separation >= 5) {
        maxPrecision = precision;
      } else {
        break;
      }
    }
    
    return maxPrecision;
  }

  // Legacy method name for backward compatibility
  calculateMaxGridPrecision(): number {
    return this.calculateWorldWindowPrecision();
  }

  calculateCurrentPrecision(): number {
    // Use world window precision + 1 for point positioning (per design spec)
    return this.calculateWorldWindowPrecision() + 1;
  }

  zoom(factor: number, centerX?: number, centerY?: number) {
    const center = centerX !== undefined && centerY !== undefined 
      ? this.mapping.screenToXY(centerX, centerY)
      : {
          x: this.worldWindow.bottomLeft.x.add(this.worldWindow.topRight.x).div(new PreciseDecimal(2)),
          y: this.worldWindow.bottomLeft.y.add(this.worldWindow.topRight.y).div(new PreciseDecimal(2))
        };

    const currentWidth = this.worldWindow.topRight.x.sub(this.worldWindow.bottomLeft.x);
    const currentHeight = this.worldWindow.topRight.y.sub(this.worldWindow.bottomLeft.y);

    const newWidth = currentWidth.div(new PreciseDecimal(factor));
    const newHeight = currentHeight.div(new PreciseDecimal(factor));

    const newBottomLeft = {
      x: center.x.sub(newWidth.div(new PreciseDecimal(2))),
      y: center.y.sub(newHeight.div(new PreciseDecimal(2)))
    };

    const newTopRight = {
      x: center.x.add(newWidth.div(new PreciseDecimal(2))),
      y: center.y.add(newHeight.div(new PreciseDecimal(2)))
    };

    // updateWorldWindow will handle boundary coordinate rounding
    this.updateWorldWindow(newBottomLeft, newTopRight);
    
    // Note: Current point precision is NOT updated during zoom
    // It only changes when the user moves the point (per design spec)
  }

  pan(deltaX: number, deltaY: number) {
    const worldDelta = this.mapping.screenToXY(deltaX, deltaY);
    const worldOrigin = this.mapping.screenToXY(0, 0);
    
    const dx = worldDelta.x.sub(worldOrigin.x);
    const dy = worldDelta.y.sub(worldOrigin.y);

    const newBottomLeft = {
      x: this.worldWindow.bottomLeft.x.sub(dx),
      y: this.worldWindow.bottomLeft.y.sub(dy)
    };

    const newTopRight = {
      x: this.worldWindow.topRight.x.sub(dx),
      y: this.worldWindow.topRight.y.sub(dy)
    };

    // updateWorldWindow will handle boundary coordinate rounding
    this.updateWorldWindow(newBottomLeft, newTopRight);
  }

  resetView() {
    const defaultBottomLeft = {
      x: new PreciseDecimal(-5, 2), 
      y: new PreciseDecimal(-5, 2) 
    };
    const defaultTopRight = {
      x: new PreciseDecimal(5, 2), 
      y: new PreciseDecimal(5, 2) 
    };
    
    // Use updateWorldWindow to ensure proper boundary rounding
    this.updateWorldWindow(defaultBottomLeft, defaultTopRight);
    
    // Reset current point with appropriate precision (this counts as user action)
    const currentPrecision = this.calculateCurrentPrecision();
    this.currentPoint = {
      x: new PreciseDecimal(0, currentPrecision),
      y: new PreciseDecimal(0, currentPrecision)
    };
  }

  moveCurrentPointToCenter() {
    const centerX = this.worldWindow.bottomLeft.x.add(this.worldWindow.topRight.x).div(new PreciseDecimal(2));
    const centerY = this.worldWindow.bottomLeft.y.add(this.worldWindow.topRight.y).div(new PreciseDecimal(2));
    
    const currentPrecision = this.calculateCurrentPrecision();
    this.currentPoint = {
      x: centerX.setPrecision(currentPrecision),
      y: centerY.setPrecision(currentPrecision)
    };
  }

  // Utility methods for formatted display
  getCurrentPointDisplay(): string {
    return `(${this.currentPoint.x.toString()}, ${this.currentPoint.y.toString()})`;
  }

  getWorldWindowXRangeDisplay(): string {
    return `[${this.worldWindow.bottomLeft.x.toString()}, ${this.worldWindow.topRight.x.toString()}]`;
  }

  getWorldWindowYRangeDisplay(): string {
    return `[${this.worldWindow.bottomLeft.y.toString()}, ${this.worldWindow.topRight.y.toString()}]`;
  }

  // Legacy methods for backward compatibility
  getXRangeDisplay = this.getWorldWindowXRangeDisplay;
  getYRangeDisplay = this.getWorldWindowYRangeDisplay;
}