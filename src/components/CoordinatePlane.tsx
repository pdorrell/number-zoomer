import React, { useState, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { AppStore } from '../stores/AppStore';
import { GridRenderer } from './GridRenderer';

interface CoordinatePlaneProps {
  store: AppStore;
}

export const CoordinatePlane: React.FC<CoordinatePlaneProps> = observer(({ store }) => {
  const [isDraggingPoint, setIsDraggingPoint] = useState(false);
  const [isDraggingBackground, setIsDraggingBackground] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [lastTouchCenter, setLastTouchCenter] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const [lastZoomTime, setLastZoomTime] = useState(0);
  const [startDragPos, setStartDragPos] = useState({ x: 0, y: 0 });
  const [accumulatedPanDelta, setAccumulatedPanDelta] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const currentPointScreen = store.mapping.worldToScreen(store.currentPoint);
    const distanceToPoint = Math.sqrt(
      Math.pow(mouseX - currentPointScreen.x, 2) + 
      Math.pow(mouseY - currentPointScreen.y, 2)
    );
    
    if (distanceToPoint <= 10) {
      setIsDraggingPoint(true);
      store.startPointDrag({ x: mouseX, y: mouseY });
      setStartDragPos({ x: mouseX, y: mouseY });
    } else {
      setIsDraggingBackground(true);
      store.startWorldWindowDrag();
      setAccumulatedPanDelta({ x: 0, y: 0 });
    }
    
    setLastMousePos({ x: mouseX, y: mouseY });
  }, [store]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    if (isDraggingPoint) {
      // Use CSS transform for immediate feedback
      store.updatePointDragTransform({ x: mouseX, y: mouseY }, startDragPos);
    } else if (isDraggingBackground) {
      // Use CSS transform for immediate feedback
      const deltaX = mouseX - lastMousePos.x;
      const deltaY = mouseY - lastMousePos.y;
      const newAccumulatedDelta = {
        x: accumulatedPanDelta.x + deltaX,
        y: accumulatedPanDelta.y + deltaY
      };
      setAccumulatedPanDelta(newAccumulatedDelta);
      store.updateWorldWindowDragTransform(newAccumulatedDelta.x, newAccumulatedDelta.y);
      setLastMousePos({ x: mouseX, y: mouseY });
    }
  }, [isDraggingPoint, isDraggingBackground, lastMousePos, startDragPos, accumulatedPanDelta, store]);

  const handleMouseUp = useCallback(() => {
    if (isDraggingPoint) {
      // Complete the point drag with actual update
      const currentPos = { x: startDragPos.x, y: startDragPos.y };
      const transformedPos = {
        x: currentPos.x + (lastMousePos.x - startDragPos.x),
        y: currentPos.y + (lastMousePos.y - startDragPos.y)
      };
      const newPoint = store.mapping.screenToWorld(transformedPos.x, transformedPos.y);
      store.updateCurrentPoint(newPoint);
    } else if (isDraggingBackground) {
      // Complete the pan with actual update
      store.pan(accumulatedPanDelta.x, accumulatedPanDelta.y);
    }
    
    store.completeTransform();
    setIsDraggingPoint(false);
    setIsDraggingBackground(false);
    setAccumulatedPanDelta({ x: 0, y: 0 });
  }, [isDraggingPoint, isDraggingBackground, startDragPos, lastMousePos, accumulatedPanDelta, store]);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    store.zoom(zoomFactor, mouseX, mouseY);
  }, [store]);

  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const getTouchCenter = (touches: TouchList, rect: DOMRect) => {
    if (touches.length === 1) {
      return {
        x: touches[0].clientX - rect.left,
        y: touches[0].clientY - rect.top
      };
    }
    const centerX = (touches[0].clientX + touches[1].clientX) / 2 - rect.left;
    const centerY = (touches[0].clientY + touches[1].clientY) / 2 - rect.top;
    return { x: centerX, y: centerY };
  };

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    event.preventDefault(); // Prevent default touch behavior
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    
    if (event.touches.length === 1) {
      // Single touch - check if touching current point or background
      const touch = event.touches[0];
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;
      
      const currentPointScreen = store.mapping.worldToScreen(store.currentPoint);
      const distanceToPoint = Math.sqrt(
        Math.pow(touchX - currentPointScreen.x, 2) + 
        Math.pow(touchY - currentPointScreen.y, 2)
      );
      
      if (distanceToPoint <= 15) { // Larger touch target
        setIsDraggingPoint(true);
        store.startPointDrag({ x: touchX, y: touchY });
        setStartDragPos({ x: touchX, y: touchY });
      } else {
        setIsDraggingBackground(true);
        store.startWorldWindowDrag();
        setAccumulatedPanDelta({ x: 0, y: 0 });
      }
      
      setLastMousePos({ x: touchX, y: touchY });
    } else if (event.touches.length === 2) {
      // Two touches - pinch to zoom
      const distance = getTouchDistance(event.touches);
      const center = getTouchCenter(event.touches, rect);
      
      setLastTouchDistance(distance);
      setLastTouchCenter(center);
      setIsDraggingPoint(false);
      setIsDraggingBackground(false);
    }
  }, [store]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault(); // Prevent default touch behavior
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    
    if (event.touches.length === 1) {
      // Single touch - drag point or background
      const touch = event.touches[0];
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;
      
      if (isDraggingPoint) {
        // Use CSS transform for immediate feedback
        store.updatePointDragTransform({ x: touchX, y: touchY }, startDragPos);
      } else if (isDraggingBackground) {
        // Use CSS transform for immediate feedback
        const deltaX = touchX - lastMousePos.x;
        const deltaY = touchY - lastMousePos.y;
        const newAccumulatedDelta = {
          x: accumulatedPanDelta.x + deltaX,
          y: accumulatedPanDelta.y + deltaY
        };
        setAccumulatedPanDelta(newAccumulatedDelta);
        store.updateWorldWindowDragTransform(newAccumulatedDelta.x, newAccumulatedDelta.y);
        setLastMousePos({ x: touchX, y: touchY });
      }
    } else if (event.touches.length === 2 && lastTouchDistance !== null) {
      // Two touches - pinch to zoom with throttling
      const currentTime = Date.now();
      const distance = getTouchDistance(event.touches);
      const center = getTouchCenter(event.touches, rect);
      
      // Throttle zoom events to every 50ms for performance
      if (currentTime - lastZoomTime > 50 && lastTouchDistance > 0) {
        const zoomFactor = distance / lastTouchDistance;
        
        // Only zoom if the change is significant (> 5% change)
        if (Math.abs(zoomFactor - 1) > 0.05) {
          setIsZooming(true);
          
          // Use CSS transform for immediate feedback, then apply actual zoom
          store.startZoom(center);
          store.updateZoomTransform(zoomFactor, center);
          
          // Apply actual zoom after a delay for responsiveness
          setTimeout(() => {
            store.zoom(zoomFactor, center.x, center.y);
            store.completeTransform();
            setIsZooming(false);
          }, 100);
          
          setLastZoomTime(currentTime);
          setLastTouchDistance(distance);
        }
      }
      
      setLastTouchCenter(center);
    }
  }, [isDraggingPoint, isDraggingBackground, lastMousePos, lastTouchDistance, lastZoomTime, store]);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    event.preventDefault(); // Prevent default touch behavior
    
    if (event.touches.length === 0) {
      // All touches ended - complete any ongoing interactions
      if (isDraggingPoint) {
        // Complete the point drag with actual update
        const transformedPos = {
          x: startDragPos.x + (lastMousePos.x - startDragPos.x),
          y: startDragPos.y + (lastMousePos.y - startDragPos.y)
        };
        const newPoint = store.mapping.screenToWorld(transformedPos.x, transformedPos.y);
        store.updateCurrentPoint(newPoint);
      } else if (isDraggingBackground) {
        // Complete the pan with actual update
        store.pan(accumulatedPanDelta.x, accumulatedPanDelta.y);
      }
      
      store.completeTransform();
      setIsDraggingPoint(false);
      setIsDraggingBackground(false);
      setLastTouchDistance(null);
      setIsZooming(false);
      setAccumulatedPanDelta({ x: 0, y: 0 });
    } else if (event.touches.length === 1) {
      // One touch remaining after pinch
      setLastTouchDistance(null);
      setIsZooming(false);
      const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
      const touch = event.touches[0];
      setLastMousePos({ 
        x: touch.clientX - rect.left, 
        y: touch.clientY - rect.top 
      });
    }
  }, [isDraggingPoint, isDraggingBackground, startDragPos, lastMousePos, accumulatedPanDelta, store]);
  const gridRenderer = new GridRenderer(store.mapping);
  
  // Reduce grid calculations during zoom operations for performance
  const shouldSkipGridCalculation = isZooming;
  const horizontalLines = shouldSkipGridCalculation ? [] : gridRenderer.calculateHorizontalGridLines();
  const verticalLines = shouldSkipGridCalculation ? [] : gridRenderer.calculateVerticalGridLines();

  const currentPointScreen = store.mapping.worldToScreen(store.currentPoint);
  
  // Generate equation graph points (reduce resolution during zoom)
  const equationScreenWidth = isZooming ? store.screenViewport.width / 4 : store.screenViewport.width;
  const equationPoints = store.currentEquation.generatePoints(store.worldWindow, equationScreenWidth);
  const screenPoints = equationPoints.map(point => store.mapping.worldToScreen(point));
  
  // Create SVG path for equation graph
  const createEquationPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    if (store.currentEquation.shouldDrawAsCurve(store.worldWindow) && points.length > 2) {
      // Draw as smooth curve for quadratic equations at low zoom
      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x} ${points[i].y}`;
      }
    } else {
      // Draw as straight line for linear equations or high zoom quadratic
      path += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
    }
    
    return path;
  };

  return (
    <svg 
      width={store.screenViewport.width} 
      height={store.screenViewport.height} 
      className="coordinate-plane"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{ 
        cursor: isDraggingPoint ? 'grabbing' : isDraggingBackground ? 'grabbing' : 'grab',
        touchAction: 'none', // Prevent default touch behaviors
        opacity: isZooming ? 0.8 : 1, // Visual feedback during zoom
        transition: isZooming ? 'none' : 'opacity 0.1s ease'
      }}
    >
      <rect 
        width={store.screenViewport.width} 
        height={store.screenViewport.height} 
        fill="#ffffff" 
        stroke="#dee2e6" 
      />
      
      <g style={{ transform: store.transformState.gridTransform }}>
        {horizontalLines.map((line, index) => {
          const screenY = store.mapping.worldToScreen({ 
            x: store.worldWindow.bottomLeft.x, 
            y: line.position 
          }).y;
          
          return (
            <g key={`h-${index}`}>
              <line
                x1={0}
                y1={screenY}
                x2={store.screenViewport.width}
                y2={screenY}
                stroke={line.isThick ? "#495057" : "#adb5bd"}
                strokeWidth={line.thickness}
              />
              {line.isThick && (
                <text
                  x={5}
                  y={screenY - 3}
                  fontSize="10"
                  fill="#495057"
                  fontFamily="monospace"
                >
                  y={line.position.toString()}
                </text>
              )}
            </g>
          );
        })}
      </g>
      
      <g style={{ transform: store.transformState.gridTransform }}>
        {verticalLines.map((line, index) => {
          const screenX = store.mapping.worldToScreen({ 
            x: line.position, 
            y: store.worldWindow.bottomLeft.y 
          }).x;
          
          return (
            <g key={`v-${index}`}>
              <line
                x1={screenX}
                y1={0}
                x2={screenX}
                y2={store.screenViewport.height}
                stroke={line.isThick ? "#495057" : "#adb5bd"}
                strokeWidth={line.thickness}
              />
              {line.isThick && (
                <text
                  x={screenX + 3}
                  y={store.screenViewport.height - 5}
                  fontSize="10"
                  fill="#495057"
                  fontFamily="monospace"
                >
                  x={line.position.toString()}
                </text>
                )}
            </g>
          );
        })}
      </g>
      
      {/* Equation graph */}
      {screenPoints.length > 0 && (
        <g style={{ transform: store.transformState.gridTransform }}>
          <path
            d={createEquationPath(screenPoints)}
            stroke="#dc3545"
            strokeWidth={2}
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      )}
      
      <g style={{ transform: store.transformState.pointTransform }}>
        <circle
          cx={currentPointScreen.x}
          cy={currentPointScreen.y}
          r={6}
          fill="#212529"
          stroke="#ffffff"
          strokeWidth={2}
        />
        
        <g>
          <rect
            x={currentPointScreen.x + 10}
            y={currentPointScreen.y - 25}
            width="200"
            height="18"
            fill="#ffffff"
            stroke="#212529"
            strokeWidth={1}
            rx={3}
          />
          <text 
            x={currentPointScreen.x + 15} 
            y={currentPointScreen.y - 12}
            fontSize="12"
            fill="#212529"
            fontFamily="monospace"
          >
            {store.getCurrentPointDisplay()}
          </text>
        </g>
      </g>
    </svg>
  );
});