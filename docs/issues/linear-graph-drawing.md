# Linear Graph Drawing

I want to try a simpler more robust approach to drawing an approximately
linear graph in the case of zooming in a long way to part of a degree 2 or
more polynomial.

The basic idea is to consider where any line intersects the edges of 
the world window rectangle.

There are two main cases:

* The line intersects two of the edges, crossing the rectangle.
* The line intersects none of the edges, and doesn't enter the
  rectangle at all.
  
There are edge cases where the line crosses or touches a corner
of the rectangle, but these edge cases can be ignored because it's
correct to treat them as either of the other two.

If two points on the edges of the world window rectangle can be
found, then drawing the line in screen space is very straightforward,
and clamping to 1e06 is not an issue.

I propose this approach for determining the two points on the world
rectangle where a line approximating a polynomial f(x) intersects
the rectangle edges.

We have:

* The world window rectangle, defined by xMin, xMax, yMin, yMax
* We have the function f, where y = f(x)

We can define:

* w (width) = xMax - xMin
* h (height) = yMax - yMin

All of these numbers are PreciseDecimal's in the "world", and
we will do all calculations using PreciseDecimal until we
actually have the starting and ending points of the line
we want to draw on the screen.

We want to define a new coordinate system with variables u and v
as follows:

* u = x - xMin
* v = y - yMin

We can define v = F(u), where F(u) = au + b, where -

* b = f(xMax)
* a = (f(yMax) - f(yMin)) / w

The value of a is determined by a division, but we will only
calculate it if we need to.

We already have the values of F(0) = f(xMin) and F(w) = f(xMax)
without needing to know what a is.

We can define G the inverse of F, where u = G(v).

G(v) = cv + d

we have 

* v = F(u) = au + b
* v/a = u + b/a
* v/a - b/a = u

So 
* c = 1/a
* d = b/a

We only calculate the values of a, b, c & d if we need to use G.

The algorithm for determining the starting and ending points of the
line cross the rectangle can be split into 9 cases which are 
all combinations of:

* 3 cases for F(0):  F(0) < 0, 0 <= F(0) <= h, F(0) > h
* 3 cases for F(w):  F(w) < 0, 0 <= F(w) <= h, F(w) > h

The following determines the values of the starting & ending points
in the u/v coordinate system for each of the 9 cases:

* F(0)<0
  * F(w)<0 - line does not cross rectangle
  * 0<=F(w)<=h - [G(0), 0] to [w, F(w)]
  * F(w)>h - [G(0), 0] to [G(h), h]
* 0<=F(0)<=h
  * F(w)<0 - [0, F(0)] to [G(0), 0]
  * 0<=F(w)<=h - [0, F(0)] to [w, F(W)]
  * F(w)>h - [0, F(0)] to [G(h), h]
* F(0)>h
  * F(w)<0 - [G(h), h] to [G(0), 0]
  * 0<=F(w)<=h - [G(h), h] to [w, F(w)]
  * F(w)>h - line does not cross rectangle
  
When G has to be used, then divisions are required to determine the
values of c and d. The precision of these divisions needs to equal
the larger of the total number of digits in b or a (ie digits both
before and after the decimal point).

All of this calculation needs to occur before the points are mapped to
the screen viewport, ie when creating the CanvasEquationGraph. 
The final result  (as CanvasEquationGraph.screenPoints) will be either nothing to 
draw, or a single line to draw between two points.
