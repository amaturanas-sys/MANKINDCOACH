/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { monthLabel, sameMonth, shiftMonth, weekdayIndexFor, MONTH_NAMES, parseLeadingNumber } from './constants';

describe('monthLabel', () => {
  it('formatea mes y año en español', () => {
    expect(monthLabel({ year: 2026, monthIndex: 4 })).toBe('Mayo 2026');
    expect(monthLabel({ year: 2025, monthIndex: 0 })).toBe('Enero 2025');
    expect(monthLabel({ year: 2025, monthIndex: 11 })).toBe('Diciembre 2025');
  });
});

describe('sameMonth', () => {
  it('compara correctamente', () => {
    expect(sameMonth({ year: 2026, monthIndex: 4 }, { year: 2026, monthIndex: 4 })).toBe(true);
    expect(sameMonth({ year: 2026, monthIndex: 4 }, { year: 2026, monthIndex: 5 })).toBe(false);
    expect(sameMonth({ year: 2026, monthIndex: 4 }, { year: 2027, monthIndex: 4 })).toBe(false);
  });
});

describe('shiftMonth', () => {
  it('avanza un mes dentro del mismo año', () => {
    expect(shiftMonth({ year: 2026, monthIndex: 4 }, 1)).toEqual({ year: 2026, monthIndex: 5 });
  });

  it('cruza fin de año hacia adelante', () => {
    expect(shiftMonth({ year: 2026, monthIndex: 11 }, 1)).toEqual({ year: 2027, monthIndex: 0 });
  });

  it('cruza inicio de año hacia atrás', () => {
    expect(shiftMonth({ year: 2026, monthIndex: 0 }, -1)).toEqual({ year: 2025, monthIndex: 11 });
  });

  it('soporta saltos grandes', () => {
    expect(shiftMonth({ year: 2026, monthIndex: 0 }, 25)).toEqual({ year: 2028, monthIndex: 1 });
    expect(shiftMonth({ year: 2026, monthIndex: 0 }, -13)).toEqual({ year: 2024, monthIndex: 11 });
  });
});

describe('weekdayIndexFor', () => {
  it('devuelve 0 (lunes) para el lunes 4 de mayo 2026', () => {
    // 4 de mayo 2026 es Lunes
    expect(weekdayIndexFor(2026, 4, 4)).toBe(0);
  });

  it('devuelve 6 (domingo) para el domingo 10 de mayo 2026', () => {
    // 10 de mayo 2026 es Domingo
    expect(weekdayIndexFor(2026, 4, 10)).toBe(6);
  });

  it('coincide con el ciclo 0..6 para días sucesivos', () => {
    const indices = [4, 5, 6, 7, 8, 9, 10].map(d => weekdayIndexFor(2026, 4, d));
    expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('MONTH_NAMES', () => {
  it('contiene 12 meses en español', () => {
    expect(MONTH_NAMES).toHaveLength(12);
    expect(MONTH_NAMES[0]).toBe('Enero');
    expect(MONTH_NAMES[11]).toBe('Diciembre');
  });
});

describe('parseLeadingNumber', () => {
  it('extrae enteros y decimales con unidad', () => {
    expect(parseLeadingNumber('100 kg')).toBe(100);
    expect(parseLeadingNumber('80.5 kg')).toBe(80.5);
    expect(parseLeadingNumber('14.0%')).toBe(14);
  });

  it('soporta coma como separador decimal', () => {
    expect(parseLeadingNumber('80,5 kg')).toBe(80.5);
  });

  it('extrae números negativos', () => {
    expect(parseLeadingNumber('-3 kg')).toBe(-3);
  });

  it('devuelve null para entradas sin números', () => {
    expect(parseLeadingNumber('')).toBeNull();
    expect(parseLeadingNumber(undefined)).toBeNull();
    expect(parseLeadingNumber('Sin medir')).toBeNull();
  });
});
