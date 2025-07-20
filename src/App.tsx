import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AppStore } from './stores/AppStore';
import { CoordinatePlane } from './components/CoordinatePlane';
import { ZoomSlider } from './components/ZoomSlider';
import { EquationType } from './types/Equation';

export const App: React.FC = observer(() => {
  const [store] = useState(() => new AppStore());

  const handleZoomIn = () => {
    store.zoom(2);
  };

  const handleZoomOut = () => {
    store.zoom(0.5);
  };

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

  const handleZoomSlider = (zoomFactor: number, isComplete: boolean) => {
    store.handleZoomSlider(zoomFactor, isComplete);
  };

  return (
    <div className="app">
      <div className="controls">
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
          <button onClick={handleZoomIn}>Zoom In (+)</button>
          <button onClick={handleZoomOut}>Zoom Out (-)</button>
          <button onClick={() => store.resetView()}>Reset View</button>
          <button onClick={() => store.moveCurrentPointToCenter()}>Center Point</button>
        </div>
        <div className="debug-info">
          <div className="range-display">
            <strong>World Window X:</strong> {store.getWorldWindowXRangeDisplay()}
          </div>
          <div className="range-display">
            <strong>World Window Y:</strong> {store.getWorldWindowYRangeDisplay()}
          </div>
          <div className="current-point-display">
            <strong>Current Point:</strong> {store.getCurrentPointDisplay()}
          </div>
          <div className="zoom-info">
            <strong>Screen Viewport:</strong> {store.screenViewport.width}×{store.screenViewport.height}px, 
            X: {store.mapping.getPixelsPerXUnit().toFixed(1)} px/unit
          </div>
          <div className="precision-info">
            <strong>Resolution:</strong> Grid: {store.calculateWorldWindowPrecision()}DP, Point: {store.calculateCurrentPrecision()}DP, Window: {store.calculateWorldWindowPrecision() + 1}DP
          </div>
        </div>
      </div>
      <div className="main-area">
        <CoordinatePlane store={store} />
        <ZoomSlider 
          onZoomChange={handleZoomSlider}
          disabled={store.transformState.isTransforming}
        />
      </div>
    </div>
  );
});