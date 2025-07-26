import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AppStore } from './stores/AppStore';
import { CoordinatePlane } from './components/CoordinatePlane';
import { CustomZoomSlider } from './components/CustomZoomSlider';
import { EquationSelector } from './components/EquationSelector';
import { Equation, EquationType } from './types/Equation';

export const App: React.FC = observer(() => {
  const [store] = useState(() => new AppStore());


  const handleSetEquation = (equation: Equation) => {
    store.currentEquation = equation;
  };


  return (
    <div className="app">
      <div className="controls">
        <div className="controls-row">
          <h1>Number Zoomer</h1>
          <EquationSelector
            equation={store.currentEquation}
            setEquation={handleSetEquation}
          />
          <div className="control-buttons">
            <button onClick={() => store.resetView()}>Reset View</button>
            <button onClick={() => store.moveCurrentPointToCenter()}>Center Point</button>
          </div>
          <div 
            className={`debug-toggle ${store.showDebugInfo ? 'active' : ''}`}
            onClick={() => store.toggleDebugInfo()}
          >
            🕵️
          </div>
        </div>
        {store.showDebugInfo && (
          <div className="debug-info">
            <div className="info-item">
              <strong>World Window:</strong> DP: {store.calculateWorldWindowPrecision()} X: {store.getPreviewWorldWindowXRangeDisplay()}, Y: {store.getPreviewWorldWindowYRangeDisplay()}
            </div>
            <div className="info-item">
              <strong>Current Point:</strong> {store.getCurrentPointDisplay().x}, {store.getCurrentPointDisplay().y} ({store.calculateCurrentPrecision()}DP)
            </div>
            <div className="info-item">
              <strong>Screen Viewport:</strong> {store.screenViewport.width}×{store.screenViewport.height}px, {store.getPreviewPixelsPerXUnit().toFixed(1)} px/unit, Window: {store.calculateWorldWindowPrecision() + 1}DP
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
        )}
      </div>
      <div className="main-area">
        <h2 className="equation-heading">{store.currentEquation.getDisplayName()}</h2>
        <CoordinatePlane store={store} />
        <CustomZoomSlider 
          zoomable={store}
          source="slider"
          zoomRange={8}
          disabled={store.transformState.isTransforming && store.transformState.transformType !== 'slider'}
        />
      </div>
    </div>
  );
});
