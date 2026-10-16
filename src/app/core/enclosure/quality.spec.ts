import { isInteractiveQuality, seg, setInteractiveQuality } from './quality';

describe('quality（交互期画质开关）', () => {
  afterEach(() => {
    setInteractiveQuality(false);
  });

  it('returns the full segment count in normal mode', () => {
    setInteractiveQuality(false);
    expect(seg(48)).toBe(48);
    expect(seg(24)).toBe(24);
    expect(seg(32)).toBe(32);
  });

  it('halves the segment count in interactive mode', () => {
    setInteractiveQuality(true);
    expect(isInteractiveQuality()).toBeTrue();
    expect(seg(48)).toBe(24);
    expect(seg(24)).toBe(12);
    expect(seg(32)).toBe(16);
  });

  it('keeps a floor of 10 segments for small counts', () => {
    setInteractiveQuality(true);
    expect(seg(16)).toBe(10);
    expect(seg(6)).toBe(10);
  });

  it('restores full quality when the toggle goes off', () => {
    setInteractiveQuality(true);
    expect(seg(48)).toBe(24);
    setInteractiveQuality(false);
    expect(isInteractiveQuality()).toBeFalse();
    expect(seg(48)).toBe(48);
  });
});
