import React, { useState, useRef } from 'react';
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
    
    // Track editing state to maintain degree visibility while sliding
    if (value === 0 && degree > 0) {
      setEditingCoefficient(degree);
      
      // Clear editing state after a short delay
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setEditingCoefficient(null);
      }, 1000); // Keep visible for 1 second after setting to 0
    } else {
      // If moving away from 0, clear editing state immediately
      if (editingCoefficient === degree) {
        setEditingCoefficient(null);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }
    }
  };

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

  const isOnlyNonZeroTerm = (degree: number): boolean => {
    const currentCoeff = equation.getCoefficient(degree);
    if (currentCoeff === 0) return false;
    
    // Check if this is the only non-zero coefficient
    for (let i = 0; i <= Math.max(5, equation.coefficients.length - 1); i++) {
      if (i !== degree && equation.getCoefficient(i) !== 0) {
        return false;
      }
    }
    return true;
  };

  // Create rows for degrees 0 through max(current degree, 0), plus empty rows up to degree 5
  const renderCoefficientRows = () => {
    const rows = [];
    
    // Always show degree 0 through effective max degree, with all 6 rows for layout stability
    const minDegree = 0;
    const displayUpTo = effectiveMaxDegree;
    
    // Render all 6 coefficient rows (0-5) with visibility control
    for (let degree = 0; degree <= 5; degree++) {
      const coefficient = equation.getCoefficient(degree);
      const isZero = coefficient === 0;
      const shouldShow = degree <= displayUpTo;
      const showRemoveButton = !isZero && !isOnlyNonZeroTerm(degree);
      const isGreyedOut = isZero && !(degree === 0 && effectiveMaxDegree === 0); // Don't grey out constant term if it's the only term
      
      rows.push(
        <div 
          key={degree} 
          className={`coefficient-row ${!shouldShow ? 'coefficient-row-hidden' : ''}`}
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
              className="coefficient-slider"
              disabled={!shouldShow}
            />
            <div className="remove-button-placeholder">
              {showRemoveButton && shouldShow ? (
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
    }
    
    // All rows are now rendered above with visibility control
    
    return rows;
  };

  return (
    <div className="polynomial-editor">
      <div className="coefficient-rows">
        {renderCoefficientRows()}
      </div>
      
      {canAddDegree && (
        <div className="add-degree-section">
          <button
            onClick={handleAddDegree}
            className="add-degree-button"
            title="Add next degree term"
          >
            + Add {formatDegreeLabel(effectiveMaxDegree + 1)} term
          </button>
        </div>
      )}
    </div>
  );
});