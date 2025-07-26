import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AppStore } from './stores/AppStore';
import { CoordinatePlane } from './components/CoordinatePlane';
import { CustomZoomSlider } from './components/CustomZoomSlider';
import { EquationType } from './types/Equation';

export const App: React.FC = observer(() => {
  const [store] = useState(() => new AppStore());


  const handleEquationTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const type = event.target.value as EquationType;
    if (type === 'linear') {
      store.setEquation({ type: 'linear', c: store.getLinearC() });
    } else {
      store.setEquation({ type: 'quadratic' });
    }
  };

  const handleLinearCChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const c = parseInt(event.target.value, 10);
    store.setEquation({ type: 'linear', c });
  };


  return (
    <div className="app">
      <div className="controls">
        <div className="controls-row">
          <h1>Number Zoomer</h1>
          <div className="equation-controls">
            <label>
              Equation: 
              <select value={store.getEquationType()} onChange={handleEquationTypeChange}>
                <option value="quadratic">y = x²</option>
                <option value="linear">y = cx</option>
              </select>
            </label>
            {store.getEquationType() === 'linear' && (
              <label>
                c = 
                <select value={store.getLinearC()} onChange={handleLinearCChange}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
            )}
            <span className="equation-display">
              Current: {store.currentEquation.getDisplayName()}
            </span>
          </div>
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
              <strong>Current Point:</strong> {store.getCurrentPointDisplay()} ({store.calculateCurrentPrecision()}DP)
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
