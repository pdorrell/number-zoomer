import React, { useState, useCallback } from 'react';

interface ZoomSliderProps {
  onZoomStart: () => void;
  onZoomChange: (zoomFactor: number) => void;
  onZoomComplete: (zoomFactor?: number) => void;
  disabled?: boolean;
}

export const ZoomSlider: React.FC<ZoomSliderProps> = ({ onZoomStart, onZoomChange, onZoomComplete, disabled = false }) => {
  const [sliderValue, setSliderValue] = useState(0.5);
  const [isDisabled, setIsDisabled] = useState(disabled);
  const [isDragging, setIsDragging] = useState(false);

  // Sync disabled prop
  React.useEffect(() => {
    setIsDisabled(disabled);
  }, [disabled]);


  // Calculate zoom factor: F = 2^(2x-1) where x is slider value
  const calculateZoomFactor = (value: number): number => {
    return Math.pow(2, 2 * value - 1);
  };

  const handleSliderChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (isDisabled) return;
    
    const value = parseFloat(event.target.value);
    setSliderValue(value);
    
    // Always call onZoomChange for immediate feedback - CSS transforms are cheap
    const zoomFactor = calculateZoomFactor(value);
    onZoomChange(zoomFactor);
  }, [isDisabled, onZoomChange]);

  const handleSliderStart = useCallback(() => {
    setIsDragging(true);
    onZoomStart();
  }, [onZoomStart]);

  const handleSliderEnd = useCallback(() => {
    if (isDisabled) return;
    
    const zoomFactor = calculateZoomFactor(sliderValue);
    
    // Complete the zoom action
    onZoomComplete(zoomFactor);
    
    // Reset slider state immediately
    setIsDragging(false);
    setSliderValue(0.5);
    
  }, [isDisabled, sliderValue, onZoomComplete]);

  // Handle touch events for mobile
  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    handleSliderEnd();
  }, [handleSliderEnd]);

  const currentZoomFactor = calculateZoomFactor(sliderValue);
  const zoomPercentage = Math.round(currentZoomFactor * 100);

  return (
    <div className="zoom-slider-container">
      <div className="zoom-slider-info">
        <span className="zoom-label">Zoom: {zoomPercentage}%</span>
        <span className="zoom-instructions">
          {isDragging ? 'Release to apply' : 'Drag to zoom'}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={sliderValue}
        onChange={handleSliderChange}
        onMouseDown={handleSliderStart}
        onMouseUp={handleSliderEnd}
        onTouchStart={handleSliderStart}
        onTouchEnd={handleTouchEnd}
        disabled={isDisabled}
        className={`zoom-slider ${isDisabled ? 'disabled' : ''} ${isDragging ? 'dragging' : ''}`}
      />
    </div>
  );
};