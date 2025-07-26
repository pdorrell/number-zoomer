import Decimal from 'decimal.js';
import { ScaledFloat, int } from './ScaledFloat';

Decimal.set({ precision: 1000 });

export class PreciseDecimal {
  private value: Decimal;

  constructor(value: string | number | Decimal) {
    this.value = new Decimal(value);
  }

  add(other: PreciseDecimal): PreciseDecimal {
    return new PreciseDecimal(this.value.add(other.value));
  }

  sub(other: PreciseDecimal): PreciseDecimal {
    return new PreciseDecimal(this.value.sub(other.value));
  }

  mul(other: PreciseDecimal): PreciseDecimal {
    return new PreciseDecimal(this.value.mul(other.value));
  }

  div(other: PreciseDecimal): PreciseDecimal {
    return new PreciseDecimal(this.value.div(other.value));
  }

  pow(exponent: number): PreciseDecimal {
    return new PreciseDecimal(this.value.pow(exponent));
  }

  toString(): string {
    return this.value.toString();
  }

  toStringPadded(minDecimalPlaces: number): string {
    const str = this.value.toString();
    
    // Handle scientific notation - just return as-is
    if (str.includes('e') || str.includes('E')) {
      return str;
    }
    
    // Find decimal point
    const decimalIndex = str.indexOf('.');
    
    if (decimalIndex === -1) {
      // No decimal point, add one with required padding
      if (minDecimalPlaces > 0) {
        return str + '.' + ' '.repeat(minDecimalPlaces) + '\u200B'; // Add zero-width space to preserve trailing spaces
      }
      return str;
    }
    
    // Count existing decimal places
    const existingDecimalPlaces = str.length - decimalIndex - 1;
    
    if (existingDecimalPlaces >= minDecimalPlaces) {
      // Already has enough or more decimal places, return as-is
      return str;
    }
    
    // Pad with spaces to reach minimum decimal places
    const paddingNeeded = minDecimalPlaces - existingDecimalPlaces;
    return str + ' '.repeat(paddingNeeded) + '\u200B'; // Add zero-width space to preserve trailing spaces
  }

  toNumber(): number {
    return this.value.toNumber();
  }

  get decimal(): Decimal {
    return this.value;
  }

  quantize(precision: number): PreciseDecimal {
    // Handle negative precision by rounding to nearest power of 10
    if (precision < 0) {
      const power = Math.pow(10, -precision);
      const rounded = this.value.div(power).round().mul(power);
      return new PreciseDecimal(rounded);
    }
    
    // Positive precision: round to decimal places
    const quantizedValue = this.value.toDecimalPlaces(precision);
    return new PreciseDecimal(quantizedValue);
  }

  isWithinInterval(min: PreciseDecimal, max: PreciseDecimal): boolean {
    return this.value.gte(min.value) && this.value.lte(max.value);
  }

  floor(): PreciseDecimal {
    return new PreciseDecimal(this.value.floor());
  }

  ceil(): PreciseDecimal {
    return new PreciseDecimal(this.value.ceil());
  }

  gte(other: PreciseDecimal): boolean {
    return this.value.gte(other.value);
  }

  lte(other: PreciseDecimal): boolean {
    return this.value.lte(other.value);
  }

  toInteger(): number {
    return this.value.floor().toNumber();
  }

  abs(): PreciseDecimal {
    return new PreciseDecimal(this.value.abs());
  }

  toScaledFloat(): ScaledFloat {
    if (this.value.isZero()) {
      return new ScaledFloat(0);
    }

    // Get the exponent from the decimal representation
    const str = this.value.toString();
    const [mantissaStr, exponentStr] = str.toLowerCase().split('e');
    const exponent = exponentStr ? parseInt(exponentStr, 10) : 0;
    
    // Convert mantissa to a number (this is safe as mantissa should be in float range)
    const mantissa = parseFloat(mantissaStr);
    
    return new ScaledFloat(mantissa, exponent);
  }

  static fromString(str: string): PreciseDecimal {
    return new PreciseDecimal(str);
  }
}
