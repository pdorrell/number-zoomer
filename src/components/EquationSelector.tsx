import React from 'react';
import { Equation, EquationType, createEquation } from '../types/Equation';

interface EquationSelectorProps {
  equation: Equation;
  setEquation: (equation: Equation) => void;
}

export const EquationSelector: React.FC<EquationSelectorProps> = ({
  equation,
  setEquation
}) => {
  const equationType = equation.getType();
  const linearC = equationType === 'linear' ? (equation as any).getC() : 1;

  const handleEquationTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const type = event.target.value as EquationType;
    if (type === 'linear') {
      // Preserve current c value when switching to linear
      setEquation(createEquation({ type: 'linear', c: linearC }));
    } else {
      setEquation(createEquation({ type: 'quadratic' }));
    }
  };

  const handleLinearCChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const c = parseInt(event.target.value, 10);
    setEquation(createEquation({ type: 'linear', c }));
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