import React from 'react';
import { observer } from 'mobx-react-lite';
import { PolynomialEquation } from '../types/Equation';

interface PolynomialEditorProps {
  equation: PolynomialEquation;
}

export const PolynomialEditor: React.FC<PolynomialEditorProps> = observer(({ equation }) => {
  const maxDisplayDegree = equation.getMaxDisplayDegree();
  const canAddDegree = maxDisplayDegree < 5;

  const handleCoefficientChange = (degree: number, value: number) => {
    equation.setCoefficient(degree, value);
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
    return `x^${degree}`;
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
    
    // Always show at least degree 0 through current max degree
    const minDegree = 0;
    const displayUpTo = Math.max(maxDisplayDegree, 0);
    
    for (let degree = minDegree; degree <= displayUpTo; degree++) {
      const coefficient = equation.getCoefficient(degree);
      const isZero = coefficient === 0;
      const showRemoveButton = !isZero && !isOnlyNonZeroTerm(degree);
      const isGreyedOut = isZero && !(degree === 0 && maxDisplayDegree === 0); // Don't grey out constant term if it's the only term
      
      rows.push(
        <div key={degree} className="coefficient-row">
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
            />
            {showRemoveButton && (
              <button
                onClick={() => handleRemoveCoefficient(degree)}
                className="remove-coefficient-button"
                title={`Remove ${formatDegreeLabel(degree)} term`}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      );
    }
    
    // Add empty rows for higher degrees up to 5 to prevent layout jumps
    for (let degree = displayUpTo + 1; degree <= 5; degree++) {
      rows.push(
        <div key={degree} className="coefficient-row coefficient-row-hidden">
          <div className="coefficient-label">
            {formatDegreeLabel(degree)}:
          </div>
          <div className="coefficient-value">
            0
          </div>
          <div className="coefficient-controls">
            <input
              type="range"
              min="-20"
              max="20"
              value={0}
              disabled
              className="coefficient-slider"
            />
          </div>
        </div>
      );
    }
    
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
            + Add {formatDegreeLabel(maxDisplayDegree + 1)} term
          </button>
        </div>
      )}
    </div>
  );
});