# Issue: worldToScreen defaults

**NOTE: this is an issue that requires analysis and confirmation before making any changes to fix it.**

The function `CoordinateMapping.worldToScreen` calls the function `CoordinateAxisMapping.worldToScreen`
to get each screen coordinate.

The issue is that `CoordinateAxisMapping.worldToScreen` can return `null` if the world point lies outside
the screen viewport. But `CoordinateMapping.worldToScreen` has to return a non-null value to keep the
Typescript type-checker happy.

I have defined `CoordinateAxisMapping.worldToScreenNoDefault` which does return a null value if either
of the screen coordinates returned by `CoordinateAxisMapping.worldToScreen` are null. (So if the point
is definitely off-screen, then null is returned.)

However if I change `CoordinateMapping.worldToScreen` to not return the default value and maybe return 
a null, I observe that:

* `CoordinateMapping.worldToScreen` is used to calculate screen points from world points which are derived
from the locations of user interactions on the screen, so non-null values would always be returned.

On the other hand, some calls to `CoordinateMapping.worldToScreen` were being used to return default values
in cases where those values were not valid. This happened inside `AppStore.canvasEquationGraph`
which can be mapping values where the equation graph is being calculated for X values within the current
world window but where the Y values might lie well outside the world window (and therefore well outside the screen
viewport). In practice this resulted in spurious graph lines occurring when zooming out to an extreme degree
for polynomials of degree 2 or more.

The solution was to define a method `CoordinateAxisMapping.worldToScreenNoDefault` which returns null
when a valid screen coordinate cannot be returned, and this requires the caller to handle the null case.

That solution prevents the appearance of the spurious graph lines.

However the situation with regard to other calls to `CoordinateMapping.worldToScreen` remains unsatisfactory.

In effect:

* Supplying the default value keeps the type-checker happy.
* If the default value ever actually gets returned, then that is a bug, and there will be some visible
  user interaction error visible to the user if that ever happens.
* Attempting to handle this situation without returning spurious default values will cause problems:
  * If a null is cast to number, then any null return value would cause an unhandled null exception.
  * Attempting to handle null values in code that shouldn't receive null values (because the screen points
    should correspond to points on the actual screen derived from user interaction) will also cause
    faulty user interaction. Deciding to suppress user interaction when a null screenpoint is returned
    will also cause faulty user interaction.
    
A possible solution might be to somehow mark PreciseDecimals representing world window points derived
from user interactions on the screen as belonging to a special sub-type that is (more-or-less) guaranteed
to be mappable back to a non-null screen point.

