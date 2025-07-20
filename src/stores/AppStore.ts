import { makeAutoObservable } from 'mobx';
import { PreciseDecimal } from '../types/Decimal';
import { Point, WorldWindow, ScreenViewport, CoordinateMapping } from '../types/Coordinate';
import { Equation, EquationType, EquationConfig, createEquation } from '../types/Equation';
import { ZoomableInterface, ZoomSource } from '../interfaces/ZoomableInterface';

export interface TransformState {
  pointTransform: string;
  gridTransform: string;
  isTransforming: boolean;
  transformType?: 'drag' | 'pan' | 'zoom' | 'slider';
}

export class AppStore implements ZoomableInterface {
  screenViewport: ScreenViewport = { width: 800, height: 600 };
  worldWindow: WorldWindow;
  currentPoint: Point;
  mapping: CoordinateMapping;
  currentEquation: Equation;
  transformState: TransformState;
  
  // New zoom state management
  centrePoint: { x: number; y: number } | null = null;
  zoomingSource: ZoomSource | null = null;
  zoomFactor: number = 1.0;
  private startingWorldWindow: WorldWindow | null = null;
  
  // Preview values for immediate display during zoom
  previewWorldWindow: WorldWindow | null = null;
  
  // Computed property for backward compatibility
  get isZooming(): boolean {
    return this.zoomingSource !== null;
  }

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

    this.currentEquation = createEquation({ type: 'quadratic' });

    this.transformState = {
      pointTransform: '',
      gridTransform: '',
      isTransforming: false,
      transformType: undefined
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
    // Use PreciseDecimal for arbitrary precision instead of floating-point Math.pow
    for (let precision = 0; precision <= 50; precision++) {
      const step = new PreciseDecimal(10, 0).pow(-precision); // 10^(-precision)
      const stepValue = step.toNumber();
      const separation = pixelsPerXUnit * stepValue;
      
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
    if (centerX !== undefined && centerY !== undefined) {
      // Mouse wheel zoom - use cursor position as zoom center
      this.zoomAroundScreenPoint(factor, centerX, centerY);
    } else {
      // Button zoom - choose center based on current point visibility
      if (this.isCurrentPointVisible()) {
        // If current point is visible, zoom should keep it at its current screen position
        const currentPointScreen = this.mapping.worldToScreen(this.currentPoint);
        this.zoomAroundScreenPoint(factor, currentPointScreen.x, currentPointScreen.y);
      } else {
        // If current point is not visible, zoom from center of viewport
        const centerX = this.screenViewport.width / 2;
        const centerY = this.screenViewport.height / 2;
        this.zoomAroundScreenPoint(factor, centerX, centerY);
      }
    }
  }

  private zoomAroundScreenPoint(factor: number, screenX: number, screenY: number) {
    // Convert screen point to world coordinates in current view
    const zoomCenterWorld = this.mapping.screenToWorld(screenX, screenY);

    // Calculate new world window dimensions
    const currentWidth = this.worldWindow.topRight.x.sub(this.worldWindow.bottomLeft.x);
    const currentHeight = this.worldWindow.topRight.y.sub(this.worldWindow.bottomLeft.y);

    const newWidth = currentWidth.div(new PreciseDecimal(factor));
    const newHeight = currentHeight.div(new PreciseDecimal(factor));

    // Calculate screen position ratios
    const xRatio = screenX / this.screenViewport.width;
    const yRatio = screenY / this.screenViewport.height;

    // Calculate new world window bounds so that the zoom center stays at the same screen position
    const newBottomLeft = {
      x: zoomCenterWorld.x.sub(newWidth.mul(new PreciseDecimal(xRatio))),
      y: zoomCenterWorld.y.sub(newHeight.mul(new PreciseDecimal(1 - yRatio)))
    };

    const newTopRight = {
      x: zoomCenterWorld.x.add(newWidth.mul(new PreciseDecimal(1 - xRatio))),
      y: zoomCenterWorld.y.add(newHeight.mul(new PreciseDecimal(yRatio)))
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
  
  // Live preview methods for zoom operations
  getPreviewWorldWindowXRangeDisplay(): string {
    if (this.previewWorldWindow) {
      return `[${this.previewWorldWindow.bottomLeft.x.toString()}, ${this.previewWorldWindow.topRight.x.toString()}]`;
    }
    return this.getWorldWindowXRangeDisplay();
  }
  
  getPreviewWorldWindowYRangeDisplay(): string {
    if (this.previewWorldWindow) {
      return `[${this.previewWorldWindow.bottomLeft.y.toString()}, ${this.previewWorldWindow.topRight.y.toString()}]`;
    }
    return this.getWorldWindowYRangeDisplay();
  }

  isCurrentPointVisible(): boolean {
    // Check if current point is within the current world window
    const pointX = this.currentPoint.x;
    const pointY = this.currentPoint.y;
    
    const withinX = pointX.isWithinInterval(this.worldWindow.bottomLeft.x, this.worldWindow.topRight.x);
    const withinY = pointY.isWithinInterval(this.worldWindow.bottomLeft.y, this.worldWindow.topRight.y);
    
    return withinX && withinY;
  }

  setEquation(config: EquationConfig) {
    this.currentEquation = createEquation(config);
  }

  getEquationType(): EquationType {
    return this.currentEquation.getType();
  }

  getLinearC(): number {
    if (this.currentEquation.getType() === 'linear') {
      return (this.currentEquation as any).getC();
    }
    return 1;
  }

  // Transform methods for responsive UI
  startPointDrag(startScreenPos: { x: number; y: number }) {
    // Point dragging updates continuously, no transform needed
    this.transformState.isTransforming = false;
    this.transformState.pointTransform = '';
    this.transformState.gridTransform = '';
  }

  startWorldWindowDrag() {
    this.transformState.isTransforming = true;
    this.transformState.transformType = 'pan';
    this.transformState.pointTransform = '';
    this.transformState.gridTransform = '';
  }

  updateWorldWindowDragTransform(deltaX: number, deltaY: number) {
    const newTransform = `translate(${deltaX}px, ${deltaY}px)`;
    
    // Only update if transform actually changed to avoid unnecessary re-renders
    if (this.transformState.gridTransform !== newTransform) {
      this.transformState.gridTransform = newTransform;
    }
    if (this.transformState.pointTransform !== newTransform) {
      this.transformState.pointTransform = newTransform; // Point moves with world window
    }
  }

  completeTransform() {
    this.transformState.isTransforming = false;
    this.transformState.transformType = undefined;
    this.transformState.pointTransform = '';
    this.transformState.gridTransform = '';
  }
  
  updateZoomTransform(zoomFactor: number, centerScreen: { x: number; y: number }) {
    const scale = zoomFactor;
    const centerX = centerScreen.x;
    const centerY = centerScreen.y;
    
    // Only apply transform if scale is meaningfully different from 1
    // This prevents tiny scale changes from showing as translations
    let newGridTransform = '';
    if (Math.abs(scale - 1) > 0.01) {
      newGridTransform = `translate(${centerX}px, ${centerY}px) scale(${scale}) translate(${-centerX}px, ${-centerY}px)`;
    }
    
    // Debug the transform being generated
    console.log('Generated grid transform:', newGridTransform, 'scale:', scale);
    
    // Point transform: if point is visible, don't transform; if not visible, simulate center-based zoom
    let newPointTransform = '';
    if (!this.isCurrentPointVisible()) {
      // Calculate how the point would move during center-based zoom
      const currentPointScreen = this.mapping.worldToScreen(this.currentPoint);
      const deltaX = (currentPointScreen.x - centerX) * (scale - 1);
      const deltaY = (currentPointScreen.y - centerY) * (scale - 1);
      newPointTransform = `translate(${deltaX}px, ${deltaY}px)`;
    }
    
    // Only update if transforms actually changed to avoid unnecessary re-renders
    if (this.transformState.gridTransform !== newGridTransform) {
      this.transformState.gridTransform = newGridTransform;
    }
    if (this.transformState.pointTransform !== newPointTransform) {
      this.transformState.pointTransform = newPointTransform;
    }
  }

  // ZoomableInterface implementation
  startZoom(source: ZoomSource, transformType?: 'drag' | 'pan' | 'zoom' | 'slider'): void {
    // Determine center point based on current point visibility
    if (this.isCurrentPointVisible()) {
      // If current point is visible, zoom around it
      this.centrePoint = this.mapping.worldToScreen(this.currentPoint);
    } else {
      // If current point is not visible, zoom from viewport center
      this.centrePoint = {
        x: this.screenViewport.width / 2,
        y: this.screenViewport.height / 2
      };
    }
    
    // Store the starting world window for zoom calculations
    this.startingWorldWindow = {
      bottomLeft: {
        x: this.worldWindow.bottomLeft.x,
        y: this.worldWindow.bottomLeft.y
      },
      topRight: {
        x: this.worldWindow.topRight.x,
        y: this.worldWindow.topRight.y
      }
    };
    
    this.zoomingSource = source;
    this.zoomFactor = 1.0;
    
    // Set up transform state
    this.transformState.isTransforming = true;
    this.transformState.transformType = transformType || 'zoom';
    this.transformState.pointTransform = '';
    this.transformState.gridTransform = '';
  }

  setZoomFactor(source: ZoomSource, zoomFactor: number): void {
    if (!this.zoomingSource || !this.centrePoint || !this.startingWorldWindow) {
      console.warn('setZoomFactor called without active zoom operation');
      return;
    }
    
    if (this.zoomingSource !== source) {
      console.warn(`setZoomFactor called with source '${source}' but current zooming source is '${this.zoomingSource}'`);
      return;
    }
    
    this.zoomFactor = zoomFactor;
    
    // Update CSS transforms for immediate visual feedback
    this.updateZoomTransform(zoomFactor, this.centrePoint);
    
    // Update World Window X&Y display immediately
    this.updateWorldWindowDisplay();
  }

  completeZoom(source: ZoomSource, zoomFactor?: number): void {
    if (!this.zoomingSource || !this.centrePoint || !this.startingWorldWindow) {
      console.warn('completeZoom called without active zoom operation');
      return;
    }
    
    if (this.zoomingSource !== source) {
      console.warn(`completeZoom called with source '${source}' but current zooming source is '${this.zoomingSource}'`);
      return;
    }
    
    const finalZoomFactor = zoomFactor ?? this.zoomFactor;
    
    // Apply the actual coordinate transformation
    this.zoomAroundScreenPoint(finalZoomFactor, this.centrePoint.x, this.centrePoint.y);
    
    // Reset zoom state
    this.zoomingSource = null;
    this.zoomFactor = 1.0;
    this.centrePoint = null;
    this.startingWorldWindow = null;
    this.previewWorldWindow = null;
    
    // Complete transform state
    this.completeTransform();
  }
  
  private updateWorldWindowDisplay(): void {
    if (!this.zoomingSource || !this.centrePoint || !this.startingWorldWindow) {
      this.previewWorldWindow = null;
      return;
    }
    
    // Calculate what the new world window would be based on current zoom factor
    // This is for display purposes only - the actual coordinates aren't updated until completeZoom
    const zoomCenterWorld = this.mapping.screenToWorld(this.centrePoint.x, this.centrePoint.y);
    
    const currentWidth = this.startingWorldWindow.topRight.x.sub(this.startingWorldWindow.bottomLeft.x);
    const currentHeight = this.startingWorldWindow.topRight.y.sub(this.startingWorldWindow.bottomLeft.y);
    
    const newWidth = currentWidth.div(new PreciseDecimal(this.zoomFactor));
    const newHeight = currentHeight.div(new PreciseDecimal(this.zoomFactor));
    
    const xRatio = this.centrePoint.x / this.screenViewport.width;
    const yRatio = this.centrePoint.y / this.screenViewport.height;
    
    // Calculate and store preview world window bounds for immediate display
    const previewBottomLeft = {
      x: zoomCenterWorld.x.sub(newWidth.mul(new PreciseDecimal(xRatio))),
      y: zoomCenterWorld.y.sub(newHeight.mul(new PreciseDecimal(1 - yRatio)))
    };
    
    const previewTopRight = {
      x: zoomCenterWorld.x.add(newWidth.mul(new PreciseDecimal(1 - xRatio))),
      y: zoomCenterWorld.y.add(newHeight.mul(new PreciseDecimal(yRatio)))
    };
    
    // Store preview values as observable properties for immediate UI updates
    this.previewWorldWindow = {
      bottomLeft: previewBottomLeft,
      topRight: previewTopRight
    };
  }

  // Legacy methods for backward compatibility
  getXRangeDisplay = this.getWorldWindowXRangeDisplay;
  getYRangeDisplay = this.getWorldWindowYRangeDisplay;
}