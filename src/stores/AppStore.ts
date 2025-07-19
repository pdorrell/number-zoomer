import { makeAutoObservable } from 'mobx';
import { PreciseDecimal } from '../types/Decimal';
import { Point, Rectangle, ScreenDimensions, CoordinateMapping } from '../types/Coordinate';

export class AppStore {
  screenDimensions: ScreenDimensions = { width: 800, height: 600 };
  xyRectangle: Rectangle;
  currentPoint: Point;
  mapping: CoordinateMapping;

  constructor() {
    this.xyRectangle = {
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

    this.mapping = new CoordinateMapping(this.screenDimensions, this.xyRectangle);
    
    makeAutoObservable(this);
  }

  updateScreenDimensions(width: number, height: number) {
    this.screenDimensions = { width, height };
    this.mapping = new CoordinateMapping(this.screenDimensions, this.xyRectangle);
  }

  updateXYRectangle(bottomLeft: Point, topRight: Point) {
    this.xyRectangle = { bottomLeft, topRight };
    this.mapping = new CoordinateMapping(this.screenDimensions, this.xyRectangle);
  }

  updateCurrentPoint(point: Point) {
    this.currentPoint = point;
  }

  zoom(factor: number, centerX?: number, centerY?: number) {
    const center = centerX !== undefined && centerY !== undefined 
      ? this.mapping.screenToXY(centerX, centerY)
      : {
          x: this.xyRectangle.bottomLeft.x.add(this.xyRectangle.topRight.x).div(new PreciseDecimal(2)),
          y: this.xyRectangle.bottomLeft.y.add(this.xyRectangle.topRight.y).div(new PreciseDecimal(2))
        };

    const currentWidth = this.xyRectangle.topRight.x.sub(this.xyRectangle.bottomLeft.x);
    const currentHeight = this.xyRectangle.topRight.y.sub(this.xyRectangle.bottomLeft.y);

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

    this.updateXYRectangle(newBottomLeft, newTopRight);
  }

  pan(deltaX: number, deltaY: number) {
    const xyDelta = this.mapping.screenToXY(deltaX, deltaY);
    const xyOrigin = this.mapping.screenToXY(0, 0);
    
    const dx = xyDelta.x.sub(xyOrigin.x);
    const dy = xyDelta.y.sub(xyOrigin.y);

    const newBottomLeft = {
      x: this.xyRectangle.bottomLeft.x.sub(dx),
      y: this.xyRectangle.bottomLeft.y.sub(dy)
    };

    const newTopRight = {
      x: this.xyRectangle.topRight.x.sub(dx),
      y: this.xyRectangle.topRight.y.sub(dy)
    };

    this.updateXYRectangle(newBottomLeft, newTopRight);
  }

  resetView() {
    this.xyRectangle = {
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
    this.mapping = new CoordinateMapping(this.screenDimensions, this.xyRectangle);
  }

  moveCurrentPointToCenter() {
    const centerX = this.xyRectangle.bottomLeft.x.add(this.xyRectangle.topRight.x).div(new PreciseDecimal(2));
    const centerY = this.xyRectangle.bottomLeft.y.add(this.xyRectangle.topRight.y).div(new PreciseDecimal(2));
    
    this.currentPoint = {
      x: centerX,
      y: centerY
    };
  }
}