import React from 'react';
import { EquationType } from '../types/Equation';

interface EquationSelectorProps {
  equationType: EquationType;
  linearC: number;
  onEquationTypeChange: (type: EquationType) => void;
  onLinearCChange: (c: number) => void;
}

export const EquationSelector: React.FC<EquationSelectorProps> = ({
  equationType,
  linearC,
  onEquationTypeChange,
  onLinearCChange
}) => {
  const handleEquationTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const type = event.target.value as EquationType;
    onEquationTypeChange(type);
  };

  const handleLinearCChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const c = parseInt(event.target.value, 10);
    onLinearCChange(c);
  };

  return (
    <div className="equation-controls">
      <label>
        Equation: 
        <select value={equationType} onChange={handleEquationTypeChange}>
          <option value="quadratic">y = x²</option>
          <option value="linear">y = cx</option>
        </select>
      </label>
      {equationType === 'linear' && (
        <label>
          c = 
          <select value={linearC} onChange={handleLinearCChange}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
};