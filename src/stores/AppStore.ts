import { makeAutoObservable } from 'mobx';
import { PreciseDecimal } from '../types/Decimal';
import { Point, WorldWindow, ScreenViewport, CoordinateMapping } from '../types/Coordinate';
import { Equation, EquationType, EquationConfig, createEquation } from '../types/Equation';
import { ZoomableInterface, ZoomSource } from '../interfaces/ZoomableInterface';
import { ScaledFloat } from '../types/ScaledFloat';

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

  // Preview values for immediate display during world window drag
  dragPreviewWorldWindow: WorldWindow | null = null;

  // State for intermediate redraws during drag
  private lastIntermediateRedrawTime: number = 0;
  private dragStartTime: number = 0;
  private appliedIntermediateDelta: { x: number; y: number } = { x: 0, y: 0 };
  private readonly INTERMEDIATE_REDRAW_INTERVAL_MS = 300;

  // Computed property for backward compatibility
  get isZooming(): boolean {
    return this.zoomingSource !== null;
  }

  constructor() {
    this.worldWindow = {
      bottomLeft: [
        new PreciseDecimal(-5, 2),
        new PreciseDecimal(-5, 2)
      ],
      topRight: [
        new PreciseDecimal(5, 2),
        new PreciseDecimal(5, 2)
      ]
    };

    this.currentPoint = [
      new PreciseDecimal(0, 3),
      new PreciseDecimal(0, 3)
    ];

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
    // Use high precision for world window coordinates to avoid forcing grid alignment
    // World window coordinates should not snap to grid lines during zoom operations
    const worldWindowPrecision = Math.max(15, this.calculateWorldWindowPrecision() + 5);

    this.worldWindow = {
      bottomLeft: [
        bottomLeft[0].quantize(worldWindowPrecision),
        bottomLeft[1].quantize(worldWindowPrecision)
      ],
      topRight: [
        topRight[0].quantize(worldWindowPrecision),
        topRight[1].quantize(worldWindowPrecision)
      ]
    };
    this.mapping = new CoordinateMapping(this.screenViewport, this.worldWindow);
  }

  updateCurrentPoint(point: Point) {
    // Point adopts current world window precision when moved by user
    const currentPrecision = this.calculateCurrentPrecision();
    this.currentPoint = [
      point[0].quantize(currentPrecision),
      point[1].quantize(currentPrecision)
    ];
  }

  calculateWorldWindowPrecision(): number {
    // Calculate world window precision N based on X dimension only (per design spec)
    // This ensures aspect ratio preservation and identical grid resolution for both axes
    const pixelsPerXUnit = this.mapping.x.getPixelsPerUnit();
    const minSeparation = 5;

    // Direct calculation: maxPrecision = floor(log10(pixelsPerXUnit / minSeparation))
    // This replaces the loop that finds the highest precision where separation >= minSeparation
    const maxPrecision = Math.floor(Math.log10(pixelsPerXUnit / minSeparation));

    // Ensure we don't exceed reasonable bounds and handle edge cases
    return Math.max(0, Math.min(1000, maxPrecision));
  }

  // Legacy method name for backward compatibility
  calculateMaxGridPrecision(): number {
    return this.calculateWorldWindowPrecision();
  }

  calculateCurrentPrecision(): number {
    // Use world window precision + 1 for point positioning (per design spec)
    return this.calculateWorldWindowPrecision() + 1;
  }


  private zoomAroundScreenPoint(factor: number, screenX: number, screenY: number) {
    // Convert screen point to world coordinates in current view
    const zoomCenterWorld = this.mapping.screenToWorld(screenX, screenY);

    // Calculate new world window dimensions
    const currentWidth = this.worldWindow.topRight[0].sub(this.worldWindow.bottomLeft[0]);
    const currentHeight = this.worldWindow.topRight[1].sub(this.worldWindow.bottomLeft[1]);

    const newWidth = currentWidth.div(new PreciseDecimal(factor));
    const newHeight = currentHeight.div(new PreciseDecimal(factor));

    // Calculate screen position ratios
    const xRatio = screenX / this.screenViewport.width;
    const yRatio = screenY / this.screenViewport.height;

    // Calculate new world window bounds so that the zoom center stays at the same screen position
    const newBottomLeft: Point = [
      zoomCenterWorld[0].sub(newWidth.mul(new PreciseDecimal(xRatio))),
      zoomCenterWorld[1].sub(newHeight.mul(new PreciseDecimal(1 - yRatio)))
    ];

    const newTopRight: Point = [
      zoomCenterWorld[0].add(newWidth.mul(new PreciseDecimal(1 - xRatio))),
      zoomCenterWorld[1].add(newHeight.mul(new PreciseDecimal(yRatio)))
    ];

    // updateWorldWindow will handle boundary coordinate rounding
    this.updateWorldWindow(newBottomLeft, newTopRight);

    // Note: Current point precision is NOT updated during zoom
    // It only changes when the user moves the point (per design spec)
  }

  pan(deltaX: number, deltaY: number) {
    const worldDelta = this.mapping.screenToWorld(deltaX, deltaY);
    const worldOrigin = this.mapping.screenToWorld(0, 0);

    const dx = worldDelta[0].sub(worldOrigin[0]);
    const dy = worldDelta[1].sub(worldOrigin[1]);

    const newBottomLeft: Point = [
      this.worldWindow.bottomLeft[0].sub(dx),
      this.worldWindow.bottomLeft[1].sub(dy)
    ];

    const newTopRight: Point = [
      this.worldWindow.topRight[0].sub(dx),
      this.worldWindow.topRight[1].sub(dy)
    ];

    // updateWorldWindow will handle boundary coordinate rounding
    this.updateWorldWindow(newBottomLeft, newTopRight);
  }

  resetView() {
    const defaultBottomLeft: Point = [
      new PreciseDecimal(-5, 2),
      new PreciseDecimal(-5, 2)
    ];
    const defaultTopRight: Point = [
      new PreciseDecimal(5, 2),
      new PreciseDecimal(5, 2)
    ];

    // Use updateWorldWindow to ensure proper boundary rounding
    this.updateWorldWindow(defaultBottomLeft, defaultTopRight);

    // Reset current point with appropriate precision (this counts as user action)
    const currentPrecision = this.calculateCurrentPrecision();
    this.currentPoint = [
      new PreciseDecimal(0, currentPrecision),
      new PreciseDecimal(0, currentPrecision)
    ];
  }

  moveCurrentPointToCenter() {
    // Calculate current world window dimensions
    const windowWidth = this.worldWindow.topRight[0].sub(this.worldWindow.bottomLeft[0]);
    const windowHeight = this.worldWindow.topRight[1].sub(this.worldWindow.bottomLeft[1]);

    // Calculate half dimensions for centering
    const halfWidth = windowWidth.div(new PreciseDecimal(2));
    const halfHeight = windowHeight.div(new PreciseDecimal(2));

    // Calculate new world window centered on current point
    const newBottomLeft: Point = [
      this.currentPoint[0].sub(halfWidth),
      this.currentPoint[1].sub(halfHeight)
    ];
    const newTopRight: Point = [
      this.currentPoint[0].add(halfWidth),
      this.currentPoint[1].add(halfHeight)
    ];

    // Update the world window to center on current point
    this.updateWorldWindow(newBottomLeft, newTopRight);
  }

  // Utility methods for formatted display
  getCurrentPointDisplay(): string {
    // Display current point at its stored precision, not quantized to current window precision
    // Current point precision only changes when user actually moves the point
    const x = this.currentPoint[0].toString();
    const y = this.currentPoint[1].toString();
    return `(${x}, ${y})`;
  }

  getWorldWindowXRangeDisplay(): string {
    const windowDP = this.calculateWorldWindowPrecision();
    const bottomLeft = this.worldWindow.bottomLeft[0].quantize(windowDP).toString();
    const topRight = this.worldWindow.topRight[0].quantize(windowDP).toString();
    return `[${bottomLeft}, ${topRight}]`;
  }

  getWorldWindowYRangeDisplay(): string {
    const windowDP = this.calculateWorldWindowPrecision();
    const bottomLeft = this.worldWindow.bottomLeft[1].quantize(windowDP).toString();
    const topRight = this.worldWindow.topRight[1].quantize(windowDP).toString();
    return `[${bottomLeft}, ${topRight}]`;
  }

  // Live preview methods for zoom and drag operations
  getPreviewWorldWindowXRangeDisplay(): string {
    // Check for zoom preview first, then drag preview
    const previewWindow = this.previewWorldWindow || this.dragPreviewWorldWindow;
    if (previewWindow) {
      const windowDP = this.calculateWorldWindowPrecision();
      const bottomLeft = previewWindow.bottomLeft[0].quantize(windowDP).toString();
      const topRight = previewWindow.topRight[0].quantize(windowDP).toString();
      return `[${bottomLeft}, ${topRight}]`;
    }
    return this.getWorldWindowXRangeDisplay();
  }

  getPreviewWorldWindowYRangeDisplay(): string {
    // Check for zoom preview first, then drag preview
    const previewWindow = this.previewWorldWindow || this.dragPreviewWorldWindow;
    if (previewWindow) {
      const windowDP = this.calculateWorldWindowPrecision();
      const bottomLeft = previewWindow.bottomLeft[1].quantize(windowDP).toString();
      const topRight = previewWindow.topRight[1].quantize(windowDP).toString();
      return `[${bottomLeft}, ${topRight}]`;
    }
    return this.getWorldWindowYRangeDisplay();
  }

  // Live preview method for px/unit during zoom operations
  getPreviewPixelsPerXUnit(): number {
    if (this.previewWorldWindow) {
      // Calculate px/unit based on preview world window using ScaledFloat
      const previewWidth = this.previewWorldWindow.topRight[0].sub(this.previewWorldWindow.bottomLeft[0]);
      const previewWidthScaled = previewWidth.toScaledFloat();
      const screenWidth = new ScaledFloat(this.screenViewport.width);

      const ratio = ScaledFloat.fromMantissaExponent(
        screenWidth.getMantissa() / previewWidthScaled.getMantissa(),
        screenWidth.getExponent() - previewWidthScaled.getExponent()
      );

      // Convert to number for UI display (safe as this is for display purposes)
      const result = ratio.toFloatInBounds(-1e308, 1e308);
      return result !== null ? result : this.mapping.x.getPixelsPerUnit();
    }
    return this.mapping.x.getPixelsPerUnit();
  }

  isCurrentPointVisible(): boolean {
    // Check if current point is within the current world window
    const pointX = this.currentPoint[0];
    const pointY = this.currentPoint[1];

    const withinX = pointX.isWithinInterval(this.worldWindow.bottomLeft[0], this.worldWindow.topRight[0]);
    const withinY = pointY.isWithinInterval(this.worldWindow.bottomLeft[1], this.worldWindow.topRight[1]);

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

    // Store the starting world window for drag preview calculations
    this.dragPreviewWorldWindow = null; // Will be calculated in updateWorldWindowDragTransform
    
    // Initialize intermediate redraw timing
    const now = Date.now();
    this.dragStartTime = now;
    this.lastIntermediateRedrawTime = now;
    this.appliedIntermediateDelta = { x: 0, y: 0 };
  }

  updateWorldWindowDragTransform(deltaX: number, deltaY: number) {
    // Check if enough time has passed for an intermediate redraw
    const now = Date.now();
    const timeSinceLastRedraw = now - this.lastIntermediateRedrawTime;
    
    if (timeSinceLastRedraw >= this.INTERMEDIATE_REDRAW_INTERVAL_MS) {
      // Perform intermediate redraw: apply current delta to actual coordinates
      this.performIntermediateDragRedraw(deltaX, deltaY);
      this.lastIntermediateRedrawTime = now;
      
      // After intermediate redraw, CSS transforms should show remaining delta from new baseline
      const remainingDeltaX = deltaX - this.appliedIntermediateDelta.x;
      const remainingDeltaY = deltaY - this.appliedIntermediateDelta.y;
      
      if (remainingDeltaX !== 0 || remainingDeltaY !== 0) {
        const newTransform = `translate(${remainingDeltaX}px, ${remainingDeltaY}px)`;
        this.transformState.gridTransform = newTransform;
        this.transformState.pointTransform = newTransform;
      } else {
        this.transformState.gridTransform = '';
        this.transformState.pointTransform = '';
      }
    } else {
      // Continue with CSS transforms for immediate feedback  
      // CSS transform should show delta relative to what's already been applied
      const effectiveDeltaX = deltaX - this.appliedIntermediateDelta.x;
      const effectiveDeltaY = deltaY - this.appliedIntermediateDelta.y;
      const newTransform = `translate(${effectiveDeltaX}px, ${effectiveDeltaY}px)`;

      // Only update if transform actually changed to avoid unnecessary re-renders
      if (this.transformState.gridTransform !== newTransform) {
        this.transformState.gridTransform = newTransform;
      }
      if (this.transformState.pointTransform !== newTransform) {
        this.transformState.pointTransform = newTransform; // Point moves with world window
      }
    }

    // Always calculate drag preview world window for live coordinate display
    // Use the remaining delta (not applied through intermediate redraws) for preview
    const remainingDeltaX = deltaX - this.appliedIntermediateDelta.x;
    const remainingDeltaY = deltaY - this.appliedIntermediateDelta.y;
    
    const worldDelta = this.mapping.screenToWorld(remainingDeltaX, remainingDeltaY);
    const worldOrigin = this.mapping.screenToWorld(0, 0);

    const dx = worldDelta[0].sub(worldOrigin[0]);
    const dy = worldDelta[1].sub(worldOrigin[1]);

    this.dragPreviewWorldWindow = {
      bottomLeft: [
        this.worldWindow.bottomLeft[0].sub(dx),
        this.worldWindow.bottomLeft[1].sub(dy)
      ],
      topRight: [
        this.worldWindow.topRight[0].sub(dx),
        this.worldWindow.topRight[1].sub(dy)
      ]
    };
  }

  completeTransform() {
    this.transformState.isTransforming = false;
    this.transformState.transformType = undefined;
    this.transformState.pointTransform = '';
    this.transformState.gridTransform = '';

    // Clear drag preview
    this.dragPreviewWorldWindow = null;
    
    // Reset intermediate redraw timing state
    this.lastIntermediateRedrawTime = 0;
    this.dragStartTime = 0;
    this.appliedIntermediateDelta = { x: 0, y: 0 };
  }

  private performIntermediateDragRedraw(deltaX: number, deltaY: number) {
    // Calculate the incremental delta since last intermediate redraw
    const incrementalDeltaX = deltaX - this.appliedIntermediateDelta.x;
    const incrementalDeltaY = deltaY - this.appliedIntermediateDelta.y;
    
    // Apply only the incremental delta to actual coordinates, triggering a redraw
    this.pan(incrementalDeltaX, incrementalDeltaY);
    
    // Track what we've applied so far
    this.appliedIntermediateDelta = { x: deltaX, y: deltaY };
    
    // Don't clear dragPreviewWorldWindow here - it will be recalculated correctly
    // in the main updateWorldWindowDragTransform method with the new baseline
  }

  completeDragWithDelta(deltaX: number, deltaY: number) {
    // Calculate the remaining delta that hasn't been applied through intermediate redraws
    const remainingDeltaX = deltaX - this.appliedIntermediateDelta.x;
    const remainingDeltaY = deltaY - this.appliedIntermediateDelta.y;
    
    // Apply only the remaining delta
    if (remainingDeltaX !== 0 || remainingDeltaY !== 0) {
      this.pan(remainingDeltaX, remainingDeltaY);
    }
    
    // Reset intermediate drag state
    this.appliedIntermediateDelta = { x: 0, y: 0 };
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
    console.log('Generated grid transform');

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
      bottomLeft: [
        this.worldWindow.bottomLeft[0],
        this.worldWindow.bottomLeft[1]
      ],
      topRight: [
        this.worldWindow.topRight[0],
        this.worldWindow.topRight[1]
      ]
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

    const currentWidth = this.startingWorldWindow.topRight[0].sub(this.startingWorldWindow.bottomLeft[0]);
    const currentHeight = this.startingWorldWindow.topRight[1].sub(this.startingWorldWindow.bottomLeft[1]);

    const newWidth = currentWidth.div(new PreciseDecimal(this.zoomFactor));
    const newHeight = currentHeight.div(new PreciseDecimal(this.zoomFactor));

    const xRatio = this.centrePoint.x / this.screenViewport.width;
    const yRatio = this.centrePoint.y / this.screenViewport.height;

    // Calculate and store preview world window bounds for immediate display
    const previewBottomLeft: Point = [
      zoomCenterWorld[0].sub(newWidth.mul(new PreciseDecimal(xRatio))),
      zoomCenterWorld[1].sub(newHeight.mul(new PreciseDecimal(1 - yRatio)))
    ];

    const previewTopRight: Point = [
      zoomCenterWorld[0].add(newWidth.mul(new PreciseDecimal(1 - xRatio))),
      zoomCenterWorld[1].add(newHeight.mul(new PreciseDecimal(yRatio)))
    ];

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
