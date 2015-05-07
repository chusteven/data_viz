

var color = d3.scale.linear()
    .range(["white", "blue"])
    .interpolate(d3.interpolateLab);

// if there is an error, insert an error message in the HTML
// and log the error to the console.
function processError(error) {
    if (error) {
        // use the "statusText" of the error if possible
        var errorText = error.hasOwnProperty("statusText") ?
            error.statusText : error.toString();

        // insert the error message before all else
        d3.select("body")
            .insert("p", ":first-child")
            .text("Error: " + errorText)
            .style("color", "red");

        // log the error to the console
        console.warn(error);
        return true;
    }

    return false;
}

function symbolMap() {

    // think about what exactly this is doing for us
    var lookup = {};

    // can choose a different kind of projection for sure
    // var projection = d3.geo.mercator();
    var projection = d3.geo.naturalEarth();

    // this is for helping define the radius
    var radius = d3.scale.sqrt().range([5, 15]);

    // not sure what this is for
    var log = d3.select("#log");

    // initializing these variables for later reference
    var map = null;
    var values = null;

    // gets the value property from the dataset
    // for our example, we need to reset this!
    var value = function(d) { return d.value; };

    // for sorting the bubbles by size
    function order(a, b) { return radius(value(b)) - radius(value(a)); }

    // this initializes the chart or something
    // 
    function chart(id) {

        // this for debugging of sorts
        if (map === null || values === null) {
            console.warn("Unable to draw symbol map: missing data.");
            return;
        }

        // drawing map message
        updateLog("Drawing map... please wait.");

        // this is creating the svg object, as well as bounding box
        var svg = d3.select("svg#" + id);
        var bbox = svg.node().getBoundingClientRect();

        // defining the projection as well as the repositioning of these things
        projection = d3.geo.naturalEarth()
                        .scale(167)
                        .translate([bbox.width / 2, bbox.height / 2])
                        .precision(.1);

        // set path generator based on projection
        var path = d3.geo.path().projection(projection);

        // update radius domain as well as color domain
        // uses our value function to get the right property
        // console.log(d3.extent(values, value));
        radius = radius.domain(d3.extent(values, value));
        color = color.domain(d3.extent(values, value));

        // create groups for each of our components
        // this just reduces our search time for specific states
        var country = svg.append("g").attr("id", "country");
        var symbols = svg.append("g").attr("id", "dots");

        // show that only 1 feature for land
        // console.log(topojson.feature(map, map.objects.land));

        // draw base map
        country.append("path")
            // use datum here because we only have 1 feature,
            // not an array of features (needed for data() call)
            .datum(topojson.feature(map, map.objects.land))
            .attr("d", path)
            .classed({"country": true});

        // draw symbols
        symbols.selectAll("circle")
            .data(values)
            .enter()
            .append("circle")
            .attr("r", function(d, i) {
                return radius(value(d));
            })
            .attr("cx", function(d, i) {
                // projection takes [longitude, latitude]
                // and returns [x, y] as output
                return projection([d.longitude, d.latitude])[0];
            })
            .attr("cy", function(d, i) {
                return projection([d.longitude, d.latitude])[1];
            })
            .classed({"symbol": true})
            .style("fill", function(d) { return color(d.mag); })
            .sort(order)
            .on("mouseover", showHighlight)
            .on("mouseout", hideHighlight);
    }

    /*
     * These are functions for getting and setting values.
     * If no argument is provided, the function returns the
     * current value. Otherwise, it sets the value.
     *
     * If setting the value, ALWAYS return the chart object.
     * This will allow you to save the updated version of
     * this environment.
     *
     * Personally, I do not like _ to indicate the argument
     * that may or may not be provided, but its what the
     * original model uses.
     */

    // gets/sets the mapping from state abbreviation to topojson id
    chart.lookup = function(_) {

        // if no arguments, return current value
        if (!arguments.length) {
            return lookup;
        }

        // otherwise assume argument is our lookup data
        _.forEach(function(element) {
            lookup[element.id] = element.name;

            // lets you lookup the ID of a state
            // by its code (2-letter abbreviation)
            if (element.hasOwnProperty("code")) {
                lookup[element.code] = element.id;
            }
        });

        // always return chart object here
        console.log("Updated lookup information.")
        return chart;
    };

    /*
     * Note the semi-colon above. This was an assignment,
     * even though we were defining a function. All assignments
     * should end in a semi-colon.
     */

    // allows for customization of projection used
    chart.projection = function(_) {
        if (!arguments.length) {
            console.log(arguments.length);
            return projection;
        }

        projection = _;
        return chart;
    };

    /*
     * You can get/set functions just like variables.
     * The basic format is always the same.
     */

    // allows for customization of radius scale
    chart.radius = function(_) {
        if (!arguments.length) {
            return radius;
        }

        radius = _;
        return chart;
    };

    // updates the map data, must happen before drawing
    chart.map = function(_) {
        if (!arguments.length) {
            return map;
        }

        map = _;
        updateLog("Map data loaded.");

        return chart;
    };

    // updates the symbols values, must happen before drawing
    chart.values = function(_) {
        if (!arguments.length) {
            return values;
        }

        values = _;
        updateLog("Symbol data loaded.");

        return chart;
    };

    // updates how we access values from our dataset
    chart.value = function(_) {
        if (!arguments.length) {
            return value;
        }

        value = _;
        return chart;
    };

    /*
     * These functions are not outwardly accessible. They
     * are only used within this environment.
     */

    // updates the log message
    function updateLog(message) {
        // if no arguments, use default message
        if (!arguments.length) {
            log.text("Hover over a circle for more details");
            return;
        }

        // otherwise set log message
        log.text(message);
    }

    // called on mouseover
    function showHighlight(d) {
        // highlight symbol
        d3.select(this).classed({
            "highlight": true,
            "symbol": true
        });

        // highlight state associated with symbol
        d3.select("g#states")
            .select("path#state" + lookup[d.state])
            .classed({
                "highlight": true,
                "state": true
            });

        updateLog(d.place + " got hit by a " + d.mag + " magnitude earthquake");
    }

    // called on mouseout
    function hideHighlight(d) {
        // reset symbol
        d3.select(this).classed({
            "highlight": false,
            "symbol": true
        });

        // reset state associated with symbol
        d3.select("g#states")
            .select("path#state" + lookup[d.state])
            .classed({
                "highlight": false,
                "state": true
            });

        // reset log message
        updateLog();
    }

    return chart;
}

