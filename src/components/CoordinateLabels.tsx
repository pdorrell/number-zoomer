import React from 'react';
import { observer } from 'mobx-react-lite';
import { GridLine } from './GridRenderer';
import { AppStore } from '@/stores/AppStore';

interface CoordinateLabelsProps {
  horizontalLines: GridLine[];
  verticalLines: GridLine[];
  canvasWidth: number;
  canvasHeight: number;
  store: AppStore;
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
  store,
  xLabelsTransform = '',
  yLabelsTransform = '',
  getYLabelTransform,
  getXLabelTransform
}) => {
  // Helper function to check if a world position is currently visible in the viewport
  const isWorldPositionVisible = (worldPosition: any, axis: 'x' | 'y'): boolean => {
    // Use preview world window if available (during drag/zoom operations)
    const currentWorldWindow = store.previewWorldWindow || store.dragPreviewWorldWindow || store.worldWindow;

    // Check if the world position is within the current (or preview) world window bounds
    if (axis === 'x') {
      return worldPosition.isWithinInterval(currentWorldWindow.bottomLeft[0], currentWorldWindow.topRight[0]);
    } else {
      return worldPosition.isWithinInterval(currentWorldWindow.bottomLeft[1], currentWorldWindow.topRight[1]);
    }
  };

  // Filter only thick lines that should have coordinate labels
  const thickHorizontalLines = horizontalLines.filter(line => line.isThick);
  const thickVerticalLines = verticalLines.filter(line => line.isThick);

  // Calculate the precision for axis label padding
  // Labels appear on thick lines, which are at precision levels maxPrecision-2 and maxPrecision-1
  // So the highest precision in labels is maxPrecision-1
  const maxPrecision = store.calculateWorldWindowPrecision();
  const maxLabelPrecision = maxPrecision - 1;
  const minDecimalPlaces = Math.max(0, maxLabelPrecision); // Don't pad if negative precision

  // Calculate the expected character width for all labels to ensure consistent rectangle sizes
  // This is based on the maximum width needed: integer part + decimal point/space + decimal places
  const calculateLabelWidth = (position: any): number => {
    const str = position.toString();
    const integerPart = str.indexOf('.') === -1 ? str : str.split('.')[0];

    if (minDecimalPlaces > 0) {
      // Width = integer part + 1 (for decimal point/space) + decimal places
      return integerPart.length + 1 + minDecimalPlaces;
    } else {
      return str.length;
    }
  };

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
          const labelText = line.position.toStringPadded(minDecimalPlaces);
          const individualTransform = getYLabelTransform ? getYLabelTransform(screenY) : '';

          // Only render label if the grid line's world position is visible within the current viewport
          if (!isWorldPositionVisible(line.position, 'y')) {
            return null;
          }

          return (
            <g key={`y-${index}-${line.position.toString()}`} transform={individualTransform}>
              <rect
                x={-10}
                y={screenY - 8}
                width={calculateLabelWidth(line.position) * 6 + 6}
                height={16}
                fill="#e3f2fd"
                stroke="#000000"
                strokeWidth={1}
                rx={2}
              />
              <text
                x={-7}
                y={screenY + 4}
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
          const labelText = line.position.toStringPadded(minDecimalPlaces);
          const individualTransform = getXLabelTransform ? getXLabelTransform(screenX) : '';

          // Only render label if the grid line's world position is visible within the current viewport
          if (!isWorldPositionVisible(line.position, 'x')) {
            return null;
          }

          return (
            <g key={`x-${index}-${line.position.toString()}`} transform={individualTransform}>
              <rect
                x={screenX - (calculateLabelWidth(line.position) * 6 + 6) / 2}
                y={canvasHeight + 11 - 18}
                width={calculateLabelWidth(line.position) * 6 + 6}
                height={16}
                fill="#e8f5e8"
                stroke="#000000"
                strokeWidth={1}
                rx={2}
              />
              <text
                x={screenX}
                y={canvasHeight + 11 - 6}
                textAnchor="middle"
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
