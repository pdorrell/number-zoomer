export type ZoomSource = 'pinch' | 'slider' | 'zoomInButton' | 'zoomOutButton';

export interface ZoomableInterface {
  /**
   * Start a zoom operation, establishing the center point and initial state
   * @param source The source of the zoom operation
   * @param transformType Optional transform type for the operation
   */
  startZoom(source: ZoomSource, transformType?: 'drag' | 'pan' | 'zoom' | 'slider'): void;

  /**
   * Set the zoom factor relative to the starting point (1.0 = no zoom)
   * @param source The source of the zoom operation (must match current zooming source)
   * @param zoomFactor The zoom factor relative to the start of the zoom operation
   */
  setZoomFactor(source: ZoomSource, zoomFactor: number): void;

  /**
   * Complete the zoom operation with the given factor, or use the last set factor
   * @param source The source of the zoom operation (must match current zooming source)
   * @param zoomFactor Optional zoom factor to use, otherwise uses last setZoomFactor value
   */
  completeZoom(source: ZoomSource, zoomFactor?: number): void;
}
