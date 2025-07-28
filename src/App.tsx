import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AppStore } from './stores/AppStore';
import { CoordinatePlane } from './components/CoordinatePlane';
import { ZoomSlider } from './components/ZoomSlider';
import { DebugInfo } from './components/DebugInfo';
import { EquationEditModal } from './components/EquationEditModal';
import { AboutModal } from './components/AboutModal';
import { PolynomialEquation } from './types/Equation';

export const App: React.FC = observer(() => {
  const [store] = useState(() => new AppStore());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [previousEquation, setPreviousEquation] = useState<PolynomialEquation | null>(null);

  const handleOpenEditModal = () => {
    console.log('[App] Opening edit modal');
    console.log('[App] Current equation coefficients:', store.equation.coefficients);
    // Create a deep copy of the equation for potential cancellation
    const backup = new PolynomialEquation([...store.equation.coefficients]);
    setPreviousEquation(backup);
    setIsEditModalOpen(true);
    console.log('[App] Edit modal opened, isEditingEquation will be:', true);
  };

  const handleSaveEquation = () => {
    setIsEditModalOpen(false);
    setPreviousEquation(null);
  };

  const handleCancelEquation = () => {
    if (previousEquation) {
      // Restore coefficients from backup
      store.equation.setCoefficients(previousEquation.coefficients);
    }
    setIsEditModalOpen(false);
    setPreviousEquation(null);
  };


  return (
    <div className="outer-app-container">
      <div className="app">
        {/* 1. Header with controls */}
        <div className="controls">
          <div className="controls-row">
            <h1>Number Zoomer</h1>
            <div className="control-buttons">
              <button onClick={() => store.resetView()}>Reset View</button>
              <button onClick={() => store.moveCurrentPointToCenter()}>Center Point</button>
            </div>
            <div className="version-debug-container">
              <div className="version-display">v{store.version}</div>
              <div className="debug-info-buttons">
                <div 
                  className="info-button"
                  onClick={() => setIsAboutModalOpen(true)}
                  title="About Number Zoomer"
                >
                  ℹ️
                </div>
                <div 
                  className={`debug-toggle ${store.showDebugInfo ? 'active' : ''}`}
                  onClick={() => store.toggleDebugInfo()}
                  title="Toggle debug info"
                >
                  🕵️
                </div>
              </div>
            </div>
          </div>
          <DebugInfo store={store} />
        </div>
        
        {/* 2. Equation heading */}
        <div className="equation-heading-container">
          <h2 className="equation-heading">
            {store.equation.getDisplayName()}
            <button 
              className="equation-edit-button"
              onClick={handleOpenEditModal}
              title="Edit equation"
            >
              ✏️
            </button>
          </h2>
        </div>
        
        {/* 3. Coordinate plane (flexible) */}
        <div className="coordinate-plane-area">
          <CoordinatePlane store={store} isEditingEquation={isEditModalOpen} />
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
      
      {/* Equation Edit Modal */}
      <EquationEditModal
        isOpen={isEditModalOpen}
        equation={store.equation as PolynomialEquation}
        onSave={handleSaveEquation}
        onCancel={handleCancelEquation}
      />
      
      {/* About Modal */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
    </div>
  );
});
