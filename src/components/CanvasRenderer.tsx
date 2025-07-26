import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { AppStore } from '../stores/AppStore';
import { GridRenderer } from './GridRenderer';

interface CanvasRendererProps {
  store: AppStore;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = observer(({ store }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Memoize grid renderer to prevent recreation on every render
  const gridRenderer = useMemo(() => {
    return new GridRenderer(store.mapping);
  }, [store.mapping]);
  
  // Memoize grid lines and equation points calculation
  const { horizontalLines, verticalLines, screenPoints } = useMemo(() => {
    const maxPrecision = gridRenderer.calculateMaxPrecision();
    const horizontalLines = gridRenderer.calculateHorizontalGridLines(maxPrecision);
    const verticalLines = gridRenderer.calculateVerticalGridLines(maxPrecision);
    const extendedWorldWindow = store.mapping.getExtendedWorldWindow();
    const extendedWidth = store.screenViewport.width * (1 + 2 * store.extension);
    const equationPoints = store.equation.generatePoints(extendedWorldWindow, extendedWidth);
    const screenPoints = equationPoints.map(point => store.mapping.worldToScreen(point));
    
    return { horizontalLines, verticalLines, screenPoints };
  }, [gridRenderer, store.equation, store.worldWindow, store.mapping, store.screenViewport.width, store.extension]);
  
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
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
    
    // Draw equation graph
    if (screenPoints.length > 0) {
      ctx.strokeStyle = "#dc3545";
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
  }, [store.mapping, store.equation, store.worldWindow, horizontalLines, verticalLines, screenPoints]);
  
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
  
  const extendedWidth = store.screenViewport.width * (1 + 2 * store.extension);
  const extendedHeight = store.screenViewport.height * (1 + 2 * store.extension);
  const offsetX = -store.screenViewport.width * store.extension;
  const offsetY = -store.screenViewport.height * store.extension;

  return (
    <canvas
      ref={canvasRef}
      width={extendedWidth}
      height={extendedHeight}
      style={{
        position: 'absolute',
        top: offsetY,
        left: offsetX,
        transform: store.transformState.gridTransform,
        transformOrigin: `${store.screenViewport.width * store.extension}px ${store.screenViewport.height * store.extension}px`
      }}
    />
  );
});
