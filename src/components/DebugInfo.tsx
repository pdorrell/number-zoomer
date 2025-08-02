import React from 'react';
import { observer } from 'mobx-react-lite';
import { AppStore } from '@/stores/AppStore';

interface DebugInfoProps {
  store: AppStore;
}

export const DebugInfo: React.FC<DebugInfoProps> = observer(({ store }) => {
  if (!store.showDebugInfo) {
    return null;
  }

  return (
    <div className="debug-info">
      <div className="info-item">
        <strong>World Window:</strong> DP: {store.calculateWorldWindowPrecision()} X: {store.getPreviewWorldWindowXRangeDisplay()}, Y: {store.getPreviewWorldWindowYRangeDisplay()}
      </div>
      <div className="info-item">
        <strong>Current Point:</strong> {store.getCurrentPointDisplay().x}, {store.getCurrentPointDisplay().y} ({store.calculateCurrentPrecision()}DP)
      </div>
      <div className="info-item">
        <strong>Screen Viewport:</strong> {store.screenViewport.width}×{store.screenViewport.height}px, X: {store.getPreviewPixelsPerXUnitScaled().toFloat().toFixed(1)} px/unit, Y: {store.getPreviewPixelsPerYUnitScaled().toFloat().toFixed(1)} px/unit, Window: {store.calculateWorldWindowPrecision() + 1}DP
      </div>
      <div className="info-item drag-zoom-display">
        <strong>Operations:</strong>{' '}
        {store.lastCompletedOperation && (
          <span className="completed">
            {store.lastCompletedOperation.type === 'drag' ? 'Drag' : 'Zoom'}: {store.lastCompletedOperation.value}
          </span>
        )}
        {(store.getCurrentDragDistance() !== null || store.getCurrentZoomFactor() !== null) && store.lastCompletedOperation && ' | '}
        {store.getCurrentDragDistance() !== null && (
          <span className="active">Drag: {Math.round(store.getCurrentDragDistance()!)}px</span>
        )}
        {store.getCurrentDragDistance() !== null && store.getCurrentZoomFactor() !== null && ' | '}
        {store.getCurrentZoomFactor() !== null && (
          <span className="active">Zoom: {store.getCurrentZoomFactorFormatted()}</span>
        )}
        {!store.lastCompletedOperation && store.getCurrentDragDistance() === null && store.getCurrentZoomFactor() === null && (
          <span>None</span>
        )}
      </div>
    </div>
  );
});
