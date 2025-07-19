import React from 'react';
import { observer } from 'mobx-react-lite';
import { AppStore } from '../stores/AppStore';
import { GridRenderer } from './GridRenderer';

interface CoordinatePlaneProps {
  store: AppStore;
}

export const CoordinatePlane: React.FC<CoordinatePlaneProps> = observer(({ store }) => {
  const gridRenderer = new GridRenderer(store.mapping);
  const horizontalLines = gridRenderer.calculateHorizontalGridLines();
  const verticalLines = gridRenderer.calculateVerticalGridLines();

  const currentPointScreen = store.mapping.xyToScreen(store.currentPoint);

  return (
    <svg 
      width={store.screenDimensions.width} 
      height={store.screenDimensions.height} 
      className="coordinate-plane"
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
          <line
            key={`h-${index}`}
            x1={0}
            y1={screenY}
            x2={store.screenDimensions.width}
            y2={screenY}
            stroke={line.isThick ? "#495057" : "#adb5bd"}
            strokeWidth={line.thickness}
          />
        );
      })}
      
      {verticalLines.map((line, index) => {
        const screenX = store.mapping.xyToScreen({ 
          x: line.position, 
          y: store.xyRectangle.bottomLeft.y 
        }).x;
        
        return (
          <line
            key={`v-${index}`}
            x1={screenX}
            y1={0}
            x2={screenX}
            y2={store.screenDimensions.height}
            stroke={line.isThick ? "#495057" : "#adb5bd"}
            strokeWidth={line.thickness}
          />
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