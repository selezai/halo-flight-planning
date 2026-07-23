import { describe, expect, it } from 'vitest';
import {
  didPointerDrag,
  getActiveTouchCount,
  isMultiTouchGesture,
  normalizeScreenPoint,
  ROUTE_WAYPOINT_TAP_TOLERANCE_PX,
} from '@/lib/planning/mapInteraction';

describe('map interaction helpers', () => {
  it('keeps waypoint taps inside the movement tolerance as taps', () => {
    expect(didPointerDrag({ x: 120, y: 240 }, { x: 123, y: 244 })).toBe(false);
    expect(didPointerDrag({ x: 120, y: 240 }, { x: 120 + ROUTE_WAYPOINT_TAP_TOLERANCE_PX, y: 240 })).toBe(false);
  });

  it('treats waypoint movement beyond the tolerance as a drag', () => {
    expect(didPointerDrag({ x: 120, y: 240 }, { x: 129, y: 240 })).toBe(true);
    expect(didPointerDrag({ x: 120, y: 240 }, { x: 126, y: 247 })).toBe(true);
  });

  it('preserves a drag once movement has already crossed the tolerance', () => {
    expect(didPointerDrag({ x: 120, y: 240 }, { x: 121, y: 241 }, true)).toBe(true);
  });

  it('does not infer a drag from missing screen points alone', () => {
    expect(didPointerDrag(null, { x: 120, y: 240 })).toBe(false);
    expect(didPointerDrag({ x: 120, y: 240 }, null)).toBe(false);
  });

  it('normalizes MapLibre screen point shapes safely', () => {
    expect(normalizeScreenPoint([10, 20])).toEqual({ x: 10, y: 20 });
    expect(normalizeScreenPoint({ x: 30, y: 40 })).toEqual({ x: 30, y: 40 });
    expect(normalizeScreenPoint({ x: '30', y: 40 })).toBeNull();
    expect(normalizeScreenPoint(undefined)).toBeNull();
  });

  it('detects multi-touch map gestures from the original browser touch event', () => {
    const singleTouchEvent = { originalEvent: { touches: { length: 1 } } };
    const multiTouchEvent = { originalEvent: { touches: { length: 2 } } };

    expect(getActiveTouchCount(singleTouchEvent)).toBe(1);
    expect(getActiveTouchCount(multiTouchEvent)).toBe(2);
    expect(isMultiTouchGesture(singleTouchEvent)).toBe(false);
    expect(isMultiTouchGesture(multiTouchEvent)).toBe(true);
  });

  it('does not treat mouse or missing original events as multi-touch', () => {
    expect(getActiveTouchCount({ originalEvent: { type: 'mousedown' } })).toBe(0);
    expect(getActiveTouchCount({})).toBe(0);
    expect(isMultiTouchGesture({ originalEvent: { type: 'mousedown' } })).toBe(false);
  });
});
