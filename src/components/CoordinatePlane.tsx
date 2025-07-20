import React, { useState, useCallback, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useGesture } from '@use-gesture/react';
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
  const [isZooming, setIsZooming] = useState(false);
  const [startDragPos, setStartDragPos] = useState({ x: 0, y: 0 });
  const [accumulatedPanDelta, setAccumulatedPanDelta] = useState({ x: 0, y: 0 });
  const [initialZoomFactor, setInitialZoomFactor] = useState(1);
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

  // Use-gesture for both drag and pinch handling
  const bind = useGesture({
    onDragStart: ({ event }) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in event ? event.touches[0].clientX : 'clientX' in event ? event.clientX : 0;
      const clientY = 'touches' in event ? event.touches[0].clientY : 'clientY' in event ? event.clientY : 0;
      const touchX = clientX - rect.left;
      const touchY = clientY - rect.top;
      
      const currentPointScreen = store.mapping.worldToScreen(store.currentPoint);
      const distanceToPoint = Math.sqrt(
        Math.pow(touchX - currentPointScreen.x, 2) + 
        Math.pow(touchY - currentPointScreen.y, 2)
      );
      
      if (distanceToPoint <= 15) { // Touch target for point
        setIsDraggingPoint(true);
        store.startPointDrag({ x: touchX, y: touchY });
        setStartDragPos({ x: touchX, y: touchY });
      } else {
        setIsDraggingBackground(true);
        store.startWorldWindowDrag();
        setAccumulatedPanDelta({ x: 0, y: 0 });
      }
      
      setLastMousePos({ x: touchX, y: touchY });
    },
    
    onDrag: ({ event, movement: [movementX, movementY] }) => {
      if (!containerRef.current) return;
      
      if (isDraggingPoint) {
        // For point dragging, use absolute position
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = 'touches' in event ? event.touches[0].clientX : 'clientX' in event ? event.clientX : 0;
        const clientY = 'touches' in event ? event.touches[0].clientY : 'clientY' in event ? event.clientY : 0;
        const touchX = clientX - rect.left;
        const touchY = clientY - rect.top;
        
        const newPoint = store.mapping.screenToWorld(touchX, touchY);
        store.updateCurrentPoint(newPoint);
      } else if (isDraggingBackground) {
        // For background dragging, use movement (total distance from start)
        setAccumulatedPanDelta({ x: movementX, y: movementY });
        store.updateWorldWindowDragTransform(movementX, movementY);
      }
    },
    
    onDragEnd: () => {
      if (isDraggingBackground) {
        store.pan(accumulatedPanDelta.x, accumulatedPanDelta.y);
      }
      
      store.completeTransform();
      setIsDraggingPoint(false);
      setIsDraggingBackground(false);
      setAccumulatedPanDelta({ x: 0, y: 0 });
    },
    
    onPinchStart: () => {
      // Determine zoom center based on current point visibility (same logic as zoom slider)
      let centerScreen;
      if (store.isCurrentPointVisible()) {
        centerScreen = store.mapping.worldToScreen(store.currentPoint);
      } else {
        centerScreen = { 
          x: store.screenViewport.width / 2, 
          y: store.screenViewport.height / 2 
        };
      }
      
      setZoomCenter(centerScreen);
      setInitialZoomFactor(1);
      setIsZooming(true);
      store.startZoom(centerScreen);
    },
    
    onPinch: ({ offset: [scale] }) => {
      if (!isZooming) return;
      
      store.updateZoomTransform(scale, zoomCenter);
      setInitialZoomFactor(scale);
    },
    
    onPinchEnd: () => {
      if (!isZooming) return;
      
      store.zoom(initialZoomFactor, zoomCenter.x, zoomCenter.y);
      store.completeTransform();
      setIsZooming(false);
      setInitialZoomFactor(1);
    }
  }, {
    eventOptions: { passive: false },
    drag: {
      filterTaps: true,
      pointer: { touch: true },
      from: () => [0, 0]
    },
    pinch: {
      scaleBounds: { min: 0.1, max: 10 },
      rubberband: true,
      pointer: { touch: true }
    }
  });


  
  const currentPointScreen = store.mapping.worldToScreen(store.currentPoint);

  return (
    <div 
      ref={containerRef}
      className="coordinate-plane"
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      {...bind()}
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