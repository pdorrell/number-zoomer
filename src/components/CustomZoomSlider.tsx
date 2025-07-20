import React, { useRef, useState, useCallback } from 'react';
import { ZoomableInterface, ZoomSource } from '../interfaces/ZoomableInterface';

interface CustomZoomSliderProps {
  zoomable: ZoomableInterface;
  source: ZoomSource;
  zoomRange: number;
  className?: string;
  disabled?: boolean;
}

export const CustomZoomSlider: React.FC<CustomZoomSliderProps> = ({
  zoomable,
  source,
  zoomRange,
  className = '',
  disabled = false
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [circlePosition, setCirclePosition] = useState<{ x: number; y: number } | null>(null);
  const [startPosition, setStartPosition] = useState<{ x: number; y: number } | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const calculateZoomFactor = useCallback((deltaX: number, sliderWidth: number): number => {
    // deltaX is the distance travelled from start position
    // Positive deltaX = zoom in, negative deltaX = zoom out
    const normalizedDistance = deltaX / sliderWidth; // -1 to 1 range
    const exponent = normalizedDistance; // Full range = zoomRange^1 = zoomRange
    return Math.pow(zoomRange, exponent);
  }, [zoomRange]);

  const getMousePosition = useCallback((event: React.MouseEvent | React.TouchEvent, rect: DOMRect) => {
    let clientX: number;
    let clientY: number;
    
    if ('touches' in event) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }, []);

  const handleStart = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    
    event.preventDefault();
    
    const rect = sliderRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const position = getMousePosition(event, rect);
    
    setIsDragging(true);
    setStartPosition(position);
    setCirclePosition(position);
    
    // Start zoom operation
    zoomable.startZoom(source, 'slider');
  }, [disabled, zoomable, source, getMousePosition]);

  const handleMove = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDragging || !startPosition || !sliderRef.current) return;
    
    event.preventDefault();
    
    const rect = sliderRef.current.getBoundingClientRect();
    let clientX: number;
    let clientY: number;
    
    if ('touches' in event) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;
    
    // Update circle position
    setCirclePosition({ x: currentX, y: currentY });
    
    // Calculate zoom factor based on horizontal distance travelled
    const deltaX = currentX - startPosition.x;
    const sliderWidth = rect.width;
    const zoomFactor = calculateZoomFactor(deltaX, sliderWidth);
    
    // Update zoom factor
    zoomable.setZoomFactor(source, zoomFactor);
  }, [isDragging, startPosition, source, zoomable, calculateZoomFactor]);

  const handleEnd = useCallback(() => {
    if (!isDragging || !startPosition || !sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const deltaX = (circlePosition?.x || startPosition.x) - startPosition.x;
    const sliderWidth = rect.width;
    const finalZoomFactor = calculateZoomFactor(deltaX, sliderWidth);
    
    // Complete zoom operation
    zoomable.completeZoom(source, finalZoomFactor);
    
    // Start fade-out animation
    setIsFadingOut(true);
    setIsDragging(false);
    
    // Clear state after fade-out completes
    setTimeout(() => {
      setCirclePosition(null);
      setStartPosition(null);
      setIsFadingOut(false);
    }, 200);
  }, [isDragging, startPosition, circlePosition, source, zoomable, calculateZoomFactor]);

  // Global event listeners for mouse/touch move and end
  React.useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => handleMove(e);
    const handleTouchMove = (e: TouchEvent) => handleMove(e);
    const handleMouseUp = () => handleEnd();
    const handleTouchEnd = () => handleEnd();
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  const sliderStyle: React.CSSProperties = {
    position: 'relative',
    width: '300px',
    height: '40px',
    backgroundColor: disabled ? '#f0f0f0' : '#e0e0e0',
    border: '1px solid #ccc',
    borderRadius: '20px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    userSelect: 'none',
    touchAction: 'none', // Prevent default touch behaviors
    opacity: disabled ? 0.6 : 1
  };

  const circleStyle: React.CSSProperties = circlePosition ? {
    position: 'absolute',
    left: `${circlePosition.x - 15}px`,
    top: `${circlePosition.y - 15}px`,
    width: '30px',
    height: '30px',
    backgroundColor: '#007bff',
    borderRadius: '50%',
    border: '2px solid white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    pointerEvents: 'none',
    zIndex: 10,
    opacity: isFadingOut ? 0 : 1,
    transition: 'opacity 200ms ease'
  } : {};

  return (
    <div className={`custom-zoom-slider ${className}`}>
      <div
        ref={sliderRef}
        style={sliderStyle}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
      >
        {circlePosition && (
          <div style={circleStyle} />
        )}
        {!isDragging && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#666',
              fontSize: '14px',
              pointerEvents: 'none'
            }}
          >
            Click to zoom
          </div>
        )}
      </div>
      <div
        style={{
          marginTop: '8px',
          fontSize: '12px',
          color: '#666',
          textAlign: 'center',
          height: '18px', // Reserve space to prevent layout shifts
          opacity: (isDragging && startPosition && circlePosition) ? 1 : 0,
          transition: 'opacity 150ms ease'
        }}
      >
        {isDragging && startPosition && circlePosition && (
          <>Zoom: {calculateZoomFactor(circlePosition.x - startPosition.x, 300).toFixed(2)}x</>
        )}
      </div>
    </div>
  );
};