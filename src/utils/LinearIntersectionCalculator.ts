import { PreciseDecimal } from '@/types/Decimal';
import { Point, WorldWindow } from '@/types/Coordinate';

export interface IntersectionResult {
  points: Point[];
  hasIntersection: boolean;
}

export class LinearIntersectionCalculator {
  private xMin: PreciseDecimal;
  private xMax: PreciseDecimal;
  private yMin: PreciseDecimal;
  private yMax: PreciseDecimal;
  private w: PreciseDecimal; // width
  private h: PreciseDecimal; // height
  private precision: number; // precision for calculations

  constructor(worldWindow: WorldWindow, precision: number = 50) {
    this.xMin = worldWindow.bottomLeft[0];
    this.xMax = worldWindow.topRight[0];
    this.yMin = worldWindow.bottomLeft[1];
    this.yMax = worldWindow.topRight[1];
    this.w = this.xMax.sub(this.xMin);
    this.h = this.yMax.sub(this.yMin);
    this.precision = precision;
  }

  calculateIntersection(fAtXMin: PreciseDecimal, fAtXMax: PreciseDecimal): IntersectionResult {
    // Transform f values to v coordinate system (v = y - yMin)
    const vAtU0 = fAtXMin.sub(this.yMin); // F(0) = f(xMin) - yMin
    const vAtUW = fAtXMax.sub(this.yMin); // F(w) = f(xMax) - yMin

    // Determine which of the 9 cases we're in
    const case0 = this.classifyV(vAtU0);
    const caseW = this.classifyV(vAtUW);

    // Handle the 9 cases
    if (case0 === 'below') {
      if (caseW === 'below') {
        // F(0)<0, F(w)<0 - line does not cross rectangle
        return { points: [], hasIntersection: false };
      } else if (caseW === 'inside') {
        // F(0)<0, 0<=F(w)<=h - [G(0), 0] to [w, F(w)]
        const startU = this.calculateG(new PreciseDecimal(0), vAtU0, vAtUW);
        const endU = this.w;
        const startV = new PreciseDecimal(0);
        const endV = vAtUW;
        return this.createResult(startU, startV, endU, endV);
      } else {
        // F(0)<0, F(w)>h - [G(0), 0] to [G(h), h]
        const startU = this.calculateG(new PreciseDecimal(0), vAtU0, vAtUW);
        const endU = this.calculateG(this.h, vAtU0, vAtUW);
        const startV = new PreciseDecimal(0);
        const endV = this.h;
        return this.createResult(startU, startV, endU, endV);
      }
    } else if (case0 === 'inside') {
      if (caseW === 'below') {
        // 0<=F(0)<=h, F(w)<0 - [0, F(0)] to [G(0), 0]
        const startU = new PreciseDecimal(0);
        const endU = this.calculateG(new PreciseDecimal(0), vAtU0, vAtUW);
        const startV = vAtU0;
        const endV = new PreciseDecimal(0);
        return this.createResult(startU, startV, endU, endV);
      } else if (caseW === 'inside') {
        // 0<=F(0)<=h, 0<=F(w)<=h - [0, F(0)] to [w, F(w)]
        const startU = new PreciseDecimal(0);
        const endU = this.w;
        const startV = vAtU0;
        const endV = vAtUW;
        return this.createResult(startU, startV, endU, endV);
      } else {
        // 0<=F(0)<=h, F(w)>h - [0, F(0)] to [G(h), h]
        const startU = new PreciseDecimal(0);
        const endU = this.calculateG(this.h, vAtU0, vAtUW);
        const startV = vAtU0;
        const endV = this.h;
        return this.createResult(startU, startV, endU, endV);
      }
    } else {
      // case0 === 'above'
      if (caseW === 'below') {
        // F(0)>h, F(w)<0 - [G(h), h] to [G(0), 0]
        const startU = this.calculateG(this.h, vAtU0, vAtUW);
        const endU = this.calculateG(new PreciseDecimal(0), vAtU0, vAtUW);
        const startV = this.h;
        const endV = new PreciseDecimal(0);
        return this.createResult(startU, startV, endU, endV);
      } else if (caseW === 'inside') {
        // F(0)>h, 0<=F(w)<=h - [G(h), h] to [w, F(w)]
        const startU = this.calculateG(this.h, vAtU0, vAtUW);
        const endU = this.w;
        const startV = this.h;
        const endV = vAtUW;
        return this.createResult(startU, startV, endU, endV);
      } else {
        // F(0)>h, F(w)>h - line does not cross rectangle
        return { points: [], hasIntersection: false };
      }
    }
  }

  private classifyV(v: PreciseDecimal): 'below' | 'inside' | 'above' {
    const zero = new PreciseDecimal(0);
    if (!v.gte(zero)) {
      return 'below';
    } else if (v.lte(this.h)) {
      return 'inside';
    } else {
      return 'above';
    }
  }

  private calculateG(targetV: PreciseDecimal, vAtU0: PreciseDecimal, vAtUW: PreciseDecimal): PreciseDecimal {
    // G(v) = cv + d, where c = 1/a and d = -b/a
    // We have F(u) = au + b, where:
    // F(0) = b = vAtU0
    // F(w) = aw + b = vAtUW
    // So: a = (vAtUW - vAtU0) / w

    const a = vAtUW.sub(vAtU0).div(this.w);
    const b = vAtU0;

    // G(v) = (v - b) / a
    const result = targetV.sub(b).div(a);
    return result;
  }

  private createResult(startU: PreciseDecimal, startV: PreciseDecimal, endU: PreciseDecimal, endV: PreciseDecimal): IntersectionResult {
    // Transform back to world coordinates - preserve full precision
    const startX = this.xMin.add(startU);
    const startY = this.yMin.add(startV);
    const endX = this.xMin.add(endU);
    const endY = this.yMin.add(endV);

    return {
      points: [
        [startX, startY],
        [endX, endY]
      ],
      hasIntersection: true
    };
  }
}
