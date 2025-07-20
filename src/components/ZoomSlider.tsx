import React, { useState, useCallback, useEffect } from 'react';

interface ZoomSliderProps {
  onZoomChange: (zoomFactor: number, isComplete: boolean) => void;
  disabled?: boolean;
}

export const ZoomSlider: React.FC<ZoomSliderProps> = ({ onZoomChange, disabled = false }) => {
  const [sliderValue, setSliderValue] = useState(0.5);
  const [isDisabled, setIsDisabled] = useState(disabled);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate zoom factor: F = 2^(2x-1) where x is slider value
  const calculateZoomFactor = (value: number): number => {
    return Math.pow(2, 2 * value - 1);
  };

  const handleSliderChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (isDisabled) return;
    
    const value = parseFloat(event.target.value);
    setSliderValue(value);
    
    const zoomFactor = calculateZoomFactor(value);
    onZoomChange(zoomFactor, false); // Not complete yet
  }, [isDisabled, onZoomChange]);

  const handleSliderStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleSliderEnd = useCallback(() => {
    if (isDisabled) return;
    
    const zoomFactor = calculateZoomFactor(sliderValue);
    onZoomChange(zoomFactor, true); // Complete
    
    setIsDragging(false);
    setIsDisabled(true);
    
    // Reset after delay
    setTimeout(() => {
      setSliderValue(0.5);
      setIsDisabled(false);
    }, 300);
  }, [isDisabled, sliderValue, onZoomChange]);

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