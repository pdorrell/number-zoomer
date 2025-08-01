import React, { useState, useRef, useEffect } from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 150, y: 150 });
  const modalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    if (headerRef.current && headerRef.current.contains(e.target as Node)) {
      setIsDragging(true);
      const rect = modalRef.current?.getBoundingClientRect();
      if (rect && e.touches.length > 0) {
        setDragOffset({
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top
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

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging && e.touches.length > 0) {
      setPosition({
        x: e.touches[0].clientX - dragOffset.x,
        y: e.touches[0].clientY - dragOffset.y
      });
      e.preventDefault(); // Prevent scrolling
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragOffset]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div
        ref={modalRef}
        className="about-modal"
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
          onTouchStart={handleTouchStart}
          style={{ cursor: 'grab', touchAction: 'none' }}
        >
          <h3>Number Zoomer</h3>
        </div>

        <div className="modal-content">
          <div className="about-description">
            <p>A portal into the ℝ² number plane.</p>
            <p>Zoom in. Zoom Out.</p>
            <p>Zoom really, really, really far in.</p>
            <p>Drag the window around.</p>
            <p>Drag the point around.</p>
            <p>Find the square root of 2.</p>
            <p>Edit the equation.</p>
          </div>

          <div className="about-footer">
            <div className="about-copyright">
              Philip Dorrell © 2025
            </div>
            <div className="about-links">
              <a
                href="https://github.com/pdorrell/number-zoomer"
                target="_blank"
                rel="noopener noreferrer"
              >
                Source
              </a>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="modal-button modal-save">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
