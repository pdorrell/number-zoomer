import React, { useState, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Equation, EquationType, PolynomialEquation, convertToPolynomial } from '../types/Equation';
import { PolynomialEditor } from './PolynomialEditor';

interface EquationEditModalProps {
  isOpen: boolean;
  equation: Equation;
  onSave: () => void;
  onCancel: () => void;
  onEquationChange: (equation: Equation) => void;
}

export const EquationEditModal: React.FC<EquationEditModalProps> = observer(({
  isOpen,
  equation,
  onSave,
  onCancel,
  onEquationChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [polynomialEquation, setPolynomialEquation] = useState<PolynomialEquation>(() => 
    convertToPolynomial(equation)
  );
  const modalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Convert to polynomial equation when modal opens
  useEffect(() => {
    if (isOpen) {
      const poly = convertToPolynomial(equation);
      setPolynomialEquation(poly);
      // Immediately update the parent equation to polynomial
      onEquationChange(poly);
    }
  }, [isOpen, equation, onEquationChange]);

  // No longer need legacy equation type handlers - polynomial editor handles everything

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
          <h3>Edit Equation: {polynomialEquation.getDisplayName()}</h3>
        </div>
        
        <div className="modal-content">
          <PolynomialEditor equation={polynomialEquation} />
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
});