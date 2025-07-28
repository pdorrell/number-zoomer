import React, { useRef, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { AppStore } from '../stores/AppStore';

interface CanvasRendererProps {
  store: AppStore;
  renderMode?: 'combined' | 'grid' | 'equation';
  equationColor?: string;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = observer(({ store, renderMode = 'combined', equationColor = '#dc3545' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  
  // Use computed properties for grid lines and equation points
  const { horizontalLines, verticalLines } = store.gridRenderer.canvasGridLines;
  const { screenPoints } = store.canvasEquationGraph;
  
  const drawCanvas = useCallback(() => {
    console.log(`[CanvasRenderer] drawCanvas called with renderMode: ${renderMode}, coefficients:`, store.equation.coefficients);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas background (only for grid or combined mode)
    if (renderMode === 'grid' || renderMode === 'combined') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Draw grid lines (only for grid or combined mode)
    if (renderMode === 'grid' || renderMode === 'combined') {
      // Draw grid lines in interleaved thickness order (thickest last)
      // This ensures thicker lines are drawn over thinner lines in the other direction
      const maxThicknessLevels = Math.max(horizontalLines.length, verticalLines.length);
      
      for (let thicknessLevel = 0; thicknessLevel < maxThicknessLevels; thicknessLevel++) {
        // Draw horizontal lines of this thickness level
        if (horizontalLines[thicknessLevel]) {
          horizontalLines[thicknessLevel].forEach(line => {
            // Adjust screen coordinates for canvas offset
            const screenY = line.screenPosition + store.screenViewport.height * store.extension;
            
            ctx.strokeStyle = line.color;
            ctx.lineWidth = line.thickness;
            ctx.beginPath();
            ctx.moveTo(0, screenY);
            ctx.lineTo(canvas.width, screenY);
            ctx.stroke();
          });
        }
        
        // Draw vertical lines of this thickness level
        if (verticalLines[thicknessLevel]) {
          verticalLines[thicknessLevel].forEach(line => {
            // Adjust screen coordinates for canvas offset
            const screenX = line.screenPosition + store.screenViewport.width * store.extension;
            
            ctx.strokeStyle = line.color;
            ctx.lineWidth = line.thickness;
            ctx.beginPath();
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, canvas.height);
            ctx.stroke();
          });
        }
      }
    }
    
    // Draw equation graph (only for equation or combined mode)
    if ((renderMode === 'equation' || renderMode === 'combined') && screenPoints.length > 0) {
      ctx.strokeStyle = equationColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      // Adjust first point for canvas offset
      const adjustedFirstX = screenPoints[0].x + store.screenViewport.width * store.extension;
      const adjustedFirstY = screenPoints[0].y + store.screenViewport.height * store.extension;
      ctx.moveTo(adjustedFirstX, adjustedFirstY);
      
      if (store.equation.shouldDrawAsCurve(store.worldWindow) && screenPoints.length > 2) {
        // Draw as smooth curve for quadratic equations at low zoom
        for (let i = 1; i < screenPoints.length; i++) {
          const adjustedX = screenPoints[i].x + store.screenViewport.width * store.extension;
          const adjustedY = screenPoints[i].y + store.screenViewport.height * store.extension;
          ctx.lineTo(adjustedX, adjustedY);
        }
      } else {
        // Draw as straight line for linear equations or high zoom quadratic
        const lastPoint = screenPoints[screenPoints.length - 1];
        const adjustedLastX = lastPoint.x + store.screenViewport.width * store.extension;
        const adjustedLastY = lastPoint.y + store.screenViewport.height * store.extension;
        ctx.lineTo(adjustedLastX, adjustedLastY);
      }
      ctx.stroke();
    }
  }, [renderMode, equationColor, horizontalLines, verticalLines, screenPoints, store.screenViewport, store.extension]);
  
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
