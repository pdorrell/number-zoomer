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

Given the nature of the application's graphical requirements, I imagine
that most of the implementation will use SVG.

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

## Current Position of Point

The current point position is always X,Y values that are decimal values of a 
given precision.

When the point is moved by the user, the precision of the new location is always
limited by the same rule as the grid lines display, where the number of DP
is only one more than the most DP for which the grid lines are displayed.

Also, if the value is different for current X and Y zoom (which can happen if
the screen size is not square), then choose the largest of those DP values.

In the above example, considering only the Y coordinate, the new position will
have 5DP of precision, eg 1.47223. (Subject to precision of the mouse or touch
screen, the user will not necessarily be able to hit a precise value - but
they always have the option to zoom in further in order to achieve more precision.)

The DP of the current point position does not change if the user zooms in or out - 
so, for example, zooming out and zooming in will not lose any information in the
current point position.

However, when zooming in, extra 0's will be displayed
to match what it would be if the current point was moved. (This is necessary
for the user to understand the relation between the current point coordinate
display and the grid coordinate partial display as explained below.)

After zooming in or out, the DP will reset as soon as the user moves the point.

Given the rules of DP for moving the point and for display grid lines, there will
be a maxDP value that will be part of the current application state, which
for the example above would be 5.

## Numerical Display

### Current Point

The intention of the application is to encourage the user to zoom in to a large
amount to find accurate decimal approximations to the solutions of equations, 
for example y=3*x for y=1, which to 500DP would the a "." with 500 following "3" characters.

There will be some point where all the digits can't possibly displayed on the screen.

However, I hope that we can achieve reasonable display of 1000 characters on an ipad
or on 1080P computer screen.

A reasonable strategy could be:

* Display the digits on a rectangle to the right of the point location which has a maximum
  width of 50% of the screen width.
* When digits get past the maximum width, then they can wrap onto the next line.

With this approach, a large number of digits will be fully visible as long as the user has 
the point currently displayed somewhere in the left half of the screen.

(An alternative could be to contrain the display to fit inside the screen, but that would
required constant distracting re-wrapping as the user moves the point or the rectangle
or zooms in or out.)

### Grid Coordinates

A second problem has to do with displaying grid coordinates. If there are 300DP in the
the current point coordinates, then there will also be 300DP (or 299DP) in the grid
coordinates. However it will get too crowded to display all of these.

The following strategies can mitigate this issue:

* Only display the grid coordinates for the thickest and second-thickest grid lines.
* Only display up to some maximum number of final digits in the grid coordinate values,
  for example only the 6 last digits.
* If not all digits are being shown, display and "..." in lieu of the missing digits.
* Display grid coordinates (not counting the ellipsis) with a particular background, 
  eg light blue.
* Display the corresponding decimal digits in the current point display in the same
  background colour (ie also 6 digits if the current point is at the same precision
  as the grid coordinates, but could be more than 6 digits if the current point
  has more precision. In the case where the current point had less precision, extra
  zeros will be displayed (as explained above), so 6 digits will still be showed to 
  match.
* In some cases the ellipsis will correspond digits different to those of the 
  current point position, ie for a value just below a decimal with many zero's,
  where the missing digits for the coordinates are actually nine's. This will be
  displayed in a different background colour, eg pink.
  
There is still a problem in the case where the current point is not currently visible.
In this case there will be a display of a point represented by the intersection of 
the current top-most thickest Y coordinate grid line and current left-most thickest
X coordinate grid line and it's full decimal coordinates, in a similar display
as if it was the current point, but displayed without the thick black dot, and
displayed with weaker coloration so that it is readily recognizable as not being
the current point position.

## Secondary Navigation Controls

In the top panel there will be buttons (mostly with suitable emoji or other single-character
labels and separate longer explanatory tooltips) which perform secondary navigation actions.

* Go to current point position without changing zoom level
* Undo previous zoom action or dragging action (of either point or background)
* Redo previous undo
* Move current point into current mapped rectangle.
* Reset to original mapping

## Coordinate-locking

The user will have the option of snapping and locking the current point position to
a chosen grid line:

* There will be a padlock icon displayed at the ends of the thickest grid lines.
* When clicked, the corresponding current point coordinate will snap to that value
  and stay locked there. The grid line itself will display in a different colour,
  eg a bright blue. If the point is still unlocked in the other direction,
  then any dragging is constrained to that direction.
* The padlock can be clicked again to unlock.

## Equation Graph display

The equation graph will be displayed in a particular colour, eg red.

When rendering a low zoom level it will be a curve and the equation
can be used to render it using normal floating point arithmetic to 
create the curve as a sequence of very short lines.

If the equation is linear, then it will just be a line in all cases.

In the case where the equation is not linear (ie y=x^2 being the
only example in the current specification), then once the zoom level
is high enough it will be linear for all practical purposes.
