import { makeObservable, observable, action } from 'mobx';
import { PreciseDecimal } from './Decimal';
import { Point, WorldWindow } from './Coordinate';

export type EquationType = 'quadratic' | 'linear' | 'polynomial';

export interface EquationConfig {
  type: EquationType;
  c?: number; // For y = cx, defaults to 1
  coefficients?: number[]; // For polynomial, index 0 = constant term, index 1 = x term, etc.
}

export abstract class Equation {
  abstract evaluate(x: PreciseDecimal): PreciseDecimal;
  abstract getType(): EquationType;
  abstract getDisplayName(): string;
  abstract shouldDrawAsCurve(worldWindow: WorldWindow): boolean;
  abstract generatePoints(worldWindow: WorldWindow, screenWidth: number): Point[];
}

export class QuadraticEquation extends Equation {
  evaluate(x: PreciseDecimal): PreciseDecimal {
    return x.pow(2);
  }

  getType(): EquationType {
    return 'quadratic';
  }

  getDisplayName(): string {
    return 'y = x²';
  }

  shouldDrawAsCurve(worldWindow: WorldWindow): boolean {
    // At high zoom levels, y=x² appears linear within small intervals
    const xRange = worldWindow.topRight[0].sub(worldWindow.bottomLeft[0]);
    const rangeSize = xRange.abs();
    const threshold = new PreciseDecimal(0.01);
    
    // If the x range is very small, draw as line (appears linear at high zoom)
    return rangeSize.gte(threshold);
  }

  generatePoints(worldWindow: WorldWindow, screenWidth: number): Point[] {
    const points: Point[] = [];
    const xMin = worldWindow.bottomLeft[0];
    const xMax = worldWindow.topRight[0];
    const xRange = xMax.sub(xMin);
    
    // Generate points across the screen width
    const numPoints = Math.min(screenWidth, 200); // Cap at 200 points for performance
    
    for (let i = 0; i <= numPoints; i++) {
      const ratio = i / numPoints;
      const x = xMin.add(xRange.mul(new PreciseDecimal(ratio)));
      const y = this.evaluate(x);
      points.push([x, y]);
    }
    
    return points;
  }
}

export class LinearEquation extends Equation {
  constructor(private c: number = 1) {
    super();
  }

  evaluate(x: PreciseDecimal): PreciseDecimal {
    return x.mul(new PreciseDecimal(this.c));
  }

  getType(): EquationType {
    return 'linear';
  }

  getDisplayName(): string {
    if (this.c === 1) {
      return 'y = x';
    }
    return `y = ${this.c}x`;
  }

  shouldDrawAsCurve(): boolean {
    // Linear equations are always drawn as straight lines
    return false;
  }

  generatePoints(worldWindow: WorldWindow): Point[] {
    // For linear equations, we only need two points
    const xMin = worldWindow.bottomLeft[0];
    const xMax = worldWindow.topRight[0];
    
    return [
      [xMin, this.evaluate(xMin)],
      [xMax, this.evaluate(xMax)]
    ];
  }

  getC(): number {
    return this.c;
  }

  setC(c: number): LinearEquation {
    return new LinearEquation(c);
  }
}

export class PolynomialEquation extends Equation {
  // Observable coefficients array - index 0 = constant, index 1 = x, index 2 = x², etc.
  coefficients: number[] = [0]; // Default to polynomial "0"

  constructor(coefficients: number[] = [0]) {
    super();
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

  getType(): EquationType {
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
    
    // For higher degrees, use similar logic to quadratic
    const xRange = worldWindow.topRight[0].sub(worldWindow.bottomLeft[0]);
    const rangeSize = xRange.abs();
    const threshold = new PreciseDecimal(0.01);
    
    return rangeSize.gte(threshold);
  }

  generatePoints(worldWindow: WorldWindow, screenWidth: number): Point[] {
    const degree = this.getDegree();
    const points: Point[] = [];
    const xMin = worldWindow.bottomLeft[0];
    const xMax = worldWindow.topRight[0];
    
    if (degree <= 1) {
      // Linear or constant, only need two points
      return [
        [xMin, this.evaluate(xMin)],
        [xMax, this.evaluate(xMax)]
      ];
    }
    
    // Higher degree polynomials need more points for smooth curves
    const xRange = xMax.sub(xMin);
    const numPoints = Math.min(screenWidth, 200);
    
    for (let i = 0; i <= numPoints; i++) {
      const ratio = i / numPoints;
      const x = xMin.add(xRange.mul(new PreciseDecimal(ratio)));
      const y = this.evaluate(x);
      points.push([x, y]);
    }
    
    return points;
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

export function createEquation(config: EquationConfig): Equation {
  switch (config.type) {
    case 'quadratic':
      return new QuadraticEquation();
    case 'linear':
      return new LinearEquation(config.c || 1);
    case 'polynomial':
      return new PolynomialEquation(config.coefficients || [0]);
    default:
      throw new Error(`Unknown equation type: ${config.type}`);
  }
}

// Helper function to convert existing equations to polynomial
export function convertToPolynomial(equation: Equation): PolynomialEquation {
  if (equation instanceof PolynomialEquation) {
    return equation;
  }
  
  if (equation instanceof LinearEquation) {
    const c = equation.getC();
    return new PolynomialEquation([0, c]); // 0 + cx
  }
  
  if (equation instanceof QuadraticEquation) {
    return new PolynomialEquation([0, 0, 1]); // 0 + 0x + 1x²
  }
  
  // Fallback
  return new PolynomialEquation([0]);
}