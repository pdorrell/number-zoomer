import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AppStore } from './stores/AppStore';
import { CoordinatePlane } from './components/CoordinatePlane';
import { ZoomSlider } from './components/ZoomSlider';
import { EquationSelector } from './components/EquationSelector';
import { DebugInfo } from './components/DebugInfo';
import { Equation, EquationType } from './types/Equation';

export const App: React.FC = observer(() => {
  const [store] = useState(() => new AppStore());


  const handleSetEquation = (equation: Equation) => {
    store.equation = equation;
  };


  return (
    <div className="outer-app-container">
      <div className="app">
        {/* 1. Header with controls */}
        <div className="controls">
          <div className="controls-row">
            <h1>Number Zoomer</h1>
            <EquationSelector
              equation={store.equation}
              setEquation={handleSetEquation}
            />
            <div className="control-buttons">
              <button onClick={() => store.resetView()}>Reset View</button>
              <button onClick={() => store.moveCurrentPointToCenter()}>Center Point</button>
            </div>
            <div className="version-debug-container">
              <div className="version-display">v{store.version}</div>
              <div 
                className={`debug-toggle ${store.showDebugInfo ? 'active' : ''}`}
                onClick={() => store.toggleDebugInfo()}
              >
                🕵️
              </div>
            </div>
          </div>
          <DebugInfo store={store} />
        </div>
        
        {/* 2. Equation heading */}
        <div className="equation-heading-container">
          <h2 className="equation-heading">{store.equation.getDisplayName()}</h2>
        </div>
        
        {/* 3. Coordinate plane (flexible) */}
        <div className="coordinate-plane-area">
          <CoordinatePlane store={store} />
        </div>
        
        {/* 4. Zoom slider */}
        <div className="zoom-slider-container">
          <ZoomSlider 
            zoomable={store}
            source="slider"
            zoomRange={8}
            disabled={store.transformState.isTransforming && store.transformState.transformType !== 'slider'}
          />
        </div>
      </div>
    </div>
  );
});
