// Type aliases for clarity
export type int = number;
export type float = number;

export class ScaledFloat {
  private mantissa: float;
  private exponent: int;

  constructor(value: float, exponent: int = 0) {
    if (value === 0) {
      this.mantissa = 0;
      this.exponent = 0;
      return;
    }

    // Normalize mantissa to be in range [1.0, 10.0) or (-10.0, -1.0]
    const absValue = Math.abs(value);
    const sign = Math.sign(value);
    
    if (absValue >= 1.0 && absValue < 10.0) {
      this.mantissa = value;
      this.exponent = exponent;
    } else {
      const adjustment = Math.floor(Math.log10(absValue));
      this.mantissa = sign * (absValue / Math.pow(10, adjustment));
      this.exponent = exponent + adjustment;
    }
  }

  static fromMantissaExponent(mantissa: float, exponent: int): ScaledFloat {
    const result = new ScaledFloat(0);
    result.mantissa = mantissa;
    result.exponent = exponent;
    return result;
  }

  getMantissa(): float {
    return this.mantissa;
  }

  getExponent(): int {
    return this.exponent;
  }

  reciprocal(): ScaledFloat {
    if (this.mantissa === 0) {
      throw new Error("Cannot take reciprocal of zero");
    }
    return ScaledFloat.fromMantissaExponent(1.0 / this.mantissa, -this.exponent);
  }

  mul(value: float): ScaledFloat {
    if (value === 0 || this.mantissa === 0) {
      return new ScaledFloat(0);
    }
    
    const newMantissa = this.mantissa * value;
    return new ScaledFloat(newMantissa, this.exponent);
  }

  add(value: float): ScaledFloat {
    if (this.mantissa === 0) {
      return new ScaledFloat(value);
    }
    if (value === 0) {
      return ScaledFloat.fromMantissaExponent(this.mantissa, this.exponent);
    }

    // Convert both to the same scale for addition
    const thisValue = this.mantissa * Math.pow(10, this.exponent);
    const result = thisValue + value;
    return new ScaledFloat(result);
  }

  toFloatInBounds(minValue: float, maxValue: float): float | null {
    if (this.mantissa === 0) {
      return 0;
    }

    // Check if exponent is too large (would overflow)
    if (this.exponent > 308) { // Close to Number.MAX_VALUE exponent
      return null;
    }

    // Check if exponent is too small (would underflow to zero)
    if (this.exponent < -324) { // Close to Number.MIN_VALUE exponent
      return 0;
    }

    const value = this.mantissa * Math.pow(10, this.exponent);
    
    if (value < minValue || value > maxValue) {
      return null;
    }
    
    return value;
  }

  toFloat(): float {
    if (this.mantissa === 0) {
      return 0;
    }
    return this.mantissa * Math.pow(10, this.exponent);
  }

  toPreciseDecimal(precision: int): any {
    // Import PreciseDecimal dynamically to avoid circular dependency
    const { PreciseDecimal } = require('./Decimal');
    
    if (this.mantissa === 0) {
      return new PreciseDecimal(0, precision);
    }
    
    const valueStr = this.toString();
    return PreciseDecimal.fromString(valueStr, precision);
  }

  toString(): string {
    if (this.mantissa === 0) {
      return "0";
    }
    return `${this.mantissa}e${this.exponent}`;
  }

  // Vector operations for 2D points/vectors
  static addVector(point: [ScaledFloat, ScaledFloat], vector: [ScaledFloat, ScaledFloat]): [ScaledFloat, ScaledFloat] {
    return [
      ScaledFloat.fromMantissaExponent(point[0].mantissa + vector[0].toFloat(), point[0].exponent),
      ScaledFloat.fromMantissaExponent(point[1].mantissa + vector[1].toFloat(), point[1].exponent)
    ];
  }

  static subtractPoints(point1: [ScaledFloat, ScaledFloat], point2: [ScaledFloat, ScaledFloat]): [ScaledFloat, ScaledFloat] {
    return [
      new ScaledFloat(point1[0].toFloat() - point2[0].toFloat()),
      new ScaledFloat(point1[1].toFloat() - point2[1].toFloat())
    ];
  }

  static multiplyVector(vector: [ScaledFloat, ScaledFloat], scalar: ScaledFloat): [ScaledFloat, ScaledFloat] {
    return [
      ScaledFloat.fromMantissaExponent(vector[0].mantissa * scalar.toFloat(), vector[0].exponent),
      ScaledFloat.fromMantissaExponent(vector[1].mantissa * scalar.toFloat(), vector[1].exponent)
    ];
  }
}