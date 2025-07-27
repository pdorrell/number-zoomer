import React, { useState, useRef, useEffect } from 'react';
import { Equation, EquationType, createEquation } from '../types/Equation';

interface EquationEditModalProps {
  isOpen: boolean;
  equation: Equation;
  onSave: () => void;
  onCancel: () => void;
  onEquationChange: (equation: Equation) => void;
}

export const EquationEditModal: React.FC<EquationEditModalProps> = ({
  isOpen,
  equation,
  onSave,
  onCancel,
  onEquationChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const modalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const equationType = equation.getType();
  const linearC = equationType === 'linear' ? (equation as any).getC() : 1;

  const handleEquationTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const type = event.target.value as EquationType;
    if (type === 'linear') {
      onEquationChange(createEquation({ type: 'linear', c: linearC }));
    } else {
      onEquationChange(createEquation({ type: 'quadratic' }));
    }
  };

  const handleLinearCChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const c = parseInt(event.target.value, 10);
    onEquationChange(createEquation({ type: 'linear', c }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (headerRef.current && headerRef.current.contains(e.target as Node)) {
      setIsDragging(true);
      const rect = modalRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      onSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div 
        ref={modalRef}
        className="equation-edit-modal"
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div 
          ref={headerRef}
          className="modal-header"
          onMouseDown={handleMouseDown}
          style={{ cursor: 'grab' }}
        >
          <h3>Edit Equation</h3>
        </div>
        
        <div className="modal-content">
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
          
          <div className="modal-preview">
            Current: {equation.getDisplayName()}
          </div>
        </div>
        
        <div className="modal-actions">
          <button onClick={onSave} className="modal-button modal-save">
            OK
          </button>
          <button onClick={onCancel} className="modal-button modal-cancel">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};