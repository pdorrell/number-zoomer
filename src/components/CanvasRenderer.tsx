import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { AppStore } from '../stores/AppStore';
import { GridRenderer } from './GridRenderer';

interface CanvasRendererProps {
  store: AppStore;
  shouldSkipCalculation: boolean;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = observer(({ store, shouldSkipCalculation }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Memoize grid renderer to prevent recreation on every render
  const gridRenderer = useMemo(() => new GridRenderer(store.mapping), [store.mapping]);
  
  // Memoize grid lines calculation
  const { horizontalLines, verticalLines } = useMemo(() => {
    if (shouldSkipCalculation) {
      return { horizontalLines: [], verticalLines: [] };
    }
    return {
      horizontalLines: gridRenderer.calculateHorizontalGridLines(),
      verticalLines: gridRenderer.calculateVerticalGridLines()
    };
  }, [shouldSkipCalculation, gridRenderer]);
  
  // Memoize equation graph points
  const equationScreenWidth = shouldSkipCalculation ? store.screenViewport.width / 4 : store.screenViewport.width;
  const screenPoints = useMemo(() => {
    const equationPoints = store.currentEquation.generatePoints(store.worldWindow, equationScreenWidth);
    return equationPoints.map(point => store.mapping.worldToScreen(point));
  }, [store.currentEquation, store.worldWindow, store.mapping, equationScreenWidth]);
  
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
    
    // Draw grid lines
    // Horizontal lines
    horizontalLines.forEach(line => {
      const screenY = store.mapping.worldToScreen({ 
        x: store.worldWindow.bottomLeft.x, 
        y: line.position 
      }).y;
      
      ctx.strokeStyle = line.isThick ? "#495057" : "#adb5bd";
      ctx.lineWidth = line.thickness;
      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(canvas.width, screenY);
      ctx.stroke();
      
      // Draw coordinate labels for thick lines
      if (line.isThick) {
        ctx.fillStyle = "#495057";
        ctx.font = "10px monospace";
        ctx.fillText(`y=${line.position.toString()}`, 5, screenY - 3);
      }
    });
    
    // Vertical lines
    verticalLines.forEach(line => {
      const screenX = store.mapping.worldToScreen({ 
        x: line.position, 
        y: store.worldWindow.bottomLeft.y 
      }).x;
      
      ctx.strokeStyle = line.isThick ? "#495057" : "#adb5bd";
      ctx.lineWidth = line.thickness;
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, canvas.height);
      ctx.stroke();
      
      // Draw coordinate labels for thick lines
      if (line.isThick) {
        ctx.fillStyle = "#495057";
        ctx.font = "10px monospace";
        ctx.fillText(`x=${line.position.toString()}`, screenX + 3, canvas.height - 5);
      }
    });
    
    // Draw equation graph
    if (screenPoints.length > 0) {
      ctx.strokeStyle = "#dc3545";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
      
      if (store.currentEquation.shouldDrawAsCurve(store.worldWindow) && screenPoints.length > 2) {
        // Draw as smooth curve for quadratic equations at low zoom
        for (let i = 1; i < screenPoints.length; i++) {
          ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
        }
      } else {
        // Draw as straight line for linear equations or high zoom quadratic
        ctx.lineTo(screenPoints[screenPoints.length - 1].x, screenPoints[screenPoints.length - 1].y);
      }
      ctx.stroke();
    }
  }, [store, horizontalLines, verticalLines, screenPoints]);
  
  // Redraw canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);
  
  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas size to match store viewport
    canvas.width = store.screenViewport.width;
    canvas.height = store.screenViewport.height;
    
    // Redraw after resize
    drawCanvas();
  }, [store.screenViewport.width, store.screenViewport.height, drawCanvas]);
  
  return (
    <canvas
      ref={canvasRef}
      width={store.screenViewport.width}
      height={store.screenViewport.height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: store.transformState.gridTransform,
        transformOrigin: '0 0'
      }}
    />
  );
});