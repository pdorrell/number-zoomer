import React, { useState, useCallback, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { AppStore } from '../stores/AppStore';
import { CanvasRenderer } from './CanvasRenderer';

interface CoordinatePlaneProps {
  store: AppStore;
}

export const CoordinatePlane: React.FC<CoordinatePlaneProps> = observer(({ store }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingPoint, setIsDraggingPoint] = useState(false);
  const [isDraggingBackground, setIsDraggingBackground] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [lastTouchCenter, setLastTouchCenter] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const [lastZoomTime, setLastZoomTime] = useState(0);
  const [startDragPos, setStartDragPos] = useState({ x: 0, y: 0 });
  const [accumulatedPanDelta, setAccumulatedPanDelta] = useState({ x: 0, y: 0 });
  const [accumulatedZoomFactor, setAccumulatedZoomFactor] = useState(1);
  const [zoomCenter, setZoomCenter] = useState({ x: 0, y: 0 });

  // Global mouse move handler for dragging outside the component
  const handleGlobalMouseMove = useCallback((event: MouseEvent) => {
    if (!containerRef.current || (!isDraggingPoint && !isDraggingBackground)) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    if (isDraggingPoint) {
      // Continuously update point position for real-time coordinate display
      const newPoint = store.mapping.screenToWorld(mouseX, mouseY);
      store.updateCurrentPoint(newPoint);
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
  }, [isDraggingPoint, isDraggingBackground, lastMousePos, accumulatedPanDelta, store]);

  // Global mouse up handler for ending drags outside the component
  const handleGlobalMouseUp = useCallback(() => {
    if (isDraggingBackground) {
      // Complete the pan with actual update
      store.pan(accumulatedPanDelta.x, accumulatedPanDelta.y);
    }
    // Point dragging doesn't need completion since it updates continuously
    
    store.completeTransform();
    setIsDraggingPoint(false);
    setIsDraggingBackground(false);
    setAccumulatedPanDelta({ x: 0, y: 0 });
  }, [isDraggingPoint, isDraggingBackground, accumulatedPanDelta, store]);

  // Add/remove global event listeners when dragging state changes
  useEffect(() => {
    if (isDraggingPoint || isDraggingBackground) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDraggingPoint, isDraggingBackground, handleGlobalMouseMove, handleGlobalMouseUp]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
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


  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    store.zoom(zoomFactor, mouseX, mouseY);
  }, [store]);

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const getTouchCenter = (touches: React.TouchList, rect: DOMRect) => {
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
    const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
    
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
      setZoomCenter(center);
      setAccumulatedZoomFactor(1); // Reset accumulated zoom
      setIsDraggingPoint(false);
      setIsDraggingBackground(false);
    }
  }, [store]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault(); // Prevent default touch behavior
    const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
    
    if (event.touches.length === 1) {
      // Single touch - drag point or background
      const touch = event.touches[0];
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;
      
      if (isDraggingPoint) {
        // Continuously update point position for real-time coordinate display
        const newPoint = store.mapping.screenToWorld(touchX, touchY);
        store.updateCurrentPoint(newPoint);
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
          
          // Accumulate zoom factor for final application
          const newAccumulatedZoom = accumulatedZoomFactor * zoomFactor;
          setAccumulatedZoomFactor(newAccumulatedZoom);
          
          // Use CSS transform for immediate feedback (no redraw until completion)
          store.startZoom(center);
          store.updateZoomTransform(newAccumulatedZoom, center);
          
          setLastZoomTime(currentTime);
          setLastTouchDistance(distance);
        }
      }
      
      setLastTouchCenter(center);
    }
  }, [isDraggingPoint, isDraggingBackground, lastMousePos, lastTouchDistance, lastZoomTime, accumulatedZoomFactor, store]);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    event.preventDefault(); // Prevent default touch behavior
    
    if (event.touches.length === 0) {
      // All touches ended - complete any ongoing interactions
      if (isDraggingBackground) {
        // Complete the pan with actual update
        store.pan(accumulatedPanDelta.x, accumulatedPanDelta.y);
      }
      // Point dragging doesn't need completion since it updates continuously
      
      // Complete any ongoing zoom operation
      if (isZooming) {
        store.zoom(accumulatedZoomFactor, zoomCenter.x, zoomCenter.y);
        setAccumulatedZoomFactor(1); // Reset for next interaction
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
      const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
      const touch = event.touches[0];
      setLastMousePos({ 
        x: touch.clientX - rect.left, 
        y: touch.clientY - rect.top 
      });
    }
  }, [isDraggingPoint, isDraggingBackground, startDragPos, lastMousePos, accumulatedPanDelta, isZooming, accumulatedZoomFactor, zoomCenter, store]);
  
  const currentPointScreen = store.mapping.worldToScreen(store.currentPoint);

  return (
    <div 
      ref={containerRef}
      className="coordinate-plane"
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{ 
        position: 'relative',
        width: store.screenViewport.width,
        height: store.screenViewport.height,
        cursor: isDraggingPoint ? 'grabbing' : isDraggingBackground ? 'grabbing' : 'grab',
        touchAction: 'none', // Prevent default touch behaviors
        opacity: isZooming ? 0.8 : 1, // Visual feedback during zoom
        transition: isZooming ? 'none' : 'opacity 0.1s ease',
        overflow: 'hidden', // Clip canvas when it transforms outside container
        border: '1px solid #dee2e6', // Visible clipping boundary
        borderRadius: '4px'
      }}
    >
      {/* Canvas for grid lines, coordinates, and equation */}
      <CanvasRenderer 
        store={store}
      />
      
      {/* SVG overlay for current point */}
      <svg 
        width={store.screenViewport.width} 
        height={store.screenViewport.height} 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none' // Let mouse events pass through to the div
        }}
      >
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
    </div>
  );
});