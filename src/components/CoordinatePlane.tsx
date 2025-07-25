import React, { useState, useCallback, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useGesture } from '@use-gesture/react';
import { AppStore } from '../stores/AppStore';
import { CanvasRenderer } from './CanvasRenderer';
import { CoordinateLabels } from './CoordinateLabels';
import { GridRenderer } from './GridRenderer';

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
  const [pinchStartScale, setPinchStartScale] = useState(1);
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false);
  const [draggedPointStartPosition, setDraggedPointStartPosition] = useState<{ x: number; y: number } | null>(null);

  // Global mouse move handler for dragging outside the component
  const handleGlobalMouseMove = useCallback((event: MouseEvent) => {
    if (!containerRef.current || (!isDraggingPoint && !isDraggingBackground)) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    if (isDraggingPoint && draggedPointStartPosition) {
      // Check if we've moved enough to start dragging
      const dragDistance = Math.sqrt(
        Math.pow(mouseX - startDragPos.x, 2) + 
        Math.pow(mouseY - startDragPos.y, 2)
      );
      
      if (dragDistance >= 3 || hasMovedDuringDrag) { // 3px minimum drag distance
        // Mark that we've moved during the drag
        setHasMovedDuringDrag(true);
        
        // Apply relative movement from drag start position
        const deltaX = mouseX - startDragPos.x;
        const deltaY = mouseY - startDragPos.y;
        
        const newScreenX = draggedPointStartPosition.x + deltaX;
        const newScreenY = draggedPointStartPosition.y + deltaY;
        
        const newPoint = store.mapping.screenToWorld(newScreenX, newScreenY);
        store.updateCurrentPoint(newPoint);
      }
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
  }, [isDraggingPoint, isDraggingBackground, lastMousePos, accumulatedPanDelta, store, startDragPos, hasMovedDuringDrag, draggedPointStartPosition]);

  // Global mouse up handler for ending drags outside the component
  const handleGlobalMouseUp = useCallback(() => {
    if (isDraggingBackground) {
      // Complete the drag with remaining delta (accounts for intermediate redraws)
      store.completeDragWithDelta(accumulatedPanDelta.x, accumulatedPanDelta.y);
    }
    // Point dragging doesn't need completion since it updates continuously
    
    store.completeTransform();
    setIsDraggingPoint(false);
    setIsDraggingBackground(false);
    setAccumulatedPanDelta({ x: 0, y: 0 });
    setHasMovedDuringDrag(false);
    setDraggedPointStartPosition(null);
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

  // Helper function to start point dragging
  const startPointDrag = useCallback((mouseX: number, mouseY: number) => {
    setIsDraggingPoint(true);
    setHasMovedDuringDrag(false); // Reset movement flag
    
    // Store the current screen position of the point at drag start
    const currentPointScreen = store.mapping.worldToScreen(store.currentPoint);
    setDraggedPointStartPosition({ x: currentPointScreen.x, y: currentPointScreen.y });
    
    store.startPointDrag({ x: mouseX, y: mouseY });
    setStartDragPos({ x: mouseX, y: mouseY });
    setLastMousePos({ x: mouseX, y: mouseY });
  }, [store]);

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
      startPointDrag(mouseX, mouseY);
    } else {
      setIsDraggingBackground(true);
      store.startWorldWindowDrag();
      setAccumulatedPanDelta({ x: 0, y: 0 });
      setLastMousePos({ x: mouseX, y: mouseY });
    }
  }, [store, startPointDrag]);

  // Handler for coordinate display mouse down
  const handleCoordinateMouseDown = useCallback((event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the background handler
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    startPointDrag(mouseX, mouseY);
  }, [startPointDrag]);


  // Handler for coordinate display touch start
  const handleCoordinateTouchStart = useCallback((event: React.TouchEvent) => {
    event.preventDefault(); // Prevent default touch behavior
    event.stopPropagation(); // Prevent triggering the background handler
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const touch = event.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    startPointDrag(touchX, touchY);
  }, [startPointDrag]);



  // Use-gesture for both drag and pinch handling
  const bind = useGesture({
    onDragStart: ({ event }) => {
      if (!containerRef.current) return;
      
      // Block new drag operations during pinch zoom
      if (isZooming) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in event && event.touches.length > 0 ? event.touches[0].clientX : 'clientX' in event ? event.clientX : 0;
      const clientY = 'touches' in event && event.touches.length > 0 ? event.touches[0].clientY : 'clientY' in event ? event.clientY : 0;
      const touchX = clientX - rect.left;
      const touchY = clientY - rect.top;
      
      const currentPointScreen = store.mapping.worldToScreen(store.currentPoint);
      const distanceToPoint = Math.sqrt(
        Math.pow(touchX - currentPointScreen.x, 2) + 
        Math.pow(touchY - currentPointScreen.y, 2)
      );
      
      if (distanceToPoint <= 15) { // Touch target for point
        startPointDrag(touchX, touchY);
      } else {
        setIsDraggingBackground(true);
        store.startWorldWindowDrag();
        setAccumulatedPanDelta({ x: 0, y: 0 });
        setLastMousePos({ x: touchX, y: touchY });
      }
    },
    
    onDrag: ({ event, movement: [movementX, movementY], xy: [currentX, currentY] }) => {
      if (!containerRef.current) return;
      
      // Block drag operations during pinch zoom
      if (isZooming) return;
      
      if (isDraggingPoint && draggedPointStartPosition) {
        // For point dragging, use current absolute position relative to container
        const rect = containerRef.current.getBoundingClientRect();
        const touchX = currentX - rect.left;
        const touchY = currentY - rect.top;
        
        // Check if we've moved enough to start dragging
        const dragDistance = Math.sqrt(
          Math.pow(touchX - startDragPos.x, 2) + 
          Math.pow(touchY - startDragPos.y, 2)
        );
        
        if (dragDistance >= 3 || hasMovedDuringDrag) { // 3px minimum drag distance
          setHasMovedDuringDrag(true);
          
          // Apply relative movement from drag start position
          const deltaX = touchX - startDragPos.x;
          const deltaY = touchY - startDragPos.y;
          
          const newScreenX = draggedPointStartPosition.x + deltaX;
          const newScreenY = draggedPointStartPosition.y + deltaY;
          
          const newPoint = store.mapping.screenToWorld(newScreenX, newScreenY);
          store.updateCurrentPoint(newPoint);
        }
      } else if (isDraggingBackground) {
        // For background dragging, use movement (total distance from start)
        setAccumulatedPanDelta({ x: movementX, y: movementY });
        store.updateWorldWindowDragTransform(movementX, movementY);
      }
    },
    
    onDragEnd: () => {
      if (isDraggingBackground) {
        store.completeDragWithDelta(accumulatedPanDelta.x, accumulatedPanDelta.y);
      }
      
      store.completeTransform();
      setIsDraggingPoint(false);
      setIsDraggingBackground(false);
      setAccumulatedPanDelta({ x: 0, y: 0 });
      setHasMovedDuringDrag(false);
      setDraggedPointStartPosition(null);
    },
    
    onPinchStart: ({ offset: [initialScale] }) => {
      // Cancel any active drag operations when pinch starts
      if (isDraggingBackground) {
        store.completeDragWithDelta(accumulatedPanDelta.x, accumulatedPanDelta.y);
        store.completeTransform();
      } else if (isDraggingPoint) {
        store.completeTransform();
      }
      
      // Reset drag state
      setIsDraggingPoint(false);
      setIsDraggingBackground(false);
      setAccumulatedPanDelta({ x: 0, y: 0 });
      
      // Store the initial scale from the gesture library
      setPinchStartScale(initialScale);
      setInitialZoomFactor(1);
      setIsZooming(true);
      store.startZoom('pinch');
      
      // Get the center point from the store (it handles the logic internally)
      if (store.centrePoint) {
        setZoomCenter(store.centrePoint);
      }
    },
    
    onPinch: ({ offset: [scale] }) => {
      if (!isZooming) return;
      
      // Calculate the relative scale from the pinch start
      const relativeScale = scale / pinchStartScale;
      
      // Debug the scale values
      console.log('Pinch scale:', scale, 'Start scale:', pinchStartScale, 'Relative:', relativeScale);
      
      // Use the relative scale for the zoom factor
      store.setZoomFactor('pinch', relativeScale);
      setInitialZoomFactor(relativeScale);
    },
    
    onPinchEnd: () => {
      if (!isZooming) return;
      
      // Use the new ZoomableInterface method
      store.completeZoom('pinch', initialZoomFactor);
      setIsZooming(false);
      setInitialZoomFactor(1);
      setPinchStartScale(1);
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
      pointer: { touch: true },
      from: () => [1, 0]
    }
  });


  
  const currentPointScreen = store.mapping.worldToScreen(store.currentPoint);
  
  // Calculate grid lines for coordinate labels
  const gridRenderer = new GridRenderer(store.mapping);
  const maxPrecision = gridRenderer.calculateMaxPrecision();
  const horizontalLineGroups = gridRenderer.calculateHorizontalGridLines(maxPrecision);
  const verticalLineGroups = gridRenderer.calculateVerticalGridLines(maxPrecision);
  
  // Flatten for coordinate labels (labels only use thick lines anyway)
  const horizontalLines = horizontalLineGroups.flat();
  const verticalLines = verticalLineGroups.flat();
  
  // Calculate transforms for coordinate labels during drag/zoom
  const calculateLabelTransforms = () => {
    const gridTransform = store.transformState.gridTransform;
    
    if (!gridTransform) {
      return { 
        xLabelsTransform: '', 
        yLabelsTransform: '',
        getXLabelTransform: undefined,
        getYLabelTransform: undefined
      };
    }
    
    // Handle zoom transforms FIRST (before simple translate check)
    const scaleMatch = gridTransform.match(/translate\(([^,]+)px,\s*([^)]+)px\)\s*scale\(([^)]+)\)\s*translate\(([^,]+)px,\s*([^)]+)px\)/);
    if (scaleMatch) {
      const centerX = parseFloat(scaleMatch[1]);
      const centerY = parseFloat(scaleMatch[2]);
      const scale = parseFloat(scaleMatch[3]);
      
      const getXLabelTransform = (screenX: number) => {
        const deltaX = (screenX - centerX) * (scale - 1);
        return `translate(${deltaX}, 0)`;
      };
      
      const getYLabelTransform = (screenY: number) => {
        const deltaY = (screenY - centerY) * (scale - 1);
        return `translate(0, ${deltaY})`;
      };
      
      return {
        xLabelsTransform: '', // Use individual transforms for zoom
        yLabelsTransform: '', // Use individual transforms for zoom
        getXLabelTransform,
        getYLabelTransform
      };
    }
    
    // Parse simple translate transforms (for drag operations)
    const translateMatch = gridTransform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
    if (translateMatch) {
      const deltaX = parseFloat(translateMatch[1]);
      const deltaY = parseFloat(translateMatch[2]);
      
      
      return {
        xLabelsTransform: `translate(${deltaX}, 0)`, // X labels move horizontally only
        yLabelsTransform: `translate(0, ${deltaY})`,  // Y labels move vertically only
        getXLabelTransform: undefined,
        getYLabelTransform: undefined
      };
    }
    
    
    return { 
      xLabelsTransform: '', 
      yLabelsTransform: '',
      getXLabelTransform: undefined,
      getYLabelTransform: undefined
    };
  };
  
  const { xLabelsTransform, yLabelsTransform, getXLabelTransform, getYLabelTransform } = calculateLabelTransforms();

  return (
    <div 
      ref={containerRef}
      className="coordinate-plane"
      onMouseDown={handleMouseDown}
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
      
      {/* SVG coordinate labels above canvas */}
      <CoordinateLabels
        horizontalLines={horizontalLines}
        verticalLines={verticalLines}
        canvasWidth={store.screenViewport.width}
        canvasHeight={store.screenViewport.height}
        xLabelsTransform={xLabelsTransform}
        yLabelsTransform={yLabelsTransform}
        getXLabelTransform={getXLabelTransform}
        getYLabelTransform={getYLabelTransform}
      />
      
      {/* SVG overlay for current point circle */}
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
        </g>
      </svg>
      
      {/* Expandable div for coordinate display */}
      <div
        onMouseDown={handleCoordinateMouseDown}
        onTouchStart={handleCoordinateTouchStart}
        className={`coordinate-display ${isDraggingPoint ? 'dragging' : ''}`}
        style={{
          position: 'absolute',
          left: currentPointScreen.x + 10,
          top: currentPointScreen.y - 25,
          border: '1px solid #212529',
          borderRadius: '3px',
          padding: '4px 6px',
          fontSize: '12px',
          fontFamily: 'monospace',
          color: '#212529',
          pointerEvents: 'auto',
          whiteSpace: 'nowrap',
          transform: store.transformState.pointTransform,
          cursor: isDraggingPoint ? 'grabbing' : 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          msUserSelect: 'none',
          minHeight: '20px', // Minimum touch target size
          minWidth: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isDraggingPoint ? '0 2px 4px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.1)',
          zIndex: 10, // Ensure it's above other elements
          touchAction: 'none' // Prevent default touch behaviors
        }}
      >
        {store.getCurrentPointDisplay()}
      </div>
    </div>
  );
});