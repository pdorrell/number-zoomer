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
    return `${this.value.toString()}(${this.precision}DP)`;
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

  quantize(precision: number): PreciseDecimal {
    // Actually round/truncate the value to the specified number of decimal places
    const quantizedValue = this.value.toDecimalPlaces(precision);
    return new PreciseDecimal(quantizedValue, precision);
  }

  isWithinInterval(min: PreciseDecimal, max: PreciseDecimal): boolean {
    return this.value.gte(min.value) && this.value.lte(max.value);
  }

  static fromString(str: string, precision?: number): PreciseDecimal {
    const actualPrecision = precision ?? (str.includes('.') ? str.split('.')[1].length : 0);
    return new PreciseDecimal(str, actualPrecision);
  }
}
