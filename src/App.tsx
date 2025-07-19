import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AppStore } from './stores/AppStore';
import { CoordinatePlane } from './components/CoordinatePlane';

export const App: React.FC = observer(() => {
  const [store] = useState(() => new AppStore());

  const handleZoomIn = () => {
    store.zoom(2);
  };

  const handleZoomOut = () => {
    store.zoom(0.5);
  };

  return (
    <div className="app">
      <div className="controls">
        <h1>Number Zoomer</h1>
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
      </div>
    </div>
  );
});