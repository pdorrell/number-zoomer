import Decimal from 'decimal.js';

Decimal.set({ precision: 1000 });

export class PreciseDecimal {
  private value: Decimal;
  private displayPrecision: number;

  constructor(value: string | number | Decimal, precision: number = 10) {
    this.value = new Decimal(value);
    this.displayPrecision = precision;
  }

  add(other: PreciseDecimal): PreciseDecimal {
    return new PreciseDecimal(this.value.add(other.value), Math.max(this.displayPrecision, other.displayPrecision));
  }

  sub(other: PreciseDecimal): PreciseDecimal {
    return new PreciseDecimal(this.value.sub(other.value), Math.max(this.displayPrecision, other.displayPrecision));
  }

  mul(other: PreciseDecimal): PreciseDecimal {
    return new PreciseDecimal(this.value.mul(other.value), Math.max(this.displayPrecision, other.displayPrecision));
  }

  div(other: PreciseDecimal): PreciseDecimal {
    return new PreciseDecimal(this.value.div(other.value), Math.max(this.displayPrecision, other.displayPrecision));
  }

  pow(exponent: number): PreciseDecimal {
    return new PreciseDecimal(this.value.pow(exponent), this.displayPrecision);
  }

  toString(): string {
    // For display, show all significant digits without unnecessary trailing zeros
    const str = this.value.toFixed(this.displayPrecision);
    
    // Remove trailing zeros after decimal point, but keep at least one decimal place if precision > 0
    if (this.displayPrecision > 0 && str.includes('.')) {
      return str.replace(/\.?0+$/, '') || str.slice(0, -1);
    }
    
    return str;
  }

  toFullPrecisionString(): string {
    // Returns the full precision string without any truncation
    return this.value.toString();
  }

  toNumber(): number {
    return this.value.toNumber();
  }

  get decimal(): Decimal {
    return this.value;
  }

  get precision(): number {
    return this.displayPrecision;
  }

  setPrecision(precision: number): PreciseDecimal {
    return new PreciseDecimal(this.value, precision);
  }

  isWithinInterval(min: PreciseDecimal, max: PreciseDecimal): boolean {
    return this.value.gte(min.value) && this.value.lte(max.value);
  }

  static fromString(str: string, precision?: number): PreciseDecimal {
    const actualPrecision = precision ?? (str.includes('.') ? str.split('.')[1].length : 0);
    return new PreciseDecimal(str, actualPrecision);
  }
}