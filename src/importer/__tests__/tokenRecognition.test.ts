import { describe, expect, it } from 'vitest';
import { formatConstraint, parseConstraint } from '../../domain/constraints';

describe('Token and Constraint Parsing', () => {
  it('correctly parses equality and difference constraints', () => {
    expect(parseConstraint('=')).toEqual({ type: 'equal' });
    expect(parseConstraint('≠')).toEqual({ type: 'different' });
    expect(formatConstraint({ type: 'equal' })).toBe('=');
    expect(formatConstraint({ type: 'different' })).toBe('≠');
  });

  it('correctly parses less-than constraints', () => {
    expect(parseConstraint('<2')).toEqual({ type: 'lessThan', value: 2 });
    expect(parseConstraint('<5')).toEqual({ type: 'lessThan', value: 5 });
    expect(parseConstraint('<7')).toEqual({ type: 'lessThan', value: 7 });
    expect(formatConstraint({ type: 'lessThan', value: 2 })).toBe('<2');
  });

  it('correctly parses greater-than constraints', () => {
    expect(parseConstraint('>2')).toEqual({ type: 'greaterThan', value: 2 });
    expect(parseConstraint('>4')).toEqual({ type: 'greaterThan', value: 4 });
    expect(formatConstraint({ type: 'greaterThan', value: 4 })).toBe('>4');
  });

  it('correctly parses numeric sum constraints', () => {
    expect(parseConstraint('11')).toEqual({ type: 'sum', value: 11 });
    expect(parseConstraint('24')).toEqual({ type: 'sum', value: 24 });
    expect(parseConstraint('0')).toEqual({ type: 'sum', value: 0 });
    expect(formatConstraint({ type: 'sum', value: 11 })).toBe('11');
  });

  it('handles invalid or empty constraint tokens gracefully', () => {
    expect(parseConstraint('')).toBeNull();
    expect(parseConstraint('xyz')).toBeNull();
    expect(formatConstraint(null)).toBe('');
  });
});
