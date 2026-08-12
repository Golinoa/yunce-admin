import { getTraceId, getLogUserId, runWithLogContext } from '../logger';

describe('Logger traceId context', () => {
  it('should return undefined when no context is set', () => {
    expect(getTraceId()).toBeUndefined();
    expect(getLogUserId()).toBeUndefined();
  });

  it('should return traceId within runWithLogContext', () => {
    runWithLogContext('trace-123', 'user-456', () => {
      expect(getTraceId()).toBe('trace-123');
      expect(getLogUserId()).toBe('user-456');
    });
  });

  it('should return undefined after context exits', () => {
    runWithLogContext('trace-789', 'user-012', () => {
      expect(getTraceId()).toBe('trace-789');
    });
    expect(getTraceId()).toBeUndefined();
  });

  it('should handle missing userId', () => {
    runWithLogContext('trace-abc', undefined, () => {
      expect(getTraceId()).toBe('trace-abc');
      expect(getLogUserId()).toBeUndefined();
    });
  });

  it('should support nested contexts', () => {
    runWithLogContext('outer', 'user-1', () => {
      expect(getTraceId()).toBe('outer');
      runWithLogContext('inner', 'user-2', () => {
        expect(getTraceId()).toBe('inner');
        expect(getLogUserId()).toBe('user-2');
      });
      expect(getTraceId()).toBe('outer');
    });
  });
});
