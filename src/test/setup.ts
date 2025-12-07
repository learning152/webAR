import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock Canvas API for testing environment
class MockCanvasRenderingContext2D {
  fillStyle: string = '';
  font: string = '';
  textAlign: string = '';
  textBaseline: string = '';
  
  fillRect() {}
  fillText() {}
  
  getImageData(x: number, y: number, width: number, height: number) {
    // Create mock image data with some text pixels
    const data = new Uint8ClampedArray(width * height * 4);
    
    // Fill with white background
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;     // R
      data[i + 1] = 255; // G
      data[i + 2] = 255; // B
      data[i + 3] = 255; // A
    }
    
    // Create some "text" pixels in the center area (black pixels)
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const textWidth = Math.floor(width * 0.4);
    const textHeight = Math.floor(height * 0.3);
    
    for (let y = centerY - textHeight / 2; y < centerY + textHeight / 2; y++) {
      for (let x = centerX - textWidth / 2; x < centerX + textWidth / 2; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const index = (y * width + x) * 4;
          data[index] = 0;     // R - black
          data[index + 1] = 0; // G - black
          data[index + 2] = 0; // B - black
          data[index + 3] = 255; // A - opaque
        }
      }
    }
    
    return { data };
  }
}

// Mock HTMLCanvasElement
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function(contextType: string) {
    if (contextType === '2d') {
      return new MockCanvasRenderingContext2D() as any;
    }
    return null;
  };
}
