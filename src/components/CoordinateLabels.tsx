import React from 'react';
import { observer } from 'mobx-react-lite';
import { GridLine } from './GridRenderer';

interface CoordinateLabelsProps {
  horizontalLines: GridLine[];
  verticalLines: GridLine[];
  canvasWidth: number;
  canvasHeight: number;
  xLabelsTransform?: string;
  yLabelsTransform?: string;
  // Individual transforms for zoom operations
  getYLabelTransform?: (screenY: number) => string;
  getXLabelTransform?: (screenX: number) => string;
}

export const CoordinateLabels: React.FC<CoordinateLabelsProps> = observer(({
  horizontalLines,
  verticalLines,
  canvasWidth,
  canvasHeight,
  xLabelsTransform = '',
  yLabelsTransform = '',
  getYLabelTransform,
  getXLabelTransform
}) => {
  // Filter only thick lines that should have coordinate labels
  const thickHorizontalLines = horizontalLines.filter(line => line.isThick);
  const thickVerticalLines = verticalLines.filter(line => line.isThick);

  return (
    <svg
      width={canvasWidth}
      height={canvasHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 10,
        overflow: 'visible' // Allow content to extend beyond SVG boundaries
      }}
    >
      {/* Y-axis labels (horizontal grid lines) */}
      <g transform={yLabelsTransform}>
        {thickHorizontalLines.map((line, index) => {
          const screenY = line.screenPosition;
          const labelText = line.position.toString();
          const individualTransform = getYLabelTransform ? getYLabelTransform(screenY) : '';
          
          return (
            <g key={`y-${index}-${line.position.toString()}`} transform={individualTransform}>
              <rect
                x={-10}
                y={screenY - 12}
                width={labelText.length * 6 + 6}
                height={16}
                fill="white"
                stroke="#d3d3d3"
                strokeWidth={1}
                rx={2}
              />
              <text
                x={-7}
                y={screenY - 2}
                fontSize="10"
                fontFamily="monospace"
                fill="#495057"
                dominantBaseline="auto"
              >
                {labelText}
              </text>
            </g>
          );
        })}
      </g>

      {/* X-axis labels (vertical grid lines) */}
      <g transform={xLabelsTransform}>
        {thickVerticalLines.map((line, index) => {
          const screenX = line.screenPosition;
          const labelText = line.position.toString();
          const individualTransform = getXLabelTransform ? getXLabelTransform(screenX) : '';
          
          return (
            <g key={`x-${index}-${line.position.toString()}`} transform={individualTransform}>
              <rect
                x={screenX - 11}
                y={canvasHeight - 18}
                width={labelText.length * 6 + 6}
                height={16}
                fill="white"
                stroke="#d3d3d3"
                strokeWidth={1}
                rx={2}
              />
              <text
                x={screenX - 8}
                y={canvasHeight - 6}
                fontSize="10"
                fontFamily="monospace"
                fill="#495057"
                dominantBaseline="auto"
              >
                {labelText}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
});