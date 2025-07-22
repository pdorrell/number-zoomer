# ScaledFloat type

This document describes the `ScaledFloat` type.

## Terminology

I use `float` to describe a Javascript `number` which is
being used to represent a floating point value.

I use `int` to descrive a Javascript `number` which is
used to describe an exact integer.

These names mirror those types in the Python language
(even though the exact ranges of values are different
due the constraints of Javascript's combination of those
two different concepts into a single type that fits into
a 64 bit value).

Type aliases `int` and `float` will be defined for `number`
where it helps to clarify the intended usage of any particular
variable, parameter or attribute.

## Definition

A `ScaledFloat` represents a floating point number with:

* the same precision as a float
* an arbitrarily large exponent, to match 
  the range of values possible in a `PreciseDecimal`.
  
It is defined by two attributes:

* `mantissa` of type `float`, a value with absolute value >= 1.0
  and < 10.0 - ie from 1.0 to 10.0 or from -1.0 to -10.0
* `exponent` of type `int`, the exponent in base 10 to determine
  the scale factor.
  
So, for example `{'mantissa': 1.2345, 'exponent': 10}` represents 1.2345e10 = 12345000000.0.

## Purpose

The `ScaledFloat` type intermediates *all* interactions between `PreciseDecimal` and `float`.

In particular:

* A `PreciseDecimal` cannot be converted to a float - because it might overflow or underflow.
* A `float` cannot be converted to `PreciseDecimal` - because a float does not have the
  corresponding precision.
  
In the Number Zoom application, the `ScaledFloat` type will be used for all the pixel-per-unit and
unit-per-pixel variables.
  
## Methods and Functions

* `ScaledFloat` constructor (value: float, exponent: int = 0) - construct the ScaledFloat from a float
   and optional scale factor.
* `PreciseDecimal.toScaledFloat` - convert a `PreciseDecimal` to a `ScaledFloat`. This will lose
  precision, but it will not overflow or underflow.
* `ScaledFloat.toPreciseDecimal(precision: int)` - convert to a `PreciseDecimal` by quantising.
* `ScaledFloat.reciprocal` - return the reciprocal of the `ScaledFloat` as a `ScaledFloat`.
* `ScaledFloat.mul(value: float)` - multiply the `ScaledFloat` by a float to return a `ScaledFloat`.
* `ScaledFloat.add(value: float)` - add `float` value to the `ScaledFloat` to return a `ScaledFloat`.
* `ScaledFloat.toFloatInBounds(minValue: float, maxValue: float)` - if the `ScaledFloat` is within
   the bounds, return it as a `float` value, otherwise return `null`. This operation cannot underflow - 
   if the value is too small to represent as a non-zero float, then actually return 0.

## World-to-Screen mappings

`ScaledFloat` supports the implementation of mappings between `PreciseDecimal` "World" and the pixel-based
screen viewport as follows:

* A world point is defined by a pair of `PreciseDecimal`s
* A screen point is defined by a pair of `float`s.
* The screen viewport is defined by two opposite corners of the viewport rectangle.

The world window is defined by:

* An identification of a particular screen anchor point and a particular world anchor point. Normally the anchor
  screen point is a corner of the viewport, but it could potentially be anywhere in the viewport.
* Screen pixels per world units, specified as a `ScaledFloat`.
* The precision (DP value) of the world window

The algorithms for mapping other screen and world points are as follows...

World point to screen:

* Calculate world offset between world point and anchor world point - as a PreciseDecimal vector
* Multiply world offset by pixels-per-unit to get screen offset - as a ScaledFloat vector
* Add screen offset to anchor screen point -  as ScaledFloat vector
* Return screen point within bounds defined by viewport - as a float point (or null it it's not in the viewport)

Screen point to world:

* Calculate screen offset between screen point and anchor screen point - as a float vector
* Multiply screen offset by units-per-pixel to get world offset - as a ScaledFloat vector
* Add world offset to world anchor point to get world point - as a ScaledFloat vector
* Quantize world offset - as a PreciseDecimal vector
* Add quantized world offset to world anchor point - as PreciseDecimal point

Note that in this 2D application, a vector `T` is a pair of two values of type `T` 
and a point `T` is a pair of two values of type `T`. Possible arithmetic is:

* point - point = vector
* point + vector = point
* vector * scalar = vector
