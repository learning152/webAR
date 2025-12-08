import { ShapeType } from '../shapes/ShapeGenerator';

/**
 * Configuration for a shape type including display information
 */
export interface ShapeConfig {
  label: string;      // 中文标签
  icon: string;       // 图标 emoji
  gesture: string;    // 对应手势
  color?: string;     // 按钮颜色（可选）
}

/**
 * Mapping from ShapeType enum values to their display configuration
 * This map is used to dynamically generate shape buttons in the gesture simulator
 */
export const SHAPE_CONFIG_MAP: Record<ShapeType, ShapeConfig> = {
  [ShapeType.PLANET]: { 
    label: '行星', 
    icon: '🌍', 
    gesture: '张手' 
  },
  [ShapeType.TEXT]: { 
    label: '文字', 
    icon: '📝', 
    gesture: '剪刀手' 
  },
  [ShapeType.TORUS]: { 
    label: '圆环', 
    icon: '⭕', 
    gesture: '握拳' 
  },
  [ShapeType.STAR]: { 
    label: '星形', 
    icon: '⭐', 
    gesture: '食指' 
  },
  [ShapeType.HEART]: { 
    label: '爱心', 
    icon: '❤️', 
    gesture: '竖大拇指' 
  },
  [ShapeType.ARROW_HEART]: { 
    label: '一箭穿心', 
    icon: '💘', 
    gesture: '手指比心' 
  }
};

/**
 * Get all shape types from the ShapeType enum
 * This function is used to dynamically generate buttons for all available shapes
 * 
 * @returns Array of all ShapeType enum values
 */
export function getAllShapeTypes(): ShapeType[] {
  return Object.values(ShapeType);
}

/**
 * Get the configuration for a specific shape type
 * If no configuration exists for the given type, returns a default configuration
 * using the enum value as the label
 * 
 * @param type - The shape type to get configuration for
 * @returns ShapeConfig object with label, icon, and gesture information
 */
export function getShapeConfig(type: ShapeType): ShapeConfig {
  // Use hasOwnProperty to avoid accessing inherited properties like 'valueOf', 'toString', etc.
  if (Object.prototype.hasOwnProperty.call(SHAPE_CONFIG_MAP, type)) {
    return SHAPE_CONFIG_MAP[type];
  }
  
  console.warn(`形态类型 ${type} 没有配置，使用默认值`);
  return {
    label: type,
    icon: '❓',
    gesture: '未知'
  };
}
