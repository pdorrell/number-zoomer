import { makeObservable, observable, action } from 'mobx';
import { PreciseDecimal } from './Decimal';
import { Point, WorldWindow } from './Coordinate';
import { LinearIntersectionCalculator } from '@/utils/LinearIntersectionCalculator';

export interface EquationConfig {
  type: 'polynomial';
  coefficients?: number[]; // For polynomial, index 0 = constant term, index 1 = x term, etc.
}

export class PolynomialEquation {
  // Observable coefficients array - index 0 = constant, index 1 = x, index 2 = x², etc.
  coefficients: number[] = [0]; // Default to polynomial "0"

  constructor(coefficients: number[] = [0]) {
    this.coefficients = [...coefficients];

    makeObservable(this, {
      coefficients: observable,
      setCoefficient: action,
      addDegree: action,
      removeDegree: action,
      setCoefficients: action
    });
  }

  evaluate(x: PreciseDecimal): PreciseDecimal {
    let result = new PreciseDecimal(0);
    let xPower = new PreciseDecimal(1); // x^0 = 1

    for (let i = 0; i < this.coefficients.length; i++) {
      if (this.coefficients[i] !== 0) {
        const term = xPower.mul(new PreciseDecimal(this.coefficients[i]));
        result = result.add(term);
      }
      if (i < this.coefficients.length - 1) {
        xPower = xPower.mul(x); // Prepare x^(i+1) for next iteration
      }
    }

    return result;
  }

  evaluateWithPrecision(x: PreciseDecimal, worldWindow: WorldWindow): PreciseDecimal {
    // Calculate required precision based on world window scale
    const xRange = worldWindow.topRight[0].sub(worldWindow.bottomLeft[0]);
    const yRange = worldWindow.topRight[1].sub(worldWindow.bottomLeft[1]);

    // Use the smaller range to determine precision needed
    const minRange = xRange.abs().lte(yRange.abs()) ? xRange : yRange;
    const rangeMagnitude = Math.abs(minRange.toNumber());

    // Calculate decimal places needed: if range is 0.001, we need at least 3 decimal places
    const decimalPlaces = rangeMagnitude > 0 ? Math.max(3, Math.ceil(-Math.log10(rangeMagnitude)) + 3) : 15;

    // Cap at reasonable maximum to avoid excessive precision
    const windowPrecision = Math.min(decimalPlaces, 20);

    // Evaluate normally first
    const result = this.evaluate(x);

    // Quantize to appropriate precision for the world window
    return result.quantize(windowPrecision);
  }

  getType(): 'polynomial' {
    return 'polynomial';
  }

  getDegree(): number {
    // Find the highest degree with non-zero coefficient
    for (let i = this.coefficients.length - 1; i >= 0; i--) {
      if (this.coefficients[i] !== 0) {
        return i;
      }
    }
    return 0; // All coefficients are zero, degree is 0
  }

  getDisplayName(): string {
    const degree = this.getDegree();

    // Special case: polynomial is just "0"
    if (degree === 0 && this.coefficients[0] === 0) {
      return 'y = 0';
    }

    const terms: string[] = [];

    for (let i = degree; i >= 0; i--) {
      const coeff = this.coefficients[i] || 0;
      if (coeff === 0) continue;

      let term = '';
      const isFirst = terms.length === 0;

      // Handle coefficient
      if (i === 0) {
        // Constant term
        if (isFirst) {
          term = coeff.toString();
        } else {
          term = coeff > 0 ? ` + ${coeff}` : ` - ${Math.abs(coeff)}`;
        }
      } else if (i === 1) {
        // Linear term (x)
        if (coeff === 1) {
          term = isFirst ? 'x' : ' + x';
        } else if (coeff === -1) {
          term = isFirst ? '-x' : ' - x';
        } else {
          if (isFirst) {
            term = `${coeff}x`;
          } else {
            term = coeff > 0 ? ` + ${coeff}x` : ` - ${Math.abs(coeff)}x`;
          }
        }
      } else {
        // Higher degree terms (x², x³, etc.)
        const exponent = i;
        const superscriptExponent = this.toSuperscript(exponent);
        if (coeff === 1) {
          term = isFirst ? `x${superscriptExponent}` : ` + x${superscriptExponent}`;
        } else if (coeff === -1) {
          term = isFirst ? `-x${superscriptExponent}` : ` - x${superscriptExponent}`;
        } else {
          if (isFirst) {
            term = `${coeff}x${superscriptExponent}`;
          } else {
            term = coeff > 0 ? ` + ${coeff}x${superscriptExponent}` : ` - ${Math.abs(coeff)}x${superscriptExponent}`;
          }
        }
      }

      terms.push(term);
    }

    return `y = ${terms.join('')}`;
  }

  shouldDrawAsCurve(worldWindow: WorldWindow): boolean {
    const degree = this.getDegree();
    if (degree <= 1) {
      return false; // Linear or constant, draw as line
    }

    // Check if the function actually behaves linearly within the world window
    const xMin = worldWindow.bottomLeft[0];
    const xMax = worldWindow.topRight[0];
    const xRange = xMax.sub(xMin);

    // If range is very small, it might appear linear
    const rangeSize = xRange.abs();
    const smallRangeThreshold = new PreciseDecimal(0.01);

    if (rangeSize.lte(smallRangeThreshold)) {
      // For very small ranges, check if linear approximation is accurate
      // Sample the function at the midpoint and compare to linear interpolation
      const xMid = xMin.add(xRange.div(new PreciseDecimal(2)));

      const fAtXMin = this.evaluate(xMin);
      const fAtXMax = this.evaluate(xMax);
      const fAtXMid = this.evaluate(xMid);

      // Linear interpolation at midpoint
      const linearAtMid = fAtXMin.add(fAtXMax.sub(fAtXMin).div(new PreciseDecimal(2)));

      // Check how much the actual function deviates from linear approximation
      const deviation = fAtXMid.sub(linearAtMid).abs();
      const yRange = worldWindow.topRight[1].sub(worldWindow.bottomLeft[1]).abs();

      // If deviation is less than 0.01% of Y range, treat as linear
      const deviationThreshold = yRange.mul(new PreciseDecimal(0.0001));
      return deviation.gte(deviationThreshold);
    }

    // For larger ranges, always draw as curve
    return true;
  }

  generateXValues(worldWindow: WorldWindow, screenWidth: number): PreciseDecimal[] {
    const xMin = worldWindow.bottomLeft[0];
    const xMax = worldWindow.topRight[0];

    // This method is only used for smooth curves (linear approximation handled in generatePoints)
    const numPoints = 4 * Math.min(screenWidth, 200);
    return this.generateXValuesForSmoothCurve(xMin, xMax, numPoints);
  }

  generateXValuesForSmoothCurve(xMin: PreciseDecimal, xMax: PreciseDecimal, numPoints: number): PreciseDecimal[] {
    const xRange = xMax.sub(xMin);

    // Calculate step size with appropriate precision for the current world window
    // Use the range magnitude to determine precision needed
    const rangeMagnitude = Math.max(Math.abs(xMin.toNumber()), Math.abs(xMax.toNumber()));
    const precisionNeeded = Math.max(10, Math.ceil(Math.log10(rangeMagnitude)) + 6);
    const step = xRange.div(new PreciseDecimal(numPoints));
    const stepQuantized = step.quantize(precisionNeeded);

    const xValues: PreciseDecimal[] = [];
    const zero = new PreciseDecimal(0);
    let current = xMin;

    // Generate points from xMin, adding step each time
    while (current.lte(xMax)) {
      xValues.push(current);
      current = current.add(stepQuantized);
    }

    // Special case: if xMin <= 0 <= xMax, ensure exact 0 is included
    // This guarantees we sample the function at x=0 which may be a critical point
    if (xMin.lte(zero) && zero.lte(xMax)) {
      // Find insertion point: after last negative, before first positive
      let insertIndex = xValues.length;
      for (let i = 0; i < xValues.length; i++) {
        if (xValues[i].gte(zero)) {
          insertIndex = i;
          break;
        }
      }
      xValues.splice(insertIndex, 0, zero);
    }

    return xValues;
  }

  generatePoints(worldWindow: WorldWindow, screenWidth: number): Point[] {
    const degree = this.getDegree();
    const shouldDrawAsCurve = this.shouldDrawAsCurve(worldWindow);
    const shouldUseLinearApproximation = degree <= 1 || !shouldDrawAsCurve;

    if (shouldUseLinearApproximation) {
      // For linear approximation, return the intersection points directly
      // Don't re-evaluate the polynomial at intersection X coordinates
      const xMin = worldWindow.bottomLeft[0];
      const xMax = worldWindow.topRight[0];

      // For linear approximation at extreme zoom, don't limit precision
      const calculator = new LinearIntersectionCalculator(worldWindow);
      const fAtXMin = this.evaluate(xMin);
      const fAtXMax = this.evaluate(xMax);

      const result = calculator.calculateIntersection(fAtXMin, fAtXMax);

      if (result.hasIntersection) {
        console.log(`🔢 Linear approximation calculation:
  xMin: ${xMin.toString()}
  xMax: ${xMax.toString()}
  f(xMin): ${fAtXMin.toString()}
  f(xMax): ${fAtXMax.toString()}
  Intersection points: [${result.points[0][0].toString()}, ${result.points[0][1].toString()}] → [${result.points[1][0].toString()}, ${result.points[1][1].toString()}]`);
        return result.points;
      } else {
        return [];
      }
    }

    // For curves, use X values and evaluate the polynomial
    const xValues = this.generateXValues(worldWindow, screenWidth);
    return xValues.map(x => [x, this.evaluateWithPrecision(x, worldWindow)] as Point);
  }

  // Observable actions for editing coefficients
  setCoefficient(degree: number, value: number): void {
    // Extend array if necessary
    while (this.coefficients.length <= degree) {
      this.coefficients.push(0);
    }
    this.coefficients[degree] = value;

    // Clean up trailing zeros
    this.trimTrailingZeros();
  }

  addDegree(): void {
    const currentDegree = this.getDegree();
    const newDegree = Math.min(currentDegree + 1, 5); // Max degree 5
    this.setCoefficient(newDegree, 1);
  }

  removeDegree(degree: number): void {
    if (degree < this.coefficients.length) {
      this.coefficients[degree] = 0;
      this.trimTrailingZeros();
    }
  }

  setCoefficients(coefficients: number[]): void {
    this.coefficients = [...coefficients];
    this.trimTrailingZeros();
  }

  private trimTrailingZeros(): void {
    // Remove trailing zeros, but keep at least one element (for "0" polynomial)
    while (this.coefficients.length > 1 && this.coefficients[this.coefficients.length - 1] === 0) {
      this.coefficients.pop();
    }
  }

  // Helper method to get coefficient for a specific degree
  getCoefficient(degree: number): number {
    return degree < this.coefficients.length ? this.coefficients[degree] : 0;
  }

  // Helper method to get max degree shown in editor (always show up to current degree, min 0)
  getMaxDisplayDegree(): number {
    return Math.max(0, this.getDegree());
  }

  // Convert number to Unicode superscript characters
  private toSuperscript(num: number): string {
    const superscriptMap: { [key: string]: string } = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
    };
    return num.toString().split('').map(digit => superscriptMap[digit] || digit).join('');
  }
}

export function createEquation(config: EquationConfig): PolynomialEquation {
  return new PolynomialEquation(config.coefficients || [0]);
}
