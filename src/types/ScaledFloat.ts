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

  mulScaled(other: ScaledFloat): ScaledFloat {
    if (this.mantissa === 0 || other.mantissa === 0) {
      return new ScaledFloat(0);
    }

    const newMantissa = this.mantissa * other.mantissa;
    const newExponent = this.exponent + other.exponent;
    return new ScaledFloat(newMantissa, newExponent);
  }

  neg(): ScaledFloat {
    if (this.mantissa === 0) {
      return new ScaledFloat(0);
    }
    return ScaledFloat.fromMantissaExponent(-this.mantissa, this.exponent);
  }

  add(other: ScaledFloat): ScaledFloat {
    if (this.mantissa === 0) {
      return ScaledFloat.fromMantissaExponent(other.mantissa, other.exponent);
    }
    if (other.mantissa === 0) {
      return ScaledFloat.fromMantissaExponent(this.mantissa, this.exponent);
    }

    // Find the maximum exponent
    const maxExponent = Math.max(this.exponent, other.exponent);

    // Scale both numbers by reducing exponent by maxExponent
    const thisScaled = this.mantissa * Math.pow(10, this.exponent - maxExponent);
    const otherScaled = other.mantissa * Math.pow(10, other.exponent - maxExponent);

    // Convert to float and add (underflow numbers become zero)
    const thisFloat = Math.abs(thisScaled) < Number.MIN_VALUE ? 0 : thisScaled;
    const otherFloat = Math.abs(otherScaled) < Number.MIN_VALUE ? 0 : otherScaled;
    const resultFloat = thisFloat + otherFloat;

    // Convert result to ScaledFloat and rescale by adding maxExponent back
    if (resultFloat === 0) {
      return new ScaledFloat(0);
    }

    return new ScaledFloat(resultFloat, maxExponent);
  }

  sub(other: ScaledFloat): ScaledFloat {
    return this.add(other.neg());
  }

  // Keep the old add(float) method for backward compatibility
  addFloat(value: float): ScaledFloat {
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

  toFloatBounded(minValue: float, maxValue: float): float {
    if (this.mantissa === 0) {
      return 0;
    }

    // Check if exponent is too large (would overflow)
    if (this.exponent > 308) { // Close to Number.MAX_VALUE exponent
      return this.mantissa > 0 ? maxValue : minValue;
    }

    // Check if exponent is too small (would underflow to zero)
    if (this.exponent < -324) { // Close to Number.MIN_VALUE exponent
      return 0;
    }

    const value = this.mantissa * Math.pow(10, this.exponent);

    if (value > maxValue) {
      return maxValue;
    }
    if (value < minValue) {
      return minValue;
    }

    return value;
  }

  toFloat(): float {
    if (this.mantissa === 0) {
      return 0;
    }
    return this.mantissa * Math.pow(10, this.exponent);
  }


  toString(): string {
    if (this.mantissa === 0) {
      return "0";
    }
    return `${this.mantissa}e${this.exponent}`;
  }

  abs(): ScaledFloat {
    if (this.mantissa === 0) {
      return new ScaledFloat(0);
    }
    return ScaledFloat.fromMantissaExponent(Math.abs(this.mantissa), this.exponent);
  }

  log10(): number {
    if (this.mantissa === 0) {
      return -Infinity;
    }
    if (this.mantissa < 0) {
      throw new Error("Cannot take log10 of negative number");
    }

    // log10(mantissa * 10^exponent) = log10(mantissa) + exponent
    return Math.log10(this.mantissa) + this.exponent;
  }

  // Vector operations for 2D points/vectors
  static addVector(point: [ScaledFloat, ScaledFloat], vector: [ScaledFloat, ScaledFloat]): [ScaledFloat, ScaledFloat] {
    return [
      point[0].add(vector[0]),
      point[1].add(vector[1])
    ];
  }

  static subtractPoints(point1: [ScaledFloat, ScaledFloat], point2: [ScaledFloat, ScaledFloat]): [ScaledFloat, ScaledFloat] {
    return [
      point1[0].sub(point2[0]),
      point1[1].sub(point2[1])
    ];
  }

  static multiplyVector(vector: [ScaledFloat, ScaledFloat], scalar: ScaledFloat): [ScaledFloat, ScaledFloat] {
    return [
      vector[0].mulScaled(scalar),
      vector[1].mulScaled(scalar)
    ];
  }
}
