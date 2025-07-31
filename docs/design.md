# Number Zoomer

## Terminology Definitions

### Precision Terms
* **Precision** - The total number of digits after the decimal point, including trailing zeros. Example: 1.23000 has precision 5DP.
* **Essential Precision** - The minimum number of digits after the decimal point needed to represent the exact value. Example: 1.23000 has essential precision 2DP.
* **Trailing Zeros** - The number of zeros at the end of a decimal representation. Equals (Precision - Essential Precision).
* **Resolution** - The minimum difference between two representable numbers at a given precision. For 5DP, the resolution is 0.00001 = 10^-5.
* **Adoption** - When a point adopts the current world window resolution during user interaction.

### Display Terms
* **World** - The X/Y coordinate plane with arbitrary precision decimal coordinates.
* **World Window** - The rectangular region of the world currently being viewed, specified in world coordinates. The aspect ratio of the world window always matches the screen viewport aspect ratio.
* **Screen Viewport** - The rectangular area on screen (in pixels) where the world window is displayed. This expands to fit available space after user controls, so may not be square.
* **Grid Resolution** - The precision level at which grid lines are displayed (one less than the world window resolution). This is always the same for both X and Y dimensions.
* **Grid Weight Hierarchy** - The visual thickness system for grid lines based on trailing zeros: 1px + min(2, trailing_zeros).

## Overall Concept

The intention with Number Zoomer is to present a world (X-Y coordinate plane) where a user can zoom in to get closer and closer to the exact values of fractions or square roots represented as decimals, where the value they are looking for is the intersection of a particular horizontal line for the y value and the graph of an equation relating x & y.

A basic outline of the design would be, within a rectangular screen viewport:

* Along the top of the screen, controls for choosing an equation such as y = 3 * x or y = x^2, and for navigating and zooming in and out.
* Along the left side of the screen, markers for the Y-axis coordinates.
* Along the bottom of the screen, markers for the X-axis coordinates.
* The rest of the screen consists of the screen viewport displaying the current world window.

The world window is defined by the x,y coordinate pairs for the bottom left and top right corners of that rectangle in world coordinates.

Displayed within the screen viewport are three main things:

* Grid-lines representing X and Y values that are exact decimals at the current grid resolution
* The current point position, represented by a large black dot and accompanied by a display of the current X and Y coordinates of the dot
* The graph of the chosen equation

Depending on the current world window, both the equation graph and the current point might not be visible in the screen viewport.

## Tech Stack

The tech stack is:

* Fully type-checked Typescript
* MobX
* Functional React components
* SCCS
* Node, vite & esbuild for development

This will allow deployment of the application as a static web application.

Given the nature of the application's graphical requirements, I imagine that most of the implementation will use SVG.

## Decimal Fractions

When the application displays the values of numbers, it will always present them as decimal fractions to a specified precision.

For example the square root of 2 to 8DP precision is 1.41421356.

There are various ways this might be represented exactly in an application:

* As a string "1.41421356"
* As an integer 141421356 with a scale factor 10^-8
* Using a Typescript library that defines a datatype for doing arithmetic with exact decimal fractions

## Grid Line Display

Horizontal and vertical grid lines will be displayed for all exact decimal fractions within the current world window subject to the following limitation:

* The distance between two grid lines must be >= 5 pixels in the screen viewport.

Let N be the maximum essential precision (digits with no trailing zeros) for which a grid line is drawn. This N determines the grid resolution.

The grid weight hierarchy determines line thickness based on essential precision:
* Essential precision N: 1px
* Essential precision N-1: 2px  
* Essential precision N-2 or less: 3px

So for example, if the Y coordinate in the world window ranges from 1.472 to 1.486 and there are 1000 pixels in the screen viewport in the Y direction, then:

1.47 to 1.48 is a separation of (1.48-1.47)/(1.486-1.472) * 1000 = 714px.
1.472 to 1.473 is a separation of 71px
1.4722 to 1.4723 is a separation of 7px.
1.47223 to 1.47224 is a separation of 0.7px.

So grid lines are:
* For fractions with precision 5DP - not enough separation to display
* For fractions with precision 4DP - 1px (grid resolution = 4DP)
* For fractions with precision 3DP - 2px
* For fractions with precision 2DP or less - 3px (ie in this case, only 1.47 and 1.48)

### Rounding of World Window Coordinates

The grid resolution N also determines the rounding of the world window boundary coordinates (X & Y for bottom-left and top-right corners). The precision of these values should be limited to N+1 (in effect rounding them to a resolution limited by what 1/2 pixel represents in world coordinates). 

Since the transform from screen viewport to world window must preserve aspect ratio, the world window precision is calculated based on the X dimension only and then applied to both X and Y dimensions. This ensures:
* The aspect ratio never changes during zoom or pan operations
* The grid resolution is identical for both X and Y axes
* Any potential rounding differences between X and Y calculations are avoided

This precision rounding should apply whenever the mapping from the screen viewport to world window changes, ie for any zoom change or translation change.

## Navigation and Control

There are four primary control actions that the user of the application can make:

* Choose the equation, one of:
   * y = x^2
   * y = nx for some integer n
* Move the current point by dragging the black dot representing its location
* Move the world window by dragging the background
* Zoom in and out:
  * On a touch screen via pinch and zoom
  * On a computer using "+" and "-" buttons or keyboard shortcuts
  
When zooming in and out - 
  * If the point is visible, adjust the view transform so that the point retains it's current position within the screen viewport.
  * If the point is not visible, zoom so that the centre of the world window retains it's current position in the centre of the viewport.

## Current Position of Point

The current point position is always represented by X,Y values that are decimal values with a given precision.

When the point is moved by the user, it adopts a new precision based on the current world window resolution. The precision of the new location is always limited by the same rule as the grid line display, where the precision is only one more than the grid resolution. Since the grid resolution is always the same for both X and Y dimensions, the adopted precision will be the same for both coordinates.

In the above example, considering only the Y coordinate, the new position will have precision 5DP, eg 1.47223. (Subject to precision of the mouse or touch screen, the user will not necessarily be able to hit a precise value - but they always have the option to zoom in further in order to achieve more precision.)

The precision of the current point position does not change if the user zooms in or out - so, for example, zooming out and zooming in will not lose any information in the current point position.

However, when zooming in, extra trailing zeros will be displayed to match what it would be if the current point was moved. (This is necessary for the user to understand the relation between the current point coordinate display and the grid coordinate partial display as explained below.)

After zooming in or out, the point will adopt the new world window resolution as soon as the user moves it.

Given the rules for point precision adoption and for grid line display, there will be a maxDP value that will be part of the current application state, which for the example above would be 5.

## Numerical Display

### Current Point

The intention of the application is to encourage the user to zoom in by a large amount to find accurate decimal approximations to the solutions of equations, for example y=3*x for y=1, which to precision 500DP would be a "." with 500 following "3" characters.

There will be some point where all the digits can't possibly be displayed on the screen.

However, I hope that we can achieve reasonable display of 1000 characters on an iPad or on a 1080P computer screen.

A reasonable strategy could be:

* Display the digits on a rectangle to the right of the point location which has a maximum width of 50% of the screen viewport width
* When digits get past the maximum width, then they can wrap onto the next line

With this approach, a large number of digits will be fully visible as long as the user has the point currently displayed somewhere in the left half of the screen viewport.

(An alternative could be to constrain the display to fit inside the screen, but that would require constant distracting re-wrapping as the user moves the point or the world window or zooms in or out.)

### Grid Coordinates

A second problem has to do with displaying grid coordinates. If there is precision 300DP in the current point coordinates, then there will also be precision 300DP (or 299DP) in the grid coordinates. However it will get too crowded to display all of these.

The following strategies can mitigate this issue:

* Display the grid coordinates for all grid lines except the thinnest 1px grid lines (based on the grid weight hierarchy)
* Only display up to some maximum number of final digits in the grid coordinate values, for example only the 6 last digits
* If not all digits are being shown, display "..." in lieu of the missing digits
* Display grid coordinates (not counting the ellipsis) with a particular background, eg light blue
* Display the corresponding decimal digits in the current point display in the same background colour - ie also 6 digits if the current point is at the same precision as the grid coordinates, but could be more than 6 digits if the current point has higher precision. In the case where the current point has lower precision, extra trailing zeros will be displayed (as explained above), so 6 digits will still be shown to match
* In some cases the ellipsis will correspond to digits different to those of the current point position, ie for a value just below a decimal with many zeros, where the missing digits for the coordinates are actually nines. This will be displayed in a different background colour, eg pink

There is still a problem in the case where the current point is not currently visible in the screen viewport. In this case there will be a display of a point represented by the intersection of the current top-most thickest Y coordinate grid line and current left-most thickest X coordinate grid line and its full decimal coordinates, in a similar display as if it was the current point, but displayed without the thick black dot, and displayed with weaker coloration so that it is readily recognizable as not being the current point position.

## Secondary Navigation Controls

In the top panel there will be buttons (mostly with suitable emoji or other single-character labels and separate longer explanatory tooltips) which perform secondary navigation actions:

* Go to current point position without changing zoom level
* Undo previous zoom action or dragging action (of either point or background)
* Redo previous undo
* Move current point into current world window
* Reset to original world window

## Coordinate-locking

The user will have the option of snapping and locking the current point position to a chosen grid line:

* There will be a padlock icon displayed at the ends of the thickest grid lines
* When clicked, the corresponding current point coordinate will snap to that value and stay locked there. The grid line itself will display in a different colour, eg a bright blue. If the point is still unlocked in the other direction, then any dragging is constrained to that direction
* The padlock can be clicked again to unlock

## Equation Graph Display

The equation graph will be displayed in a particular colour, eg red.

When rendering at a low zoom level it will be a curve and the equation can be used to render it using normal floating point arithmetic to create the curve as a sequence of very short lines.

If the equation is linear, then it will just be a line in all cases.

In the case where the equation is not linear (ie y=x^2 being the only example in the current specification), then once the zoom level is high enough it will be linear for all practical purposes within the current world window.

The equations should be represented by corresponding Equation classes that contain the rendering logic including details of when to switch from curve drawing to simple line drawing based on the zoom level and world window resolution.
