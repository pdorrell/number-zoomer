import React, { useState } from 'react';
import { AppStore } from './stores/AppStore';
import { CoordinatePlane } from './components/CoordinatePlane';

export const App: React.FC = () => {
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
          <span className="range-display">
            X: [{store.xyRectangle.bottomLeft.x.toString()}, {store.xyRectangle.topRight.x.toString()}]
            Y: [{store.xyRectangle.bottomLeft.y.toString()}, {store.xyRectangle.topRight.y.toString()}]
          </span>
        </div>
      </div>
      <div className="main-area">
        <CoordinatePlane store={store} />
      </div>
    </div>
  );
};