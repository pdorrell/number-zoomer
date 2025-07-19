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

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const currentPointScreen = store.mapping.xyToScreen(store.currentPoint);
    const distanceToPoint = Math.sqrt(
      Math.pow(mouseX - currentPointScreen.x, 2) + 
      Math.pow(mouseY - currentPointScreen.y, 2)
    );
    
    if (distanceToPoint <= 10) {
      setIsDraggingPoint(true);
    } else {
      setIsDraggingBackground(true);
    }
    
    setLastMousePos({ x: mouseX, y: mouseY });
  }, [store]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    if (isDraggingPoint) {
      const newPoint = store.mapping.screenToXY(mouseX, mouseY);
      store.updateCurrentPoint(newPoint);
    } else if (isDraggingBackground) {
      const deltaX = mouseX - lastMousePos.x;
      const deltaY = mouseY - lastMousePos.y;
      store.pan(deltaX, deltaY);
      setLastMousePos({ x: mouseX, y: mouseY });
    }
  }, [isDraggingPoint, isDraggingBackground, lastMousePos, store]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingPoint(false);
    setIsDraggingBackground(false);
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    store.zoom(zoomFactor, mouseX, mouseY);
  }, [store]);
  const gridRenderer = new GridRenderer(store.mapping);
  const horizontalLines = gridRenderer.calculateHorizontalGridLines();
  const verticalLines = gridRenderer.calculateVerticalGridLines();

  const currentPointScreen = store.mapping.xyToScreen(store.currentPoint);

  return (
    <svg 
      width={store.screenDimensions.width} 
      height={store.screenDimensions.height} 
      className="coordinate-plane"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: isDraggingPoint ? 'grabbing' : isDraggingBackground ? 'grabbing' : 'grab' }}
    >
      <rect 
        width={store.screenDimensions.width} 
        height={store.screenDimensions.height} 
        fill="#ffffff" 
        stroke="#dee2e6" 
      />
      
      {horizontalLines.map((line, index) => {
        const screenY = store.mapping.xyToScreen({ 
          x: store.xyRectangle.bottomLeft.x, 
          y: line.position 
        }).y;
        
        return (
          <g key={`h-${index}`}>
            <line
              x1={0}
              y1={screenY}
              x2={store.screenDimensions.width}
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
      
      {verticalLines.map((line, index) => {
        const screenX = store.mapping.xyToScreen({ 
          x: line.position, 
          y: store.xyRectangle.bottomLeft.y 
        }).x;
        
        return (
          <g key={`v-${index}`}>
            <line
              x1={screenX}
              y1={0}
              x2={screenX}
              y2={store.screenDimensions.height}
              stroke={line.isThick ? "#495057" : "#adb5bd"}
              strokeWidth={line.thickness}
            />
            {line.isThick && (
              <text
                x={screenX + 3}
                y={store.screenDimensions.height - 5}
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
      
      <circle
        cx={currentPointScreen.x}
        cy={currentPointScreen.y}
        r={6}
        fill="#212529"
        stroke="#ffffff"
        strokeWidth={2}
      />
      
      <text 
        x={currentPointScreen.x + 15} 
        y={currentPointScreen.y - 15}
        fontSize="12"
        fill="#212529"
        fontFamily="monospace"
      >
        ({store.currentPoint.x.toString()}, {store.currentPoint.y.toString()})
      </text>
    </svg>
  );
});