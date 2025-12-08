import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ShapeType } from '../shapes/ShapeGenerator';
import { getShapeConfig, getAllShapeTypes, SHAPE_CONFIG_MAP } from './shapeConfig';

/**
 * Property-based tests for shape configuration
 * Feature: gesture-simulator-fallback
 */
describe('ShapeConfig Property Tests', () => {
  /**
   * Property 6: 形态配置默认值回退
   * Validates: Requirements 6.2, 6.3
   * 
   * For any shape type string (including invalid ones), getShapeConfig should
   * never throw an error and should always return a valid ShapeConfig object
   * with label, icon, and gesture properties.
   */
  it('Property 6: should provide default fallback for any shape type without throwing', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (shapeTypeString) => {
          // Cast the string to ShapeType to test the fallback behavior
          const shapeType = shapeTypeString as ShapeType;
          
          // The function should not throw for any input
          const config = getShapeConfig(shapeType);
          
          // Should always return an object with required properties
          expect(config).toBeDefined();
          expect(config).toHaveProperty('label');
          expect(config).toHaveProperty('icon');
          expect(config).toHaveProperty('gesture');
          
          // Properties should be strings
          expect(typeof config.label).toBe('string');
          expect(typeof config.icon).toBe('string');
          expect(typeof config.gesture).toBe('string');
          
          // If the shape type is not in the map, it should use default values
          if (!Object.values(ShapeType).includes(shapeType)) {
            expect(config.label).toBe(shapeTypeString);
            expect(config.icon).toBe('❓');
            expect(config.gesture).toBe('未知');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: All valid ShapeType enum values should have configurations
   */
  it('should have configuration for all valid ShapeType enum values', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(ShapeType)),
        (shapeType) => {
          const config = getShapeConfig(shapeType);
          
          // Valid shape types should have proper configurations (not defaults)
          expect(config).toBeDefined();
          expect(config.label).not.toBe('❓');
          expect(config.icon).not.toBe('❓');
          expect(config.gesture).not.toBe('未知');
          
          // Should match the configuration in the map
          expect(config).toEqual(SHAPE_CONFIG_MAP[shapeType]);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: getAllShapeTypes should return all enum values
   */
  it('should return all ShapeType enum values from getAllShapeTypes', () => {
    const allTypes = getAllShapeTypes();
    const enumValues = Object.values(ShapeType);
    
    // Should have the same length
    expect(allTypes.length).toBe(enumValues.length);
    
    // Should contain all enum values
    for (const enumValue of enumValues) {
      expect(allTypes).toContain(enumValue);
    }
  });
});
