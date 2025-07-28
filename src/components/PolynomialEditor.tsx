import React, { useState, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { PolynomialEquation } from '../types/Equation';

interface PolynomialEditorProps {
  equation: PolynomialEquation;
}

export const PolynomialEditor: React.FC<PolynomialEditorProps> = observer(({ equation }) => {
  const [editingCoefficient, setEditingCoefficient] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const maxDisplayDegree = equation.getMaxDisplayDegree();
  const effectiveMaxDegree = editingCoefficient !== null ? Math.max(maxDisplayDegree, editingCoefficient) : maxDisplayDegree;
  const canAddDegree = effectiveMaxDegree < 5;

  const handleCoefficientChange = (degree: number, value: number) => {
    equation.setCoefficient(degree, value);
  };

  const handleSliderMouseDown = (degree: number) => {
    // Set editing state when user starts dragging
    setEditingCoefficient(degree);
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleSliderMouseUp = (degree: number) => {
    // Clear editing state when user releases slider
    if (editingCoefficient === degree) {
      setEditingCoefficient(null);
    }
  };

  // Handle global mouse up to catch drags that end outside the slider
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (editingCoefficient !== null) {
        setEditingCoefficient(null);
      }
    };

    const handleGlobalTouchEnd = () => {
      if (editingCoefficient !== null) {
        setEditingCoefficient(null);
      }
    };

    if (editingCoefficient !== null) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchend', handleGlobalTouchEnd);
      
      return () => {
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('touchend', handleGlobalTouchEnd);
      };
    }
  }, [editingCoefficient]);

  const handleRemoveCoefficient = (degree: number) => {
    equation.removeDegree(degree);
  };

  const handleAddDegree = () => {
    equation.addDegree();
  };

  const formatDegreeLabel = (degree: number): string => {
    if (degree === 0) return 'Constant';
    if (degree === 1) return 'x';
    // Use Unicode superscript characters
    const superscriptMap: { [key: string]: string } = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵'
    };
    return `x${superscriptMap[degree.toString()] || degree}`;
  };

  const shouldShowRemoveButton = (degree: number): boolean => {
    // Simple rule: show remove button for any non-zero coefficient
    const currentCoeff = equation.getCoefficient(degree);
    return currentCoeff !== 0;
  };

  // Create rows for degrees 0 through max(current degree, 0), plus empty rows up to degree 5
  const renderCoefficientRows = () => {
    const rows = [];
    
    // Always show degree 0 through effective max degree, with all 6 rows for layout stability
    const minDegree = 0;
    const displayUpTo = effectiveMaxDegree;
    
    // Render all 6 coefficient rows (0-5) with visibility control and inline + button
    for (let degree = 0; degree <= 5; degree++) {
      const coefficient = equation.getCoefficient(degree);
      const isZero = coefficient === 0;
      const shouldShow = degree <= displayUpTo;
      const showRemoveButton = shouldShowRemoveButton(degree);
      const isGreyedOut = isZero && !(degree === 0 && effectiveMaxDegree === 0);
      
      // Show + button if this degree is the next one to add (degree = displayUpTo + 1) and we can add it
      const shouldShowAddButton = degree === displayUpTo + 1 && canAddDegree;
      
      if (shouldShow) {
        // Regular coefficient row
        rows.push(
          <div 
            key={degree} 
            className="coefficient-row"
          >
            <div className="coefficient-label">
              {formatDegreeLabel(degree)}:
            </div>
            <div className="coefficient-value" style={{ color: isGreyedOut ? '#ccc' : 'inherit' }}>
              {coefficient}
            </div>
            <div className="coefficient-controls">
              <input
                type="range"
                min="-20"
                max="20"
                value={coefficient}
                onChange={(e) => handleCoefficientChange(degree, parseInt(e.target.value, 10))}
                onMouseDown={() => handleSliderMouseDown(degree)}
                onMouseUp={() => handleSliderMouseUp(degree)}
                onTouchStart={() => handleSliderMouseDown(degree)}
                onTouchEnd={() => handleSliderMouseUp(degree)}
                className="coefficient-slider"
              />
              <div className="remove-button-placeholder">
                {showRemoveButton ? (
                  <button
                    onClick={() => handleRemoveCoefficient(degree)}
                    className="remove-coefficient-button"
                    title={`Remove ${formatDegreeLabel(degree)} term`}
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        );
      } else if (shouldShowAddButton) {
        // + button row (positioned exactly where the new coefficient row will appear)
        rows.push(
          <div 
            key={`add-${degree}`} 
            className="coefficient-row coefficient-row-add"
          >
            <div className="coefficient-label">
              {formatDegreeLabel(degree)}:
            </div>
            <div className="coefficient-value">
              <button
                onClick={handleAddDegree}
                className="add-degree-button-inline"
                title={`Add ${formatDegreeLabel(degree)} term to the polynomial`}
              >
                +
              </button>
            </div>
            <div className="coefficient-controls">
              <div className="coefficient-slider-placeholder"></div>
              <div className="remove-button-placeholder"></div>
            </div>
          </div>
        );
      } else {
        // Hidden placeholder row to maintain layout
        rows.push(
          <div 
            key={degree} 
            className="coefficient-row coefficient-row-hidden"
          >
            <div className="coefficient-label">
              {formatDegreeLabel(degree)}:
            </div>
            <div className="coefficient-value">
              {coefficient}
            </div>
            <div className="coefficient-controls">
              <input
                type="range"
                min="-20"
                max="20"
                value={coefficient}
                disabled
                className="coefficient-slider"
              />
              <div className="remove-button-placeholder"></div>
            </div>
          </div>
        );
      }
    }
    
    // All rows are now rendered above with visibility control
    
    return rows;
  };

  return (
    <div className="polynomial-editor">
      <div className="coefficient-rows">
        {renderCoefficientRows()}
      </div>
    </div>
  );
});