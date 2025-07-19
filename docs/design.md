# Number Zoomer

## Overall Concept

The intention with Number Zoomer is to present an X-Y coordinate plane
where a user can zoom in to get closer and closer to the exact values
of fractions or square roots represented as decimals.

A basic outline of the design would be, within a rectangular screen:

* Along the top of the screen, controls for choosing an equation
  such as y = 3 * x or y = x^2, and for navigating and zooming in and out.
* Along the left side of the screen, markers for the Y-axis coordinates.
* Along the bottom of the screen, markers for the X-axis coodinates.
* The rest of the screen consists of a representation of a rectangular
  subset of the X-Y plane.
  
The mapped subset of the plane is defined by the x,y coordinate pairs
for the bottom left and top right corners of that rectangle.

Displayed within the rectangle are three main things -

* Grid-lines representing X and Y values that are exact decimals
* The current point position, represented by a large black dot
  and accompanied by a display of the current X and Y coordinates
  of the dot.
* The graph of the chosen equation.
  
Depending on the current mapping, both the equation graph and the current
point might not be visible in the rectangle.

## Tech Stack

The preferred tech stack for an initial implementation is:

* Fully type-checked Typescript
* MobX
* Function React components

This will allow deployment of the application as a static web application.

## Decimal fractions

When the application displays the values of numbers, it will always present
them as decimal fractions to a specified precision.

For example the square root of 2 to 8 DP is 1.41421356.

There are various ways this might be represented exactly in an application:

* As a string "1.41421356"
* As an integer 141421356 with a scale factor 10^-8
* Using a Typescript library that defines a datatype for doing arithmetic
  with exact decimal fractions.
  
## Grid line display

Horizontal and vertical grid lines will be displayed for all exact decimal fractions within
the current mapped rectangle subject to the following limitation:

* The distance between two grid lines must be >= 5 pixels.
* The visible thickness of the grid line is 10% of the distance between grid lines rounded to
  the nearest pixel (with 0.5 rounding to 1).
* The thickness of the grid lines is a function of the number of digits after the decimal point
  not counting trailing zeros:
  * Maximum digits N - 10% of minimum grid line separation S
  * N-1 - 10% of 10*s
  * N-2 - 20% of 100*s
  * N-3 or anything smaller - 30% of 1000*s.
  
So for example, if the Y coordinate ranges from 1.472 to 1.486 and there are 1000 pixels in the display
in the Y direction, then:

1.47 to 1.48 is a separation of (1.48-1.47)/(1.486-1.472) * 1000 = 714px.

1.472 to 1.473 is a separation of 71px

1.4722 to 1.4723 is a separation of 7px.

1.47223 to 1.47224 is a separation of 0.7px.

So grid lines are:

* For fractions to 4DP - 1px
* For fractions to 3DP - 2px
* For fractions to 2DP or less - 3px (ie in this case, only 1.47 and 1.48)

## Navigation and Control

There are four primary control actions that the user of the application
can make:

* Choose the equation, one of:
   * y = x^2
   * y = nx for some integer n.
* Move the current point by dragging the black dot representing it's location.
* Move the mapped rectangle by dragging the background
* Zoom in and out -
  * On a touch screen via pinch and zoom
  * On a computer using "+" and "-" buttons or keyboard shortcuts.




