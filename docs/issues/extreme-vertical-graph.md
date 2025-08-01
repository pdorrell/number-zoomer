# Issue: Extreme Vertical Graph rendering

**NOTE: this is an issue that requires analysis and confirmation before making any changes to fix it.**

The current algorithm for drawing the equation graph within the screen viewport, for situations
where the graph cannot be simply rendered as a straight line, is as follows:

* Generate a sequence of evenly spaced points with the world window X range
* Calculate the Y value for each X value
* Draw the graph from each X,Y point to the next

For moderate degrees of zoom-in or zoom-out this algorithm works well.

For extreme levels of zoom-in the graph (if still visible) can be drawn as a straight line
because visible curvature is negligible.

However this algorithm fails to give the best possible result in the case of extreme zoom-out
where the graph should still be visible in the window.

In particular, for any polynomial graph of degree 2 or more where X=0 is within the world window
X-range, then we should expect to see:

* If the degree is even:
  * If the first coefficient is positive:
    * A vertical red line from the origin to the top of the screen viewport
  * If the first coefficient is negative:
    * A vertical red line from the origin to the bottom of the screen viewport
* If the degree is odd:
  * A vertical red line from the origin to the top and another to the bottom, 
    which in effect is a single vertical red line from the bottom to the top 
    which goes through the origin.
    
What currently happens in practice as the user zooms out is:

* The set of chosen X values might not include 0, and with sufficient zoom-out the
  Y values for the X values closest to 0 may be so large that they lie outside the screen range.
  So no graph will be visible.
* There will be in-between stages where the Y value for the X value closest to zero is still
  on-screen, but visibly not in the same location as Y=0, so a red vertical line will be visible,
  but it will not be the full red line from 0 to the edge (or edges).
  
One possible solution is simply to make sure that X=0 is always included in the set of X values
if X=0 is indeed within the current world X-range.

This will force at least one screen point to appear in the filtered `screenPoints` variable
in `canvasEquationGraph`. However this could result in a situation where there are no 
other points, and in particular no points with X <0 or >0.

The criterion for returning a null point value depends on comparison with a value 1e10 or -1e10
that is *much* larger than any possible screen size, so it follows that if, for example, 
there is no screenpoint with X>0, then a vertical line from 0 to the relevant screen edge
will completely substitute for the missing graph line from X=0 to that missing X>0.
Similarly for a missing X<0 point.

An additional consideration is that even going to the trouble of inserting an extra X=0 value
should only be necessary when there is at least a certain amount of zoom out.
    
So a full solution to the problem might be:

* If zoom-out is over a certain threshold:
    * ensure that X=0 is included in the equation points returned from this.equation.generatePoints
    * If there is no X>0 point in the equation points, add a vertical line from 0,0 in the 
      relevant direction that extends (well) beyond the screen edge.
    * Similarly if there is no X<0 point.

