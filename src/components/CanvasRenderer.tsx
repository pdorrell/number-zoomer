import React, { useRef, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { AppStore } from '../stores/AppStore';
import { ScreenVector } from '../types/CanvasTypes';
import { CanvasContext } from './CanvasContext';

interface CanvasRendererProps {
  store: AppStore;
  renderMode?: 'combined' | 'grid' | 'equation';
  equationColor?: string;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = observer(({ store, renderMode = 'combined', equationColor = '#dc3545' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  
  // Use computed properties for grid lines and equation points
  const gridLines = store.gridRenderer.canvasGridLines;
  const equationGraph = store.canvasEquationGraph;
  
  // Define extension offset vector
  const extensionOffset = new ScreenVector(
    store.screenViewport.width * store.extension,
    store.screenViewport.height * store.extension
  );
  
  const drawCanvas = useCallback(() => {
    console.log(`[CanvasRenderer] drawCanvas called with renderMode: ${renderMode}, coefficients:`, store.equation.coefficients);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const canvasContext = new CanvasContext(canvas, ctx, extensionOffset);
    
    // Clear canvas
    canvasContext.clear();
    
    // Draw background and grid lines (only for grid or combined mode)
    if (renderMode === 'grid' || renderMode === 'combined') {
      canvasContext.drawBackground();
      canvasContext.drawGridLines(gridLines);
    }
    
    // Draw equation graph (only for equation or combined mode)
    if (renderMode === 'equation' || renderMode === 'combined') {
      canvasContext.drawEquationGraph(equationGraph, equationColor);
    }
  }, [renderMode, equationColor, gridLines, equationGraph, extensionOffset]);
  
  // Redraw canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);
  
  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas size to include extension beyond viewport
    const extendedWidth = store.screenViewport.width * (1 + 2 * store.extension);
    const extendedHeight = store.screenViewport.height * (1 + 2 * store.extension);
    canvas.width = extendedWidth;
    canvas.height = extendedHeight;
    
    // Redraw after resize
    drawCanvas();
  }, [store.screenViewport.width, store.screenViewport.height, store.extension, drawCanvas]);
  
  const canvasExtendedWidth = store.screenViewport.width * (1 + 2 * store.extension);
  const canvasExtendedHeight = store.screenViewport.height * (1 + 2 * store.extension);
  const offsetX = -store.screenViewport.width * store.extension;
  const offsetY = -store.screenViewport.height * store.extension;

  return (
    <canvas
      ref={canvasRef}
      width={canvasExtendedWidth}
      height={canvasExtendedHeight}
      style={{
        position: 'absolute',
        top: offsetY,
        left: offsetX,
        transform: store.transformState.gridTransform,
        transformOrigin: `${store.screenViewport.width * store.extension}px ${store.screenViewport.height * store.extension}px`,
        ...(renderMode === 'equation' && { pointerEvents: 'none' }) // Equation canvas shouldn't intercept interactions
      }}
    />
  );
});
