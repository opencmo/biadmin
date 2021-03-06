//------------ rdChartCanvas\highcharts.src.js ---------------/
// ==ClosureCompiler==
// @compilation_level SIMPLE_OPTIMIZATIONS

/**
 * @license Highcharts JS v3.0.10 (2014-03-10)
 *
 * (c) 2009-2014 Torstein Honsi
 *
 * License: www.highcharts.com/license
 */

// JSLint options:
/*global Highcharts, document, window, navigator, setInterval, clearInterval, clearTimeout, setTimeout, location, jQuery, $, console, each, grep */

(function () {
    // encapsulated variables
    var UNDEFINED,
        doc = document,
        win = window,
        math = Math,
        mathRound = math.round,
        mathFloor = math.floor,
        mathCeil = math.ceil,
        mathMax = math.max,
        mathMin = math.min,
        mathAbs = math.abs,
        mathCos = math.cos,
        mathSin = math.sin,
        mathPI = math.PI,
        deg2rad = mathPI * 2 / 360,


        // some variables
        userAgent = navigator.userAgent,
        isOpera = win.opera,
        isIE = /msie/i.test(userAgent) && !isOpera,
        docMode8 = doc.documentMode === 8,
        isWebKit = /AppleWebKit/.test(userAgent),
        isFirefox = /Firefox/.test(userAgent),
        isTouchDevice = /(Mobile|Android|Windows Phone)/.test(userAgent),
        SVG_NS = 'http://www.w3.org/2000/svg',
        hasSVG = !!doc.createElementNS && !!doc.createElementNS(SVG_NS, 'svg').createSVGRect,
        hasBidiBug = isFirefox && parseInt(userAgent.split('Firefox/')[1], 10) < 4, // issue #38
        useCanVG = !hasSVG && !isIE && !!doc.createElement('canvas').getContext,
        Renderer,
        hasTouch,
        symbolSizes = {},
        idCounter = 0,
        garbageBin,
        defaultOptions,
        dateFormat, // function
        globalAnimation,
        pathAnim,
        timeUnits,
        noop = function () { },
        charts = [],
        PRODUCT = 'Highcharts',
        VERSION = '3.0.10',

        // some constants for frequently used strings
        DIV = 'div',
        ABSOLUTE = 'absolute',
        RELATIVE = 'relative',
        HIDDEN = 'hidden',
        PREFIX = 'highcharts-',
        VISIBLE = 'visible',
        PX = 'px',
        NONE = 'none',
        M = 'M',
        L = 'L',
        numRegex = /^[0-9]+$/,
        NORMAL_STATE = '',
        HOVER_STATE = 'hover',
        SELECT_STATE = 'select',
        MILLISECOND = 'millisecond',
        SECOND = 'second',
        MINUTE = 'minute',
        HOUR = 'hour',
        DAY = 'day',
        WEEK = 'week',
        MONTH = 'month',
        YEAR = 'year',

        // Object for extending Axis
        AxisPlotLineOrBandExtension,

        // constants for attributes
        STROKE_WIDTH = 'stroke-width',

        // time methods, changed based on whether or not UTC is used
        makeTime,
        timezoneOffset,
        getMinutes,
        getHours,
        getDay,
        getDate,
        getMonth,
        getFullYear,
        setMinutes,
        setHours,
        setDate,
        setMonth,
        setFullYear,


        // lookup over the types and the associated classes
        seriesTypes = {};

    // The Highcharts namespace
    var Highcharts = win.Highcharts = win.Highcharts ? error(16, true) : {};

    // LOGIFIX 
    // 21378 Max label length for pie / line series
    function trimLabelToLength(str, length) {
        if (!str) {
            return null;
        } else if (!(typeof str == 'string' || str instanceof String)) {
            str = str.toString();
        }

        if (str.length <= length) {
            return str;
        }

        //is wrapped by 'div' tag?
        var patt = /<div[^>]*>(.*?)<\/div>/,
            inDiv = patt.test(str),
            brIndex, tmp;
        if (inDiv) {
            var matches = patt.exec(str);
            if (matches && matches.length >= 1) {
                if (matches[1].length <= length) {
                    return str;
                }
                tmp = matches[1];
                //br inside complex label
                brIndex = tmp.indexOf("<br />");
                if (brIndex != -1) {
                    tmp = tmp.replace("<br />", "");
                }
                if (tmp.length <= length) {
                    return str;
                }
                str = tmp;
            }
        }

        str = str.substring(0, length);
        // removing nbsp and space before the ellipsis
        while (str.endsWith(String.fromCharCode(160)) || str.endsWith(String.fromCharCode(" "))) {
            str = str.substring(0, str.length - 1);
        }

        //restore br
        if (inDiv && brIndex != -1 && (length > brIndex)) {
            str = str.substring(0, brIndex) + "<br />" + str.substring(brIndex);
        }

        if (inDiv) {
            return "<div>" + str + "...</div>";
        } else {
            return str + "...";
        }
    };

    /**
     * Extend an object with the members of another
     * @param {Object} a The object to be extended
     * @param {Object} b The object to add to the first one
     */
    function extend(a, b) {
        var n;
        if (!a) {
            a = {};
        }
        for (n in b) {
            // LOGIFIX
            // 21186 Invalid Property Error in Dashboard in IE7
            if (isIE) {
                try { a[n] = b[n]; } catch (e) { }
            } else {
                a[n] = b[n];
            }
        }
        return a;
    }

    /**
     * Deep merge two or more objects and return a third object. If the first argument is
     * true, the contents of the second object is copied into the first object.
     * Previously this function redirected to jQuery.extend(true), but this had two limitations.
     * First, it deep merged arrays, which lead to workarounds in Highcharts. Second,
     * it copied properties from extended prototypes. 
     */
    function merge() {
        var i,
            args = arguments,
            len,
            ret = {},
            doCopy = function (copy, original) {
                var value, key;

                // An object is replacing a primitive
                if (typeof copy !== 'object') {
                    copy = {};
                }

                for (key in original) {
                    if (original.hasOwnProperty(key)) {
                        value = original[key];

                        // Copy the contents of objects, but not arrays or DOM nodes
                        if (value && typeof value === 'object' && Object.prototype.toString.call(value) !== '[object Array]'
                                && key !== 'renderTo' && typeof value.nodeType !== 'number') {
                            copy[key] = doCopy(copy[key] || {}, value);

                            // Primitives and arrays are copied over directly
                        } else {
                            copy[key] = original[key];
                        }
                    }
                }
                return copy;
            };

        // If first argument is true, copy into the existing object. Used in setOptions.
        if (args[0] === true) {
            ret = args[1];
            args = Array.prototype.slice.call(args, 2);
        }

        // For each argument, extend the return
        len = args.length;
        for (i = 0; i < len; i++) {
            ret = doCopy(ret, args[i]);
        }

        return ret;
    }

    /**
     * Take an array and turn into a hash with even number arguments as keys and odd numbers as
     * values. Allows creating constants for commonly used style properties, attributes etc.
     * Avoid it in performance critical situations like looping
     */
    function hash() {
        var i = 0,
            args = arguments,
            length = args.length,
            obj = {};
        for (; i < length; i++) {
            obj[args[i++]] = args[i];
        }
        return obj;
    }

    /**
     * Shortcut for parseInt
     * @param {Object} s
     * @param {Number} mag Magnitude
     */
    function pInt(s, mag) {
        return parseInt(s, mag || 10);
    }

    /**
     * Check for string
     * @param {Object} s
     */
    function isString(s) {
        return typeof s === 'string';
    }

    /**
     * Check for object
     * @param {Object} obj
     */
    function isObject(obj) {
        return typeof obj === 'object';
    }

    /**
     * Check for array
     * @param {Object} obj
     */
    function isArray(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    }

    /**
     * Check for number
     * @param {Object} n
     */
    function isNumber(n) {
        return typeof n === 'number';
    }

    function log2lin(num) {
        return math.log(num) / math.LN10;
    }
    function lin2log(num) {
        return math.pow(10, num);
    }

    /**
     * Remove last occurence of an item from an array
     * @param {Array} arr
     * @param {Mixed} item
     */
    function erase(arr, item) {
        var i = arr.length;
        while (i--) {
            if (arr[i] === item) {
                arr.splice(i, 1);
                break;
            }
        }
        //return arr;
    }

    /**
     * Returns true if the object is not null or undefined. Like MooTools' $.defined.
     * @param {Object} obj
     */
    function defined(obj) {
        return obj !== UNDEFINED && obj !== null;
    }

    /**
     * Set or get an attribute or an object of attributes. Can't use jQuery attr because
     * it attempts to set expando properties on the SVG element, which is not allowed.
     *
     * @param {Object} elem The DOM element to receive the attribute(s)
     * @param {String|Object} prop The property or an abject of key-value pairs
     * @param {String} value The value if a single property is set
     */
    function attr(elem, prop, value) {
        var key,
            setAttribute = 'setAttribute',
            ret;

        // if the prop is a string
        if (isString(prop)) {
            // set the value
            if (defined(value)) {

                elem[setAttribute](prop, value);

                // get the value
            } else if (elem && elem.getAttribute) { // elem not defined when printing pie demo...
                ret = elem.getAttribute(prop);
            }

            // else if prop is defined, it is a hash of key/value pairs
        } else if (defined(prop) && isObject(prop)) {
            for (key in prop) {
                elem[setAttribute](key, prop[key]);
            }
        }
        return ret;
    }
    /**
     * Check if an element is an array, and if not, make it into an array. Like
     * MooTools' $.splat.
     */
    function splat(obj) {
        return isArray(obj) ? obj : [obj];
    }


    /**
     * Return the first value that is defined. Like MooTools' $.pick.
     */
    function pick() {
        var args = arguments,
            i,
            arg,
            length = args.length;
        for (i = 0; i < length; i++) {
            arg = args[i];
            if (typeof arg !== 'undefined' && arg !== null) {
                return arg;
            }
        }
    }

    /**
     * Set CSS on a given element
     * @param {Object} el
     * @param {Object} styles Style object with camel case property names
     */
    function css(el, styles) {
        if (isIE && !hasSVG) { // #2686
            if (styles && styles.opacity !== UNDEFINED) {
                styles.filter = 'alpha(opacity=' + (styles.opacity * 100) + ')';
            }
        }
        //LOGIFIX
        // 21171, 21172 js errors IE7,8
        if (el) {
            extend(el.style, styles);
        }
    }

    /**
     * Utility function to create element with attributes and styles
     * @param {Object} tag
     * @param {Object} attribs
     * @param {Object} styles
     * @param {Object} parent
     * @param {Object} nopad
     */
    function createElement(tag, attribs, styles, parent, nopad) {
        var el = doc.createElement(tag);
        if (attribs) {
            extend(el, attribs);
        }
        if (nopad) {
            css(el, { padding: 0, border: NONE, margin: 0 });
        }
        if (styles) {
            css(el, styles);
        }
        if (parent) {
            parent.appendChild(el);
        }
        return el;
    }

    /**
     * Extend a prototyped class by new members
     * @param {Object} parent
     * @param {Object} members
     */
    function extendClass(parent, members) {
        var object = function () { };
        object.prototype = new parent();
        extend(object.prototype, members);
        return object;
    }

    /**
     * Format a number and return a string based on input settings
     * @param {Number} number The input number to format
     * @param {Number} decimals The amount of decimals
     * @param {String} decPoint The decimal point, defaults to the one given in the lang options
     * @param {String} thousandsSep The thousands separator, defaults to the one given in the lang options
     */
    function numberFormat(number, decimals, decPoint, thousandsSep) {
        var lang = defaultOptions.lang,
            // http://kevin.vanzonneveld.net/techblog/article/javascript_equivalent_for_phps_number_format/
            n = +number || 0,
            c = decimals === -1 ?
                (n.toString().split('.')[1] || '').length : // preserve decimals
                (isNaN(decimals = mathAbs(decimals)) ? 2 : decimals),
            d = decPoint === undefined ? lang.decimalPoint : decPoint,
            t = thousandsSep === undefined ? lang.thousandsSep : thousandsSep,
            s = n < 0 ? "-" : "",
            i = String(pInt(n = mathAbs(n).toFixed(c))),
            j = i.length > 3 ? i.length % 3 : 0;

        return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) +
            (c ? d + mathAbs(n - i).toFixed(c).slice(2) : "");
    }

    /**
     * Pad a string to a given length by adding 0 to the beginning
     * @param {Number} number
     * @param {Number} length
     */
    function pad(number, length) {
        // Create an array of the remaining length +1 and join it with 0's
        return new Array((length || 2) + 1 - String(number).length).join(0) + number;
    }

    /**
     * Wrap a method with extended functionality, preserving the original function
     * @param {Object} obj The context object that the method belongs to 
     * @param {String} method The name of the method to extend
     * @param {Function} func A wrapper function callback. This function is called with the same arguments
     * as the original function, except that the original function is unshifted and passed as the first 
     * argument. 
     */
    function wrap(obj, method, func) {
        var proceed = obj[method];
        obj[method] = function () {
            var args = Array.prototype.slice.call(arguments);
            args.unshift(proceed);
            return func.apply(this, args);
        };
    }

    /**
     * Based on http://www.php.net/manual/en/function.strftime.php
     * @param {String} format
     * @param {Number} timestamp
     * @param {Boolean} capitalize
     */
    dateFormat = function (format, timestamp, capitalize) {
        if (!defined(timestamp) || isNaN(timestamp)) {
            return 'Invalid date';
        }
        format = pick(format, '%Y-%m-%d %H:%M:%S');

        var date = new Date(timestamp - timezoneOffset),
            key, // used in for constuct below
            // get the basic time values
            hours = date[getHours](),
            day = date[getDay](),
            dayOfMonth = date[getDate](),
            month = date[getMonth](),
            fullYear = date[getFullYear](),
            lang = defaultOptions.lang,
            langWeekdays = lang.weekdays,

            // List all format keys. Custom formats can be added from the outside. 
            replacements = extend({

                // Day
                'a': langWeekdays[day].substr(0, 3), // Short weekday, like 'Mon'
                'A': langWeekdays[day], // Long weekday, like 'Monday'
                'd': pad(dayOfMonth), // Two digit day of the month, 01 to 31
                'e': dayOfMonth, // Day of the month, 1 through 31

                // Week (none implemented)
                //'W': weekNumber(),

                // Month
                'b': lang.shortMonths[month], // Short month, like 'Jan'
                'B': lang.months[month], // Long month, like 'January'
                'm': pad(month + 1), // Two digit month number, 01 through 12

                // Year
                'y': fullYear.toString().substr(2, 2), // Two digits year, like 09 for 2009
                'Y': fullYear, // Four digits year, like 2009

                // Time
                'H': pad(hours), // Two digits hours in 24h format, 00 through 23
                'I': pad((hours % 12) || 12), // Two digits hours in 12h format, 00 through 11
                'l': (hours % 12) || 12, // Hours in 12h format, 1 through 12
                'M': pad(date[getMinutes]()), // Two digits minutes, 00 through 59
                'p': hours < 12 ? 'AM' : 'PM', // Upper case AM or PM
                'P': hours < 12 ? 'am' : 'pm', // Lower case AM or PM
                'S': pad(date.getSeconds()), // Two digits seconds, 00 through  59
                'L': pad(mathRound(timestamp % 1000), 3) // Milliseconds (naming from Ruby)
            }, Highcharts.dateFormats);


        // do the replaces
        for (key in replacements) {
            while (format.indexOf('%' + key) !== -1) { // regex would do it in one line, but this is faster
                format = format.replace('%' + key, typeof replacements[key] === 'function' ? replacements[key](timestamp) : replacements[key]);
            }
        }

        // Optionally capitalize the string and return
        return capitalize ? format.substr(0, 1).toUpperCase() + format.substr(1) : format;
    };

    /** 
     * Format a single variable. Similar to sprintf, without the % prefix.
     */
    function formatSingle(format, val) {
        var floatRegex = /f$/,
            decRegex = /\.([0-9])/,
            lang = defaultOptions.lang,
            decimals;

        if (floatRegex.test(format)) { // float
            decimals = format.match(decRegex);
            decimals = decimals ? decimals[1] : -1;
            val = numberFormat(
                val,
                decimals,
                lang.decimalPoint,
                format.indexOf(',') > -1 ? lang.thousandsSep : ''
            );
        } else {
            val = dateFormat(format, val);
        }
        return val;
    }

    /**
     * Format a string according to a subset of the rules of Python's String.format method.
     */
    function format(str, ctx) {
        var splitter = '{',
            isInside = false,
            segment,
            valueAndFormat,
            path,
            i,
            len,
            ret = [],
            val,
            index;

        while ((index = str.indexOf(splitter)) !== -1) {

            segment = str.slice(0, index);
            if (isInside) { // we're on the closing bracket looking back

                valueAndFormat = segment.split(':');
                path = valueAndFormat.shift().split('.'); // get first and leave format
                len = path.length;
                val = ctx;

                // Assign deeper paths
                for (i = 0; i < len; i++) {
                    val = val[path[i]];
                }

                // Format the replacement
                if (valueAndFormat.length) {
                    val = formatSingle(valueAndFormat.join(':'), val);
                }

                // Push the result and advance the cursor
                ret.push(val);

            } else {
                ret.push(segment);

            }
            str = str.slice(index + 1); // the rest
            isInside = !isInside; // toggle
            splitter = isInside ? '}' : '{'; // now look for next matching bracket
        }
        ret.push(str);
        return ret.join('');
    }

    /**
     * Get the magnitude of a number
     */
    function getMagnitude(num) {
        return math.pow(10, mathFloor(math.log(num) / math.LN10));
    }

    /**
     * Take an interval and normalize it to multiples of 1, 2, 2.5 and 5
     * @param {Number} interval
     * @param {Array} multiples
     * @param {Number} magnitude
     * @param {Object} options
     */
    function normalizeTickInterval(interval, multiples, magnitude, options) {
        var normalized, i;

        // round to a tenfold of 1, 2, 2.5 or 5
        magnitude = pick(magnitude, 1);
        normalized = interval / magnitude;

        // multiples for a linear scale
        if (!multiples) {
            multiples = [1, 2, 2.5, 5, 10];

            // the allowDecimals option
            if (options && options.allowDecimals === false) {
                if (magnitude === 1) {
                    multiples = [1, 2, 5, 10];
                } else if (magnitude <= 0.1) {
                    multiples = [1 / magnitude];
                }
            }
        }

        // normalize the interval to the nearest multiple
        for (i = 0; i < multiples.length; i++) {
            interval = multiples[i];
            if (normalized <= (multiples[i] + (multiples[i + 1] || multiples[i])) / 2) {
                break;
            }
        }

        // multiply back to the correct magnitude
        interval *= magnitude;

        return interval;
    }


    /**
     * Helper class that contains variuos counters that are local to the chart.
     */
    function ChartCounters() {
        this.color = 0;
        this.symbol = 0;
    }

    ChartCounters.prototype = {
        /**
         * Wraps the color counter if it reaches the specified length.
         */
        wrapColor: function (length) {
            if (this.color >= length) {
                this.color = 0;
            }
        },

        /**
         * Wraps the symbol counter if it reaches the specified length.
         */
        wrapSymbol: function (length) {
            if (this.symbol >= length) {
                this.symbol = 0;
            }
        }
    };


    /**
     * Utility method that sorts an object array and keeping the order of equal items.
     * ECMA script standard does not specify the behaviour when items are equal.
     */
    function stableSort(arr, sortFunction) {
        var length = arr.length,
            sortValue,
            i;

        // Add index to each item
        for (i = 0; i < length; i++) {
            arr[i].ss_i = i; // stable sort index
        }

        arr.sort(function (a, b) {
            sortValue = sortFunction(a, b);
            return sortValue === 0 ? a.ss_i - b.ss_i : sortValue;
        });

        // Remove index from items
        for (i = 0; i < length; i++) {
            delete arr[i].ss_i; // stable sort index
        }
    }

    /**
     * Non-recursive method to find the lowest member of an array. Math.min raises a maximum
     * call stack size exceeded error in Chrome when trying to apply more than 150.000 points. This
     * method is slightly slower, but safe.
     */
    //LOGIFIX (skip nulls)
    // 20993 Line Chart shows no data to display message
    function arrayMin(data, skipNulls) {
        var i = data.length,
            min = data[0];
        if (skipNulls && min === null) {
            var y = 1;
            for (; y < i; y++) {
                if (data[y] != null) {
                    min = data[y];
                    break;
                }
            }
        }
        while (i--) {
            if (data[i] < min) {
                if (skipNulls) {
                    if (data[i] != null) {
                        min = data[i];
                    }
                } else {
                    min = data[i];
                }
            }
        }
        return min;
    }

    /**
     * Non-recursive method to find the lowest member of an array. Math.min raises a maximum
     * call stack size exceeded error in Chrome when trying to apply more than 150.000 points. This
     * method is slightly slower, but safe.
     */
    function arrayMax(data) {
        var i = data.length,
            max = data[0];

        while (i--) {
            if (data[i] > max) {
                max = data[i];
            }
        }
        return max;
    }

    /**
     * Utility method that destroys any SVGElement or VMLElement that are properties on the given object.
     * It loops all properties and invokes destroy if there is a destroy method. The property is
     * then delete'ed.
     * @param {Object} The object to destroy properties on
     * @param {Object} Exception, do not destroy this property, only delete it.
     */
    function destroyObjectProperties(obj, except) {
        var n;
        for (n in obj) {
            // If the object is non-null and destroy is defined
            if (obj[n] && obj[n] !== except && obj[n].destroy) {
                // Invoke the destroy
                obj[n].destroy();
            }

            // Delete the property from the object.
            delete obj[n];
        }
    }


    /**
     * Discard an element by moving it to the bin and delete
     * @param {Object} The HTML node to discard
     */
    function discardElement(element) {
        // create a garbage bin element, not part of the DOM
        if (!garbageBin) {
            garbageBin = createElement(DIV);
        }

        // move the node and empty bin
        if (element) {
            garbageBin.appendChild(element);
        }
        garbageBin.innerHTML = '';
    }

    /**
     * Provide error messages for debugging, with links to online explanation 
     */
    //LOGIFIX
    // 20890 crosstabed stacked area series are in wrong order
    //function error(code, stop) {
    //	var msg = 'Highcharts error #' + code + ': www.highcharts.com/errors/' + code;
    //	if (stop) {
    //		throw msg;
    //	} else if (win.console) {
    //		console.log(msg);
    //	}
    //}

    function error(code, stop, chart) {
        if (chart) {
            fireEvent(chart.renderTo, 'error', { code: code, stop: stop, chart: chart });
            return;
        } else {
            var msg = 'Highcharts error #' + code + ': www.highcharts.com/errors/' + code;
            if (stop) {
                throw msg;
            } else if (win.console) {
                console.log(msg);
            }
        }
    }

    /**
     * Fix JS round off float errors
     * @param {Number} num
     */
    function correctFloat(num) {
        return parseFloat(
            num.toPrecision(14)
        );
    }

    /**
     * Set the global animation to either a given value, or fall back to the
     * given chart's animation option
     * @param {Object} animation
     * @param {Object} chart
     */
    function setAnimation(animation, chart) {
        globalAnimation = pick(animation, chart.animation);
    }

    /**
     * The time unit lookup
     */
    /*jslint white: true*/
    timeUnits = hash(
        MILLISECOND, 1,
        SECOND, 1000,
        MINUTE, 60000,
        HOUR, 3600000,
        DAY, 24 * 3600000,
        WEEK, 7 * 24 * 3600000,
        MONTH, 31 * 24 * 3600000,
        YEAR, 31556952000
    );
    /*jslint white: false*/
    /**
     * Path interpolation algorithm used across adapters
     */
    pathAnim = {
        /**
         * Prepare start and end values so that the path can be animated one to one
         */
        init: function (elem, fromD, toD) {
            fromD = fromD || '';
            var shift = elem.shift,
                bezier = fromD.indexOf('C') > -1,
                numParams = bezier ? 7 : 3,
                endLength,
                slice,
                i,
                start = fromD.split(' '),
                end = [].concat(toD), // copy
                startBaseLine,
                endBaseLine,
                sixify = function (arr) { // in splines make move points have six parameters like bezier curves
                    i = arr.length;
                    while (i--) {
                        if (arr[i] === M) {
                            arr.splice(i + 1, 0, arr[i + 1], arr[i + 2], arr[i + 1], arr[i + 2]);
                        }
                    }
                };

            if (bezier) {
                sixify(start);
                sixify(end);
            }

            // pull out the base lines before padding
            if (elem.isArea) {
                startBaseLine = start.splice(start.length - 6, 6);
                endBaseLine = end.splice(end.length - 6, 6);
            }

            // if shifting points, prepend a dummy point to the end path
            if (shift <= end.length / numParams && start.length === end.length) {
                while (shift--) {
                    end = [].concat(end).splice(0, numParams).concat(end);
                }
            }
            elem.shift = 0; // reset for following animations

            // copy and append last point until the length matches the end length
            if (start.length) {
                endLength = end.length;
                while (start.length < endLength) {

                    //bezier && sixify(start);
                    slice = [].concat(start).splice(start.length - numParams, numParams);
                    if (bezier) { // disable first control point
                        slice[numParams - 6] = slice[numParams - 2];
                        slice[numParams - 5] = slice[numParams - 1];
                    }
                    start = start.concat(slice);
                }
            }

            if (startBaseLine) { // append the base lines for areas
                start = start.concat(startBaseLine);
                end = end.concat(endBaseLine);
            }
            return [start, end];
        },

        /**
         * Interpolate each value of the path and return the array
         */
        step: function (start, end, pos, complete) {
            var ret = [],
                i = start.length,
                startVal;

            if (pos === 1) { // land on the final path without adjustment points appended in the ends
                ret = complete;

            } else if (i === end.length && pos < 1) {
                while (i--) {
                    startVal = parseFloat(start[i]);
                    ret[i] =
                        isNaN(startVal) ? // a letter instruction like M or L
                            start[i] :
                            pos * (parseFloat(end[i] - startVal)) + startVal;

                }
            } else { // if animation is finished or length not matching, land on right value
                ret = end;
            }
            return ret;
        }
    };

    (function ($) {
        /**
         * The default HighchartsAdapter for jQuery
         */
        win.HighchartsAdapter = win.HighchartsAdapter || ($ && {

            /**
             * Initialize the adapter by applying some extensions to jQuery
             */
            init: function (pathAnim) {

                // extend the animate function to allow SVG animations
                var Fx = $.fx,
                    Step = Fx.step,
                    dSetter,
                    Tween = $.Tween,
                    propHooks = Tween && Tween.propHooks,
                    opacityHook = $.cssHooks.opacity;

                /*jslint unparam: true*//* allow unused param x in this function */
                $.extend($.easing, {
                    easeOutQuad: function (x, t, b, c, d) {
                        return -c * (t /= d) * (t - 2) + b;
                    }
                });
                /*jslint unparam: false*/

                // extend some methods to check for elem.attr, which means it is a Highcharts SVG object
                $.each(['cur', '_default', 'width', 'height', 'opacity'], function (i, fn) {
                    var obj = Step,
                        base;

                    // Handle different parent objects
                    if (fn === 'cur') {
                        obj = Fx.prototype; // 'cur', the getter, relates to Fx.prototype

                    } else if (fn === '_default' && Tween) { // jQuery 1.8 model
                        obj = propHooks[fn];
                        fn = 'set';
                    }

                    // Overwrite the method
                    base = obj[fn];
                    if (base) { // step.width and step.height don't exist in jQuery < 1.7

                        // create the extended function replacement
                        obj[fn] = function (fx) {

                            var elem;

                            // Fx.prototype.cur does not use fx argument
                            fx = i ? fx : this;

                            // Don't run animations on textual properties like align (#1821)
                            if (fx.prop === 'align') {
                                return;
                            }

                            // shortcut
                            elem = fx.elem;

                            // Fx.prototype.cur returns the current value. The other ones are setters
                            // and returning a value has no effect.
                            return elem.attr ? // is SVG element wrapper
                                elem.attr(fx.prop, fn === 'cur' ? UNDEFINED : fx.now) : // apply the SVG wrapper's method
                                base.apply(this, arguments); // use jQuery's built-in method
                        };
                    }
                });

                // Extend the opacity getter, needed for fading opacity with IE9 and jQuery 1.10+
                wrap(opacityHook, 'get', function (proceed, elem, computed) {
                    return elem.attr ? (elem.opacity || 0) : proceed.call(this, elem, computed);
                });


                // Define the setter function for d (path definitions)
                dSetter = function (fx) {
                    var elem = fx.elem,
                        ends;

                    // Normally start and end should be set in state == 0, but sometimes,
                    // for reasons unknown, this doesn't happen. Perhaps state == 0 is skipped
                    // in these cases
                    if (!fx.started) {
                        ends = pathAnim.init(elem, elem.d, elem.toD);
                        fx.start = ends[0];
                        fx.end = ends[1];
                        fx.started = true;
                    }


                    // interpolate each value of the path
                    elem.attr('d', pathAnim.step(fx.start, fx.end, fx.pos, elem.toD));
                };

                // jQuery 1.8 style
                if (Tween) {
                    propHooks.d = {
                        set: dSetter
                    };
                    // pre 1.8
                } else {
                    // animate paths
                    Step.d = dSetter;
                }

                /**
                 * Utility for iterating over an array. Parameters are reversed compared to jQuery.
                 * @param {Array} arr
                 * @param {Function} fn
                 */
                this.each = Array.prototype.forEach ?
                    function (arr, fn) { // modern browsers
                        return Array.prototype.forEach.call(arr, fn);

                    } :
                    function (arr, fn) { // legacy
                        var i = 0,
                            len = arr.length;
                        for (; i < len; i++) {
                            if (fn.call(arr[i], arr[i], i, arr) === false) {
                                return i;
                            }
                        }
                    };

                /**
                 * Register Highcharts as a plugin in the respective framework
                 */
                $.fn.highcharts = function () {
                    var constr = 'Chart', // default constructor
                        args = arguments,
                        options,
                        ret,
                        chart;

                    if (isString(args[0])) {
                        constr = args[0];
                        args = Array.prototype.slice.call(args, 1);
                    }
                    options = args[0];

                    // Create the chart
                    if (options !== UNDEFINED) {
                        /*jslint unused:false*/
                        options.chart = options.chart || {};
                        options.chart.renderTo = this[0];
                        chart = new Highcharts[constr](options, args[1]);
                        ret = this;
                        /*jslint unused:true*/
                    }

                    // When called without parameters or with the return argument, get a predefined chart
                    if (options === UNDEFINED) {
                        ret = charts[attr(this[0], 'data-highcharts-chart')];
                    }

                    return ret;
                };

            },


            /**
             * Downloads a script and executes a callback when done.
             * @param {String} scriptLocation
             * @param {Function} callback
             */
            getScript: $.getScript,

            /**
             * Return the index of an item in an array, or -1 if not found
             */
            inArray: $.inArray,

            /**
             * A direct link to jQuery methods. MooTools and Prototype adapters must be implemented for each case of method.
             * @param {Object} elem The HTML element
             * @param {String} method Which method to run on the wrapped element
             */
            adapterRun: function (elem, method) {
                return $(elem)[method]();
            },

            /**
             * Filter an array
             */
            grep: $.grep,

            /**
             * Map an array
             * @param {Array} arr
             * @param {Function} fn
             */
            map: function (arr, fn) {
                //return jQuery.map(arr, fn);
                var results = [],
                    i = 0,
                    len = arr.length;
                for (; i < len; i++) {
                    results[i] = fn.call(arr[i], arr[i], i, arr);
                }
                return results;

            },

            /**
             * Get the position of an element relative to the top left of the page
             */
            offset: function (el) {
                return $(el).offset();
            },

            /**
             * Add an event listener
             * @param {Object} el A HTML element or custom object
             * @param {String} event The event type
             * @param {Function} fn The event handler
             */
            addEvent: function (el, event, fn) {
                $(el).bind(event, fn);
            },

            /**
             * Remove event added with addEvent
             * @param {Object} el The object
             * @param {String} eventType The event type. Leave blank to remove all events.
             * @param {Function} handler The function to remove
             */
            removeEvent: function (el, eventType, handler) {
                // workaround for jQuery issue with unbinding custom events:
                // http://forum.jQuery.com/topic/javascript-error-when-unbinding-a-custom-event-using-jQuery-1-4-2
                var func = doc.removeEventListener ? 'removeEventListener' : 'detachEvent';
                if (doc[func] && el && !el[func]) {
                    el[func] = function () { };
                }

                $(el).unbind(eventType, handler);
            },

            /**
             * Fire an event on a custom object
             * @param {Object} el
             * @param {String} type
             * @param {Object} eventArguments
             * @param {Function} defaultFunction
             */
            fireEvent: function (el, type, eventArguments, defaultFunction) {
                var event = $.Event(type),
                    detachedType = 'detached' + type,
                    defaultPrevented;

                // Remove warnings in Chrome when accessing layerX and layerY. Although Highcharts
                // never uses these properties, Chrome includes them in the default click event and
                // raises the warning when they are copied over in the extend statement below.
                //
                // To avoid problems in IE (see #1010) where we cannot delete the properties and avoid
                // testing if they are there (warning in chrome) the only option is to test if running IE.
                if (!isIE && eventArguments) {
                    delete eventArguments.layerX;
                    delete eventArguments.layerY;
                }

                extend(event, eventArguments);

                // Prevent jQuery from triggering the object method that is named the
                // same as the event. For example, if the event is 'select', jQuery
                // attempts calling el.select and it goes into a loop.
                if (el[type]) {
                    el[detachedType] = el[type];
                    el[type] = null;
                }

                // Wrap preventDefault and stopPropagation in try/catch blocks in
                // order to prevent JS errors when cancelling events on non-DOM
                // objects. #615.
                /*jslint unparam: true*/
                $.each(['preventDefault', 'stopPropagation'], function (i, fn) {
                    var base = event[fn];
                    event[fn] = function () {
                        try {
                            base.call(event);
                        } catch (e) {
                            if (fn === 'preventDefault') {
                                defaultPrevented = true;
                            }
                        }
                    };
                });
                /*jslint unparam: false*/

                // trigger it
                $(el).trigger(event);

                // attach the method
                if (el[detachedType]) {
                    el[type] = el[detachedType];
                    el[detachedType] = null;
                }

                if (defaultFunction && !event.isDefaultPrevented() && !defaultPrevented) {
                    defaultFunction(event);
                }
            },

            /**
             * Extension method needed for MooTools
             */
            washMouseEvent: function (e) {
                var ret = e.originalEvent || e;

                // computed by jQuery, needed by IE8
                if (ret.pageX === UNDEFINED) { // #1236
                    ret.pageX = e.pageX;
                    ret.pageY = e.pageY;
                }

                return ret;
            },

            /**
             * Animate a HTML element or SVG element wrapper
             * @param {Object} el
             * @param {Object} params
             * @param {Object} options jQuery-like animation options: duration, easing, callback
             */
            animate: function (el, params, options) {
                var $el = $(el);
                if (!el.style) {
                    el.style = {}; // #1881
                }
                if (params.d) {
                    el.toD = params.d; // keep the array form for paths, used in $.fx.step.d
                    params.d = 1; // because in jQuery, animating to an array has a different meaning
                }

                $el.stop();
                if (params.opacity !== UNDEFINED && el.attr) {
                    params.opacity += 'px'; // force jQuery to use same logic as width and height (#2161)
                }
                $el.animate(params, options);

            },
            /**
             * Stop running animation
             */
            stop: function (el) {
                $(el).stop();
            }
        });
    }(win.jQuery));


    // check for a custom HighchartsAdapter defined prior to this file
    var globalAdapter = win.HighchartsAdapter,
        adapter = globalAdapter || {};

    // Initialize the adapter
    if (globalAdapter) {
        globalAdapter.init.call(globalAdapter, pathAnim);
    }


    // Utility functions. If the HighchartsAdapter is not defined, adapter is an empty object
    // and all the utility functions will be null. In that case they are populated by the
    // default adapters below.
    var adapterRun = adapter.adapterRun,
        getScript = adapter.getScript,
        inArray = adapter.inArray,
        each = adapter.each,
        grep = adapter.grep,
        offset = adapter.offset,
        map = adapter.map,
        addEvent = adapter.addEvent,
        removeEvent = adapter.removeEvent,
        fireEvent = adapter.fireEvent,
        washMouseEvent = adapter.washMouseEvent,
        animate = adapter.animate,
        stop = adapter.stop;



    /* ****************************************************************************
     * Handle the options                                                         *
     *****************************************************************************/
    var

    defaultLabelOptions = {
        enabled: true,
        // rotation: 0,
        // align: 'center',
        x: 0,
        y: 15,
        /*formatter: function () {
            return this.value;
        },*/
        style: {
            color: '#666',
            cursor: 'default',
            fontSize: '11px'
        }
    };

    defaultOptions = {
        colors: ['#2f7ed8', '#0d233a', '#8bbc21', '#910000', '#1aadce', '#492970',
            '#f28f43', '#77a1e5', '#c42525', '#a6c96a'],
        //colors: ['#8085e8', '#252530', '#90ee7e', '#8d4654', '#2b908f', '#76758e', '#f6a45c', '#7eb5ee', '#f45b5b', '#9ff0cf'],
        symbols: ['circle', 'diamond', 'square', 'triangle', 'triangle-down'],
        lang: {
            loading: 'Loading...',
            months: ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                    'August', 'September', 'October', 'November', 'December'],
            shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            decimalPoint: '.',
            numericSymbols: ['k', 'M', 'G', 'T', 'P', 'E'], // SI prefixes used in axis labels
            resetZoom: 'Reset zoom',
            resetZoomTitle: 'Reset zoom',
            thousandsSep: ','
        },
        global: {
            useUTC: true,
            //timezoneOffset: 0,
            canvasToolsURL: 'http://code.highcharts.com/3.0.10/modules/canvas-tools.js',
            VMLRadialGradientURL: 'http://code.highcharts.com/3.0.10/gfx/vml-radial-gradient.png'
        },
        chart: {
            //animation: true,
            //alignTicks: false,
            //reflow: true,
            //className: null,
            //events: { load, selection },
            //margin: [null],
            //marginTop: null,
            //marginRight: null,
            //marginBottom: null,
            //marginLeft: null,
            borderColor: '#4572A7',
            //borderWidth: 0,
            borderRadius: 5,
            defaultSeriesType: 'line',
            ignoreHiddenSeries: true,
            //inverted: false,
            //shadow: false,
            spacing: [10, 10, 15, 10],
            //spacingTop: 10,
            //spacingRight: 10,
            //spacingBottom: 15,
            //spacingLeft: 10,
            //style: {
            //	fontFamily: '"Lucida Grande", "Lucida Sans Unicode", Verdana, Arial, Helvetica, sans-serif', // default font
            //	fontSize: '12px'
            //},
            backgroundColor: '#FFFFFF',
            //plotBackgroundColor: null,
            plotBorderColor: '#C0C0C0',
            //plotBorderWidth: 0,
            //plotShadow: false,
            //zoomType: ''
            resetZoomButton: {
                theme: {
                    zIndex: 20,
                    //LOGIFIX
                    // 21379 Zoom Chart pointer
                    states: {
                        hover: {
                            style: {
                                cursor: "pointer"
                            }
                        }
                    }
                },
                position: {
                    align: 'right',
                    x: -10,
                    verticalAlign: 'top',
                    y: 10
                }
                // relativeTo: 'plot'
            }
        },
        title: {
            text: 'Chart title',
            align: 'center',
            // floating: false,
            margin: 15,
            // x: 0,
            // verticalAlign: 'top',
            // y: null,
            style: {
                color: '#274b6d',//#3E576F',
                fontSize: '16px'
            }

        },
        subtitle: {
            text: '',
            align: 'center',
            // floating: false
            // x: 0,
            // verticalAlign: 'top',
            // y: null,
            style: {
                color: '#4d759e'
            }
        },

        plotOptions: {
            line: { // base series options
                allowPointSelect: false,
                showCheckbox: false,
                animation: {
                    duration: 1000
                },
                //connectNulls: false,
                //cursor: 'default',
                //clip: true,
                //dashStyle: null,
                //enableMouseTracking: true,
                events: {},
                //legendIndex: 0,
                //linecap: 'round',
                lineWidth: 2,
                //shadow: false,
                // stacking: null,
                marker: {
                    enabled: true,
                    //symbol: null,
                    lineWidth: 0,
                    radius: 4,
                    lineColor: '#FFFFFF',
                    //fillColor: null,
                    states: { // states for a single point
                        hover: {
                            enabled: true
                            //radius: base + 2
                        },
                        select: {
                            fillColor: '#FFFFFF',
                            lineColor: '#000000',
                            lineWidth: 2
                        }
                    }
                },
                point: {
                    events: {}
                },
                dataLabels: merge(defaultLabelOptions, {
                    align: 'center',
                    enabled: false,
                    formatter: function () {
                        return this.y === null ? '' : numberFormat(this.y, -1);
                    },
                    verticalAlign: 'bottom', // above singular point
                    y: 0
                    // backgroundColor: undefined,
                    // borderColor: undefined,
                    // borderRadius: undefined,
                    // borderWidth: undefined,
                    // padding: 3,
                    // shadow: false
                }),
                cropThreshold: 300, // draw points outside the plot area when the number of points is less than this
                pointRange: 0,
                //pointStart: 0,
                //pointInterval: 1,
                //showInLegend: null, // auto: true for standalone series, false for linked series
                states: { // states for the entire series
                    hover: {
                        //enabled: false,
                        //lineWidth: base + 1,
                        marker: {
                            // lineWidth: base + 1,
                            // radius: base + 1
                        }
                    },
                    select: {
                        marker: {}
                    }
                },
                stickyTracking: true,
                //tooltip: {
                //pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b>'
                //valueDecimals: null,
                //xDateFormat: '%A, %b %e, %Y',
                //valuePrefix: '',
                //ySuffix: ''				
                //}
                turboThreshold: 1000
                // zIndex: null
            }
        },
        labels: {
            //items: [],
            style: {
                //font: defaultFont,
                position: ABSOLUTE,
                color: '#3E576F'
            }
        },
        legend: {
            enabled: true,
            align: 'center',
            //floating: false,
            layout: 'horizontal',
            labelFormatter: function () {
                return this.name;
            },
            borderWidth: 1,
            borderColor: '#909090',
            borderRadius: 5,
            navigation: {
                // animation: true,
                activeColor: '#274b6d',
                // arrowSize: 12
                inactiveColor: '#CCC'
                // style: {} // text styles
            },
            // margin: 10,
            // reversed: false,
            shadow: false,
            // backgroundColor: null,
            /*style: {
                padding: '5px'
            },*/
            itemStyle: {
                color: '#274b6d',
                fontSize: '12px'
            },
            itemHoverStyle: {
                //cursor: 'pointer', removed as of #601
                color: '#000'
            },
            itemHiddenStyle: {
                color: '#CCC'
            },
            itemCheckboxStyle: {
                position: ABSOLUTE,
                width: '13px', // for IE precision
                height: '13px'
            },
            // itemWidth: undefined,
            // symbolWidth: 16,
            symbolPadding: 5,
            verticalAlign: 'bottom',
            // width: undefined,
            x: 0,
            y: 0,
            title: {
                //text: null,
                style: {
                    fontWeight: 'bold'
                }
            }
        },

        loading: {
            // hideDuration: 100,
            labelStyle: {
                fontWeight: 'bold',
                position: RELATIVE,
                top: '1em'
            },
            // showDuration: 0,
            style: {
                position: ABSOLUTE,
                backgroundColor: 'white',
                opacity: 0.5,
                textAlign: 'center'
            }
        },

        tooltip: {
            enabled: true,
            animation: hasSVG,
            //crosshairs: null,
            backgroundColor: 'rgba(255, 255, 255, .85)',
            borderWidth: 1,
            borderRadius: 3,
            dateTimeLabelFormats: {
                millisecond: '%A, %b %e, %H:%M:%S.%L',
                second: '%A, %b %e, %H:%M:%S',
                minute: '%A, %b %e, %H:%M',
                hour: '%A, %b %e, %H:%M',
                day: '%A, %b %e, %Y',
                week: 'Week from %A, %b %e, %Y',
                month: '%B %Y',
                year: '%Y'
            },
            //formatter: defaultFormatter,
            headerFormat: '<span style="font-size: 10px">{point.key}</span><br/>',
            pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b><br/>',
            shadow: true,
            //shared: false,
            snap: isTouchDevice ? 25 : 10,
            style: {
                color: '#333333',
                cursor: 'default',
                fontSize: '12px',
                padding: '8px',
                whiteSpace: 'nowrap'
            }
            //xDateFormat: '%A, %b %e, %Y',
            //valueDecimals: null,
            //valuePrefix: '',
            //valueSuffix: ''
        },

        credits: {
            enabled: true,
            text: 'Highcharts.com',
            href: 'http://www.highcharts.com',
            position: {
                align: 'right',
                x: -10,
                verticalAlign: 'bottom',
                y: -5
            },
            style: {
                cursor: 'pointer',
                color: '#909090',
                fontSize: '9px'
            }
        }
    };




    // Series defaults
    var defaultPlotOptions = defaultOptions.plotOptions,
        defaultSeriesOptions = defaultPlotOptions.line;

    // set the default time methods
    setTimeMethods();



    /**
     * Set the time methods globally based on the useUTC option. Time method can be either
     * local time or UTC (default).
     */
    function setTimeMethods() {
        var useUTC = defaultOptions.global.useUTC,
            GET = useUTC ? 'getUTC' : 'get',
            SET = useUTC ? 'setUTC' : 'set';


        timezoneOffset = ((useUTC && defaultOptions.global.timezoneOffset) || 0) * 60000;
        makeTime = useUTC ? Date.UTC : function (year, month, date, hours, minutes, seconds) {
            return new Date(
                year,
                month,
                pick(date, 1),
                pick(hours, 0),
                pick(minutes, 0),
                pick(seconds, 0)
            ).getTime();
        };
        getMinutes = GET + 'Minutes';
        getHours = GET + 'Hours';
        getDay = GET + 'Day';
        getDate = GET + 'Date';
        getMonth = GET + 'Month';
        getFullYear = GET + 'FullYear';
        setMinutes = SET + 'Minutes';
        setHours = SET + 'Hours';
        setDate = SET + 'Date';
        setMonth = SET + 'Month';
        setFullYear = SET + 'FullYear';

    }

    /**
     * Merge the default options with custom options and return the new options structure
     * @param {Object} options The new custom options
     */
    function setOptions(options) {

        // Copy in the default options
        defaultOptions = merge(true, defaultOptions, options);

        // Apply UTC
        setTimeMethods();

        return defaultOptions;
    }

    /**
     * Get the updated default options. Until 3.0.7, merely exposing defaultOptions for outside modules
     * wasn't enough because the setOptions method created a new object.
     */
    function getOptions() {
        return defaultOptions;
    }


    /**
     * Handle color operations. The object methods are chainable.
     * @param {String} input The input color in either rbga or hex format
     */
    var rgbaRegEx = /rgba\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]?(?:\.[0-9]+)?)\s*\)/,
        hexRegEx = /#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/,
        rgbRegEx = /rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/;

    var Color = function (input) {
        // declare variables
        var rgba = [], result, stops;

        /**
         * Parse the input color to rgba array
         * @param {String} input
         */
        function init(input) {

            // Gradients
            if (input && input.stops) {
                stops = map(input.stops, function (stop) {
                    return Color(stop[1]);
                });

                // Solid colors
            } else {
                // rgba
                result = rgbaRegEx.exec(input);
                if (result) {
                    rgba = [pInt(result[1]), pInt(result[2]), pInt(result[3]), parseFloat(result[4], 10)];
                } else {
                    // hex
                    result = hexRegEx.exec(input);
                    if (result) {
                        rgba = [pInt(result[1], 16), pInt(result[2], 16), pInt(result[3], 16), 1];
                    } else {
                        // rgb
                        result = rgbRegEx.exec(input);
                        if (result) {
                            rgba = [pInt(result[1]), pInt(result[2]), pInt(result[3]), 1];
                        }
                    }
                }
            }

        }
        /**
         * Return the color a specified format
         * @param {String} format
         */
        function get(format) {
            var ret;

            if (stops) {
                ret = merge(input);
                ret.stops = [].concat(ret.stops);
                each(stops, function (stop, i) {
                    ret.stops[i] = [ret.stops[i][0], stop.get(format)];
                });

                // it's NaN if gradient colors on a column chart
            } else if (rgba && !isNaN(rgba[0])) {
                if (format === 'rgb') {
                    ret = 'rgb(' + rgba[0] + ',' + rgba[1] + ',' + rgba[2] + ')';
                } else if (format === 'a') {
                    ret = rgba[3];
                } else {
                    ret = 'rgba(' + rgba.join(',') + ')';
                }
            } else {
                ret = input;
            }
            return ret;
        }

        /**
         * Brighten the color
         * @param {Number} alpha
         */
        function brighten(alpha) {
            if (stops) {
                each(stops, function (stop) {
                    stop.brighten(alpha);
                });

            } else if (isNumber(alpha) && alpha !== 0) {
                var i;
                for (i = 0; i < 3; i++) {
                    rgba[i] += pInt(alpha * 255);

                    if (rgba[i] < 0) {
                        rgba[i] = 0;
                    }
                    if (rgba[i] > 255) {
                        rgba[i] = 255;
                    }
                }
            }
            return this;
        }
        /**
         * Set the color's opacity to a given alpha value
         * @param {Number} alpha
         */
        function setOpacity(alpha) {
            rgba[3] = alpha;
            return this;
        }

        // initialize: parse the input
        init(input);

        // public methods
        return {
            get: get,
            brighten: brighten,
            rgba: rgba,
            setOpacity: setOpacity
        };
    };


    /**
     * A wrapper object for SVG elements
     */
    function SVGElement() { }

    SVGElement.prototype = {
        /**
         * Initialize the SVG renderer
         * @param {Object} renderer
         * @param {String} nodeName
         */
        init: function (renderer, nodeName) {
            var wrapper = this;
            wrapper.element = nodeName === 'span' ?
                createElement(nodeName) :
                doc.createElementNS(SVG_NS, nodeName);
            wrapper.renderer = renderer;
            /**
             * A collection of attribute setters. These methods, if defined, are called right before a certain
             * attribute is set on an element wrapper. Returning false prevents the default attribute
             * setter to run. Returning a value causes the default setter to set that value. Used in
             * Renderer.label.
             */
            wrapper.attrSetters = {};
        },
        /**
         * Default base for animation
         */
        opacity: 1,
        /**
         * Animate a given attribute
         * @param {Object} params
         * @param {Number} options The same options as in jQuery animation
         * @param {Function} complete Function to perform at the end of animation
         */
        animate: function (params, options, complete) {
            var animOptions = pick(options, globalAnimation, true);
            stop(this); // stop regardless of animation actually running, or reverting to .attr (#607)
            if (animOptions) {
                animOptions = merge(animOptions, {}); //#2625
                if (complete) { // allows using a callback with the global animation without overwriting it
                    //LOGIFIX
                    // 20996 js error turning on Series when MarkerBand / Line is present
                    if (!animOptions) {
                        animOptions = {};
                    }
                    animOptions.complete = complete;
                }
                animate(this, params, animOptions);
            } else {
                this.attr(params);
                if (complete) {
                    complete();
                }
            }
        },
        /**
         * Set or get a given attribute
         * @param {Object|String} hash
         * @param {Mixed|Undefined} val
         */
        attr: function (hash, val) {
            //LOGIFIX - crashes sometime after ajax refresh
            if (this === undefined || this.element === undefined) {
                return;
            }
            var wrapper = this,
                key,
                value,
                result,
                i,
                child,
                element = wrapper.element,
                nodeName = element.nodeName.toLowerCase(), // Android2 requires lower for "text"
                renderer = wrapper.renderer,
                skipAttr,
                titleNode,
                attrSetters = wrapper.attrSetters,
                shadows = wrapper.shadows,
                hasSetSymbolSize,
                doTransform,
                ret = wrapper;

            // single key-value pair
            if (isString(hash) && defined(val)) {
                key = hash;
                hash = {};
                hash[key] = val;
            }

            // used as a getter: first argument is a string, second is undefined
            if (isString(hash)) {
                key = hash;
                if (nodeName === 'circle') {
                    key = { x: 'cx', y: 'cy' }[key] || key;
                } else if (key === 'strokeWidth') {
                    key = 'stroke-width';
                }
                ret = attr(element, key) || wrapper[key] || 0;
                if (key !== 'd' && key !== 'visibility' && key !== 'fill') { // 'd' is string in animation step
                    ret = parseFloat(ret);
                }

                // setter
            } else {

                for (key in hash) {
                    skipAttr = false; // reset
                    value = hash[key];

                    // check for a specific attribute setter
                    result = attrSetters[key] && attrSetters[key].call(wrapper, value, key);

                    if (result !== false) {
                        if (result !== UNDEFINED) {
                            value = result; // the attribute setter has returned a new value to set
                        }


                        // paths
                        if (key === 'd') {
                            if (value && value.join) { // join path
                                value = value.join(' ');
                            }
                            if (/(NaN| {2}|^$)/.test(value)) {
                                value = 'M 0 0';
                            }
                            //wrapper.d = value; // shortcut for animations

                            // update child tspans x values
                        } else if (key === 'x' && nodeName === 'text') {
                            for (i = 0; i < element.childNodes.length; i++) {
                                child = element.childNodes[i];
                                // if the x values are equal, the tspan represents a linebreak
                                if (attr(child, 'x') === attr(element, 'x')) {
                                    //child.setAttribute('x', value);
                                    attr(child, 'x', value);
                                }
                            }

                        } else if (wrapper.rotation && (key === 'x' || key === 'y')) {
                            doTransform = true;

                            // apply gradients
                        } else if (key === 'fill') {
                            value = renderer.color(value, element, key);

                            // circle x and y
                        } else if (nodeName === 'circle' && (key === 'x' || key === 'y')) {
                            key = { x: 'cx', y: 'cy' }[key] || key;

                            // rectangle border radius
                        } else if (nodeName === 'rect' && key === 'r') {
                            attr(element, {
                                rx: value,
                                ry: value
                            });
                            skipAttr = true;

                            // translation and text rotation
                        } else if (key === 'translateX' || key === 'translateY' || key === 'rotation' ||
                                key === 'verticalAlign' || key === 'scaleX' || key === 'scaleY') {
                            doTransform = true;
                            skipAttr = true;

                            // apply opacity as subnode (required by legacy WebKit and Batik)
                        } else if (key === 'stroke') {
                            value = renderer.color(value, element, key);

                            // emulate VML's dashstyle implementation
                        } else if (key === 'dashstyle') {
                            key = 'stroke-dasharray';
                            value = value && value.toLowerCase();
                            if (value === 'solid') {
                                value = NONE;
                            } else if (value) {
                                value = value
                                    .replace('shortdashdotdot', '3,1,1,1,1,1,')
                                    .replace('shortdashdot', '3,1,1,1')
                                    .replace('shortdot', '1,1,')
                                    .replace('shortdash', '3,1,')
                                    .replace('longdash', '8,3,')
                                    .replace(/dot/g, '1,3,')
                                    .replace('dash', '4,3,')
                                    .replace(/,$/, '')
                                    .split(','); // ending comma

                                i = value.length;
                                while (i--) {
                                    value[i] = pInt(value[i]) * pick(hash['stroke-width'], wrapper['stroke-width']);
                                }
                                value = value.join(',');
                            }

                            // IE9/MooTools combo: MooTools returns objects instead of numbers and IE9 Beta 2
                            // is unable to cast them. Test again with final IE9.
                        } else if (key === 'width') {
                            value = pInt(value);

                            // Text alignment
                        } else if (key === 'align') {
                            key = 'text-anchor';
                            value = { left: 'start', center: 'middle', right: 'end' }[value];

                            // Title requires a subnode, #431
                        } else if (key === 'title') {
                            titleNode = element.getElementsByTagName('title')[0];
                            if (!titleNode) {
                                titleNode = doc.createElementNS(SVG_NS, 'title');
                                element.appendChild(titleNode);
                            }
                            titleNode.textContent = value;
                        }

                        // jQuery animate changes case
                        if (key === 'strokeWidth') {
                            key = 'stroke-width';
                        }

                        // In Chrome/Win < 6 as well as Batik, the stroke attribute can't be set when the stroke-
                        // width is 0. #1369
                        if (key === 'stroke-width' || key === 'stroke') {
                            wrapper[key] = value;
                            // Only apply the stroke attribute if the stroke width is defined and larger than 0
                            if (wrapper.stroke && wrapper['stroke-width']) {
                                attr(element, 'stroke', wrapper.stroke);
                                attr(element, 'stroke-width', wrapper['stroke-width']);
                                wrapper.hasStroke = true;
                            } else if (key === 'stroke-width' && value === 0 && wrapper.hasStroke) {
                                element.removeAttribute('stroke');
                                wrapper.hasStroke = false;
                            }
                            skipAttr = true;
                        }

                        // symbols
                        if (wrapper.symbolName && /^(x|y|width|height|r|start|end|innerR|anchorX|anchorY)/.test(key)) {


                            if (!hasSetSymbolSize) {
                                wrapper.symbolAttr(hash);
                                hasSetSymbolSize = true;
                            }
                            skipAttr = true;
                        }

                        // let the shadow follow the main element
                        if (shadows && /^(width|height|visibility|x|y|d|transform|cx|cy|r)$/.test(key)) {
                            i = shadows.length;
                            while (i--) {
                                attr(
                                    shadows[i],
                                    key,
                                    key === 'height' ?
                                        mathMax(value - (shadows[i].cutHeight || 0), 0) :
                                        value
                                );
                            }
                        }

                        // validate heights
                        if ((key === 'width' || key === 'height') && nodeName === 'rect' && value < 0) {
                            value = 0;
                        }

                        // Record for animation and quick access without polling the DOM
                        wrapper[key] = value;


                        if (key === 'text') {
                            if (value !== wrapper.textStr) {

                                // Delete bBox memo when the text changes
                                delete wrapper.bBox;

                                wrapper.textStr = value;
                                if (wrapper.added) {
                                    renderer.buildText(wrapper);
                                }
                            }
                        } else if (!skipAttr) {
                            //attr(element, key, value);
                            if (value !== undefined) {
                                element.setAttribute(key, value);
                            }
                        }

                    }

                }

                // Update transform. Do this outside the loop to prevent redundant updating for batch setting
                // of attributes.
                if (doTransform) {
                    wrapper.updateTransform();
                }

            }

            return ret;
        },


        /**
         * Add a class name to an element
         */
        addClass: function (className) {
            var element = this.element,
                currentClassName = attr(element, 'class') || '';

            if (currentClassName.indexOf(className) === -1) {
                attr(element, 'class', currentClassName + ' ' + className);
            }
            return this;
        },
        /* hasClass and removeClass are not (yet) needed
        hasClass: function (className) {
            return attr(this.element, 'class').indexOf(className) !== -1;
        },
        removeClass: function (className) {
            attr(this.element, 'class', attr(this.element, 'class').replace(className, ''));
            return this;
        },
        */

        /**
         * If one of the symbol size affecting parameters are changed,
         * check all the others only once for each call to an element's
         * .attr() method
         * @param {Object} hash
         */
        symbolAttr: function (hash) {
            var wrapper = this;

            each(['x', 'y', 'r', 'start', 'end', 'width', 'height', 'innerR', 'anchorX', 'anchorY'], function (key) {
                wrapper[key] = pick(hash[key], wrapper[key]);
            });

            wrapper.attr({
                d: wrapper.renderer.symbols[wrapper.symbolName](
                    wrapper.x,
                    wrapper.y,
                    wrapper.width,
                    wrapper.height,
                    wrapper
                )
            });
        },

        /**
         * Apply a clipping path to this object
         * @param {String} id
         */
        clip: function (clipRect) {
            return this.attr('clip-path', clipRect ? 'url(' + this.renderer.url + '#' + clipRect.id + ')' : NONE);
        },

        /**
         * Calculate the coordinates needed for drawing a rectangle crisply and return the
         * calculated attributes
         * @param {Number} strokeWidth
         * @param {Number} x
         * @param {Number} y
         * @param {Number} width
         * @param {Number} height
         */
        crisp: function (rect) {

            var wrapper = this,
                key,
                attribs = {},
                normalizer,
                strokeWidth = rect.strokeWidth || wrapper.strokeWidth || (wrapper.attr && wrapper.attr('stroke-width')) || 0;

            normalizer = mathRound(strokeWidth) % 2 / 2; // mathRound because strokeWidth can sometimes have roundoff errors

            // normalize for crisp edges
            rect.x = mathFloor(rect.x || wrapper.x || 0) + normalizer;
            rect.y = mathFloor(rect.y || wrapper.y || 0) + normalizer;
            rect.width = mathFloor((rect.width || wrapper.width || 0) - 2 * normalizer);
            rect.height = mathFloor((rect.height || wrapper.height || 0) - 2 * normalizer);
            rect.strokeWidth = strokeWidth;

            for (key in rect) {
                if (wrapper[key] !== rect[key]) { // only set attribute if changed
                    wrapper[key] = attribs[key] = rect[key];
                }
            }

            return attribs;
        },

        /**
         * Set styles for the element
         * @param {Object} styles
         */
        css: function (styles) {
            var elemWrapper = this,
                oldStyles = elemWrapper.styles,
                newStyles = {},
                elem = elemWrapper.element,
                textWidth,
                n,
                serializedCss = '',
                hyphenate,
                hasNew = !oldStyles;

            // convert legacy
            if (styles && styles.color) {
                styles.fill = styles.color;
            }

            // Filter out existing styles to increase performance (#2640)
            if (oldStyles) {
                for (n in styles) {
                    if (styles[n] !== oldStyles[n]) {
                        newStyles[n] = styles[n];
                        hasNew = true;
                    }
                }
            }
            if (hasNew) {
                textWidth = elemWrapper.textWidth = styles && styles.width && elem.nodeName.toLowerCase() === 'text' && pInt(styles.width);

                // Merge the new styles with the old ones
                if (oldStyles) {
                    styles = extend(
                        oldStyles,
                        newStyles
                    );
                }

                // store object
                elemWrapper.styles = styles;

                if (textWidth && (useCanVG || (!hasSVG && elemWrapper.renderer.forExport))) {
                    delete styles.width;
                }

                // serialize and set style attribute
                if (isIE && !hasSVG) {
                    css(elemWrapper.element, styles);
                } else {
                    /*jslint unparam: true*/
                    hyphenate = function (a, b) { return '-' + b.toLowerCase(); };
                    /*jslint unparam: false*/
                    for (n in styles) {
                        serializedCss += n.replace(/([A-Z])/g, hyphenate) + ':' + styles[n] + ';';
                    }
                    attr(elem, 'style', serializedCss); // #1881
                }


                // re-build text
                if (textWidth && elemWrapper.added) {
                    elemWrapper.renderer.buildText(elemWrapper);
                }
            }

            return elemWrapper;
        },

        /**
         * Add an event listener
         * @param {String} eventType
         * @param {Function} handler
         */
        on: function (eventType, handler) {
            var svgElement = this,
                element = svgElement.element;

            // touch
            if (hasTouch && eventType === 'click') {
                element.ontouchstart = function (e) {
                    svgElement.touchEventFired = Date.now();
                    e.preventDefault();
                    handler.call(element, e);
                };
                element.onclick = function (e) {
                    if (userAgent.indexOf('Android') === -1 || Date.now() - (svgElement.touchEventFired || 0) > 1100) { // #2269
                        handler.call(element, e);
                    }
                };
            } else {
                // simplest possible event model for internal use
                element['on' + eventType] = handler;
            }
            return this;
        },

        /**
         * Set the coordinates needed to draw a consistent radial gradient across
         * pie slices regardless of positioning inside the chart. The format is
         * [centerX, centerY, diameter] in pixels.
         */
        setRadialReference: function (coordinates) {
            this.element.radialReference = coordinates;
            return this;
        },

        /**
         * Move an object and its children by x and y values
         * @param {Number} x
         * @param {Number} y
         */
        translate: function (x, y) {
            return this.attr({
                translateX: x,
                translateY: y
            });
        },

        /**
         * Invert a group, rotate and flip
         */
        invert: function () {
            var wrapper = this;
            wrapper.inverted = true;
            wrapper.updateTransform();
            return wrapper;
        },

        /**
         * Private method to update the transform attribute based on internal
         * properties
         */
        updateTransform: function () {
            var wrapper = this,
                translateX = wrapper.translateX || 0,
                translateY = wrapper.translateY || 0,
                scaleX = wrapper.scaleX,
                scaleY = wrapper.scaleY,
                inverted = wrapper.inverted,
                rotation = wrapper.rotation,
                transform;

            // flipping affects translate as adjustment for flipping around the group's axis
            if (inverted) {
                translateX += wrapper.attr('width');
                translateY += wrapper.attr('height');
            }

            // Apply translate. Nearly all transformed elements have translation, so instead
            // of checking for translate = 0, do it always (#1767, #1846).
            transform = ['translate(' + translateX + ',' + translateY + ')'];

            // apply rotation
            if (inverted) {
                transform.push('rotate(90) scale(-1,1)');
            } else if (rotation) { // text rotation
                transform.push('rotate(' + rotation + ' ' + (wrapper.x || 0) + ' ' + (wrapper.y || 0) + ')');
            }

            // apply scale
            if (defined(scaleX) || defined(scaleY)) {
                transform.push('scale(' + pick(scaleX, 1) + ' ' + pick(scaleY, 1) + ')');
            }

            if (transform.length) {
                attr(wrapper.element, 'transform', transform.join(' '));
            }
        },
        /**
         * Bring the element to the front
         */
        toFront: function () {
            var element = this.element;
            element.parentNode.appendChild(element);
            return this;
        },


        /**
         * Break down alignment options like align, verticalAlign, x and y
         * to x and y relative to the chart.
         *
         * @param {Object} alignOptions
         * @param {Boolean} alignByTranslate
         * @param {String[Object} box The box to align to, needs a width and height. When the
         *        box is a string, it refers to an object in the Renderer. For example, when
         *        box is 'spacingBox', it refers to Renderer.spacingBox which holds width, height
         *        x and y properties.
         *
         */
        align: function (alignOptions, alignByTranslate, box) {
            var align,
                vAlign,
                x,
                y,
                attribs = {},
                alignTo,
                renderer = this.renderer,
                alignedObjects = renderer.alignedObjects;

            // First call on instanciate
            if (alignOptions) {
                this.alignOptions = alignOptions;
                this.alignByTranslate = alignByTranslate;
                if (!box || isString(box)) { // boxes other than renderer handle this internally
                    this.alignTo = alignTo = box || 'renderer';
                    erase(alignedObjects, this); // prevent duplicates, like legendGroup after resize
                    alignedObjects.push(this);
                    box = null; // reassign it below
                }

                // When called on resize, no arguments are supplied
            } else {
                alignOptions = this.alignOptions;
                alignByTranslate = this.alignByTranslate;
                alignTo = this.alignTo;
            }

            box = pick(box, renderer[alignTo], renderer);

            // Assign variables
            align = alignOptions.align;
            vAlign = alignOptions.verticalAlign;
            x = (box.x || 0) + (alignOptions.x || 0); // default: left align
            y = (box.y || 0) + (alignOptions.y || 0); // default: top align

            // Align
            if (align === 'right' || align === 'center') {
                x += (box.width - (alignOptions.width || 0)) /
                        { right: 1, center: 2 }[align];
            }
            attribs[alignByTranslate ? 'translateX' : 'x'] = mathRound(x);


            // Vertical align
            if (vAlign === 'bottom' || vAlign === 'middle') {
                y += (box.height - (alignOptions.height || 0)) /
                        ({ bottom: 1, middle: 2 }[vAlign] || 1);

            }
            attribs[alignByTranslate ? 'translateY' : 'y'] = mathRound(y);

            // Animate only if already placed
            this[this.placed ? 'animate' : 'attr'](attribs);
            this.placed = true;
            this.alignAttr = attribs;

            return this;
        },

        /**
         * Get the bounding box (width, height, x and y) for the element
         */
        getBBox: function () {
            var wrapper = this,
                bBox = wrapper.bBox,
                renderer = wrapper.renderer,
                width,
                height,
                rotation = wrapper.rotation,
                element = wrapper.element,
                styles = wrapper.styles,
                rad = rotation * deg2rad,
                textStr = wrapper.textStr,
                numKey;

            // Since numbers are monospaced, and numerical labels appear a lot in a chart,
            // we assume that a label of n characters has the same bounding box as others 
            // of the same length.
            if (textStr === '' || numRegex.test(textStr)) {
                numKey = textStr.toString().length + (styles ? ('|' + styles.fontSize + '|' + styles.fontFamily) : '');
                bBox = renderer.cache[numKey];
            }

            // No cache found
            if (!bBox) {

                // SVG elements
                if (element.namespaceURI === SVG_NS || renderer.forExport) {
                    try { // Fails in Firefox if the container has display: none.

                        bBox = element.getBBox ?
                            // SVG: use extend because IE9 is not allowed to change width and height in case
                            // of rotation (below)
                            extend({}, element.getBBox()) :
                            // Canvas renderer and legacy IE in export mode
						{
						    width: element.offsetWidth,
						    height: element.offsetHeight
						};
                    } catch (e) { }

                    // If the bBox is not set, the try-catch block above failed. The other condition
                    // is for Opera that returns a width of -Infinity on hidden elements.
                    if (!bBox || bBox.width < 0) {
                        bBox = { width: 0, height: 0 };
                    }


                    // VML Renderer or useHTML within SVG
                } else {

                    bBox = wrapper.htmlGetBBox();

                }

                // True SVG elements as well as HTML elements in modern browsers using the .useHTML option
                // need to compensated for rotation
                if (renderer.isSVG) {
                    width = bBox.width;
                    height = bBox.height;

                    // Workaround for wrong bounding box in IE9 and IE10 (#1101, #1505, #1669, #2568)
                    if (isIE && styles && styles.fontSize === '11px' && height.toPrecision(3) === '16.9') {
                        bBox.height = height = 14;
                    }

                    // Adjust for rotated text
                    if (rotation) {
                        bBox.width = mathAbs(height * mathSin(rad)) + mathAbs(width * mathCos(rad));
                        bBox.height = mathAbs(height * mathCos(rad)) + mathAbs(width * mathSin(rad));
                    }
                }

                // Cache it
                wrapper.bBox = bBox;
                if (numKey) {
                    renderer.cache[numKey] = bBox;
                }
            }
            return bBox;
        },

        /**
         * Show the element
         */
        show: function (inherit) {
            return this.attr({ visibility: inherit ? 'inherit' : VISIBLE });
        },

        /**
         * Hide the element
         */
        hide: function () {
            return this.attr({ visibility: HIDDEN });
        },

        fadeOut: function (duration) {
            var elemWrapper = this;
            elemWrapper.animate({
                opacity: 0
            }, {
                duration: duration || 150,
                complete: function () {
                    elemWrapper.hide();
                }
            });
        },

        /**
         * Add the element
         * @param {Object|Undefined} parent Can be an element, an element wrapper or undefined
         *    to append the element to the renderer.box.
         */
        add: function (parent) {

            var renderer = this.renderer,
                parentWrapper = parent || renderer,
                parentNode = parentWrapper.element || renderer.box,
                childNodes,
                element = this.element,
                zIndex = this.zIndex,
                otherElement,
                otherZIndex,
                i,
                inserted;

            if (parent) {
                this.parentGroup = parent;
            }

            // mark as inverted
            this.parentInverted = parent && parent.inverted;

            // build formatted text
            if (this.textStr !== undefined) {
                renderer.buildText(this);
            }

            // mark the container as having z indexed children
            if (zIndex) {
                parentWrapper.handleZ = true;
                zIndex = pInt(zIndex);
            }

            // insert according to this and other elements' zIndex
            if (parentWrapper.handleZ) { // this element or any of its siblings has a z index
                childNodes = parentNode.childNodes;
                for (i = 0; i < childNodes.length; i++) {
                    otherElement = childNodes[i];
                    otherZIndex = attr(otherElement, 'zIndex');
                    if (otherElement !== element && (
                        // insert before the first element with a higher zIndex
                            pInt(otherZIndex) > zIndex ||
                        // if no zIndex given, insert before the first element with a zIndex
                            (!defined(zIndex) && defined(otherZIndex))

                            )) {
                        parentNode.insertBefore(element, otherElement);
                        inserted = true;
                        break;
                    }
                }
            }

            // default: append at the end
            if (!inserted) {
                parentNode.appendChild(element);
            }

            // mark as added
            this.added = true;

            // fire an event for internal hooks
            if (this.onAdd) {
                this.onAdd();
            }

            return this;
        },

        /**
         * Removes a child either by removeChild or move to garbageBin.
         * Issue 490; in VML removeChild results in Orphaned nodes according to sIEve, discardElement does not.
         */
        safeRemoveChild: function (element) {
            var parentNode = element.parentNode;
            if (parentNode) {
                parentNode.removeChild(element);
            }
        },

        /**
         * Destroy the element and element wrapper
         */
        destroy: function () {
            var wrapper = this,
                element = wrapper.element || {},
                shadows = wrapper.shadows,
                parentToClean = wrapper.renderer.isSVG && element.nodeName === 'SPAN' && wrapper.parentGroup,
                grandParent,
                key,
                i;

            // remove events
            element.onclick = element.onmouseout = element.onmouseover = element.onmousemove = element.point = null;
            stop(wrapper); // stop running animations

            if (wrapper.clipPath) {
                wrapper.clipPath = wrapper.clipPath.destroy();
            }

            // Destroy stops in case this is a gradient object
            if (wrapper.stops) {
                for (i = 0; i < wrapper.stops.length; i++) {
                    wrapper.stops[i] = wrapper.stops[i].destroy();
                }
                wrapper.stops = null;
            }

            // remove element
            wrapper.safeRemoveChild(element);

            // destroy shadows
            if (shadows) {
                each(shadows, function (shadow) {
                    wrapper.safeRemoveChild(shadow);
                });
            }

            // In case of useHTML, clean up empty containers emulating SVG groups (#1960, #2393).
            while (parentToClean && parentToClean.div.childNodes.length === 0) {
                grandParent = parentToClean.parentGroup;
                wrapper.safeRemoveChild(parentToClean.div);
                delete parentToClean.div;
                parentToClean = grandParent;
            }

            // remove from alignObjects
            if (wrapper.alignTo) {
                erase(wrapper.renderer.alignedObjects, wrapper);
            }

            for (key in wrapper) {
                delete wrapper[key];
            }

            return null;
        },

        /**
         * Add a shadow to the element. Must be done after the element is added to the DOM
         * @param {Boolean|Object} shadowOptions
         */
        shadow: function (shadowOptions, group, cutOff) {
            var shadows = [],
                i,
                shadow,
                element = this.element,
                strokeWidth,
                shadowWidth,
                shadowElementOpacity,

                // compensate for inverted plot area
                transform;


            if (shadowOptions) {
                shadowWidth = pick(shadowOptions.width, 3);
                shadowElementOpacity = (shadowOptions.opacity || 0.15) / shadowWidth;
                transform = this.parentInverted ?
                    '(-1,-1)' :
                    '(' + pick(shadowOptions.offsetX, 1) + ', ' + pick(shadowOptions.offsetY, 1) + ')';
                for (i = 1; i <= shadowWidth; i++) {
                    shadow = element.cloneNode(0);
                    strokeWidth = (shadowWidth * 2) + 1 - (2 * i);
                    attr(shadow, {
                        'isShadow': 'true',
                        'stroke': shadowOptions.color || 'black',
                        'stroke-opacity': shadowElementOpacity * i,
                        'stroke-width': strokeWidth,
                        'transform': 'translate' + transform,
                        'fill': NONE
                    });
                    if (cutOff) {
                        attr(shadow, 'height', mathMax(attr(shadow, 'height') - strokeWidth, 0));
                        shadow.cutHeight = strokeWidth;
                    }

                    if (group) {
                        group.element.appendChild(shadow);
                    } else {
                        element.parentNode.insertBefore(shadow, element);
                    }

                    shadows.push(shadow);
                }

                this.shadows = shadows;
            }
            return this;

        }
    };


    /**
     * The default SVG renderer
     */
    var SVGRenderer = function () {
        this.init.apply(this, arguments);
    };
    SVGRenderer.prototype = {
        Element: SVGElement,

        /**
         * Initialize the SVGRenderer
         * @param {Object} container
         * @param {Number} width
         * @param {Number} height
         * @param {Boolean} forExport
         */
        init: function (container, width, height, style, forExport) {
            var renderer = this,
                loc = location,
                boxWrapper,
                element,
                desc;

            boxWrapper = renderer.createElement('svg')
                .attr({
                    version: '1.1'
                })
                .css(this.getStyle(style));
            element = boxWrapper.element;
            container.appendChild(element);

            // For browsers other than IE, add the namespace attribute (#1978)
            if (container.innerHTML.indexOf('xmlns') === -1) {
                attr(element, 'xmlns', SVG_NS);
            }

            // object properties
            renderer.isSVG = true;
            renderer.box = element;
            renderer.boxWrapper = boxWrapper;
            renderer.alignedObjects = [];

            // Page url used for internal references. #24, #672, #1070
            renderer.url = (isFirefox || isWebKit) && doc.getElementsByTagName('base').length ?
                loc.href
                    .replace(/#.*?$/, '') // remove the hash
                    .replace(/([\('\)])/g, '\\$1') // escape parantheses and quotes
                    .replace(/ /g, '%20') : // replace spaces (needed for Safari only)
                '';

            // Add description
            desc = this.createElement('desc').add();
            desc.element.appendChild(doc.createTextNode('Created with ' + PRODUCT + ' ' + VERSION));


            renderer.defs = this.createElement('defs').add();
            renderer.forExport = forExport;
            renderer.gradients = {}; // Object where gradient SvgElements are stored
            renderer.cache = {}; // Cache for numerical bounding boxes

            renderer.setSize(width, height, false);



            // Issue 110 workaround:
            // In Firefox, if a div is positioned by percentage, its pixel position may land
            // between pixels. The container itself doesn't display this, but an SVG element
            // inside this container will be drawn at subpixel precision. In order to draw
            // sharp lines, this must be compensated for. This doesn't seem to work inside
            // iframes though (like in jsFiddle).
            var subPixelFix, rect;
            if (isFirefox && container.getBoundingClientRect) {
                renderer.subPixelFix = subPixelFix = function () {
                    css(container, { left: 0, top: 0 });
                    rect = container.getBoundingClientRect();
                    css(container, {
                        left: (mathCeil(rect.left) - rect.left) + PX,
                        top: (mathCeil(rect.top) - rect.top) + PX
                    });
                };

                // run the fix now
                subPixelFix();

                // run it on resize
                addEvent(win, 'resize', subPixelFix);
            }
        },

        getStyle: function (style) {
            return (this.style = extend({
                fontFamily: '"Lucida Grande", "Lucida Sans Unicode", Verdana, Arial, Helvetica, sans-serif', // default font
                fontSize: '12px'
            }, style));
        },

        /**
         * Detect whether the renderer is hidden. This happens when one of the parent elements
         * has display: none. #608.
         */
        isHidden: function () {
            return !this.boxWrapper.getBBox().width;
        },

        /**
         * Destroys the renderer and its allocated members.
         */
        destroy: function () {
            var renderer = this,
                rendererDefs = renderer.defs;
            renderer.box = null;
            renderer.boxWrapper = renderer.boxWrapper.destroy();

            // Call destroy on all gradient elements
            destroyObjectProperties(renderer.gradients || {});
            renderer.gradients = null;

            // Defs are null in VMLRenderer
            // Otherwise, destroy them here.
            if (rendererDefs) {
                renderer.defs = rendererDefs.destroy();
            }

            // Remove sub pixel fix handler
            // We need to check that there is a handler, otherwise all functions that are registered for event 'resize' are removed
            // See issue #982
            if (renderer.subPixelFix) {
                removeEvent(win, 'resize', renderer.subPixelFix);
            }

            renderer.alignedObjects = null;

            return null;
        },

        /**
         * Create a wrapper for an SVG element
         * @param {Object} nodeName
         */
        createElement: function (nodeName) {
            var wrapper = new this.Element();
            wrapper.init(this, nodeName);
            return wrapper;
        },

        /**
         * Dummy function for use in canvas renderer
         */
        draw: function () { },

        /**
         * Parse a simple HTML string into SVG tspans
         *
         * @param {Object} textNode The parent text SVG node
         */
        buildText: function (wrapper) {
            var textNode = wrapper.element,
                renderer = this,
                forExport = renderer.forExport,
                lines = pick(wrapper.textStr, '').toString()
                    .replace(/<(b|strong)>/g, '<span style="font-weight:bold">')
                    .replace(/<(i|em)>/g, '<span style="font-style:italic">')
                    .replace(/<a/g, '<span')
                    .replace(/<\/(b|strong|i|em|a)>/g, '</span>')
                    .split(/<br.*?>/g),
                childNodes = textNode.childNodes,
                styleRegex = /<.*style="([^"]+)".*>/,
                hrefRegex = /<.*href="(http[^"]+)".*>/,
                parentX = attr(textNode, 'x'),
                textStyles = wrapper.styles,
                width = wrapper.textWidth,
                textLineHeight = textStyles && textStyles.lineHeight,
                i = childNodes.length,
                getLineHeight = function (tspan) {
                    return textLineHeight ?
                        pInt(textLineHeight) :
                        renderer.fontMetrics(
                            /(px|em)$/.test(tspan && tspan.style.fontSize) ?
                                tspan.style.fontSize :
                                (textStyles.fontSize || 11)
                        ).h;
                };

            /// remove old text
            while (i--) {
                textNode.removeChild(childNodes[i]);
            }

            if (width && !wrapper.added) {
                this.box.appendChild(textNode); // attach it to the DOM to read offset width
            }

            // remove empty line at end
            if (lines[lines.length - 1] === '') {
                lines.pop();
            }

            // build the lines
            each(lines, function (line, lineNo) {
                var spans, spanNo = 0;

                line = line.replace(/<span/g, '|||<span').replace(/<\/span>/g, '</span>|||');
                spans = line.split('|||');

                each(spans, function (span) {
                    if (span !== '' || spans.length === 1) {
                        var attributes = {},
                            tspan = doc.createElementNS(SVG_NS, 'tspan'),
                            spanStyle; // #390
                        if (styleRegex.test(span)) {
                            spanStyle = span.match(styleRegex)[1].replace(/(;| |^)color([ :])/, '$1fill$2');
                            attr(tspan, 'style', spanStyle);
                        }
                        if (hrefRegex.test(span) && !forExport) { // Not for export - #1529
                            attr(tspan, 'onclick', 'location.href=\"' + span.match(hrefRegex)[1] + '\"');
                            css(tspan, { cursor: 'pointer' });
                        }

                        span = (span.replace(/<(.|\n)*?>/g, '') || ' ')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>');

                        // Nested tags aren't supported, and cause crash in Safari (#1596)
                        if (span !== ' ') {

                            // add the text node
                            tspan.appendChild(doc.createTextNode(span));

                            if (!spanNo) { // first span in a line, align it to the left
                                attributes.x = parentX;
                            } else {
                                attributes.dx = 0; // #16
                            }

                            // add attributes
                            attr(tspan, attributes);

                            // first span on subsequent line, add the line height
                            if (!spanNo && lineNo) {

                                // allow getting the right offset height in exporting in IE
                                if (!hasSVG && forExport) {
                                    css(tspan, { display: 'block' });
                                }

                                // Set the line height based on the font size of either
                                // the text element or the tspan element
                                attr(
                                    tspan,
                                    'dy',
                                    getLineHeight(tspan),
                                    // Safari 6.0.2 - too optimized for its own good (#1539)
                                    // TODO: revisit this with future versions of Safari
                                    isWebKit && tspan.offsetHeight
                                );
                            }

                            // Append it
                            textNode.appendChild(tspan);

                            spanNo++;

                            // check width and apply soft breaks
                            if (width) {
                                var words = span.replace(/([^\^])-/g, '$1- ').split(' '), // #1273
                                    hasWhiteSpace = words.length > 1 && textStyles.whiteSpace !== 'nowrap',
                                    tooLong,
                                    actualWidth,
                                    clipHeight = wrapper._clipHeight,
                                    rest = [],
                                    dy = getLineHeight(),
                                    softLineNo = 1,
                                    bBox;

                                while (hasWhiteSpace && (words.length || rest.length)) {
                                    delete wrapper.bBox; // delete cache
                                    bBox = wrapper.getBBox();
                                    actualWidth = bBox.width;

                                    // Old IE cannot measure the actualWidth for SVG elements (#2314)
                                    if (!hasSVG && renderer.forExport) {
                                        actualWidth = renderer.measureSpanWidth(tspan.firstChild.data, wrapper.styles);
                                    }

                                    tooLong = actualWidth > width;
                                    if (!tooLong || words.length === 1) { // new line needed
                                        words = rest;
                                        rest = [];
                                        if (words.length) {
                                            softLineNo++;

                                            if (clipHeight && softLineNo * dy > clipHeight) {
                                                words = ['...'];
                                                wrapper.attr('title', wrapper.textStr);
                                            } else {

                                                tspan = doc.createElementNS(SVG_NS, 'tspan');
                                                attr(tspan, {
                                                    dy: dy,
                                                    x: parentX
                                                });
                                                if (spanStyle) { // #390
                                                    attr(tspan, 'style', spanStyle);
                                                }
                                                textNode.appendChild(tspan);

                                                if (actualWidth > width) { // a single word is pressing it out
                                                    width = actualWidth;
                                                }
                                            }
                                        }
                                    } else { // append to existing line tspan
                                        tspan.removeChild(tspan.firstChild);
                                        rest.unshift(words.pop());
                                    }
                                    if (words.length) {
                                        tspan.appendChild(doc.createTextNode(words.join(' ').replace(/- /g, '-')));
                                    }
                                }
                            }
                        }
                    }
                });
            });
        },

        /**
         * Create a button with preset states
         * @param {String} text
         * @param {Number} x
         * @param {Number} y
         * @param {Function} callback
         * @param {Object} normalState
         * @param {Object} hoverState
         * @param {Object} pressedState
         */
        button: function (text, x, y, callback, normalState, hoverState, pressedState, disabledState, shape) {
            var label = this.label(text, x, y, shape, null, null, null, null, 'button'),
                curState = 0,
                stateOptions,
                stateStyle,
                normalStyle,
                hoverStyle,
                pressedStyle,
                disabledStyle,
                STYLE = 'style',
                verticalGradient = { x1: 0, y1: 0, x2: 0, y2: 1 };

            // Normal state - prepare the attributes
            normalState = merge({
                'stroke-width': 1,
                stroke: '#CCCCCC',
                fill: {
                    linearGradient: verticalGradient,
                    stops: [
                        [0, '#FEFEFE'],
                        [1, '#F6F6F6']
                    ]
                },
                r: 2,
                padding: 5,
                style: {
                    color: 'black'
                }
            }, normalState);
            normalStyle = normalState[STYLE];
            delete normalState[STYLE];

            // Hover state
            hoverState = merge(normalState, {
                stroke: '#68A',
                fill: {
                    linearGradient: verticalGradient,
                    stops: [
                        [0, '#FFF'],
                        [1, '#ACF']
                    ]
                }
            }, hoverState);
            hoverStyle = hoverState[STYLE];
            delete hoverState[STYLE];

            // Pressed state
            pressedState = merge(normalState, {
                stroke: '#68A',
                fill: {
                    linearGradient: verticalGradient,
                    stops: [
                        [0, '#9BD'],
                        [1, '#CDF']
                    ]
                }
            }, pressedState);
            pressedStyle = pressedState[STYLE];
            delete pressedState[STYLE];

            // Disabled state
            disabledState = merge(normalState, {
                style: {
                    color: '#CCC'
                }
            }, disabledState);
            disabledStyle = disabledState[STYLE];
            delete disabledState[STYLE];

            // Add the events. IE9 and IE10 need mouseover and mouseout to funciton (#667).
            addEvent(label.element, isIE ? 'mouseover' : 'mouseenter', function () {
                if (curState !== 3) {
                    label.attr(hoverState)
                        .css(hoverStyle);
                }
            });
            addEvent(label.element, isIE ? 'mouseout' : 'mouseleave', function () {
                if (curState !== 3) {
                    stateOptions = [normalState, hoverState, pressedState][curState];
                    stateStyle = [normalStyle, hoverStyle, pressedStyle][curState];
                    label.attr(stateOptions)
                        .css(stateStyle);
                }
            });

            label.setState = function (state) {
                label.state = curState = state;
                if (!state) {
                    label.attr(normalState)
                        .css(normalStyle);
                } else if (state === 2) {
                    label.attr(pressedState)
                        .css(pressedStyle);
                } else if (state === 3) {
                    label.attr(disabledState)
                        .css(disabledStyle);
                }
            };

            return label
                .on('click', function () {
                    if (curState !== 3) {
                        callback.call(label);
                    }
                })
                .attr(normalState)
                .css(extend({ cursor: 'default' }, normalStyle));
        },

        /**
         * Make a straight line crisper by not spilling out to neighbour pixels
         * @param {Array} points
         * @param {Number} width
         */
        crispLine: function (points, width) {
            // points format: [M, 0, 0, L, 100, 0]
            // normalize to a crisp line
            if (points[1] === points[4]) {
                // Substract due to #1129. Now bottom and left axis gridlines behave the same.
                points[1] = points[4] = mathRound(points[1]) - (width % 2 / 2);
            }
            if (points[2] === points[5]) {
                points[2] = points[5] = mathRound(points[2]) + (width % 2 / 2);
            }
            return points;
        },


        /**
         * Draw a path
         * @param {Array} path An SVG path in array form
         */
        path: function (path) {
            var attr = {
                fill: NONE
            };
            if (isArray(path)) {
                attr.d = path;
            } else if (isObject(path)) { // attributes
                extend(attr, path);
            }
            return this.createElement('path').attr(attr);
        },

        /**
         * Draw and return an SVG circle
         * @param {Number} x The x position
         * @param {Number} y The y position
         * @param {Number} r The radius
         */
        circle: function (x, y, r) {
            var attr = isObject(x) ?
                x :
			{
			    x: x,
			    y: y,
			    r: r
			};

            return this.createElement('circle').attr(attr);
        },

        /**
         * Draw and return an arc
         * @param {Number} x X position
         * @param {Number} y Y position
         * @param {Number} r Radius
         * @param {Number} innerR Inner radius like used in donut charts
         * @param {Number} start Starting angle
         * @param {Number} end Ending angle
         */
        arc: function (x, y, r, innerR, start, end) {
            var arc;

            if (isObject(x)) {
                y = x.y;
                r = x.r;
                innerR = x.innerR;
                start = x.start;
                end = x.end;
                x = x.x;
            }

            // Arcs are defined as symbols for the ability to set
            // attributes in attr and animate
            arc = this.symbol('arc', x || 0, y || 0, r || 0, r || 0, {
                innerR: innerR || 0,
                start: start || 0,
                end: end || 0
            });
            arc.r = r; // #959
            return arc;
        },

        /**
         * Draw and return a rectangle
         * @param {Number} x Left position
         * @param {Number} y Top position
         * @param {Number} width
         * @param {Number} height
         * @param {Number} r Border corner radius
         * @param {Number} strokeWidth A stroke width can be supplied to allow crisp drawing
         */
        rect: function (x, y, width, height, r, strokeWidth) {

            r = isObject(x) ? x.r : r;

            var wrapper = this.createElement('rect'),
                attr = isObject(x) ? x : x === UNDEFINED ? {} : {
                    x: x,
                    y: y,
                    width: mathMax(width, 0),
                    height: mathMax(height, 0)
                };

            if (strokeWidth !== UNDEFINED) {
                attr.strokeWidth = strokeWidth;
                attr = wrapper.crisp(attr);
            }

            if (r) {
                attr.r = r;
            }

            return wrapper.attr(attr);
        },

        /**
         * Resize the box and re-align all aligned elements
         * @param {Object} width
         * @param {Object} height
         * @param {Boolean} animate
         *
         */
        setSize: function (width, height, animate) {
            var renderer = this,
                alignedObjects = renderer.alignedObjects,
                i = alignedObjects.length;

            renderer.width = width;
            renderer.height = height;

            renderer.boxWrapper[pick(animate, true) ? 'animate' : 'attr']({
                width: width,
                height: height
            });

            while (i--) {
                alignedObjects[i].align();
            }
        },

        /**
         * Create a group
         * @param {String} name The group will be given a class name of 'highcharts-{name}'.
         *     This can be used for styling and scripting.
         */
        g: function (name) {
            var elem = this.createElement('g');
            return defined(name) ? elem.attr({ 'class': PREFIX + name }) : elem;
        },

        /**
         * Display an image
         * @param {String} src
         * @param {Number} x
         * @param {Number} y
         * @param {Number} width
         * @param {Number} height
         */
        image: function (src, x, y, width, height) {
            var attribs = {
                preserveAspectRatio: NONE
            },
                elemWrapper;

            // optional properties
            if (arguments.length > 1) {
                extend(attribs, {
                    x: x,
                    y: y,
                    width: width,
                    height: height
                });
            }

            elemWrapper = this.createElement('image').attr(attribs);

            // set the href in the xlink namespace
            if (elemWrapper.element.setAttributeNS) {
                elemWrapper.element.setAttributeNS('http://www.w3.org/1999/xlink',
                    'href', src);
            } else {
                // could be exporting in IE
                // using href throws "not supported" in ie7 and under, requries regex shim to fix later
                elemWrapper.element.setAttribute('hc-svg-href', src);
            }

            return elemWrapper;
        },

        /**
         * Draw a symbol out of pre-defined shape paths from the namespace 'symbol' object.
         *
         * @param {Object} symbol
         * @param {Object} x
         * @param {Object} y
         * @param {Object} radius
         * @param {Object} options
         */
        symbol: function (symbol, x, y, width, height, options) {

            var obj,

                // get the symbol definition function
                symbolFn = this.symbols[symbol],

                // check if there's a path defined for this symbol
                path = symbolFn && symbolFn(
                    mathRound(x),
                    mathRound(y),
                    width,
                    height,
                    options
                ),

                imageElement,
                imageRegex = /^url\((.*?)\)$/,
                imageSrc,
                imageSize,
                centerImage;

            if (path) {

                obj = this.path(path);
                // expando properties for use in animate and attr
                extend(obj, {
                    symbolName: symbol,
                    x: x,
                    y: y,
                    width: width,
                    height: height
                });
                if (options) {
                    extend(obj, options);
                }


                // image symbols
            } else if (imageRegex.test(symbol)) {

                // On image load, set the size and position
                centerImage = function (img, size) {
                    if (img.element) { // it may be destroyed in the meantime (#1390)
                        img.attr({
                            width: size[0],
                            height: size[1]
                        });

                        if (!img.alignByTranslate) { // #185
                            img.translate(
                                mathRound((width - size[0]) / 2), // #1378
                                mathRound((height - size[1]) / 2)
                            );
                        }
                    }
                };

                imageSrc = symbol.match(imageRegex)[1];
                imageSize = symbolSizes[imageSrc];

                // Ireate the image synchronously, add attribs async
                obj = this.image(imageSrc)
                    .attr({
                        x: x,
                        y: y
                    });
                obj.isImg = true;

                if (imageSize) {
                    centerImage(obj, imageSize);
                } else {
                    // Initialize image to be 0 size so export will still function if there's no cached sizes.
                    //
                    obj.attr({ width: 0, height: 0 });

                    // Create a dummy JavaScript image to get the width and height. Due to a bug in IE < 8,
                    // the created element must be assigned to a variable in order to load (#292).
                    imageElement = createElement('img', {
                        onload: function () {
                            centerImage(obj, symbolSizes[imageSrc] = [this.width, this.height]);
                        },
                        src: imageSrc
                    });
                }
            }

            return obj;
        },

        /**
         * An extendable collection of functions for defining symbol paths.
         */
        symbols: {
            'circle': function (x, y, w, h) {
                var cpw = 0.166 * w;
                return [
                    M, x + w / 2, y,
                    'C', x + w + cpw, y, x + w + cpw, y + h, x + w / 2, y + h,
                    'C', x - cpw, y + h, x - cpw, y, x + w / 2, y,
                    'Z'
                ];
            },

            'square': function (x, y, w, h) {
                return [
                    M, x, y,
                    L, x + w, y,
                    x + w, y + h,
                    x, y + h,
                    'Z'
                ];
            },

            'triangle': function (x, y, w, h) {
                return [
                    M, x + w / 2, y,
                    L, x + w, y + h,
                    x, y + h,
                    'Z'
                ];
            },

            'triangle-down': function (x, y, w, h) {
                return [
                    M, x, y,
                    L, x + w, y,
                    x + w / 2, y + h,
                    'Z'
                ];
            },
            'diamond': function (x, y, w, h) {
                return [
                    M, x + w / 2, y,
                    L, x + w, y + h / 2,
                    x + w / 2, y + h,
                    x, y + h / 2,
                    'Z'
                ];
            },
            'arc': function (x, y, w, h, options) {
                var start = options.start,
                    radius = options.r || w || h,
                    end = options.end - 0.001, // to prevent cos and sin of start and end from becoming equal on 360 arcs (related: #1561)
                    innerRadius = options.innerR,
                    open = options.open,
                    cosStart = mathCos(start),
                    sinStart = mathSin(start),
                    cosEnd = mathCos(end),
                    sinEnd = mathSin(end),
                    longArc = options.end - start < mathPI ? 0 : 1;

                return [
                    M,
                    x + radius * cosStart,
                    y + radius * sinStart,
                    'A', // arcTo
                    radius, // x radius
                    radius, // y radius
                    0, // slanting
                    longArc, // long or short arc
                    1, // clockwise
                    x + radius * cosEnd,
                    y + radius * sinEnd,
                    open ? M : L,
                    x + innerRadius * cosEnd,
                    y + innerRadius * sinEnd,
                    'A', // arcTo
                    innerRadius, // x radius
                    innerRadius, // y radius
                    0, // slanting
                    longArc, // long or short arc
                    0, // clockwise
                    x + innerRadius * cosStart,
                    y + innerRadius * sinStart,

                    open ? '' : 'Z' // close
                ];
            }
        },

        /**
         * Define a clipping rectangle
         * @param {String} id
         * @param {Number} x
         * @param {Number} y
         * @param {Number} width
         * @param {Number} height
         */
        clipRect: function (x, y, width, height) {
            var wrapper,
                id = PREFIX + idCounter++,

                clipPath = this.createElement('clipPath').attr({
                    id: id
                }).add(this.defs);

            wrapper = this.rect(x, y, width, height, 0).add(clipPath);
            wrapper.id = id;
            wrapper.clipPath = clipPath;

            return wrapper;
        },


        /**
         * Take a color and return it if it's a string, make it a gradient if it's a
         * gradient configuration object. Prior to Highstock, an array was used to define
         * a linear gradient with pixel positions relative to the SVG. In newer versions
         * we change the coordinates to apply relative to the shape, using coordinates
         * 0-1 within the shape. To preserve backwards compatibility, linearGradient
         * in this definition is an object of x1, y1, x2 and y2.
         *
         * @param {Object} color The color or config object
         */
        color: function (color, elem, prop) {
            var renderer = this,
                colorObject,
                regexRgba = /^rgba/,
                gradName,
                gradAttr,
                gradients,
                gradientObject,
                stops,
                stopColor,
                stopOpacity,
                radialReference,
                n,
                id,
                key = [];

            // Apply linear or radial gradients
            if (color && color.linearGradient) {
                gradName = 'linearGradient';
            } else if (color && color.radialGradient) {
                gradName = 'radialGradient';
            }

            if (gradName) {
                gradAttr = color[gradName];
                gradients = renderer.gradients;
                stops = color.stops;
                radialReference = elem.radialReference;

                // Keep < 2.2 kompatibility
                if (isArray(gradAttr)) {
                    color[gradName] = gradAttr = {
                        x1: gradAttr[0],
                        y1: gradAttr[1],
                        x2: gradAttr[2],
                        y2: gradAttr[3],
                        gradientUnits: 'userSpaceOnUse'
                    };
                }

                // Correct the radial gradient for the radial reference system
                if (gradName === 'radialGradient' && radialReference && !defined(gradAttr.gradientUnits)) {
                    gradAttr = merge(gradAttr, {
                        cx: (radialReference[0] - radialReference[2] / 2) + gradAttr.cx * radialReference[2],
                        cy: (radialReference[1] - radialReference[2] / 2) + gradAttr.cy * radialReference[2],
                        r: gradAttr.r * radialReference[2],
                        gradientUnits: 'userSpaceOnUse'
                    });
                }

                // Build the unique key to detect whether we need to create a new element (#1282)
                for (n in gradAttr) {
                    if (n !== 'id') {
                        key.push(n, gradAttr[n]);
                    }
                }
                for (n in stops) {
                    key.push(stops[n]);
                }
                key = key.join(',');

                // Check if a gradient object with the same config object is created within this renderer
                if (gradients[key]) {
                    id = gradients[key].id;

                } else {

                    // Set the id and create the element
                    gradAttr.id = id = PREFIX + idCounter++;
                    gradients[key] = gradientObject = renderer.createElement(gradName)
                        .attr(gradAttr)
                        .add(renderer.defs);


                    // The gradient needs to keep a list of stops to be able to destroy them
                    gradientObject.stops = [];
                    each(stops, function (stop) {
                        var stopObject;
                        if (regexRgba.test(stop[1])) {
                            colorObject = Color(stop[1]);
                            stopColor = colorObject.get('rgb');
                            stopOpacity = colorObject.get('a');
                        } else {
                            stopColor = stop[1];
                            stopOpacity = 1;
                        }
                        stopObject = renderer.createElement('stop').attr({
                            offset: stop[0],
                            'stop-color': stopColor,
                            'stop-opacity': stopOpacity
                        }).add(gradientObject);

                        // Add the stop element to the gradient
                        gradientObject.stops.push(stopObject);
                    });
                }

                // Return the reference to the gradient object
                return 'url(' + renderer.url + '#' + id + ')';

                // Webkit and Batik can't show rgba.
            } else if (regexRgba.test(color)) {
                colorObject = Color(color);
                attr(elem, prop + '-opacity', colorObject.get('a'));

                return colorObject.get('rgb');


            } else {
                // Remove the opacity attribute added above. Does not throw if the attribute is not there.
                elem.removeAttribute(prop + '-opacity');

                return color;
            }

        },


        /**
         * Add text to the SVG object
         * @param {String} str
         * @param {Number} x Left position
         * @param {Number} y Top position
         * @param {Boolean} useHTML Use HTML to render the text
         */
        text: function (str, x, y, useHTML) {

            // declare variables
            var renderer = this,
                fakeSVG = useCanVG || (!hasSVG && renderer.forExport),
                wrapper;

            if (useHTML && !renderer.forExport) {
                return renderer.html(str, x, y);
            }

            x = mathRound(pick(x, 0));
            y = mathRound(pick(y, 0));

            wrapper = renderer.createElement('text')
                .attr({
                    x: x,
                    y: y,
                    text: str
                });

            // Prevent wrapping from creating false offsetWidths in export in legacy IE (#1079, #1063)
            if (fakeSVG) {
                wrapper.css({
                    position: ABSOLUTE
                });
            }

            wrapper.x = x;
            wrapper.y = y;
            return wrapper;
        },

        /**
         * Utility to return the baseline offset and total line height from the font size
         */
        fontMetrics: function (fontSize) {
            fontSize = fontSize || this.style.fontSize;
            fontSize = /px/.test(fontSize) ? pInt(fontSize) : /em/.test(fontSize) ? parseFloat(fontSize) * 12 : 12;

            // Empirical values found by comparing font size and bounding box height.
            // Applies to the default font family. http://jsfiddle.net/highcharts/7xvn7/
            var lineHeight = fontSize < 24 ? fontSize + 4 : mathRound(fontSize * 1.2),
                baseline = mathRound(lineHeight * 0.8);

            return {
                h: lineHeight,
                b: baseline
            };
        },

        /**
         * Add a label, a text item that can hold a colored or gradient background
         * as well as a border and shadow.
         * @param {string} str
         * @param {Number} x
         * @param {Number} y
         * @param {String} shape
         * @param {Number} anchorX In case the shape has a pointer, like a flag, this is the
         *    coordinates it should be pinned to
         * @param {Number} anchorY
         * @param {Boolean} baseline Whether to position the label relative to the text baseline,
         *    like renderer.text, or to the upper border of the rectangle.
         * @param {String} className Class name for the group
         */
        label: function (str, x, y, shape, anchorX, anchorY, useHTML, baseline, className) {

            var renderer = this,
                wrapper = renderer.g(className),
                text = renderer.text('', 0, 0, useHTML)
                    .attr({
                        zIndex: 1
                    }),
                    //.add(wrapper),
                box,
                bBox,
                alignFactor = 0,
                padding = 3,
                paddingLeft = 0,
                width,
                height,
                wrapperX,
                wrapperY,
                crispAdjust = 0,
                deferredAttr = {},
                baselineOffset,
                attrSetters = wrapper.attrSetters,
                needsBox;

            /**
             * This function runs after the label is added to the DOM (when the bounding box is
             * available), and after the text of the label is updated to detect the new bounding
             * box and reflect it in the border box.
             */
            function updateBoxSize() {
                var boxX,
                    boxY,
                    style = text.element.style;

                bBox = (width === undefined || height === undefined || wrapper.styles.textAlign) && text.textStr &&
                    text.getBBox();
                wrapper.width = (width || bBox.width || 0) + 2 * padding + paddingLeft;
                wrapper.height = (height || bBox.height || 0) + 2 * padding;

                // update the label-scoped y offset
                baselineOffset = padding + renderer.fontMetrics(style && style.fontSize).b;

                if (needsBox) {

                    // create the border box if it is not already present
                    if (!box) {
                        boxX = mathRound(-alignFactor * padding);
                        boxY = baseline ? -baselineOffset : 0;

                        wrapper.box = box = shape ?
                            renderer.symbol(shape, boxX, boxY, wrapper.width, wrapper.height, deferredAttr) :
                            renderer.rect(boxX, boxY, wrapper.width, wrapper.height, 0, deferredAttr[STROKE_WIDTH]);
                        box.attr('fill', NONE).add(wrapper);
                    }

                    // apply the box attributes
                    if (!box.isImg) { // #1630
                        box.attr(merge({
                            width: wrapper.width,
                            height: wrapper.height
                        }, deferredAttr));
                    }
                    deferredAttr = null;
                }
            }

            /**
             * This function runs after setting text or padding, but only if padding is changed
             */
            function updateTextPadding() {
                var styles = wrapper.styles,
                    textAlign = styles && styles.textAlign,
                    x = paddingLeft + padding * (1 - alignFactor),
                    y;

                // determin y based on the baseline
                y = baseline ? 0 : baselineOffset;

                // compensate for alignment
                if (defined(width) && bBox && (textAlign === 'center' || textAlign === 'right')) {
                    x += { center: 0.5, right: 1 }[textAlign] * (width - bBox.width);
                }

                // update if anything changed
                if (x !== text.x || y !== text.y) {
                    text.attr({
                        x: x,
                        y: y
                    });
                }

                // record current values
                text.x = x;
                text.y = y;
            }

            /**
             * Set a box attribute, or defer it if the box is not yet created
             * @param {Object} key
             * @param {Object} value
             */
            function boxAttr(key, value) {
                if (box) {
                    box.attr(key, value);
                } else {
                    deferredAttr[key] = value;
                }
            }

            /**
             * After the text element is added, get the desired size of the border box
             * and add it before the text in the DOM.
             */
            wrapper.onAdd = function () {
                text.add(wrapper);
                wrapper.attr({
                    text: str, // alignment is available now
                    x: x,
                    y: y
                });

                if (box && defined(anchorX)) {
                    wrapper.attr({
                        anchorX: anchorX,
                        anchorY: anchorY
                    });
                }
            };

            /*
             * Add specific attribute setters.
             */

            // only change local variables
            attrSetters.width = function (value) {
                width = value;
                return false;
            };
            attrSetters.height = function (value) {
                height = value;
                return false;
            };
            attrSetters.padding = function (value) {
                if (defined(value) && value !== padding) {
                    padding = value;
                    updateTextPadding();
                }
                return false;
            };
            attrSetters.paddingLeft = function (value) {
                if (defined(value) && value !== paddingLeft) {
                    paddingLeft = value;
                    updateTextPadding();
                }
                return false;
            };


            // change local variable and set attribue as well
            attrSetters.align = function (value) {
                alignFactor = { left: 0, center: 0.5, right: 1 }[value];
                return false; // prevent setting text-anchor on the group
            };

            // apply these to the box and the text alike
            attrSetters.text = function (value, key) {
                text.attr(key, value);
                updateBoxSize();
                updateTextPadding();
                return false;
            };

            // apply these to the box but not to the text
            attrSetters[STROKE_WIDTH] = function (value, key) {
                if (value) {
                    needsBox = true;
                }
                crispAdjust = value % 2 / 2;
                boxAttr(key, value);
                return false;
            };
            attrSetters.stroke = attrSetters.fill = attrSetters.r = function (value, key) {
                if (key === 'fill' && value) {
                    needsBox = true;
                }
                boxAttr(key, value);
                return false;
            };
            attrSetters.anchorX = function (value, key) {
                anchorX = value;
                boxAttr(key, value + crispAdjust - wrapperX);
                return false;
            };
            attrSetters.anchorY = function (value, key) {
                anchorY = value;
                boxAttr(key, value - wrapperY);
                return false;
            };

            // rename attributes
            attrSetters.x = function (value) {
                wrapper.x = value; // for animation getter
                value -= alignFactor * ((width || bBox.width) + padding);
                wrapperX = mathRound(value);

                wrapper.attr('translateX', wrapperX);
                return false;
            };
            attrSetters.y = function (value) {
                wrapperY = wrapper.y = mathRound(value);
                wrapper.attr('translateY', wrapperY);
                return false;
            };

            // Redirect certain methods to either the box or the text
            var baseCss = wrapper.css;
            return extend(wrapper, {
                /**
                 * Pick up some properties and apply them to the text instead of the wrapper
                 */
                css: function (styles) {
                    if (styles) {
                        var textStyles = {};
                        styles = merge(styles); // create a copy to avoid altering the original object (#537)
                        each(['fontSize', 'fontWeight', 'fontFamily', 'color', 'lineHeight', 'width', 'textDecoration', 'textShadow'], function (prop) {
                            if (styles[prop] !== UNDEFINED) {
                                textStyles[prop] = styles[prop];
                                delete styles[prop];
                            }
                        });
                        text.css(textStyles);
                    }
                    return baseCss.call(wrapper, styles);
                },
                /**
                 * Return the bounding box of the box, not the group
                 */
                getBBox: function () {
                    return {
                        width: bBox.width + 2 * padding,
                        height: bBox.height + 2 * padding,
                        x: bBox.x - padding,
                        y: bBox.y - padding
                    };
                },
                /**
                 * Apply the shadow to the box
                 */
                shadow: function (b) {
                    if (box) {
                        box.shadow(b);
                    }
                    return wrapper;
                },
                /**
                 * Destroy and release memory.
                 */
                destroy: function () {

                    // Added by button implementation
                    removeEvent(wrapper.element, 'mouseenter');
                    removeEvent(wrapper.element, 'mouseleave');

                    if (text) {
                        text = text.destroy();
                    }
                    if (box) {
                        box = box.destroy();
                    }
                    // Call base implementation to destroy the rest
                    SVGElement.prototype.destroy.call(wrapper);

                    // Release local pointers (#1298)
                    wrapper = renderer = updateBoxSize = updateTextPadding = boxAttr = null;
                }
            });
        }
    }; // end SVGRenderer


    // general renderer
    Renderer = SVGRenderer;
    // extend SvgElement for useHTML option
    extend(SVGElement.prototype, {
        /**
         * Apply CSS to HTML elements. This is used in text within SVG rendering and
         * by the VML renderer
         */
        htmlCss: function (styles) {
            var wrapper = this,
                element = wrapper.element,
                textWidth = styles && element.tagName === 'SPAN' && styles.width;

            if (textWidth) {
                delete styles.width;
                wrapper.textWidth = textWidth;
                wrapper.updateTransform();
            }

            wrapper.styles = extend(wrapper.styles, styles);
            css(wrapper.element, styles);

            return wrapper;
        },

        /**
         * VML and useHTML method for calculating the bounding box based on offsets
         * @param {Boolean} refresh Whether to force a fresh value from the DOM or to
         * use the cached value
         *
         * @return {Object} A hash containing values for x, y, width and height
         */

        htmlGetBBox: function () {
            var wrapper = this,
                element = wrapper.element,
                bBox = wrapper.bBox;

            // faking getBBox in exported SVG in legacy IE
            if (!bBox) {
                // faking getBBox in exported SVG in legacy IE (is this a duplicate of the fix for #1079?)
                if (element.nodeName === 'text') {
                    element.style.position = ABSOLUTE;
                }

                bBox = wrapper.bBox = {
                    x: element.offsetLeft,
                    y: element.offsetTop,
                    width: element.offsetWidth,
                    height: element.offsetHeight
                };
            }

            return bBox;
        },

        /**
         * VML override private method to update elements based on internal
         * properties based on SVG transform
         */
        htmlUpdateTransform: function () {
            // aligning non added elements is expensive
            if (!this.added) {
                this.alignOnAdd = true;
                return;
            }

            var wrapper = this,
                renderer = wrapper.renderer,
                elem = wrapper.element,
                translateX = wrapper.translateX || 0,
                translateY = wrapper.translateY || 0,
                x = wrapper.x || 0,
                y = wrapper.y || 0,
                align = wrapper.textAlign || 'left',
                alignCorrection = { left: 0, center: 0.5, right: 1 }[align],
                shadows = wrapper.shadows;

            // apply translate
            css(elem, {
                marginLeft: translateX,
                marginTop: translateY
            });
            if (shadows) { // used in labels/tooltip
                each(shadows, function (shadow) {
                    css(shadow, {
                        marginLeft: translateX + 1,
                        marginTop: translateY + 1
                    });
                });
            }

            // apply inversion
            if (wrapper.inverted) { // wrapper is a group
                each(elem.childNodes, function (child) {
                    renderer.invertChild(child, elem);
                });
            }

            if (elem.tagName === 'SPAN') {

                var width,
                    rotation = wrapper.rotation,
                    baseline,
                    textWidth = pInt(wrapper.textWidth),
                    currentTextTransform = [rotation, align, elem.innerHTML, wrapper.textWidth].join(',');

                if (currentTextTransform !== wrapper.cTT) { // do the calculations and DOM access only if properties changed


                    baseline = renderer.fontMetrics(elem.style.fontSize).b;

                    // Renderer specific handling of span rotation
                    if (defined(rotation)) {
                        wrapper.setSpanRotation(rotation, alignCorrection, baseline);
                    }

                    width = pick(wrapper.elemWidth, elem.offsetWidth);

                    // Update textWidth
                    if (width > textWidth && /[ \-]/.test(elem.textContent || elem.innerText)) { // #983, #1254
                        css(elem, {
                            width: textWidth + PX,
                            display: 'block',
                            whiteSpace: 'normal'
                        });
                        width = textWidth;
                    }

                    wrapper.getSpanCorrection(width, baseline, alignCorrection, rotation, align);
                }

                // apply position with correction
                css(elem, {
                    left: (x + (wrapper.xCorr || 0)) + PX,
                    top: (y + (wrapper.yCorr || 0)) + PX
                });

                // force reflow in webkit to apply the left and top on useHTML element (#1249)
                if (isWebKit) {
                    baseline = elem.offsetHeight; // assigned to baseline for JSLint purpose
                }

                // record current text transform
                wrapper.cTT = currentTextTransform;
            }
        },

        /**
         * Set the rotation of an individual HTML span
         */
        setSpanRotation: function (rotation, alignCorrection, baseline) {
            var rotationStyle = {},
                cssTransformKey = isIE ? '-ms-transform' : isWebKit ? '-webkit-transform' : isFirefox ? 'MozTransform' : isOpera ? '-o-transform' : '';

            rotationStyle[cssTransformKey] = rotationStyle.transform = 'rotate(' + rotation + 'deg)';
            rotationStyle[cssTransformKey + (isFirefox ? 'Origin' : '-origin')] = rotationStyle.transformOrigin = (alignCorrection * 100) + '% ' + baseline + 'px';
            css(this.element, rotationStyle);
        },

        /**
         * Get the correction in X and Y positioning as the element is rotated.
         */
        getSpanCorrection: function (width, baseline, alignCorrection) {
            this.xCorr = -width * alignCorrection;
            this.yCorr = -baseline;
        }
    });

    // Extend SvgRenderer for useHTML option.
    extend(SVGRenderer.prototype, {
        /**
         * Create HTML text node. This is used by the VML renderer as well as the SVG
         * renderer through the useHTML option.
         *
         * @param {String} str
         * @param {Number} x
         * @param {Number} y
         */
        html: function (str, x, y) {
            var wrapper = this.createElement('span'),
                attrSetters = wrapper.attrSetters,
                element = wrapper.element,
                renderer = wrapper.renderer;

            // Text setter
            attrSetters.text = function (value) {
                if (value !== element.innerHTML) {
                    delete this.bBox;
                }
                element.innerHTML = this.textStr = value;
                return false;
            };

            // Various setters which rely on update transform
            attrSetters.x = attrSetters.y = attrSetters.align = attrSetters.rotation = function (value, key) {
                if (key === 'align') {
                    key = 'textAlign'; // Do not overwrite the SVGElement.align method. Same as VML.
                }
                wrapper[key] = value;
                wrapper.htmlUpdateTransform();

                return false;
            };

            // Set the default attributes
            wrapper.attr({
                text: str,
                x: mathRound(x),
                y: mathRound(y)
            })
                .css({
                    position: ABSOLUTE,
                    whiteSpace: 'nowrap',
                    fontFamily: this.style.fontFamily,
                    fontSize: this.style.fontSize
                });

            // Use the HTML specific .css method
            wrapper.css = wrapper.htmlCss;

            // This is specific for HTML within SVG
            if (renderer.isSVG) {
                wrapper.add = function (svgGroupWrapper) {

                    var htmlGroup,
                        container = renderer.box.parentNode,
                        parentGroup,
                        parents = [];

                    this.parentGroup = svgGroupWrapper;

                    // Create a mock group to hold the HTML elements
                    if (svgGroupWrapper) {
                        htmlGroup = svgGroupWrapper.div;
                        if (!htmlGroup) {

                            // Read the parent chain into an array and read from top down
                            parentGroup = svgGroupWrapper;
                            while (parentGroup) {

                                parents.push(parentGroup);

                                // Move up to the next parent group
                                parentGroup = parentGroup.parentGroup;
                            }

                            // Ensure dynamically updating position when any parent is translated
                            each(parents.reverse(), function (parentGroup) {
                                var htmlGroupStyle;

                                // Create a HTML div and append it to the parent div to emulate
                                // the SVG group structure
                                htmlGroup = parentGroup.div = parentGroup.div || createElement(DIV, {
                                    className: attr(parentGroup.element, 'class')
                                }, {
                                    position: ABSOLUTE,
                                    left: (parentGroup.translateX || 0) + PX,
                                    top: (parentGroup.translateY || 0) + PX
                                }, htmlGroup || container); // the top group is appended to container

                                // Shortcut
                                htmlGroupStyle = htmlGroup.style;

                                // Set listeners to update the HTML div's position whenever the SVG group
                                // position is changed
                                extend(parentGroup.attrSetters, {
                                    translateX: function (value) {
                                        htmlGroupStyle.left = value + PX;
                                    },
                                    translateY: function (value) {
                                        htmlGroupStyle.top = value + PX;
                                    },
                                    visibility: function (value, key) {
                                        htmlGroupStyle[key] = value;
                                    }
                                });
                            });

                        }
                    } else {
                        htmlGroup = container;
                    }

                    htmlGroup.appendChild(element);

                    // Shared with VML:
                    wrapper.added = true;
                    if (wrapper.alignOnAdd) {
                        wrapper.htmlUpdateTransform();
                    }

                    return wrapper;
                };
            }
            return wrapper;
        }
    });

    /* ****************************************************************************
     *                                                                            *
     * START OF INTERNET EXPLORER <= 8 SPECIFIC CODE                              *
     *                                                                            *
     * For applications and websites that don't need IE support, like platform    *
     * targeted mobile apps and web apps, this code can be removed.               *
     *                                                                            *
     *****************************************************************************/

    /**
     * @constructor
     */
    var VMLRenderer, VMLElement;
    if (!hasSVG && !useCanVG) {

        /**
         * The VML element wrapper.
         */
        Highcharts.VMLElement = VMLElement = {

            /**
             * Initialize a new VML element wrapper. It builds the markup as a string
             * to minimize DOM traffic.
             * @param {Object} renderer
             * @param {Object} nodeName
             */
            init: function (renderer, nodeName) {
                var wrapper = this,
                    markup = ['<', nodeName, ' filled="f" stroked="f"'],
                    style = ['position: ', ABSOLUTE, ';'],
                    isDiv = nodeName === DIV;

                // divs and shapes need size
                if (nodeName === 'shape' || isDiv) {
                    style.push('left:0;top:0;width:1px;height:1px;');
                }
                style.push('visibility: ', isDiv ? HIDDEN : VISIBLE);

                markup.push(' style="', style.join(''), '"/>');

                // create element with default attributes and style
                if (nodeName) {
                    markup = isDiv || nodeName === 'span' || nodeName === 'img' ?
                        markup.join('')
                        : renderer.prepVML(markup);
                    wrapper.element = createElement(markup);
                }

                wrapper.renderer = renderer;
                wrapper.attrSetters = {};
            },

            /**
             * Add the node to the given parent
             * @param {Object} parent
             */
            add: function (parent) {
                var wrapper = this,
                    renderer = wrapper.renderer,
                    element = wrapper.element,
                    box = renderer.box,
                    inverted = parent && parent.inverted,

                    // get the parent node
                    parentNode = parent ?
                        parent.element || parent :
                        box;


                // if the parent group is inverted, apply inversion on all children
                if (inverted) { // only on groups
                    renderer.invertChild(element, parentNode);
                }

                // append it
                parentNode.appendChild(element);

                // align text after adding to be able to read offset
                wrapper.added = true;
                if (wrapper.alignOnAdd && !wrapper.deferUpdateTransform) {
                    wrapper.updateTransform();
                }

                // fire an event for internal hooks
                if (wrapper.onAdd) {
                    wrapper.onAdd();
                }

                return wrapper;
            },

            /**
             * VML always uses htmlUpdateTransform
             */
            updateTransform: SVGElement.prototype.htmlUpdateTransform,

            /**
             * Set the rotation of a span with oldIE's filter
             */
            setSpanRotation: function () {
                // Adjust for alignment and rotation. Rotation of useHTML content is not yet implemented
                // but it can probably be implemented for Firefox 3.5+ on user request. FF3.5+
                // has support for CSS3 transform. The getBBox method also needs to be updated
                // to compensate for the rotation, like it currently does for SVG.
                // Test case: http://jsfiddle.net/highcharts/Ybt44/

                var rotation = this.rotation,
                    costheta = mathCos(rotation * deg2rad),
                    sintheta = mathSin(rotation * deg2rad);

                css(this.element, {
                    filter: rotation ? ['progid:DXImageTransform.Microsoft.Matrix(M11=', costheta,
                        ', M12=', -sintheta, ', M21=', sintheta, ', M22=', costheta,
                        ', sizingMethod=\'auto expand\')'].join('') : NONE
                });
            },

            /**
             * Get the positioning correction for the span after rotating. 
             */
            getSpanCorrection: function (width, baseline, alignCorrection, rotation, align) {

                var costheta = rotation ? mathCos(rotation * deg2rad) : 1,
                    sintheta = rotation ? mathSin(rotation * deg2rad) : 0,
                    height = pick(this.elemHeight, this.element.offsetHeight),
                    quad,
                    nonLeft = align && align !== 'left';

                // correct x and y
                this.xCorr = costheta < 0 && -width;
                this.yCorr = sintheta < 0 && -height;

                // correct for baseline and corners spilling out after rotation
                quad = costheta * sintheta < 0;
                this.xCorr += sintheta * baseline * (quad ? 1 - alignCorrection : alignCorrection);
                this.yCorr -= costheta * baseline * (rotation ? (quad ? alignCorrection : 1 - alignCorrection) : 1);
                // correct for the length/height of the text
                if (nonLeft) {
                    this.xCorr -= width * alignCorrection * (costheta < 0 ? -1 : 1);
                    if (rotation) {
                        this.yCorr -= height * alignCorrection * (sintheta < 0 ? -1 : 1);
                    }
                    css(this.element, {
                        textAlign: align
                    });
                }
            },

            /**
             * Converts a subset of an SVG path definition to its VML counterpart. Takes an array
             * as the parameter and returns a string.
             */
            pathToVML: function (value) {
                // convert paths
                var i = value.length,
                    path = [];

                while (i--) {

                    // Multiply by 10 to allow subpixel precision.
                    // Substracting half a pixel seems to make the coordinates
                    // align with SVG, but this hasn't been tested thoroughly
                    if (isNumber(value[i])) {
                        path[i] = mathRound(value[i] * 10) - 5;
                    } else if (value[i] === 'Z') { // close the path
                        path[i] = 'x';
                    } else {
                        path[i] = value[i];

                        // When the start X and end X coordinates of an arc are too close,
                        // they are rounded to the same value above. In this case, substract or 
                        // add 1 from the end X and Y positions. #186, #760, #1371, #1410.
                        if (value.isArc && (value[i] === 'wa' || value[i] === 'at')) {
                            // Start and end X
                            if (path[i + 5] === path[i + 7]) {
                                path[i + 7] += value[i + 7] > value[i + 5] ? 1 : -1;
                            }
                            // Start and end Y
                            if (path[i + 6] === path[i + 8]) {
                                path[i + 8] += value[i + 8] > value[i + 6] ? 1 : -1;
                            }
                        }
                    }
                }


                // Loop up again to handle path shortcuts (#2132)
                /*while (i++ < path.length) {
                    if (path[i] === 'H') { // horizontal line to
                        path[i] = 'L';
                        path.splice(i + 2, 0, path[i - 1]);
                    } else if (path[i] === 'V') { // vertical line to
                        path[i] = 'L';
                        path.splice(i + 1, 0, path[i - 2]);
                    }
                }*/
                return path.join(' ') || 'x';
            },

            /**
             * Get or set attributes
             */
            attr: function (hash, val) {
                var wrapper = this,
                    key,
                    value,
                    i,
                    result,
                    element = wrapper.element || {},
                    elemStyle = element.style,
                    nodeName = element.nodeName,
                    renderer = wrapper.renderer,
                    symbolName = wrapper.symbolName,
                    hasSetSymbolSize,
                    shadows = wrapper.shadows,
                    skipAttr,
                    attrSetters = wrapper.attrSetters,
                    ret = wrapper;

                // single key-value pair
                if (isString(hash) && defined(val)) {
                    key = hash;
                    hash = {};
                    hash[key] = val;
                }

                // used as a getter, val is undefined
                if (isString(hash)) {
                    key = hash;
                    if (key === 'strokeWidth' || key === 'stroke-width') {
                        ret = wrapper.strokeweight;
                    } else {
                        ret = wrapper[key];
                    }

                    // setter
                } else {
                    for (key in hash) {
                        value = hash[key];
                        skipAttr = false;

                        // check for a specific attribute setter
                        result = attrSetters[key] && attrSetters[key].call(wrapper, value, key);

                        if (result !== false && value !== null) { // #620

                            if (result !== UNDEFINED) {
                                value = result; // the attribute setter has returned a new value to set
                            }


                            // prepare paths
                            // symbols
                            if (symbolName && /^(x|y|r|start|end|width|height|innerR|anchorX|anchorY)/.test(key)) {
                                // if one of the symbol size affecting parameters are changed,
                                // check all the others only once for each call to an element's
                                // .attr() method
                                if (!hasSetSymbolSize) {
                                    wrapper.symbolAttr(hash);

                                    hasSetSymbolSize = true;
                                }
                                skipAttr = true;

                            } else if (key === 'd') {
                                value = value || [];
                                wrapper.d = value.join(' '); // used in getter for animation

                                element.path = value = wrapper.pathToVML(value);

                                // update shadows
                                if (shadows) {
                                    i = shadows.length;
                                    while (i--) {
                                        shadows[i].path = shadows[i].cutOff ? this.cutOffPath(value, shadows[i].cutOff) : value;
                                    }
                                }
                                skipAttr = true;

                                // handle visibility
                            } else if (key === 'visibility') {

                                // Handle inherited visibility
                                if (value === 'inherit') {
                                    value = VISIBLE;
                                }

                                // Let the shadow follow the main element
                                if (shadows) {
                                    i = shadows.length;
                                    while (i--) {
                                        shadows[i].style[key] = value;
                                    }
                                }

                                // Instead of toggling the visibility CSS property, move the div out of the viewport.
                                // This works around #61 and #586
                                if (nodeName === 'DIV') {
                                    value = value === HIDDEN ? '-999em' : 0;

                                    // In order to redraw, IE7 needs the div to be visible when tucked away
                                    // outside the viewport. So the visibility is actually opposite of
                                    // the expected value. This applies to the tooltip only.
                                    if (!docMode8) {
                                        elemStyle[key] = value ? VISIBLE : HIDDEN;
                                    }
                                    key = 'top';
                                }
                                elemStyle[key] = value;
                                skipAttr = true;

                                // directly mapped to css
                            } else if (key === 'zIndex') {

                                if (value) {
                                    elemStyle[key] = value;
                                }
                                skipAttr = true;

                                // x, y, width, height
                            } else if (inArray(key, ['x', 'y', 'width', 'height']) !== -1) {

                                wrapper[key] = value; // used in getter

                                if (key === 'x' || key === 'y') {
                                    key = { x: 'left', y: 'top' }[key];
                                } else {
                                    value = mathMax(0, value); // don't set width or height below zero (#311)
                                }

                                // clipping rectangle special
                                if (wrapper.updateClipping) {
                                    wrapper[key] = value; // the key is now 'left' or 'top' for 'x' and 'y'
                                    wrapper.updateClipping();
                                } else {
                                    // normal
                                    elemStyle[key] = value;
                                }

                                skipAttr = true;

                                // class name
                            } else if (key === 'class' && nodeName === 'DIV') {
                                // IE8 Standards mode has problems retrieving the className
                                element.className = value;

                                // stroke
                            } else if (key === 'stroke') {

                                value = renderer.color(value, element, key);

                                key = 'strokecolor';

                                // stroke width
                            } else if (key === 'stroke-width' || key === 'strokeWidth') {
                                element.stroked = value ? true : false;
                                key = 'strokeweight';
                                wrapper[key] = value; // used in getter, issue #113
                                if (isNumber(value)) {
                                    value += PX;
                                }

                                // dashStyle
                            } else if (key === 'dashstyle') {
                                var strokeElem = element.getElementsByTagName('stroke')[0] ||
                                    createElement(renderer.prepVML(['<stroke/>']), null, null, element);
                                strokeElem[key] = value || 'solid';
                                wrapper.dashstyle = value; /* because changing stroke-width will change the dash length
							and cause an epileptic effect */
                                skipAttr = true;

                                // fill
                            } else if (key === 'fill') {

                                if (nodeName === 'SPAN') { // text color
                                    elemStyle.color = value;
                                } else if (nodeName !== 'IMG') { // #1336
                                    element.filled = value !== NONE ? true : false;

                                    value = renderer.color(value, element, key, wrapper);

                                    key = 'fillcolor';
                                }

                                // opacity: don't bother - animation is too slow and filters introduce artifacts
                            } else if (key === 'opacity') {
                                /*css(element, {
                                    opacity: value
                                });*/
                                skipAttr = true;

                                // rotation on VML elements
                            } else if (nodeName === 'shape' && key === 'rotation') {

                                wrapper[key] = element.style[key] = value; // style is for #1873

                                // Correction for the 1x1 size of the shape container. Used in gauge needles.
                                element.style.left = -mathRound(mathSin(value * deg2rad) + 1) + PX;
                                element.style.top = mathRound(mathCos(value * deg2rad)) + PX;

                                // translation for animation
                            } else if (key === 'translateX' || key === 'translateY' || key === 'rotation') {
                                wrapper[key] = value;
                                wrapper.updateTransform();

                                skipAttr = true;

                            }


                            if (!skipAttr) {
                                if (docMode8) { // IE8 setAttribute bug
                                    element[key] = value;
                                } else {
                                    attr(element, key, value);
                                }
                            }

                        }
                    }
                }
                return ret;
            },

            /**
             * Set the element's clipping to a predefined rectangle
             *
             * @param {String} id The id of the clip rectangle
             */
            clip: function (clipRect) {
                var wrapper = this,
                    clipMembers,
                    cssRet;

                if (clipRect) {
                    clipMembers = clipRect.members;
                    erase(clipMembers, wrapper); // Ensure unique list of elements (#1258)
                    clipMembers.push(wrapper);
                    wrapper.destroyClip = function () {
                        erase(clipMembers, wrapper);
                    };
                    cssRet = clipRect.getCSS(wrapper);

                } else {
                    if (wrapper.destroyClip) {
                        wrapper.destroyClip();
                    }
                    cssRet = { clip: docMode8 ? 'inherit' : 'rect(auto)' }; // #1214
                }

                return wrapper.css(cssRet);

            },

            /**
             * Set styles for the element
             * @param {Object} styles
             */
            css: SVGElement.prototype.htmlCss,

            /**
             * Removes a child either by removeChild or move to garbageBin.
             * Issue 490; in VML removeChild results in Orphaned nodes according to sIEve, discardElement does not.
             */
            safeRemoveChild: function (element) {
                // discardElement will detach the node from its parent before attaching it
                // to the garbage bin. Therefore it is important that the node is attached and have parent.
                if (element.parentNode) {
                    discardElement(element);
                }
            },

            /**
             * Extend element.destroy by removing it from the clip members array
             */
            destroy: function () {
                if (this.destroyClip) {
                    this.destroyClip();
                }

                return SVGElement.prototype.destroy.apply(this);
            },

            /**
             * Add an event listener. VML override for normalizing event parameters.
             * @param {String} eventType
             * @param {Function} handler
             */
            on: function (eventType, handler) {
                // simplest possible event model for internal use
                this.element['on' + eventType] = function () {
                    var evt = win.event;
                    evt.target = evt.srcElement;
                    handler(evt);
                };
                return this;
            },

            /**
             * In stacked columns, cut off the shadows so that they don't overlap
             */
            cutOffPath: function (path, length) {

                var len;

                path = path.split(/[ ,]/);
                len = path.length;

                if (len === 9 || len === 11) {
                    path[len - 4] = path[len - 2] = pInt(path[len - 2]) - 10 * length;
                }
                return path.join(' ');
            },

            /**
             * Apply a drop shadow by copying elements and giving them different strokes
             * @param {Boolean|Object} shadowOptions
             */
            shadow: function (shadowOptions, group, cutOff) {
                var shadows = [],
                    i,
                    element = this.element,
                    renderer = this.renderer,
                    shadow,
                    elemStyle = element.style,
                    markup,
                    path = element.path,
                    strokeWidth,
                    modifiedPath,
                    shadowWidth,
                    shadowElementOpacity;

                // some times empty paths are not strings
                if (path && typeof path.value !== 'string') {
                    path = 'x';
                }
                modifiedPath = path;

                if (shadowOptions) {
                    shadowWidth = pick(shadowOptions.width, 3);
                    shadowElementOpacity = (shadowOptions.opacity || 0.15) / shadowWidth;
                    for (i = 1; i <= 3; i++) {

                        strokeWidth = (shadowWidth * 2) + 1 - (2 * i);

                        // Cut off shadows for stacked column items
                        if (cutOff) {
                            modifiedPath = this.cutOffPath(path.value, strokeWidth + 0.5);
                        }

                        markup = ['<shape isShadow="true" strokeweight="', strokeWidth,
                            '" filled="false" path="', modifiedPath,
                            '" coordsize="10 10" style="', element.style.cssText, '" />'];

                        shadow = createElement(renderer.prepVML(markup),
                            null, {
                                left: pInt(elemStyle.left) + pick(shadowOptions.offsetX, 1),
                                top: pInt(elemStyle.top) + pick(shadowOptions.offsetY, 1)
                            }
                        );
                        if (cutOff) {
                            shadow.cutOff = strokeWidth + 1;
                        }

                        // apply the opacity
                        markup = ['<stroke color="', shadowOptions.color || 'black', '" opacity="', shadowElementOpacity * i, '"/>'];
                        createElement(renderer.prepVML(markup), null, null, shadow);


                        // insert it
                        if (group) {
                            group.element.appendChild(shadow);
                        } else {
                            element.parentNode.insertBefore(shadow, element);
                        }

                        // record it
                        shadows.push(shadow);

                    }

                    this.shadows = shadows;
                }
                return this;

            }
        };
        VMLElement = extendClass(SVGElement, VMLElement);

        /**
         * The VML renderer
         */
        var VMLRendererExtension = { // inherit SVGRenderer

            Element: VMLElement,
            isIE8: userAgent.indexOf('MSIE 8.0') > -1,


            /**
             * Initialize the VMLRenderer
             * @param {Object} container
             * @param {Number} width
             * @param {Number} height
             */
            init: function (container, width, height, style) {
                var renderer = this,
                    boxWrapper,
                    box,
                    css;

                renderer.alignedObjects = [];

                boxWrapper = renderer.createElement(DIV)
                    .css(extend(this.getStyle(style), { position: RELATIVE }));
                box = boxWrapper.element;
                container.appendChild(boxWrapper.element);


                // generate the containing box
                renderer.isVML = true;
                renderer.box = box;
                renderer.boxWrapper = boxWrapper;
                renderer.cache = {};


                renderer.setSize(width, height, false);

                // The only way to make IE6 and IE7 print is to use a global namespace. However,
                // with IE8 the only way to make the dynamic shapes visible in screen and print mode
                // seems to be to add the xmlns attribute and the behaviour style inline.
                if (!doc.namespaces.hcv) {

                    doc.namespaces.add('hcv', 'urn:schemas-microsoft-com:vml');

                    // Setup default CSS (#2153, #2368, #2384)
                    css = 'hcv\\:fill, hcv\\:path, hcv\\:shape, hcv\\:stroke' +
                        '{ behavior:url(#default#VML); display: inline-block; } ';
                    try {
                        doc.createStyleSheet().cssText = css;
                    } catch (e) {
                        doc.styleSheets[0].cssText += css;
                    }

                }
            },


            /**
             * Detect whether the renderer is hidden. This happens when one of the parent elements
             * has display: none
             */
            isHidden: function () {
                return !this.box.offsetWidth;
            },

            /**
             * Define a clipping rectangle. In VML it is accomplished by storing the values
             * for setting the CSS style to all associated members.
             *
             * @param {Number} x
             * @param {Number} y
             * @param {Number} width
             * @param {Number} height
             */
            clipRect: function (x, y, width, height) {

                // create a dummy element
                var clipRect = this.createElement(),
                    isObj = isObject(x);

                // mimic a rectangle with its style object for automatic updating in attr
                return extend(clipRect, {
                    members: [],
                    left: (isObj ? x.x : x) + 1,
                    top: (isObj ? x.y : y) + 1,
                    width: (isObj ? x.width : width) - 1,
                    height: (isObj ? x.height : height) - 1,
                    getCSS: function (wrapper) {
                        var element = wrapper.element,
                            nodeName = element.nodeName,
                            isShape = nodeName === 'shape',
                            inverted = wrapper.inverted,
                            rect = this,
                            top = rect.top - (isShape ? element.offsetTop : 0),
                            left = rect.left,
                            right = left + rect.width,
                            bottom = top + rect.height,
                            ret = {
                                clip: 'rect(' +
                                    mathRound(inverted ? left : top) + 'px,' +
                                    mathRound(inverted ? bottom : right) + 'px,' +
                                    mathRound(inverted ? right : bottom) + 'px,' +
                                    mathRound(inverted ? top : left) + 'px)'
                            };

                        // issue 74 workaround
                        if (!inverted && docMode8 && nodeName === 'DIV') {
                            extend(ret, {
                                width: right + PX,
                                height: bottom + PX
                            });
                        }
                        return ret;
                    },

                    // used in attr and animation to update the clipping of all members
                    updateClipping: function () {
                        each(clipRect.members, function (member) {
                            member.css(clipRect.getCSS(member));
                        });
                    }
                });

            },


            /**
             * Take a color and return it if it's a string, make it a gradient if it's a
             * gradient configuration object, and apply opacity.
             *
             * @param {Object} color The color or config object
             */
            color: function (color, elem, prop, wrapper) {
                var renderer = this,
                    colorObject,
                    regexRgba = /^rgba/,
                    markup,
                    fillType,
                    ret = NONE;

                // Check for linear or radial gradient
                if (color && color.linearGradient) {
                    fillType = 'gradient';
                } else if (color && color.radialGradient) {
                    fillType = 'pattern';
                }


                if (fillType) {

                    var stopColor,
                        stopOpacity,
                        gradient = color.linearGradient || color.radialGradient,
                        x1,
                        y1,
                        x2,
                        y2,
                        opacity1,
                        opacity2,
                        color1,
                        color2,
                        fillAttr = '',
                        stops = color.stops,
                        firstStop,
                        lastStop,
                        colors = [],
                        addFillNode = function () {
                            // Add the fill subnode. When colors attribute is used, the meanings of opacity and o:opacity2
                            // are reversed.
                            markup = ['<fill colors="' + colors.join(',') + '" opacity="', opacity2, '" o:opacity2="', opacity1,
                                '" type="', fillType, '" ', fillAttr, 'focus="100%" method="any" />'];
                            createElement(renderer.prepVML(markup), null, null, elem);
                        };

                    // Extend from 0 to 1
                    firstStop = stops[0];
                    lastStop = stops[stops.length - 1];
                    if (firstStop[0] > 0) {
                        stops.unshift([
                            0,
                            firstStop[1]
                        ]);
                    }
                    if (lastStop[0] < 1) {
                        stops.push([
                            1,
                            lastStop[1]
                        ]);
                    }

                    // Compute the stops
                    each(stops, function (stop, i) {
                        if (regexRgba.test(stop[1])) {
                            colorObject = Color(stop[1]);
                            stopColor = colorObject.get('rgb');
                            stopOpacity = colorObject.get('a');
                        } else {
                            stopColor = stop[1];
                            stopOpacity = 1;
                        }

                        // Build the color attribute
                        colors.push((stop[0] * 100) + '% ' + stopColor);

                        // Only start and end opacities are allowed, so we use the first and the last
                        if (!i) {
                            opacity1 = stopOpacity;
                            color2 = stopColor;
                        } else {
                            opacity2 = stopOpacity;
                            color1 = stopColor;
                        }
                    });

                    // Apply the gradient to fills only.
                    if (prop === 'fill') {

                        // Handle linear gradient angle
                        if (fillType === 'gradient') {
                            x1 = gradient.x1 || gradient[0] || 0;
                            y1 = gradient.y1 || gradient[1] || 0;
                            x2 = gradient.x2 || gradient[2] || 0;
                            y2 = gradient.y2 || gradient[3] || 0;
                            fillAttr = 'angle="' + (90 - math.atan(
                                (y2 - y1) / // y vector
                                (x2 - x1) // x vector
                                ) * 180 / mathPI) + '"';

                            addFillNode();

                            // Radial (circular) gradient
                        } else {

                            var r = gradient.r,
                                sizex = r * 2,
                                sizey = r * 2,
                                cx = gradient.cx,
                                cy = gradient.cy,
                                radialReference = elem.radialReference,
                                bBox,
                                applyRadialGradient = function () {
                                    if (radialReference) {
                                        bBox = wrapper.getBBox();
                                        cx += (radialReference[0] - bBox.x) / bBox.width - 0.5;
                                        cy += (radialReference[1] - bBox.y) / bBox.height - 0.5;
                                        sizex *= radialReference[2] / bBox.width;
                                        sizey *= radialReference[2] / bBox.height;
                                    }
                                    fillAttr = 'src="' + defaultOptions.global.VMLRadialGradientURL + '" ' +
                                        'size="' + sizex + ',' + sizey + '" ' +
                                        'origin="0.5,0.5" ' +
                                        'position="' + cx + ',' + cy + '" ' +
                                        'color2="' + color2 + '" ';

                                    addFillNode();
                                };

                            // Apply radial gradient
                            if (wrapper.added) {
                                applyRadialGradient();
                            } else {
                                // We need to know the bounding box to get the size and position right
                                wrapper.onAdd = applyRadialGradient;
                            }

                            // The fill element's color attribute is broken in IE8 standards mode, so we
                            // need to set the parent shape's fillcolor attribute instead.
                            ret = color1;
                        }

                        // Gradients are not supported for VML stroke, return the first color. #722.
                    } else {
                        ret = stopColor;
                    }

                    // if the color is an rgba color, split it and add a fill node
                    // to hold the opacity component
                } else if (regexRgba.test(color) && elem.tagName !== 'IMG') {

                    colorObject = Color(color);

                    markup = ['<', prop, ' opacity="', colorObject.get('a'), '"/>'];
                    createElement(this.prepVML(markup), null, null, elem);

                    ret = colorObject.get('rgb');


                } else {
                    var propNodes = elem.getElementsByTagName(prop); // 'stroke' or 'fill' node
                    if (propNodes.length) {
                        propNodes[0].opacity = 1;
                        propNodes[0].type = 'solid';
                    }
                    ret = color;
                }

                return ret;
            },

            /**
             * Take a VML string and prepare it for either IE8 or IE6/IE7.
             * @param {Array} markup A string array of the VML markup to prepare
             */
            prepVML: function (markup) {
                var vmlStyle = 'display:inline-block;behavior:url(#default#VML);',
                    isIE8 = this.isIE8;

                markup = markup.join('');

                if (isIE8) { // add xmlns and style inline
                    markup = markup.replace('/>', ' xmlns="urn:schemas-microsoft-com:vml" />');
                    if (markup.indexOf('style="') === -1) {
                        markup = markup.replace('/>', ' style="' + vmlStyle + '" />');
                    } else {
                        markup = markup.replace('style="', 'style="' + vmlStyle);
                    }

                } else { // add namespace
                    markup = markup.replace('<', '<hcv:');
                }

                return markup;
            },

            /**
             * Create rotated and aligned text
             * @param {String} str
             * @param {Number} x
             * @param {Number} y
             */
            text: SVGRenderer.prototype.html,

            /**
             * Create and return a path element
             * @param {Array} path
             */
            path: function (path) {
                var attr = {
                    // subpixel precision down to 0.1 (width and height = 1px)
                    coordsize: '10 10'
                };
                if (isArray(path)) {
                    attr.d = path;
                } else if (isObject(path)) { // attributes
                    extend(attr, path);
                }
                // create the shape
                return this.createElement('shape').attr(attr);
            },

            /**
             * Create and return a circle element. In VML circles are implemented as
             * shapes, which is faster than v:oval
             * @param {Number} x
             * @param {Number} y
             * @param {Number} r
             */
            circle: function (x, y, r) {
                var circle = this.symbol('circle');
                if (isObject(x)) {
                    r = x.r;
                    y = x.y;
                    x = x.x;
                }
                circle.isCircle = true; // Causes x and y to mean center (#1682)
                circle.r = r;
                return circle.attr({ x: x, y: y });
            },

            /**
             * Create a group using an outer div and an inner v:group to allow rotating
             * and flipping. A simple v:group would have problems with positioning
             * child HTML elements and CSS clip.
             *
             * @param {String} name The name of the group
             */
            g: function (name) {
                var wrapper,
                    attribs;

                // set the class name
                if (name) {
                    attribs = { 'className': PREFIX + name, 'class': PREFIX + name };
                }

                // the div to hold HTML and clipping
                wrapper = this.createElement(DIV).attr(attribs);

                return wrapper;
            },

            /**
             * VML override to create a regular HTML image
             * @param {String} src
             * @param {Number} x
             * @param {Number} y
             * @param {Number} width
             * @param {Number} height
             */
            image: function (src, x, y, width, height) {
                var obj = this.createElement('img')
                    .attr({ src: src });

                if (arguments.length > 1) {
                    obj.attr({
                        x: x,
                        y: y,
                        width: width,
                        height: height
                    });
                }
                return obj;
            },

            /**
             * For rectangles, VML uses a shape for rect to overcome bugs and rotation problems
             */
            createElement: function (nodeName) {
                return nodeName === 'rect' ? this.symbol(nodeName) : SVGRenderer.prototype.createElement.call(this, nodeName);
            },

            /**
             * In the VML renderer, each child of an inverted div (group) is inverted
             * @param {Object} element
             * @param {Object} parentNode
             */
            invertChild: function (element, parentNode) {
                var ren = this,
                    parentStyle = parentNode.style,
                    imgStyle = element.tagName === 'IMG' && element.style; // #1111

                css(element, {
                    flip: 'x',
                    left: pInt(parentStyle.width) - (imgStyle ? pInt(imgStyle.top) : 1),
                    top: pInt(parentStyle.height) - (imgStyle ? pInt(imgStyle.left) : 1),
                    rotation: -90
                });

                // Recursively invert child elements, needed for nested composite shapes like box plots and error bars. #1680, #1806.
                each(element.childNodes, function (child) {
                    ren.invertChild(child, element);
                });
            },

            /**
             * Symbol definitions that override the parent SVG renderer's symbols
             *
             */
            symbols: {
                // VML specific arc function
                arc: function (x, y, w, h, options) {
                    var start = options.start,
                        end = options.end,
                        radius = options.r || w || h,
                        innerRadius = options.innerR,
                        cosStart = mathCos(start),
                        sinStart = mathSin(start),
                        cosEnd = mathCos(end),
                        sinEnd = mathSin(end),
                        ret;

                    if (end - start === 0) { // no angle, don't show it.
                        return ['x'];
                    }

                    ret = [
                        'wa', // clockwise arc to
                        x - radius, // left
                        y - radius, // top
                        x + radius, // right
                        y + radius, // bottom
                        x + radius * cosStart, // start x
                        y + radius * sinStart, // start y
                        x + radius * cosEnd, // end x
                        y + radius * sinEnd  // end y
                    ];

                    if (options.open && !innerRadius) {
                        ret.push(
                            'e',
                            M,
                            x,// - innerRadius,
                            y// - innerRadius
                        );
                    }

                    ret.push(
                        'at', // anti clockwise arc to
                        x - innerRadius, // left
                        y - innerRadius, // top
                        x + innerRadius, // right
                        y + innerRadius, // bottom
                        x + innerRadius * cosEnd, // start x
                        y + innerRadius * sinEnd, // start y
                        x + innerRadius * cosStart, // end x
                        y + innerRadius * sinStart, // end y
                        'x', // finish path
                        'e' // close
                    );

                    ret.isArc = true;
                    return ret;

                },
                // Add circle symbol path. This performs significantly faster than v:oval.
                circle: function (x, y, w, h, wrapper) {

                    if (wrapper) {
                        w = h = 2 * wrapper.r;
                    }

                    // Center correction, #1682
                    if (wrapper && wrapper.isCircle) {
                        x -= w / 2;
                        y -= h / 2;
                    }

                    // Return the path
                    return [
                        'wa', // clockwisearcto
                        x, // left
                        y, // top
                        x + w, // right
                        y + h, // bottom
                        x + w, // start x
                        y + h / 2,     // start y
                        x + w, // end x
                        y + h / 2,     // end y
                        //'x', // finish path
                        'e' // close
                    ];
                },
                /**
                 * Add rectangle symbol path which eases rotation and omits arcsize problems
                 * compared to the built-in VML roundrect shape
                 *
                 * @param {Number} left Left position
                 * @param {Number} top Top position
                 * @param {Number} r Border radius
                 * @param {Object} options Width and height
                 */

                rect: function (left, top, width, height, options) {

                    var right = left + width,
                        bottom = top + height,
                        ret,
                        r;

                    // No radius, return the more lightweight square
                    if (!defined(options) || !options.r) {
                        ret = SVGRenderer.prototype.symbols.square.apply(0, arguments);

                        // Has radius add arcs for the corners
                    } else {

                        r = mathMin(options.r, width, height);
                        ret = [
                            M,
                            left + r, top,

                            L,
                            right - r, top,
                            'wa',
                            right - 2 * r, top,
                            right, top + 2 * r,
                            right - r, top,
                            right, top + r,

                            L,
                            right, bottom - r,
                            'wa',
                            right - 2 * r, bottom - 2 * r,
                            right, bottom,
                            right, bottom - r,
                            right - r, bottom,

                            L,
                            left + r, bottom,
                            'wa',
                            left, bottom - 2 * r,
                            left + 2 * r, bottom,
                            left + r, bottom,
                            left, bottom - r,

                            L,
                            left, top + r,
                            'wa',
                            left, top,
                            left + 2 * r, top + 2 * r,
                            left, top + r,
                            left + r, top,


                            'x',
                            'e'
                        ];
                    }
                    return ret;
                }
            }
        };
        Highcharts.VMLRenderer = VMLRenderer = function () {
            this.init.apply(this, arguments);
        };
        VMLRenderer.prototype = merge(SVGRenderer.prototype, VMLRendererExtension);

        // general renderer
        Renderer = VMLRenderer;
    }

    // This method is used with exporting in old IE, when emulating SVG (see #2314)
    SVGRenderer.prototype.measureSpanWidth = function (text, styles) {
        var measuringSpan = doc.createElement('span'),
            offsetWidth,
        textNode = doc.createTextNode(text);

        measuringSpan.appendChild(textNode);
        css(measuringSpan, styles);
        this.box.appendChild(measuringSpan);
        offsetWidth = measuringSpan.offsetWidth;
        discardElement(measuringSpan); // #2463
        return offsetWidth;
    };


    /* ****************************************************************************
     *                                                                            *
     * END OF INTERNET EXPLORER <= 8 SPECIFIC CODE                                *
     *                                                                            *
     *****************************************************************************/
    /* ****************************************************************************
     *                                                                            *
     * START OF ANDROID < 3 SPECIFIC CODE. THIS CAN BE REMOVED IF YOU'RE NOT      *
     * TARGETING THAT SYSTEM.                                                     *
     *                                                                            *
     *****************************************************************************/
    var CanVGRenderer,
        CanVGController;

    if (useCanVG) {
        /**
         * The CanVGRenderer is empty from start to keep the source footprint small.
         * When requested, the CanVGController downloads the rest of the source packaged
         * together with the canvg library.
         */
        Highcharts.CanVGRenderer = CanVGRenderer = function () {
            // Override the global SVG namespace to fake SVG/HTML that accepts CSS
            SVG_NS = 'http://www.w3.org/1999/xhtml';
        };

        /**
         * Start with an empty symbols object. This is needed when exporting is used (exporting.src.js will add a few symbols), but 
         * the implementation from SvgRenderer will not be merged in until first render.
         */
        CanVGRenderer.prototype.symbols = {};

        /**
         * Handles on demand download of canvg rendering support.
         */
        CanVGController = (function () {
            // List of renderering calls
            var deferredRenderCalls = [];

            /**
             * When downloaded, we are ready to draw deferred charts.
             */
            function drawDeferred() {
                var callLength = deferredRenderCalls.length,
                    callIndex;

                // Draw all pending render calls
                for (callIndex = 0; callIndex < callLength; callIndex++) {
                    deferredRenderCalls[callIndex]();
                }
                // Clear the list
                deferredRenderCalls = [];
            }

            return {
                push: function (func, scriptLocation) {
                    // Only get the script once
                    if (deferredRenderCalls.length === 0) {
                        getScript(scriptLocation, drawDeferred);
                    }
                    // Register render call
                    deferredRenderCalls.push(func);
                }
            };
        }());

        Renderer = CanVGRenderer;
    } // end CanVGRenderer

    /* ****************************************************************************
     *                                                                            *
     * END OF ANDROID < 3 SPECIFIC CODE                                           *
     *                                                                            *
     *****************************************************************************/

    /**
     * The Tick class
     */
    function Tick(axis, pos, type, noLabel) {
        this.axis = axis;
        this.pos = pos;
        this.type = type || '';
        this.isNew = true;

        if (!type && !noLabel) {
            this.addLabel();
        }
    }

    Tick.prototype = {
        /**
         * Write the tick label
         */
        addLabel: function () {
            var tick = this,
                axis = tick.axis,
                options = axis.options,
                chart = axis.chart,
                horiz = axis.horiz,
                categories = axis.categories,
                names = axis.names,
                pos = tick.pos,
                labelOptions = options.labels,
                str,
                tickPositions = axis.tickPositions,
                width = (horiz && categories &&
                    !labelOptions.step && !labelOptions.staggerLines &&
                    !labelOptions.rotation &&
                    chart.plotWidth / tickPositions.length) ||
                    (!horiz && (chart.margin[3] || chart.chartWidth * 0.33)), // #1580, #1931
                isFirst = pos === tickPositions[0],
                isLast = pos === tickPositions[tickPositions.length - 1],
                css,
                attr,
                value = categories ?
                    pick(categories[pos], names[pos], pos) :
                    pos,
                label = tick.label,
                tickPositionInfo = tickPositions.info,
                dateTimeLabelFormat;

            // Set the datetime label format. If a higher rank is set for this position, use that. If not,
            // use the general format.
            if (axis.isDatetimeAxis && tickPositionInfo) {
                dateTimeLabelFormat = options.dateTimeLabelFormats[tickPositionInfo.higherRanks[pos] || tickPositionInfo.unitName];
            }
            // set properties for access in render method
            tick.isFirst = isFirst;
            tick.isLast = isLast;

            // get the string
            str = axis.labelFormatter.call({
                axis: axis,
                chart: chart,
                isFirst: isFirst,
                isLast: isLast,
                dateTimeLabelFormat: dateTimeLabelFormat,
                value: axis.isLog ? correctFloat(lin2log(value)) : value
            });

            //LOGIFIX
            // 21378 Max Label Length for line / pie series
            if (axis.options.labels.maxLabelLength) {
                str = trimLabelToLength(str, axis.options.labels.maxLabelLength);
            }

            //LOGIFIX
            // 21549 Bubble series display some numbers in the X-axis
            if (axis.categories && (pos < 0 || pos === names.length))
                str = "";

            // prepare CSS
            css = width && { width: mathMax(1, mathRound(width - 2 * (labelOptions.padding || 10))) + PX };
            css = extend(css, labelOptions.style);

            // first call
            if (!defined(label)) {
                attr = {
                    align: axis.labelAlign
                };
                if (isNumber(labelOptions.rotation)) {
                    attr.rotation = labelOptions.rotation;
                }
                if (width && labelOptions.ellipsis) {
                    attr._clipHeight = axis.len / tickPositions.length;
                }

                tick.label =
                    defined(str) && labelOptions.enabled ?
                        chart.renderer.text(
                                str,
                                0,
                                0,
                                labelOptions.useHTML
                            )
                            .attr(attr)
                            // without position absolute, IE export sometimes is wrong
                            .css(css)
                            .add(axis.labelGroup) :
                        null;

                // update
            } else if (label) {
                label.attr({
                    text: str
                })
                    .css(css);
            }
        },

        /**
         * Get the offset height or width of the label
         */
        getLabelSize: function () {
            var label = this.label,
                axis = this.axis;
            return label ?
                label.getBBox()[axis.horiz ? 'height' : 'width'] :
                0;
        },

        /**
         * Find how far the labels extend to the right and left of the tick's x position. Used for anti-collision
         * detection with overflow logic.
         */
        getLabelSides: function () {
            var bBox = this.label.getBBox(),
                axis = this.axis,
                horiz = axis.horiz,
                options = axis.options,
                labelOptions = options.labels,
                size = horiz ? bBox.width : bBox.height,
                leftSide = horiz ?
                    labelOptions.x - size * { left: 0, center: 0.5, right: 1 }[axis.labelAlign] :
                    0,
                rightSide = horiz ?
                    size + leftSide :
                    size;

            return [leftSide, rightSide];
        },

        /**
         * Handle the label overflow by adjusting the labels to the left and right edge, or
         * hide them if they collide into the neighbour label.
         */
        handleOverflow: function (index, xy) {
            var show = true,
                axis = this.axis,
                isFirst = this.isFirst,
                isLast = this.isLast,
                horiz = axis.horiz,
                pxPos = horiz ? xy.x : xy.y,
                reversed = axis.reversed,
                tickPositions = axis.tickPositions,
                sides = this.getLabelSides(),
                leftSide = sides[0],
                rightSide = sides[1],
                axisLeft,
                axisRight,
                neighbour,
                neighbourEdge,
                line = this.label.line || 0,
                labelEdge = axis.labelEdge,
                justifyLabel = axis.justifyLabels && (isFirst || isLast),
                justifyToPlot;

            // Hide it if it now overlaps the neighbour label
            if (labelEdge[line] === UNDEFINED || pxPos + leftSide > labelEdge[line]) {
                labelEdge[line] = pxPos + rightSide;

            } else if (!justifyLabel) {
                show = false;
            }

            if (justifyLabel) {
                justifyToPlot = axis.justifyToPlot;
                axisLeft = justifyToPlot ? axis.pos : 0;
                axisRight = justifyToPlot ? axisLeft + axis.len : axis.chart.chartWidth;

                // Find the firsth neighbour on the same line
                do {
                    index += (isFirst ? 1 : -1);
                    neighbour = axis.ticks[tickPositions[index]];
                } while (tickPositions[index] && (!neighbour || neighbour.label.line !== line));

                neighbourEdge = neighbour && neighbour.label.xy && neighbour.label.xy.x + neighbour.getLabelSides()[isFirst ? 0 : 1];

                if ((isFirst && !reversed) || (isLast && reversed)) {
                    // Is the label spilling out to the left of the plot area?
                    if (pxPos + leftSide < axisLeft) {

                        // Align it to plot left
                        pxPos = axisLeft - leftSide;

                        // Hide it if it now overlaps the neighbour label
                        if (neighbour && pxPos + rightSide > neighbourEdge) {
                            show = false;
                        }
                    }

                } else {
                    // Is the label spilling out to the right of the plot area?
                    if (pxPos + rightSide > axisRight) {

                        // Align it to plot right
                        pxPos = axisRight - rightSide;

                        // Hide it if it now overlaps the neighbour label
                        if (neighbour && pxPos + leftSide < neighbourEdge) {
                            show = false;
                        }

                    }
                }

                // Set the modified x position of the label
                xy.x = pxPos;
            }
            return show;
        },

        /**
         * Get the x and y position for ticks and labels
         */
        getPosition: function (horiz, pos, tickmarkOffset, old) {
            var axis = this.axis,
                chart = axis.chart,
                cHeight = (old && chart.oldChartHeight) || chart.chartHeight;

            return {
                x: horiz ?
                    axis.translate(pos + tickmarkOffset, null, null, old) + axis.transB :
                    axis.left + axis.offset + (axis.opposite ? ((old && chart.oldChartWidth) || chart.chartWidth) - axis.right - axis.left : 0),

                y: horiz ?
                    cHeight - axis.bottom + axis.offset - (axis.opposite ? axis.height : 0) :
                    cHeight - axis.translate(pos + tickmarkOffset, null, null, old) - axis.transB
            };

        },

        /**
         * Get the x, y position of the tick label
         */
        getLabelPosition: function (x, y, label, horiz, labelOptions, tickmarkOffset, index, step) {
            var axis = this.axis,
                transA = axis.transA,
                reversed = axis.reversed,
                staggerLines = axis.staggerLines,
                baseline = axis.chart.renderer.fontMetrics(labelOptions.style.fontSize).b,
                rotation = labelOptions.rotation;

            x = x + labelOptions.x - (tickmarkOffset && horiz ?
                tickmarkOffset * transA * (reversed ? -1 : 1) : 0);
            y = y + labelOptions.y - (tickmarkOffset && !horiz ?
                tickmarkOffset * transA * (reversed ? 1 : -1) : 0);

            // Correct for rotation (#1764)
            if (rotation && axis.side === 2) {
                y -= baseline - baseline * mathCos(rotation * deg2rad);
            }

            // Vertically centered
            if (!defined(labelOptions.y) && !rotation) { // #1951
                y += baseline - label.getBBox().height / 2;
            }

            // Correct for staggered labels
            if (staggerLines) {
                label.line = (index / (step || 1) % staggerLines);
                y += label.line * (axis.labelOffset / staggerLines);
            }

            return {
                x: x,
                y: y
            };
        },

        /**
         * Extendible method to return the path of the marker
         */
        getMarkPath: function (x, y, tickLength, tickWidth, horiz, renderer) {
            return renderer.crispLine([
                    M,
                    x,
                    y,
                    L,
                    x + (horiz ? 0 : -tickLength),
                    y + (horiz ? tickLength : 0)
            ], tickWidth);
        },

        /**
         * Put everything in place
         *
         * @param index {Number}
         * @param old {Boolean} Use old coordinates to prepare an animation into new position
         */
        render: function (index, old, opacity) {
            var tick = this,
                axis = tick.axis,
                options = axis.options,
                chart = axis.chart,
                renderer = chart.renderer,
                horiz = axis.horiz,
                type = tick.type,
                label = tick.label,
                pos = tick.pos,
                labelOptions = options.labels,
                gridLine = tick.gridLine,
                gridPrefix = type ? type + 'Grid' : 'grid',
                tickPrefix = type ? type + 'Tick' : 'tick',
                gridLineWidth = options[gridPrefix + 'LineWidth'],
                gridLineColor = options[gridPrefix + 'LineColor'],
                dashStyle = options[gridPrefix + 'LineDashStyle'],
                tickLength = options[tickPrefix + 'Length'],
                tickWidth = options[tickPrefix + 'Width'] || 0,
                tickColor = options[tickPrefix + 'Color'],
                tickPosition = options[tickPrefix + 'Position'],
                gridLinePath,
                mark = tick.mark,
                markPath,
                step = labelOptions.step,
                attribs,
                show = true,
                tickmarkOffset = axis.tickmarkOffset,
                xy = tick.getPosition(horiz, pos, tickmarkOffset, old),
                x = xy.x,
                y = xy.y,
                reverseCrisp = ((horiz && x === axis.pos + axis.len) || (!horiz && y === axis.pos)) ? -1 : 1; // #1480, #1687

            this.isActive = true;

            // create the grid line
            if (gridLineWidth) {
                gridLinePath = axis.getPlotLinePath(pos + tickmarkOffset, gridLineWidth * reverseCrisp, old, true);

                if (gridLine === UNDEFINED) {
                    attribs = {
                        stroke: gridLineColor,
                        'stroke-width': gridLineWidth
                    };
                    if (dashStyle) {
                        attribs.dashstyle = dashStyle;
                    }
                    if (!type) {
                        attribs.zIndex = 1;
                    }
                    if (old) {
                        attribs.opacity = 0;
                    }
                    tick.gridLine = gridLine =
                        gridLineWidth ?
                            renderer.path(gridLinePath)
                                .attr(attribs).add(axis.gridGroup) :
                            null;
                }

                // If the parameter 'old' is set, the current call will be followed
                // by another call, therefore do not do any animations this time
                if (!old && gridLine && gridLinePath) {
                    gridLine[tick.isNew ? 'attr' : 'animate']({
                        d: gridLinePath,
                        opacity: opacity
                    });
                }
            }

            // create the tick mark
            if (tickWidth && tickLength) {

                // negate the length
                if (tickPosition === 'inside') {
                    tickLength = -tickLength;
                }
                if (axis.opposite) {
                    tickLength = -tickLength;
                }

                markPath = tick.getMarkPath(x, y, tickLength, tickWidth * reverseCrisp, horiz, renderer);
                if (mark) { // updating
                    mark.animate({
                        d: markPath,
                        opacity: opacity
                    });
                } else { // first time
                    tick.mark = renderer.path(
                        markPath
                    ).attr({
                        stroke: tickColor,
                        'stroke-width': tickWidth,
                        opacity: opacity
                    }).add(axis.axisGroup);
                }
            }

            // the label is created on init - now move it into place
            if (label && !isNaN(x)) {
                label.xy = xy = tick.getLabelPosition(x, y, label, horiz, labelOptions, tickmarkOffset, index, step);

                // Apply show first and show last. If the tick is both first and last, it is
                // a single centered tick, in which case we show the label anyway (#2100).
                if ((tick.isFirst && !tick.isLast && !pick(options.showFirstLabel, 1)) ||
                        (tick.isLast && !tick.isFirst && !pick(options.showLastLabel, 1))) {
                    show = false;

                    // Handle label overflow and show or hide accordingly
                } else if (!axis.isRadial && !labelOptions.step && !labelOptions.rotation && !old && opacity !== 0) {
                    show = tick.handleOverflow(index, xy);
                }

                // apply step
                if (step && index % step) {
                    // show those indices dividable by step
                    show = false;
                }

                // Set the new position, and show or hide
                if (show && !isNaN(xy.y)) {
                    xy.opacity = opacity;
                    label[tick.isNew ? 'attr' : 'animate'](xy);
                    tick.isNew = false;
                } else {
                    label.attr('y', -9999); // #1338
                }
            }
        },

        /**
         * Destructor for the tick prototype
         */
        destroy: function () {
            destroyObjectProperties(this, this.axis);
        }
    };

    /**
     * The object wrapper for plot lines and plot bands
     * @param {Object} options
     */
    Highcharts.PlotLineOrBand = function (axis, options) {
        this.axis = axis;

        if (options) {
            this.options = options;
            this.id = options.id;
        }
    };

    Highcharts.PlotLineOrBand.prototype = {

        /**
         * Render the plot line or plot band. If it is already existing,
         * move it.
         */
        render: function () {
            var plotLine = this,
                axis = plotLine.axis,
                horiz = axis.horiz,
                halfPointRange = (axis.pointRange || 0) / 2,
                options = plotLine.options,
                optionsLabel = options.label,
                label = plotLine.label,
                width = options.width,
                to = options.to,
                from = options.from,
                isBand = defined(from) && defined(to),
                value = options.value,
                dashStyle = options.dashStyle,
                svgElem = plotLine.svgElem,
                path = [],
                addEvent,
                eventType,
                xs,
                ys,
                x,
                y,
                color = options.color,
                zIndex = options.zIndex,
                events = options.events,
                attribs,
                renderer = axis.chart.renderer;

            // logarithmic conversion
            if (axis.isLog) {
                from = log2lin(from);
                to = log2lin(to);
                value = log2lin(value);
            }

            // plot line
            if (width) {
                path = axis.getPlotLinePath(value, width);
                attribs = {
                    stroke: color,
                    'stroke-width': width
                };
                if (dashStyle) {
                    attribs.dashstyle = dashStyle;
                }
            } else if (isBand) { // plot band

                // keep within plot area
                from = mathMax(from, axis.min - halfPointRange);
                to = mathMin(to, axis.max + halfPointRange);

                path = axis.getPlotBandPath(from, to, options);
                attribs = {
                    fill: color
                };
                if (options.borderWidth) {
                    attribs.stroke = options.borderColor;
                    attribs['stroke-width'] = options.borderWidth;
                }
            } else {
                return;
            }
            // zIndex
            if (defined(zIndex)) {
                attribs.zIndex = zIndex;
            }

            // common for lines and bands
            if (svgElem) {
                if (path) {
                    svgElem.animate({
                        d: path
                    }, null, svgElem.onGetPath);
                } else {
                    svgElem.hide();
                    svgElem.onGetPath = function () {
                        svgElem.show();
                    };
                    if (label) {
                        plotLine.label = label = label.destroy();
                    }
                }
            } else if (path && path.length) {
                plotLine.svgElem = svgElem = renderer.path(path)
                    .attr(attribs).add();

                // events
                if (events) {
                    addEvent = function (eventType) {
                        svgElem.on(eventType, function (e) {
                            events[eventType].apply(plotLine, [e]);
                        });
                    };
                    for (eventType in events) {
                        addEvent(eventType);
                    }
                }
            }

            // the plot band/line label
            if (optionsLabel && defined(optionsLabel.text) && path && path.length && axis.width > 0 && axis.height > 0) {
                // apply defaults
                optionsLabel = merge({
                    align: horiz && isBand && 'center',
                    x: horiz ? !isBand && 4 : 10,
                    verticalAlign: !horiz && isBand && 'middle',
                    y: horiz ? isBand ? 16 : 10 : isBand ? 6 : -4,
                    rotation: horiz && !isBand && 90
                }, optionsLabel);

                // add the SVG element
                if (!label) {
                    plotLine.label = label = renderer.text(
                            optionsLabel.text,
                            0,
                            0,
                            optionsLabel.useHTML
                        )
                        .attr({
                            align: optionsLabel.textAlign || optionsLabel.align,
                            rotation: optionsLabel.rotation,
                            zIndex: zIndex
                        })
                        .css(optionsLabel.style)
                        .add();
                }

                // get the bounding box and align the label
                xs = [path[1], path[4], pick(path[6], path[1])];
                ys = [path[2], path[5], pick(path[7], path[2])];
                x = arrayMin(xs);
                y = arrayMin(ys);

                label.align(optionsLabel, false, {
                    x: x,
                    y: y,
                    width: arrayMax(xs) - x,
                    height: arrayMax(ys) - y
                });
                label.show();

            } else if (label) { // move out of sight
                label.hide();
            }

            // chainable
            return plotLine;
        },

        /**
         * Remove the plot line or band
         */
        destroy: function () {
            // remove it from the lookup
            erase(this.axis.plotLinesAndBands, this);

            delete this.axis;
            destroyObjectProperties(this);
        }
    };

    /**
     * Object with members for extending the Axis prototype
     */

    AxisPlotLineOrBandExtension = {

        /**
         * Create the path for a plot band
         */
        getPlotBandPath: function (from, to) {
            var toPath = this.getPlotLinePath(to),
                path = this.getPlotLinePath(from);

            if (path && toPath) {
                path.push(
                    toPath[4],
                    toPath[5],
                    toPath[1],
                    toPath[2]
                );
            } else { // outside the axis area
                path = null;
            }

            return path;
        },

        addPlotBand: function (options) {
            this.addPlotBandOrLine(options, 'plotBands');
        },

        addPlotLine: function (options) {
            this.addPlotBandOrLine(options, 'plotLines');
        },

        /**
         * Add a plot band or plot line after render time
         *
         * @param options {Object} The plotBand or plotLine configuration object
         */
        addPlotBandOrLine: function (options, coll) {
            var obj = new Highcharts.PlotLineOrBand(this, options).render(),
                userOptions = this.userOptions;

            if (obj) { // #2189
                // Add it to the user options for exporting and Axis.update
                if (coll) {
                    userOptions[coll] = userOptions[coll] || [];
                    userOptions[coll].push(options);
                }
                this.plotLinesAndBands.push(obj);
            }

            return obj;
        },

        /**
         * Remove a plot band or plot line from the chart by id
         * @param {Object} id
         */
        removePlotBandOrLine: function (id) {
            var plotLinesAndBands = this.plotLinesAndBands,
                options = this.options,
                userOptions = this.userOptions,
                i = plotLinesAndBands.length;
            while (i--) {
                if (plotLinesAndBands[i].id === id) {
                    plotLinesAndBands[i].destroy();
                }
            }
            each([options.plotLines || [], userOptions.plotLines || [], options.plotBands || [], userOptions.plotBands || []], function (arr) {
                i = arr.length;
                while (i--) {
                    if (arr[i].id === id) {
                        erase(arr, arr[i]);
                    }
                }
            });
        }
    };

    /**
     * Create a new axis object
     * @param {Object} chart
     * @param {Object} options
     */
    function Axis() {
        this.init.apply(this, arguments);
    }

    Axis.prototype = {

        /**
         * Default options for the X axis - the Y axis has extended defaults
         */
        defaultOptions: {
            // allowDecimals: null,
            // alternateGridColor: null,
            // categories: [],
            dateTimeLabelFormats: {
                millisecond: '%H:%M:%S.%L',
                second: '%H:%M:%S',
                minute: '%H:%M',
                hour: '%H:%M',
                day: '%e. %b',
                week: '%e. %b',
                month: '%b \'%y',
                year: '%Y'
            },
            endOnTick: false,
            gridLineColor: '#C0C0C0',
            // gridLineDashStyle: 'solid',
            // gridLineWidth: 0,
            // reversed: false,

            labels: defaultLabelOptions,
            // { step: null },
            lineColor: '#C0D0E0',
            lineWidth: 1,
            //linkedTo: null,
            //max: undefined,
            //min: undefined,
            minPadding: 0.01,
            maxPadding: 0.01,
            //minRange: null,
            minorGridLineColor: '#E0E0E0',
            // minorGridLineDashStyle: null,
            minorGridLineWidth: 1,
            minorTickColor: '#A0A0A0',
            //minorTickInterval: null,
            minorTickLength: 2,
            minorTickPosition: 'outside', // inside or outside
            //minorTickWidth: 0,
            //opposite: false,
            //offset: 0,
            //plotBands: [{
            //	events: {},
            //	zIndex: 1,
            //	labels: { align, x, verticalAlign, y, style, rotation, textAlign }
            //}],
            //plotLines: [{
            //	events: {}
            //  dashStyle: {}
            //	zIndex:
            //	labels: { align, x, verticalAlign, y, style, rotation, textAlign }
            //}],
            //reversed: false,
            // showFirstLabel: true,
            // showLastLabel: true,
            startOfWeek: 1,
            startOnTick: false,
            tickColor: '#C0D0E0',
            //tickInterval: null,
            tickLength: 5,
            tickmarkPlacement: 'between', // on or between
            tickPixelInterval: 100,
            tickPosition: 'outside',
            tickWidth: 1,
            title: {
                //text: null,
                align: 'middle', // low, middle or high
                //margin: 0 for horizontal, 10 for vertical axes,
                //rotation: 0,
                //side: 'outside',
                style: {
                    color: '#4d759e',
                    //font: defaultFont.replace('normal', 'bold')
                    fontWeight: 'bold'
                }
                //x: 0,
                //y: 0
            },
            type: 'linear' // linear, logarithmic or datetime
        },

        /**
         * This options set extends the defaultOptions for Y axes
         */
        defaultYAxisOptions: {
            endOnTick: true,
            gridLineWidth: 1,
            tickPixelInterval: 72,
            showLastLabel: true,
            labels: {
                x: -8,
                y: 3
            },
            lineWidth: 0,
            maxPadding: 0.05,
            minPadding: 0.05,
            startOnTick: true,
            tickWidth: 0,
            title: {
                rotation: 270,
                text: 'Values'
            },
            stackLabels: {
                enabled: false,
                //align: dynamic,
                //y: dynamic,
                //x: dynamic,
                //verticalAlign: dynamic,
                //textAlign: dynamic,
                //rotation: 0,
                formatter: function () {
                    return numberFormat(this.total, -1);
                },
                style: defaultLabelOptions.style
            }
        },

        /**
         * These options extend the defaultOptions for left axes
         */
        defaultLeftAxisOptions: {
            labels: {
                x: -8,
                y: null
            },
            title: {
                rotation: 270
            }
        },

        /**
         * These options extend the defaultOptions for right axes
         */
        defaultRightAxisOptions: {
            labels: {
                x: 8,
                y: null
            },
            title: {
                rotation: 90
            }
        },

        /**
         * These options extend the defaultOptions for bottom axes
         */
        defaultBottomAxisOptions: {
            labels: {
                x: 0,
                y: 14
                // overflow: undefined,
                // staggerLines: null
            },
            title: {
                rotation: 0
            }
        },
        /**
         * These options extend the defaultOptions for left axes
         */
        defaultTopAxisOptions: {
            labels: {
                x: 0,
                y: -5
                // overflow: undefined
                // staggerLines: null
            },
            title: {
                rotation: 0
            }
        },

        /**
         * Initialize the axis
         */
        init: function (chart, userOptions) {


            var isXAxis = userOptions.isX,
                axis = this;

            // Flag, is the axis horizontal
            axis.horiz = chart.inverted ? !isXAxis : isXAxis;

            // Flag, isXAxis
            axis.isXAxis = isXAxis;
            axis.coll = isXAxis ? 'xAxis' : 'yAxis';

            axis.opposite = userOptions.opposite; // needed in setOptions
            axis.side = userOptions.side || (axis.horiz ?
                    (axis.opposite ? 0 : 2) : // top : bottom
                    (axis.opposite ? 1 : 3));  // right : left

            axis.setOptions(userOptions);


            var options = this.options,
                type = options.type,
                isDatetimeAxis = type === 'datetime';

            axis.labelFormatter = options.labels.formatter || axis.defaultLabelFormatter; // can be overwritten by dynamic format


            // Flag, stagger lines or not
            axis.userOptions = userOptions;

            //axis.axisTitleMargin = UNDEFINED,// = options.title.margin,
            axis.minPixelPadding = 0;
            //axis.ignoreMinPadding = UNDEFINED; // can be set to true by a column or bar series
            //axis.ignoreMaxPadding = UNDEFINED;

            axis.chart = chart;
            axis.reversed = options.reversed;
            axis.zoomEnabled = options.zoomEnabled !== false;

            // Initial categories
            axis.categories = options.categories || type === 'category';
            axis.names = [];

            // Elements
            //axis.axisGroup = UNDEFINED;
            //axis.gridGroup = UNDEFINED;
            //axis.axisTitle = UNDEFINED;
            //axis.axisLine = UNDEFINED;

            // Shorthand types
            axis.isLog = type === 'logarithmic';
            axis.isDatetimeAxis = isDatetimeAxis;

            // Flag, if axis is linked to another axis
            axis.isLinked = defined(options.linkedTo);
            // Linked axis.
            //axis.linkedParent = UNDEFINED;

            // Tick positions
            //axis.tickPositions = UNDEFINED; // array containing predefined positions
            // Tick intervals
            //axis.tickInterval = UNDEFINED;
            //axis.minorTickInterval = UNDEFINED;

            axis.tickmarkOffset = (axis.categories && options.tickmarkPlacement === 'between') ? 0.5 : 0;

            // Major ticks
            axis.ticks = {};
            axis.labelEdge = [];
            // Minor ticks
            axis.minorTicks = {};
            //axis.tickAmount = UNDEFINED;

            // List of plotLines/Bands
            axis.plotLinesAndBands = [];

            // Alternate bands
            axis.alternateBands = {};

            // Axis metrics
            //axis.left = UNDEFINED;
            //axis.top = UNDEFINED;
            //axis.width = UNDEFINED;
            //axis.height = UNDEFINED;
            //axis.bottom = UNDEFINED;
            //axis.right = UNDEFINED;
            //axis.transA = UNDEFINED;
            //axis.transB = UNDEFINED;
            //axis.oldTransA = UNDEFINED;
            axis.len = 0;
            //axis.oldMin = UNDEFINED;
            //axis.oldMax = UNDEFINED;
            //axis.oldUserMin = UNDEFINED;
            //axis.oldUserMax = UNDEFINED;
            //axis.oldAxisLength = UNDEFINED;
            axis.minRange = axis.userMinRange = options.minRange || options.maxZoom;
            axis.range = options.range;
            axis.offset = options.offset || 0;


            // Dictionary for stacks
            axis.stacks = {};
            axis.oldStacks = {};

            // Min and max in the data
            //axis.dataMin = UNDEFINED,
            //axis.dataMax = UNDEFINED,

            // The axis range
            axis.max = null;
            axis.min = null;

            // User set min and max
            //axis.userMin = UNDEFINED,
            //axis.userMax = UNDEFINED,

            // Crosshair options
            axis.crosshair = pick(options.crosshair, splat(chart.options.tooltip.crosshairs)[isXAxis ? 0 : 1], false);
            // Run Axis

            var eventType,
                events = axis.options.events;

            // Register
            if (inArray(axis, chart.axes) === -1) { // don't add it again on Axis.update()
                if (isXAxis && !this.isColorAxis) { // #2713
                    chart.axes.splice(chart.xAxis.length, 0, axis);
                } else {
                    chart.axes.push(axis);
                }

                chart[axis.coll].push(axis);
            }

            axis.series = axis.series || []; // populated by Series

            // inverted charts have reversed xAxes as default
            if (chart.inverted && isXAxis && axis.reversed === UNDEFINED) {
                axis.reversed = true;
            }

            axis.removePlotBand = axis.removePlotBandOrLine;
            axis.removePlotLine = axis.removePlotBandOrLine;


            // register event listeners
            for (eventType in events) {
                addEvent(axis, eventType, events[eventType]);
            }

            // extend logarithmic axis
            if (axis.isLog) {
                axis.val2lin = log2lin;
                axis.lin2val = lin2log;
            }
        },

        /**
         * Merge and set options
         */
        setOptions: function (userOptions) {
            this.options = merge(
                this.defaultOptions,
                this.isXAxis ? {} : this.defaultYAxisOptions,
                [this.defaultTopAxisOptions, this.defaultRightAxisOptions,
                    this.defaultBottomAxisOptions, this.defaultLeftAxisOptions][this.side],
                merge(
                    defaultOptions[this.coll], // if set in setOptions (#1053)
                    userOptions
                )
            );
        },

        /**
         * The default label formatter. The context is a special config object for the label.
         */
        defaultLabelFormatter: function () {
            var axis = this.axis,
                value = this.value,
                categories = axis.categories,
                dateTimeLabelFormat = this.dateTimeLabelFormat,
                numericSymbols = defaultOptions.lang.numericSymbols,
                i = numericSymbols && numericSymbols.length,
                multi,
                ret,
                formatOption = axis.options.labels.format,

                // make sure the same symbol is added for all labels on a linear axis
                numericSymbolDetector = axis.isLog ? value : axis.tickInterval;

            if (formatOption) {
                ret = format(formatOption, this);

            } else if (categories) {
                ret = value;

            } else if (dateTimeLabelFormat) { // datetime axis
                ret = dateFormat(dateTimeLabelFormat, value);

            } else if (i && numericSymbolDetector >= 1000) {
                // Decide whether we should add a numeric symbol like k (thousands) or M (millions).
                // If we are to enable this in tooltip or other places as well, we can move this
                // logic to the numberFormatter and enable it by a parameter.
                while (i-- && ret === UNDEFINED) {
                    multi = Math.pow(1000, i + 1);
                    if (numericSymbolDetector >= multi && numericSymbols[i] !== null) {
                        ret = numberFormat(value / multi, -1) + numericSymbols[i];
                    }
                }
            }

            if (ret === UNDEFINED) {
                if (value >= 10000) { // add thousands separators
                    ret = numberFormat(value, 0);

                } else { // small numbers
                    ret = numberFormat(value, -1, UNDEFINED, ''); // #2466
                }
            }

            return ret;
        },

        /**
         * Get the minimum and maximum for the series of each axis
         */
        getSeriesExtremes: function () {
            var axis = this,
                chart = axis.chart;

            axis.hasVisibleSeries = false;

            // reset dataMin and dataMax in case we're redrawing
            axis.dataMin = axis.dataMax = null;

            if (axis.buildStacks) {
                axis.buildStacks();
            }

            // loop through this axis' series
            each(axis.series, function (series) {

                if (series.visible || !chart.options.chart.ignoreHiddenSeries) {

                    var seriesOptions = series.options,
                        xData,
                        threshold = seriesOptions.threshold,
                        seriesDataMin,
                        seriesDataMax;

                    axis.hasVisibleSeries = true;

                    // Validate threshold in logarithmic axes
                    if (axis.isLog && threshold <= 0) {
                        threshold = null;
                    }

                    // Get dataMin and dataMax for X axes
                    if (axis.isXAxis) {
                        xData = series.xData;
                        if (xData.length) {
                            axis.dataMin = mathMin(pick(axis.dataMin, xData[0]), arrayMin(xData));
                            axis.dataMax = mathMax(pick(axis.dataMax, xData[0]), arrayMax(xData));
                            //LOGIFIX
                            // 20993 Line Chart shows "No Data to Display" message
                            if (isNaN(axis.dataMin)) {
                                axis.dataMin = arrayMin(xData, true);
                            }
                            if (isNaN(axis.dataMax)) {
                                axis.dataMax = arrayMax(xData);
                            }
                        }

                        // Get dataMin and dataMax for Y axes, as well as handle stacking and processed data
                    } else {

                        // Get this particular series extremes
                        series.getExtremes();
                        seriesDataMax = series.dataMax;
                        seriesDataMin = series.dataMin;

                        // Get the dataMin and dataMax so far. If percentage is used, the min and max are
                        // always 0 and 100. If seriesDataMin and seriesDataMax is null, then series
                        // doesn't have active y data, we continue with nulls
                        if (defined(seriesDataMin) && defined(seriesDataMax)) {
                            axis.dataMin = mathMin(pick(axis.dataMin, seriesDataMin), seriesDataMin);
                            axis.dataMax = mathMax(pick(axis.dataMax, seriesDataMax), seriesDataMax);
                        }

                        // Adjust to threshold
                        if (defined(threshold)) {
                            if (axis.dataMin >= threshold) {
                                axis.dataMin = threshold;
                                axis.ignoreMinPadding = true;
                            } else if (axis.dataMax < threshold) {
                                axis.dataMax = threshold;
                                axis.ignoreMaxPadding = true;
                            }
                        }
                    }
                }
            });
        },

        /**
         * Translate from axis value to pixel position on the chart, or back
         *
         */
        translate: function (val, backwards, cvsCoord, old, handleLog, pointPlacement) {
            var axis = this,
                sign = 1,
                cvsOffset = 0,
                localA = old ? axis.oldTransA : axis.transA,
                localMin = old ? axis.oldMin : axis.min,
                returnValue,
                minPixelPadding = axis.minPixelPadding,
                postTranslate = (axis.options.ordinal || (axis.isLog && handleLog)) && axis.lin2val;

            if (!localA) {
                localA = axis.transA;
            }

            // In vertical axes, the canvas coordinates start from 0 at the top like in
            // SVG.
            if (cvsCoord) {
                sign *= -1; // canvas coordinates inverts the value
                cvsOffset = axis.len;
            }

            // Handle reversed axis
            if (axis.reversed) {
                sign *= -1;
                cvsOffset -= sign * (axis.sector || axis.len);
            }

            // From pixels to value
            if (backwards) { // reverse translation

                val = val * sign + cvsOffset;
                val -= minPixelPadding;
                returnValue = val / localA + localMin; // from chart pixel to value
                if (postTranslate) { // log and ordinal axes
                    returnValue = axis.lin2val(returnValue);
                }

                // From value to pixels
            } else {
                if (postTranslate) { // log and ordinal axes
                    val = axis.val2lin(val);
                }
                if (pointPlacement === 'between') {
                    pointPlacement = 0.5;
                }
                returnValue = sign * (val - localMin) * localA + cvsOffset + (sign * minPixelPadding) +
                    (isNumber(pointPlacement) ? localA * pointPlacement * axis.pointRange : 0);
            }

            return returnValue;
        },

        /**
         * Utility method to translate an axis value to pixel position.
         * @param {Number} value A value in terms of axis units
         * @param {Boolean} paneCoordinates Whether to return the pixel coordinate relative to the chart
         *        or just the axis/pane itself.
         */
        toPixels: function (value, paneCoordinates) {
            return this.translate(value, false, !this.horiz, null, true) + (paneCoordinates ? 0 : this.pos);
        },

        /*
         * Utility method to translate a pixel position in to an axis value
         * @param {Number} pixel The pixel value coordinate
         * @param {Boolean} paneCoordiantes Whether the input pixel is relative to the chart or just the
         *        axis/pane itself.
         */
        toValue: function (pixel, paneCoordinates) {
            return this.translate(pixel - (paneCoordinates ? 0 : this.pos), true, !this.horiz, null, true);
        },

        /**
         * Create the path for a plot line that goes from the given value on
         * this axis, across the plot to the opposite side
         * @param {Number} value
         * @param {Number} lineWidth Used for calculation crisp line
         * @param {Number] old Use old coordinates (for resizing and rescaling)
         */
        getPlotLinePath: function (value, lineWidth, old, force, translatedValue) {
            var axis = this,
                chart = axis.chart,
                axisLeft = axis.left,
                axisTop = axis.top,
                x1,
                y1,
                x2,
                y2,
                cHeight = (old && chart.oldChartHeight) || chart.chartHeight,
                cWidth = (old && chart.oldChartWidth) || chart.chartWidth,
                skip,
                transB = axis.transB;

            translatedValue = pick(translatedValue, axis.translate(value, null, null, old));
            x1 = x2 = mathRound(translatedValue + transB);
            y1 = y2 = mathRound(cHeight - translatedValue - transB);

            if (isNaN(translatedValue)) { // no min or max
                skip = true;

            } else if (axis.horiz) {
                y1 = axisTop;
                y2 = cHeight - axis.bottom;
                if (x1 < axisLeft || x1 > axisLeft + axis.width) {
                    skip = true;
                }
            } else {
                x1 = axisLeft;
                x2 = cWidth - axis.right;

                if (y1 < axisTop || y1 > axisTop + axis.height) {
                    skip = true;
                }
            }
            return skip && !force ?
                null :
                chart.renderer.crispLine([M, x1, y1, L, x2, y2], lineWidth || 1);
        },

        /**
         * Set the tick positions of a linear axis to round values like whole tens or every five.
         */
        getLinearTickPositions: function (tickInterval, min, max) {
            var pos,
                lastPos,
                roundedMin = correctFloat(mathFloor(min / tickInterval) * tickInterval),
                roundedMax = correctFloat(mathCeil(max / tickInterval) * tickInterval),
                tickPositions = [];

            // Populate the intermediate values
            pos = roundedMin;
            while (pos <= roundedMax) {

                // Place the tick on the rounded value
                tickPositions.push(pos);

                // Always add the raw tickInterval, not the corrected one.
                pos = correctFloat(pos + tickInterval);

                // If the interval is not big enough in the current min - max range to actually increase
                // the loop variable, we need to break out to prevent endless loop. Issue #619
                if (pos === lastPos) {
                    break;
                }

                // Record the last value
                lastPos = pos;
            }
            return tickPositions;
        },

        /**
         * Return the minor tick positions. For logarithmic axes, reuse the same logic
         * as for major ticks.
         */
        getMinorTickPositions: function () {
            var axis = this,
                options = axis.options,
                tickPositions = axis.tickPositions,
                minorTickInterval = axis.minorTickInterval,
                minorTickPositions = [],
                pos,
                i,
                len;

            if (axis.isLog) {
                len = tickPositions.length;
                for (i = 1; i < len; i++) {
                    minorTickPositions = minorTickPositions.concat(
                        axis.getLogTickPositions(minorTickInterval, tickPositions[i - 1], tickPositions[i], true)
                    );
                }
            } else if (axis.isDatetimeAxis && options.minorTickInterval === 'auto') { // #1314
                minorTickPositions = minorTickPositions.concat(
                    axis.getTimeTicks(
                        axis.normalizeTimeTickInterval(minorTickInterval),
                        axis.min,
                        axis.max,
                        options.startOfWeek
                    )
                );
                if (minorTickPositions[0] < axis.min) {
                    minorTickPositions.shift();
                }
            } else {
                for (pos = axis.min + (tickPositions[0] - axis.min) % minorTickInterval; pos <= axis.max; pos += minorTickInterval) {
                    minorTickPositions.push(pos);
                }
            }
            return minorTickPositions;
        },

        /**
         * Adjust the min and max for the minimum range. Keep in mind that the series data is
         * not yet processed, so we don't have information on data cropping and grouping, or
         * updated axis.pointRange or series.pointRange. The data can't be processed until
         * we have finally established min and max.
         */
        adjustForMinRange: function () {
            var axis = this,
                options = axis.options,
                min = axis.min,
                max = axis.max,
                zoomOffset,
                spaceAvailable = axis.dataMax - axis.dataMin >= axis.minRange,
                closestDataRange,
                i,
                distance,
                xData,
                loopLength,
                minArgs,
                maxArgs;

            // Set the automatic minimum range based on the closest point distance
            if (axis.isXAxis && axis.minRange === UNDEFINED && !axis.isLog) {

                if (defined(options.min) || defined(options.max)) {
                    axis.minRange = null; // don't do this again

                } else {

                    // Find the closest distance between raw data points, as opposed to
                    // closestPointRange that applies to processed points (cropped and grouped)
                    each(axis.series, function (series) {
                        xData = series.xData;
                        loopLength = series.xIncrement ? 1 : xData.length - 1;
                        for (i = loopLength; i > 0; i--) {
                            distance = xData[i] - xData[i - 1];
                            if (closestDataRange === UNDEFINED || distance < closestDataRange) {
                                closestDataRange = distance;
                            }
                        }
                    });
                    axis.minRange = mathMin(closestDataRange * 5, axis.dataMax - axis.dataMin);
                }
            }

            // if minRange is exceeded, adjust
            if (max - min < axis.minRange) {
                var minRange = axis.minRange;
                zoomOffset = (minRange - max + min) / 2;

                // if min and max options have been set, don't go beyond it
                minArgs = [min - zoomOffset, pick(options.min, min - zoomOffset)];
                if (spaceAvailable) { // if space is available, stay within the data range
                    minArgs[2] = axis.dataMin;
                }
                min = arrayMax(minArgs);

                maxArgs = [min + minRange, pick(options.max, min + minRange)];
                if (spaceAvailable) { // if space is availabe, stay within the data range
                    maxArgs[2] = axis.dataMax;
                }

                max = arrayMin(maxArgs);

                // now if the max is adjusted, adjust the min back
                if (max - min < minRange) {
                    minArgs[0] = max - minRange;
                    minArgs[1] = pick(options.min, max - minRange);
                    min = arrayMax(minArgs);
                }
            }

            // Record modified extremes
            axis.min = min;
            axis.max = max;
        },

        /**
         * Update translation information
         */
        setAxisTranslation: function (saveOld) {
            var axis = this,
                range = axis.max - axis.min,
                pointRange = axis.axisPointRange || 0,
                closestPointRange,
                minPointOffset = 0,
                pointRangePadding = 0,
                linkedParent = axis.linkedParent,
                ordinalCorrection,
                hasCategories = !!axis.categories,
                transA = axis.transA;

            // Adjust translation for padding. Y axis with categories need to go through the same (#1784).
            if (axis.isXAxis || hasCategories || pointRange) {
                if (linkedParent) {
                    minPointOffset = linkedParent.minPointOffset;
                    pointRangePadding = linkedParent.pointRangePadding;

                } else {
                    each(axis.series, function (series) {
                        var seriesPointRange = mathMax(axis.isXAxis ? series.pointRange : (axis.axisPointRange || 0), +hasCategories),
                            pointPlacement = series.options.pointPlacement,
                            seriesClosestPointRange = series.closestPointRange;

                        if (seriesPointRange > range) { // #1446
                            seriesPointRange = 0;
                        }
                        pointRange = mathMax(pointRange, seriesPointRange);

                        // minPointOffset is the value padding to the left of the axis in order to make
                        // room for points with a pointRange, typically columns. When the pointPlacement option
                        // is 'between' or 'on', this padding does not apply.
                        minPointOffset = mathMax(
                            minPointOffset,
                            isString(pointPlacement) ? 0 : seriesPointRange / 2
                        );

                        // Determine the total padding needed to the length of the axis to make room for the
                        // pointRange. If the series' pointPlacement is 'on', no padding is added.
                        pointRangePadding = mathMax(
                            pointRangePadding,
                            pointPlacement === 'on' ? 0 : seriesPointRange
                        );

                        // Set the closestPointRange
                        if (!series.noSharedTooltip && defined(seriesClosestPointRange)) {
                            closestPointRange = defined(closestPointRange) ?
                                mathMin(closestPointRange, seriesClosestPointRange) :
                                seriesClosestPointRange;
                        }
                    });
                }

                // Record minPointOffset and pointRangePadding
                ordinalCorrection = axis.ordinalSlope && closestPointRange ? axis.ordinalSlope / closestPointRange : 1; // #988, #1853
                axis.minPointOffset = minPointOffset = minPointOffset * ordinalCorrection;
                axis.pointRangePadding = pointRangePadding = pointRangePadding * ordinalCorrection;

                // pointRange means the width reserved for each point, like in a column chart
                axis.pointRange = mathMin(pointRange, range);

                // closestPointRange means the closest distance between points. In columns
                // it is mostly equal to pointRange, but in lines pointRange is 0 while closestPointRange
                // is some other value
                axis.closestPointRange = closestPointRange;
            }

            // Secondary values
            if (saveOld) {
                axis.oldTransA = transA;
            }
            axis.translationSlope = axis.transA = transA = axis.len / ((range + pointRangePadding) || 1);
            axis.transB = axis.horiz ? axis.left : axis.bottom; // translation addend
            axis.minPixelPadding = transA * minPointOffset;
        },

        /**
         * Set the tick positions to round values and optionally extend the extremes
         * to the nearest tick
         */
        setTickPositions: function (secondPass) {
            var axis = this,
                chart = axis.chart,
                options = axis.options,
                isLog = axis.isLog,
                isDatetimeAxis = axis.isDatetimeAxis,
                isXAxis = axis.isXAxis,
                isLinked = axis.isLinked,
                tickPositioner = axis.options.tickPositioner,
                maxPadding = options.maxPadding,
                minPadding = options.minPadding,
                length,
                linkedParentExtremes,
                tickIntervalOption = options.tickInterval,
                minTickIntervalOption = options.minTickInterval,
                tickPixelIntervalOption = options.tickPixelInterval,
                tickPositions,
                keepTwoTicksOnly,
                categories = axis.categories;

            // linked axis gets the extremes from the parent axis
            if (isLinked) {
                axis.linkedParent = chart[axis.coll][options.linkedTo];
                linkedParentExtremes = axis.linkedParent.getExtremes();
                axis.min = pick(linkedParentExtremes.min, linkedParentExtremes.dataMin);
                axis.max = pick(linkedParentExtremes.max, linkedParentExtremes.dataMax);
                if (options.type !== axis.linkedParent.options.type) {
                    //LOGIFIX
                    // 20831 Error handling (added chart)
                    error(11, 1, chart); // Can't link axes of different type
                }
            } else { // initial min and max from the extreme data values
                axis.min = pick(axis.userMin, options.min, axis.dataMin);
                axis.max = pick(axis.userMax, options.max, axis.dataMax);
            }

            if (isLog) {
                if (!secondPass && mathMin(axis.min, pick(axis.dataMin, axis.min)) <= 0) { // #978
                    //LOGIFIX
                    // 20831 Error handling (added chart)
                    error(10, 1, chart); // Can't plot negative values on log axis
                }
                axis.min = correctFloat(log2lin(axis.min)); // correctFloat cures #934
                axis.max = correctFloat(log2lin(axis.max));
            }

            // handle zoomed range
            if (axis.range && defined(axis.max)) {
                axis.userMin = axis.min = mathMax(axis.min, axis.max - axis.range); // #618
                axis.userMax = axis.max;

                axis.range = null;  // don't use it when running setExtremes
            }

            // Hook for adjusting this.min and this.max. Used by bubble series.
            if (axis.beforePadding) {
                axis.beforePadding();
            }

            // adjust min and max for the minimum range
            axis.adjustForMinRange();

            // Pad the values to get clear of the chart's edges. To avoid tickInterval taking the padding
            // into account, we do this after computing tick interval (#1337).
            if (!categories && !axis.axisPointRange && !axis.usePercentage && !isLinked && defined(axis.min) && defined(axis.max)) {
                length = axis.max - axis.min;
                if (length) {
                    if (!defined(options.min) && !defined(axis.userMin) && minPadding && (axis.dataMin < 0 || !axis.ignoreMinPadding)) {
                        axis.min -= length * minPadding;
                    }
                    if (!defined(options.max) && !defined(axis.userMax) && maxPadding && (axis.dataMax > 0 || !axis.ignoreMaxPadding)) {
                        axis.max += length * maxPadding;
                    }
                }
            }

            // get tickInterval
            if (axis.min === axis.max || axis.min === undefined || axis.max === undefined) {
                axis.tickInterval = 1;
            } else if (isLinked && !tickIntervalOption &&
                    tickPixelIntervalOption === axis.linkedParent.options.tickPixelInterval) {
                axis.tickInterval = axis.linkedParent.tickInterval;
            } else {
                axis.tickInterval = pick(
                    tickIntervalOption,
                    categories ? // for categoried axis, 1 is default, for linear axis use tickPix
                        1 :
                        // don't let it be more than the data range
                        (axis.max - axis.min) * tickPixelIntervalOption / mathMax(axis.len, tickPixelIntervalOption)
                );
                // For squished axes, set only two ticks
                if (!defined(tickIntervalOption) && axis.len < tickPixelIntervalOption && !this.isRadial &&
                        !this.isLog && !categories && options.startOnTick && options.endOnTick) {
                    keepTwoTicksOnly = true;
                    axis.tickInterval /= 4; // tick extremes closer to the real values
                }
            }

            // Now we're finished detecting min and max, crop and group series data. This
            // is in turn needed in order to find tick positions in ordinal axes.
            if (isXAxis && !secondPass) {
                each(axis.series, function (series) {
                    series.processData(axis.min !== axis.oldMin || axis.max !== axis.oldMax);
                });
            }

            // set the translation factor used in translate function
            axis.setAxisTranslation(true);

            // hook for ordinal axes and radial axes
            if (axis.beforeSetTickPositions) {
                axis.beforeSetTickPositions();
            }

            // hook for extensions, used in Highstock ordinal axes
            if (axis.postProcessTickInterval) {
                axis.tickInterval = axis.postProcessTickInterval(axis.tickInterval);
            }

            // In column-like charts, don't cramp in more ticks than there are points (#1943)
            if (axis.pointRange) {
                axis.tickInterval = mathMax(axis.pointRange, axis.tickInterval);
            }

            // Before normalizing the tick interval, handle minimum tick interval. This applies only if tickInterval is not defined.
            if (!tickIntervalOption && axis.tickInterval < minTickIntervalOption) {
                axis.tickInterval = minTickIntervalOption;
            }

            // for linear axes, get magnitude and normalize the interval
            if (!isDatetimeAxis && !isLog) { // linear
                if (!tickIntervalOption) {
                    axis.tickInterval = normalizeTickInterval(axis.tickInterval, null, getMagnitude(axis.tickInterval), options);
                }
            }

            // get minorTickInterval
            axis.minorTickInterval = options.minorTickInterval === 'auto' && axis.tickInterval ?
                    axis.tickInterval / 5 : options.minorTickInterval;

            // find the tick positions
            axis.tickPositions = tickPositions = options.tickPositions ?
                [].concat(options.tickPositions) : // Work on a copy (#1565)
                (tickPositioner && tickPositioner.apply(axis, [axis.min, axis.max]));
            if (!tickPositions) {

                // Too many ticks
                if (!axis.ordinalPositions && (axis.max - axis.min) / axis.tickInterval > mathMax(2 * axis.len, 200)) {
                    //LOGIFIX
                    // 20831 Error handling (added chart)
                    error(19, true, chart);
                }

                if (isDatetimeAxis) {
                    tickPositions = axis.getTimeTicks(
                        axis.normalizeTimeTickInterval(axis.tickInterval, options.units),
                        axis.min,
                        axis.max,
                        options.startOfWeek,
                        axis.ordinalPositions,
                        axis.closestPointRange,
                        true
                    );
                } else if (isLog) {
                    tickPositions = axis.getLogTickPositions(axis.tickInterval, axis.min, axis.max);
                } else {
                    tickPositions = axis.getLinearTickPositions(axis.tickInterval, axis.min, axis.max);
                }

                if (keepTwoTicksOnly) {
                    tickPositions.splice(1, tickPositions.length - 2);
                }

                axis.tickPositions = tickPositions;
            }

            if (!isLinked) {

                // reset min/max or remove extremes based on start/end on tick
                var roundedMin = tickPositions[0],
                    roundedMax = tickPositions[tickPositions.length - 1],
                    minPointOffset = axis.minPointOffset || 0,
                    singlePad;

                if (options.startOnTick) {
                    axis.min = roundedMin;
                } else if (axis.min - minPointOffset > roundedMin) {
                    tickPositions.shift();
                }

                if (options.endOnTick) {
                    axis.max = roundedMax;
                } else if (axis.max + minPointOffset < roundedMax) {
                    tickPositions.pop();
                }

                // When there is only one point, or all points have the same value on this axis, then min
                // and max are equal and tickPositions.length is 1. In this case, add some padding
                // in order to center the point, but leave it with one tick. #1337.
                if (tickPositions.length === 1) {
                    singlePad = mathAbs(axis.max || 1) * 0.001; // The lowest possible number to avoid extra padding on columns (#2619)
                    axis.min -= singlePad;
                    axis.max += singlePad;
                }
            }
        },

        /**
         * Set the max ticks of either the x and y axis collection
         */
        setMaxTicks: function () {

            var chart = this.chart,
                maxTicks = chart.maxTicks || {},
                tickPositions = this.tickPositions,
                key = this._maxTicksKey = [this.coll, this.pos, this.len].join('-');

            if (!this.isLinked && !this.isDatetimeAxis && tickPositions && tickPositions.length > (maxTicks[key] || 0) && this.options.alignTicks !== false) {
                maxTicks[key] = tickPositions.length;
            }
            chart.maxTicks = maxTicks;
        },

        /**
         * When using multiple axes, adjust the number of ticks to match the highest
         * number of ticks in that group
         */
        adjustTickAmount: function () {
            var axis = this,
                chart = axis.chart,
                key = axis._maxTicksKey,
                tickPositions = axis.tickPositions,
                maxTicks = chart.maxTicks;

            if (maxTicks && maxTicks[key] && !axis.isDatetimeAxis && !axis.categories && !axis.isLinked &&
                    axis.options.alignTicks !== false && this.min !== UNDEFINED) {
                var oldTickAmount = axis.tickAmount,
                    calculatedTickAmount = tickPositions.length,
                    tickAmount;

                // set the axis-level tickAmount to use below
                axis.tickAmount = tickAmount = maxTicks[key];

                if (calculatedTickAmount < tickAmount) {
                    while (tickPositions.length < tickAmount) {
                        tickPositions.push(correctFloat(
                            tickPositions[tickPositions.length - 1] + axis.tickInterval
                        ));
                    }
                    axis.transA *= (calculatedTickAmount - 1) / (tickAmount - 1);
                    axis.max = tickPositions[tickPositions.length - 1];

                }
                if (defined(oldTickAmount) && tickAmount !== oldTickAmount) {
                    axis.isDirty = true;
                }
            }
        },

        /**
         * Set the scale based on data min and max, user set min and max or options
         *
         */
        setScale: function () {
            var axis = this,
                stacks = axis.stacks,
                type,
                i,
                isDirtyData,
                isDirtyAxisLength;

            axis.oldMin = axis.min;
            axis.oldMax = axis.max;
            axis.oldAxisLength = axis.len;

            // set the new axisLength
            axis.setAxisSize();
            //axisLength = horiz ? axisWidth : axisHeight;
            isDirtyAxisLength = axis.len !== axis.oldAxisLength;

            // is there new data?
            each(axis.series, function (series) {
                if (series.isDirtyData || series.isDirty ||
                        series.xAxis.isDirty) { // when x axis is dirty, we need new data extremes for y as well
                    isDirtyData = true;
                }
            });

            // do we really need to go through all this?
            if (isDirtyAxisLength || isDirtyData || axis.isLinked || axis.forceRedraw ||
                axis.userMin !== axis.oldUserMin || axis.userMax !== axis.oldUserMax) {

                // reset stacks
                if (!axis.isXAxis) {
                    for (type in stacks) {
                        for (i in stacks[type]) {
                            stacks[type][i].total = null;
                            stacks[type][i].cum = 0;
                        }
                    }
                }

                axis.forceRedraw = false;

                // get data extremes if needed
                axis.getSeriesExtremes();

                // get fixed positions based on tickInterval
                axis.setTickPositions();

                // record old values to decide whether a rescale is necessary later on (#540)
                axis.oldUserMin = axis.userMin;
                axis.oldUserMax = axis.userMax;

                // Mark as dirty if it is not already set to dirty and extremes have changed. #595.
                if (!axis.isDirty) {
                    axis.isDirty = isDirtyAxisLength || axis.min !== axis.oldMin || axis.max !== axis.oldMax;
                }
            } else if (!axis.isXAxis) {
                if (axis.oldStacks) {
                    stacks = axis.stacks = axis.oldStacks;
                }

                // reset stacks
                for (type in stacks) {
                    for (i in stacks[type]) {
                        stacks[type][i].cum = stacks[type][i].total;
                    }
                }
            }

            // Set the maximum tick amount
            axis.setMaxTicks();
        },

        /**
         * Set the extremes and optionally redraw
         * @param {Number} newMin
         * @param {Number} newMax
         * @param {Boolean} redraw
         * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
         *    configuration
         * @param {Object} eventArguments
         *
         */
        setExtremes: function (newMin, newMax, redraw, animation, eventArguments) {
            var axis = this,
                chart = axis.chart;

            redraw = pick(redraw, true); // defaults to true

            // Extend the arguments with min and max
            eventArguments = extend(eventArguments, {
                min: newMin,
                max: newMax
            });

            // Fire the event
            fireEvent(axis, 'setExtremes', eventArguments, function () { // the default event handler

                axis.userMin = newMin;
                axis.userMax = newMax;
                axis.eventArgs = eventArguments;

                // Mark for running afterSetExtremes
                axis.isDirtyExtremes = true;

                // redraw
                if (redraw) {
                    chart.redraw(animation);
                }
            });
        },

        /**
         * Overridable method for zooming chart. Pulled out in a separate method to allow overriding
         * in stock charts.
         */
        zoom: function (newMin, newMax) {
            var dataMin = this.dataMin,
                dataMax = this.dataMax,
                options = this.options;

            // Prevent pinch zooming out of range. Check for defined is for #1946. #1734.
            if (!this.allowZoomOutside) {
                if (defined(dataMin) && newMin <= mathMin(dataMin, pick(options.min, dataMin))) {
                    newMin = UNDEFINED;
                }
                if (defined(dataMax) && newMax >= mathMax(dataMax, pick(options.max, dataMax))) {
                    newMax = UNDEFINED;
                }
            }

            // In full view, displaying the reset zoom button is not required
            this.displayBtn = newMin !== UNDEFINED || newMax !== UNDEFINED;

            // Do it
            this.setExtremes(
                newMin,
                newMax,
                false,
                UNDEFINED,
                { trigger: 'zoom' }
            );
            return true;
        },

        /**
         * Update the axis metrics
         */
        setAxisSize: function () {
            var chart = this.chart,
                options = this.options,
                offsetLeft = options.offsetLeft || 0,
                offsetRight = options.offsetRight || 0,
                horiz = this.horiz,
                width,
                height,
                top,
                left;

            // Expose basic values to use in Series object and navigator
            this.left = left = pick(options.left, chart.plotLeft + offsetLeft);
            this.top = top = pick(options.top, chart.plotTop);
            this.width = width = pick(options.width, chart.plotWidth - offsetLeft + offsetRight);
            this.height = height = pick(options.height, chart.plotHeight - (chart.legend.baseline || 0)); //LOGIFIX
            this.bottom = chart.chartHeight - height - top;
            this.right = chart.chartWidth - width - left;

            // Direction agnostic properties
            this.len = mathMax(horiz ? width : height, 0); // mathMax fixes #905
            this.pos = horiz ? left : top; // distance from SVG origin
        },

        /**
         * Get the actual axis extremes
         */
        getExtremes: function () {
            var axis = this,
                isLog = axis.isLog;

            return {
                min: isLog ? correctFloat(lin2log(axis.min)) : axis.min,
                max: isLog ? correctFloat(lin2log(axis.max)) : axis.max,
                dataMin: axis.dataMin,
                dataMax: axis.dataMax,
                userMin: axis.userMin,
                userMax: axis.userMax
            };
        },

        /**
         * Get the zero plane either based on zero or on the min or max value.
         * Used in bar and area plots
         */
        getThreshold: function (threshold) {
            var axis = this,
                isLog = axis.isLog;

            var realMin = isLog ? lin2log(axis.min) : axis.min,
                realMax = isLog ? lin2log(axis.max) : axis.max;

            if (realMin > threshold || threshold === null) {
                threshold = realMin;
            } else if (realMax < threshold) {
                threshold = realMax;
            }

            return axis.translate(threshold, 0, 1, 0, 1);
        },

        /**
         * Compute auto alignment for the axis label based on which side the axis is on
         * and the given rotation for the label
         */
        autoLabelAlign: function (rotation) {
            var ret,
                angle = (pick(rotation, 0) - (this.side * 90) + 720) % 360;

            if (angle > 15 && angle < 165) {
                ret = 'right';
            } else if (angle > 195 && angle < 345) {
                ret = 'left';
            } else {
                ret = 'center';
            }
            return ret;
        },

        /**
         * Render the tick labels to a preliminary position to get their sizes
         */
        getOffset: function () {
            var axis = this,
                chart = axis.chart,
                renderer = chart.renderer,
                options = axis.options,
                tickPositions = axis.tickPositions,
                ticks = axis.ticks,
                horiz = axis.horiz,
                side = axis.side,
                invertedSide = chart.inverted ? [1, 0, 3, 2][side] : side,
                hasData,
                showAxis,
                titleOffset = 0,
                titleOffsetOption,
                titleMargin = 0,
                axisTitleOptions = options.title,
                labelOptions = options.labels,
                labelOffset = 0, // reset
                axisOffset = chart.axisOffset,
                clipOffset = chart.clipOffset,
                directionFactor = [-1, 1, 1, -1][side],
                n,
                i,
                autoStaggerLines = 1,
                maxStaggerLines = pick(labelOptions.maxStaggerLines, 5),
                sortedPositions,
                lastRight,
                overlap,
                pos,
                bBox,
                x,
                w,
                lineNo;

            // For reuse in Axis.render
            axis.hasData = hasData = (axis.hasVisibleSeries || (defined(axis.min) && defined(axis.max) && !!tickPositions));
            axis.showAxis = showAxis = hasData || pick(options.showEmpty, true);

            // Set/reset staggerLines
            axis.staggerLines = axis.horiz && labelOptions.staggerLines;

            // Create the axisGroup and gridGroup elements on first iteration
            if (!axis.axisGroup) {
                axis.gridGroup = renderer.g('grid')
                    .attr({ zIndex: options.gridZIndex || 1 })
                    .add();
                axis.axisGroup = renderer.g('axis')
                    .attr({ zIndex: options.zIndex || 2 })
                    .add();
                axis.labelGroup = renderer.g('axis-labels')
                    .attr({ zIndex: labelOptions.zIndex || 7 })
                    .addClass(PREFIX + axis.coll.toLowerCase() + '-labels')
                    .add();
            }

            if (hasData || axis.isLinked) {

                // Set the explicit or automatic label alignment
                axis.labelAlign = pick(labelOptions.align || axis.autoLabelAlign(labelOptions.rotation));

                // Generate ticks
                each(tickPositions, function (pos) {
                    if (!ticks[pos]) {
                        ticks[pos] = new Tick(axis, pos);
                    } else {
                        ticks[pos].addLabel(); // update labels depending on tick interval
                    }
                });

                // Handle automatic stagger lines
                if (axis.horiz && !axis.staggerLines && maxStaggerLines && !labelOptions.rotation) {
                    sortedPositions = axis.reversed ? [].concat(tickPositions).reverse() : tickPositions;
                    while (autoStaggerLines < maxStaggerLines) {
                        lastRight = [];
                        overlap = false;

                        for (i = 0; i < sortedPositions.length; i++) {
                            pos = sortedPositions[i];
                            bBox = ticks[pos].label && ticks[pos].label.getBBox();
                            w = bBox ? bBox.width : 0;
                            lineNo = i % autoStaggerLines;

                            if (w) {
                                x = axis.translate(pos); // don't handle log
                                if (lastRight[lineNo] !== UNDEFINED && x < lastRight[lineNo]) {
                                    overlap = true;
                                }
                                lastRight[lineNo] = x + w;
                            }
                        }
                        if (overlap) {
                            autoStaggerLines++;
                        } else {
                            break;
                        }
                    }

                    if (autoStaggerLines > 1) {
                        axis.staggerLines = autoStaggerLines;
                    }
                }


                each(tickPositions, function (pos) {
                    // left side must be align: right and right side must have align: left for labels
                    if (side === 0 || side === 2 || { 1: 'left', 3: 'right' }[side] === axis.labelAlign) {

                        // get the highest offset
                        labelOffset = mathMax(
                            ticks[pos].getLabelSize(),
                            labelOffset
                        );
                    }

                });
                if (axis.staggerLines) {
                    labelOffset *= axis.staggerLines;
                    axis.labelOffset = labelOffset;
                }


            } else { // doesn't have data
                for (n in ticks) {
                    ticks[n].destroy();
                    delete ticks[n];
                }
            }

            if (axisTitleOptions && axisTitleOptions.text && axisTitleOptions.enabled !== false) {
                if (!axis.axisTitle) {
                    axis.axisTitle = renderer.text(
                        axisTitleOptions.text,
                        0,
                        0,
                        axisTitleOptions.useHTML
                    )
                    .attr({
                        zIndex: 7,
                        rotation: axisTitleOptions.rotation || 0,
                        align:
                            axisTitleOptions.textAlign ||
                            { low: 'left', middle: 'center', high: 'right' }[axisTitleOptions.align]
                    })
                    .addClass(PREFIX + this.coll.toLowerCase() + '-title')
                    .css(axisTitleOptions.style)
                    .add(axis.axisGroup);
                    axis.axisTitle.isNew = true;
                }

                if (showAxis) {
                    titleOffset = axis.axisTitle.getBBox()[horiz ? 'height' : 'width'];
                    titleMargin = pick(axisTitleOptions.margin, horiz ? 5 : 10);
                    titleOffsetOption = axisTitleOptions.offset;
                }

                // hide or show the title depending on whether showEmpty is set
                axis.axisTitle[showAxis ? 'show' : 'hide']();
            }

            // handle automatic or user set offset
            axis.offset = directionFactor * pick(options.offset, axisOffset[side]);

            axis.axisTitleMargin =
                pick(titleOffsetOption,
                    labelOffset + titleMargin +
                    (side !== 2 && labelOffset && directionFactor * options.labels[horiz ? 'y' : 'x'])
                );

            axisOffset[side] = mathMax(
                axisOffset[side],
                axis.axisTitleMargin + titleOffset + directionFactor * axis.offset
            );
            clipOffset[invertedSide] = mathMax(clipOffset[invertedSide], mathFloor(options.lineWidth / 2) * 2);
        },

        /**
         * Get the path for the axis line
         */
        getLinePath: function (lineWidth) {
            var chart = this.chart,
                opposite = this.opposite,
                offset = this.offset,
                horiz = this.horiz,
                lineLeft = this.left + (opposite ? this.width : 0) + offset,
                lineTop = chart.chartHeight - this.bottom - (opposite ? this.height : 0) + offset;

            if (opposite) {
                lineWidth *= -1; // crispify the other way - #1480, #1687
            }

            return chart.renderer.crispLine([
                    M,
                    horiz ?
                        this.left :
                        lineLeft,
                    horiz ?
                lineTop :
                        this.top,
                    L,
                    horiz ?
                        chart.chartWidth - this.right :
                        lineLeft,
                    horiz ?
                lineTop :
                        chart.chartHeight - this.bottom
            ], lineWidth);
        },

        /**
         * Position the title
         */
        getTitlePosition: function () {
            // compute anchor points for each of the title align options
            var horiz = this.horiz,
                axisLeft = this.left,
                axisTop = this.top,
                axisLength = this.len,
                axisTitleOptions = this.options.title,
                margin = horiz ? axisLeft : axisTop,
                opposite = this.opposite,
                offset = this.offset,
                fontSize = pInt(axisTitleOptions.style.fontSize || 12),

                // the position in the length direction of the axis
                alongAxis = {
                    low: margin + (horiz ? 0 : axisLength),
                    middle: margin + axisLength / 2,
                    high: margin + (horiz ? axisLength : 0)
                }[axisTitleOptions.align],

                // the position in the perpendicular direction of the axis
                offAxis = (horiz ? axisTop + this.height : axisLeft) +
                    (horiz ? 1 : -1) * // horizontal axis reverses the margin
                    (opposite ? -1 : 1) * // so does opposite axes
                    this.axisTitleMargin +
                    (this.side === 2 ? fontSize : 0);

            return {
                x: horiz ?
                    alongAxis :
                    offAxis + (opposite ? this.width : 0) + offset +
                        (axisTitleOptions.x || 0), // x
                y: horiz ?
                    offAxis - (opposite ? this.height : 0) + offset :
                    alongAxis + (axisTitleOptions.y || 0) // y
            };
        },

        /**
         * Render the axis
         */
        render: function () {
            var axis = this,
                horiz = axis.horiz,
                reversed = axis.reversed,
                chart = axis.chart,
                renderer = chart.renderer,
                options = axis.options,
                isLog = axis.isLog,
                isLinked = axis.isLinked,
                tickPositions = axis.tickPositions,
                sortedPositions,
                axisTitle = axis.axisTitle,
                ticks = axis.ticks,
                minorTicks = axis.minorTicks,
                alternateBands = axis.alternateBands,
                stackLabelOptions = options.stackLabels,
                alternateGridColor = options.alternateGridColor,
                tickmarkOffset = axis.tickmarkOffset,
                lineWidth = options.lineWidth,
                linePath,
                hasRendered = chart.hasRendered,
                slideInTicks = hasRendered && defined(axis.oldMin) && !isNaN(axis.oldMin),
                hasData = axis.hasData,
                showAxis = axis.showAxis,
                from,
                overflow = options.labels.overflow,
                justifyLabels = axis.justifyLabels = horiz && overflow !== false,
                to;

            // Reset
            axis.labelEdge.length = 0;
            axis.justifyToPlot = overflow === 'justify';

            // Mark all elements inActive before we go over and mark the active ones
            each([ticks, minorTicks, alternateBands], function (coll) {
                var pos;
                for (pos in coll) {
                    coll[pos].isActive = false;
                }
            });

            // If the series has data draw the ticks. Else only the line and title
            if (hasData || isLinked) {

                // minor ticks
                if (axis.minorTickInterval && !axis.categories) {
                    each(axis.getMinorTickPositions(), function (pos) {
                        if (!minorTicks[pos]) {
                            minorTicks[pos] = new Tick(axis, pos, 'minor');
                        }

                        // render new ticks in old position
                        if (slideInTicks && minorTicks[pos].isNew) {
                            minorTicks[pos].render(null, true);
                        }

                        minorTicks[pos].render(null, false, 1);
                    });
                }

                // Major ticks. Pull out the first item and render it last so that
                // we can get the position of the neighbour label. #808.
                if (tickPositions.length) { // #1300
                    sortedPositions = tickPositions.slice();
                    if ((horiz && reversed) || (!horiz && !reversed)) {
                        sortedPositions.reverse();
                    }
                    if (justifyLabels) {
                        sortedPositions = sortedPositions.slice(1).concat([sortedPositions[0]]);
                    }
                    each(sortedPositions, function (pos, i) {

                        // Reorganize the indices
                        if (justifyLabels) {
                            i = (i === sortedPositions.length - 1) ? 0 : i + 1;
                        }

                        // linked axes need an extra check to find out if
                        if (!isLinked || (pos >= axis.min && pos <= axis.max)) {

                            if (!ticks[pos]) {
                                ticks[pos] = new Tick(axis, pos);
                            }

                            // render new ticks in old position
                            if (slideInTicks && ticks[pos].isNew) {
                                ticks[pos].render(i, true, 0.1);
                            }

                            ticks[pos].render(i, false, 1);
                        }

                    });
                    // In a categorized axis, the tick marks are displayed between labels. So
                    // we need to add a tick mark and grid line at the left edge of the X axis.
                    if (tickmarkOffset && axis.min === 0) {
                        if (!ticks[-1]) {
                            ticks[-1] = new Tick(axis, -1, null, true);
                        }
                        ticks[-1].render(-1);
                    }

                }

                // alternate grid color
                if (alternateGridColor) {
                    each(tickPositions, function (pos, i) {
                        if (i % 2 === 0 && pos < axis.max) {
                            if (!alternateBands[pos]) {
                                alternateBands[pos] = new Highcharts.PlotLineOrBand(axis);
                            }
                            from = pos + tickmarkOffset; // #949
                            to = tickPositions[i + 1] !== UNDEFINED ? tickPositions[i + 1] + tickmarkOffset : axis.max;
                            alternateBands[pos].options = {
                                from: isLog ? lin2log(from) : from,
                                to: isLog ? lin2log(to) : to,
                                color: alternateGridColor
                            };
                            alternateBands[pos].render();
                            alternateBands[pos].isActive = true;
                        }
                    });
                }

                // custom plot lines and bands
                if (!axis._addedPlotLB) { // only first time
                    each((options.plotLines || []).concat(options.plotBands || []), function (plotLineOptions) {
                        axis.addPlotBandOrLine(plotLineOptions);
                    });
                    axis._addedPlotLB = true;
                }

            } // end if hasData

            // Remove inactive ticks
            each([ticks, minorTicks, alternateBands], function (coll) {
                var pos,
                    i,
                    forDestruction = [],
                    delay = globalAnimation ? globalAnimation.duration || 500 : 0,
                    destroyInactiveItems = function () {
                        i = forDestruction.length;
                        while (i--) {
                            // When resizing rapidly, the same items may be destroyed in different timeouts,
                            // or the may be reactivated
                            if (coll[forDestruction[i]] && !coll[forDestruction[i]].isActive) {
                                coll[forDestruction[i]].destroy();
                                delete coll[forDestruction[i]];
                            }
                        }

                    };

                for (pos in coll) {

                    if (!coll[pos].isActive) {
                        // Render to zero opacity
                        coll[pos].render(pos, false, 0);
                        coll[pos].isActive = false;
                        forDestruction.push(pos);
                    }
                }

                // When the objects are finished fading out, destroy them
                if (coll === alternateBands || !chart.hasRendered || !delay) {
                    destroyInactiveItems();
                } else if (delay) {
                    setTimeout(destroyInactiveItems, delay);
                }
            });

            // Static items. As the axis group is cleared on subsequent calls
            // to render, these items are added outside the group.
            // axis line
            if (lineWidth) {
                linePath = axis.getLinePath(lineWidth);
                if (!axis.axisLine) {
                    axis.axisLine = renderer.path(linePath)
                        .attr({
                            stroke: options.lineColor,
                            'stroke-width': lineWidth,
                            zIndex: 7
                        })
                        .add(axis.axisGroup);
                } else {
                    axis.axisLine.animate({ d: linePath });
                }

                // show or hide the line depending on options.showEmpty
                axis.axisLine[showAxis ? 'show' : 'hide']();
            }

            if (axisTitle && showAxis) {

                axisTitle[axisTitle.isNew ? 'attr' : 'animate'](
                    axis.getTitlePosition()
                );
                axisTitle.isNew = false;
            }

            // Stacked totals:
            if (stackLabelOptions && stackLabelOptions.enabled) {
                axis.renderStackTotals();
            }
            // End stacked totals

            axis.isDirty = false;
        },

        /**
         * Redraw the axis to reflect changes in the data or axis extremes
         */
        redraw: function () {
            var axis = this,
                chart = axis.chart,
                pointer = chart.pointer;

            // hide tooltip and hover states
            if (pointer) {
                pointer.reset(true);
            }

            // render the axis
            axis.render();

            // move plot lines and bands
            each(axis.plotLinesAndBands, function (plotLine) {
                plotLine.render();
            });

            // mark associated series as dirty and ready for redraw
            each(axis.series, function (series) {
                series.isDirty = true;
            });

        },

        /**
         * Destroys an Axis instance.
         */
        destroy: function (keepEvents) {
            var axis = this,
                stacks = axis.stacks,
                stackKey,
                plotLinesAndBands = axis.plotLinesAndBands,
                i;

            // Remove the events
            if (!keepEvents) {
                removeEvent(axis);
            }

            // Destroy each stack total
            for (stackKey in stacks) {
                destroyObjectProperties(stacks[stackKey]);

                stacks[stackKey] = null;
            }

            // Destroy collections
            each([axis.ticks, axis.minorTicks, axis.alternateBands], function (coll) {
                destroyObjectProperties(coll);
            });
            i = plotLinesAndBands.length;
            while (i--) { // #1975
                plotLinesAndBands[i].destroy();
            }

            // Destroy local variables
            each(['stackTotalGroup', 'axisLine', 'axisTitle', 'axisGroup', 'cross', 'gridGroup', 'labelGroup'], function (prop) {
                if (axis[prop]) {
                    axis[prop] = axis[prop].destroy();
                }
            });

            // Destroy crosshair
            if (this.cross) {
                this.cross.destroy();
            }
        },

        /**
         * Draw the crosshair
         */
        drawCrosshair: function (e, point) {
            if (!this.crosshair) { return; }// Do not draw crosshairs if you don't have too.

            if ((defined(point) || !pick(this.crosshair.snap, true)) === false) {
                this.hideCrosshair();
                return;
            }

            var path,
                options = this.crosshair,
                animation = options.animation,
                pos;

            // Get the path
            if (!pick(options.snap, true)) {
                pos = (this.horiz ? e.chartX - this.pos : this.len - e.chartY + this.pos);
            } else if (defined(point)) {
                /*jslint eqeq: true*/
                pos = (this.chart.inverted != this.horiz) ? point.plotX : this.len - point.plotY;
                /*jslint eqeq: false*/
            }

            if (this.isRadial) {
                path = this.getPlotLinePath(this.isXAxis ? point.x : pick(point.stackY, point.y));
            } else {
                path = this.getPlotLinePath(null, null, null, null, pos);
            }

            if (path === null) {
                this.hideCrosshair();
                return;
            }

            // Draw the cross
            if (this.cross) {
                this.cross
                    .attr({ visibility: VISIBLE })[animation ? 'animate' : 'attr']({ d: path }, animation);
            } else {
                var attribs = {
                    'stroke-width': options.width || 1,
                    stroke: options.color || '#C0C0C0',
                    zIndex: options.zIndex || 2
                };
                if (options.dashStyle) {
                    attribs.dashstyle = options.dashStyle;
                }
                this.cross = this.chart.renderer.path(path).attr(attribs).add();
            }
        },

        /**
         *	Hide the crosshair.
         */
        hideCrosshair: function () {
            if (this.cross) {
                this.cross.hide();
            }
        }
    }; // end Axis

    extend(Axis.prototype, AxisPlotLineOrBandExtension);

    /**
     * Set the tick positions to a time unit that makes sense, for example
     * on the first of each month or on every Monday. Return an array
     * with the time positions. Used in datetime axes as well as for grouping
     * data on a datetime axis.
     *
     * @param {Object} normalizedInterval The interval in axis values (ms) and the count
     * @param {Number} min The minimum in axis values
     * @param {Number} max The maximum in axis values
     * @param {Number} startOfWeek
     */
    Axis.prototype.getTimeTicks = function (normalizedInterval, min, max, startOfWeek) {
        var tickPositions = [],
            i,
            higherRanks = {},
            useUTC = defaultOptions.global.useUTC,
            minYear, // used in months and years as a basis for Date.UTC()
            minDate = new Date(min - timezoneOffset),
            interval = normalizedInterval.unitRange,
            count = normalizedInterval.count;

        if (defined(min)) { // #1300
            if (interval >= timeUnits[SECOND]) { // second
                minDate.setMilliseconds(0);
                minDate.setSeconds(interval >= timeUnits[MINUTE] ? 0 :
                    count * mathFloor(minDate.getSeconds() / count));
            }

            if (interval >= timeUnits[MINUTE]) { // minute
                minDate[setMinutes](interval >= timeUnits[HOUR] ? 0 :
                    count * mathFloor(minDate[getMinutes]() / count));
            }

            if (interval >= timeUnits[HOUR]) { // hour
                minDate[setHours](interval >= timeUnits[DAY] ? 0 :
                    count * mathFloor(minDate[getHours]() / count));
            }

            if (interval >= timeUnits[DAY]) { // day
                minDate[setDate](interval >= timeUnits[MONTH] ? 1 :
                    count * mathFloor(minDate[getDate]() / count));
            }

            if (interval >= timeUnits[MONTH]) { // month
                minDate[setMonth](interval >= timeUnits[YEAR] ? 0 :
                    count * mathFloor(minDate[getMonth]() / count));
                minYear = minDate[getFullYear]();
            }

            if (interval >= timeUnits[YEAR]) { // year
                minYear -= minYear % count;
                minDate[setFullYear](minYear);
            }

            // week is a special case that runs outside the hierarchy
            if (interval === timeUnits[WEEK]) {
                // get start of current week, independent of count
                minDate[setDate](minDate[getDate]() - minDate[getDay]() +
                    pick(startOfWeek, 1));
            }


            // get tick positions
            i = 1;
            if (timezoneOffset) {
                minDate = new Date(minDate.getTime() + timezoneOffset);
            }
            minYear = minDate[getFullYear]();
            var time = minDate.getTime(),
                minMonth = minDate[getMonth](),
                minDateDate = minDate[getDate](),
                localTimezoneOffset = useUTC ?
                timezoneOffset :
                    (24 * 3600 * 1000 + minDate.getTimezoneOffset() * 60 * 1000) % (24 * 3600 * 1000); // #950

            // iterate and add tick positions at appropriate values
            while (time < max) {
                tickPositions.push(time);

                // if the interval is years, use Date.UTC to increase years
                if (interval === timeUnits[YEAR]) {
                    time = makeTime(minYear + i * count, 0);

                    // if the interval is months, use Date.UTC to increase months
                } else if (interval === timeUnits[MONTH]) {
                    time = makeTime(minYear, minMonth + i * count);

                    // if we're using global time, the interval is not fixed as it jumps
                    // one hour at the DST crossover
                } else if (!useUTC && (interval === timeUnits[DAY] || interval === timeUnits[WEEK])) {
                    time = makeTime(minYear, minMonth, minDateDate +
                        i * count * (interval === timeUnits[DAY] ? 1 : 7));

                    // else, the interval is fixed and we use simple addition
                } else {
                    time += interval * count;
                }

                i++;
            }

            // push the last time
            tickPositions.push(time);


            // mark new days if the time is dividible by day (#1649, #1760)
            each(grep(tickPositions, function (time) {
                return interval <= timeUnits[HOUR] && time % timeUnits[DAY] === localTimezoneOffset;
            }), function (time) {
                higherRanks[time] = DAY;
            });
        }


        // record information on the chosen unit - for dynamic label formatter
        tickPositions.info = extend(normalizedInterval, {
            higherRanks: higherRanks,
            totalRange: interval * count
        });

        return tickPositions;
    };

    /**
     * Get a normalized tick interval for dates. Returns a configuration object with
     * unit range (interval), count and name. Used to prepare data for getTimeTicks. 
     * Previously this logic was part of getTimeTicks, but as getTimeTicks now runs
     * of segments in stock charts, the normalizing logic was extracted in order to 
     * prevent it for running over again for each segment having the same interval. 
     * #662, #697.
     */
    Axis.prototype.normalizeTimeTickInterval = function (tickInterval, unitsOption) {
        var units = unitsOption || [[
                    MILLISECOND, // unit name
                    [1, 2, 5, 10, 20, 25, 50, 100, 200, 500] // allowed multiples
        ], [
                    SECOND,
                    [1, 2, 5, 10, 15, 30]
        ], [
                    MINUTE,
                    [1, 2, 5, 10, 15, 30]
        ], [
                    HOUR,
                    [1, 2, 3, 4, 6, 8, 12]
        ], [
                    DAY,
                    [1, 2]
        ], [
                    WEEK,
                    [1, 2]
        ], [
                    MONTH,
                    [1, 2, 3, 4, 6]
        ], [
                    YEAR,
                    null
        ]],
            unit = units[units.length - 1], // default unit is years
            interval = timeUnits[unit[0]],
            multiples = unit[1],
            count,
            i;

        // loop through the units to find the one that best fits the tickInterval
        for (i = 0; i < units.length; i++) {
            unit = units[i];
            interval = timeUnits[unit[0]];
            multiples = unit[1];


            if (units[i + 1]) {
                // lessThan is in the middle between the highest multiple and the next unit.
                var lessThan = (interval * multiples[multiples.length - 1] +
                            timeUnits[units[i + 1][0]]) / 2;

                // break and keep the current unit
                if (tickInterval <= lessThan) {
                    break;
                }
            }
        }

        // prevent 2.5 years intervals, though 25, 250 etc. are allowed
        if (interval === timeUnits[YEAR] && tickInterval < 5 * interval) {
            multiples = [1, 2, 5];
        }

        // get the count
        count = normalizeTickInterval(
            tickInterval / interval,
            multiples,
            unit[0] === YEAR ? mathMax(getMagnitude(tickInterval / interval), 1) : 1 // #1913, #2360
        );

        return {
            unitRange: interval,
            count: count,
            unitName: unit[0]
        };
    };/**
 * Methods defined on the Axis prototype
 */

    /**
     * Set the tick positions of a logarithmic axis
     */
    Axis.prototype.getLogTickPositions = function (interval, min, max, minor) {
        var axis = this,
            options = axis.options,
            axisLength = axis.len,
            // Since we use this method for both major and minor ticks,
            // use a local variable and return the result
            positions = [];

        // Reset
        if (!minor) {
            axis._minorAutoInterval = null;
        }

        // First case: All ticks fall on whole logarithms: 1, 10, 100 etc.
        if (interval >= 0.5) {
            interval = mathRound(interval);
            positions = axis.getLinearTickPositions(interval, min, max);

            // Second case: We need intermediary ticks. For example 
            // 1, 2, 4, 6, 8, 10, 20, 40 etc. 
        } else if (interval >= 0.08) {
            var roundedMin = mathFloor(min),
                intermediate,
                i,
                j,
                len,
                pos,
                lastPos,
                break2;

            if (interval > 0.3) {
                intermediate = [1, 2, 4];
            } else if (interval > 0.15) { // 0.2 equals five minor ticks per 1, 10, 100 etc
                intermediate = [1, 2, 4, 6, 8];
            } else { // 0.1 equals ten minor ticks per 1, 10, 100 etc
                intermediate = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            }

            for (i = roundedMin; i < max + 1 && !break2; i++) {
                len = intermediate.length;
                for (j = 0; j < len && !break2; j++) {
                    pos = log2lin(lin2log(i) * intermediate[j]);

                    if (pos > min && (!minor || lastPos <= max)) { // #1670
                        positions.push(lastPos);
                    }

                    if (lastPos > max) {
                        break2 = true;
                    }
                    lastPos = pos;
                }
            }

            // Third case: We are so deep in between whole logarithmic values that
            // we might as well handle the tick positions like a linear axis. For
            // example 1.01, 1.02, 1.03, 1.04.
        } else {
            var realMin = lin2log(min),
                realMax = lin2log(max),
                tickIntervalOption = options[minor ? 'minorTickInterval' : 'tickInterval'],
                filteredTickIntervalOption = tickIntervalOption === 'auto' ? null : tickIntervalOption,
                tickPixelIntervalOption = options.tickPixelInterval / (minor ? 5 : 1),
                totalPixelLength = minor ? axisLength / axis.tickPositions.length : axisLength;

            interval = pick(
                filteredTickIntervalOption,
                axis._minorAutoInterval,
                (realMax - realMin) * tickPixelIntervalOption / (totalPixelLength || 1)
            );

            interval = normalizeTickInterval(
                interval,
                null,
                getMagnitude(interval)
            );

            positions = map(axis.getLinearTickPositions(
                interval,
                realMin,
                realMax
            ), log2lin);

            if (!minor) {
                axis._minorAutoInterval = interval / 5;
            }
        }

        // Set the axis-level tickInterval variable 
        if (!minor) {
            axis.tickInterval = interval;
        }
        return positions;
    };/**
 * The tooltip object
 * @param {Object} chart The chart instance
 * @param {Object} options Tooltip options
 */
    var Tooltip = Highcharts.Tooltip = function () {
        this.init.apply(this, arguments);
    };

    Tooltip.prototype = {

        init: function (chart, options) {

            var borderWidth = options.borderWidth,
                style = options.style,
                padding = pInt(style.padding);

            // Save the chart and options
            this.chart = chart;
            this.options = options;

            // Keep track of the current series
            //this.currentSeries = UNDEFINED;

            // List of crosshairs
            this.crosshairs = [];

            // Current values of x and y when animating
            this.now = { x: 0, y: 0 };

            // The tooltip is initially hidden
            this.isHidden = true;


            // create the label
            this.label = chart.renderer.label('', 0, 0, options.shape, null, null, options.useHTML, null, 'tooltip')
                .attr({
                    padding: padding,
                    fill: options.backgroundColor,
                    'stroke-width': borderWidth,
                    r: options.borderRadius,
                    zIndex: 8
                })
                .css(style)
                .css({ padding: 0 }) // Remove it from VML, the padding is applied as an attribute instead (#1117)
                .add()
                .attr({ y: -9999 }); // #2301, #2657

            // When using canVG the shadow shows up as a gray circle
            // even if the tooltip is hidden.
            if (!useCanVG) {
                this.label.shadow(options.shadow);
            }

            // Public property for getting the shared state.
            this.shared = options.shared;
        },

        /**
         * Destroy the tooltip and its elements.
         */
        destroy: function () {
            // Destroy and clear local variables
            if (this.label) {
                this.label = this.label.destroy();
            }
            clearTimeout(this.hideTimer);
            clearTimeout(this.tooltipTimeout);
        },

        /**
         * Provide a soft movement for the tooltip
         *
         * @param {Number} x
         * @param {Number} y
         * @private
         */
        move: function (x, y, anchorX, anchorY) {
            var tooltip = this,
                now = tooltip.now,
                animate = tooltip.options.animation !== false && !tooltip.isHidden;

            // get intermediate values for animation
            extend(now, {
                x: animate ? (2 * now.x + x) / 3 : x,
                y: animate ? (now.y + y) / 2 : y,
                anchorX: animate ? (2 * now.anchorX + anchorX) / 3 : anchorX,
                anchorY: animate ? (now.anchorY + anchorY) / 2 : anchorY
            });

            // move to the intermediate value
            tooltip.label.attr(now);


            // run on next tick of the mouse tracker
            if (animate && (mathAbs(x - now.x) > 1 || mathAbs(y - now.y) > 1)) {

                // never allow two timeouts
                clearTimeout(this.tooltipTimeout);

                // set the fixed interval ticking for the smooth tooltip
                this.tooltipTimeout = setTimeout(function () {
                    // The interval function may still be running during destroy, so check that the chart is really there before calling.
                    if (tooltip) {
                        tooltip.move(x, y, anchorX, anchorY);
                    }
                }, 32);

            }
        },

        /**
         * Hide the tooltip
         */
        hide: function () {
            var tooltip = this,
                hoverPoints;

            clearTimeout(this.hideTimer); // disallow duplicate timers (#1728, #1766)
            if (!this.isHidden) {
                hoverPoints = this.chart.hoverPoints;

                this.hideTimer = setTimeout(function () {
                    tooltip.label.fadeOut();
                    tooltip.isHidden = true;
                }, pick(this.options.hideDelay, 500));

                // hide previous hoverPoints and set new
                if (hoverPoints) {
                    each(hoverPoints, function (point) {
                        point.setState();
                    });
                }

                this.chart.hoverPoints = null;
            }
        },

        /** 
         * Extendable method to get the anchor position of the tooltip
         * from a point or set of points
         */
        getAnchor: function (points, mouseEvent) {
            var ret,
                chart = this.chart,
                inverted = chart.inverted,
                plotTop = chart.plotTop,
                plotX = 0,
                plotY = 0,
                yAxis;

            points = splat(points);

            // Pie uses a special tooltipPos
            ret = points[0].tooltipPos;

            // When tooltip follows mouse, relate the position to the mouse
            if (this.followPointer && mouseEvent) {
                if (mouseEvent.chartX === UNDEFINED) {
                    mouseEvent = chart.pointer.normalize(mouseEvent);
                }
                ret = [
                    mouseEvent.chartX - chart.plotLeft,
                    mouseEvent.chartY - plotTop
                ];
            }
            // When shared, use the average position
            if (!ret) {
                each(points, function (point) {
                    yAxis = point.series.yAxis;
                    plotX += point.plotX;
                    plotY += (point.plotLow ? (point.plotLow + point.plotHigh) / 2 : point.plotY) +
                        (!inverted && yAxis ? yAxis.top - plotTop : 0); // #1151
                });

                plotX /= points.length;
                plotY /= points.length;

                ret = [
                    inverted ? chart.plotWidth - plotY : plotX,
                    this.shared && !inverted && points.length > 1 && mouseEvent ?
                        mouseEvent.chartY - plotTop : // place shared tooltip next to the mouse (#424)
                        inverted ? chart.plotHeight - plotX : plotY
                ];
            }

            return map(ret, mathRound);
        },

        /**
         * Place the tooltip in a chart without spilling over
         * and not covering the point it self.
         */
        getPosition: function (boxWidth, boxHeight, point) {

            // Set up the variables
            var chart = this.chart,
                plotLeft = chart.plotLeft,
                plotTop = chart.plotTop,
                plotWidth = chart.plotWidth,
                plotHeight = chart.plotHeight,
                distance = pick(this.options.distance, 12),
                pointX = (isNaN(point.plotX) ? 0 : point.plotX), //#2599
                pointY = point.plotY,
                x = pointX + plotLeft + (chart.inverted ? distance : -boxWidth - distance),
                y = pointY - boxHeight + plotTop + 15, // 15 means the point is 15 pixels up from the bottom of the tooltip
                alignedRight;

            // It is too far to the left, adjust it
            if (x < 7) {
                x = plotLeft + mathMax(pointX, 0) + distance;
            }

            // Test to see if the tooltip is too far to the right,
            // if it is, move it back to be inside and then up to not cover the point.
            if ((x + boxWidth) > (plotLeft + plotWidth)) {
                x -= (x + boxWidth) - (plotLeft + plotWidth);
                y = pointY - boxHeight + plotTop - distance;
                alignedRight = true;
            }

            // If it is now above the plot area, align it to the top of the plot area
            if (y < plotTop + 5) {
                y = plotTop + 5;

                // If the tooltip is still covering the point, move it below instead
                if (alignedRight && pointY >= y && pointY <= (y + boxHeight)) {
                    y = pointY + plotTop + distance; // below
                }
            }

            // Now if the tooltip is below the chart, move it up. It's better to cover the
            // point than to disappear outside the chart. #834.
            if (y + boxHeight > plotTop + plotHeight) {
                y = mathMax(plotTop, plotTop + plotHeight - boxHeight - distance); // below
            }

            if (x < 0) { // #22072
                x = 0;
            }

            return { x: x, y: y };
        },

        /**
         * In case no user defined formatter is given, this will be used. Note that the context
         * here is an object holding point, series, x, y etc.
         */
        defaultFormatter: function (tooltip) {
            var items = this.points || splat(this),
                series = items[0].series,
                s;

            // build the header
            s = [tooltip.tooltipHeaderFormatter(items[0])];

            // build the values
            each(items, function (item) {
                series = item.series;
                s.push((series.tooltipFormatter && series.tooltipFormatter(item)) ||
                    item.point.tooltipFormatter(series.tooltipOptions.pointFormat));
            });

            // footer
            s.push(tooltip.options.footerFormat || '');

            return s.join('');
        },

        /**
         * Refresh the tooltip's text and position.
         * @param {Object} point
         */
        refresh: function (point, mouseEvent) {
            var tooltip = this,
                chart = tooltip.chart,
                label = tooltip.label,
                options = tooltip.options,
                x,
                y,
                anchor,
                textConfig = {},
                text,
                pointConfig = [],
                formatter = options.formatter || tooltip.defaultFormatter,
                hoverPoints = chart.hoverPoints,
                borderColor,
                shared = tooltip.shared,
                currentSeries;

            clearTimeout(this.hideTimer);

            // get the reference point coordinates (pie charts use tooltipPos)
            tooltip.followPointer = splat(point)[0].series.tooltipOptions.followPointer;
            anchor = tooltip.getAnchor(point, mouseEvent);
            x = anchor[0];
            y = anchor[1];

            // shared tooltip, array is sent over
            if (shared && !(point.series && point.series.noSharedTooltip)) {

                // hide previous hoverPoints and set new

                chart.hoverPoints = point;
                if (hoverPoints) {
                    each(hoverPoints, function (point) {
                        point.setState();
                    });
                }

                each(point, function (item) {
                    item.setState(HOVER_STATE);

                    pointConfig.push(item.getLabelConfig());
                });

                textConfig = {
                    x: point[0].category,
                    y: point[0].y
                };
                textConfig.points = pointConfig;
                point = point[0];

                // single point tooltip
            } else {
                textConfig = point.getLabelConfig();
            }
            text = formatter.call(textConfig, tooltip);

            // register the current series
            currentSeries = point.series;

            // update the inner HTML
            if (text === false) {
                this.hide();
            } else {

                // show it
                if (tooltip.isHidden) {
                    stop(label);
                    label.attr('opacity', 1).show();
                }

                // update text
                label.attr({
                    text: text
                });

                // set the stroke color of the box
                borderColor = options.borderColor || point.color || currentSeries.color || '#606060';
                label.attr({
                    stroke: borderColor
                });

                tooltip.updatePosition({ plotX: x, plotY: y });

                this.isHidden = false;
            }
            fireEvent(chart, 'tooltipRefresh', {
                text: text,
                x: x + chart.plotLeft,
                y: y + chart.plotTop,
                borderColor: borderColor
            });
        },

        /**
         * Find the new position and perform the move
         */
        updatePosition: function (point) {
            var chart = this.chart,
                label = this.label,
                pos = (this.options.positioner || this.getPosition).call(
                    this,
                    label.width,
                    label.height,
                    point
                );

            // do the move
            this.move(
                mathRound(pos.x),
                mathRound(pos.y),
                point.plotX + chart.plotLeft,
                point.plotY + chart.plotTop
            );
        },


        /**
         * Format the header of the tooltip
         */
        tooltipHeaderFormatter: function (point) {
            var series = point.series,
                tooltipOptions = series.tooltipOptions,
                dateTimeLabelFormats = tooltipOptions.dateTimeLabelFormats,
                xDateFormat = tooltipOptions.xDateFormat,
                xAxis = series.xAxis,
                isDateTime = xAxis && xAxis.options.type === 'datetime' && isNumber(point.key),
                headerFormat = tooltipOptions.headerFormat,
                closestPointRange = xAxis && xAxis.closestPointRange,
                n;

            // Guess the best date format based on the closest point distance (#568)
            if (isDateTime && !xDateFormat) {
                if (closestPointRange) {
                    for (n in timeUnits) {
                        if (timeUnits[n] >= closestPointRange ||
                            // If the point is placed every day at 23:59, we need to show
                            // the minutes as well. This logic only works for time units less than 
                            // a day, since all higher time units are dividable by those. #2637.
                                (timeUnits[n] <= timeUnits[DAY] && point.key % timeUnits[n] > 0)) {
                            xDateFormat = dateTimeLabelFormats[n];
                            break;
                        }
                    }
                } else {
                    xDateFormat = dateTimeLabelFormats.day;
                }

                xDateFormat = xDateFormat || dateTimeLabelFormats.year; // #2546, 2581

            }

            // Insert the header date format if any
            if (isDateTime && xDateFormat) {
                headerFormat = headerFormat.replace('{point.key}', '{point.key:' + xDateFormat + '}');
            }

            return format(headerFormat, {
                point: point,
                series: series
            });
        }
    };

    var hoverChartIndex;

    // Global flag for touch support
    hasTouch = doc.documentElement.ontouchstart !== UNDEFINED;

    /**
     * The mouse tracker object. All methods starting with "on" are primary DOM event handlers. 
     * Subsequent methods should be named differently from what they are doing.
     * @param {Object} chart The Chart instance
     * @param {Object} options The root options object
     */
    var Pointer = Highcharts.Pointer = function (chart, options) {
        this.init(chart, options);
    };

    Pointer.prototype = {
        /**
         * Initialize Pointer
         */
        init: function (chart, options) {

            var chartOptions = options.chart,
                chartEvents = chartOptions.events,
                zoomType = useCanVG ? '' : chartOptions.zoomType,
                inverted = chart.inverted,
                zoomX,
                zoomY;

            // Store references
            this.options = options;
            this.chart = chart;

            // Zoom status
            this.zoomX = zoomX = /x/.test(zoomType);
            this.zoomY = zoomY = /y/.test(zoomType);
            this.zoomHor = (zoomX && !inverted) || (zoomY && inverted);
            this.zoomVert = (zoomY && !inverted) || (zoomX && inverted);

            // Do we need to handle click on a touch device?
            this.runChartClick = chartEvents && !!chartEvents.click;

            this.pinchDown = [];
            this.lastValidTouch = {};

            if (Highcharts.Tooltip && options.tooltip.enabled) {
                chart.tooltip = new Tooltip(chart, options.tooltip);
            }

            this.setDOMEvents();
        },

        /**
         * Add crossbrowser support for chartX and chartY
         * @param {Object} e The event object in standard browsers
         */
        normalize: function (e, chartPosition) {
            var chartX,
                chartY,
                ePos;

            // common IE normalizing
            e = e || win.event;

            // Framework specific normalizing (#1165)
            e = washMouseEvent(e);

            // More IE normalizing, needs to go after washMouseEvent
            if (!e.target) {
                e.target = e.srcElement;
            }

            // iOS
            ePos = e.touches ? e.touches.item(0) : e;

            // Get mouse position
            if (!chartPosition) {
                this.chartPosition = chartPosition = offset(this.chart.container);
            }

            // chartX and chartY
            if (ePos.pageX === UNDEFINED) { // IE < 9. #886.
                chartX = mathMax(e.x, e.clientX - chartPosition.left); // #2005, #2129: the second case is 
                // for IE10 quirks mode within framesets
                chartY = e.y;
            } else {
                chartX = ePos.pageX - chartPosition.left;
                chartY = ePos.pageY - chartPosition.top;
            }

            return extend(e, {
                chartX: mathRound(chartX),
                chartY: mathRound(chartY)
            });
        },

        /**
         * Get the click position in terms of axis values.
         *
         * @param {Object} e A pointer event
         */
        getCoordinates: function (e) {
            var coordinates = {
                xAxis: [],
                yAxis: []
            };

            each(this.chart.axes, function (axis) {
                coordinates[axis.isXAxis ? 'xAxis' : 'yAxis'].push({
                    axis: axis,
                    value: axis.toValue(e[axis.horiz ? 'chartX' : 'chartY'])
                });
            });
            return coordinates;
        },

        /**
         * Return the index in the tooltipPoints array, corresponding to pixel position in 
         * the plot area.
         */
        getIndex: function (e) {
            var chart = this.chart;
            return chart.inverted ?
                chart.plotHeight + chart.plotTop - e.chartY :
                e.chartX - chart.plotLeft;
        },

        /**
         * With line type charts with a single tracker, get the point closest to the mouse.
         * Run Point.onMouseOver and display tooltip for the point or points.
         */
        runPointActions: function (e) {
            var pointer = this,
                chart = pointer.chart,
                series = chart.series,
                tooltip = chart.tooltip,
                point,
                points,
                hoverPoint = chart.hoverPoint,
                hoverSeries = chart.hoverSeries,
                i,
                j,
                distance = chart.chartWidth,
                index = pointer.getIndex(e),
                anchor;

            // shared tooltip
            if (tooltip && pointer.options.tooltip.shared && !(hoverSeries && hoverSeries.noSharedTooltip)) {
                points = [];

                // loop over all series and find the ones with points closest to the mouse
                i = series.length;
                for (j = 0; j < i; j++) {
                    if (series[j].visible &&
                            series[j].options.enableMouseTracking !== false &&
                            !series[j].noSharedTooltip && series[j].singularTooltips !== true && series[j].tooltipPoints.length) {
                        point = series[j].tooltipPoints[index];
                        if (point && point.series) { // not a dummy point, #1544
                            point._dist = mathAbs(index - point.clientX);
                            distance = mathMin(distance, point._dist);
                            points.push(point);
                        }
                    }
                }
                // remove furthest points
                i = points.length;
                while (i--) {
                    if (points[i]._dist > distance) {
                        points.splice(i, 1);
                    }
                }
                // refresh the tooltip if necessary
                if (points.length && (points[0].clientX !== pointer.hoverX)) {
                    tooltip.refresh(points, e);
                    pointer.hoverX = points[0].clientX;
                }
            }

            // separate tooltip and general mouse events
            if (hoverSeries && hoverSeries.tracker && (!tooltip || !tooltip.followPointer)) { // only use for line-type series with common tracker and while not following the pointer #2584

                // get the point
                point = hoverSeries.tooltipPoints[index];

                // a new point is hovered, refresh the tooltip
                if (point && point !== hoverPoint) {

                    // trigger the events
                    point.onMouseOver(e);

                }

            } else if (tooltip && tooltip.followPointer && !tooltip.isHidden) {
                anchor = tooltip.getAnchor([{}], e);
                tooltip.updatePosition({ plotX: anchor[0], plotY: anchor[1] });
            }

            // Start the event listener to pick up the tooltip 
            if (tooltip && !pointer._onDocumentMouseMove) {
                pointer._onDocumentMouseMove = function (e) {
                    //LOGIFIX
                    // 21164 Side Label Style element
                    if (defined(hoverChartIndex) && charts[hoverChartIndex] && charts[hoverChartIndex].pointer) {
                        charts[hoverChartIndex].pointer.onDocumentMouseMove(e);
                    }
                };
                addEvent(doc, 'mousemove', pointer._onDocumentMouseMove);
            }

            // Draw independent crosshairs
            each(chart.axes, function (axis) {
                //LOGIFIX -> Fails in ie7/8
                // 21569 Js error in IE7/8
                if (axis && axis.drawCrosshair) {
                    axis.drawCrosshair(e, pick(point, hoverPoint));
                }
            });
        },



        /**
         * Reset the tracking by hiding the tooltip, the hover series state and the hover point
         * 
         * @param allowMove {Boolean} Instead of destroying the tooltip altogether, allow moving it if possible
         */
        reset: function (allowMove) {
            var pointer = this,
                chart = pointer.chart,
                hoverSeries = chart.hoverSeries,
                hoverPoint = chart.hoverPoint,
                tooltip = chart.tooltip,
                tooltipPoints = tooltip && tooltip.shared ? chart.hoverPoints : hoverPoint;

            // Narrow in allowMove
            allowMove = allowMove && tooltip && tooltipPoints;

            // Check if the points have moved outside the plot area, #1003
            if (allowMove && splat(tooltipPoints)[0].plotX === UNDEFINED) {
                allowMove = false;
            }

            // Just move the tooltip, #349
            if (allowMove) {
                tooltip.refresh(tooltipPoints);
                if (hoverPoint) { // #2500
                    hoverPoint.setState(hoverPoint.state, true);
                }

                // Full reset
            } else {

                if (hoverPoint) {
                    hoverPoint.onMouseOut();
                }

                if (hoverSeries) {
                    hoverSeries.onMouseOut();
                }

                if (tooltip) {
                    tooltip.hide();
                }

                if (pointer._onDocumentMouseMove) {
                    removeEvent(doc, 'mousemove', pointer._onDocumentMouseMove);
                    pointer._onDocumentMouseMove = null;
                }

                // Remove crosshairs
                each(chart.axes, function (axis) {
                    axis.hideCrosshair();
                });

                pointer.hoverX = null;

            }
        },

        /**
         * Scale series groups to a certain scale and translation
         */
        scaleGroups: function (attribs, clip) {

            var chart = this.chart,
                seriesAttribs;

            // Scale each series
            each(chart.series, function (series) {
                seriesAttribs = attribs || series.getPlotBox(); // #1701
                if (series.xAxis && series.xAxis.zoomEnabled) {
                    series.group.attr(seriesAttribs);
                    if (series.markerGroup) {
                        series.markerGroup.attr(seriesAttribs);
                        series.markerGroup.clip(clip ? chart.clipRect : null);
                    }
                    if (series.dataLabelsGroup) {
                        series.dataLabelsGroup.attr(seriesAttribs);
                    }
                }
            });

            // Clip
            chart.clipRect.attr(clip || chart.clipBox);
        },

        /**
         * Start a drag operation
         */
        dragStart: function (e) {
            var chart = this.chart;

            // Record the start position
            chart.mouseIsDown = e.type;
            chart.cancelClick = false;
            chart.mouseDownX = this.mouseDownX = e.chartX;
            chart.mouseDownY = this.mouseDownY = e.chartY;
        },

        /**
         * Perform a drag operation in response to a mousemove event while the mouse is down
         */
        drag: function (e) {

            var chart = this.chart,
                chartOptions = chart.options.chart,
                chartX = e.chartX,
                chartY = e.chartY,
                zoomHor = this.zoomHor,
                zoomVert = this.zoomVert,
                plotLeft = chart.plotLeft,
                plotTop = chart.plotTop,
                plotWidth = chart.plotWidth,
                plotHeight = chart.plotHeight,
                clickedInside,
                size,
                mouseDownX = this.mouseDownX,
                mouseDownY = this.mouseDownY;

            // If the mouse is outside the plot area, adjust to cooordinates
            // inside to prevent the selection marker from going outside
            if (chartX < plotLeft) {
                chartX = plotLeft;
            } else if (chartX > plotLeft + plotWidth) {
                chartX = plotLeft + plotWidth;
            }

            if (chartY < plotTop) {
                chartY = plotTop;
            } else if (chartY > plotTop + plotHeight) {
                chartY = plotTop + plotHeight;
            }

            // determine if the mouse has moved more than 10px
            this.hasDragged = Math.sqrt(
                Math.pow(mouseDownX - chartX, 2) +
                Math.pow(mouseDownY - chartY, 2)
            );

            if (this.hasDragged > 10) {
                clickedInside = chart.isInsidePlot(mouseDownX - plotLeft, mouseDownY - plotTop);

                // make a selection
                if (chart.hasCartesianSeries && (this.zoomX || this.zoomY) && clickedInside) {
                    if (!this.selectionMarker) {
                        this.selectionMarker = chart.renderer.rect(
                            plotLeft,
                            plotTop,
                            zoomHor ? 1 : plotWidth,
                            zoomVert ? 1 : plotHeight,
                            0
                        )
                        .attr({
                            fill: chartOptions.selectionMarkerFill || 'rgba(69,114,167,0.25)',
                            zIndex: 7
                        })
                        .add();
                        //LOGIFIX for chart selection
                        // Mask selection
                        fireEvent(this.chart, 'selectionStarted');
                    }
                }

                // adjust the width of the selection marker
                if (this.selectionMarker && zoomHor) {
                    size = chartX - mouseDownX;
                    this.selectionMarker.attr({
                        width: mathAbs(size),
                        x: (size > 0 ? 0 : size) + mouseDownX
                    });
                }
                // adjust the height of the selection marker
                if (this.selectionMarker && zoomVert) {
                    size = chartY - mouseDownY;
                    this.selectionMarker.attr({
                        height: mathAbs(size),
                        y: (size > 0 ? 0 : size) + mouseDownY
                    });
                }

                // panning
                if (clickedInside && !this.selectionMarker && chartOptions.panning) {
                    chart.pan(e, chartOptions.panning);
                }
            }
        },

        /**
         * On mouse up or touch end across the entire document, drop the selection.
         */
        drop: function (e) {
            var chart = this.chart,
                hasPinched = this.hasPinched;

            if (this.selectionMarker) {
                var selectionData = {
                    xAxis: [],
                    yAxis: [],
                    originalEvent: e.originalEvent || e,
                    //LOGIFIX
                    // Mask selection
                    selectionBox: {
                        x: this.selectionMarker.x,
                        y: this.selectionMarker.y,
                        height: this.selectionMarker.height,
                        width: this.selectionMarker.width
                    }
                },
                    selectionBox = this.selectionMarker,
                    selectionLeft = selectionBox.x,
                    selectionTop = selectionBox.y,
                    runZoom;
                // a selection has been made
                if (this.hasDragged || hasPinched) {

                    // record each axis' min and max
                    each(chart.axes, function (axis) {
                        if (axis.zoomEnabled) {
                            var horiz = axis.horiz,
                                selectionMin = axis.toValue((horiz ? selectionLeft : selectionTop)),
                                selectionMax = axis.toValue((horiz ? selectionLeft + selectionBox.width : selectionTop + selectionBox.height));

                            if (!isNaN(selectionMin) && !isNaN(selectionMax)) { // #859
                                selectionData[axis.coll].push({
                                    axis: axis,
                                    min: mathMin(selectionMin, selectionMax), // for reversed axes,
                                    max: mathMax(selectionMin, selectionMax)
                                });
                                runZoom = true;
                            }
                        }
                    });
                    if (runZoom) {
                        fireEvent(chart, 'selection', selectionData, function (args) {
                            chart.zoom(extend(args, hasPinched ? { animation: false } : null));
                        });
                    }

                }
                this.selectionMarker = this.selectionMarker.destroy();

                // Reset scaling preview
                if (hasPinched) {
                    this.scaleGroups();
                }
            }

            // Reset all
            if (chart) { // it may be destroyed on mouse up - #877
                css(chart.container, { cursor: chart._cursor });
                chart.cancelClick = this.hasDragged > 10; // #370
                chart.mouseIsDown = this.hasDragged = this.hasPinched = false;
                this.pinchDown = [];
            }
        },

        onContainerMouseDown: function (e) {

            e = this.normalize(e);

            // issue #295, dragging not always working in Firefox
            if (e.preventDefault) {
                e.preventDefault();
            }

            this.dragStart(e);
        },



        onDocumentMouseUp: function (e) {
            if (defined(hoverChartIndex)) {
                //LOGIFIX
                // 21559, 21558, 21556: InputSelection enhancement
                if (charts[hoverChartIndex] && charts[hoverChartIndex].pointer) {
                    charts[hoverChartIndex].pointer.drop(e);
                }
            }
        },

        /**
         * Special handler for mouse move that will hide the tooltip when the mouse leaves the plotarea.
         * Issue #149 workaround. The mouseleave event does not always fire. 
         */
        onDocumentMouseMove: function (e) {
            var chart = this.chart,
                chartPosition = this.chartPosition,
                hoverSeries = chart.hoverSeries;

            e = this.normalize(e, chartPosition);

            // If we're outside, hide the tooltip
            if (chartPosition && hoverSeries && !this.inClass(e.target, 'highcharts-tracker') &&
                    !chart.isInsidePlot(e.chartX - chart.plotLeft, e.chartY - chart.plotTop)) {
                this.reset();
            }
        },

        /**
         * When mouse leaves the container, hide the tooltip.
         */
        onContainerMouseLeave: function () {
            var chart = charts[hoverChartIndex];
            if (chart) {
                chart.pointer.reset();
                chart.pointer.chartPosition = null; // also reset the chart position, used in #149 fix
            }
            hoverChartIndex = null;
        },

        // The mousemove, touchmove and touchstart event handler
        onContainerMouseMove: function (e) {

            var chart = this.chart;

            hoverChartIndex = chart.index;

            // normalize
            e = this.normalize(e);
            //LOGIFIX for custom selection
            // chart selection #7
            if (chart.mouseIsDown === 'mousedown' || chart.mouseIsDown === 'touchstart') {
                this.drag(e);
            }

            // Show the tooltip and run mouse over events (#977)
            if ((this.inClass(e.target, 'highcharts-tracker') ||
                    chart.isInsidePlot(e.chartX - chart.plotLeft, e.chartY - chart.plotTop)) && !chart.openMenu) {
                this.runPointActions(e);
            }
        },

        /**
         * Utility to detect whether an element has, or has a parent with, a specific
         * class name. Used on detection of tracker objects and on deciding whether
         * hovering the tooltip should cause the active series to mouse out.
         */
        inClass: function (element, className) {
            var elemClassName;
            while (element) {
                elemClassName = attr(element, 'class');
                if (elemClassName) {
                    if (elemClassName.indexOf(className) !== -1) {
                        return true;
                    } else if (elemClassName.indexOf(PREFIX + 'container') !== -1) {
                        return false;
                    }
                }
                element = element.parentNode;
            }
        },

        onTrackerMouseOut: function (e) {
            var series = this.chart.hoverSeries,
                relatedTarget = e.relatedTarget || e.toElement,
                relatedSeries;
            //LOGIFIX relatedSeries = relatedTarget.point && relatedTarget.point.series; 
            // 20921: ChartCanvas: JS error when mouse out of chart, caused by new ver of Highcharts
            if (relatedTarget && relatedTarget.point) {
                relatedSeries = relatedTarget.point && relatedTarget.point.series; // #2499
            }
            //LOGIFIX
            // 20921: ChartCanvas: JS error when mouse out of chart, caused by new ver of Highcharts
            if (relatedTarget && series && !series.options.stickyTracking && !this.inClass(relatedTarget, PREFIX + 'tooltip') &&
                    relatedSeries !== series) {
                series.onMouseOut();
            }
        },

        onContainerClick: function (e) {
            var chart = this.chart,
                hoverPoint = chart.hoverPoint,
                plotLeft = chart.plotLeft,
                plotTop = chart.plotTop,
                inverted = chart.inverted,
                chartPosition,
                plotX,
                plotY;

            e = this.normalize(e);
            e.cancelBubble = true; // IE specific

            if (!chart.cancelClick) {

                // On tracker click, fire the series and point events. #783, #1583
                if (hoverPoint && this.inClass(e.target, PREFIX + 'tracker')) {
                    chartPosition = this.chartPosition;
                    plotX = hoverPoint.plotX;
                    plotY = hoverPoint.plotY;

                    // add page position info
                    extend(hoverPoint, {
                        pageX: chartPosition.left + plotLeft +
                            (inverted ? chart.plotWidth - plotY : plotX),
                        pageY: chartPosition.top + plotTop +
                            (inverted ? chart.plotHeight - plotX : plotY)
                    });

                    // the series click event
                    fireEvent(hoverPoint.series, 'click', extend(e, {
                        point: hoverPoint
                    }));

                    // the point click event
                    if (chart.hoverPoint) { // it may be destroyed (#1844)
                        hoverPoint.firePointEvent('click', e);
                    }

                    // When clicking outside a tracker, fire a chart event
                } else {
                    extend(e, this.getCoordinates(e));

                    // fire a click event in the chart
                    if (chart.isInsidePlot(e.chartX - plotLeft, e.chartY - plotTop)) {
                        fireEvent(chart, 'click', e);
                    }
                }


            }
        },

        /**
         * Set the JS DOM events on the container and document. This method should contain
         * a one-to-one assignment between methods and their handlers. Any advanced logic should
         * be moved to the handler reflecting the event's name.
         */
        setDOMEvents: function () {

            var pointer = this,
                container = pointer.chart.container;

            container.onmousedown = function (e) {
                pointer.onContainerMouseDown(e);
            };
            container.onmousemove = function (e) {
                pointer.onContainerMouseMove(e);
            };
            container.onclick = function (e) {
                pointer.onContainerClick(e);
            };
            addEvent(container, 'mouseleave', pointer.onContainerMouseLeave);
            addEvent(doc, 'mouseup', pointer.onDocumentMouseUp);

            if (hasTouch) {
                container.ontouchstart = function (e) {
                    pointer.onContainerTouchStart(e);
                };
                container.ontouchmove = function (e) {
                    pointer.onContainerTouchMove(e);
                };
                addEvent(doc, 'touchend', pointer.onDocumentTouchEnd);
            }

        },

        /**
         * Destroys the Pointer object and disconnects DOM events.
         */
        destroy: function () {
            var prop;

            removeEvent(this.chart.container, 'mouseleave', this.onContainerMouseLeave);
            removeEvent(doc, 'mouseup', this.onDocumentMouseUp);
            removeEvent(doc, 'touchend', this.onDocumentTouchEnd);

            // memory and CPU leak
            clearInterval(this.tooltipTimeout);

            for (prop in this) {
                this[prop] = null;
            }
        }
    };


    /* Support for touch devices */
    extend(Highcharts.Pointer.prototype, {

        /**
         * Run translation operations
         */
        pinchTranslate: function (zoomHor, zoomVert, pinchDown, touches, transform, selectionMarker, clip, lastValidTouch) {
            if (zoomHor) {
                this.pinchTranslateDirection(true, pinchDown, touches, transform, selectionMarker, clip, lastValidTouch);
            }
            if (zoomVert) {
                this.pinchTranslateDirection(false, pinchDown, touches, transform, selectionMarker, clip, lastValidTouch);
            }
        },

        /**
         * Run translation operations for each direction (horizontal and vertical) independently
         */
        pinchTranslateDirection: function (horiz, pinchDown, touches, transform, selectionMarker, clip, lastValidTouch, forcedScale) {
            var chart = this.chart,
                xy = horiz ? 'x' : 'y',
                XY = horiz ? 'X' : 'Y',
                sChartXY = 'chart' + XY,
                wh = horiz ? 'width' : 'height',
                plotLeftTop = chart['plot' + (horiz ? 'Left' : 'Top')],
                selectionWH,
                selectionXY,
                clipXY,
                scale = forcedScale || 1,
                inverted = chart.inverted,
                bounds = chart.bounds[horiz ? 'h' : 'v'],
                singleTouch = pinchDown.length === 1,
                touch0Start = pinchDown[0][sChartXY],
                touch0Now = touches[0][sChartXY],
                touch1Start = !singleTouch && pinchDown[1][sChartXY],
                touch1Now = !singleTouch && touches[1][sChartXY],
                outOfBounds,
                transformScale,
                scaleKey,
                setScale = function () {
                    if (!singleTouch && mathAbs(touch0Start - touch1Start) > 20) { // Don't zoom if fingers are too close on this axis
                        scale = forcedScale || mathAbs(touch0Now - touch1Now) / mathAbs(touch0Start - touch1Start);
                    }

                    clipXY = ((plotLeftTop - touch0Now) / scale) + touch0Start;
                    selectionWH = chart['plot' + (horiz ? 'Width' : 'Height')] / scale;
                };

            // Set the scale, first pass
            setScale();

            selectionXY = clipXY; // the clip position (x or y) is altered if out of bounds, the selection position is not

            // Out of bounds
            if (selectionXY < bounds.min) {
                selectionXY = bounds.min;
                outOfBounds = true;
            } else if (selectionXY + selectionWH > bounds.max) {
                selectionXY = bounds.max - selectionWH;
                outOfBounds = true;
            }

            // Is the chart dragged off its bounds, determined by dataMin and dataMax?
            if (outOfBounds) {

                // Modify the touchNow position in order to create an elastic drag movement. This indicates
                // to the user that the chart is responsive but can't be dragged further.
                touch0Now -= 0.8 * (touch0Now - lastValidTouch[xy][0]);
                if (!singleTouch) {
                    touch1Now -= 0.8 * (touch1Now - lastValidTouch[xy][1]);
                }

                // Set the scale, second pass to adapt to the modified touchNow positions
                setScale();

            } else {
                lastValidTouch[xy] = [touch0Now, touch1Now];
            }

            // Set geometry for clipping, selection and transformation
            if (!inverted) { // TODO: implement clipping for inverted charts
                clip[xy] = clipXY - plotLeftTop;
                clip[wh] = selectionWH;
            }
            scaleKey = inverted ? (horiz ? 'scaleY' : 'scaleX') : 'scale' + XY;
            transformScale = inverted ? 1 / scale : scale;

            selectionMarker[wh] = selectionWH;
            selectionMarker[xy] = selectionXY;
            transform[scaleKey] = scale;
            transform['translate' + XY] = (transformScale * plotLeftTop) + (touch0Now - (transformScale * touch0Start));
        },

        /**
         * Handle touch events with two touches
         */
        pinch: function (e) {

            var self = this,
                chart = self.chart,
                pinchDown = self.pinchDown,
                followTouchMove = chart.tooltip && chart.tooltip.options.followTouchMove,
                touches = e.touches,
                touchesLength = touches.length,
                lastValidTouch = self.lastValidTouch,
                zoomHor = self.zoomHor || self.pinchHor,
                zoomVert = self.zoomVert || self.pinchVert,
                hasZoom = zoomHor || zoomVert,
                selectionMarker = self.selectionMarker,
                transform = {},
                fireClickEvent = touchesLength === 1 && ((self.inClass(e.target, PREFIX + 'tracker') &&
                    chart.runTrackerClick) || chart.runChartClick),
                clip = {};

            // On touch devices, only proceed to trigger click if a handler is defined
            if ((hasZoom || followTouchMove) && !fireClickEvent) {
                e.preventDefault();
            }

            // Normalize each touch
            map(touches, function (e) {
                return self.normalize(e);
            });

            // Register the touch start position
            if (e.type === 'touchstart') {
                each(touches, function (e, i) {
                    pinchDown[i] = { chartX: e.chartX, chartY: e.chartY };
                });
                lastValidTouch.x = [pinchDown[0].chartX, pinchDown[1] && pinchDown[1].chartX];
                lastValidTouch.y = [pinchDown[0].chartY, pinchDown[1] && pinchDown[1].chartY];

                // Identify the data bounds in pixels
                each(chart.axes, function (axis) {
                    if (axis.zoomEnabled) {
                        var bounds = chart.bounds[axis.horiz ? 'h' : 'v'],
                            minPixelPadding = axis.minPixelPadding,
                            min = axis.toPixels(axis.dataMin),
                            max = axis.toPixels(axis.dataMax),
                            absMin = mathMin(min, max),
                            absMax = mathMax(min, max);

                        // Store the bounds for use in the touchmove handler
                        bounds.min = mathMin(axis.pos, absMin - minPixelPadding);
                        bounds.max = mathMax(axis.pos + axis.len, absMax + minPixelPadding);
                    }
                });

                // Event type is touchmove, handle panning and pinching
            } else if (pinchDown.length) { // can be 0 when releasing, if touchend fires first


                // Set the marker
                if (!selectionMarker) {
                    self.selectionMarker = selectionMarker = extend({
                        destroy: noop
                    }, chart.plotBox);
                }

                self.pinchTranslate(zoomHor, zoomVert, pinchDown, touches, transform, selectionMarker, clip, lastValidTouch);

                self.hasPinched = hasZoom;

                // Scale and translate the groups to provide visual feedback during pinching
                self.scaleGroups(transform, clip);

                // Optionally move the tooltip on touchmove
                if (!hasZoom && followTouchMove && touchesLength === 1) {
                    this.runPointActions(self.normalize(e));
                }
            }
        },

        onContainerTouchStart: function (e) {
            var chart = this.chart;

            hoverChartIndex = chart.index;

            if (e.touches.length === 1) {

                e = this.normalize(e);

                if (chart.isInsidePlot(e.chartX - chart.plotLeft, e.chartY - chart.plotTop)) {

                    // Prevent the click pseudo event from firing unless it is set in the options
                    /*if (!chart.runChartClick) {
                        e.preventDefault();
                    }*/

                    // Run mouse events and display tooltip etc
                    //LOGIFIX - for mask selection
                    if (this.options.chart.customSelection) {
                        if (e.preventDefault) {
                            e.preventDefault();
                        }
                        //clear old selection 
                        fireEvent(chart, 'click', e);
                        this.dragStart(e);
                        return;
                    } else {
                        // Run mouse events and display tooltip etc
                        this.runPointActions(e);
                        this.pinch(e);
                    }

                    this.pinch(e);

                } else {
                    // Hide the tooltip on touching outside the plot area (#1203)
                    this.reset();
                }

            } else if (e.touches.length === 2) {
                this.pinch(e);
            }
        },

        onContainerTouchMove: function (e) {
            //LOGIFIX - for mask selection
            if (this.options.chart.customSelection && e.touches.length === 1) {
                if (e.preventDefault) {
                    e.preventDefault();
                }
                this.onContainerMouseMove(e);
                return;
            }
            if (e.touches.length === 1 || e.touches.length === 2) {
                this.pinch(e);
            }
        },

        onDocumentTouchEnd: function (e) {
            if (defined(hoverChartIndex)) {
                charts[hoverChartIndex].pointer.drop(e);
            }
        }

    });
    if (win.PointerEvent || win.MSPointerEvent) {

        // The touches object keeps track of the points being touched at all times
        var touches = {},
            hasPointerEvent = !!win.PointerEvent,
            getWebkitTouches = function () {
                var key, fake = [];
                fake.item = function (i) { return this[i]; };
                for (key in touches) {
                    if (touches.hasOwnProperty(key)) {
                        fake.push({
                            pageX: touches[key].pageX,
                            pageY: touches[key].pageY,
                            target: touches[key].target
                        });
                    }
                }
                return fake;
            },
            translateMSPointer = function (e, method, wktype, callback) {
                var p;
                e = e.originalEvent || e;
                if ((e.pointerType === 'touch' || e.pointerType === e.MSPOINTER_TYPE_TOUCH) && charts[hoverChartIndex]) {
                    callback(e);
                    p = charts[hoverChartIndex].pointer;
                    p[method]({
                        type: wktype,
                        target: e.currentTarget,
                        preventDefault: noop,
                        touches: getWebkitTouches()
                    });
                }
            };

        /**
         * Extend the Pointer prototype with methods for each event handler and more
         */
        extend(Pointer.prototype, {
            onContainerPointerDown: function (e) {
                translateMSPointer(e, 'onContainerTouchStart', 'touchstart', function (e) {
                    touches[e.pointerId] = { pageX: e.pageX, pageY: e.pageY, target: e.currentTarget };
                });
            },
            onContainerPointerMove: function (e) {
                translateMSPointer(e, 'onContainerTouchMove', 'touchmove', function (e) {
                    touches[e.pointerId] = { pageX: e.pageX, pageY: e.pageY };
                    if (!touches[e.pointerId].target) {
                        touches[e.pointerId].target = e.currentTarget;
                    }
                });
            },
            onDocumentPointerUp: function (e) {
                translateMSPointer(e, 'onContainerTouchEnd', 'touchend', function (e) {
                    delete touches[e.pointerId];
                });
            },

            /**
             * Add or remove the MS Pointer specific events
             */
            batchMSEvents: function (fn) {
                fn(this.chart.container, hasPointerEvent ? 'pointerdown' : 'MSPointerDown', this.onContainerPointerDown);
                fn(this.chart.container, hasPointerEvent ? 'pointermove' : 'MSPointerMove', this.onContainerPointerMove);
                fn(doc, hasPointerEvent ? 'pointerup' : 'MSPointerUp', this.onDocumentPointerUp);
            }
        });

        // Disable default IE actions for pinch and such on chart element
        wrap(Pointer.prototype, 'init', function (proceed, chart, options) {
            css(chart.container, {
                '-ms-touch-action': NONE,
                'touch-action': NONE
            });
            proceed.call(this, chart, options);
        });

        // Add IE specific touch events to chart
        wrap(Pointer.prototype, 'setDOMEvents', function (proceed) {
            proceed.apply(this);
            this.batchMSEvents(addEvent);
        });
        // Destroy MS events also
        wrap(Pointer.prototype, 'destroy', function (proceed) {
            this.batchMSEvents(removeEvent);
            proceed.call(this);
        });
    }
    /**
     * The overview of the chart's series
     */
    var Legend = Highcharts.Legend = function (chart, options) {
        this.init(chart, options);
    };

    Legend.prototype = {

        /**
         * Initialize the legend
         */
        init: function (chart, options) {

            var legend = this,
                itemStyle = options.itemStyle,
                padding = pick(options.padding, 8),
                itemMarginTop = options.itemMarginTop || 0;

            this.options = options;

            if (!options.enabled) {
                return;
            }

            legend.baseline = pInt(itemStyle.fontSize) + 3 + itemMarginTop; // used in Series prototype
            legend.itemStyle = itemStyle;
            legend.itemHiddenStyle = merge(itemStyle, options.itemHiddenStyle);
            legend.itemMarginTop = itemMarginTop;
            legend.padding = padding;
            legend.initialItemX = padding;
            legend.initialItemY = padding - 5; // 5 is the number of pixels above the text
            legend.maxItemWidth = 0;
            legend.chart = chart;
            legend.itemHeight = 0;
            legend.lastLineHeight = 0;
            legend.symbolWidth = pick(options.symbolWidth, 16);
            legend.pages = [];


            // Render it
            legend.render();

            // move checkboxes
            addEvent(legend.chart, 'endResize', function () {
                legend.positionCheckboxes();
            });

        },

        /**
         * Set the colors for the legend item
         * @param {Object} item A Series or Point instance
         * @param {Object} visible Dimmed or colored
         */
        colorizeItem: function (item, visible) {
            var legend = this,
                options = legend.options,
                legendItem = item.legendItem,
                legendLine = item.legendLine,
                legendSymbol = item.legendSymbol,
                hiddenColor = legend.itemHiddenStyle.color,
                textColor = visible ? options.itemStyle.color : hiddenColor,
                symbolColor = visible ? (item.legendColor || item.color || '#CCC') : hiddenColor,
                markerOptions = item.options && item.options.marker,
                symbolAttr = {
                    stroke: symbolColor,
                    fill: symbolColor
                },
                key,
                val;

            if (legendItem) {
                legendItem.css({ fill: textColor, color: textColor }); // color for #1553, oldIE
            }
            if (legendLine) {
                legendLine.attr({ stroke: symbolColor });
            }

            if (legendSymbol) {

                // Apply marker options
                if (markerOptions && legendSymbol.isMarker) { // #585
                    markerOptions = item.convertAttribs(markerOptions);
                    for (key in markerOptions) {
                        val = markerOptions[key];
                        if (val !== UNDEFINED) {
                            symbolAttr[key] = val;
                        }
                    }
                }

                legendSymbol.attr(symbolAttr);
            }
        },

        /**
         * Position the legend item
         * @param {Object} item A Series or Point instance
         */
        positionItem: function (item) {
            var legend = this,
                options = legend.options,
                symbolPadding = options.symbolPadding,
                ltr = !options.rtl,
                legendItemPos = item._legendItemPos,
                itemX = legendItemPos[0],
                itemY = legendItemPos[1],
                checkbox = item.checkbox;

            if (item.legendGroup) {
                item.legendGroup.translate(
                    ltr ? itemX : legend.legendWidth - itemX - 2 * symbolPadding - 4,
                    itemY
                );
            }

            if (checkbox) {
                checkbox.x = itemX;
                checkbox.y = itemY;
            }
        },

        /**
         * Destroy a single legend item
         * @param {Object} item The series or point
         */
        destroyItem: function (item) {
            var checkbox = item.checkbox;

            // destroy SVG elements
            each(['legendItem', 'legendLine', 'legendSymbol', 'legendGroup'], function (key) {
                if (item[key]) {
                    item[key] = item[key].destroy();
                }
            });

            if (checkbox) {
                discardElement(item.checkbox);
            }
        },

        /**
         * Destroys the legend.
         */
        destroy: function () {
            var legend = this,
                legendGroup = legend.group,
                box = legend.box;

            if (box) {
                legend.box = box.destroy();
            }

            if (legendGroup) {
                legend.group = legendGroup.destroy();
            }
        },

        /**
         * Position the checkboxes after the width is determined
         */
        positionCheckboxes: function (scrollOffset) {
            //LOGIFIX
            // 21863, 21848: js error resizing; set Sticky Tracking to "False"
            if (!this.group) {
                return;
            }

            var alignAttr = this.group.alignAttr,
                translateY,
                clipHeight = this.clipHeight || this.legendHeight;

            if (alignAttr) {
                translateY = alignAttr.translateY;
                each(this.allItems, function (item) {
                    var checkbox = item.checkbox,
                        top;

                    if (checkbox) {
                        top = (translateY + checkbox.y + (scrollOffset || 0) + 3);
                        css(checkbox, {
                            left: (alignAttr.translateX + item.legendItemWidth + checkbox.x - 20) + PX,
                            top: top + PX,
                            display: top > translateY - 6 && top < translateY + clipHeight - 6 ? '' : NONE
                        });
                    }
                });
            }
        },

        /**
         * Render the legend title on top of the legend
         */
        renderTitle: function () {
            var options = this.options,
                padding = this.padding,
                titleOptions = options.title,
                titleHeight = 0,
                bBox;

            if (titleOptions.text) {
                if (!this.title) {
                    this.title = this.chart.renderer.label(titleOptions.text, padding - 3, padding - 4, null, null, null, null, null, 'legend-title')
                        .attr({ zIndex: 1 })
                        .css(titleOptions.style)
                        .add(this.group);
                }
                bBox = this.title.getBBox();
                titleHeight = bBox.height;
                this.offsetWidth = bBox.width; // #1717
                this.contentGroup.attr({ translateY: titleHeight });
            }
            this.titleHeight = titleHeight;
        },

        /**
         * Render a single specific legend item
         * @param {Object} item A series or point
         */
        renderItem: function (item) {
            var legend = this,
                chart = legend.chart,
                renderer = chart.renderer,
                options = legend.options,
                horizontal = options.layout === 'horizontal',
                symbolWidth = legend.symbolWidth,
                symbolPadding = options.symbolPadding,
                itemStyle = legend.itemStyle,
                itemHiddenStyle = legend.itemHiddenStyle,
                padding = legend.padding,
                itemDistance = horizontal ? pick(options.itemDistance, 8) : 0,
                ltr = !options.rtl,
                itemHeight,
                widthOption = options.width,
                itemMarginBottom = options.itemMarginBottom || 0,
                itemMarginTop = legend.itemMarginTop,
                initialItemX = legend.initialItemX,
                bBox,
                itemWidth,
                li = item.legendItem,
                series = item.series && item.series.drawLegendSymbol ? item.series : item,
                seriesOptions = series.options,
                showCheckbox = legend.createCheckboxForItem && seriesOptions && seriesOptions.showCheckbox,
                useHTML = options.useHTML;

            if (!li) { // generate it once, later move it

                // Generate the group box
                // A group to hold the symbol and text. Text is to be appended in Legend class.
                item.legendGroup = renderer.g('legend-item')
                    .attr({ zIndex: 1 })
                    .add(legend.scrollGroup);

                // Draw the legend symbol inside the group box
                series.drawLegendSymbol(legend, item);

                // Generate the list item text and add it to the group
                item.legendItem = li = renderer.text(
                        options.labelFormat ? format(options.labelFormat, item) : options.labelFormatter.call(item),
                        ltr ? symbolWidth + symbolPadding : -symbolPadding,
                        legend.baseline,
                        useHTML
                    )
                    .css(merge(item.visible ? itemStyle : itemHiddenStyle)) // merge to prevent modifying original (#1021)
                    .attr({
                        align: ltr ? 'left' : 'right',
                        zIndex: 2
                    })
                    .add(item.legendGroup);

                if (legend.setItemEvents) {
                    legend.setItemEvents(item, li, useHTML, itemStyle, itemHiddenStyle);
                }

                // Colorize the items
                legend.colorizeItem(item, item.visible);

                // add the HTML checkbox on top
                if (showCheckbox) {
                    legend.createCheckboxForItem(item);
                }
            }

            // calculate the positions for the next line
            bBox = li.getBBox();

            itemWidth = item.legendItemWidth =
                options.itemWidth || item.legendItemWidth || symbolWidth + symbolPadding + bBox.width + itemDistance +
                (showCheckbox ? 20 : 0);
            legend.itemHeight = itemHeight = mathRound(item.legendItemHeight || bBox.height);

            // if the item exceeds the width, start a new line
            if (horizontal && legend.itemX - initialItemX + itemWidth >
                    (widthOption || (chart.chartWidth - 2 * padding - initialItemX - options.x))) {
                legend.itemX = initialItemX;
                legend.itemY += itemMarginTop + legend.lastLineHeight + itemMarginBottom;
                legend.lastLineHeight = 0; // reset for next line
            }

            // If the item exceeds the height, start a new column
            /*if (!horizontal && legend.itemY + options.y + itemHeight > chart.chartHeight - spacingTop - spacingBottom) {
                legend.itemY = legend.initialItemY;
                legend.itemX += legend.maxItemWidth;
                legend.maxItemWidth = 0;
            }*/

            // Set the edge positions
            legend.maxItemWidth = mathMax(legend.maxItemWidth, itemWidth);
            legend.lastItemY = itemMarginTop + legend.itemY + itemMarginBottom;
            legend.lastLineHeight = mathMax(itemHeight, legend.lastLineHeight); // #915

            // cache the position of the newly generated or reordered items
            item._legendItemPos = [legend.itemX, legend.itemY];

            // advance
            if (horizontal) {
                legend.itemX += itemWidth;

            } else {
                legend.itemY += itemMarginTop + itemHeight + itemMarginBottom;
                legend.lastLineHeight = itemHeight;
            }

            // the width of the widest item
            legend.offsetWidth = widthOption || mathMax(
                (horizontal ? legend.itemX - initialItemX - itemDistance : itemWidth) + padding,
                legend.offsetWidth
            );
        },

        /**
         * Get all items, which is one item per series for normal series and one item per point
         * for pie series.
         */
        getAllItems: function () {
            var allItems = [];
            each(this.chart.series, function (series) {

                //LOGIFIX
                if (series.options && series.options.data) {
                    for (var i = 0; i < series.options.data.length; i++) {
                        var dataObject = series.options.data[i];
                        if (dataObject.qt && dataObject.qt[1]) {
                            dataObject.qt[1] = dataObject.qt[1].replace("$0", "&#36;0");
                            var v = 0;
                        }
                    }
                }


                var seriesOptions = series.options;

                // Handle showInLegend. If the series is linked to another series, defaults to false.
                if (!pick(seriesOptions.showInLegend, !defined(seriesOptions.linkedTo) ? UNDEFINED : false, true)) {
                    return;
                }

                //LOGIFIX
                // 21163 Hide legend item when there's no data to display in the serie
                // 21195 Legend remains in bold after mouse over
                var scrap = LogiXML.getRandomElements(seriesOptions.data, 10);
                if (scrap.some(function (item) {
                    return LogiXML.hasValue(item);
                })) {
                    // use points or series for the legend item depending on legendType
                    allItems = allItems.concat(
                        series.legendItems ||
                        (seriesOptions.legendType === 'point' ?
                            series.data :
                            series)
                    );
                }
            });
            return allItems;
        },

        /**
         * Render the legend. This method can be called both before and after
         * chart.render. If called after, it will only rearrange items instead
         * of creating new ones.
         */
        render: function () {
            var legend = this,
                chart = legend.chart,
                renderer = chart.renderer,
                legendGroup = legend.group,
                allItems,
                display,
                legendWidth,
                legendHeight,
                box = legend.box,
                options = legend.options,
                padding = legend.padding,
                legendBorderWidth = options.borderWidth,
                legendBackgroundColor = options.backgroundColor;

            //LOGIFIX -> code was moved here
            // add each series or point
            allItems = legend.getAllItems();
            display = !!allItems.length;
            if (!display) {
                return;
            }

            legend.itemX = legend.initialItemX;
            legend.itemY = legend.initialItemY;
            legend.offsetWidth = 0;
            legend.lastItemY = 0;

            if (!legendGroup) {
                legend.group = legendGroup = renderer.g('legend')
                    .attr({ zIndex: 7 })
                    .add();
                legend.contentGroup = renderer.g()
                    .attr({ zIndex: 1 }) // above background
                    .add(legendGroup);
                legend.scrollGroup = renderer.g()
                    .add(legend.contentGroup);
            }

            legend.renderTitle();

            // sort by legendIndex
            stableSort(allItems, function (a, b) {
                return ((a.options && a.options.legendIndex) || 0) - ((b.options && b.options.legendIndex) || 0);
            });

            // reversed legend
            if (options.reversed) {
                allItems.reverse();
            }

            legend.allItems = allItems;
            legend.display = display = !!allItems.length;

            // render the items
            each(allItems, function (item) {
                legend.renderItem(item);
            });

            // Draw the border
            legendWidth = options.width || legend.offsetWidth;
            legendHeight = legend.lastItemY + legend.lastLineHeight + legend.titleHeight;


            legendHeight = legend.handleOverflow(legendHeight);

            if (legendBorderWidth || legendBackgroundColor) {
                legendWidth += padding;
                legendHeight += padding;

                if (!box) {
                    legend.box = box = renderer.rect(
                        0,
                        0,
                        legendWidth,
                        legendHeight,
                        options.borderRadius,
                        legendBorderWidth || 0
                    ).attr({
                        stroke: options.borderColor,
                        'stroke-width': legendBorderWidth || 0,
                        fill: legendBackgroundColor || NONE
                    })
                    .add(legendGroup)
                    .shadow(options.shadow);
                    box.isNew = true;

                } else if (legendWidth > 0 && legendHeight > 0) {
                    box[box.isNew ? 'attr' : 'animate'](
                        box.crisp({ width: legendWidth, height: legendHeight })
                    );
                    box.isNew = false;
                }

                // hide the border if no items
                box[display ? 'show' : 'hide']();
            }

            legend.legendWidth = legendWidth;
            legend.legendHeight = legendHeight;

            // Now that the legend width and height are established, put the items in the 
            // final position
            each(allItems, function (item) {
                legend.positionItem(item);
            });

            // 1.x compatibility: positioning based on style
            /*var props = ['left', 'right', 'top', 'bottom'],
                prop,
                i = 4;
            while (i--) {
                prop = props[i];
                if (options.style[prop] && options.style[prop] !== 'auto') {
                    options[i < 2 ? 'align' : 'verticalAlign'] = prop;
                    options[i < 2 ? 'x' : 'y'] = pInt(options.style[prop]) * (i % 2 ? -1 : 1);
                }
            }*/

            if (display) {
                legendGroup.align(extend({
                    width: legendWidth,
                    height: legendHeight
                }, options), true, 'spacingBox');
            }

            if (!chart.isResizing) {
                this.positionCheckboxes();
            }
        },

        /**
         * Set up the overflow handling by adding navigation with up and down arrows below the
         * legend.
         */
        handleOverflow: function (legendHeight) {
            var legend = this,
                chart = this.chart,
                renderer = chart.renderer,
                options = this.options,
                optionsY = options.y,
                alignTop = options.verticalAlign === 'top',
                spaceHeight = chart.spacingBox.height + (alignTop ? -optionsY : optionsY) - this.padding,
                maxHeight = options.maxHeight,
                clipHeight,
                clipRect = this.clipRect,
                navOptions = options.navigation,
                animation = pick(navOptions.animation, true),
                arrowSize = navOptions.arrowSize || 12,
                nav = this.nav,
                pages = this.pages,
                lastY,
                allItems = this.allItems;

            // Adjust the height
            if (options.layout === 'horizontal') {
                spaceHeight /= 2;
            }
            if (maxHeight) {
                spaceHeight = mathMin(spaceHeight, maxHeight);
            }

            // Reset the legend height and adjust the clipping rectangle
            pages.length = 0;
            if (legendHeight > spaceHeight && !options.useHTML) {

                this.clipHeight = clipHeight = spaceHeight - 20 - this.titleHeight - this.padding;
                this.currentPage = pick(this.currentPage, 1);
                this.fullHeight = legendHeight;

                // Fill pages with Y positions so that the top of each a legend item defines
                // the scroll top for each page (#2098)
                each(allItems, function (item, i) {
                    var y = item._legendItemPos[1],
                        //LOGIFIX
                        // 21126: ChartCanvas: js error setting Max Height in Legend.
                        h = item.legendItem.bBox ? mathRound(item.legendItem.bBox.height) : 0,
                        len = pages.length;

                    if (!len || (y - pages[len - 1] > clipHeight && (lastY || y) !== pages[len - 1])) {
                        pages.push(lastY || y);
                        len++;
                    }

                    if (i === allItems.length - 1 && y + h - pages[len - 1] > clipHeight) {
                        pages.push(y);
                    }
                    if (y !== lastY) {
                        lastY = y;
                    }
                });

                // Only apply clipping if needed. Clipping causes blurred legend in PDF export (#1787)
                if (!clipRect) {
                    clipRect = legend.clipRect = renderer.clipRect(0, this.padding, 9999, 0);
                    legend.contentGroup.clip(clipRect);
                }
                clipRect.attr({
                    height: clipHeight
                });

                // Add navigation elements
                if (!nav) {
                    this.nav = nav = renderer.g().attr({ zIndex: 1 }).add(this.group);
                    this.up = renderer.symbol('triangle', 0, 0, arrowSize, arrowSize)
                        .on('click', function () {
                            legend.scroll(-1, animation);
                        })
                        .add(nav);
                    this.pager = renderer.text('', 15, 10)
                        .css(navOptions.style)
                        .add(nav);
                    this.down = renderer.symbol('triangle-down', 0, 0, arrowSize, arrowSize)
                        .on('click', function () {
                            legend.scroll(1, animation);
                        })
                        .add(nav);
                }

                // Set initial position
                legend.scroll(0);

                legendHeight = spaceHeight;

            } else if (nav) {
                clipRect.attr({
                    height: chart.chartHeight
                });
                nav.hide();
                this.scrollGroup.attr({
                    translateY: 1
                });
                this.clipHeight = 0; // #1379
            }

            return legendHeight;
        },

        /**
         * Scroll the legend by a number of pages
         * @param {Object} scrollBy
         * @param {Object} animation
         */
        scroll: function (scrollBy, animation) {
            var pages = this.pages,
                pageCount = pages.length,
                currentPage = this.currentPage + scrollBy,
                clipHeight = this.clipHeight,
                navOptions = this.options.navigation,
                activeColor = navOptions.activeColor,
                inactiveColor = navOptions.inactiveColor,
                pager = this.pager,
                padding = this.padding,
                scrollOffset;

            // When resizing while looking at the last page
            if (currentPage > pageCount) {
                currentPage = pageCount;
            }

            if (currentPage > 0) {

                if (animation !== UNDEFINED) {
                    setAnimation(animation, this.chart);
                }

                this.nav.attr({
                    translateX: padding,
                    translateY: clipHeight + this.padding + 7 + this.titleHeight,
                    visibility: VISIBLE
                });
                this.up.attr({
                    fill: currentPage === 1 ? inactiveColor : activeColor
                })
                    .css({
                        cursor: currentPage === 1 ? 'default' : 'pointer'
                    });
                pager.attr({
                    text: currentPage + '/' + pageCount
                });
                this.down.attr({
                    x: 18 + this.pager.getBBox().width, // adjust to text width
                    fill: currentPage === pageCount ? inactiveColor : activeColor
                })
                    .css({
                        cursor: currentPage === pageCount ? 'default' : 'pointer'
                    });

                scrollOffset = -pages[currentPage - 1] + this.initialItemY;

                this.scrollGroup.animate({
                    translateY: scrollOffset
                });

                this.currentPage = currentPage;
                this.positionCheckboxes(scrollOffset);
            }

        }

    };

    /*
     * LegendSymbolMixin
     */

    var LegendSymbolMixin = Highcharts.LegendSymbolMixin = {

        /**
         * Get the series' symbol in the legend
         * 
         * @param {Object} legend The legend object
         * @param {Object} item The series (this) or point
         */
        drawRectangle: function (legend, item) {
            var symbolHeight = legend.options.symbolHeight || 12;

            item.legendSymbol = this.chart.renderer.rect(
                0,
                legend.baseline - 5 - (symbolHeight / 2),
                legend.symbolWidth,
                symbolHeight,
                pick(legend.options.symbolRadius, 2)
            ).attr({
                zIndex: 3
            }).add(item.legendGroup);

        },

        /**
         * Get the series' symbol in the legend. This method should be overridable to create custom 
         * symbols through Highcharts.seriesTypes[type].prototype.drawLegendSymbols.
         * 
         * @param {Object} legend The legend object
         */
        drawLineMarker: function (legend) {

            var options = this.options,
                markerOptions = options.marker,
                radius,
                legendOptions = legend.options,
                legendSymbol,
                symbolWidth = legend.symbolWidth,
                renderer = this.chart.renderer,
                legendItemGroup = this.legendGroup,
                verticalCenter = legend.baseline - mathRound(renderer.fontMetrics(legendOptions.itemStyle.fontSize).b * 0.3),
                attr;

            // Draw the line
            if (options.lineWidth) {
                attr = {
                    'stroke-width': options.lineWidth
                };
                if (options.dashStyle) {
                    attr.dashstyle = options.dashStyle;
                }
                this.legendLine = renderer.path([
                    M,
                    0,
                    verticalCenter,
                    L,
                    symbolWidth,
                    verticalCenter
                ])
                .attr(attr)
                .add(legendItemGroup);
            }

            // Draw the marker
            if (markerOptions && markerOptions.enabled) {
                radius = markerOptions.radius;
                this.legendSymbol = legendSymbol = renderer.symbol(
                    this.symbol,
                    (symbolWidth / 2) - radius,
                    verticalCenter - radius,
                    2 * radius,
                    2 * radius
                )
                .add(legendItemGroup);
                legendSymbol.isMarker = true;
            }
        }
    };

    // Workaround for #2030, horizontal legend items not displaying in IE11 Preview,
    // and for #2580, a similar drawing flaw in Firefox 26.
    // TODO: Explore if there's a general cause for this. The problem may be related 
    // to nested group elements, as the legend item texts are within 4 group elements.
    if (/Trident\/7\.0/.test(userAgent) || isFirefox) {
        wrap(Legend.prototype, 'positionItem', function (proceed, item) {
            var legend = this,
                runPositionItem = function () { // If chart destroyed in sync, this is undefined (#2030)
                    if (item._legendItemPos) {
                        proceed.call(legend, item);
                    }
                };

            if (legend.chart.renderer.forExport) {
                runPositionItem();
            } else {
                setTimeout(runPositionItem);
            }
        });
    }
    /**
     * The chart class
     * @param {Object} options
     * @param {Function} callback Function to run when the chart has loaded
     */
    function Chart() {
        this.init.apply(this, arguments);
    }

    Chart.prototype = {

        /**
         * Initialize the chart
         */
        init: function (userOptions, callback) {

            // Handle regular options
            var options,
                seriesOptions = userOptions.series; // skip merging data points to increase performance

            userOptions.series = null;
            options = merge(defaultOptions, userOptions); // do the merge
            options.series = userOptions.series = seriesOptions; // set back the series data
            this.userOptions = userOptions;

            var optionsChart = options.chart;

            // Create margin & spacing array
            this.margin = this.splashArray('margin', optionsChart);
            this.spacing = this.splashArray('spacing', optionsChart);

            var chartEvents = optionsChart.events;

            //this.runChartClick = chartEvents && !!chartEvents.click;
            this.bounds = { h: {}, v: {} }; // Pixel data bounds for touch zoom

            this.callback = callback;
            this.isResizing = 0;
            this.options = options;
            //chartTitleOptions = UNDEFINED;
            //chartSubtitleOptions = UNDEFINED;

            this.axes = [];
            this.series = [];
            this.hasCartesianSeries = optionsChart.showAxes;
            //this.axisOffset = UNDEFINED;
            //this.maxTicks = UNDEFINED; // handle the greatest amount of ticks on grouped axes
            //this.inverted = UNDEFINED;
            //this.loadingShown = UNDEFINED;
            //this.container = UNDEFINED;
            //this.chartWidth = UNDEFINED;
            //this.chartHeight = UNDEFINED;
            //this.marginRight = UNDEFINED;
            //this.marginBottom = UNDEFINED;
            //this.containerWidth = UNDEFINED;
            //this.containerHeight = UNDEFINED;
            //this.oldChartWidth = UNDEFINED;
            //this.oldChartHeight = UNDEFINED;

            //this.renderTo = UNDEFINED;
            //this.renderToClone = UNDEFINED;

            //this.spacingBox = UNDEFINED

            //this.legend = UNDEFINED;

            // Elements
            //this.chartBackground = UNDEFINED;
            //this.plotBackground = UNDEFINED;
            //this.plotBGImage = UNDEFINED;
            //this.plotBorder = UNDEFINED;
            //this.loadingDiv = UNDEFINED;
            //this.loadingSpan = UNDEFINED;

            var chart = this,
                eventType;

            // Add the chart to the global lookup
            chart.index = charts.length;
            charts.push(chart);

            // Set up auto resize
            if (optionsChart.reflow !== false) {
                addEvent(chart, 'load', function () {
                    chart.initReflow();
                });
            }

            // Chart event handlers
            if (chartEvents) {
                for (eventType in chartEvents) {
                    addEvent(chart, eventType, chartEvents[eventType]);
                }
            }

            chart.xAxis = [];
            chart.yAxis = [];

            // Expose methods and variables
            chart.animation = useCanVG ? false : pick(optionsChart.animation, true);
            chart.pointCount = 0;
            chart.counters = new ChartCounters();

            chart.firstRender();
        },

        /**
         * Initialize an individual series, called internally before render time
         */
        initSeries: function (options) {
            var chart = this,
                optionsChart = chart.options.chart,
                type = options.type || optionsChart.type || optionsChart.defaultSeriesType,
                series,
                constr = seriesTypes[type];

            // No such series type
            if (!constr) {
                //LOGIFIX
                // 20831 Error handling (added chart)
                error(17, true, chart);
            }

            series = new constr();
            series.init(this, options);
            return series;
        },

        /**
         * Check whether a given point is within the plot area
         *
         * @param {Number} plotX Pixel x relative to the plot area
         * @param {Number} plotY Pixel y relative to the plot area
         * @param {Boolean} inverted Whether the chart is inverted
         */
        isInsidePlot: function (plotX, plotY, inverted) {
            var x = inverted ? plotY : plotX,
                y = inverted ? plotX : plotY;

            return x >= 0 &&
                x <= this.plotWidth &&
                y >= 0 &&
                y <= this.plotHeight;
        },

        /**
         * Adjust all axes tick amounts
         */
        adjustTickAmounts: function () {
            if (this.options.chart.alignTicks !== false) {
                each(this.axes, function (axis) {
                    axis.adjustTickAmount();
                });
            }
            this.maxTicks = null;
        },

        /**
         * Redraw legend, axes or series based on updated data
         *
         * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
         *    configuration
         */
        redraw: function (animation) {
            var chart = this,
                axes = chart.axes,
                series = chart.series,
                pointer = chart.pointer,
                legend = chart.legend,
                redrawLegend = chart.isDirtyLegend,
                hasStackedSeries,
                hasDirtyStacks,
                isDirtyBox = chart.isDirtyBox, // todo: check if it has actually changed?
                seriesLength = series.length,
                i = seriesLength,
                serie,
                renderer = chart.renderer,
                isHiddenChart = renderer.isHidden(),
                afterRedraw = [];

            setAnimation(animation, chart);

            if (isHiddenChart) {
                chart.cloneRenderTo();
            }

            // Adjust title layout (reflow multiline text)
            chart.layOutTitles();

            // link stacked series
            while (i--) {
                serie = series[i];

                if (serie.options.stacking) {
                    hasStackedSeries = true;

                    if (serie.isDirty) {
                        hasDirtyStacks = true;
                        break;
                    }
                }
            }
            if (hasDirtyStacks) { // mark others as dirty
                i = seriesLength;
                while (i--) {
                    serie = series[i];
                    if (serie.options.stacking) {
                        serie.isDirty = true;
                    }
                }
            }

            // handle updated data in the series
            each(series, function (serie) {
                if (serie.isDirty) { // prepare the data so axis can read it
                    if (serie.options.legendType === 'point') {
                        redrawLegend = true;
                    }
                }
            });

            // handle added or removed series
            if (redrawLegend && legend.options.enabled) { // series or pie points are added or removed
                // draw legend graphics
                legend.render();

                chart.isDirtyLegend = false;
            }

            // reset stacks
            if (hasStackedSeries) {
                chart.getStacks();
            }


            if (chart.hasCartesianSeries) {
                if (!chart.isResizing) {

                    // reset maxTicks
                    chart.maxTicks = null;

                    // set axes scales
                    each(axes, function (axis) {
                        axis.setScale();
                    });
                }

                chart.adjustTickAmounts();
                chart.getMargins();

                // If one axis is dirty, all axes must be redrawn (#792, #2169)
                each(axes, function (axis) {
                    if (axis.isDirty) {
                        isDirtyBox = true;
                    }
                });

                // redraw axes
                each(axes, function (axis) {

                    // Fire 'afterSetExtremes' only if extremes are set
                    if (axis.isDirtyExtremes) { // #821
                        axis.isDirtyExtremes = false;
                        afterRedraw.push(function () { // prevent a recursive call to chart.redraw() (#1119)
                            fireEvent(axis, 'afterSetExtremes', extend(axis.eventArgs, axis.getExtremes())); // #747, #751
                            delete axis.eventArgs;
                        });
                    }

                    if (isDirtyBox || hasStackedSeries) {
                        axis.redraw();
                    }
                });


            }
            // the plot areas size has changed
            if (isDirtyBox) {
                chart.drawChartBox();
            }


            // redraw affected series
            each(series, function (serie) {
                if (serie.isDirty && serie.visible &&
                        (!serie.isCartesian || serie.xAxis)) { // issue #153
                    serie.redraw();
                }
            });

            // move tooltip or reset
            if (pointer) {
                pointer.reset(true);
            }

            // redraw if canvas
            renderer.draw();

            // fire the event
            fireEvent(chart, 'redraw'); // jQuery breaks this when calling it from addEvent. Overwrites chart.redraw

            if (isHiddenChart) {
                chart.cloneRenderTo(true);
            }

            // Fire callbacks that are put on hold until after the redraw
            each(afterRedraw, function (callback) {
                callback.call();
            });
        },

        /**
         * Get an axis, series or point object by id.
         * @param id {String} The id as given in the configuration options
         */
        get: function (id) {
            var chart = this,
                axes = chart.axes,
                series = chart.series;

            var i,
                j,
                points;

            // search axes
            for (i = 0; i < axes.length; i++) {
                if (axes[i].options.id === id) {
                    return axes[i];
                }
            }

            // search series
            for (i = 0; i < series.length; i++) {
                if (series[i].options.id === id) {
                    return series[i];
                }
            }

            // search points
            for (i = 0; i < series.length; i++) {
                points = series[i].points || [];
                for (j = 0; j < points.length; j++) {
                    if (points[j].id === id) {
                        return points[j];
                    }
                }
            }
            return null;
        },

        /**
         * Create the Axis instances based on the config options
         */
        getAxes: function () {
            var chart = this,
                options = this.options,
                xAxisOptions = options.xAxis = splat(options.xAxis || {}),
                yAxisOptions = options.yAxis = splat(options.yAxis || {}),
                optionsArray,
                axis;

            // make sure the options are arrays and add some members
            each(xAxisOptions, function (axis, i) {
                axis.index = i;
                axis.isX = true;
            });

            each(yAxisOptions, function (axis, i) {
                axis.index = i;
            });

            // concatenate all axis options into one array
            optionsArray = xAxisOptions.concat(yAxisOptions);

            each(optionsArray, function (axisOptions) {
                axis = new Axis(chart, axisOptions);
            });

            chart.adjustTickAmounts();
        },


        /**
         * Get the currently selected points from all series
         */
        getSelectedPoints: function () {
            var points = [];
            each(this.series, function (serie) {
                points = points.concat(grep(serie.points || [], function (point) {
                    return point.selected;
                }));
            });
            return points;
        },

        /**
         * Get the currently selected series
         */
        getSelectedSeries: function () {
            return grep(this.series, function (serie) {
                return serie.selected;
            });
        },

        /**
         * Generate stacks for each series and calculate stacks total values
         */
        getStacks: function () {
            var chart = this;

            // reset stacks for each yAxis
            each(chart.yAxis, function (axis) {
                if (axis.stacks && axis.hasVisibleSeries) {
                    axis.oldStacks = axis.stacks;
                }
            });

            each(chart.series, function (series) {
                if (series.options.stacking && (series.visible === true || chart.options.chart.ignoreHiddenSeries === false)) {
                    series.stackKey = series.type + pick(series.options.stack, '');
                }
            });
        },

        /**
         * Show the title and subtitle of the chart
         *
         * @param titleOptions {Object} New title options
         * @param subtitleOptions {Object} New subtitle options
         *
         */
        setTitle: function (titleOptions, subtitleOptions, redraw) {
            var chart = this,
                options = chart.options,
                chartTitleOptions,
                chartSubtitleOptions;

            chartTitleOptions = options.title = merge(options.title, titleOptions);
            chartSubtitleOptions = options.subtitle = merge(options.subtitle, subtitleOptions);

            // add title and subtitle
            each([
                ['title', titleOptions, chartTitleOptions],
                ['subtitle', subtitleOptions, chartSubtitleOptions]
            ], function (arr) {
                var name = arr[0],
                    title = chart[name],
                    titleOptions = arr[1],
                    chartTitleOptions = arr[2];

                if (title && titleOptions) {
                    chart[name] = title = title.destroy(); // remove old
                }

                if (chartTitleOptions && chartTitleOptions.text && !title) {
                    chart[name] = chart.renderer.text(
                        chartTitleOptions.text,
                        0,
                        0,
                        chartTitleOptions.useHTML
                    )
                    .attr({
                        align: chartTitleOptions.align,
                        'class': PREFIX + name,
                        zIndex: chartTitleOptions.zIndex || 4
                    })
                    .css(chartTitleOptions.style)
                    .add();
                }
            });
            chart.layOutTitles(redraw);
        },

        /**
         * Lay out the chart titles and cache the full offset height for use in getMargins
         */
        layOutTitles: function (redraw) {
            var titleOffset = 0,
                title = this.title,
                subtitle = this.subtitle,
                options = this.options,
                titleOptions = options.title,
                subtitleOptions = options.subtitle,
                requiresDirtyBox,
                autoWidth = this.spacingBox.width - 44; // 44 makes room for default context button

            if (title) {
                title
                    .css({ width: (titleOptions.width || autoWidth) + PX })
                    .align(extend({ y: 15 }, titleOptions), false, 'spacingBox');

                if (!titleOptions.floating && !titleOptions.verticalAlign) {
                    titleOffset = title.getBBox().height;

                }
                // Adjust for browser consistency + backwards compat after #776 fix
                if (titleOffset >= 18 && titleOffset <= 28) {
                    titleOffset = 15;
                }

            }
            if (subtitle) {
                // LOGIFIX
                // 20867 Sub Captions (inside / outside plot) fix
                var subtitleOffset = subtitle.getBBox().height;
                if (title)
                    subtitleOffset += title.getBBox().height;

                subtitle
                    .css({ width: (subtitleOptions.width || autoWidth) + PX })
                    .align(extend({ y: subtitleOffset }, subtitleOptions), false, 'spacingBox');

                if (!subtitleOptions.floating && !subtitleOptions.verticalAlign) {
                    titleOffset = mathCeil(titleOffset + subtitle.getBBox().height);
                }
            }

            requiresDirtyBox = this.titleOffset !== titleOffset;
            this.titleOffset = titleOffset; // used in getMargins

            if (!this.isDirtyBox && requiresDirtyBox) {
                this.isDirtyBox = requiresDirtyBox;
                // Redraw if necessary (#2719, #2744)		
                if (this.hasRendered && pick(redraw, true) && this.isDirtyBox) {
                    this.redraw();
                }
            }
        },

        /**
         * Get chart width and height according to options and container size
         */
        getChartSize: function () {
            var chart = this,
                optionsChart = chart.options.chart,
                widthOption = optionsChart.width,
                heightOption = optionsChart.height,
                renderTo = chart.renderToClone || chart.renderTo;

            // get inner width and height from jQuery (#824)
            if (!defined(widthOption)) {
                chart.containerWidth = adapterRun(renderTo, 'width');
            }
            if (!defined(heightOption)) {
                chart.containerHeight = adapterRun(renderTo, 'height');
            }

            chart.chartWidth = mathMax(0, widthOption || chart.containerWidth || 600); // #1393, 1460
            chart.chartHeight = mathMax(0, pick(heightOption,
                // the offsetHeight of an empty container is 0 in standard browsers, but 19 in IE7:
                chart.containerHeight > 19 ? chart.containerHeight : 400));
        },

        /**
         * Create a clone of the chart's renderTo div and place it outside the viewport to allow
         * size computation on chart.render and chart.redraw
         */
        cloneRenderTo: function (revert) {
            var clone = this.renderToClone,
                container = this.container;

            // Destroy the clone and bring the container back to the real renderTo div
            if (revert) {
                if (clone) {
                    this.renderTo.appendChild(container);
                    discardElement(clone);
                    delete this.renderToClone;
                }

                // Set up the clone
            } else {
                if (container && container.parentNode === this.renderTo) {
                    this.renderTo.removeChild(container); // do not clone this
                }
                this.renderToClone = clone = this.renderTo.cloneNode(0);
                css(clone, {
                    position: ABSOLUTE,
                    top: '-9999px',
                    display: 'block' // #833
                });
                if (clone.style.setProperty) { // #2631
                    clone.style.setProperty('display', 'block', 'important');
                }
                doc.body.appendChild(clone);
                if (container) {
                    clone.appendChild(container);
                }
            }
        },

        /**
         * Get the containing element, determine the size and create the inner container
         * div to hold the chart
         */
        getContainer: function () {
            var chart = this,
                container,
                optionsChart = chart.options.chart,
                chartWidth,
                chartHeight,
                renderTo,
                indexAttrName = 'data-highcharts-chart',
                oldChartIndex,
                containerId;

            chart.renderTo = renderTo = optionsChart.renderTo;
            containerId = PREFIX + idCounter++;

            if (isString(renderTo)) {
                chart.renderTo = renderTo = doc.getElementById(renderTo);
            }

            // Display an error if the renderTo is wrong
            if (!renderTo) {
                //LOGIFIX
                // 20831 Error handling (added chart)
                error(13, true, chart);
            }

            // If the container already holds a chart, destroy it. The check for hasRendered is there
            // because web pages that are saved to disk from the browser, will preserve the data-highcharts-chart
            // attribute and the SVG contents, but not an interactive chart. So in this case,
            // charts[oldChartIndex] will point to the wrong chart if any (#2609).
            oldChartIndex = pInt(attr(renderTo, indexAttrName));
            if (!isNaN(oldChartIndex) && charts[oldChartIndex] && charts[oldChartIndex].hasRendered) {
                charts[oldChartIndex].destroy();
            }

            // Make a reference to the chart from the div
            attr(renderTo, indexAttrName, chart.index);

            // remove previous chart
            renderTo.innerHTML = '';

            // If the container doesn't have an offsetWidth, it has or is a child of a node
            // that has display:none. We need to temporarily move it out to a visible
            // state to determine the size, else the legend and tooltips won't render
            // properly. The allowClone option is used in sparklines as a micro optimization,
            // saving about 1-2 ms each chart.
            if (!optionsChart.skipClone && !renderTo.offsetWidth) {
                chart.cloneRenderTo();
            }

            // get the width and height
            chart.getChartSize();
            chartWidth = chart.chartWidth;
            chartHeight = chart.chartHeight;

            // create the inner container
            chart.container = container = createElement(DIV, {
                className: PREFIX + 'container' +
					(optionsChart.className ? ' ' + optionsChart.className : ''),
                id: containerId
            }, extend({
                position: RELATIVE,
                overflow: HIDDEN, // needed for context menu (avoid scrollbars) and
                // content overflow in IE
                width: chartWidth + PX,
                height: chartHeight + PX,
                textAlign: 'left',
                lineHeight: 'normal', // #427
                zIndex: 0, // #1072
                '-webkit-tap-highlight-color': 'rgba(0,0,0,0)'
            }, optionsChart.style),
                chart.renderToClone || renderTo
            );

            // cache the cursor (#1650)
            chart._cursor = container.style.cursor;

            // Initialize the renderer
            chart.renderer =
                optionsChart.forExport ? // force SVG, used for SVG export
                    new SVGRenderer(container, chartWidth, chartHeight, optionsChart.style, true) :
                    new Renderer(container, chartWidth, chartHeight, optionsChart.style);

            if (useCanVG) {
                // If we need canvg library, extend and configure the renderer
                // to get the tracker for translating mouse events
                chart.renderer.create(chart, container, chartWidth, chartHeight);
            }
        },

        /**
         * Calculate margins by rendering axis labels in a preliminary position. Title,
         * subtitle and legend have already been rendered at this stage, but will be
         * moved into their final positions
         */
        getMargins: function () {
            var chart = this,
                spacing = chart.spacing,
                axisOffset,
                legend = chart.legend,
                margin = chart.margin,
                legendOptions = chart.options.legend,
                legendMargin = pick(legendOptions.margin, 10),
                legendX = legendOptions.x,
                legendY = legendOptions.y,
                align = legendOptions.align,
                verticalAlign = legendOptions.verticalAlign,
                titleOffset = chart.titleOffset;

            chart.resetMargins();
            axisOffset = chart.axisOffset;

            // Adjust for title and subtitle
            if (titleOffset && !defined(margin[0])) {
                chart.plotTop = mathMax(chart.plotTop, titleOffset + chart.options.title.margin + spacing[0]);
            }

            // Adjust for legend
            if (legend.display && !legendOptions.floating) {
                if (align === 'right') { // horizontal alignment handled first
                    if (!defined(margin[1])) {
                        chart.marginRight = mathMax(
                            chart.marginRight,
                            legend.legendWidth - legendX + legendMargin + spacing[1]
                        );
                    }
                } else if (align === 'left') {
                    if (!defined(margin[3])) {
                        chart.plotLeft = mathMax(
                            chart.plotLeft,
                            legend.legendWidth + legendX + legendMargin + spacing[3]
                        );
                    }

                } else if (verticalAlign === 'top') {
                    if (!defined(margin[0])) {
                        chart.plotTop = mathMax(
                            chart.plotTop,
                            legend.legendHeight + legendY + legendMargin + spacing[0]
                        );
                    }

                } else if (verticalAlign === 'bottom') {
                    if (!defined(margin[2])) {
                        chart.marginBottom = mathMax(
                            chart.marginBottom,
                            legend.legendHeight - legendY + legendMargin + spacing[2]
                        );
                    }
                }
            }

            // adjust for scroller
            if (chart.extraBottomMargin) {
                chart.marginBottom += chart.extraBottomMargin;
            }
            if (chart.extraTopMargin) {
                chart.plotTop += chart.extraTopMargin;
            }

            // pre-render axes to get labels offset width
            if (chart.hasCartesianSeries) {
                each(chart.axes, function (axis) {
                    axis.getOffset();
                });
            }

            if (!defined(margin[3])) {
                chart.plotLeft += axisOffset[3];
            }
            if (!defined(margin[0])) {
                chart.plotTop += axisOffset[0];
            }
            if (!defined(margin[2])) {
                chart.marginBottom += axisOffset[2];
            }
            if (!defined(margin[1])) {
                chart.marginRight += axisOffset[1];
            }

            chart.setChartSize();

        },

        /**
         * Resize the chart to its container if size is not explicitly set
         */
        reflow: function (e) {
            var chart = this;
            //LOGIFIX
            // 21171, 21172 CharCanvas js errors with IE 7,8
            if (chart.options == undefined) {
                return;
            }
            var optionsChart = chart.options.chart,
                renderTo = chart.renderTo,
                width = optionsChart.width || adapterRun(renderTo, 'width'),
                height = optionsChart.height || adapterRun(renderTo, 'height'),
                target = e ? e.target : win, // #805 - MooTools doesn't supply e
                doReflow = function () {
                    if (chart.container) { // It may have been destroyed in the meantime (#1257)
                        chart.setSize(width, height, false);
                        chart.hasUserSize = null;
                    }
                };

            // Width and height checks for display:none. Target is doc in IE8 and Opera,
            // win in Firefox, Chrome and IE9.
            if (!chart.hasUserSize && width && height && (target === win || target === doc)) {
                if (width !== chart.containerWidth || height !== chart.containerHeight) {
                    clearTimeout(chart.reflowTimeout);
                    if (e) { // Called from window.resize
                        chart.reflowTimeout = setTimeout(doReflow, 100);
                    } else { // Called directly (#2224)
                        doReflow();
                    }
                }
                chart.containerWidth = width;
                chart.containerHeight = height;
            }
        },

        /**
         * Add the event handlers necessary for auto resizing
         */
        initReflow: function () {
            var chart = this,
                reflow = function (e) {
                    chart.reflow(e);
                };


            addEvent(win, 'resize', reflow);
            addEvent(chart, 'destroy', function () {
                removeEvent(win, 'resize', reflow);
            });
        },

        /**
         * Resize the chart to a given width and height
         * @param {Number} width
         * @param {Number} height
         * @param {Object|Boolean} animation
         */
        setSize: function (width, height, animation) {
            var chart = this,
                chartWidth,
                chartHeight,
                fireEndResize;

            // Handle the isResizing counter
            chart.isResizing += 1;
            fireEndResize = function () {
                if (chart) {
                    fireEvent(chart, 'endResize', null, function () {
                        chart.isResizing -= 1;
                    });
                }
            };

            // set the animation for the current process
            setAnimation(animation, chart);

            chart.oldChartHeight = chart.chartHeight;
            chart.oldChartWidth = chart.chartWidth;
            if (defined(width)) {
                chart.chartWidth = chartWidth = mathMax(0, mathRound(width));
                chart.hasUserSize = !!chartWidth;
            }
            if (defined(height)) {
                chart.chartHeight = chartHeight = mathMax(0, mathRound(height));
            }

            // Resize the container with the global animation applied if enabled (#2503)
            //LOGIFIX
            // 20924: ChartCanvas:  Resizer does not work correctly.
            //(globalAnimation ? animate : css)(chart.container, {
            //	width: chartWidth + PX,
            //	height: chartHeight + PX
            //}, globalAnimation);
            css(chart.container, {
                width: chartWidth + PX,
                height: chartHeight + PX
            });

            chart.setChartSize(true);
            chart.renderer.setSize(chartWidth, chartHeight, animation);

            // handle axes
            chart.maxTicks = null;
            each(chart.axes, function (axis) {
                axis.isDirty = true;
                axis.setScale();
            });

            // make sure non-cartesian series are also handled
            each(chart.series, function (serie) {
                serie.isDirty = true;
            });

            chart.isDirtyLegend = true; // force legend redraw
            chart.isDirtyBox = true; // force redraw of plot and chart border

            chart.getMargins();

            chart.redraw(animation);


            chart.oldChartHeight = null;
            fireEvent(chart, 'resize');

            // fire endResize and set isResizing back
            // If animation is disabled, fire without delay
            if (globalAnimation === false) {
                fireEndResize();
            } else { // else set a timeout with the animation duration
                setTimeout(fireEndResize, (globalAnimation && globalAnimation.duration) || 500);
            }
        },

        /**
         * Set the public chart properties. This is done before and after the pre-render
         * to determine margin sizes
         */
        setChartSize: function (skipAxes) {
            var chart = this,
                inverted = chart.inverted,
                renderer = chart.renderer,
                chartWidth = chart.chartWidth,
                chartHeight = chart.chartHeight,
                optionsChart = chart.options.chart,
                spacing = chart.spacing,
                clipOffset = chart.clipOffset,
                clipX,
                clipY,
                plotLeft,
                plotTop,
                plotWidth,
                plotHeight,
                plotBorderWidth;

            chart.plotLeft = plotLeft = mathRound(chart.plotLeft);
            chart.plotTop = plotTop = mathRound(chart.plotTop);
            chart.plotWidth = plotWidth = mathMax(0, mathRound(chartWidth - plotLeft - chart.marginRight));
            chart.plotHeight = plotHeight = mathMax(0, mathRound(chartHeight - plotTop - chart.marginBottom));

            chart.plotSizeX = inverted ? plotHeight : plotWidth;
            chart.plotSizeY = inverted ? plotWidth : plotHeight;

            chart.plotBorderWidth = optionsChart.plotBorderWidth || 0;

            // Set boxes used for alignment
            chart.spacingBox = renderer.spacingBox = {
                x: spacing[3],
                y: spacing[0],
                width: chartWidth - spacing[3] - spacing[1],
                height: chartHeight - spacing[0] - spacing[2]
            };
            chart.plotBox = renderer.plotBox = {
                x: plotLeft,
                y: plotTop,
                width: plotWidth,
                height: plotHeight
            };

            plotBorderWidth = 2 * mathFloor(chart.plotBorderWidth / 2);
            clipX = mathCeil(mathMax(plotBorderWidth, clipOffset[3]) / 2);
            clipY = mathCeil(mathMax(plotBorderWidth, clipOffset[0]) / 2);
            chart.clipBox = {
                x: clipX,
                y: clipY,
                width: mathFloor(chart.plotSizeX - mathMax(plotBorderWidth, clipOffset[1]) / 2 - clipX),
                height: mathFloor(chart.plotSizeY - mathMax(plotBorderWidth, clipOffset[2]) / 2 - clipY)
            };

            if (!skipAxes) {
                each(chart.axes, function (axis) {
                    axis.setAxisSize();
                    axis.setAxisTranslation();
                });
            }
        },

        /**
         * Initial margins before auto size margins are applied
         */
        resetMargins: function () {
            var chart = this,
                spacing = chart.spacing,
                margin = chart.margin;

            chart.plotTop = pick(margin[0], spacing[0]);
            chart.marginRight = pick(margin[1], spacing[1]);
            chart.marginBottom = pick(margin[2], spacing[2]);
            chart.plotLeft = pick(margin[3], spacing[3]);
            chart.axisOffset = [0, 0, 0, 0]; // top, right, bottom, left
            chart.clipOffset = [0, 0, 0, 0];
        },

        /**
         * Draw the borders and backgrounds for chart and plot area
         */
        drawChartBox: function () {
            var chart = this,
                optionsChart = chart.options.chart,
                renderer = chart.renderer,
                chartWidth = chart.chartWidth,
                chartHeight = chart.chartHeight,
                chartBackground = chart.chartBackground,
                plotBackground = chart.plotBackground,
                plotBorder = chart.plotBorder,
                plotBGImage = chart.plotBGImage,
                chartBorderWidth = optionsChart.borderWidth || 0,
                chartBackgroundColor = optionsChart.backgroundColor,
                plotBackgroundColor = optionsChart.plotBackgroundColor,
                plotBackgroundImage = optionsChart.plotBackgroundImage,
                plotBorderWidth = optionsChart.plotBorderWidth || 0,
                mgn,
                bgAttr,
                plotLeft = chart.plotLeft,
                plotTop = chart.plotTop,
                plotWidth = chart.plotWidth,
                plotHeight = chart.plotHeight,
                plotBox = chart.plotBox,
                clipRect = chart.clipRect,
                clipBox = chart.clipBox;

            // Chart area
            mgn = chartBorderWidth + (optionsChart.shadow ? 8 : 0);

            if (chartBorderWidth || chartBackgroundColor) {
                if (!chartBackground) {

                    bgAttr = {
                        fill: chartBackgroundColor || NONE
                    };
                    if (chartBorderWidth) { // #980
                        bgAttr.stroke = optionsChart.borderColor;
                        bgAttr['stroke-width'] = chartBorderWidth;
                    }
                    chart.chartBackground = renderer.rect(mgn / 2, mgn / 2, chartWidth - mgn, chartHeight - mgn,
                            optionsChart.borderRadius, chartBorderWidth)
                        .attr(bgAttr)
                        .addClass(PREFIX + 'background')
                        .add()
                        .shadow(optionsChart.shadow);

                } else { // resize
                    chartBackground.animate(
                        chartBackground.crisp({ width: chartWidth - mgn, height: chartHeight - mgn })
                    );
                }
            }


            // Plot background
            if (plotBackgroundColor) {
                if (!plotBackground) {
                    chart.plotBackground = renderer.rect(plotLeft, plotTop, plotWidth, plotHeight, 0)
                        .attr({
                            fill: plotBackgroundColor
                        })
                        .add()
                        .shadow(optionsChart.plotShadow);
                } else {
                    plotBackground.animate(plotBox);
                }
            }
            if (plotBackgroundImage) {
                if (!plotBGImage) {
                    chart.plotBGImage = renderer.image(plotBackgroundImage, plotLeft, plotTop, plotWidth, plotHeight)
                        .add();
                } else {
                    plotBGImage.animate(plotBox);
                }
            }

            // Plot clip
            if (!clipRect) {
                chart.clipRect = renderer.clipRect(clipBox);
            } else {
                clipRect.animate({
                    width: clipBox.width,
                    height: clipBox.height
                });
            }

            // Plot area border
            if (plotBorderWidth) {
                if (!plotBorder) {
                    chart.plotBorder = renderer.rect(plotLeft, plotTop, plotWidth, plotHeight, 0, -plotBorderWidth)
                        .attr({
                            stroke: optionsChart.plotBorderColor,
                            'stroke-width': plotBorderWidth,
                            fill: NONE,
                            zIndex: 1
                        })
                        .add();
                } else {
                    plotBorder.animate(
                        plotBorder.crisp({ x: plotLeft, y: plotTop, width: plotWidth, height: plotHeight })
                    );
                }
            }

            // reset
            chart.isDirtyBox = false;
        },

        /**
         * Detect whether a certain chart property is needed based on inspecting its options
         * and series. This mainly applies to the chart.invert property, and in extensions to 
         * the chart.angular and chart.polar properties.
         */
        propFromSeries: function () {
            var chart = this,
                optionsChart = chart.options.chart,
                klass,
                seriesOptions = chart.options.series,
                i,
                value;


            each(['inverted', 'angular', 'polar'], function (key) {

                // The default series type's class
                klass = seriesTypes[optionsChart.type || optionsChart.defaultSeriesType];

                // Get the value from available chart-wide properties
                value = (
                    chart[key] || // 1. it is set before
                    optionsChart[key] || // 2. it is set in the options
                    (klass && klass.prototype[key]) // 3. it's default series class requires it
                );

                // 4. Check if any the chart's series require it
                i = seriesOptions && seriesOptions.length;
                while (!value && i--) {
                    klass = seriesTypes[seriesOptions[i].type];
                    if (klass && klass.prototype[key]) {
                        value = true;
                    }
                }

                // Set the chart property
                chart[key] = value;
            });

        },

        /**
         * Link two or more series together. This is done initially from Chart.render,
         * and after Chart.addSeries and Series.remove.
         */
        linkSeries: function () {
            var chart = this,
                chartSeries = chart.series;

            // Reset links
            each(chartSeries, function (series) {
                series.linkedSeries.length = 0;
            });

            // Apply new links
            each(chartSeries, function (series) {
                var linkedTo = series.options.linkedTo;
                if (isString(linkedTo)) {
                    if (linkedTo === ':previous') {
                        linkedTo = chart.series[series.index - 1];
                    } else {
                        linkedTo = chart.get(linkedTo);
                    }
                    if (linkedTo) {
                        linkedTo.linkedSeries.push(series);
                        series.linkedParent = linkedTo;
                    }
                }
            });
        },

        /**
         * Render series for the chart
         */
        renderSeries: function () {
            each(this.series, function (serie) {
                serie.translate();
                if (serie.setTooltipPoints) {
                    serie.setTooltipPoints();
                }
                serie.render();
            });
        },

        /**
         * Render all graphics for the chart
         */
        render: function () {
            var chart = this,
                axes = chart.axes,
                renderer = chart.renderer,
                options = chart.options;

            var labels = options.labels,
                credits = options.credits,
                creditsHref;

            // Title
            chart.setTitle();


            // Legend
            chart.legend = new Legend(chart, options.legend);

            chart.getStacks(); // render stacks

            // Get margins by pre-rendering axes
            // set axes scales
            each(axes, function (axis) {
                axis.setScale();
            });

            chart.getMargins();

            chart.maxTicks = null; // reset for second pass
            each(axes, function (axis) {
                axis.setTickPositions(true); // update to reflect the new margins
                axis.setMaxTicks();
            });
            chart.adjustTickAmounts();
            chart.getMargins(); // second pass to check for new labels


            // Draw the borders and backgrounds
            chart.drawChartBox();


            // Axes
            if (chart.hasCartesianSeries) {
                each(axes, function (axis) {
                    axis.render();
                });
            }

            // The series
            if (!chart.seriesGroup) {
                chart.seriesGroup = renderer.g('series-group')
                    .attr({ zIndex: 3 })
                    .add();
            }
            chart.renderSeries();

            // Labels
            if (labels.items) {
                each(labels.items, function (label) {
                    var style = extend(labels.style, label.style),
                        x = pInt(style.left) + chart.plotLeft,
                        y = pInt(style.top) + chart.plotTop + 12;

                    // delete to prevent rewriting in IE
                    delete style.left;
                    delete style.top;

                    renderer.text(
                        label.html,
                        x,
                        y
                    )
                    .attr({ zIndex: 2 })
                    .css(style)
                    .add();

                });
            }

            // Credits
            if (credits.enabled && !chart.credits) {
                creditsHref = credits.href;
                chart.credits = renderer.text(
                    credits.text,
                    0,
                    0
                )
                .on('click', function () {
                    if (creditsHref) {
                        location.href = creditsHref;
                    }
                })
                .attr({
                    align: credits.position.align,
                    zIndex: 8
                })
                .css(credits.style)
                .add()
                .align(credits.position);
            }

            // Set flag
            chart.hasRendered = true;

        },

        /**
         * Clean up memory usage
         */
        destroy: function () {
            var chart = this,
                axes = chart.axes,
                series = chart.series,
                container = chart.container,
                i,
                parentNode = container && container.parentNode;

            // fire the chart.destoy event
            fireEvent(chart, 'destroy');

            // Delete the chart from charts lookup array
            charts[chart.index] = UNDEFINED;
            //LOGIFIX
            // 21186: ChartCanvas: Invalid property value error in Dashboard in IE7.
            if (chart.renderTo) {
                chart.renderTo.removeAttribute('data-highcharts-chart');
            }

            // remove events
            removeEvent(chart);

            // ==== Destroy collections:
            // Destroy axes
            //LOGIFIX - axis is null sometime
            if (axes && axes.length) {
                i = axes.length;
                while (i--) {
                    axes[i] = axes[i].destroy();
                }
            }

            // Destroy each series
            //LOGIFIX - series is null sometime
            if (series && series.length) {
                i = series.length;
                while (i--) {
                    series[i] = series[i].destroy();
                }
            }
            // ==== Destroy chart properties:
            each(['title', 'subtitle', 'chartBackground', 'plotBackground', 'plotBGImage',
                    'plotBorder', 'seriesGroup', 'clipRect', 'credits', 'pointer', 'scroller',
                    'rangeSelector', 'legend', 'resetZoomButton', 'tooltip', 'renderer'], function (name) {
                        var prop = chart[name];

                        if (prop && prop.destroy) {
                            chart[name] = prop.destroy();
                        }
                    });

            // remove container and all SVG
            if (container) { // can break in IE when destroyed before finished loading
                container.innerHTML = '';
                removeEvent(container);
                if (parentNode) {
                    discardElement(container);
                }

            }

            // clean it all up
            for (i in chart) {
                delete chart[i];
            }

        },


        /**
         * VML namespaces can't be added until after complete. Listening
         * for Perini's doScroll hack is not enough.
         */
        isReadyToRender: function () {
            var chart = this;

            // Note: in spite of JSLint's complaints, win == win.top is required
            /*jslint eqeq: true*/
            if ((!hasSVG && (win == win.top && doc.readyState !== 'complete')) || (useCanVG && !win.canvg)) {
                /*jslint eqeq: false*/
                if (useCanVG) {
                    // Delay rendering until canvg library is downloaded and ready
                    CanVGController.push(function () { chart.firstRender(); }, chart.options.global.canvasToolsURL);
                } else {
                    doc.attachEvent('onreadystatechange', function () {
                        doc.detachEvent('onreadystatechange', chart.firstRender);
                        if (doc.readyState === 'complete') {
                            chart.firstRender();
                        }
                    });
                }
                return false;
            }
            return true;
        },

        /**
         * Prepare for first rendering after all data are loaded
         */
        firstRender: function () {
            var chart = this,
                options = chart.options,
                callback = chart.callback;

            // Check whether the chart is ready to render
            if (!chart.isReadyToRender()) {
                return;
            }

            // Create the container
            chart.getContainer();

            // Run an early event after the container and renderer are established
            fireEvent(chart, 'init');


            chart.resetMargins();
            chart.setChartSize();

            // Set the common chart properties (mainly invert) from the given series
            chart.propFromSeries();

            // get axes
            chart.getAxes();

            // Initialize the series
            each(options.series || [], function (serieOptions) {
                chart.initSeries(serieOptions);
            });

            chart.linkSeries();

            // Run an event after axes and series are initialized, but before render. At this stage,
            // the series data is indexed and cached in the xData and yData arrays, so we can access
            // those before rendering. Used in Highstock. 
            fireEvent(chart, 'beforeRender');

            // depends on inverted and on margins being set
            if (Highcharts.Pointer) {
                chart.pointer = new Pointer(chart, options);
            }

            chart.render();

            // add canvas
            chart.renderer.draw();
            // run callbacks
            if (callback) {
                callback.apply(chart, [chart]);
            }
            each(chart.callbacks, function (fn) {
                fn.apply(chart, [chart]);
            });


            // If the chart was rendered outside the top container, put it back in
            chart.cloneRenderTo(true);

            fireEvent(chart, 'load');

        },

        /**
        * Creates arrays for spacing and margin from given options.
        */
        splashArray: function (target, options) {
            var oVar = options[target],
                tArray = isObject(oVar) ? oVar : [oVar, oVar, oVar, oVar];

            return [pick(options[target + 'Top'], tArray[0]),
                    pick(options[target + 'Right'], tArray[1]),
                    pick(options[target + 'Bottom'], tArray[2]),
                    pick(options[target + 'Left'], tArray[3])];
        }
    }; // end Chart

    // Hook for exporting module
    Chart.prototype.callbacks = [];

    var CenteredSeriesMixin = Highcharts.CenteredSeriesMixin = {
        /**
         * Get the center of the pie based on the size and center options relative to the  
         * plot area. Borrowed by the polar and gauge series types.
         */
        getCenter: function () {

            var options = this.options,
                chart = this.chart,
                slicingRoom = 2 * (options.slicedOffset || 0),
                handleSlicingRoom,
                plotWidth = chart.plotWidth - 2 * slicingRoom,
                plotHeight = chart.plotHeight - 2 * slicingRoom,
                centerOption = options.center,
                positions = [pick(centerOption[0], '50%'), pick(centerOption[1], '50%'), options.size || '100%', options.innerSize || 0],
                smallestSize = mathMin(plotWidth, plotHeight),
                isPercent;

            return map(positions, function (length, i) {
                isPercent = /%$/.test(length);
                handleSlicingRoom = i < 2 || (i === 2 && isPercent);
                return (isPercent ?
                    // i == 0: centerX, relative to width
                    // i == 1: centerY, relative to height
                    // i == 2: size, relative to smallestSize
                    // i == 4: innerSize, relative to smallestSize
                    [plotWidth, plotHeight, smallestSize, smallestSize][i] *
                        pInt(length) / 100 :
                    length) + (handleSlicingRoom ? slicingRoom : 0);
            });
        }
    };

    /**
     * The Point object and prototype. Inheritable and used as base for PiePoint
     */
    var Point = function () { };
    Point.prototype = {

        /**
         * Initialize the point
         * @param {Object} series The series object containing this point
         * @param {Object} options The data in either number, array or object format
         */
        init: function (series, options, x) {

            var point = this,
                colors;
            point.series = series;
            point.applyOptions(options, x);
            point.pointAttr = {};

            if (series.options.colorByPoint) {
                colors = series.options.colors || series.chart.options.colors;
                point.color = point.color || colors[series.colorCounter++];
                // loop back to zero
                if (series.colorCounter === colors.length) {
                    series.colorCounter = 0;
                }
            }

            series.chart.pointCount++;
            return point;
        },
        /**
         * Apply the options containing the x and y data and possible some extra properties.
         * This is called on point init or from point.update.
         *
         * @param {Object} options
         */
        applyOptions: function (options, x) {
            var point = this,
                series = point.series,
                pointValKey = series.pointValKey;

            options = Point.prototype.optionsToObject.call(this, options);

            // copy options directly to point
            extend(point, options);
            point.options = point.options ? extend(point.options, options) : options;

            // For higher dimension series types. For instance, for ranges, point.y is mapped to point.low.
            if (pointValKey) {
                point.y = point[pointValKey];
            }

            // LOGIFIX 
            // 21353 Chart Canvas: large number of data points confuses chart rendering fix
            if (point.x === UNDEFINED && point.series.xAxis && point.series.xAxis.isDatetimeAxis) {
                point.isInvalidPoint = true;
            }

            // If no x is set by now, get auto incremented value. All points must have an
            // x value, however the y value can be null to create a gap in the series
            if (point.x === UNDEFINED && series) {
                point.x = x === UNDEFINED ? series.autoIncrement() : x;
            }

            return point;
        },

        /**
         * Transform number or array configs into objects
         */
        optionsToObject: function (options) {
            var ret = {},
                series = this.series,
                pointArrayMap = series.pointArrayMap || ['y'],
                valueCount = pointArrayMap.length,
                firstItemType,
                i = 0,
                j = 0;

            if (typeof options === 'number' || options === null) {
                ret[pointArrayMap[0]] = options;

            } else if (isArray(options)) {
                // with leading x value
                if (options.length > valueCount) {
                    firstItemType = typeof options[0];
                    if (firstItemType === 'string') {
                        ret.name = options[0];
                    } else if (firstItemType === 'number') {
                        ret.x = options[0];
                    }
                    i++;
                }
                while (j < valueCount) {
                    ret[pointArrayMap[j++]] = options[i++];
                }
            } else if (typeof options === 'object') {
                ret = options;

                // This is the fastest way to detect if there are individual point dataLabels that need
                // to be considered in drawDataLabels. These can only occur in object configs.
                if (options.dataLabels) {
                    series._hasPointLabels = true;
                }

                // Same approach as above for markers
                if (options.marker) {
                    series._hasPointMarkers = true;
                }
            }
            return ret;
        },

        /**
         * Destroy a point to clear memory. Its reference still stays in series.data.
         */
        destroy: function () {
            var point = this,
                series = point.series,
                chart = series.chart,
                hoverPoints = chart.hoverPoints,
                prop;

            chart.pointCount--;

            if (hoverPoints) {
                point.setState();
                erase(hoverPoints, point);
                if (!hoverPoints.length) {
                    chart.hoverPoints = null;
                }

            }
            if (point === chart.hoverPoint) {
                point.onMouseOut();
            }

            // remove all events
            if (point.graphic || point.dataLabel) { // removeEvent and destroyElements are performance expensive
                removeEvent(point);
                point.destroyElements();
            }

            if (point.legendItem) { // pies have legend items
                chart.legend.destroyItem(point);
            }

            for (prop in point) {
                point[prop] = null;
            }


        },

        /**
         * Destroy SVG elements associated with the point
         */
        destroyElements: function () {
            var point = this,
                props = ['graphic', 'dataLabel', 'dataLabelUpper', 'group', 'connector', 'shadowGroup'],
                prop,
                i = 6;
            while (i--) {
                prop = props[i];
                if (point[prop]) {
                    point[prop] = point[prop].destroy();
                }
            }
        },

        /**
         * Return the configuration hash needed for the data label and tooltip formatters
         */
        getLabelConfig: function () {
            var point = this;
            return {
                x: point.category,
                y: point.y,
                key: point.name || point.category,
                series: point.series,
                point: point,
                percentage: point.percentage,
                total: point.total || point.stackTotal
            };
        },

        /**
         * Extendable method for formatting each point's tooltip line
         *
         * @return {String} A string to be concatenated in to the common tooltip text
         */
        tooltipFormatter: function (pointFormat) {

            // Insert options for valueDecimals, valuePrefix, and valueSuffix
            var series = this.series,
                seriesTooltipOptions = series.tooltipOptions,
                valueDecimals = pick(seriesTooltipOptions.valueDecimals, ''),
                valuePrefix = seriesTooltipOptions.valuePrefix || '',
                valueSuffix = seriesTooltipOptions.valueSuffix || '';

            // Loop over the point array map and replace unformatted values with sprintf formatting markup
            each(series.pointArrayMap || ['y'], function (key) {
                key = '{point.' + key; // without the closing bracket
                if (valuePrefix || valueSuffix) {
                    pointFormat = pointFormat.replace(key + '}', valuePrefix + key + '}' + valueSuffix);
                }
                pointFormat = pointFormat.replace(key + '}', key + ':,.' + valueDecimals + 'f}');
            });

            return format(pointFormat, {
                point: this,
                series: this.series
            });
        }
    };/**
 * @classDescription The base function which all other series types inherit from. The data in the series is stored
 * in various arrays.
 *
 * - First, series.options.data contains all the original config options for
 * each point whether added by options or methods like series.addPoint.
 * - Next, series.data contains those values converted to points, but in case the series data length
 * exceeds the cropThreshold, or if the data is grouped, series.data doesn't contain all the points. It
 * only contains the points that have been created on demand.
 * - Then there's series.points that contains all currently visible point objects. In case of cropping,
 * the cropped-away points are not part of this array. The series.points array starts at series.cropStart
 * compared to series.data and series.options.data. If however the series data is grouped, these can't
 * be correlated one to one.
 * - series.xData and series.processedXData contain clean x values, equivalent to series.data and series.points.
 * - series.yData and series.processedYData contain clean x values, equivalent to series.data and series.points.
 *
 * @param {Object} chart
 * @param {Object} options
 */
    var Series = function () { };

    Series.prototype = {

        isCartesian: true,
        type: 'line',
        pointClass: Point,
        sorted: true, // requires the data to be sorted
        requireSorting: true,
        pointAttrToOptions: { // mapping between SVG attributes and the corresponding options
            stroke: 'lineColor',
            'stroke-width': 'lineWidth',
            fill: 'fillColor',
            r: 'radius'
        },
        axisTypes: ['xAxis', 'yAxis'],
        colorCounter: 0,
        parallelArrays: ['x', 'y'], // each point's x and y values are stored in this.xData and this.yData
        init: function (chart, options) {
            var series = this,
                eventType,
                events,
                chartSeries = chart.series,
                sortByIndex = function (a, b) {
                    return pick(a.options.index, a._i) - pick(b.options.index, b._i);
                };

            series.chart = chart;
            series.options = options = series.setOptions(options); // merge with plotOptions
            series.linkedSeries = [];

            // bind the axes
            series.bindAxes();

            // set some variables
            extend(series, {
                name: options.name,
                state: NORMAL_STATE,
                pointAttr: {},
                visible: options.visible !== false, // true by default
                selected: options.selected === true // false by default
            });

            // special
            if (useCanVG) {
                options.animation = false;
            }

            // register event listeners
            events = options.events;
            for (eventType in events) {
                addEvent(series, eventType, events[eventType]);
            }
            if (
                (events && events.click) ||
                (options.point && options.point.events && options.point.events.click) ||
                options.allowPointSelect
            ) {
                chart.runTrackerClick = true;
            }

            series.getColor();
            series.getSymbol();

            // Set the data
            each(series.parallelArrays, function (key) {
                series[key + 'Data'] = [];
            });
            series.setData(options.data, false);

            // Mark cartesian
            if (series.isCartesian) {
                chart.hasCartesianSeries = true;
            }

            // Register it in the chart
            chartSeries.push(series);
            series._i = chartSeries.length - 1;

            // Sort series according to index option (#248, #1123, #2456)
            stableSort(chartSeries, sortByIndex);
            if (this.yAxis) {
                stableSort(this.yAxis.series, sortByIndex);
            }

            each(chartSeries, function (series, i) {
                series.index = i;
                series.name = series.name || 'Series ' + (i + 1);
            });

        },

        /**
         * Set the xAxis and yAxis properties of cartesian series, and register the series
         * in the axis.series array
         */
        bindAxes: function () {
            var series = this,
                seriesOptions = series.options,
                chart = series.chart,
                axisOptions;

            each(series.axisTypes || [], function (AXIS) { // repeat for xAxis and yAxis

                each(chart[AXIS], function (axis) { // loop through the chart's axis objects
                    axisOptions = axis.options;

                    // apply if the series xAxis or yAxis option mathches the number of the
                    // axis, or if undefined, use the first axis
                    if ((seriesOptions[AXIS] === axisOptions.index) ||
                            (seriesOptions[AXIS] !== UNDEFINED && seriesOptions[AXIS] === axisOptions.id) ||
                            (seriesOptions[AXIS] === UNDEFINED && axisOptions.index === 0)) {

                        // register this series in the axis.series lookup
                        axis.series.push(series);

                        // set this series.xAxis or series.yAxis reference
                        series[AXIS] = axis;

                        // mark dirty for redraw
                        axis.isDirty = true;
                    }
                });

                // The series needs an X and an Y axis
                if (!series[AXIS] && series.optionalAxis !== AXIS) {
                    //LOGIFIX
                    // 20831 Error handling (added chart)
                    error(18, true, chart);
                }

            });
        },

        /**
         * For simple series types like line and column, the data values are held in arrays like
         * xData and yData for quick lookup to find extremes and more. For multidimensional series
         * like bubble and map, this can be extended with arrays like zData and valueData by
         * adding to the series.parallelArrays array.
         */
        updateParallelArrays: function (point, i) {
            var series = point.series,
                args = arguments,
                fn = typeof i === 'number' ?
                     // Insert the value in the given position
                    function (key) {
                        var val = key === 'y' && series.toYData ? series.toYData(point) : point[key];
                        series[key + 'Data'][i] = val;
                    } :
                    // Apply the method specified in i with the following arguments as arguments
                    function (key) {
                        Array.prototype[i].apply(series[key + 'Data'], Array.prototype.slice.call(args, 2));
                    };

            each(series.parallelArrays, fn);
        },

        /**
         * Return an auto incremented x value based on the pointStart and pointInterval options.
         * This is only used if an x value is not given for the point that calls autoIncrement.
         */
        autoIncrement: function () {
            var series = this,
                options = series.options,
                xIncrement = series.xIncrement;

            xIncrement = pick(xIncrement, options.pointStart, 0);

            series.pointInterval = pick(series.pointInterval, options.pointInterval, 1);

            series.xIncrement = xIncrement + series.pointInterval;
            return xIncrement;
        },

        /**
         * Divide the series data into segments divided by null values.
         */
        getSegments: function () {
            var series = this,
                lastNull = -1,
                segments = [],
                i,
                points = series.points,
                pointsLength = points.length;

            if (pointsLength) { // no action required for []

                // if connect nulls, just remove null points
                if (series.options.connectNulls) {
                    i = pointsLength;
                    while (i--) {
                        if (points[i].y === null) {
                            points.splice(i, 1);
                        }
                    }
                    if (points.length) {
                        segments = [points];
                    }

                    // else, split on null points
                } else {
                    each(points, function (point, i) {
                        if (point.y === null) {
                            if (i > lastNull + 1) {
                                segments.push(points.slice(lastNull + 1, i));
                            }
                            lastNull = i;
                        } else if (i === pointsLength - 1) { // last value
                            segments.push(points.slice(lastNull + 1, i + 1));
                        }
                    });
                }
            }

            // register it
            series.segments = segments;
        },

        /**
         * Set the series options by merging from the options tree
         * @param {Object} itemOptions
         */
        setOptions: function (itemOptions) {
            var chart = this.chart,
                chartOptions = chart.options,
                plotOptions = chartOptions.plotOptions,
                userOptions = chart.userOptions || {},
                userPlotOptions = userOptions.plotOptions || {},
                typeOptions = plotOptions[this.type],
                options;

            this.userOptions = itemOptions;

            options = merge(
                typeOptions,
                plotOptions.series,
                itemOptions
            );

            // The tooltip options are merged between global and series specific options
            this.tooltipOptions = merge(
                defaultOptions.tooltip,
                defaultOptions.plotOptions[this.type].tooltip,
                userOptions.tooltip,
                userPlotOptions.series && userPlotOptions.series.tooltip,
                userPlotOptions[this.type] && userPlotOptions[this.type].tooltip,
                itemOptions.tooltip
            );

            // Delete marker object if not allowed (#1125)
            if (typeOptions.marker === null) {
                delete options.marker;
            }

            return options;

        },
        /**
         * Get the series' color
         */
        getColor: function () {
            var options = this.options,
                userOptions = this.userOptions,
                defaultColors = this.chart.options.colors,
                counters = this.chart.counters,
                color,
                colorIndex;

            color = options.color || defaultPlotOptions[this.type].color;

            if (!color && !options.colorByPoint) {
                if (defined(userOptions._colorIndex)) { // after Series.update()
                    colorIndex = userOptions._colorIndex;
                } else {
                    userOptions._colorIndex = counters.color;
                    colorIndex = counters.color++;
                }
                color = defaultColors[colorIndex];
            }

            this.color = color;
            counters.wrapColor(defaultColors.length);
        },
        /**
         * Get the series' symbol
         */
        getSymbol: function () {
            var series = this,
                userOptions = series.userOptions,
                seriesMarkerOption = series.options.marker,
                chart = series.chart,
                defaultSymbols = chart.options.symbols,
                counters = chart.counters,
                symbolIndex;

            series.symbol = seriesMarkerOption.symbol;
            if (!series.symbol) {
                if (defined(userOptions._symbolIndex)) { // after Series.update()
                    symbolIndex = userOptions._symbolIndex;
                } else {
                    userOptions._symbolIndex = counters.symbol;
                    symbolIndex = counters.symbol++;
                }
                series.symbol = defaultSymbols[symbolIndex];
            }

            // don't substract radius in image symbols (#604)
            if (/^url/.test(series.symbol)) {
                seriesMarkerOption.radius = 0;
            }
            counters.wrapSymbol(defaultSymbols.length);
        },

        drawLegendSymbol: LegendSymbolMixin.drawLineMarker,

        /**
         * Replace the series data with a new set of data
         * @param {Object} data
         * @param {Object} redraw
         */
        setData: function (data, redraw, animation, updatePoints) {
            var series = this,
                oldData = series.points,
                oldDataLength = (oldData && oldData.length) || 0,
                dataLength,
                options = series.options,
                chart = series.chart,
                firstPoint = null,
                xAxis = series.xAxis,
                hasCategories = xAxis && !!xAxis.categories,
                tooltipPoints = series.tooltipPoints,
                i,
                turboThreshold = options.turboThreshold,
                pt,
                xData = this.xData,
                yData = this.yData,
                pointArrayMap = series.pointArrayMap,
                valueCount = pointArrayMap && pointArrayMap.length;

            data = data || [];
            dataLength = data.length;
            redraw = pick(redraw, true);

            // If the point count is the same as is was, just run Point.update which is
            // cheaper, allows animation, and keeps references to points.
            if (updatePoints !== false && dataLength && oldDataLength === dataLength && !series.cropped && !series.hasGroupedData) {
                each(data, function (point, i) {
                    oldData[i].update(point, false);
                });

            } else {

                // Reset properties
                series.xIncrement = null;
                series.pointRange = hasCategories ? 1 : options.pointRange;

                series.colorCounter = 0; // for series with colorByPoint (#1547)

                // Update parallel arrays
                each(this.parallelArrays, function (key) {
                    series[key + 'Data'].length = 0;
                });

                // In turbo mode, only one- or twodimensional arrays of numbers are allowed. The
                // first value is tested, and we assume that all the rest are defined the same
                // way. Although the 'for' loops are similar, they are repeated inside each
                // if-else conditional for max performance.
                if (turboThreshold && dataLength > turboThreshold) {

                    // find the first non-null point
                    i = 0;
                    while (firstPoint === null && i < dataLength) {
                        firstPoint = data[i];
                        i++;
                    }


                    if (isNumber(firstPoint)) { // assume all points are numbers
                        var x = pick(options.pointStart, 0),
                            pointInterval = pick(options.pointInterval, 1);

                        for (i = 0; i < dataLength; i++) {
                            xData[i] = x;
                            yData[i] = data[i];
                            x += pointInterval;
                        }
                        series.xIncrement = x;
                    } else if (isArray(firstPoint)) { // assume all points are arrays
                        if (valueCount) { // [x, low, high] or [x, o, h, l, c]
                            for (i = 0; i < dataLength; i++) {
                                pt = data[i];
                                xData[i] = pt[0];
                                yData[i] = pt.slice(1, valueCount + 1);
                            }
                        } else { // [x, y]
                            for (i = 0; i < dataLength; i++) {
                                pt = data[i];
                                xData[i] = pt[0];
                                yData[i] = pt[1];
                            }
                        }
                    } else {
                        //LOGIFIX
                        // 20831 Error handling (added chart)
                        error(12, false, chart); // Highcharts expects configs to be numbers or arrays in turbo mode
                    }
                } else {
                    for (i = 0; i < dataLength; i++) {
                        if (data[i] !== UNDEFINED) { // stray commas in oldIE
                            pt = { series: series };
                            series.pointClass.prototype.applyOptions.apply(pt, [data[i]]);
                            // LOGIFIX 
                            // 21353 Chart Canvas: large number of data points confuses chart rendering fix
                            if (!pt.isInvalidPoint) {
                                series.updateParallelArrays(pt, i);
                            }
                            if (hasCategories && pt.name) {
                                xAxis.names[pt.x] = pt.name; // #2046
                            }
                        }
                    }
                }

                // Forgetting to cast strings to numbers is a common caveat when handling CSV or JSON
                if (isString(yData[0])) {
                    //LOGIFIX
                    // 20831 Error handling (added chart)
                    error(14, true, chart);
                }

                series.data = [];
                series.options.data = data;
                //series.zData = zData;

                // destroy old points
                i = oldDataLength;
                while (i--) {
                    if (oldData[i] && oldData[i].destroy) {
                        oldData[i].destroy();
                    }
                }
                if (tooltipPoints) { // #2594
                    tooltipPoints.length = 0;
                }

                // reset minRange (#878)
                if (xAxis) {
                    xAxis.minRange = xAxis.userMinRange;
                }

                // redraw
                series.isDirty = series.isDirtyData = chart.isDirtyBox = true;
                animation = false;
            }

            if (redraw) {
                chart.redraw(animation);
            }
        },

        /**
         * Process the data by cropping away unused data points if the series is longer
         * than the crop threshold. This saves computing time for lage series.
         */
        processData: function (force) {
            var series = this,
                processedXData = series.xData, // copied during slice operation below
                processedYData = series.yData,
                dataLength = processedXData.length,
                croppedData,
                cropStart = 0,
                cropped,
                distance,
                closestPointRange,
                xAxis = series.xAxis,
                i, // loop variable
                options = series.options,
                cropThreshold = options.cropThreshold,
                isCartesian = series.isCartesian;

            // If the series data or axes haven't changed, don't go through this. Return false to pass
            // the message on to override methods like in data grouping.
            if (isCartesian && !series.isDirty && !xAxis.isDirty && !series.yAxis.isDirty && !force) {
                return false;
            }


            // optionally filter out points outside the plot area
            if (isCartesian && series.sorted && (!cropThreshold || dataLength > cropThreshold || series.forceCrop)) {
                var min = xAxis.min,
                    max = xAxis.max;

                // it's outside current extremes
                if (processedXData[dataLength - 1] < min || processedXData[0] > max) {
                    processedXData = [];
                    processedYData = [];

                    // only crop if it's actually spilling out
                } else if (processedXData[0] < min || processedXData[dataLength - 1] > max) {
                    croppedData = this.cropData(series.xData, series.yData, min, max);
                    processedXData = croppedData.xData;
                    processedYData = croppedData.yData;
                    cropStart = croppedData.start;
                    cropped = true;
                }
            }


            // Find the closest distance between processed points
            for (i = processedXData.length - 1; i >= 0; i--) {
                distance = processedXData[i] - processedXData[i - 1];
                if (distance > 0 && (closestPointRange === UNDEFINED || distance < closestPointRange)) {
                    closestPointRange = distance;

                    // Unsorted data is not supported by the line tooltip, as well as data grouping and
                    // navigation in Stock charts (#725) and width calculation of columns (#1900)
                } else if (distance < 0 && series.requireSorting) {
                    //LOGIFIX
                    // 20831 Error handling (added chart)
                    error(15, false, series.chart);
                }
            }

            // Record the properties
            series.cropped = cropped; // undefined or true
            series.cropStart = cropStart;
            series.processedXData = processedXData;
            series.processedYData = processedYData;

            if (options.pointRange === null) { // null means auto, as for columns, candlesticks and OHLC
                series.pointRange = closestPointRange || 1;
            }
            series.closestPointRange = closestPointRange;

        },

        /**
         * Iterate over xData and crop values between min and max. Returns object containing crop start/end
         * cropped xData with corresponding part of yData, dataMin and dataMax within the cropped range
         */
        cropData: function (xData, yData, min, max) {
            var dataLength = xData.length,
                cropStart = 0,
                cropEnd = dataLength,
                cropShoulder = pick(this.cropShoulder, 1), // line-type series need one point outside
                i;

            // iterate up to find slice start
            for (i = 0; i < dataLength; i++) {
                if (xData[i] >= min) {
                    cropStart = mathMax(0, i - cropShoulder);
                    break;
                }
            }

            // proceed to find slice end
            for (; i < dataLength; i++) {
                if (xData[i] > max) {
                    cropEnd = i + cropShoulder;
                    break;
                }
            }

            return {
                xData: xData.slice(cropStart, cropEnd),
                yData: yData.slice(cropStart, cropEnd),
                start: cropStart,
                end: cropEnd
            };
        },


        /**
         * Generate the data point after the data has been processed by cropping away
         * unused points and optionally grouped in Highcharts Stock.
         */
        generatePoints: function () {
            var series = this,
                options = series.options,
                dataOptions = options.data,
                data = series.data,
                dataLength,
                processedXData = series.processedXData,
                processedYData = series.processedYData,
                pointClass = series.pointClass,
                processedDataLength = processedXData.length,
                cropStart = series.cropStart || 0,
                cursor,
                hasGroupedData = series.hasGroupedData,
                point,
                points = [],
                i;

            if (!data && !hasGroupedData) {
                var arr = [];
                arr.length = dataOptions.length;
                data = series.data = arr;
            }

            for (i = 0; i < processedDataLength; i++) {
                cursor = cropStart + i;
                if (!hasGroupedData) {
                    if (data[cursor]) {
                        point = data[cursor];
                    } else if (dataOptions[cursor] !== UNDEFINED) { // #970
                        data[cursor] = point = (new pointClass()).init(series, dataOptions[cursor], processedXData[i]);
                    }
                    points[i] = point;
                } else {
                    // splat the y data in case of ohlc data array
                    points[i] = (new pointClass()).init(series, [processedXData[i]].concat(splat(processedYData[i])));
                }
            }

            // Hide cropped-away points - this only runs when the number of points is above cropThreshold, or when
            // swithching view from non-grouped data to grouped data (#637)
            if (data && (processedDataLength !== (dataLength = data.length) || hasGroupedData)) {
                for (i = 0; i < dataLength; i++) {
                    if (i === cropStart && !hasGroupedData) { // when has grouped data, clear all points
                        i += processedDataLength;
                    }
                    if (data[i]) {
                        data[i].destroyElements();
                        data[i].plotX = UNDEFINED; // #1003
                    }
                }
            }

            series.data = data;
            series.points = points;
        },

        /**
         * Calculate Y extremes for visible data
         */
        getExtremes: function (yData) {
            var xAxis = this.xAxis,
                yAxis = this.yAxis,
                xData = this.processedXData,
                yDataLength,
                activeYData = [],
                activeCounter = 0,
                xExtremes = xAxis.getExtremes(), // #2117, need to compensate for log X axis
                xMin = xExtremes.min,
                xMax = xExtremes.max,
                validValue,
                withinRange,
                dataMin,
                dataMax,
                x,
                y,
                i,
                j;

            yData = yData || this.stackedYData || this.processedYData;
            yDataLength = yData.length;

            for (i = 0; i < yDataLength; i++) {

                x = xData[i];
                y = yData[i];

                // For points within the visible range, including the first point outside the
                // visible range, consider y extremes
                validValue = y !== null && y !== UNDEFINED && (!yAxis.isLog || (y.length || y > 0));
                withinRange = this.getExtremesFromAll || this.cropped || ((xData[i + 1] || x) >= xMin &&
                    (xData[i - 1] || x) <= xMax);

                if (validValue && withinRange) {

                    j = y.length;
                    if (j) { // array, like ohlc or range data
                        while (j--) {
                            if (y[j] !== null) {
                                activeYData[activeCounter++] = y[j];
                            }
                        }
                    } else {
                        activeYData[activeCounter++] = y;
                    }
                }
            }
            this.dataMin = pick(dataMin, arrayMin(activeYData));
            this.dataMax = pick(dataMax, arrayMax(activeYData));
        },

        /**
         * Translate data points from raw data values to chart specific positioning data
         * needed later in drawPoints, drawGraph and drawTracker.
         */
        translate: function () {
            if (!this.processedXData) { // hidden series
                this.processData();
            }
            this.generatePoints();
            var series = this,
                options = series.options,
                stacking = options.stacking,
                xAxis = series.xAxis,
                categories = xAxis.categories,
                yAxis = series.yAxis,
                points = series.points,
                dataLength = points.length,
                hasModifyValue = !!series.modifyValue,
                i,
                pointPlacement = options.pointPlacement,
                dynamicallyPlaced = pointPlacement === 'between' || isNumber(pointPlacement),
                threshold = options.threshold;

            // Translate each point
            for (i = 0; i < dataLength; i++) {
                var point = points[i],
                    xValue = point.x,
                    yValue = point.y,
                    yBottom = point.low,
                    stack = stacking && yAxis.stacks[(series.negStacks && yValue < threshold ? '-' : '') + series.stackKey],
                    pointStack,
                    stackValues;

                // Discard disallowed y values for log axes
                if (yAxis.isLog && yValue <= 0) {
                    point.y = yValue = null;
                }

                // Get the plotX translation
                point.plotX = xAxis.translate(xValue, 0, 0, 0, 1, pointPlacement, this.type === 'flags'); // Math.round fixes #591


                // Calculate the bottom y value for stacked series
                if (stacking && series.visible && stack && stack[xValue]) {

                    pointStack = stack[xValue];
                    stackValues = pointStack.points[series.index];
                    yBottom = stackValues[0];
                    yValue = stackValues[1];

                    if (yBottom === 0) {
                        yBottom = pick(threshold, yAxis.min);
                    }
                    if (yAxis.isLog && yBottom <= 0) { // #1200, #1232
                        yBottom = null;
                    }

                    point.total = point.stackTotal = pointStack.total;
                    point.percentage = pointStack.total && (point.y / pointStack.total * 100);
                    point.stackY = yValue;

                    // Place the stack label
                    pointStack.setOffset(series.pointXOffset || 0, series.barW || 0);

                }

                // Set translated yBottom or remove it
                point.yBottom = defined(yBottom) ?
                    yAxis.translate(yBottom, 0, 1, 0, 1) :
                    null;

                // general hook, used for Highstock compare mode
                if (hasModifyValue) {
                    yValue = series.modifyValue(yValue, point);
                }

                // Set the the plotY value, reset it for redraws
                point.plotY = (typeof yValue === 'number' && yValue !== Infinity) ?
                    //mathRound(yAxis.translate(yValue, 0, 1, 0, 1) * 10) / 10 : // Math.round fixes #591
                    yAxis.translate(yValue, 0, 1, 0, 1) :
                    UNDEFINED;

                // Set client related positions for mouse tracking
                point.clientX = dynamicallyPlaced ? xAxis.translate(xValue, 0, 0, 0, 1) : point.plotX; // #1514

                point.negative = point.y < (threshold || 0);

                // some API data
                point.category = categories && categories[point.x] !== UNDEFINED ?
                    categories[point.x] : point.x;


            }

            // now that we have the cropped data, build the segments
            series.getSegments();
        },

        /**
         * Animate in the series
         */
        animate: function (init) {
            var series = this,
                chart = series.chart,
                renderer = chart.renderer,
                clipRect,
                markerClipRect,
                animation = series.options.animation,
                clipBox = chart.clipBox,
                inverted = chart.inverted,
                sharedClipKey;

            // Animation option is set to true
            if (animation && !isObject(animation)) {
                animation = defaultPlotOptions[series.type].animation;
            }
            sharedClipKey = '_sharedClip' + animation.duration + animation.easing;

            // Initialize the animation. Set up the clipping rectangle.
            if (init) {

                // If a clipping rectangle with the same properties is currently present in the chart, use that.
                clipRect = chart[sharedClipKey];
                markerClipRect = chart[sharedClipKey + 'm'];
                if (!clipRect) {
                    chart[sharedClipKey] = clipRect = renderer.clipRect(
                        extend(clipBox, { width: 0 })
                    );

                    chart[sharedClipKey + 'm'] = markerClipRect = renderer.clipRect(
                        -99, // include the width of the first marker
                        inverted ? -chart.plotLeft : -chart.plotTop,
                        99,
                        inverted ? chart.chartWidth : chart.chartHeight
                    );
                }
                series.group.clip(clipRect);
                series.markerGroup.clip(markerClipRect);
                series.sharedClipKey = sharedClipKey;

                // Run the animation
            } else {
                clipRect = chart[sharedClipKey];
                if (clipRect) {
                    clipRect.animate({
                        width: chart.plotSizeX
                    }, animation);
                    chart[sharedClipKey + 'm'].animate({
                        width: chart.plotSizeX + 99
                    }, animation);
                }

                // Delete this function to allow it only once
                series.animate = null;

                // Call the afterAnimate function on animation complete (but don't overwrite the animation.complete option
                // which should be available to the user).
                series.animationTimeout = setTimeout(function () {
                    series.afterAnimate();
                }, animation.duration);
            }
        },

        /**
         * This runs after animation to land on the final plot clipping
         */
        afterAnimate: function () {
            var chart = this.chart,
                sharedClipKey = this.sharedClipKey,
                group = this.group;

            if (group && this.options.clip !== false) {
                group.clip(chart.clipRect);
                this.markerGroup.clip(); // no clip
            }

            // Remove the shared clipping rectancgle when all series are shown
            setTimeout(function () {
                if (sharedClipKey && chart[sharedClipKey]) {
                    chart[sharedClipKey] = chart[sharedClipKey].destroy();
                    chart[sharedClipKey + 'm'] = chart[sharedClipKey + 'm'].destroy();
                }
            }, 100);
        },

        /**
         * Draw the markers
         */
        drawPoints: function () {
            var series = this,
                pointAttr,
                points = series.points,
                chart = series.chart,
                plotX,
                plotY,
                i,
                point,
                radius,
                symbol,
                isImage,
                graphic,
                options = series.options,
                seriesMarkerOptions = options.marker,
                seriesPointAttr = series.pointAttr[''],
                pointMarkerOptions,
                enabled,
                isInside,
                markerGroup = series.markerGroup;

            if (seriesMarkerOptions.enabled || series._hasPointMarkers) {

                i = points.length;
                while (i--) {
                    point = points[i];
                    plotX = mathFloor(point.plotX); // #1843
                    plotY = point.plotY;
                    graphic = point.graphic;
                    pointMarkerOptions = point.marker || {};
                    enabled = (seriesMarkerOptions.enabled && pointMarkerOptions.enabled === UNDEFINED) || pointMarkerOptions.enabled;
                    isInside = chart.isInsidePlot(mathRound(plotX), plotY, chart.inverted); // #1858

                    // only draw the point if y is defined
                    if (enabled && plotY !== UNDEFINED && !isNaN(plotY) && point.y !== null) {

                        // shortcuts
                        pointAttr = point.pointAttr[point.selected ? SELECT_STATE : NORMAL_STATE] || seriesPointAttr;
                        radius = pointAttr.r;
                        symbol = pick(pointMarkerOptions.symbol, series.symbol);
                        isImage = symbol.indexOf('url') === 0;

                        if (graphic) { // update
                            graphic
                                .attr({ // Since the marker group isn't clipped, each individual marker must be toggled
                                    visibility: isInside ? 'inherit' : HIDDEN
                                })
                                .animate(extend({
                                    x: plotX - radius,
                                    y: plotY - radius
                                }, graphic.symbolName ? { // don't apply to image symbols #507
                                    width: 2 * radius,
                                    height: 2 * radius
                                } : {}));
                        } else if (isInside && (radius > 0 || isImage)) {
                            point.graphic = graphic = chart.renderer.symbol(
                                symbol,
                                plotX - radius,
                                plotY - radius,
                                2 * radius,
                                2 * radius
                            )
                            .attr(pointAttr)
                            .add(markerGroup);
                        }

                    } else if (graphic) {
                        point.graphic = graphic.destroy(); // #1269
                    }
                }
            }

        },

        /**
         * Convert state properties from API naming conventions to SVG attributes
         *
         * @param {Object} options API options object
         * @param {Object} base1 SVG attribute object to inherit from
         * @param {Object} base2 Second level SVG attribute object to inherit from
         */
        convertAttribs: function (options, base1, base2, base3) {
            var conversion = this.pointAttrToOptions,
                attr,
                option,
                obj = {};

            options = options || {};
            base1 = base1 || {};
            base2 = base2 || {};
            base3 = base3 || {};

            for (attr in conversion) {
                option = conversion[attr];
                obj[attr] = pick(options[option], base1[attr], base2[attr], base3[attr]);
            }
            return obj;
        },

        /**
         * Get the state attributes. Each series type has its own set of attributes
         * that are allowed to change on a point's state change. Series wide attributes are stored for
         * all series, and additionally point specific attributes are stored for all
         * points with individual marker options. If such options are not defined for the point,
         * a reference to the series wide attributes is stored in point.pointAttr.
         */
        getAttribs: function () {
            var series = this,
                seriesOptions = series.options,
                normalOptions = defaultPlotOptions[series.type].marker ? seriesOptions.marker : seriesOptions,
                stateOptions = normalOptions.states,
                stateOptionsHover = stateOptions[HOVER_STATE],
                pointStateOptionsHover,
                seriesColor = series.color,
                normalDefaults = {
                    stroke: seriesColor,
                    fill: seriesColor
                },
                points = series.points || [], // #927
                i,
                point,
                seriesPointAttr = [],
                pointAttr,
                pointAttrToOptions = series.pointAttrToOptions,
                hasPointSpecificOptions = series.hasPointSpecificOptions,
                negativeColor = seriesOptions.negativeColor,
                defaultLineColor = normalOptions.lineColor,
                defaultFillColor = normalOptions.fillColor,
                turboThreshold = seriesOptions.turboThreshold,
                attr,
                key;

            // series type specific modifications
            if (seriesOptions.marker) { // line, spline, area, areaspline, scatter

                // if no hover radius is given, default to normal radius + 2
                stateOptionsHover.radius = stateOptionsHover.radius || normalOptions.radius + 2;
                stateOptionsHover.lineWidth = stateOptionsHover.lineWidth || normalOptions.lineWidth + 1;

            } else { // column, bar, pie

                // LOGIFIX 22385 ChartCanvas: Waterfall.HoverBrightness attribute doesn't work for positive values
                // if no hover color is given, brighten the normal color
                if (series.type !== "waterfall")
                    stateOptionsHover.color = stateOptionsHover.color ||
                        Color(stateOptionsHover.color || seriesColor)
                            .brighten(stateOptionsHover.brightness).get();
            }

            // general point attributes for the series normal state
            seriesPointAttr[NORMAL_STATE] = series.convertAttribs(normalOptions, normalDefaults);

            // HOVER_STATE and SELECT_STATE states inherit from normal state except the default radius
            each([HOVER_STATE, SELECT_STATE], function (state) {
                seriesPointAttr[state] =
                        series.convertAttribs(stateOptions[state], seriesPointAttr[NORMAL_STATE]);
            });

            // set it
            series.pointAttr = seriesPointAttr;

            // Generate the point-specific attribute collections if specific point
            // options are given. If not, create a referance to the series wide point
            // attributes
            i = points.length;
            if (!turboThreshold || i < turboThreshold || hasPointSpecificOptions) {
                while (i--) {
                    point = points[i];
                    normalOptions = (point.options && point.options.marker) || point.options;

                    //LOGIFIX 
                    // 21788 ChartCanvas: Hover Brightness doesn't work correctly for Waterfall
                    if (series.type == "waterfall" && !point.color) {
                        point.color = series.options[point.negative ? "negativeColor" : "upColor"];
                    }

                    if (normalOptions && normalOptions.enabled === false) {
                        normalOptions.radius = 0;
                    }

                    if (point.negative && negativeColor) {
                        point.color = point.fillColor = negativeColor;
                    }

                    //LOGIFIX
                    // 22046: ChartCanvas-> MarkerPointsHoverStyle-> Must inherit parent's color if empty
                    hasPointSpecificOptions = seriesOptions.colorByPoint || point.color ||
                        (point.options &&
                        point.options.marker &&
                        point.options.marker.states &&
                        point.options.marker.states.hover &&
                        point.options.marker.states.hover.enabled); // #868

                    // check if the point has specific visual options
                    if (point.options) {
                        for (key in pointAttrToOptions) {
                            if (defined(normalOptions[pointAttrToOptions[key]])) {
                                hasPointSpecificOptions = true;
                            }
                        }
                    }

                    // a specific marker config object is defined for the individual point:
                    // create it's own attribute collection
                    if (hasPointSpecificOptions) {
                        normalOptions = normalOptions || {};
                        pointAttr = [];
                        stateOptions = normalOptions.states || {}; // reassign for individual point
                        pointStateOptionsHover = stateOptions[HOVER_STATE] = stateOptions[HOVER_STATE] || {};

                        // Handle colors for column and pies
                        if (!seriesOptions.marker) { // column, bar, point
                            // If no hover color is given, brighten the normal color. #1619, #2579
                            pointStateOptionsHover.color = pointStateOptionsHover.color || (point.options && !point.options.color && stateOptionsHover.color) ||
                                Color(point.color)
                                    .brighten(pointStateOptionsHover.brightness || stateOptionsHover.brightness)
                                    .get();
                        }

                        // normal point state inherits series wide normal state
                        attr = { color: point.color }; // #868
                        if (!defaultFillColor) { // Individual point color or negative color markers (#2219)
                            attr.fillColor = point.color;
                        }
                        if (!defaultLineColor) {
                            attr.lineColor = point.color; // Bubbles take point color, line markers use white
                        }
                        // LOGIFIX 21302
                        pointAttr[NORMAL_STATE] = series.convertAttribs(extend(normalOptions, attr), seriesPointAttr[NORMAL_STATE]);

                        // inherit from point normal and series hover
                        pointAttr[HOVER_STATE] = series.convertAttribs(
                            stateOptions[HOVER_STATE],
                            seriesPointAttr[HOVER_STATE],
                            pointAttr[NORMAL_STATE]
                        );

                        //LOGIFIX 
                        // 21302 negative values (bar series) should not inherit background color from positive ones
                        if (point.negative && negativeColor) {
                            var negativeFill = {
                                fill: Color(negativeColor)
                                    .brighten(pointStateOptionsHover.brightness || stateOptionsHover.brightness)
                                    .get()
                            };
                            pointAttr[HOVER_STATE] = merge(pointAttr[HOVER_STATE], negativeFill);
                        }

                        // inherit from point normal and series hover
                        pointAttr[SELECT_STATE] = series.convertAttribs(
                            stateOptions[SELECT_STATE],
                            seriesPointAttr[SELECT_STATE],
                            pointAttr[NORMAL_STATE]
                        );


                        // no marker config object is created: copy a reference to the series-wide
                        // attribute collection
                    } else {
                        pointAttr = seriesPointAttr;
                    }

                    point.pointAttr = pointAttr;
                }
            }
        },

        /**
         * Clear DOM objects and free up memory
         */
        destroy: function () {
            var series = this,
                chart = series.chart,
                issue134 = /AppleWebKit\/533/.test(userAgent),
                destroy,
                i,
                data = series.data || [],
                point,
                prop,
                axis;

            // add event hook
            fireEvent(series, 'destroy');

            // remove all events
            removeEvent(series);

            // erase from axes
            each(series.axisTypes || [], function (AXIS) {
                axis = series[AXIS];
                if (axis) {
                    erase(axis.series, series);
                    axis.isDirty = axis.forceRedraw = true;
                }
            });

            // remove legend items
            if (series.legendItem) {
                series.chart.legend.destroyItem(series);
            }

            // destroy all points with their elements
            i = data.length;
            while (i--) {
                point = data[i];
                if (point && point.destroy) {
                    point.destroy();
                }
            }
            series.points = null;

            // Clear the animation timeout if we are destroying the series during initial animation
            clearTimeout(series.animationTimeout);

            // destroy all SVGElements associated to the series
            each(['area', 'graph', 'dataLabelsGroup', 'group', 'markerGroup', 'tracker',
                    'graphNeg', 'areaNeg', 'posClip', 'negClip'], function (prop) {
                        if (series[prop]) {

                            // issue 134 workaround
                            destroy = issue134 && prop === 'group' ?
                                'hide' :
                                'destroy';

                            series[prop][destroy]();
                        }
                    });

            // remove from hoverSeries
            if (chart.hoverSeries === series) {
                chart.hoverSeries = null;
            }
            erase(chart.series, series);

            // clear all members
            for (prop in series) {
                delete series[prop];
            }
        },

        /**
         * Return the graph path of a segment
         */
        getSegmentPath: function (segment) {
            var series = this,
                segmentPath = [],
                step = series.options.step;

            // build the segment line
            each(segment, function (point, i) {

                var plotX = point.plotX,
                    plotY = point.plotY,
                    lastPoint;

                if (series.getPointSpline) { // generate the spline as defined in the SplineSeries object
                    segmentPath.push.apply(segmentPath, series.getPointSpline(segment, point, i));

                } else {

                    // moveTo or lineTo
                    segmentPath.push(i ? L : M);

                    // step line?
                    if (step && i) {
                        lastPoint = segment[i - 1];
                        if (step === 'right') {
                            segmentPath.push(
                                lastPoint.plotX,
                                plotY
                            );

                        } else if (step === 'center') {
                            segmentPath.push(
                                (lastPoint.plotX + plotX) / 2,
                                lastPoint.plotY,
                                (lastPoint.plotX + plotX) / 2,
                                plotY
                            );

                        } else {
                            segmentPath.push(
                                plotX,
                                lastPoint.plotY
                            );
                        }
                    }

                    // normal line to next point
                    segmentPath.push(
                        point.plotX,
                        point.plotY
                    );
                }
            });

            return segmentPath;
        },

        /**
         * Get the graph path
         */
        getGraphPath: function () {
            var series = this,
                graphPath = [],
                segmentPath,
                singlePoints = []; // used in drawTracker

            // Divide into segments and build graph and area paths
            each(series.segments, function (segment) {

                segmentPath = series.getSegmentPath(segment);

                // add the segment to the graph, or a single point for tracking
                if (segment.length > 1) {
                    graphPath = graphPath.concat(segmentPath);
                } else {
                    singlePoints.push(segment[0]);
                }
            });

            // Record it for use in drawGraph and drawTracker, and return graphPath
            series.singlePoints = singlePoints;
            series.graphPath = graphPath;

            return graphPath;

        },

        /**
         * Draw the actual graph
         */
        drawGraph: function () {
            var series = this,
                options = this.options,
                props = [['graph', options.lineColor || this.color]],
                lineWidth = options.lineWidth,
                dashStyle = options.dashStyle,
                roundCap = options.linecap !== 'square',
                graphPath = this.getGraphPath(),
                negativeColor = options.negativeColor;

            if (negativeColor) {
                props.push(['graphNeg', negativeColor]);
            }

            // draw the graph
            each(props, function (prop, i) {
                var graphKey = prop[0],
                    graph = series[graphKey],
                    attribs;

                if (graph) {
                    stop(graph); // cancel running animations, #459
                    graph.animate({ d: graphPath });

                } else if (lineWidth && graphPath.length) { // #1487
                    attribs = {
                        stroke: prop[1],
                        'stroke-width': lineWidth,
                        fill: NONE,
                        zIndex: 1 // #1069
                    };
                    if (dashStyle) {
                        attribs.dashstyle = dashStyle;
                    } else if (roundCap) {
                        attribs['stroke-linecap'] = attribs['stroke-linejoin'] = 'round';
                    }

                    series[graphKey] = series.chart.renderer.path(graphPath)
                        .attr(attribs)
                        .add(series.group)
                        .shadow(!i && options.shadow);
                }
            });
        },

        /**
         * Clip the graphs into the positive and negative coloured graphs
         */
        clipNeg: function () {
            var options = this.options,
                chart = this.chart,
                renderer = chart.renderer,
                negativeColor = options.negativeColor || options.negativeFillColor,
                translatedThreshold,
                posAttr,
                negAttr,
                graph = this.graph,
                area = this.area,
                posClip = this.posClip,
                negClip = this.negClip,
                chartWidth = chart.chartWidth,
                chartHeight = chart.chartHeight,
                chartSizeMax = mathMax(chartWidth, chartHeight),
                yAxis = this.yAxis,
                above,
                below;

            if (negativeColor && (graph || area)) {
                translatedThreshold = mathRound(yAxis.toPixels(options.threshold || 0, true));
                if (translatedThreshold < 0) {
                    chartSizeMax -= translatedThreshold; // #2534
                }
                above = {
                    x: 0,
                    y: 0,
                    width: chartSizeMax,
                    height: translatedThreshold
                };
                below = {
                    x: 0,
                    y: translatedThreshold,
                    width: chartSizeMax,
                    height: chartSizeMax
                };

                if (chart.inverted) {

                    above.height = below.y = chart.plotWidth - translatedThreshold;
                    if (renderer.isVML) {
                        above = {
                            x: chart.plotWidth - translatedThreshold - chart.plotLeft,
                            y: 0,
                            width: chartWidth,
                            height: chartHeight
                        };
                        below = {
                            x: translatedThreshold + chart.plotLeft - chartWidth,
                            y: 0,
                            width: chart.plotLeft + translatedThreshold,
                            height: chartWidth
                        };
                    }
                }

                if (yAxis.reversed) {
                    posAttr = below;
                    negAttr = above;
                } else {
                    posAttr = above;
                    negAttr = below;
                }

                if (posClip) { // update
                    posClip.animate(posAttr);
                    negClip.animate(negAttr);
                } else {

                    this.posClip = posClip = renderer.clipRect(posAttr);
                    this.negClip = negClip = renderer.clipRect(negAttr);

                    if (graph && this.graphNeg) {
                        graph.clip(posClip);
                        this.graphNeg.clip(negClip);
                    }

                    if (area) {
                        area.clip(posClip);
                        this.areaNeg.clip(negClip);
                    }
                }
            }
        },

        /**
         * Initialize and perform group inversion on series.group and series.markerGroup
         */
        invertGroups: function () {
            var series = this,
                chart = series.chart;

            // Pie, go away (#1736)
            if (!series.xAxis) {
                return;
            }

            // A fixed size is needed for inversion to work
            function setInvert() {
                var size = {
                    width: series.yAxis.len,
                    height: series.xAxis.len
                };

                each(['group', 'markerGroup'], function (groupName) {
                    if (series[groupName]) {
                        series[groupName].attr(size).invert();
                    }
                });
            }

            addEvent(chart, 'resize', setInvert); // do it on resize
            addEvent(series, 'destroy', function () {
                removeEvent(chart, 'resize', setInvert);
            });

            // Do it now
            setInvert(); // do it now

            // On subsequent render and redraw, just do setInvert without setting up events again
            series.invertGroups = setInvert;
        },

        /**
         * General abstraction for creating plot groups like series.group, series.dataLabelsGroup and
         * series.markerGroup. On subsequent calls, the group will only be adjusted to the updated plot size.
         */
        plotGroup: function (prop, name, visibility, zIndex, parent) {
            var group = this[prop],
                isNew = !group;

            // Generate it on first call
            if (isNew) {
                this[prop] = group = this.chart.renderer.g(name)
                    .attr({
                        visibility: visibility,
                        zIndex: zIndex || 0.1 // IE8 needs this
                    })
                    .add(parent);
            }
            // Place it on first and subsequent (redraw) calls
            group[isNew ? 'attr' : 'animate'](this.getPlotBox());
            return group;
        },

        /**
         * Get the translation and scale for the plot area of this series
         */
        getPlotBox: function () {
            return {
                translateX: this.xAxis ? this.xAxis.left : this.chart.plotLeft,
                translateY: this.yAxis ? this.yAxis.top : this.chart.plotTop,
                scaleX: 1, // #1623
                scaleY: 1
            };
        },

        /**
         * Render the graph and markers
         */
        render: function () {
            var series = this,
                chart = series.chart,
                group,
                options = series.options,
                animation = options.animation,
                doAnimation = animation && !!series.animate &&
                    chart.renderer.isSVG, // this animation doesn't work in IE8 quirks when the group div is hidden,
                    // and looks bad in other oldIE
                visibility = series.visible ? VISIBLE : HIDDEN,
                zIndex = options.zIndex,
                hasRendered = series.hasRendered,
                chartSeriesGroup = chart.seriesGroup;

            // the group
            group = series.plotGroup(
                'group',
                'series',
                visibility,
                zIndex,
                chartSeriesGroup
            );

            series.markerGroup = series.plotGroup(
                'markerGroup',
                'markers',
                visibility,
                zIndex,
                chartSeriesGroup
            );

            // initiate the animation
            if (doAnimation) {
                series.animate(true);
            }

            // cache attributes for shapes
            series.getAttribs();

            // SVGRenderer needs to know this before drawing elements (#1089, #1795)
            group.inverted = series.isCartesian ? chart.inverted : false;

            // draw the graph if any
            if (series.drawGraph) {
                series.drawGraph();
                series.clipNeg();
            }

            // draw the data labels (inn pies they go before the points)
            if (series.drawDataLabels) {
                series.drawDataLabels();
            }

            // draw the points
            if (series.visible) {
                series.drawPoints();
            }


            // draw the mouse tracking area
            if (series.drawTracker && series.options.enableMouseTracking !== false) {
                series.drawTracker();
            }

            // Handle inverted series and tracker groups
            if (chart.inverted) {
                series.invertGroups();
            }

            // Initial clipping, must be defined after inverting groups for VML
            if (options.clip !== false && !series.sharedClipKey && !hasRendered) {
                group.clip(chart.clipRect);
            }

            // Run the animation
            if (doAnimation) {
                series.animate();
            } else if (!hasRendered) {
                series.afterAnimate();
            }

            series.isDirty = series.isDirtyData = false; // means data is in accordance with what you see
            // (See #322) series.isDirty = series.isDirtyData = false; // means data is in accordance with what you see
            series.hasRendered = true;
        },

        /**
         * Redraw the series after an update in the axes.
         */
        redraw: function () {
            var series = this,
                chart = series.chart,
                wasDirtyData = series.isDirtyData, // cache it here as it is set to false in render, but used after
                group = series.group,
                xAxis = series.xAxis,
                yAxis = series.yAxis;

            // reposition on resize
            if (group) {
                if (chart.inverted) {
                    group.attr({
                        width: chart.plotWidth,
                        height: chart.plotHeight
                    });
                }

                group.animate({
                    translateX: pick(xAxis && xAxis.left, chart.plotLeft),
                    translateY: pick(yAxis && yAxis.top, chart.plotTop)
                });
            }

            series.translate();
            series.setTooltipPoints(true);
            series.render();

            if (wasDirtyData) {
                fireEvent(series, 'updatedData');
            }
        }
    }; // end Series prototype

    /**
     * The class for stack items
     */
    function StackItem(axis, options, isNegative, x, stackOption, stacking) {

        var inverted = axis.chart.inverted;

        this.axis = axis;

        // Tells if the stack is negative
        this.isNegative = isNegative;

        // Save the options to be able to style the label
        this.options = options;

        // Save the x value to be able to position the label later
        this.x = x;

        // Initialize total value
        this.total = null;

        // This will keep each points' extremes stored by series.index
        this.points = {};

        // Save the stack option on the series configuration object, and whether to treat it as percent
        this.stack = stackOption;
        this.percent = stacking === 'percent';

        // The align options and text align varies on whether the stack is negative and
        // if the chart is inverted or not.
        // First test the user supplied value, then use the dynamic.
        this.alignOptions = {
            align: options.align || (inverted ? (isNegative ? 'left' : 'right') : 'center'),
            verticalAlign: options.verticalAlign || (inverted ? 'middle' : (isNegative ? 'bottom' : 'top')),
            y: pick(options.y, inverted ? 4 : (isNegative ? 14 : -6)),
            x: pick(options.x, inverted ? (isNegative ? -6 : 6) : 0)
        };

        this.textAlign = options.textAlign || (inverted ? (isNegative ? 'right' : 'left') : 'center');
    }

    StackItem.prototype = {
        destroy: function () {
            destroyObjectProperties(this, this.axis);
        },

        /**
         * Renders the stack total label and adds it to the stack label group.
         */
        render: function (group) {
            var options = this.options,
                formatOption = options.format,
                str = formatOption ?
                    format(formatOption, this) :
                    options.formatter.call(this);  // format the text in the label

            // Change the text to reflect the new total and set visibility to hidden in case the serie is hidden
            if (this.label) {
                this.label.attr({ text: str, visibility: HIDDEN });
                // Create new label
            } else {
                this.label =
                    this.axis.chart.renderer.text(str, 0, 0, options.useHTML)		// dummy positions, actual position updated with setOffset method in columnseries
                        .css(options.style)				// apply style
                        .attr({
                            align: this.textAlign,				// fix the text-anchor
                            rotation: options.rotation,	// rotation
                            visibility: HIDDEN					// hidden until setOffset is called
                        })
                        .add(group);							// add to the labels-group
            }
        },

        /**
         * Sets the offset that the stack has from the x value and repositions the label.
         */
        setOffset: function (xOffset, xWidth) {
            var stackItem = this,
                axis = stackItem.axis,
                chart = axis.chart,
                inverted = chart.inverted,
                neg = this.isNegative,							// special treatment is needed for negative stacks
                y = axis.translate(this.percent ? 100 : this.total, 0, 0, 0, 1), // stack value translated mapped to chart coordinates
                yZero = axis.translate(0),						// stack origin
                h = mathAbs(y - yZero),							// stack height
                x = chart.xAxis[0].translate(this.x) + xOffset,	// stack x position
                plotHeight = chart.plotHeight,
                stackBox = {	// this is the box for the complete stack
                    x: inverted ? (neg ? y : y - h) : x,
                    y: inverted ? plotHeight - x - xWidth : (neg ? (plotHeight - y - h) : plotHeight - y),
                    width: inverted ? h : xWidth,
                    height: inverted ? xWidth : h
                },
                label = this.label,
                alignAttr;

            if (label) {
                label.align(this.alignOptions, null, stackBox);	// align the label to the box

                // Set visibility (#678)
                alignAttr = label.alignAttr;
                label[this.options.crop === false || chart.isInsidePlot(alignAttr.x, alignAttr.y) ? 'show' : 'hide'](true);
            }
        }
    };


    // Stacking methods defined on the Axis prototype

    /**
     * Build the stacks from top down
     */
    Axis.prototype.buildStacks = function () {
        var series = this.series,
            reversedStacks = pick(this.options.reversedStacks, true),
            i = series.length;
        if (!this.isXAxis) {
            this.usePercentage = false;
            while (i--) {
                series[reversedStacks ? i : series.length - i - 1].setStackedPoints();
            }
            // Loop up again to compute percent stack
            if (this.usePercentage) {
                for (i = 0; i < series.length; i++) {
                    series[i].setPercentStacks();
                }
            }
        }
    };

    Axis.prototype.renderStackTotals = function () {
        var axis = this,
            chart = axis.chart,
            renderer = chart.renderer,
            stacks = axis.stacks,
            stackKey,
            oneStack,
            stackCategory,
            stackTotalGroup = axis.stackTotalGroup;

        // Create a separate group for the stack total labels
        if (!stackTotalGroup) {
            axis.stackTotalGroup = stackTotalGroup =
                renderer.g('stack-labels')
                    .attr({
                        visibility: VISIBLE,
                        zIndex: 6
                    })
                    .add();
        }

        // plotLeft/Top will change when y axis gets wider so we need to translate the
        // stackTotalGroup at every render call. See bug #506 and #516
        stackTotalGroup.translate(chart.plotLeft, chart.plotTop);

        // Render each stack total
        for (stackKey in stacks) {
            oneStack = stacks[stackKey];
            for (stackCategory in oneStack) {
                oneStack[stackCategory].render(stackTotalGroup);
            }
        }
    };


    // Stacking methods defnied for Series prototype

    /**
     * Adds series' points value to corresponding stack
     */
    Series.prototype.setStackedPoints = function () {
        if (!this.options.stacking || (this.visible !== true && this.chart.options.chart.ignoreHiddenSeries !== false)) {
            return;
        }

        var series = this,
            xData = series.processedXData,
            yData = series.processedYData,
            stackedYData = [],
            yDataLength = yData.length,
            seriesOptions = series.options,
            threshold = seriesOptions.threshold,
            stackOption = seriesOptions.stack,
            stacking = seriesOptions.stacking,
            stackKey = series.stackKey,
            negKey = '-' + stackKey,
            negStacks = series.negStacks,
            yAxis = series.yAxis,
            stacks = yAxis.stacks,
            oldStacks = yAxis.oldStacks,
            isNegative,
            stack,
            other,
            key,
            i,
            x,
            y;

        // loop over the non-null y values and read them into a local array
        for (i = 0; i < yDataLength; i++) {
            x = xData[i];
            y = yData[i];

            // Read stacked values into a stack based on the x value,
            // the sign of y and the stack key. Stacking is also handled for null values (#739)
            isNegative = negStacks && y < threshold;
            key = isNegative ? negKey : stackKey;

            // Create empty object for this stack if it doesn't exist yet
            if (!stacks[key]) {
                stacks[key] = {};
            }

            // Initialize StackItem for this x
            if (!stacks[key][x]) {
                if (oldStacks[key] && oldStacks[key][x]) {
                    stacks[key][x] = oldStacks[key][x];
                    stacks[key][x].total = null;
                } else {
                    stacks[key][x] = new StackItem(yAxis, yAxis.options.stackLabels, isNegative, x, stackOption, stacking);
                }
            }

            // If the StackItem doesn't exist, create it first
            stack = stacks[key][x];
            stack.points[series.index] = [stack.cum || 0];

            // Add value to the stack total
            if (stacking === 'percent') {

                // Percent stacked column, totals are the same for the positive and negative stacks
                other = isNegative ? stackKey : negKey;
                if (negStacks && stacks[other] && stacks[other][x]) {
                    other = stacks[other][x];
                    stack.total = other.total = mathMax(other.total, stack.total) + mathAbs(y) || 0;

                    // Percent stacked areas
                } else {
                    stack.total = correctFloat(stack.total + (mathAbs(y) || 0));
                }
            } else {
                stack.total = correctFloat(stack.total + (y || 0));
            }

            stack.cum = (stack.cum || 0) + (y || 0);

            stack.points[series.index].push(stack.cum);
            stackedYData[i] = stack.cum;

        }

        if (stacking === 'percent') {
            yAxis.usePercentage = true;
        }

        this.stackedYData = stackedYData; // To be used in getExtremes

        // Reset old stacks
        yAxis.oldStacks = {};
    };

    /**
     * Iterate over all stacks and compute the absolute values to percent
     */
    Series.prototype.setPercentStacks = function () {
        var series = this,
            stackKey = series.stackKey,
            stacks = series.yAxis.stacks,
            processedXData = series.processedXData;

        each([stackKey, '-' + stackKey], function (key) {
            var i = processedXData.length,
                x,
                stack,
                pointExtremes,
                totalFactor;

            while (i--) {
                x = processedXData[i];
                stack = stacks[key] && stacks[key][x];
                pointExtremes = stack && stack.points[series.index];
                if (pointExtremes) {
                    totalFactor = stack.total ? 100 / stack.total : 0;
                    pointExtremes[0] = correctFloat(pointExtremes[0] * totalFactor); // Y bottom value
                    pointExtremes[1] = correctFloat(pointExtremes[1] * totalFactor); // Y value
                    series.stackedYData[i] = pointExtremes[1];
                }
            }
        });
    };

    // Extend the Chart prototype for dynamic methods
    extend(Chart.prototype, {

        /**
         * Add a series dynamically after  time
         *
         * @param {Object} options The config options
         * @param {Boolean} redraw Whether to redraw the chart after adding. Defaults to true.
         * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
         *    configuration
         *
         * @return {Object} series The newly created series object
         */
        addSeries: function (options, redraw, animation) {
            var series,
                chart = this;

            if (options) {
                redraw = pick(redraw, true); // defaults to true

                fireEvent(chart, 'addSeries', { options: options }, function () {
                    series = chart.initSeries(options);

                    chart.isDirtyLegend = true; // the series array is out of sync with the display
                    chart.linkSeries();
                    if (redraw) {
                        chart.redraw(animation);
                    }
                });
            }

            return series;
        },

        /**
         * Add an axis to the chart
         * @param {Object} options The axis option
         * @param {Boolean} isX Whether it is an X axis or a value axis
         */
        addAxis: function (options, isX, redraw, animation) {
            var key = isX ? 'xAxis' : 'yAxis',
                chartOptions = this.options,
                axis;

            /*jslint unused: false*/
            axis = new Axis(this, merge(options, {
                index: this[key].length,
                isX: isX
            }));
            /*jslint unused: true*/

            // Push the new axis options to the chart options
            chartOptions[key] = splat(chartOptions[key] || {});
            chartOptions[key].push(options);

            if (pick(redraw, true)) {
                this.redraw(animation);
            }
        },

        /**
         * Dim the chart and show a loading text or symbol
         * @param {String} str An optional text to show in the loading label instead of the default one
         */
        showLoading: function (str) {
            var chart = this,
                options = chart.options,
                loadingDiv = chart.loadingDiv;

            var loadingOptions = options.loading;

            // create the layer at the first call
            if (!loadingDiv) {
                chart.loadingDiv = loadingDiv = createElement(DIV, {
                    className: PREFIX + 'loading'
                }, extend(loadingOptions.style, {
                    zIndex: 10,
                    display: NONE
                }), chart.container);

                chart.loadingSpan = createElement(
                    'span',
                    null,
                    loadingOptions.labelStyle,
                    loadingDiv
                );

            }

            // update text
            chart.loadingSpan.innerHTML = str || options.lang.loading;

            // show it
            if (!chart.loadingShown) {
                css(loadingDiv, {
                    //LOGIFIX
                    // 20890: ChartCanvas: crosstabbed stacked AreaSeries are in wrong order
                    //opacity: 0,
                    display: '',
                    left: chart.plotLeft + PX,
                    top: chart.plotTop + PX,
                    width: chart.plotWidth + PX,
                    height: chart.plotHeight + PX
                });
                animate(loadingDiv, {
                    opacity: loadingOptions.style.opacity
                }, {
                    duration: loadingOptions.showDuration || 0
                });
                chart.loadingShown = true;
            }
        },

        /**
         * Hide the loading layer
         */
        hideLoading: function () {
            var options = this.options,
                loadingDiv = this.loadingDiv;

            if (loadingDiv) {
                animate(loadingDiv, {
                    opacity: 0
                }, {
                    duration: options.loading.hideDuration || 100,
                    complete: function () {
                        css(loadingDiv, { display: NONE });
                    }
                });
            }
            this.loadingShown = false;
        }
    });

    // extend the Point prototype for dynamic methods
    extend(Point.prototype, {
        /**
         * Update the point with new options (typically x/y data) and optionally redraw the series.
         *
         * @param {Object} options Point options as defined in the series.data array
         * @param {Boolean} redraw Whether to redraw the chart or wait for an explicit call
         * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
         *    configuration
         *
         */
        update: function (options, redraw, animation) {
            var point = this,
                series = point.series,
                graphic = point.graphic,
                i,
                data = series.data,
                chart = series.chart,
                seriesOptions = series.options;

            redraw = pick(redraw, true);

            // fire the event with a default handler of doing the update
            point.firePointEvent('update', { options: options }, function () {

                point.applyOptions(options);

                // update visuals
                if (isObject(options)) {
                    series.getAttribs();
                    if (graphic) {
                        if (options && options.marker && options.marker.symbol) {
                            point.graphic = graphic.destroy();
                        } else {
                            graphic.attr(point.pointAttr[point.state || '']);
                        }
                    }
                    if (options && options.dataLabels && point.dataLabel) { // #2468
                        point.dataLabel = point.dataLabel.destroy();
                    }
                }

                // record changes in the parallel arrays
                i = inArray(point, data);
                series.updateParallelArrays(point, i);

                seriesOptions.data[i] = point.options;

                // redraw
                series.isDirty = series.isDirtyData = true;
                if (!series.fixedBox && series.hasCartesianSeries) { // #1906, #2320
                    chart.isDirtyBox = true;
                }

                if (seriesOptions.legendType === 'point') { // #1831, #1885
                    chart.legend.destroyItem(point);
                }
                if (redraw) {
                    chart.redraw(animation);
                }
            });
        },

        /**
         * Remove a point and optionally redraw the series and if necessary the axes
         * @param {Boolean} redraw Whether to redraw the chart or wait for an explicit call
         * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
         *    configuration
         */
        remove: function (redraw, animation) {
            var point = this,
                series = point.series,
                points = series.points,
                chart = series.chart,
                i,
                data = series.data;

            setAnimation(animation, chart);
            redraw = pick(redraw, true);

            // fire the event with a default handler of removing the point
            point.firePointEvent('remove', null, function () {

                // splice all the parallel arrays
                i = inArray(point, data);
                if (data.length === points.length) {
                    points.splice(i, 1);
                }
                data.splice(i, 1);
                series.options.data.splice(i, 1);
                series.updateParallelArrays(point, 'splice', i, 1);

                point.destroy();

                // redraw
                series.isDirty = true;
                series.isDirtyData = true;
                if (redraw) {
                    chart.redraw();
                }
            });
        }
    });

    // Extend the series prototype for dynamic methods
    extend(Series.prototype, {
        /**
         * Add a point dynamically after chart load time
         * @param {Object} options Point options as given in series.data
         * @param {Boolean} redraw Whether to redraw the chart or wait for an explicit call
         * @param {Boolean} shift If shift is true, a point is shifted off the start
         *    of the series as one is appended to the end.
         * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
         *    configuration
         */
        addPoint: function (options, redraw, shift, animation) {
            var series = this,
                seriesOptions = series.options,
                data = series.data,
                graph = series.graph,
                area = series.area,
                chart = series.chart,
                names = series.xAxis && series.xAxis.names,
                currentShift = (graph && graph.shift) || 0,
                dataOptions = seriesOptions.data,
                point,
                isInTheMiddle,
                xData = series.xData,
                x,
                i;

            setAnimation(animation, chart);

            // Make graph animate sideways
            if (shift) {
                each([graph, area, series.graphNeg, series.areaNeg], function (shape) {
                    if (shape) {
                        shape.shift = currentShift + 1;
                    }
                });
            }
            if (area) {
                area.isArea = true; // needed in animation, both with and without shift
            }

            // Optional redraw, defaults to true
            redraw = pick(redraw, true);

            // Get options and push the point to xData, yData and series.options. In series.generatePoints
            // the Point instance will be created on demand and pushed to the series.data array.
            point = { series: series };
            series.pointClass.prototype.applyOptions.apply(point, [options]);
            x = point.x;

            // Get the insertion point
            i = xData.length;
            if (series.requireSorting && x < xData[i - 1]) {
                isInTheMiddle = true;
                while (i && xData[i - 1] > x) {
                    i--;
                }
            }

            series.updateParallelArrays(point, 'splice', i, 0, 0); // insert undefined item
            series.updateParallelArrays(point, i); // update it

            if (names) {
                names[x] = point.name;
            }
            dataOptions.splice(i, 0, options);

            if (isInTheMiddle) {
                series.data.splice(i, 0, null);
                series.processData();
            }

            // Generate points to be added to the legend (#1329)
            if (seriesOptions.legendType === 'point') {
                series.generatePoints();
            }

            // Shift the first point off the parallel arrays
            // todo: consider series.removePoint(i) method
            if (shift) {
                if (data[0] && data[0].remove) {
                    data[0].remove(false);
                } else {
                    data.shift();
                    series.updateParallelArrays(point, 'shift');

                    dataOptions.shift();
                }
            }

            // redraw
            series.isDirty = true;
            series.isDirtyData = true;
            if (redraw) {
                series.getAttribs(); // #1937
                chart.redraw();
            }
        },

        /**
         * Remove a series and optionally redraw the chart
         *
         * @param {Boolean} redraw Whether to redraw the chart or wait for an explicit call
         * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
         *    configuration
         */

        remove: function (redraw, animation) {
            var series = this,
                chart = series.chart;
            redraw = pick(redraw, true);

            if (!series.isRemoving) {  /* prevent triggering native event in jQuery
				(calling the remove function from the remove event) */
                series.isRemoving = true;

                // fire the event with a default handler of removing the point
                fireEvent(series, 'remove', null, function () {


                    // destroy elements
                    series.destroy();


                    // redraw
                    chart.isDirtyLegend = chart.isDirtyBox = true;
                    chart.linkSeries();

                    if (redraw) {
                        chart.redraw(animation);
                    }
                });

            }
            series.isRemoving = false;
        },

        /**
         * Update the series with a new set of options
         */
        update: function (newOptions, redraw) {
            var chart = this.chart,
                // must use user options when changing type because this.options is merged
                // in with type specific plotOptions
                oldOptions = this.userOptions,
                oldType = this.type,
                proto = seriesTypes[oldType].prototype,
                n;

            // Do the merge, with some forced options
            newOptions = merge(oldOptions, {
                animation: false,
                index: this.index,
                pointStart: this.xData[0] // when updating after addPoint
            }, { data: this.options.data }, newOptions);

            // Destroy the series and reinsert methods from the type prototype
            this.remove(false);
            for (n in proto) { // Overwrite series-type specific methods (#2270)
                if (proto.hasOwnProperty(n)) {
                    this[n] = UNDEFINED;
                }
            }
            extend(this, seriesTypes[newOptions.type || oldType].prototype);


            this.init(chart, newOptions);
            if (pick(redraw, true)) {
                chart.redraw(false);
            }
        }
    });

    // Extend the Axis.prototype for dynamic methods
    extend(Axis.prototype, {

        /**
         * Update the axis with a new options structure
         */
        update: function (newOptions, redraw) {
            var chart = this.chart;

            newOptions = chart.options[this.coll][this.options.index] = merge(this.userOptions, newOptions);

            this.destroy(true);
            this._addedPlotLB = this.userMin = this.userMax = UNDEFINED; // #1611, #2306

            this.init(chart, extend(newOptions, { events: UNDEFINED }));

            chart.isDirtyBox = true;
            if (pick(redraw, true)) {
                chart.redraw();
            }
        },

        /**
         * Remove the axis from the chart
         */
        remove: function (redraw) {
            var chart = this.chart,
                key = this.coll, // xAxis or yAxis
                axisSeries = this.series,
                i = axisSeries.length;

            // Remove associated series (#2687)
            while (i--) {
                if (axisSeries[i]) {
                    axisSeries[i].remove(false);
                }
            }

            // Remove the axis
            erase(chart.axes, this);
            erase(chart[key], this);
            chart.options[key].splice(this.options.index, 1);
            each(chart[key], function (axis, i) { // Re-index, #1706
                axis.options.index = i;
            });
            this.destroy();
            chart.isDirtyBox = true;

            if (pick(redraw, true)) {
                chart.redraw();
            }
        },

        /**
         * Update the axis title by options
         */
        setTitle: function (newTitleOptions, redraw) {
            this.update({ title: newTitleOptions }, redraw);
        },

        /**
         * Set new axis categories and optionally redraw
         * @param {Array} categories
         * @param {Boolean} redraw
         */
        setCategories: function (categories, redraw) {
            this.update({ categories: categories }, redraw);
        }

    });


    /**
     * LineSeries object
     */
    var LineSeries = extendClass(Series);
    seriesTypes.line = LineSeries;

    /**
     * Set the default options for area
     */
    defaultPlotOptions.area = merge(defaultSeriesOptions, {
        threshold: 0
        // trackByArea: false,
        // lineColor: null, // overrides color, but lets fillColor be unaltered
        // fillOpacity: 0.75,
        // fillColor: null
    });

    /**
     * AreaSeries object
     */
    var AreaSeries = extendClass(Series, {
        type: 'area',
        /**
         * For stacks, don't split segments on null values. Instead, draw null values with 
         * no marker. Also insert dummy points for any X position that exists in other series
         * in the stack.
         */
        getSegments: function () {
            var segments = [],
                segment = [],
                keys = [],
                xAxis = this.xAxis,
                yAxis = this.yAxis,
                stack = yAxis.stacks[this.stackKey],
                pointMap = {},
                plotX,
                plotY,
                points = this.points,
                connectNulls = this.options.connectNulls,
                val,
                i,
                x;

            if (this.options.stacking && !this.cropped) { // cropped causes artefacts in Stock, and perf issue
                // Create a map where we can quickly look up the points by their X value.
                for (i = 0; i < points.length; i++) {
                    pointMap[points[i].x] = points[i];
                }

                // Sort the keys (#1651)
                for (x in stack) {
                    if (stack[x].total !== null) { // nulled after switching between grouping and not (#1651, #2336)
                        keys.push(+x);
                    }
                }
                keys.sort(function (a, b) {
                    return a - b;
                });

                each(keys, function (x) {
                    if (connectNulls && (!pointMap[x] || pointMap[x].y === null)) { // #1836
                        return;

                        // The point exists, push it to the segment
                    } else if (pointMap[x]) {
                        segment.push(pointMap[x]);

                        // There is no point for this X value in this series, so we 
                        // insert a dummy point in order for the areas to be drawn
                        // correctly.
                    } else {
                        plotX = xAxis.translate(x);
                        val = stack[x].percent ? (stack[x].total ? stack[x].cum * 100 / stack[x].total : 0) : stack[x].cum; // #1991
                        plotY = yAxis.toPixels(val, true);
                        segment.push({
                            y: null,
                            plotX: plotX,
                            clientX: plotX,
                            plotY: plotY,
                            yBottom: plotY,
                            onMouseOver: noop
                        });
                    }
                });

                if (segment.length) {
                    segments.push(segment);
                }

            } else {
                Series.prototype.getSegments.call(this);
                segments = this.segments;
            }

            this.segments = segments;
        },

        /**
         * Extend the base Series getSegmentPath method by adding the path for the area.
         * This path is pushed to the series.areaPath property.
         */
        getSegmentPath: function (segment) {

            var segmentPath = Series.prototype.getSegmentPath.call(this, segment), // call base method
                areaSegmentPath = [].concat(segmentPath), // work on a copy for the area path
                i,
                options = this.options,
                segLength = segmentPath.length,
                translatedThreshold = this.yAxis.getThreshold(options.threshold), // #2181
                yBottom;

            if (segLength === 3) { // for animation from 1 to two points
                areaSegmentPath.push(L, segmentPath[1], segmentPath[2]);
            }
            if (options.stacking && !this.closedStacks) {

                // Follow stack back. Todo: implement areaspline. A general solution could be to 
                // reverse the entire graphPath of the previous series, though may be hard with
                // splines and with series with different extremes
                for (i = segment.length - 1; i >= 0; i--) {

                    yBottom = pick(segment[i].yBottom, translatedThreshold);

                    // step line?
                    if (i < segment.length - 1 && options.step) {
                        areaSegmentPath.push(segment[i + 1].plotX, yBottom);
                    }

                    areaSegmentPath.push(segment[i].plotX, yBottom);
                }

            } else { // follow zero line back
                this.closeSegment(areaSegmentPath, segment, translatedThreshold);
            }
            this.areaPath = this.areaPath.concat(areaSegmentPath);
            return segmentPath;
        },

        /**
         * Extendable method to close the segment path of an area. This is overridden in polar 
         * charts.
         */
        closeSegment: function (path, segment, translatedThreshold) {
            path.push(
                L,
                segment[segment.length - 1].plotX,
                translatedThreshold,
                L,
                segment[0].plotX,
                translatedThreshold
            );
        },

        /**
         * Draw the graph and the underlying area. This method calls the Series base
         * function and adds the area. The areaPath is calculated in the getSegmentPath
         * method called from Series.prototype.drawGraph.
         */
        drawGraph: function () {

            // Define or reset areaPath
            this.areaPath = [];

            // Call the base method
            Series.prototype.drawGraph.apply(this);

            // Define local variables
            var series = this,
                areaPath = this.areaPath,
                options = this.options,
                negativeColor = options.negativeColor,
                negativeFillColor = options.negativeFillColor,
                props = [['area', this.color, options.fillColor]]; // area name, main color, fill color

            if (negativeColor || negativeFillColor) {
                props.push(['areaNeg', negativeColor, negativeFillColor]);
            }

            each(props, function (prop) {
                var areaKey = prop[0],
                    area = series[areaKey];

                // Create or update the area
                if (area) { // update
                    area.animate({ d: areaPath });

                } else { // create
                    series[areaKey] = series.chart.renderer.path(areaPath)
                        .attr({
                            fill: pick(
                                prop[2],
                                Color(prop[1]).setOpacity(pick(options.fillOpacity, 0.75)).get()
                            ),
                            zIndex: 0 // #1069
                        }).add(series.group);
                }
            });
        },

        drawLegendSymbol: LegendSymbolMixin.drawRectangle
    });

    seriesTypes.area = AreaSeries;
    /**
     * Set the default options for spline
     */
    defaultPlotOptions.spline = merge(defaultSeriesOptions);

    /**
     * SplineSeries object
     */
    var SplineSeries = extendClass(Series, {
        type: 'spline',

        /**
         * Get the spline segment from a given point's previous neighbour to the given point
         */
        getPointSpline: function (segment, point, i) {
            var smoothing = 1.5, // 1 means control points midway between points, 2 means 1/3 from the point, 3 is 1/4 etc
                denom = smoothing + 1,
                plotX = point.plotX,
                plotY = point.plotY,
                lastPoint = segment[i - 1],
                nextPoint = segment[i + 1],
                leftContX,
                leftContY,
                rightContX,
                rightContY,
                ret;

            // find control points
            if (lastPoint && nextPoint) {

                var lastX = lastPoint.plotX,
                    lastY = lastPoint.plotY,
                    nextX = nextPoint.plotX,
                    nextY = nextPoint.plotY,
                    correction;

                leftContX = (smoothing * plotX + lastX) / denom;
                leftContY = (smoothing * plotY + lastY) / denom;
                rightContX = (smoothing * plotX + nextX) / denom;
                rightContY = (smoothing * plotY + nextY) / denom;

                // have the two control points make a straight line through main point
                correction = ((rightContY - leftContY) * (rightContX - plotX)) /
                    (rightContX - leftContX) + plotY - rightContY;

                leftContY += correction;
                rightContY += correction;

                // to prevent false extremes, check that control points are between
                // neighbouring points' y values
                if (leftContY > lastY && leftContY > plotY) {
                    leftContY = mathMax(lastY, plotY);
                    rightContY = 2 * plotY - leftContY; // mirror of left control point
                } else if (leftContY < lastY && leftContY < plotY) {
                    leftContY = mathMin(lastY, plotY);
                    rightContY = 2 * plotY - leftContY;
                }
                if (rightContY > nextY && rightContY > plotY) {
                    rightContY = mathMax(nextY, plotY);
                    leftContY = 2 * plotY - rightContY;
                } else if (rightContY < nextY && rightContY < plotY) {
                    rightContY = mathMin(nextY, plotY);
                    leftContY = 2 * plotY - rightContY;
                }

                // record for drawing in next point
                point.rightContX = rightContX;
                point.rightContY = rightContY;

            }

            // Visualize control points for debugging
            /*
            if (leftContX) {
                this.chart.renderer.circle(leftContX + this.chart.plotLeft, leftContY + this.chart.plotTop, 2)
                    .attr({
                        stroke: 'red',
                        'stroke-width': 1,
                        fill: 'none'
                    })
                    .add();
                this.chart.renderer.path(['M', leftContX + this.chart.plotLeft, leftContY + this.chart.plotTop,
                    'L', plotX + this.chart.plotLeft, plotY + this.chart.plotTop])
                    .attr({
                        stroke: 'red',
                        'stroke-width': 1
                    })
                    .add();
                this.chart.renderer.circle(rightContX + this.chart.plotLeft, rightContY + this.chart.plotTop, 2)
                    .attr({
                        stroke: 'green',
                        'stroke-width': 1,
                        fill: 'none'
                    })
                    .add();
                this.chart.renderer.path(['M', rightContX + this.chart.plotLeft, rightContY + this.chart.plotTop,
                    'L', plotX + this.chart.plotLeft, plotY + this.chart.plotTop])
                    .attr({
                        stroke: 'green',
                        'stroke-width': 1
                    })
                    .add();
            }
            */

            // moveTo or lineTo
            if (!i) {
                ret = [M, plotX, plotY];
            } else { // curve from last point to this
                ret = [
                    'C',
                    lastPoint.rightContX || lastPoint.plotX,
                    lastPoint.rightContY || lastPoint.plotY,
                    leftContX || plotX,
                    leftContY || plotY,
                    plotX,
                    plotY
                ];
                lastPoint.rightContX = lastPoint.rightContY = null; // reset for updating series later
            }
            return ret;
        }
    });
    seriesTypes.spline = SplineSeries;

    /**
     * Set the default options for areaspline
     */
    defaultPlotOptions.areaspline = merge(defaultPlotOptions.area);

    /**
     * AreaSplineSeries object
     */
    var areaProto = AreaSeries.prototype,
        AreaSplineSeries = extendClass(SplineSeries, {
            type: 'areaspline',
            closedStacks: true, // instead of following the previous graph back, follow the threshold back

            // Mix in methods from the area series
            getSegmentPath: areaProto.getSegmentPath,
            closeSegment: areaProto.closeSegment,
            drawGraph: areaProto.drawGraph,
            drawLegendSymbol: LegendSymbolMixin.drawRectangle
        });

    seriesTypes.areaspline = AreaSplineSeries;

    /**
     * Set the default options for column
     */
    defaultPlotOptions.column = merge(defaultSeriesOptions, {
        borderColor: '#FFFFFF',
        borderWidth: 1,
        borderRadius: 0,
        //colorByPoint: undefined,
        groupPadding: 0.2,
        //grouping: true,
        marker: null, // point options are specified in the base options
        pointPadding: 0.1,
        //pointWidth: null,
        minPointLength: 0,
        cropThreshold: 50, // when there are more points, they will not animate out of the chart on xAxis.setExtremes
        pointRange: null, // null means auto, meaning 1 in a categorized axis and least distance between points if not categories
        states: {
            hover: {
                brightness: 0.1,
                shadow: false
            },
            select: {
                color: '#C0C0C0',
                borderColor: '#000000',
                shadow: false
            }
        },
        dataLabels: {
            align: null, // auto
            verticalAlign: null, // auto
            y: null
        },
        stickyTracking: false,
        threshold: 0
    });

    /**
     * ColumnSeries object
     */
    var ColumnSeries = extendClass(Series, {
        type: 'column',
        pointAttrToOptions: { // mapping between SVG attributes and the corresponding options
            stroke: 'borderColor',
            'stroke-width': 'borderWidth',
            fill: 'color',
            r: 'borderRadius'
        },
        cropShoulder: 0,
        trackerGroups: ['group', 'dataLabelsGroup'],
        negStacks: true, // use separate negative stacks, unlike area stacks where a negative 
        // point is substracted from previous (#1910)

        /**
         * Initialize the series
         */
        init: function () {
            Series.prototype.init.apply(this, arguments);

            var series = this,
                chart = series.chart;

            // if the series is added dynamically, force redraw of other
            // series affected by a new column
            if (chart.hasRendered) {
                each(chart.series, function (otherSeries) {
                    if (otherSeries.type === series.type) {
                        otherSeries.isDirty = true;
                    }
                });
            }
        },

        /**
         * Return the width and x offset of the columns adjusted for grouping, groupPadding, pointPadding,
         * pointWidth etc. 
         */
        getColumnMetrics: function () {

            var series = this,
                options = series.options,
                xAxis = series.xAxis,
                yAxis = series.yAxis,
                reversedXAxis = xAxis.reversed,
                stackKey,
                stackGroups = {},
                columnIndex,
                columnCount = 0;

            // Get the total number of column type series.
            // This is called on every series. Consider moving this logic to a
            // chart.orderStacks() function and call it on init, addSeries and removeSeries
            if (options.grouping === false) {
                columnCount = 1;
            } else {
                each(series.chart.series, function (otherSeries) {
                    var otherOptions = otherSeries.options,
                        otherYAxis = otherSeries.yAxis;
                    if (otherSeries.type === series.type && otherSeries.visible &&
                            yAxis.len === otherYAxis.len && yAxis.pos === otherYAxis.pos) {  // #642, #2086
                        if (otherOptions.stacking) {
                            stackKey = otherSeries.stackKey;
                            if (stackGroups[stackKey] === UNDEFINED) {
                                stackGroups[stackKey] = columnCount++;
                            }
                            columnIndex = stackGroups[stackKey];
                        } else if (otherOptions.grouping !== false) { // #1162
                            columnIndex = columnCount++;
                        }
                        otherSeries.columnIndex = columnIndex;
                    }
                });
            }

            var categoryWidth = mathMin(
                    mathAbs(xAxis.transA) * (xAxis.ordinalSlope || options.pointRange || xAxis.closestPointRange || xAxis.tickInterval || 1), // #2610
                    xAxis.len // #1535
                ),
                groupPadding = categoryWidth * options.groupPadding,
                groupWidth = categoryWidth - 2 * groupPadding,
                pointOffsetWidth = groupWidth / columnCount,
                optionPointWidth = options.pointWidth,
                pointPadding = defined(optionPointWidth) ? (pointOffsetWidth - optionPointWidth) / 2 :
                    pointOffsetWidth * options.pointPadding,
                pointWidth = pick(optionPointWidth, pointOffsetWidth - 2 * pointPadding), // exact point width, used in polar charts
                colIndex = (reversedXAxis ?
                    columnCount - (series.columnIndex || 0) : // #1251
                    series.columnIndex) || 0,
                pointXOffset = pointPadding + (groupPadding + colIndex *
                    pointOffsetWidth - (categoryWidth / 2)) *
                    (reversedXAxis ? -1 : 1);

            // Save it for reading in linked series (Error bars particularly)
            return (series.columnMetrics = {
                width: pointWidth,
                offset: pointXOffset
            });

        },

        /**
         * Translate each point to the plot area coordinate system and find shape positions
         */
        translate: function () {
            var series = this,
                chart = series.chart,
                options = series.options,
                borderWidth = options.borderWidth,
                yAxis = series.yAxis,
                threshold = options.threshold,
                translatedThreshold = series.translatedThreshold = yAxis.getThreshold(threshold),
                minPointLength = pick(options.minPointLength, 5),
                metrics = series.getColumnMetrics(),
                pointWidth = metrics.width,
                seriesBarW = series.barW = mathCeil(mathMax(pointWidth, 1 + 2 * borderWidth)), // rounded and postprocessed for border width
                pointXOffset = series.pointXOffset = metrics.offset,
                xCrisp = -(borderWidth % 2 ? 0.5 : 0),
                yCrisp = borderWidth % 2 ? 0.5 : 1;

            if (chart.renderer.isVML && chart.inverted) {
                yCrisp += 1;
            }

            Series.prototype.translate.apply(series);

            // record the new values
            each(series.points, function (point) {
                var yBottom = pick(point.yBottom, translatedThreshold),
                    plotY = mathMin(mathMax(-999 - yBottom, point.plotY), yAxis.len + 999 + yBottom), // Don't draw too far outside plot area (#1303, #2241)
                    barX = point.plotX + pointXOffset,
                    barW = seriesBarW,
                    barY = mathMin(plotY, yBottom),
                    right,
                    bottom,
                    fromTop,
                    fromLeft,
                    barH = mathMax(plotY, yBottom) - barY;

                // Handle options.minPointLength
                if (mathAbs(barH) < minPointLength) {
                    if (minPointLength) {
                        barH = minPointLength;
                        barY =
                            mathRound(mathAbs(barY - translatedThreshold) > minPointLength ? // stacked
                                yBottom - minPointLength : // keep position
                                translatedThreshold - (yAxis.translate(point.y, 0, 1, 0, 1) <= translatedThreshold ? minPointLength : 0)); // use exact yAxis.translation (#1485)
                    }
                }

                // Cache for access in polar
                point.barX = barX;
                point.pointWidth = pointWidth;

                // Round off to obtain crisp edges
                fromLeft = mathAbs(barX) < 0.5;
                right = mathRound(barX + barW) + xCrisp;
                barX = mathRound(barX) + xCrisp;
                barW = right - barX;

                fromTop = mathAbs(barY) < 0.5;
                bottom = mathRound(barY + barH) + yCrisp;
                barY = mathRound(barY) + yCrisp;
                barH = bottom - barY;

                // Top and left edges are exceptions
                if (fromLeft) {
                    barX += 1;
                    barW -= 1;
                }
                if (fromTop) {
                    barY -= 1;
                    barH += 1;
                }

                // Register shape type and arguments to be used in drawPoints
                point.shapeType = 'rect';
                point.shapeArgs = {
                    x: barX,
                    y: barY,
                    width: barW,
                    height: barH
                };
            });

        },

        getSymbol: noop,

        /**
         * Use a solid rectangle like the area series types
         */
        drawLegendSymbol: LegendSymbolMixin.drawRectangle,


        /**
         * Columns have no graph
         */
        drawGraph: noop,

        /**
         * Draw the columns. For bars, the series.group is rotated, so the same coordinates
         * apply for columns and bars. This method is inherited by scatter series.
         *
         */
        drawPoints: function () {
            var series = this,
                chart = this.chart,
                options = series.options,
                renderer = chart.renderer,
                animationLimit = options.animationLimit || 250,
                shapeArgs;

            // draw the columns
            each(series.points, function (point) {
                var plotY = point.plotY,
                    graphic = point.graphic;

                if (plotY !== UNDEFINED && !isNaN(plotY) && point.y !== null) {
                    shapeArgs = point.shapeArgs;

                    if (graphic) { // update
                        stop(graphic);
                        graphic[series.points.length < animationLimit ? 'animate' : 'attr'](merge(shapeArgs));

                    } else {
                        point.graphic = graphic = renderer[point.shapeType](shapeArgs)
                            .attr(point.pointAttr[point.selected ? SELECT_STATE : NORMAL_STATE])
                            .add(series.group)
                            .shadow(options.shadow, null, options.stacking && !options.borderRadius);
                    }

                } else if (graphic) {
                    point.graphic = graphic.destroy(); // #1269
                }
            });
        },

        /**
         * Animate the column heights one by one from zero
         * @param {Boolean} init Whether to initialize the animation or run it
         */
        animate: function (init) {
            var series = this,
                yAxis = this.yAxis,
                options = series.options,
                inverted = this.chart.inverted,
                attr = {},
                translatedThreshold;

            if (hasSVG) { // VML is too slow anyway
                if (init) {
                    attr.scaleY = 0.001;
                    translatedThreshold = mathMin(yAxis.pos + yAxis.len, mathMax(yAxis.pos, yAxis.toPixels(options.threshold)));
                    if (inverted) {
                        attr.translateX = translatedThreshold - yAxis.len;
                    } else {
                        attr.translateY = translatedThreshold;
                    }
                    series.group.attr(attr);

                } else { // run the animation

                    attr.scaleY = 1;
                    attr[inverted ? 'translateX' : 'translateY'] = yAxis.pos;
                    series.group.animate(attr, series.options.animation);

                    // delete this function to allow it only once
                    series.animate = null;
                }
            }
        },

        /**
         * Remove this series from the chart
         */
        remove: function () {
            var series = this,
                chart = series.chart;

            // column and bar series affects other series of the same type
            // as they are either stacked or grouped
            if (chart.hasRendered) {
                each(chart.series, function (otherSeries) {
                    if (otherSeries.type === series.type) {
                        otherSeries.isDirty = true;
                    }
                });
            }

            Series.prototype.remove.apply(series, arguments);
        }
    });
    seriesTypes.column = ColumnSeries;
    /**
     * Set the default options for bar
     */
    defaultPlotOptions.bar = merge(defaultPlotOptions.column);
    /**
     * The Bar series class
     */
    var BarSeries = extendClass(ColumnSeries, {
        type: 'bar',
        inverted: true
    });
    seriesTypes.bar = BarSeries;

    /**
     * Set the default options for scatter
     */
    defaultPlotOptions.scatter = merge(defaultSeriesOptions, {
        lineWidth: 0,
        tooltip: {
            headerFormat: '<span style="font-size: 10px; color:{series.color}">{series.name}</span><br/>',
            pointFormat: 'x: <b>{point.x}</b><br/>y: <b>{point.y}</b><br/>',
            followPointer: true
        },
        stickyTracking: false
    });

    /**
     * The scatter series class
     */
    var ScatterSeries = extendClass(Series, {
        type: 'scatter',
        sorted: false,
        requireSorting: false,
        noSharedTooltip: true,
        trackerGroups: ['markerGroup'],
        takeOrdinalPosition: false, // #2342
        singularTooltips: true,
        drawGraph: function () {
            if (this.options.lineWidth) {
                Series.prototype.drawGraph.call(this);
            }
        }
    });

    seriesTypes.scatter = ScatterSeries;

    /**
     * Set the default options for pie
     */
    defaultPlotOptions.pie = merge(defaultSeriesOptions, {
        borderColor: '#FFFFFF',
        borderWidth: 1,
        center: [null, null],
        clip: false,
        colorByPoint: true, // always true for pies
        dataLabels: {
            // align: null,
            // connectorWidth: 1,
            // connectorColor: point.color,
            // connectorPadding: 5,
            distance: 30,
            enabled: true,
            formatter: function () {
                return this.point.name;
            }
            // softConnector: true,
            //y: 0
        },
        ignoreHiddenPoint: true,
        //innerSize: 0,
        legendType: 'point',
        marker: null, // point options are specified in the base options
        size: null,
        showInLegend: false,
        slicedOffset: 10,
        states: {
            hover: {
                brightness: 0.1,
                shadow: false
            }
        },
        stickyTracking: false,
        tooltip: {
            followPointer: true
        }
    });

    /**
     * Extended point object for pies
     */
    var PiePoint = extendClass(Point, {
        /**
         * Initiate the pie slice
         */
        init: function () {

            Point.prototype.init.apply(this, arguments);

            var point = this,
                toggleSlice;

            // Disallow negative values (#1530)
            if (point.y < 0) {
                point.y = null;
            }

            //visible: options.visible !== false,
            extend(point, {
                visible: point.visible !== false,
                name: pick(point.name, 'Slice')
            });

            // add event listener for select
            toggleSlice = function (e) {
                point.slice(e.type === 'select');
            };
            addEvent(point, 'select', toggleSlice);
            addEvent(point, 'unselect', toggleSlice);

            return point;
        },

        /**
         * Toggle the visibility of the pie slice
         * @param {Boolean} vis Whether to show the slice or not. If undefined, the
         *    visibility is toggled
         */
        setVisible: function (vis) {
            var point = this,
                series = point.series,
                chart = series.chart;

            // if called without an argument, toggle visibility
            point.visible = point.options.visible = vis = vis === UNDEFINED ? !point.visible : vis;
            series.options.data[inArray(point, series.data)] = point.options; // update userOptions.data

            // Show and hide associated elements
            each(['graphic', 'dataLabel', 'connector', 'shadowGroup'], function (key) {
                if (point[key]) {
                    point[key][vis ? 'show' : 'hide'](true);
                }
            });

            if (point.legendItem) {
                chart.legend.colorizeItem(point, vis);
            }

            // Handle ignore hidden slices
            if (!series.isDirty && series.options.ignoreHiddenPoint) {
                series.isDirty = true;
                chart.redraw();
            }
        },

        /**
         * Set or toggle whether the slice is cut out from the pie
         * @param {Boolean} sliced When undefined, the slice state is toggled
         * @param {Boolean} redraw Whether to redraw the chart. True by default.
         */
        slice: function (sliced, redraw, animation) {
            var point = this,
                series = point.series,
                chart = series.chart,
                translation;

            setAnimation(animation, chart);

            // redraw is true by default
            redraw = pick(redraw, true);

            // if called without an argument, toggle
            point.sliced = point.options.sliced = sliced = defined(sliced) ? sliced : !point.sliced;
            series.options.data[inArray(point, series.data)] = point.options; // update userOptions.data

            translation = sliced ? point.slicedTranslation : {
                translateX: 0,
                translateY: 0
            };

            point.graphic.animate(translation);

            if (point.shadowGroup) {
                point.shadowGroup.animate(translation);
            }

        }
    });

    /**
     * The Pie series class
     */
    var PieSeries = {
        type: 'pie',
        isCartesian: false,
        pointClass: PiePoint,
        requireSorting: false,
        noSharedTooltip: true,
        trackerGroups: ['group', 'dataLabelsGroup'],
        axisTypes: [],
        pointAttrToOptions: { // mapping between SVG attributes and the corresponding options
            stroke: 'borderColor',
            'stroke-width': 'borderWidth',
            fill: 'color'
        },
        singularTooltips: true,

        /**
         * Pies have one color each point
         */
        getColor: noop,

        /**
         * Animate the pies in
         */
        animate: function (init) {
            var series = this,
                points = series.points,
                startAngleRad = series.startAngleRad;

            if (!init) {
                each(points, function (point) {
                    var graphic = point.graphic,
                        args = point.shapeArgs;

                    if (graphic) {
                        // start values
                        graphic.attr({
                            r: series.center[3] / 2, // animate from inner radius (#779)
                            start: startAngleRad,
                            end: startAngleRad
                        });

                        // animate
                        graphic.animate({
                            r: args.r,
                            start: args.start,
                            end: args.end
                        }, series.options.animation);
                    }
                });

                // delete this function to allow it only once
                series.animate = null;
            }
        },

        /**
         * Extend the basic setData method by running processData and generatePoints immediately,
         * in order to access the points from the legend.
         */
        setData: function (data, redraw, animation, updatePoints) {
            Series.prototype.setData.call(this, data, false, animation, updatePoints);
            this.processData();
            this.generatePoints();
            if (pick(redraw, true)) {
                this.chart.redraw(animation);
            }
        },

        /**
         * Extend the generatePoints method by adding total and percentage properties to each point
         */
        generatePoints: function () {
            var i,
                total = 0,
                points,
                len,
                point,
                ignoreHiddenPoint = this.options.ignoreHiddenPoint;

            Series.prototype.generatePoints.call(this);

            // Populate local vars
            points = this.points;
            len = points.length;

            // Get the total sum
            for (i = 0; i < len; i++) {
                point = points[i];
                total += (ignoreHiddenPoint && !point.visible) ? 0 : point.y;
            }
            this.total = total;

            // Set each point's properties
            for (i = 0; i < len; i++) {
                point = points[i];
                point.percentage = total > 0 ? (point.y / total) * 100 : 0;
                point.total = total;
            }

        },

        /**
         * Do translation for pie slices
         */
        translate: function (positions) {
            this.generatePoints();

            var series = this,
                cumulative = 0,
                precision = 1000, // issue #172
                options = series.options,
                slicedOffset = options.slicedOffset,
                connectorOffset = slicedOffset + options.borderWidth,
                start,
                end,
                angle,
                startAngle = options.startAngle || 0,
                startAngleRad = series.startAngleRad = mathPI / 180 * (startAngle - 90),
                endAngleRad = series.endAngleRad = mathPI / 180 * ((pick(options.endAngle, startAngle + 360)) - 90),
                circ = endAngleRad - startAngleRad, //2 * mathPI,
                points = series.points,
                radiusX, // the x component of the radius vector for a given point
                radiusY,
                labelDistance = options.dataLabels.distance,
                ignoreHiddenPoint = options.ignoreHiddenPoint,
                i,
                len = points.length,
                point;

            // Get positions - either an integer or a percentage string must be given.
            // If positions are passed as a parameter, we're in a recursive loop for adjusting
            // space for data labels.
            if (!positions) {
                series.center = positions = series.getCenter();
            }

            // utility for getting the x value from a given y, used for anticollision logic in data labels
            series.getX = function (y, left) {

                angle = math.asin(mathMin((y - positions[1]) / (positions[2] / 2 + labelDistance), 1));

                return positions[0] +
                    (left ? -1 : 1) *
                    (mathCos(angle) * (positions[2] / 2 + labelDistance));
            };

            // Calculate the geometry for each point
            for (i = 0; i < len; i++) {

                point = points[i];

                // set start and end angle
                start = startAngleRad + (cumulative * circ);
                if (!ignoreHiddenPoint || point.visible) {
                    cumulative += point.percentage / 100;
                }
                end = startAngleRad + (cumulative * circ);

                // set the shape
                point.shapeType = 'arc';
                point.shapeArgs = {
                    x: positions[0],
                    y: positions[1],
                    r: positions[2] / 2,
                    innerR: positions[3] / 2,
                    start: mathRound(start * precision) / precision,
                    end: mathRound(end * precision) / precision
                };

                // The angle must stay within -90 and 270 (#2645)
                angle = (end + start) / 2;
                if (angle > 1.5 * mathPI) {
                    angle -= 2 * mathPI;
                } else if (angle < -mathPI / 2) {
                    angle += 2 * mathPI;
                }

                // Center for the sliced out slice
                point.slicedTranslation = {
                    translateX: mathRound(mathCos(angle) * slicedOffset),
                    translateY: mathRound(mathSin(angle) * slicedOffset)
                };

                // set the anchor point for tooltips
                radiusX = mathCos(angle) * positions[2] / 2;
                radiusY = mathSin(angle) * positions[2] / 2;
                point.tooltipPos = [
                    positions[0] + radiusX * 0.7,
                    positions[1] + radiusY * 0.7
                ];

                point.half = angle < -mathPI / 2 || angle > mathPI / 2 ? 1 : 0;
                point.angle = angle;

                // set the anchor point for data labels
                connectorOffset = mathMin(connectorOffset, labelDistance / 2); // #1678
                point.labelPos = [
                    positions[0] + radiusX + mathCos(angle) * labelDistance, // first break of connector
                    positions[1] + radiusY + mathSin(angle) * labelDistance, // a/a
                    positions[0] + radiusX + mathCos(angle) * connectorOffset, // second break, right outside pie
                    positions[1] + radiusY + mathSin(angle) * connectorOffset, // a/a
                    positions[0] + radiusX, // landing point for connector
                    positions[1] + radiusY, // a/a
                    labelDistance < 0 ? // alignment
                        'center' :
                        point.half ? 'right' : 'left', // alignment
                    angle // center angle
                ];

            }
        },

        drawGraph: null,

        /**
         * Draw the data points
         */
        drawPoints: function () {
            var series = this,
                chart = series.chart,
                renderer = chart.renderer,
                groupTranslation,
                //center,
                graphic,
                //group,
                shadow = series.options.shadow,
                shadowGroup,
                shapeArgs;

            if (shadow && !series.shadowGroup) {
                series.shadowGroup = renderer.g('shadow')
                    .add(series.group);
            }

            // draw the slices
            each(series.points, function (point) {
                //LOGIFIX, if point has not setVisible then stop
                if (!point.setVisible) {
                    return;
                }
                graphic = point.graphic;
                shapeArgs = point.shapeArgs;
                shadowGroup = point.shadowGroup;

                // put the shadow behind all points
                if (shadow && !shadowGroup) {
                    shadowGroup = point.shadowGroup = renderer.g('shadow')
                        .add(series.shadowGroup);
                }

                // if the point is sliced, use special translation, else use plot area traslation
                groupTranslation = point.sliced ? point.slicedTranslation : {
                    translateX: 0,
                    translateY: 0
                };

                //group.translate(groupTranslation[0], groupTranslation[1]);
                if (shadowGroup) {
                    shadowGroup.attr(groupTranslation);
                }

                // draw the slice
                if (graphic) {
                    graphic.animate(extend(shapeArgs, groupTranslation));
                } else {
                    point.graphic = graphic = renderer[point.shapeType](shapeArgs)
                        .setRadialReference(series.center)
                        .attr(
                            point.pointAttr[point.selected ? SELECT_STATE : NORMAL_STATE]
                        )
                        .attr({
                            'stroke-linejoin': 'round'
                            //zIndex: 1 // #2722 (reversed)
                        })
                        .attr(groupTranslation)
                        .add(series.group)
                        .shadow(shadow, shadowGroup);
                }

                // detect point specific visibility (#2430)
                if (point.visible !== undefined) {
                    point.setVisible(point.visible);
                }

            });

        },

        /**
         * Utility for sorting data labels
         */
        sortByAngle: function (points, sign) {
            points.sort(function (a, b) {
                return a.angle !== undefined && (b.angle - a.angle) * sign;
            });
        },

        /**
         * Use a simple symbol from LegendSymbolMixin
         */
        drawLegendSymbol: LegendSymbolMixin.drawRectangle,

        /**
         * Use the getCenter method from drawLegendSymbol
         */
        getCenter: CenteredSeriesMixin.getCenter,

        /**
         * Pies don't have point marker symbols
         */
        getSymbol: noop,
        // LOGIFIX
        //21378 Implemented a solution to set max label length for line / pie series.
        trimDataLabels: function (str) {
            var series = this,
                labels = series.options.dataLabels;
            return labels && labels.maxLabelLength ?
                trimLabelToLength(str, labels.maxLabelLength) :
                str;
        }

    };
    PieSeries = extendClass(Series, PieSeries);
    seriesTypes.pie = PieSeries;

    Series.prototype.trimDataLabels = function (str) {
        var series = this;
        return str;
    };

    /**
     * Draw the data labels
     */
    Series.prototype.drawDataLabels = function () {

        var series = this,
            seriesOptions = series.options,
            cursor = seriesOptions.cursor,
            options = seriesOptions.dataLabels,
            points = series.points,
            pointOptions,
            generalOptions,
            str,
            dataLabelsGroup;

        if (options.enabled || series._hasPointLabels) {

            // Process default alignment of data labels for columns
            if (series.dlProcessOptions) {
                series.dlProcessOptions(options);
            }

            // Create a separate group for the data labels to avoid rotation
            dataLabelsGroup = series.plotGroup(
                'dataLabelsGroup',
                'data-labels',
                series.visible ? VISIBLE : HIDDEN,
                options.zIndex || 6
            );

            // Make the labels for each point
            generalOptions = options;
            each(points, function (point) {

                var enabled,
                    dataLabel = point.dataLabel,
                    labelConfig,
                    attr,
                    name,
                    rotation,
                    connector = point.connector,
                    isNew = true;

                // Determine if each data label is enabled
                pointOptions = point.options && point.options.dataLabels;
                enabled = pick(pointOptions && pointOptions.enabled, generalOptions.enabled); // #2282

                // If the point is outside the plot area, destroy it. #678, #820
                if (dataLabel && !enabled) {
                    point.dataLabel = dataLabel.destroy();

                    // Individual labels are disabled if the are explicitly disabled
                    // in the point options, or if they fall outside the plot area.
                } else if (enabled) {

                    // Create individual options structure that can be extended without
                    // affecting others
                    options = merge(generalOptions, pointOptions);

                    rotation = options.rotation;

                    //LOGIFIX
                    //21858: Mobile ChartCanvas: causing JS error if you rotate the view
                    if (!point.getLabelConfig) {
                        return;
                    }
                    // Get the string
                    labelConfig = point.getLabelConfig();
                    str = options.format ?
                        format(options.format, labelConfig) :
                        options.formatter.call(labelConfig, options);

                    str = series.trimDataLabels(str);
                    // Determine the color
                    options.style.color = pick(options.color, options.style.color, series.color, 'black');


                    // update existing label
                    if (dataLabel) {

                        if (defined(str)) {
                            dataLabel
                                .attr({
                                    text: str
                                });
                            isNew = false;

                        } else { // #1437 - the label is shown conditionally
                            point.dataLabel = dataLabel = dataLabel.destroy();
                            if (connector) {
                                point.connector = connector.destroy();
                            }
                        }

                        // create new label
                    } else if (defined(str)) {
                        attr = {
                            //align: align,
                            fill: options.backgroundColor,
                            stroke: options.borderColor,
                            'stroke-width': options.borderWidth,
                            r: options.borderRadius || 0,
                            rotation: rotation,
                            padding: options.padding,
                            zIndex: 1
                        };
                        // Remove unused attributes (#947)
                        for (name in attr) {
                            if (attr[name] === UNDEFINED) {
                                delete attr[name];
                            }
                        }

                        dataLabel = point.dataLabel = series.chart.renderer[rotation ? 'text' : 'label']( // labels don't support rotation
                            str,
                            0,
                            -999,
                            null,
                            null,
                            null,
                            options.useHTML
                        )
                        .attr(attr)
                        .css(extend(options.style, cursor && { cursor: cursor }))
                        .add(dataLabelsGroup)
                        .shadow(options.shadow);

                    }

                    if (dataLabel) {
                        // Now the data label is created and placed at 0,0, so we need to align it
                        series.alignDataLabel(point, dataLabel, options, null, isNew);
                    }
                }
            });
        }
    };

    /**
     * Align each individual data label
     */
    Series.prototype.alignDataLabel = function (point, dataLabel, options, alignTo, isNew) {
        var chart = this.chart,
            inverted = chart.inverted,
            plotX = pick(point.plotX, -999),
            plotY = pick(point.plotY, -999),
            bBox = dataLabel.getBBox(),
            // Math.round for rounding errors (#2683), alignTo to allow column labels (#2700)
            visible = this.visible && (point.series.forceDL || chart.isInsidePlot(plotX, mathRound(plotY), inverted) ||
                (alignTo && chart.isInsidePlot(plotX, inverted ? alignTo.x + 1 : alignTo.y + alignTo.height - 1, inverted))),
            alignAttr; // the final position;

        if (visible) {

            // The alignment box is a singular point
            alignTo = extend({
                x: inverted ? chart.plotWidth - plotY : plotX,
                y: mathRound(inverted ? chart.plotHeight - plotX : plotY),
                width: 0,
                height: 0
            }, alignTo);

            // Add the text size for alignment calculation
            extend(options, {
                width: bBox.width,
                height: bBox.height
            });

            // Allow a hook for changing alignment in the last moment, then do the alignment
            if (options.rotation) { // Fancy box alignment isn't supported for rotated text
                alignAttr = {
                    align: options.align,
                    x: alignTo.x + options.x + alignTo.width / 2,
                    y: alignTo.y + options.y + alignTo.height / 2
                };
                dataLabel[isNew ? 'attr' : 'animate'](alignAttr);
            } else {
                dataLabel.align(options, null, alignTo);
                alignAttr = dataLabel.alignAttr;

                // Handle justify or crop
                if (pick(options.overflow, 'justify') === 'justify') {
                    this.justifyDataLabel(dataLabel, options, alignAttr, bBox, alignTo, isNew);

                } else if (pick(options.crop, true)) {
                    // Now check that the data label is within the plot area
                    visible = chart.isInsidePlot(alignAttr.x, alignAttr.y) && chart.isInsidePlot(alignAttr.x + bBox.width, alignAttr.y + bBox.height);

                }
            }
        }

        // Show or hide based on the final aligned position
        if (!visible) {
            dataLabel.attr({ y: -999 });
            dataLabel.placed = false; // don't animate back in
        }

    };

    /**
     * If data labels fall partly outside the plot area, align them back in, in a way that
     * doesn't hide the point.
     */
    Series.prototype.justifyDataLabel = function (dataLabel, options, alignAttr, bBox, alignTo, isNew) {
        var chart = this.chart,
            align = options.align,
            verticalAlign = options.verticalAlign,
            off,
            justified;

        // Off left
        off = alignAttr.x;
        if (off < 0) {
            if (align === 'right') {
                options.align = 'left';
            } else {
                options.x = -off;
            }
            justified = true;
        }

        // Off right
        off = alignAttr.x + bBox.width;
        if (off > chart.plotWidth) {
            if (align === 'left') {
                options.align = 'right';
            } else {
                options.x = chart.plotWidth - off;
            }
            justified = true;
        }

        // Off top
        off = alignAttr.y;
        if (off < 0) {
            if (verticalAlign === 'bottom') {
                options.verticalAlign = 'top';
            } else {
                options.y = -off;
            }
            justified = true;
        }

        // Off bottom
        off = alignAttr.y + bBox.height;
        if (off > chart.plotHeight) {
            if (verticalAlign === 'top') {
                options.verticalAlign = 'bottom';
            } else {
                options.y = chart.plotHeight - off;
            }
            justified = true;
        }

        if (justified) {
            dataLabel.placed = !isNew;
            dataLabel.align(options, null, alignTo);
        }
    };

    /**
     * Override the base drawDataLabels method by pie specific functionality
     */
    if (seriesTypes.pie) {
        seriesTypes.pie.prototype.drawDataLabels = function () {
            var series = this,
                data = series.data,
                point,
                chart = series.chart,
                options = series.options.dataLabels,
                connectorPadding = pick(options.connectorPadding, 10),
                connectorWidth = pick(options.connectorWidth, 1),
                plotWidth = chart.plotWidth,
                plotHeight = chart.plotHeight,
                connector,
                connectorPath,
                softConnector = pick(options.softConnector, true),
                distanceOption = options.distance,
                seriesCenter = series.center,
                radius = seriesCenter[2] / 2,
                centerY = seriesCenter[1],
                outside = distanceOption > 0,
                dataLabel,
                dataLabelWidth,
                labelPos,
                labelHeight,
                halves = [// divide the points into right and left halves for anti collision
                    [], // right
                    []  // left
                ],
                x,
                y,
                visibility,
                rankArr,
                i,
                j,
                overflow = [0, 0, 0, 0], // top, right, bottom, left
                sort = function (a, b) {
                    return b.y - a.y;
                };

            // get out if not enabled
            if (!series.visible || (!options.enabled && !series._hasPointLabels)) {
                return;
            }

            // run parent method
            Series.prototype.drawDataLabels.apply(series);

            // arrange points for detection collision
            each(data, function (point) {
                if (point.dataLabel && point.visible) { // #407, #2510
                    halves[point.half].push(point);
                }
            });

            // assume equal label heights
            i = 0;
            while (!labelHeight && data[i]) { // #1569
                labelHeight = data[i] && data[i].dataLabel && (data[i].dataLabel.getBBox().height || 21); // 21 is for #968
                i++;
            }

            //LOGIFIX -> all data labels are empty, nothing to calculate
            if (!labelHeight) {
                return;
            }

            /* Loop over the points in each half, starting from the top and bottom
             * of the pie to detect overlapping labels.
             */
            i = 2;
            while (i--) {

                var slots = [],
                    slotsLength,
                    usedSlots = [],
                    points = halves[i],
                    pos,
                    length = points.length,
                    slotIndex;

                // Sort by angle
                series.sortByAngle(points, i - 0.5);

                // Only do anti-collision when we are outside the pie and have connectors (#856)
                if (distanceOption > 0) {

                    // build the slots
                    for (pos = centerY - radius - distanceOption; pos <= centerY + radius + distanceOption; pos += labelHeight) {
                        slots.push(pos);

                        // visualize the slot
                        /*
                        var slotX = series.getX(pos, i) + chart.plotLeft - (i ? 100 : 0),
                            slotY = pos + chart.plotTop;
                        if (!isNaN(slotX)) {
                            chart.renderer.rect(slotX, slotY - 7, 100, labelHeight, 1)
                                .attr({
                                    'stroke-width': 1,
                                    stroke: 'silver'
                                })
                                .add();
                            chart.renderer.text('Slot '+ (slots.length - 1), slotX, slotY + 4)
                                .attr({
                                    fill: 'silver'
                                }).add();
                        }
                        */
                    }
                    slotsLength = slots.length;

                    // if there are more values than available slots, remove lowest values
                    if (length > slotsLength) {
                        // create an array for sorting and ranking the points within each quarter
                        rankArr = [].concat(points);
                        rankArr.sort(sort);
                        j = length;
                        while (j--) {
                            rankArr[j].rank = j;
                        }
                        j = length;
                        while (j--) {
                            if (points[j].rank >= slotsLength) {
                                points.splice(j, 1);
                            }
                        }
                        length = points.length;
                    }

                    // The label goes to the nearest open slot, but not closer to the edge than
                    // the label's index.
                    for (j = 0; j < length; j++) {

                        point = points[j];
                        labelPos = point.labelPos;

                        var closest = 9999,
                            distance,
                            slotI;

                        // find the closest slot index
                        for (slotI = 0; slotI < slotsLength; slotI++) {
                            distance = mathAbs(slots[slotI] - labelPos[1]);
                            if (distance < closest) {
                                closest = distance;
                                slotIndex = slotI;
                            }
                        }

                        // if that slot index is closer to the edges of the slots, move it
                        // to the closest appropriate slot
                        if (slotIndex < j && slots[j] !== null) { // cluster at the top
                            slotIndex = j;
                        } else if (slotsLength < length - j + slotIndex && slots[j] !== null) { // cluster at the bottom
                            slotIndex = slotsLength - length + j;
                            while (slots[slotIndex] === null) { // make sure it is not taken
                                slotIndex++;
                            }
                        } else {
                            // Slot is taken, find next free slot below. In the next run, the next slice will find the
                            // slot above these, because it is the closest one
                            while (slots[slotIndex] === null) { // make sure it is not taken
                                slotIndex++;
                            }
                        }

                        usedSlots.push({ i: slotIndex, y: slots[slotIndex] });
                        slots[slotIndex] = null; // mark as taken
                    }
                    // sort them in order to fill in from the top
                    usedSlots.sort(sort);
                }

                // now the used slots are sorted, fill them up sequentially
                for (j = 0; j < length; j++) {

                    var slot, naturalY;

                    point = points[j];
                    labelPos = point.labelPos;
                    dataLabel = point.dataLabel;
                    visibility = point.visible === false ? HIDDEN : VISIBLE;
                    naturalY = labelPos[1];

                    if (distanceOption > 0) {
                        slot = usedSlots.pop();
                        slotIndex = slot.i;

                        // if the slot next to currrent slot is free, the y value is allowed
                        // to fall back to the natural position
                        y = slot.y;
                        if ((naturalY > y && slots[slotIndex + 1] !== null) ||
                                (naturalY < y && slots[slotIndex - 1] !== null)) {
                            y = naturalY;
                        }

                    } else {
                        y = naturalY;
                    }

                    // get the x - use the natural x position for first and last slot, to prevent the top
                    // and botton slice connectors from touching each other on either side
                    x = options.justify ?
                        seriesCenter[0] + (i ? -1 : 1) * (radius + distanceOption) :
                        series.getX(slotIndex === 0 || slotIndex === slots.length - 1 ? naturalY : y, i);


                    // Record the placement and visibility
                    dataLabel._attr = {
                        visibility: visibility,
                        align: labelPos[6]
                    };
                    dataLabel._pos = {
                        x: x + options.x +
                            ({ left: connectorPadding, right: -connectorPadding }[labelPos[6]] || 0),
                        y: y + options.y - 10 // 10 is for the baseline (label vs text)
                    };
                    dataLabel.connX = x;
                    dataLabel.connY = y;


                    // Detect overflowing data labels
                    if (this.options.size === null) {
                        dataLabelWidth = dataLabel.width;
                        // Overflow left
                        if (x - dataLabelWidth < connectorPadding) {
                            overflow[3] = mathMax(mathRound(dataLabelWidth - x + connectorPadding), overflow[3]);

                            // Overflow right
                        } else if (x + dataLabelWidth > plotWidth - connectorPadding) {
                            overflow[1] = mathMax(mathRound(x + dataLabelWidth - plotWidth + connectorPadding), overflow[1]);
                        }

                        // Overflow top
                        if (y - labelHeight / 2 < 0) {
                            overflow[0] = mathMax(mathRound(-y + labelHeight / 2), overflow[0]);

                            // Overflow left
                        } else if (y + labelHeight / 2 > plotHeight) {
                            overflow[2] = mathMax(mathRound(y + labelHeight / 2 - plotHeight), overflow[2]);
                        }
                    }
                } // for each point
            } // for each half

            // Do not apply the final placement and draw the connectors until we have verified
            // that labels are not spilling over.
            if (arrayMax(overflow) === 0 || this.verifyDataLabelOverflow(overflow)) {

                // Place the labels in the final position
                this.placeDataLabels();

                // Draw the connectors
                if (outside && connectorWidth) {
                    each(this.points, function (point) {
                        connector = point.connector;
                        labelPos = point.labelPos;
                        dataLabel = point.dataLabel;

                        if (dataLabel && dataLabel._pos) {
                            visibility = dataLabel._attr.visibility;
                            x = dataLabel.connX;
                            y = dataLabel.connY;
                            connectorPath = softConnector ? [
                                M,
                                x + (labelPos[6] === 'left' ? 5 : -5), y, // end of the string at the label
                                'C',
                                x, y, // first break, next to the label
                                2 * labelPos[2] - labelPos[4], 2 * labelPos[3] - labelPos[5],
                                labelPos[2], labelPos[3], // second break
                                L,
                                labelPos[4], labelPos[5] // base
                            ] : [
                                M,
                                x + (labelPos[6] === 'left' ? 5 : -5), y, // end of the string at the label
                                L,
                                labelPos[2], labelPos[3], // second break
                                L,
                                labelPos[4], labelPos[5] // base
                            ];

                            if (connector) {
                                connector.animate({ d: connectorPath });
                                connector.attr('visibility', visibility);

                            } else {
                                point.connector = connector = series.chart.renderer.path(connectorPath).attr({
                                    'stroke-width': connectorWidth,
                                    stroke: options.connectorColor || point.color || '#606060',
                                    visibility: visibility
                                    //zIndex: 0 // #2722 (reversed)
                                })
                                .add(series.group);
                            }
                        } else if (connector) {
                            point.connector = connector.destroy();
                        }
                    });
                }
            }
        };
        /**
         * Perform the final placement of the data labels after we have verified that they
         * fall within the plot area.
         */
        seriesTypes.pie.prototype.placeDataLabels = function () {
            each(this.points, function (point) {
                var dataLabel = point.dataLabel,
                    _pos;

                if (dataLabel) {
                    _pos = dataLabel._pos;
                    if (_pos) {
                        dataLabel.attr(dataLabel._attr);
                        dataLabel[dataLabel.moved ? 'animate' : 'attr'](_pos);
                        dataLabel.moved = true;
                    } else if (dataLabel) {
                        dataLabel.attr({ y: -999 });
                    }
                }
            });
        };

        seriesTypes.pie.prototype.alignDataLabel = noop;

        /**
         * Verify whether the data labels are allowed to draw, or we should run more translation and data
         * label positioning to keep them inside the plot area. Returns true when data labels are ready
         * to draw.
         */
        seriesTypes.pie.prototype.verifyDataLabelOverflow = function (overflow) {

            var center = this.center,
                options = this.options,
                centerOption = options.center,
                minSize = options.minSize || 80,
                newSize = minSize,
                ret;

            // Handle horizontal size and center
            if (centerOption[0] !== null) { // Fixed center
                newSize = mathMax(center[2] - mathMax(overflow[1], overflow[3]), minSize);

            } else { // Auto center
                newSize = mathMax(
                    center[2] - overflow[1] - overflow[3], // horizontal overflow
                    minSize
                );
                center[0] += (overflow[3] - overflow[1]) / 2; // horizontal center
            }

            // Handle vertical size and center
            if (centerOption[1] !== null) { // Fixed center
                newSize = mathMax(mathMin(newSize, center[2] - mathMax(overflow[0], overflow[2])), minSize);

            } else { // Auto center
                newSize = mathMax(
                    mathMin(
                        newSize,
                        center[2] - overflow[0] - overflow[2] // vertical overflow
                    ),
                    minSize
                );
                center[1] += (overflow[0] - overflow[2]) / 2; // vertical center
            }

            // If the size must be decreased, we need to run translate and drawDataLabels again
            if (newSize < center[2]) {
                center[2] = newSize;
                this.translate(center);
                each(this.points, function (point) {
                    if (point.dataLabel) {
                        point.dataLabel._pos = null; // reset
                    }
                });

                if (this.drawDataLabels) {
                    this.drawDataLabels();
                }
                // Else, return true to indicate that the pie and its labels is within the plot area
            } else {
                ret = true;
            }
            return ret;
        };
    }

    if (seriesTypes.column) {

        /**
         * Override the basic data label alignment by adjusting for the position of the column
         */
        seriesTypes.column.prototype.alignDataLabel = function (point, dataLabel, options, alignTo, isNew) {
            var chart = this.chart,
                inverted = chart.inverted,
                dlBox = point.dlBox || point.shapeArgs, // data label box for alignment
                below = point.below || (point.plotY > pick(this.translatedThreshold, chart.plotSizeY)),
                inside = pick(options.inside, !!this.options.stacking); // draw it inside the box?

            // Align to the column itself, or the top of it
            if (dlBox) { // Area range uses this method but not alignTo
                alignTo = merge(dlBox);

                if (inverted) {
                    alignTo = {
                        x: chart.plotWidth - alignTo.y - alignTo.height,
                        y: chart.plotHeight - alignTo.x - alignTo.width,
                        width: alignTo.height,
                        height: alignTo.width
                    };
                }

                // Compute the alignment box
                if (!inside) {
                    if (inverted) {
                        alignTo.x += below ? 0 : alignTo.width;
                        alignTo.width = 0;
                    } else {
                        alignTo.y += below ? alignTo.height : 0;
                        alignTo.height = 0;
                    }
                }
            }


            // When alignment is undefined (typically columns and bars), display the individual
            // point below or above the point depending on the threshold
            options.align = pick(
                options.align,
                !inverted || inside ? 'center' : below ? 'right' : 'left'
            );
            options.verticalAlign = pick(
                options.verticalAlign,
                inverted || inside ? 'middle' : below ? 'top' : 'bottom'
            );

            // Call the parent method
            Series.prototype.alignDataLabel.call(this, point, dataLabel, options, alignTo, isNew);
        };
    }



    /**
     * TrackerMixin for points and graphs
     */

    var TrackerMixin = Highcharts.TrackerMixin = {

        drawTrackerPoint: function () {
            var series = this,
                chart = series.chart,
                pointer = chart.pointer,
                cursor = series.options.cursor,
                css = cursor && { cursor: cursor },
                onMouseOver = function (e) {
                    var target = e.target,
                    point;

                    if (chart.hoverSeries !== series) {
                        series.onMouseOver();
                    }

                    while (target && !point) {
                        point = target.point;
                        target = target.parentNode;
                    }

                    if (point !== UNDEFINED && point !== chart.hoverPoint) { // undefined on graph in scatterchart
                        point.onMouseOver(e);
                    }
                };

            // Add reference to the point
            each(series.points, function (point) {
                if (point.graphic) {
                    point.graphic.element.point = point;
                }
                if (point.dataLabel) {
                    point.dataLabel.element.point = point;
                }
            });

            // Add the event listeners, we need to do this only once
            if (!series._hasTracking) {
                each(series.trackerGroups, function (key) {
                    if (series[key]) { // we don't always have dataLabelsGroup
                        series[key]
                        .addClass(PREFIX + 'tracker')
                        .on('mouseover', onMouseOver)
                        .on('mouseout', function (e) { pointer.onTrackerMouseOut(e); })
                        .css(css);
                        if (hasTouch) {
                            series[key].on('touchstart', onMouseOver);
                        }
                    }
                });
                series._hasTracking = true;
            }
        },

        /**
         * Draw the tracker object that sits above all data labels and markers to
         * track mouse events on the graph or points. For the line type charts
         * the tracker uses the same graphPath, but with a greater stroke width
         * for better control.
         */
        drawTrackerGraph: function () {
            var series = this,
                options = series.options,
                trackByArea = options.trackByArea,
                trackerPath = [].concat(trackByArea ? series.areaPath : series.graphPath),
                trackerPathLength = trackerPath.length,
                chart = series.chart,
                pointer = chart.pointer,
                renderer = chart.renderer,
                snap = chart.options.tooltip.snap,
                tracker = series.tracker,
                cursor = options.cursor,
                css = cursor && { cursor: cursor },
                singlePoints = series.singlePoints,
                singlePoint,
                i,
                onMouseOver = function () {
                    if (chart.hoverSeries !== series) {
                        series.onMouseOver();
                    }
                },
                /*
                 * Empirical lowest possible opacities for TRACKER_FILL for an element to stay invisible but clickable
                 * IE6: 0.002
                 * IE7: 0.002
                 * IE8: 0.002
                 * IE9: 0.00000000001 (unlimited)
                 * IE10: 0.0001 (exporting only)
                 * FF: 0.00000000001 (unlimited)
                 * Chrome: 0.000001
                 * Safari: 0.000001
                 * Opera: 0.00000000001 (unlimited)
                 */
                TRACKER_FILL = 'rgba(192,192,192,' + (hasSVG ? 0.0001 : 0.002) + ')';

            // Extend end points. A better way would be to use round linecaps,
            // but those are not clickable in VML.
            if (trackerPathLength && !trackByArea) {
                i = trackerPathLength + 1;
                while (i--) {
                    if (trackerPath[i] === M) { // extend left side
                        trackerPath.splice(i + 1, 0, trackerPath[i + 1] - snap, trackerPath[i + 2], L);
                    }
                    if ((i && trackerPath[i] === M) || i === trackerPathLength) { // extend right side
                        trackerPath.splice(i, 0, L, trackerPath[i - 2] + snap, trackerPath[i - 1]);
                    }
                }
            }

            // handle single points
            for (i = 0; i < singlePoints.length; i++) {
                singlePoint = singlePoints[i];
                trackerPath.push(M, singlePoint.plotX - snap, singlePoint.plotY,
                L, singlePoint.plotX + snap, singlePoint.plotY);
            }

            // draw the tracker
            if (tracker) {
                tracker.attr({ d: trackerPath });
            } else { // create

                series.tracker = renderer.path(trackerPath)
                .attr({
                    'stroke-linejoin': 'round', // #1225
                    visibility: series.visible ? VISIBLE : HIDDEN,
                    stroke: TRACKER_FILL,
                    fill: trackByArea ? TRACKER_FILL : NONE,
                    'stroke-width': options.lineWidth + (trackByArea ? 0 : 2 * snap),
                    zIndex: 2
                })
                .add(series.group);

                // The tracker is added to the series group, which is clipped, but is covered
                // by the marker group. So the marker group also needs to capture events.
                each([series.tracker, series.markerGroup], function (tracker) {
                    tracker.addClass(PREFIX + 'tracker')
                        .on('mouseover', onMouseOver)
                        .on('mouseout', function (e) { pointer.onTrackerMouseOut(e); })
                        .css(css);

                    if (hasTouch) {
                        tracker.on('touchstart', onMouseOver);
                    }
                });
            }
        }
    };
    /* End TrackerMixin */


    /**
     * Add tracking event listener to the series group, so the point graphics
     * themselves act as trackers
     */

    if (seriesTypes.column) {
        ColumnSeries.prototype.drawTracker = TrackerMixin.drawTrackerPoint;
    }

    if (seriesTypes.pie) {
        seriesTypes.pie.prototype.drawTracker = TrackerMixin.drawTrackerPoint;
    }

    if (seriesTypes.scatter) {
        ScatterSeries.prototype.drawTracker = TrackerMixin.drawTrackerPoint;
    }

    /* 
     * Extend Legend for item events 
     */
    extend(Legend.prototype, {

        setItemEvents: function (item, legendItem, useHTML, itemStyle, itemHiddenStyle) {
            var legend = this;
            var weight = itemStyle["fontWeight"] || "normal";
            // Set the events on the item group, or in case of useHTML, the item itself (#1249)
            (useHTML ? legendItem : item.legendGroup).on('mouseover', function () {
                //LOGIFIX
                // 21195 legend remains bold after mouse hover
                itemStyle["fontWeight"] = weight;
                if (item.visible) {
                    item.setState(HOVER_STATE);//removed second parametr because of issue 21879
                    legendItem.css(legend.options.itemHoverStyle);
                }
            })
                .on('mouseout', function () {
                    legendItem.css(item.visible ? itemStyle : itemHiddenStyle);
                    //LOGIFIX
                    itemStyle["fontWeight"] = weight;
                    item.setState(NORMAL_STATE, true);
                })
                .on('click', function (event) {
                    var strLegendItemClick = 'legendItemClick',
                        fnLegendItemClick = function () {
                            item.setVisible();
                        };

                    // Pass over the click/touch event. #4.
                    event = {
                        browserEvent: event
                    };

                    // click the name or symbol
                    if (item.firePointEvent) { // point
                        item.firePointEvent(strLegendItemClick, event, fnLegendItemClick);
                    } else {
                        fireEvent(item, strLegendItemClick, event, fnLegendItemClick);
                    }
                });
        },

        createCheckboxForItem: function (item) {
            var legend = this;

            item.checkbox = createElement('input', {
                type: 'checkbox',
                checked: item.selected,
                defaultChecked: item.selected // required by IE7
            }, legend.options.itemCheckboxStyle, legend.chart.container);

            addEvent(item.checkbox, 'click', function (event) {
                var target = event.target;
                fireEvent(item, 'checkboxClick', {
                    checked: target.checked
                },
                    function () {
                        item.select();
                    }
                );
            });
        }
    });

    /* 
     * Add pointer cursor to legend itemstyle in defaultOptions
     */
    defaultOptions.legend.itemStyle.cursor = 'pointer';


    /* 
     * Extend the Chart object with interaction
     */

    extend(Chart.prototype, {
        /**
         * Display the zoom button
         */
        showResetZoom: function () {
            var chart = this,
                lang = defaultOptions.lang,
                btnOptions = chart.options.chart.resetZoomButton,
                theme = btnOptions.theme,
                states = theme.states,
                alignTo = btnOptions.relativeTo === 'chart' ? null : 'plotBox';
            // LOGIFIX
            // 21379 Zoom Chart localization
            var caption = btnOptions.resetZoom || lang.resetZoom;
            var title = btnOptions.resetZoomTitle || lang.resetZoomTitle;
            if (btnOptions.strokeWidth) {
                theme["stroke-width"] = btnOptions.strokeWidth;
            }
            if (btnOptions.theme &&
                btnOptions.theme &&
                btnOptions.theme.states.hover &&
                btnOptions.theme.states.hover.strokeWidth) {
                theme.states.hover["stroke-width"] = btnOptions.theme.states.hover.strokeWidth;
            }

            btnOptions.position.originalY = btnOptions.position.originalY || btnOptions.position.y;

            switch (btnOptions.position.verticalAlign) {
                case "bottom":
                    btnOptions.position.y = -LogiXML.layout.getTextDimensions(caption, theme.style).height + btnOptions.position.originalY;
                    break;
                case "middle":
                    btnOptions.position.y = -LogiXML.layout.getTextDimensions(caption, theme.style).height / 2 + btnOptions.position.originalY;
                    break;
            }

            this.resetZoomButton = chart.renderer.button(caption, null, null, function () { chart.zoomOut(); }, theme, states && states.hover)
                .attr({
                    align: btnOptions.position.align,
                    title: title
                })
                .add()
                .align(btnOptions.position, false, alignTo);

        },

        /**
         * Zoom out to 1:1
         */
        zoomOut: function () {
            var chart = this;
            fireEvent(chart, 'selection', { resetSelection: true }, function () {
                chart.zoom();
            });
        },

        /**
         * Zoom into a given portion of the chart given by axis coordinates
         * @param {Object} event
         */
        zoom: function (event) {
            var chart = this,
                hasZoomed,
                pointer = chart.pointer,
                displayButton = false,
                resetZoomButton;

            // If zoom is called with no arguments, reset the axes
            if (!event || event.resetSelection) {
                each(chart.axes, function (axis) {
                    hasZoomed = axis.zoom();
                });
            } else { // else, zoom in on all axes
                each(event.xAxis.concat(event.yAxis), function (axisData) {
                    var axis = axisData.axis,
                        isXAxis = axis.isXAxis;

                    // don't zoom more than minRange
                    if (pointer[isXAxis ? 'zoomX' : 'zoomY'] || pointer[isXAxis ? 'pinchX' : 'pinchY']) {
                        hasZoomed = axis.zoom(axisData.min, axisData.max);
                        if (axis.displayBtn) {
                            displayButton = true;
                        }
                    }
                });
            }

            // Show or hide the Reset zoom button
            resetZoomButton = chart.resetZoomButton;
            if (displayButton && !resetZoomButton) {
                chart.showResetZoom();
            } else if (!displayButton && isObject(resetZoomButton)) {
                chart.resetZoomButton = resetZoomButton.destroy();
            }


            // Redraw
            if (hasZoomed) {
                chart.redraw(
                    pick(chart.options.chart.animation, event && event.animation, chart.pointCount < 100) // animation
                );
            }
        },

        /**
         * Pan the chart by dragging the mouse across the pane. This function is called
         * on mouse move, and the distance to pan is computed from chartX compared to
         * the first chartX position in the dragging operation.
         */
        pan: function (e, panning) {

            var chart = this,
                hoverPoints = chart.hoverPoints,
                doRedraw;

            // remove active points for shared tooltip
            if (hoverPoints) {
                each(hoverPoints, function (point) {
                    point.setState();
                });
            }

            each(panning === 'xy' ? [1, 0] : [1], function (isX) { // xy is used in maps
                var mousePos = e[isX ? 'chartX' : 'chartY'],
                    axis = chart[isX ? 'xAxis' : 'yAxis'][0],
                    startPos = chart[isX ? 'mouseDownX' : 'mouseDownY'],
                    halfPointRange = (axis.pointRange || 0) / 2,
                    extremes = axis.getExtremes(),
                    newMin = axis.toValue(startPos - mousePos, true) + halfPointRange,
                    newMax = axis.toValue(startPos + chart[isX ? 'plotWidth' : 'plotHeight'] - mousePos, true) - halfPointRange;

                if (axis.series.length && newMin > mathMin(extremes.dataMin, extremes.min) && newMax < mathMax(extremes.dataMax, extremes.max)) {
                    axis.setExtremes(newMin, newMax, false, false, { trigger: 'pan' });
                    doRedraw = true;
                }

                chart[isX ? 'mouseDownX' : 'mouseDownY'] = mousePos; // set new reference for next run
            });

            if (doRedraw) {
                chart.redraw(false);
            }
            css(chart.container, { cursor: 'move' });
        }
    });

    /*
     * Extend the Point object with interaction
     */
    extend(Point.prototype, {
        /**
         * Toggle the selection status of a point
         * @param {Boolean} selected Whether to select or unselect the point.
         * @param {Boolean} accumulate Whether to add to the previous selection. By default,
         *		 this happens if the control key (Cmd on Mac) was pressed during clicking.
         */
        select: function (selected, accumulate) {
            var point = this,
                series = point.series,
                chart = series.chart;

            selected = pick(selected, !point.selected);

            // fire the event with the defalut handler
            point.firePointEvent(selected ? 'select' : 'unselect', { accumulate: accumulate }, function () {
                point.selected = point.options.selected = selected;
                series.options.data[inArray(point, series.data)] = point.options;

                point.setState(selected && SELECT_STATE);


                //LOGIFIX we don't need this
                // mask selection
                // unselect all other points unless Ctrl or Cmd + click
                //if (!accumulate) {
                //	each(chart.getSelectedPoints(), function (loopPoint) {
                //		if (loopPoint.selected && loopPoint !== point) {
                //			loopPoint.selected = loopPoint.options.selected = false;
                //			series.options.data[inArray(loopPoint, series.data)] = loopPoint.options;
                //			loopPoint.setState(NORMAL_STATE);
                //			loopPoint.firePointEvent('unselect');
                //		}
                //	});
                //}

                //LOGIFIX
                // mask selection
                if (!series.options.accumulate) {
                    each(chart.getSelectedPoints(), function (loopPoint) {
                        if (loopPoint.selected && loopPoint !== point) {
                            loopPoint.selected = loopPoint.options.selected = false;
                            series.options.data[inArray(loopPoint, series.data)] = loopPoint.options;
                            loopPoint.setState(NORMAL_STATE);
                            loopPoint.firePointEvent('unselect');
                        }
                    });
                }
            });
            //LOGIFIX
            fireEvent(this.series, 'pointselection');
        },

        /**
         * Runs on mouse over the point
         */
        onMouseOver: function (e) {
            var point = this,
                series = point.series,
                chart = series.chart,
                tooltip = chart.tooltip,
                hoverPoint = chart.hoverPoint;

            // set normal state to previous series
            if (hoverPoint && hoverPoint !== point) {
                hoverPoint.onMouseOut();
            }

            // trigger the event
            point.firePointEvent('mouseOver');

            // update the tooltip
            if (tooltip && (!tooltip.shared || series.noSharedTooltip)) {
                tooltip.refresh(point, e);
            }

            // hover this
            point.setState(HOVER_STATE);
            chart.hoverPoint = point;
        },

        /**
         * Runs on mouse out from the point
         */
        onMouseOut: function () {
            var chart = this.series.chart,
                hoverPoints = chart.hoverPoints;

            if (!hoverPoints || inArray(this, hoverPoints) === -1) { // #887
                this.firePointEvent('mouseOut');

                this.setState();
                chart.hoverPoint = null;
            }
        },

        /**
         * Fire an event on the Point object. Must not be renamed to fireEvent, as this
         * causes a name clash in MooTools
         * @param {String} eventType
         * @param {Object} eventArgs Additional event arguments
         * @param {Function} defaultFunction Default event handler
         */
        firePointEvent: function (eventType, eventArgs, defaultFunction) {
            var point = this,
                series = this.series,
                seriesOptions = series.options;

            // load event handlers on demand to save time on mouseover/out
            if (seriesOptions.point.events[eventType] || (point.options && point.options.events && point.options.events[eventType])) {
                this.importEvents();
            }

            // add default handler if in selection mode
            if (eventType === 'click' && seriesOptions.allowPointSelect) {
                defaultFunction = function (event) {
                    // Control key is for Windows, meta (= Cmd key) for Mac, Shift for Opera
                    point.select(null, event.ctrlKey || event.metaKey || event.shiftKey);
                };
            }

            fireEvent(this, eventType, eventArgs, defaultFunction);
        },
        /**
         * Import events from the series' and point's options. Only do it on
         * demand, to save processing time on hovering.
         */
        importEvents: function () {
            if (!this.hasImportedEvents) {
                var point = this,
                    options = merge(point.series.options.point, point.options),
                    events = options.events,
                    eventType;

                point.events = events;

                for (eventType in events) {
                    addEvent(point, eventType, events[eventType]);
                }
                this.hasImportedEvents = true;

            }
        },

        /**
         * Set the point's state
         * @param {String} state
         */
        setState: function (state, move) {
            var point = this,
                plotX = point.plotX,
                plotY = point.plotY,
                series = point.series,
                stateOptions = series.options.states,
                markerOptions = defaultPlotOptions[series.type].marker && series.options.marker,
                normalDisabled = markerOptions && !markerOptions.enabled,
                markerStateOptions = markerOptions && markerOptions.states[state],
                stateDisabled = markerStateOptions && markerStateOptions.enabled === false,
                stateMarkerGraphic = series.stateMarkerGraphic,
                pointMarker = point.marker || {},
                chart = series.chart,
                radius,
                newSymbol,
                pointAttr = point.pointAttr;

            state = state || NORMAL_STATE; // empty string
            move = move && stateMarkerGraphic;

            if (
                // already has this state
                    (state === point.state && !move) ||
                // selected points don't respond to hover
                    (point.selected && state !== SELECT_STATE) ||
                // series' state options is disabled
                    (stateOptions[state] && stateOptions[state].enabled === false) ||
                // general point marker's state options is disabled
                    (state && (stateDisabled || (normalDisabled && !markerStateOptions.enabled))) ||
                // individual point marker's state options is disabled
                    (state && pointMarker.states && pointMarker.states[state] && pointMarker.states[state].enabled === false) // #1610

                ) {
                return;
            }


            // apply hover styles to the existing point
            if (point.graphic) {
                radius = markerOptions && point.graphic.symbolName && pointAttr[state].r;
                point.graphic.attr(merge(
                    pointAttr[state],
                    radius ? { // new symbol attributes (#507, #612)
                        x: plotX - radius,
                        y: plotY - radius,
                        width: 2 * radius,
                        height: 2 * radius
                    } : {}
                ));
            } else {
                // if a graphic is not applied to each point in the normal state, create a shared
                // graphic for the hover state
                if (state && markerStateOptions) {
                    radius = markerStateOptions.radius;
                    newSymbol = pointMarker.symbol || series.symbol;

                    // If the point has another symbol than the previous one, throw away the
                    // state marker graphic and force a new one (#1459)
                    if (stateMarkerGraphic && stateMarkerGraphic.currentSymbol !== newSymbol) {
                        stateMarkerGraphic = stateMarkerGraphic.destroy();
                    }

                    // Add a new state marker graphic
                    if (!stateMarkerGraphic) {
                        series.stateMarkerGraphic = stateMarkerGraphic = chart.renderer.symbol(
                            newSymbol,
                            plotX - radius,
                            plotY - radius,
                            2 * radius,
                            2 * radius
                        )
                        .attr(pointAttr[state])
                        .add(series.markerGroup);
                        stateMarkerGraphic.currentSymbol = newSymbol;

                        // Move the existing graphic
                    } else {
                        stateMarkerGraphic[move ? 'animate' : 'attr']({ // #1054
                            x: plotX - radius,
                            y: plotY - radius
                        });
                    }
                }

                if (stateMarkerGraphic) {
                    stateMarkerGraphic[state && chart.isInsidePlot(plotX, plotY, chart.inverted) ? 'show' : 'hide'](); // #2450
                }
            }

            point.state = state;
        }
    });

    /*
     * Extend the Series object with interaction
     */

    extend(Series.prototype, {
        /**
         * Series mouse over handler
         */
        onMouseOver: function () {
            var series = this,
                chart = series.chart,
                hoverSeries = chart.hoverSeries;

            // set normal state to previous series
            if (hoverSeries && hoverSeries !== series) {
                hoverSeries.onMouseOut();
            }

            // trigger the event, but to save processing time,
            // only if defined
            if (series.options.events.mouseOver) {
                fireEvent(series, 'mouseOver');
            }

            // hover this
            series.setState(HOVER_STATE);
            chart.hoverSeries = series;
        },

        /**
         * Series mouse out handler
         */
        onMouseOut: function () {
            // trigger the event only if listeners exist
            var series = this,
                options = series.options,
                chart = series.chart,
                tooltip = chart.tooltip,
                hoverPoint = chart.hoverPoint;

            // trigger mouse out on the point, which must be in this series
            if (hoverPoint) {
                hoverPoint.onMouseOut();
            }

            // fire the mouse out event
            if (series && options.events.mouseOut) {
                fireEvent(series, 'mouseOut');
            }


            // hide the tooltip
            if (tooltip && !options.stickyTracking && (!tooltip.shared || series.noSharedTooltip)) {
                tooltip.hide();
            }

            // set normal state
            series.setState();
            chart.hoverSeries = null;
        },

        /**
         * Set the state of the graph
         */
        setState: function (state) {
            var series = this,
                options = series.options,
                graph = series.graph,
                graphNeg = series.graphNeg,
                stateOptions = options.states,
                lineWidth = options.lineWidth,
                attribs;

            state = state || NORMAL_STATE;

            if (series.state !== state) {
                series.state = state;

                if (stateOptions[state] && stateOptions[state].enabled === false) {
                    return;
                }

                if (state) {
                    lineWidth = stateOptions[state].lineWidth || lineWidth + 1;
                }

                //LOGIFIX;
                // 21097 Hover Style is not consistent in the series (if hover on legend vs point)
                var isLegend = arguments[1];
                if (isLegend && series.points) {
                    for (var i = 0; i < series.points.length; i++) {
                        if (series.points[i].setState) {
                            series.points[i].setState(state);
                        }
                    }
                }

                if (graph && !graph.dashstyle) { // hover is turned off for dashed lines in VML
                    attribs = {
                        'stroke-width': lineWidth
                    };
                    // use attr because animate will cause any other animation on the graph to stop
                    graph.attr(attribs);
                    if (graphNeg) {
                        graphNeg.attr(attribs);
                    }
                }
            }
        },

        /**
         * Set the visibility of the graph
         *
         * @param vis {Boolean} True to show the series, false to hide. If UNDEFINED,
         *				the visibility is toggled.
         */
        setVisible: function (vis, redraw) {
            var series = this,
                chart = series.chart,
                legendItem = series.legendItem,
                showOrHide,
                ignoreHiddenSeries = chart.options.chart.ignoreHiddenSeries,
                oldVisibility = series.visible;

            // if called without an argument, toggle visibility
            series.visible = vis = series.userOptions.visible = vis === UNDEFINED ? !oldVisibility : vis;
            showOrHide = vis ? 'show' : 'hide';

            // show or hide elements
            each(['group', 'dataLabelsGroup', 'markerGroup', 'tracker'], function (key) {
                if (series[key]) {
                    series[key][showOrHide]();
                }
            });


            // hide tooltip (#1361)
            if (chart.hoverSeries === series) {
                series.onMouseOut();
            }


            if (legendItem) {
                chart.legend.colorizeItem(series, vis);
            }


            // rescale or adapt to resized chart
            series.isDirty = true;
            // in a stack, all other series are affected
            if (series.options.stacking) {
                each(chart.series, function (otherSeries) {
                    if (otherSeries.options.stacking && otherSeries.visible) {
                        otherSeries.isDirty = true;
                    }
                });
            }

            // show or hide linked series
            each(series.linkedSeries, function (otherSeries) {
                otherSeries.setVisible(vis, false);
            });

            if (ignoreHiddenSeries) {
                chart.isDirtyBox = true;
            }
            if (redraw !== false) {
                chart.redraw();
            }

            fireEvent(series, showOrHide);
        },

        /**
         * Memorize tooltip texts and positions
         */
        setTooltipPoints: function (renew) {
            var series = this,
                points = [],
                pointsLength,
                low,
                high,
                xAxis = series.xAxis,
                xExtremes = xAxis && xAxis.getExtremes(),
                axisLength = xAxis ? (xAxis.tooltipLen || xAxis.len) : series.chart.plotSizeX, // tooltipLen and tooltipPosName used in polar
                point,
                pointX,
                nextPoint,
                i,
                tooltipPoints = []; // a lookup array for each pixel in the x dimension

            // don't waste resources if tracker is disabled
            if (series.options.enableMouseTracking === false || series.singularTooltips) {
                return;
            }

            // renew
            if (renew) {
                series.tooltipPoints = null;
            }

            // concat segments to overcome null values
            each(series.segments || series.points, function (segment) {
                points = points.concat(segment);
            });

            // Reverse the points in case the X axis is reversed
            if (xAxis && xAxis.reversed) {
                points = points.reverse();
            }

            // Polar needs additional shaping
            if (series.orderTooltipPoints) {
                series.orderTooltipPoints(points);
            }

            // Assign each pixel position to the nearest point
            pointsLength = points.length;
            for (i = 0; i < pointsLength; i++) {
                point = points[i];
                pointX = point.x;
                if (pointX >= xExtremes.min && pointX <= xExtremes.max) { // #1149
                    nextPoint = points[i + 1];

                    // Set this range's low to the last range's high plus one
                    low = high === UNDEFINED ? 0 : high + 1;
                    // Now find the new high
                    high = points[i + 1] ?
                        mathMin(mathMax(0, mathFloor( // #2070
                            (point.clientX + (nextPoint ? (nextPoint.wrappedClientX || nextPoint.clientX) : axisLength)) / 2
                        )), axisLength) :
                        axisLength;

                    while (low >= 0 && low <= high) {
                        tooltipPoints[low++] = point;
                    }
                }
            }
            series.tooltipPoints = tooltipPoints;
        },

        /**
         * Show the graph
         */
        show: function () {
            this.setVisible(true);
        },

        /**
         * Hide the graph
         */
        hide: function () {
            this.setVisible(false);
        },


        /**
         * Set the selected state of the graph
         *
         * @param selected {Boolean} True to select the series, false to unselect. If
         *				UNDEFINED, the selection state is toggled.
         */
        select: function (selected) {
            var series = this;
            // if called without an argument, toggle
            series.selected = selected = (selected === UNDEFINED) ? !series.selected : selected;

            if (series.checkbox) {
                series.checkbox.checked = selected;
            }

            fireEvent(series, selected ? 'select' : 'unselect');
        },

        drawTracker: TrackerMixin.drawTrackerGraph
    });
    // global variables
    extend(Highcharts, {

        // Constructors
        Axis: Axis,
        Chart: Chart,
        Color: Color,
        Point: Point,
        Tick: Tick,
        Renderer: Renderer,
        Series: Series,
        SVGElement: SVGElement,
        SVGRenderer: SVGRenderer,

        // Various
        arrayMin: arrayMin,
        arrayMax: arrayMax,
        charts: charts,
        dateFormat: dateFormat,
        format: format,
        pathAnim: pathAnim,
        getOptions: getOptions,
        hasBidiBug: hasBidiBug,
        isTouchDevice: isTouchDevice,
        numberFormat: numberFormat,
        seriesTypes: seriesTypes,
        setOptions: setOptions,
        addEvent: addEvent,
        removeEvent: removeEvent,
        createElement: createElement,
        discardElement: discardElement,
        css: css,
        each: each,
        extend: extend,
        map: map,
        merge: merge,
        pick: pick,
        splat: splat,
        extendClass: extendClass,
        pInt: pInt,
        wrap: wrap,
        svg: hasSVG,
        canvas: useCanVG,
        vml: !hasSVG && !useCanVG,
        product: PRODUCT,
        version: VERSION
    });

}());

//------------ rdChartCanvas\modules\funnel.src.js ---------------/
/**
 * @license 
 * Highcharts funnel module
 *
 * (c) 2010-2014 Torstein Honsi
 *
 * License: www.highcharts.com/license
 */

/*global Highcharts */
(function (Highcharts) {

    'use strict';

    // create shortcuts
    var defaultOptions = Highcharts.getOptions(),
        defaultPlotOptions = defaultOptions.plotOptions,
        seriesTypes = Highcharts.seriesTypes,
        merge = Highcharts.merge,
        noop = function () { },
        each = Highcharts.each;

    // set default options
    defaultPlotOptions.funnel = merge(defaultPlotOptions.pie, {
        center: ['50%', '50%'],
        width: '90%',
        neckWidth: '30%',
        height: '100%',
        neckHeight: '25%',
        reversed: false,
        dataLabels: {
            //position: 'right',
            connectorWidth: 1

        },
        size: true, // to avoid adapting to data label size in Pie.drawDataLabels
        states: {
            select: {
                color: '#C0C0C0',
                borderColor: '#000000',
                shadow: false
            }
        }
    });


    seriesTypes.funnel = Highcharts.extendClass(seriesTypes.pie, {

        type: 'funnel',
        animate: noop,
        singularTooltips: true,

        /**
         * Overrides the pie translate method
         */
        translate: function () {

            var
                // Get positions - either an integer or a percentage string must be given
                getLength = function (length, relativeTo) {
                    return (/%$/).test(length) ?
                        relativeTo * parseInt(length, 10) / 100 :
                        parseInt(length, 10);
                },

                sum = 0,
                series = this,
                chart = series.chart,
                options = series.options,
                reversed = options.reversed,
                plotWidth = chart.plotWidth,
                plotHeight = chart.plotHeight,
                cumulative = 0, // start at top
                center = options.center,
                centerX = getLength(center[0], plotWidth),
                centerY = getLength(center[0], plotHeight),
                width = getLength(options.width, plotWidth),
                tempWidth,
                getWidthAt,
                height = getLength(options.height, plotHeight),
                neckWidth = getLength(options.neckWidth, plotWidth),
                neckHeight = getLength(options.neckHeight, plotHeight),
                neckY = height - neckHeight,
                data = series.data,
                path,
                fraction,
                half = options.dataLabels.position === 'left' ? 1 : 0,

                x1,
                y1,
                x2,
                x3,
                y3,
                x4,
                y5;

            // Return the width at a specific y coordinate
            series.getWidthAt = getWidthAt = function (y) {
                return y > height - neckHeight || height === neckHeight ?
                    neckWidth :
                    neckWidth + (width - neckWidth) * ((height - neckHeight - y) / (height - neckHeight));
            };
            series.getX = function (y, half) {
                return centerX + (half ? -1 : 1) * ((getWidthAt(reversed ? plotHeight - y : y) / 2) + options.dataLabels.distance);
            };

            // Expose
            series.center = [centerX, centerY, height];
            series.centerX = centerX;

            /*
             * Individual point coordinate naming:
             *
             * x1,y1 _________________ x2,y1
             *  \                         /
             *   \                       /
             *    \                     /
             *     \                   /
             *      \                 /
             *     x3,y3 _________ x4,y3
             *
             * Additional for the base of the neck:
             *
             *       |               |
             *       |               |
             *       |               |
             *     x3,y5 _________ x4,y5
             */




            // get the total sum
            each(data, function (point) {
                // LOGIGIX
                if (point.visible)
                    sum += point.y;
            });

            each(data, function (point) {
                // set start and end positions
                // LOGIGIX
                if (!point.visible)
                    return;

                y5 = null;
                fraction = sum ? point.y / sum : 0;
                y1 = centerY - height / 2 + cumulative * height;
                y3 = y1 + fraction * height;
                //tempWidth = neckWidth + (width - neckWidth) * ((height - neckHeight - y1) / (height - neckHeight));
                tempWidth = getWidthAt(y1);
                x1 = centerX - tempWidth / 2;
                x2 = x1 + tempWidth;
                tempWidth = getWidthAt(y3);
                x3 = centerX - tempWidth / 2;
                x4 = x3 + tempWidth;

                // the entire point is within the neck
                if (y1 > neckY) {
                    x1 = x3 = centerX - neckWidth / 2;
                    x2 = x4 = centerX + neckWidth / 2;

                    // the base of the neck
                } else if (y3 > neckY) {
                    y5 = y3;

                    tempWidth = getWidthAt(neckY);
                    x3 = centerX - tempWidth / 2;
                    x4 = x3 + tempWidth;

                    y3 = neckY;
                }

                if (reversed) {
                    y1 = height - y1;
                    y3 = height - y3;
                    y5 = (y5 ? height - y5 : null);
                }
                // save the path
                path = [
                    'M',
                    x1, y1,
                    'L',
                    x2, y1,
                    x4, y3
                ];
                if (y5) {
                    path.push(x4, y5, x3, y5);
                }
                path.push(x3, y3, 'Z');

                // prepare for using shared dr
                point.shapeType = 'path';
                point.shapeArgs = { d: path };


                // for tooltips and data labels
                point.percentage = fraction * 100;
                point.plotX = centerX;
                point.plotY = (y1 + (y5 || y3)) / 2;

                // Placement of tooltips and data labels
                point.tooltipPos = [
                    centerX,
                    point.plotY
                ];

                // Slice is a noop on funnel points
                point.slice = noop;

                // Mimicking pie data label placement logic
                point.half = half;

                cumulative += fraction;
            });
        },
        /**
         * Draw a single point (wedge)
         * @param {Object} point The point object
         * @param {Object} color The color of the point
         * @param {Number} brightness The brightness relative to the color
         */
        drawPoints: function () {
            var series = this,
                options = series.options,
                chart = series.chart,
                renderer = chart.renderer;

            each(series.data, function (point) {

                var graphic = point.graphic,
                    shapeArgs = point.shapeArgs;

                if (!graphic) { // Create the shapes
                    point.graphic = renderer.path(shapeArgs).
                        attr({
                            fill: point.color,
                            stroke: options.borderColor,
                            'stroke-width': options.borderWidth
                        }).
                        add(series.group);

                } else { // Update the shapes
                    graphic.animate(shapeArgs);
                }
            });
        },

        /**
         * Funnel items don't have angles (#2289)
         */
        sortByAngle: function (points) {
            points.sort(function (a, b) {
                return a.plotY - b.plotY;
            });
        },

        /**
         * Extend the pie data label method
         */
        drawDataLabels: function () {
            var data = this.data,
                labelDistance = this.options.dataLabels.distance,
                leftSide,
                sign,
                point,
                i = data.length,
                x,
                y;

            // In the original pie label anticollision logic, the slots are distributed
            // from one labelDistance above to one labelDistance below the pie. In funnels
            // we don't want this.
            this.center[2] -= 2 * labelDistance;

            // Set the label position array for each point.
            while (i--) {
                point = data[i];
                leftSide = point.half;
                sign = leftSide ? 1 : -1;
                y = point.plotY;
                x = this.getX(y, leftSide);

                // set the anchor point for data labels
                point.labelPos = [
                    0, // first break of connector
                    y, // a/a
                    x + (labelDistance - 5) * sign, // second break, right outside point shape
                    y, // a/a
                    x + labelDistance * sign, // landing point for connector
                    y, // a/a
                    leftSide ? 'right' : 'left', // alignment
                    0 // center angle
                ];
                if (point.dataLabel) {
                    if (point.dataLabel.element) {
                        var elem = point.dataLabel.element;
                        if (elem.remove)
                            elem.remove();
                        else {
                            elem.parentNode.removeChild(elem);
                        }
                    }
                    point.dataLabel = null;
                }
            }


            seriesTypes.pie.prototype.drawDataLabels.call(this);
        }

    });

    /** 
     * Pyramid series type.
     * A pyramid series is a special type of funnel, without neck and reversed by default.
     */
    defaultOptions.plotOptions.pyramid = Highcharts.merge(defaultOptions.plotOptions.funnel, {
        neckWidth: '0%',
        neckHeight: '0%',
        reversed: true
    });
    Highcharts.seriesTypes.pyramid = Highcharts.extendClass(Highcharts.seriesTypes.funnel, {
        type: 'pyramid'
    });

}(Highcharts));

//------------ rdChartCanvas\highcharts-more.js ---------------/
/*
 Highcharts JS v3.0.8 (2014-01-09)

 (c) 2009-2014 Torstein Honsi

 License: www.highcharts.com/license
*/
(function(k,D){function J(a,b,c){this.init.call(this,a,b,c)}var N=k.arrayMin,O=k.arrayMax,t=k.each,z=k.extend,q=k.merge,P=k.map,r=k.pick,v=k.pInt,o=k.getOptions().plotOptions,h=k.seriesTypes,u=k.extendClass,K=k.splat,p=k.wrap,L=k.Axis,A=k.Tick,H=k.Point,Q=k.Pointer,R=k.TrackerMixin,S=k.CenteredSeriesMixin,x=k.Series,w=Math,E=w.round,B=w.floor,T=w.max,U=k.Color,s=function(){};z(J.prototype,{init:function(a,b,c){var d=this,e=d.defaultOptions;d.chart=b;if(b.angular)e.background={};d.options=a=q(e,a);
(a=a.background)&&t([].concat(K(a)).reverse(),function(a){var f=a.backgroundColor,a=q(d.defaultBackgroundOptions,a);if(f)a.backgroundColor=f;a.color=a.backgroundColor;c.options.plotBands.unshift(a)})},defaultOptions:{center:["50%","50%"],size:"85%",startAngle:0},defaultBackgroundOptions:{shape:"circle",borderWidth:1,borderColor:"silver",backgroundColor:{linearGradient:{x1:0,y1:0,x2:0,y2:1},stops:[[0,"#FFF"],[1,"#DDD"]]},from:Number.MIN_VALUE,innerRadius:0,to:Number.MAX_VALUE,outerRadius:"105%"}});
var G=L.prototype,A=A.prototype,V={getOffset:s,redraw:function(){this.isDirty=!1},render:function(){this.isDirty=!1},setScale:s,setCategories:s,setTitle:s},M={isRadial:!0,defaultRadialGaugeOptions:{labels:{align:"center",x:0,y:null},minorGridLineWidth:0,minorTickInterval:"auto",minorTickLength:10,minorTickPosition:"inside",minorTickWidth:1,plotBands:[],tickLength:10,tickPosition:"inside",tickWidth:2,title:{rotation:0},zIndex:2},defaultRadialXOptions:{gridLineWidth:1,labels:{align:null,distance:15,
x:0,y:null},maxPadding:0,minPadding:0,plotBands:[],showLastLabel:!1,tickLength:0},defaultRadialYOptions:{gridLineInterpolation:"circle",labels:{align:"right",x:-3,y:-2},plotBands:[],showLastLabel:!1,title:{x:4,text:null,rotation:90}},setOptions:function(a){this.options=q(this.defaultOptions,this.defaultRadialOptions,a)},getOffset:function(){G.getOffset.call(this);this.chart.axisOffset[this.side]=0;this.center=this.pane.center=S.getCenter.call(this.pane)},getLinePath:function(a,b){var c=this.center,
b=r(b,c[2]/2-this.offset);return this.chart.renderer.symbols.arc(this.left+c[0],this.top+c[1],b,b,{start:this.startAngleRad,end:this.endAngleRad,open:!0,innerR:0})},setAxisTranslation:function(){G.setAxisTranslation.call(this);if(this.center&&(this.transA=this.isCircular?(this.endAngleRad-this.startAngleRad)/(this.max-this.min||1):this.center[2]/2/(this.max-this.min||1),this.isXAxis))this.minPixelPadding=this.transA*this.minPointOffset+(this.reversed?(this.endAngleRad-this.startAngleRad)/4:0)},beforeSetTickPositions:function(){this.autoConnect&&
(this.max+=this.categories&&1||this.pointRange||this.closestPointRange||0)},setAxisSize:function(){G.setAxisSize.call(this);if(this.isRadial)this.center=this.pane.center=k.CenteredSeriesMixin.getCenter.call(this.pane),this.len=this.width=this.height=this.isCircular?this.center[2]*(this.endAngleRad-this.startAngleRad)/2:this.center[2]/2},getPosition:function(a,b){if(!this.isCircular)b=this.translate(a),a=this.min;return this.postTranslate(this.translate(a),r(b,this.center[2]/2)-this.offset)},postTranslate:function(a,
b){var c=this.chart,d=this.center,a=this.startAngleRad+a;return{x:c.plotLeft+d[0]+Math.cos(a)*b,y:c.plotTop+d[1]+Math.sin(a)*b}},getPlotBandPath:function(a,b,c){var d=this.center,e=this.startAngleRad,g=d[2]/2,f=[r(c.outerRadius,"100%"),c.innerRadius,r(c.thickness,10)],j=/%$/,n,l=this.isCircular;this.options.gridLineInterpolation==="polygon"?d=this.getPlotLinePath(a).concat(this.getPlotLinePath(b,!0)):(l||(f[0]=this.translate(a),f[1]=this.translate(b)),f=P(f,function(a){j.test(a)&&(a=v(a,10)*g/100);
return a}),c.shape==="circle"||!l?(a=-Math.PI/2,b=Math.PI*1.5,n=!0):(a=e+this.translate(a),b=e+this.translate(b)),d=this.chart.renderer.symbols.arc(this.left+d[0],this.top+d[1],f[0],f[0],{start:a,end:b,innerR:r(f[1],f[0]-f[2]),open:n}));return d},getPlotLinePath:function(a,b){var c=this.center,d=this.chart,e=this.getPosition(a),g,f,j;this.isCircular?j=["M",c[0]+d.plotLeft,c[1]+d.plotTop,"L",e.x,e.y]:this.options.gridLineInterpolation==="circle"?(a=this.translate(a))&&(j=this.getLinePath(0,a)):(g=
d.xAxis[0],j=[],a=this.translate(a),c=g.tickPositions,g.autoConnect&&(c=c.concat([c[0]])),b&&(c=[].concat(c).reverse()),t(c,function(c,b){f=g.getPosition(c,a);j.push(b?"L":"M",f.x,f.y)}));return j},getTitlePosition:function(){var a=this.center,b=this.chart,c=this.options.title;return{x:b.plotLeft+a[0]+(c.x||0),y:b.plotTop+a[1]-{high:0.5,middle:0.25,low:0}[c.align]*a[2]+(c.y||0)}}};p(G,"init",function(a,b,c){var i;var d=b.angular,e=b.polar,g=c.isX,f=d&&g,j,n;n=b.options;var l=c.pane||0;if(d){if(z(this,
f?V:M),j=!g)this.defaultRadialOptions=this.defaultRadialGaugeOptions}else if(e)z(this,M),this.defaultRadialOptions=(j=g)?this.defaultRadialXOptions:q(this.defaultYAxisOptions,this.defaultRadialYOptions);a.call(this,b,c);if(!f&&(d||e)){a=this.options;if(!b.panes)b.panes=[];this.pane=(i=b.panes[l]=b.panes[l]||new J(K(n.pane)[l],b,this),l=i);l=l.options;b.inverted=!1;n.chart.zoomType=null;this.startAngleRad=b=(l.startAngle-90)*Math.PI/180;this.endAngleRad=n=(r(l.endAngle,l.startAngle+360)-90)*Math.PI/
180;this.offset=a.offset||0;if((this.isCircular=j)&&c.max===D&&n-b===2*Math.PI)this.autoConnect=!0}});p(A,"getPosition",function(a,b,c,d,e){var g=this.axis;return g.getPosition?g.getPosition(c):a.call(this,b,c,d,e)});p(A,"getLabelPosition",function(a,b,c,d,e,g,f,j,n){var l=this.axis,i=g.y,m=g.align,y=(l.translate(this.pos)+l.startAngleRad+Math.PI/2)/Math.PI*180%360;l.isRadial?(a=l.getPosition(this.pos,l.center[2]/2+r(g.distance,-25)),g.rotation==="auto"?d.attr({rotation:y}):i===null&&(i=v(d.styles.lineHeight)*
0.9-d.getBBox().height/2),m===null&&(m=l.isCircular?y>20&&y<160?"left":y>200&&y<340?"right":"center":"center",d.attr({align:m})),a.x+=g.x,a.y+=i):a=a.call(this,b,c,d,e,g,f,j,n);return a});p(A,"getMarkPath",function(a,b,c,d,e,g,f){var j=this.axis;j.isRadial?(a=j.getPosition(this.pos,j.center[2]/2+d),b=["M",b,c,"L",a.x,a.y]):b=a.call(this,b,c,d,e,g,f);return b});o.arearange=q(o.area,{lineWidth:1,marker:null,threshold:null,tooltip:{pointFormat:'<span style="color:{series.color}">{series.name}</span>: <b>{point.low}</b> - <b>{point.high}</b><br/>'},
trackByArea:!0,dataLabels:{verticalAlign:null,xLow:0,xHigh:0,yLow:0,yHigh:0}});h.arearange=u(h.area,{type:"arearange",pointArrayMap:["low","high"],toYData:function(a){return[a.low,a.high]},pointValKey:"low",getSegments:function(){var a=this;t(a.points,function(b){if(!a.options.connectNulls&&(b.low===null||b.high===null))b.y=null;else if(b.low===null&&b.high!==null)b.y=b.high});x.prototype.getSegments.call(this)},translate:function(){var a=this.yAxis;h.area.prototype.translate.apply(this);t(this.points,
function(b){var c=b.low,d=b.high,e=b.plotY;d===null&&c===null?b.y=null:c===null?(b.plotLow=b.plotY=null,b.plotHigh=a.translate(d,0,1,0,1)):d===null?(b.plotLow=e,b.plotHigh=null):(b.plotLow=e,b.plotHigh=a.translate(d,0,1,0,1))})},getSegmentPath:function(a){var b,c=[],d=a.length,e=x.prototype.getSegmentPath,g,f;f=this.options;var j=f.step;for(b=HighchartsAdapter.grep(a,function(a){return a.plotLow!==null});d--;)g=a[d],g.plotHigh!==null&&c.push({plotX:g.plotX,plotY:g.plotHigh});a=e.call(this,b);if(j)j===
!0&&(j="left"),f.step={left:"right",center:"center",right:"left"}[j];c=e.call(this,c);f.step=j;f=[].concat(a,c);c[0]="L";this.areaPath=this.areaPath.concat(a,c);return f},drawDataLabels:function(){var a=this.data,b=a.length,c,d=[],e=x.prototype,g=this.options.dataLabels,f,j=this.chart.inverted;if(g.enabled||this._hasPointLabels){for(c=b;c--;)f=a[c],f.y=f.high,f.plotY=f.plotHigh,d[c]=f.dataLabel,f.dataLabel=f.dataLabelUpper,f.below=!1,j?(g.align="left",g.x=g.xHigh):g.y=g.yHigh;e.drawDataLabels&&e.drawDataLabels.apply(this,
arguments);for(c=b;c--;)f=a[c],f.dataLabelUpper=f.dataLabel,f.dataLabel=d[c],f.y=f.low,f.plotY=f.plotLow,f.below=!0,j?(g.align="right",g.x=g.xLow):g.y=g.yLow;e.drawDataLabels&&e.drawDataLabels.apply(this,arguments)}},alignDataLabel:function(){h.column.prototype.alignDataLabel.apply(this,arguments)},getSymbol:h.column.prototype.getSymbol,drawPoints:s});o.areasplinerange=q(o.arearange);h.areasplinerange=u(h.arearange,{type:"areasplinerange",getPointSpline:h.spline.prototype.getPointSpline});(function(){var a=
h.column.prototype;o.columnrange=q(o.column,o.arearange,{lineWidth:1,pointRange:null});h.columnrange=u(h.arearange,{type:"columnrange",translate:function(){var b=this,c=b.yAxis,d;a.translate.apply(b);t(b.points,function(a){var g=a.shapeArgs,f=b.options.minPointLength,j;a.plotHigh=d=c.translate(a.high,0,1,0,1);a.plotLow=a.plotY;j=d;a=a.plotY-d;a<f&&(f-=a,a+=f,j-=f/2);g.height=a;g.y=j})},trackerGroups:["group","dataLabels"],drawGraph:s,pointAttrToOptions:a.pointAttrToOptions,drawPoints:a.drawPoints,
drawTracker:a.drawTracker,animate:a.animate,getColumnMetrics:a.getColumnMetrics})})();o.gauge=q(o.line,{dataLabels:{enabled:!0,y:15,borderWidth:1,borderColor:"silver",borderRadius:3,crop:!1,style:{fontWeight:"bold"},verticalAlign:"top",zIndex:2},dial:{},pivot:{},tooltip:{headerFormat:""},showInLegend:!1});H={type:"gauge",pointClass:u(H,{setState:function(a){this.state=a}}),angular:!0,drawGraph:s,fixedBox:!0,forceDL:!0,trackerGroups:["group","dataLabels"],translate:function(){var a=this.yAxis,b=this.options,
c=a.center;this.generatePoints();t(this.points,function(d){var e=q(b.dial,d.dial),g=v(r(e.radius,80))*c[2]/200,f=v(r(e.baseLength,70))*g/100,j=v(r(e.rearLength,10))*g/100,n=e.baseWidth||3,l=e.topWidth||1,i=a.startAngleRad+a.translate(d.y,null,null,null,!0);b.wrap===!1&&(i=Math.max(a.startAngleRad,Math.min(a.endAngleRad,i)));i=i*180/Math.PI;d.shapeType="path";d.shapeArgs={d:e.path||["M",-j,-n/2,"L",f,-n/2,g,-l/2,g,l/2,f,n/2,-j,n/2,"z"],translateX:c[0],translateY:c[1],rotation:i};d.plotX=c[0];d.plotY=
c[1]})},drawPoints:function(){var a=this,b=a.yAxis.center,c=a.pivot,d=a.options,e=d.pivot,g=a.chart.renderer;t(a.points,function(f){var c=f.graphic,b=f.shapeArgs,e=b.d,i=q(d.dial,f.dial);c?(c.animate(b),b.d=e):f.graphic=g[f.shapeType](b).attr({stroke:i.borderColor||"none","stroke-width":i.borderWidth||0,fill:i.backgroundColor||"black",rotation:b.rotation}).add(a.group)});c?c.animate({translateX:b[0],translateY:b[1]}):a.pivot=g.circle(0,0,r(e.radius,5)).attr({"stroke-width":e.borderWidth||0,stroke:e.borderColor||
"silver",fill:e.backgroundColor||"black"}).translate(b[0],b[1]).add(a.group)},animate:function(a){var b=this;if(!a)t(b.points,function(a){var d=a.graphic;d&&(d.attr({rotation:b.yAxis.startAngleRad*180/Math.PI}),d.animate({rotation:a.shapeArgs.rotation},b.options.animation))}),b.animate=null},render:function(){this.group=this.plotGroup("group","series",this.visible?"visible":"hidden",this.options.zIndex,this.chart.seriesGroup);x.prototype.render.call(this);this.group.clip(this.chart.clipRect)},setData:function(a,
b){x.prototype.setData.call(this,a,!1);this.processData();this.generatePoints();r(b,!0)&&this.chart.redraw()},drawTracker:R.drawTrackerPoint};h.gauge=u(h.line,H);o.boxplot=q(o.column,{fillColor:"#FFFFFF",lineWidth:1,medianWidth:2,states:{hover:{brightness:-0.3}},threshold:null,tooltip:{pointFormat:'<span style="color:{series.color};font-weight:bold">{series.name}</span><br/>Maximum: {point.high}<br/>Upper quartile: {point.q3}<br/>Median: {point.median}<br/>Lower quartile: {point.q1}<br/>Minimum: {point.low}<br/>'},
whiskerLength:"50%",whiskerWidth:2});h.boxplot=u(h.column,{type:"boxplot",pointArrayMap:["low","q1","median","q3","high"],toYData:function(a){return[a.low,a.q1,a.median,a.q3,a.high]},pointValKey:"high",pointAttrToOptions:{fill:"fillColor",stroke:"color","stroke-width":"lineWidth"},drawDataLabels:s,translate:function(){var a=this.yAxis,b=this.pointArrayMap;h.column.prototype.translate.apply(this);t(this.points,function(c){t(b,function(b){c[b]!==null&&(c[b+"Plot"]=a.translate(c[b],0,1,0,1))})})},drawPoints:function(){var a=
this,b=a.points,c=a.options,d=a.chart.renderer,e,g,f,j,n,l,i,m,y,h,k,I,o,p,q,u,x,s,w,v,A,z,F=a.doQuartiles!==!1,C=parseInt(a.options.whiskerLength,10)/100;t(b,function(b){y=b.graphic;A=b.shapeArgs;k={};p={};u={};z=b.color||a.color;if(b.plotY!==D)if(e=b.pointAttr[b.selected?"selected":""],x=A.width,s=B(A.x),w=s+x,v=E(x/2),g=B(F?b.q1Plot:b.lowPlot),f=B(F?b.q3Plot:b.lowPlot),j=B(b.highPlot),n=B(b.lowPlot),k.stroke=b.stemColor||c.stemColor||z,k["stroke-width"]=r(b.stemWidth,c.stemWidth,c.lineWidth),k.dashstyle=
b.stemDashStyle||c.stemDashStyle,p.stroke=b.whiskerColor||c.whiskerColor||z,p["stroke-width"]=r(b.whiskerWidth,c.whiskerWidth,c.lineWidth),u.stroke=b.medianColor||c.medianColor||z,u["stroke-width"]=r(b.medianWidth,c.medianWidth,c.lineWidth),u["stroke-linecap"]="round",i=k["stroke-width"]%2/2,m=s+v+i,h=["M",m,f,"L",m,j,"M",m,g,"L",m,n,"z"],F&&(i=e["stroke-width"]%2/2,m=B(m)+i,g=B(g)+i,f=B(f)+i,s+=i,w+=i,I=["M",s,f,"L",s,g,"L",w,g,"L",w,f,"L",s,f,"z"]),C&&(i=p["stroke-width"]%2/2,j+=i,n+=i,o=["M",m-
v*C,j,"L",m+v*C,j,"M",m-v*C,n,"L",m+v*C,n]),i=u["stroke-width"]%2/2,l=E(b.medianPlot)+i,q=["M",s,l,"L",w,l,"z"],y)b.stem.animate({d:h}),C&&b.whiskers.animate({d:o}),F&&b.box.animate({d:I}),b.medianShape.animate({d:q});else{b.graphic=y=d.g().add(a.group);b.stem=d.path(h).attr(k).add(y);if(C)b.whiskers=d.path(o).attr(p).add(y);if(F)b.box=d.path(I).attr(e).add(y);b.medianShape=d.path(q).attr(u).add(y)}})}});o.errorbar=q(o.boxplot,{color:"#000000",grouping:!1,linkedTo:":previous",tooltip:{pointFormat:'<span style="color:{series.color}">{series.name}</span>: <b>{point.low}</b> - <b>{point.high}</b><br/>'},
whiskerWidth:null});h.errorbar=u(h.boxplot,{type:"errorbar",pointArrayMap:["low","high"],toYData:function(a){return[a.low,a.high]},pointValKey:"high",doQuartiles:!1,getColumnMetrics:function(){return this.linkedParent&&this.linkedParent.columnMetrics||h.column.prototype.getColumnMetrics.call(this)}});o.waterfall=q(o.column,{lineWidth:1,lineColor:"#333",dashStyle:"dot",borderColor:"#333"});h.waterfall=u(h.column,{type:"waterfall",upColorProp:"fill",pointArrayMap:["low","y"],pointValKey:"y",init:function(a,
b){b.stacking=!0;h.column.prototype.init.call(this,a,b)},translate:function(){var a=this.options,b=this.yAxis,c,d,e,g,f,j,n,l,i;c=a.threshold;a=a.borderWidth%2/2;h.column.prototype.translate.apply(this);l=c;e=this.points;for(d=0,c=e.length;d<c;d++){g=e[d];f=g.shapeArgs;j=this.getStack(d);i=j.points[this.index];if(isNaN(g.y))g.y=this.yData[d];n=T(l,l+g.y)+i[0];f.y=b.translate(n,0,1);g.isSum||g.isIntermediateSum?(f.y=b.translate(i[1],0,1),f.height=b.translate(i[0],0,1)-f.y):l+=j.total;f.height<0&&(f.y+=
f.height,f.height*=-1);g.plotY=f.y=E(f.y)-a;f.height=E(f.height);g.yBottom=f.y+f.height}},processData:function(a){var b=this.yData,c=this.points,d,e=b.length,g=this.options.threshold||0,f,j,n,l,i,m;j=f=n=l=g;for(m=0;m<e;m++)i=b[m],d=c&&c[m]?c[m]:{},i==="sum"||d.isSum?b[m]=j:i==="intermediateSum"||d.isIntermediateSum?(b[m]=f,f=g):(j+=i,f+=i),n=Math.min(j,n),l=Math.max(j,l);x.prototype.processData.call(this,a);this.dataMin=n;this.dataMax=l},toYData:function(a){if(a.isSum)return"sum";else if(a.isIntermediateSum)return"intermediateSum";
return a.y},getAttribs:function(){h.column.prototype.getAttribs.apply(this,arguments);var a=this.options,b=a.states,c=a.upColor||this.color,a=k.Color(c).brighten(0.1).get(),d=q(this.pointAttr),e=this.upColorProp;d[""][e]=c;d.hover[e]=b.hover.upColor||a;d.select[e]=b.select.upColor||c;t(this.points,function(a){if(a.y>0&&!a.color)a.pointAttr=d,a.color=c})},getGraphPath:function(){var a=this.data,b=a.length,c=E(this.options.lineWidth+this.options.borderWidth)%2/2,d=[],e,g,f;for(f=1;f<b;f++)g=a[f].shapeArgs,
e=a[f-1].shapeArgs,g=["M",e.x+e.width,e.y+c,"L",g.x,e.y+c],a[f-1].y<0&&(g[2]+=e.height,g[5]+=e.height),d=d.concat(g);return d},getExtremes:s,getStack:function(a){var b=this.yAxis.stacks,c=this.stackKey;this.processedYData[a]<this.options.threshold&&(c="-"+c);return b[c][a]},drawGraph:x.prototype.drawGraph});o.bubble=q(o.scatter,{dataLabels:{inside:!0,style:{color:"white",textShadow:"0px 0px 3px black"},verticalAlign:"middle"},marker:{lineColor:null,lineWidth:1},minSize:8,maxSize:"20%",tooltip:{pointFormat:"({point.x}, {point.y}), Size: {point.z}"},
turboThreshold:0,zThreshold:0});h.bubble=u(h.scatter,{type:"bubble",pointArrayMap:["y","z"],parallelArrays:["x","y","z"],trackerGroups:["group","dataLabelsGroup"],bubblePadding:!0,pointAttrToOptions:{stroke:"lineColor","stroke-width":"lineWidth",fill:"fillColor"},applyOpacity:function(a){var b=this.options.marker,c=r(b.fillOpacity,0.5),a=a||b.fillColor||this.color;c!==1&&(a=U(a).setOpacity(c).get("rgba"));return a},convertAttribs:function(){var a=x.prototype.convertAttribs.apply(this,arguments);a.fill=
this.applyOpacity(a.fill);return a},getRadii:function(a,b,c,d){var e,g,f,j=this.zData,n=[],l=this.options.sizeBy!=="width";for(g=0,e=j.length;g<e;g++)f=b-a,f=f>0?(j[g]-a)/(b-a):0.5,l&&f>=0&&(f=Math.sqrt(f)),n.push(w.ceil(c+f*(d-c))/2);this.radii=n},animate:function(a){var b=this.options.animation;if(!a)t(this.points,function(a){var d=a.graphic,a=a.shapeArgs;d&&a&&(d.attr("r",1),d.animate({r:a.r},b))}),this.animate=null},translate:function(){var a,b=this.data,c,d,e=this.radii;h.scatter.prototype.translate.call(this);
for(a=b.length;a--;)c=b[a],d=e?e[a]:0,c.negative=c.z<(this.options.zThreshold||0),d>=this.minPxSize/2?(c.shapeType="circle",c.shapeArgs={x:c.plotX,y:c.plotY,r:d},c.dlBox={x:c.plotX-d,y:c.plotY-d,width:2*d,height:2*d}):c.shapeArgs=c.plotY=c.dlBox=D},drawLegendSymbol:function(a,b){var c=v(a.itemStyle.fontSize)/2;b.legendSymbol=this.chart.renderer.circle(c,a.baseline-c,c).attr({zIndex:3}).add(b.legendGroup);b.legendSymbol.isMarker=!0},drawPoints:h.column.prototype.drawPoints,alignDataLabel:h.column.prototype.alignDataLabel});
L.prototype.beforePadding=function(){var a=this,b=this.len,c=this.chart,d=0,e=b,g=this.isXAxis,f=g?"xData":"yData",j=this.min,n={},l=w.min(c.plotWidth,c.plotHeight),i=Number.MAX_VALUE,m=-Number.MAX_VALUE,h=this.max-j,k=b/h,p=[];this.tickPositions&&(t(this.series,function(b){var f=b.options;if(b.bubblePadding&&b.visible&&(a.allowZoomOutside=!0,p.push(b),g))t(["minSize","maxSize"],function(a){var b=f[a],g=/%$/.test(b),b=v(b);n[a]=g?l*b/100:b}),b.minPxSize=n.minSize,b=b.zData,b.length&&(i=w.min(i,w.max(N(b),
f.displayNegative===!1?f.zThreshold:-Number.MAX_VALUE)),m=w.max(m,O(b)))}),t(p,function(a){var b=a[f],c=b.length,l;g&&a.getRadii(i,m,n.minSize,n.maxSize);if(h>0)for(;c--;)typeof b[c]==="number"&&(l=a.radii[c],d=Math.min((b[c]-j)*k-l,d),e=Math.max((b[c]-j)*k+l,e))}),p.length&&h>0&&r(this.options.min,this.userMin)===D&&r(this.options.max,this.userMax)===D&&(e-=b,k*=(b+d-e)/b,this.min+=d/k,this.max+=e/k))};(function(){function a(a,b,c){a.call(this,b,c);if(this.chart.polar)this.closeSegment=function(a){var b=
this.xAxis.center;a.push("L",b[0],b[1])},this.closedStacks=!0}function b(a,b){var c=this.chart,d=this.options.animation,e=this.group,i=this.markerGroup,m=this.xAxis.center,h=c.plotLeft,k=c.plotTop;if(c.polar){if(c.renderer.isSVG)if(d===!0&&(d={}),b){if(c={translateX:m[0]+h,translateY:m[1]+k,scaleX:0.001,scaleY:0.001},e.attr(c),i)i.attrSetters=e.attrSetters,i.attr(c)}else c={translateX:h,translateY:k,scaleX:1,scaleY:1},e.animate(c,d),i&&i.animate(c,d),this.animate=null}else a.call(this,b)}var c=x.prototype,
d=Q.prototype,e;c.toXY=function(a){var b,c=this.chart;b=a.plotX;var d=a.plotY;a.rectPlotX=b;a.rectPlotY=d;a.clientX=(b/Math.PI*180+this.xAxis.pane.options.startAngle)%360;b=this.xAxis.postTranslate(a.plotX,this.yAxis.len-d);a.plotX=a.polarPlotX=b.x-c.plotLeft;a.plotY=a.polarPlotY=b.y-c.plotTop};c.orderTooltipPoints=function(a){if(this.chart.polar&&(a.sort(function(a,b){return a.clientX-b.clientX}),a[0]))a[0].wrappedClientX=a[0].clientX+360,a.push(a[0])};h.area&&p(h.area.prototype,"init",a);h.areaspline&&
p(h.areaspline.prototype,"init",a);h.spline&&p(h.spline.prototype,"getPointSpline",function(a,b,c,d){var e,i,m,h,k,p,o;if(this.chart.polar){e=c.plotX;i=c.plotY;a=b[d-1];m=b[d+1];this.connectEnds&&(a||(a=b[b.length-2]),m||(m=b[1]));if(a&&m)h=a.plotX,k=a.plotY,b=m.plotX,p=m.plotY,h=(1.5*e+h)/2.5,k=(1.5*i+k)/2.5,m=(1.5*e+b)/2.5,o=(1.5*i+p)/2.5,b=Math.sqrt(Math.pow(h-e,2)+Math.pow(k-i,2)),p=Math.sqrt(Math.pow(m-e,2)+Math.pow(o-i,2)),h=Math.atan2(k-i,h-e),k=Math.atan2(o-i,m-e),o=Math.PI/2+(h+k)/2,Math.abs(h-
o)>Math.PI/2&&(o-=Math.PI),h=e+Math.cos(o)*b,k=i+Math.sin(o)*b,m=e+Math.cos(Math.PI+o)*p,o=i+Math.sin(Math.PI+o)*p,c.rightContX=m,c.rightContY=o;d?(c=["C",a.rightContX||a.plotX,a.rightContY||a.plotY,h||e,k||i,e,i],a.rightContX=a.rightContY=null):c=["M",e,i]}else c=a.call(this,b,c,d);return c});p(c,"translate",function(a){a.call(this);if(this.chart.polar&&!this.preventPostTranslate)for(var a=this.points,b=a.length;b--;)this.toXY(a[b])});p(c,"getSegmentPath",function(a,b){var c=this.points;if(this.chart.polar&&
this.options.connectEnds!==!1&&b[b.length-1]===c[c.length-1]&&c[0].y!==null)this.connectEnds=!0,b=[].concat(b,[c[0]]);return a.call(this,b)});p(c,"animate",b);p(c,"setTooltipPoints",function(a,b){this.chart.polar&&z(this.xAxis,{tooltipLen:360});return a.call(this,b)});if(h.column)e=h.column.prototype,p(e,"animate",b),p(e,"translate",function(a){var b=this.xAxis,c=this.yAxis.len,d=b.center,e=b.startAngleRad,i=this.chart.renderer,h,k;this.preventPostTranslate=!0;a.call(this);if(b.isRadial){b=this.points;
for(k=b.length;k--;)h=b[k],a=h.barX+e,h.shapeType="path",h.shapeArgs={d:i.symbols.arc(d[0],d[1],c-h.plotY,null,{start:a,end:a+h.pointWidth,innerR:c-r(h.yBottom,c)})},this.toXY(h)}}),p(e,"alignDataLabel",function(a,b,d,e,h,i){if(this.chart.polar){a=b.rectPlotX/Math.PI*180;if(e.align===null)e.align=a>20&&a<160?"left":a>200&&a<340?"right":"center";if(e.verticalAlign===null)e.verticalAlign=a<45||a>315?"bottom":a>135&&a<225?"top":"middle";c.alignDataLabel.call(this,b,d,e,h,i)}else a.call(this,b,d,e,h,
i)});p(d,"getIndex",function(a,b){var c,d=this.chart,e;d.polar?(e=d.xAxis[0].center,c=b.chartX-e[0]-d.plotLeft,d=b.chartY-e[1]-d.plotTop,c=180-Math.round(Math.atan2(c,d)/Math.PI*180)):c=a.call(this,b);return c});p(d,"getCoordinates",function(a,b){var c=this.chart,d={xAxis:[],yAxis:[]};c.polar?t(c.axes,function(a){var e=a.isXAxis,g=a.center,h=b.chartX-g[0]-c.plotLeft,g=b.chartY-g[1]-c.plotTop;d[e?"xAxis":"yAxis"].push({axis:a,value:a.translate(e?Math.PI-Math.atan2(h,g):Math.sqrt(Math.pow(h,2)+Math.pow(g,
2)),!0)})}):d=a.call(this,b);return d})})()})(Highcharts);

//------------ rdChartCanvas\rdHighchartRangeSelection.js ---------------/
YUI.add('chartCanvasRangeSelection', function (Y) {
    "use strict";
    var Lang = Y.Lang,
        TRIGGER = 'rdChartCanvasRangeSelection',
        MIN_HEIGHT = 5,
        MIN_WIDTH = 5;

    Y.LogiXML.Node.destroyClassKeys.push(TRIGGER);

    Y.namespace('LogiXML').ChartCanvasRangeSelection = Y.Base.create('ChartCanvasRangeSelection', Y.Base, [], {

        _handlers: {},
        configNode: null,
        constrainDiv: null,
        maskDiv: null,
        maskDraggable: null,
        maskResizer: null,
        callback: null,
        maskType: null,
        fillColor: null,

        initializer: function (config) {
            this.configNode = config.configNode;
            this.callback = config.callback;
            this.maskType = config.maskType;
            this.fillColor = config.fillColor;
            this.configNode.setData(TRIGGER, this);
            this.createConstrainDiv(config.constrainRect);
            this.createMaskDiv(config.maskRect);
        },

        destructor: function () {
            var configNode = this.configNode;
            this._clearHandlers();
            if (this.maskResizer) {
                this.maskResizer.destroy();
            };
            if (this.constrainDiv) {
                this.constrainDiv.remove();
            }
            if (this.maskDiv) {
                this.maskDiv.remove();
            }
            this.configNode.setData(TRIGGER, null);
        },

        _clearHandlers: function () {
            var self = this;
            Y.each(this._handlers, function (item) {
                if (item) {
                    item.detach();
                    item = null;
                }
            });
        },

        createConstrainDiv: function (rect) {
            if (!rect) {
                return;
            }

            this.constrainDiv = Y.Node.create('<div style="visibility: hidden;position:absolute;"></div>');
            this.constrainDiv.setStyles({
                top: rect.y + 'px',
                left: rect.x + 'px',
                height: rect.height + 'px',
                width: rect.width + 'px'
            });
            this.configNode.insert(this.constrainDiv, 0);
        },

        createMaskDiv: function (rect) {
            if (!rect) {
                return;
            }

            this.maskDiv = Y.Node.create('<div style="position:absolute;"></div>');
            var colorWithOpacity = Y.LogiXML.Color.hexWithOpacity(this.fillColor),
                fillColor = colorWithOpacity[0],
                opacity = colorWithOpacity[1];
            this.maskDiv.setStyles({
                top: rect.y + 'px',
                left: rect.x + 'px',
                height: rect.height + 'px',
                width: rect.width + 'px',
                backgroundColor: fillColor,
                opacity: opacity
            });
            this.configNode.appendChild(this.maskDiv);
            this.createMaskDraggable();
            this.createResizer();
        },

        createMaskDraggable: function () {
            this.maskDraggable = new Y.DD.Drag({ node: this.maskDiv });

            if (this.constrainDiv) {
                this.maskDraggable.plug(Y.Plugin.DDConstrained, {
                    constrain2node: this.constrainDiv
                });
            }
            this._handlers.dragEnd = this.maskDraggable.on('drag:end', this.maskChanged, this);
        },

        createResizer: function () {
            var self = this,
                cfg = {
                    node: this.maskDiv,
                    handles: this.maskType == 'x' ? 'l,r' : this.maskType == 'y' ? 't,b' : 'all'
                };
            

            this.maskResizer = new Y.LogiXML.ChartFX.Resize(cfg);
            if (this.constrainDiv) {
                this.maskResizer.plug(Y.Plugin.ResizeConstrained, {
                    constrain: this.constrainDiv
                });
            }
            this._handlers.resized = this.maskResizer.on('resize:end', this.maskChanged, this);
        },

        maskChanged: function (e) {
            var rect = {
                x: this.maskDiv.get('offsetLeft'),
                y: this.maskDiv.get('offsetTop'),
                height: this.maskDiv.get('offsetHeight'),
                width: this.maskDiv.get('offsetWidth')
            }
            if (this.callback) {
                this.callback(rect);
            }
        }

    }, {


    });

}, '1.0.0', { requires: ['base', 'dom-base', 'node-base', 'resize-base', 'event', 'color-utils', 'node-event-simulate', 'event-synthetic', 'node-custom-destroy', 'dd-drag', 'dd-constrain', 'dd-delegate', 'drawable-overlay', 'drawable-overlay-resize', 'drawable-overlay-size-constrain', 'chartfx-resize'] });
//------------ rdChartCanvas\rdHighchartsLocalization.js ---------------/
"use strict";
if (Highcharts && LogiXML && LogiXML.Localization) {
    Highcharts.setOptions({
        lang: {
            resetZoom: LogiXML.Localization.Strings.resetZoom,
            resetZoomTitle: LogiXML.Localization.Strings.resetZoomTitle,
            loading: LogiXML.Localization.Strings.loading,
            months: LogiXML.Localization.DateFormatInfo.monthNames,
            shortMonths: LogiXML.Localization.DateFormatInfo.abbreviatedMonthNames,
            weekdays: LogiXML.Localization.DateFormatInfo.dayNames,
            decimalPoint: LogiXML.Localization.NumFormatInfo.numberDecimalSeparator,
            thousandsSep: LogiXML.Localization.NumFormatInfo.numberGroupSeparator
        }
    });
}
//------------ rdChartCanvas\rdHighchartsFormatters.js ---------------/
"use strict";
if (window.LogiXML === undefined) {
    window.LogiXML = {};
}
LogiXML.HighchartsFormatters = {

    setFormatters: function (chartOptions) {
        var i, length, axis, series;

        //date in categories should be date object, not timestamp
        if (chartOptions.xAxis) {
            LogiXML.HighchartsFormatters.checkForDateInAxises(chartOptions.xAxis);
        }
        if (chartOptions.yAxis) {
            LogiXML.HighchartsFormatters.checkForDateInAxises(chartOptions.yAxis);
        }

        if (chartOptions.xAxis) {
            i = 0; length = chartOptions.xAxis.length;

            for (; i < length; i++) {
                axis = chartOptions.xAxis[i];
                if (axis.labels && axis.labels.formatter == 'labelFormatter') {
                    axis.labels.formatter = LogiXML.HighchartsFormatters.labelFormatter;
                }
            }
        }

        if (chartOptions.yAxis) {
            i = 0; length = chartOptions.yAxis.length;
            for (; i < length; i++) {
                axis = chartOptions.yAxis[i];
                if (axis.labels && axis.labels.formatter == 'labelFormatter') {
                    axis.labels.formatter = LogiXML.HighchartsFormatters.labelFormatter;
                }

                if (axis.stackLabels && axis.stackLabels.formatter == 'stackLabelFormatter') {
                    var format = axis.stackLabels.format;
                    axis.stackLabels.formatter = LogiXML.HighchartsFormatters.stackLabelFormatter;
                    axis.stackLabels._format = axis.stackLabels.format;
                    axis.stackLabels.format = null;
                }
            }
        }

        if (chartOptions.legend) {
            if (chartOptions.legend && chartOptions.legend.labelFormatter == 'legendLabelFormatter') {
                chartOptions.legend.labelFormatter = LogiXML.HighchartsFormatters.legendLabelFormatter;
                chartOptions.legend._format = chartOptions.legend.labelFormat;
                chartOptions.legend.labelFormat = null;
            }
        }

        var useFormat = function(data) {
            if (data.dataLabels && data.dataLabels.formatter) {

                switch (data.dataLabels.formatter) {
                    case "dataLabelFormatter":
                        data.dataLabels.formatter = LogiXML.HighchartsFormatters.dataLabelFormatter;
                        data.dataLabels._format = series.dataLabels.format;
                        data.dataLabels.format = null;
                        break;

                    case "sideLabelFormatter":
                        data.dataLabels.formatter = LogiXML.HighchartsFormatters.sideLabelFormatter;
                        data.dataLabels._format = series.dataLabels.format;
                        data.dataLabels._showPointName = series.dataLabels.showPointName;
                        data.dataLabels.format = null;
                        //data.dataLabels.useHTML = true;
                        break;
                }
            }
        };

        if (chartOptions.series) {
            i = 0; length = chartOptions.series.length;
            for (; i < length; i++) {
                series = chartOptions.series[i];
                if (!series.data)
                    continue;
                
                for (var f=0;f < series.data.length; f++) {
                    var dataPoint = series.data[f];
                    if (dataPoint!=null && dataPoint!=undefined) {
                        useFormat(dataPoint);
                    }
                }
                useFormat(series);
            }
        }
    },

    checkForDateInAxises: function (axises) {
        if (!axises || !LogiXML.HighchartsFormatters.isArray(axises)) {
            return;
        }

        var i = 0, length = axises.length;

        for (; i < length; i++) {
            if (axises[i].labels && axises[i].type == 'datetime' && axises[i].categories) {
                LogiXML.HighchartsFormatters.convertTimeStampToDate(axises[i].categories);
            }
        }
    },
    convertTimeStampToDate: function (dataArray) {
        if (!dataArray && dataArray.length == 0) {
            return;
        }

        var length = dataArray.length;

        for (var i = 0; i < length; i++) {
            dataArray[i] = new Date(dataArray[i]);
        }
    },
    isArray: function(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    },
    isNumber: function(n) {
	    return typeof n === 'number';
    },
    splat: function (obj) {
        return LogiXML.HighchartsFormatters.isArray(obj) ? obj : [obj];
    },
    pick: function() {
	    var args = arguments,
		    i,
		    arg,
		    length = args.length;
        for (i = 0; i < length; i++) {
            arg = args[i];
            if (typeof arg !== 'undefined' && arg !== null) {
                return arg;
            }
        }
    },
    inArray: function (item, arr) {
        var len, 
            i = 0;

        if (arr) {
            len = arr.length;
					
            for (; i < len; i++) {
                if (arr[i] === item) {
                    return i;
                }
            }
        }
        // TODO?: return arr.indexOf(item)
        return -1;
    },

    tooltipFormatter: function (tooltip) {
        var quicktip = this.point.series.quicktip, 
            i, length, html, tooltipData;

        if (this.point.isGroup)
            quicktip = this.point.style.quicktip;
        
        //remove quicktip for calculated columns
        if (this.point.isIntermediateSum || this.point.isSum) {
            quicktip = null;
        }

        if (!quicktip) {

            if (this.point.series.chart.autoQuicktip === false) {
                return false;
            }

            var items = this.points || LogiXML.HighchartsFormatters.splat(this),
                series = items[0].series,
                s;

            if (!this.point.series.chart.tooltip.style) {
                this.point.series.chart.tooltip.style = {};
            }

            // build the header
            //s = [series.tooltipHeaderFormatter(items[0])];
            s = [LogiXML.HighchartsFormatters.tooltipAutoHeaderFormatter(items[0])];

            // build the values
            i = 0; length = items.length;
            for (; i < length; i++) {
                series = items[i].series;
                if (series.tooltipFormatter) {
                    s.push(series.tooltipFormatter(items[i]));
                } else {
                    //s.push(items[i].point.tooltipFormatter(series.tooltipOptions.pointFormat));
                    s.push(LogiXML.HighchartsFormatters.tooltipAutoPointFormatter(this.point));
                }
               
            };

            // footer
            s.push(tooltip.options.footerFormat || '');

            html = '<div class="rdquicktip-content"><div class="body">';
            html += s.join('').replace(/style\=\"[^\"]*\"/g, '').replace(/<span >Series [0-9]+<\/span>(<br\/>|:)/g, '');
            html += '</div></div>';
            return html;
        }

        if (!this.point.series.chart.tooltip.style) {
            this.point.series.chart.tooltip.style = {};
        }

        this.point.series.chart.tooltip.style.padding = 0;

        html = '<div class="rdquicktip-content">';
        if (quicktip.title) {
            html += '<div class="header">' + quicktip.title + '</div>';
        }
        html += '<div class="body">';
        if (quicktip.descr) {
            html += '<p>' + quicktip.descr + '</p>';
        }

        if (quicktip.rows && quicktip.rows.length > 0) {
            html += '<table class="rdquicktip-table">';
            i = 0;
            length = quicktip.rows.length;
            for (; i < length; i++) {
                html += '<tr><td>' + quicktip.rows[i].caption + '</td><td>' + (quicktip.rows[i].value || "") + '</td></tr>';
            }
            html += '</table>';
        }

        if (this.point.qt && this.point.qt.length > 0) {
            i = 0;
            length = this.point.qt.length;
            for (; i < length; i++) {
                html = html.replace(new RegExp('\\{' + i + '\\}', 'g'), this.point.qt[i])
            }
        }
        html += '</div></div></div>';
        return html;
    },
    tooltipAutoHeaderFormatter: function (point) {
        var series = point.series,
			tooltipOptions = series.tooltipOptions,
			dateTimeLabelFormats = tooltipOptions.dateTimeLabelFormats,
			xDateFormat = tooltipOptions.xDateFormat || dateTimeLabelFormats.year, // #2546
			xAxis = series.xAxis,
			isDateTime = xAxis && xAxis.options.type === 'datetime',
			headerFormat = tooltipOptions.headerFormat,
			closestPointRange = xAxis && xAxis.closestPointRange,
			n;

        // Guess the best date format based on the closest point distance (#568)
        if (isDateTime && !xDateFormat) {
            if (closestPointRange) {
                for (n in timeUnits) {
                    if (timeUnits[n] >= closestPointRange) {
                        xDateFormat = dateTimeLabelFormats[n];
                        break;
                    }
                }
            } else {
                xDateFormat = dateTimeLabelFormats.day;
            }
        }

        // Insert the header date format if any
        if (isDateTime && xDateFormat && LogiXML.HighchartsFormatters.isNumber(point.key)) {
            if (xDateFormat == "%Y" && point.key) {
                headerFormat = headerFormat.replace('{point.key}', LogiXML.Formatter.formatDate(point.key, 'd'));
            } else {
                headerFormat = headerFormat.replace('{point.key}', '{point.key:' + xDateFormat + '}');
            }
        } else if (!series.xAxis) {
            headerFormat = headerFormat.replace('{point.key:.2f}', point.key);
            tooltipOptions.pointFormat = tooltipOptions.pointFormat.replace('{series.name}:', "").replace('●','');
        }
        else if (!series.xAxis) {
            headerFormat = headerFormat.replace('{point.key:.2f}', point.key);
            tooltipOptions.pointFormat = tooltipOptions.pointFormat.replace('{series.name}:', "");
        }

        return Highcharts.format(headerFormat, {
            point: point,
            series: series
        });
    },
    tooltipAutoPointFormatter: function (point) {
        var series = point.series,
            tooltipOptions = series.tooltipOptions,
            pointFormat = series.tooltipOptions.pointFormat,
			seriesTooltipOptions = series.tooltipOptions,
			valueDecimals = LogiXML.HighchartsFormatters.pick(seriesTooltipOptions.valueDecimals, ''),
			valuePrefix = seriesTooltipOptions.valuePrefix || '',
			valueSuffix = seriesTooltipOptions.valueSuffix || '',
            pointArrayMap, i = 0, length, key,
            format, axisType,val;

        // Loop over the point array map and replace unformatted values with sprintf formatting markup
        pointArrayMap = series.pointArrayMap || ['x', 'y'];
        if (LogiXML.HighchartsFormatters.inArray('x', pointArrayMap) == -1) {
            pointArrayMap.push('x');
        }
        length = pointArrayMap.length;
        for (; i < length; i++) {
            key = pointArrayMap[i];
            if (key == 'x') {
                axisType = series.xAxis && series.xAxis.options.type || 'category';
            } else{
                axisType = series.yAxis && series.yAxis.options.type || 'linear';
            }
            format = '';
            switch(axisType) {
                case 'category':
                    //nothing to do
                    break;
                case 'datetime': 
                    if (key == 'x') {
                        format = tooltipOptions.xDateFormat;
                    } else {
                        format = tooltipOptions.yDateFormat;
                    }
                    if (!format) {
                        val = point[key];
                        if (val) {
                            pointFormat = pointFormat.replace('{point.' + key + '}', LogiXML.Formatter.formatDate(val, 'd'));
                        }
                        continue;
                    }
                    break;
                default: //linear or log
                    format = ':,.' + valueDecimals + 'f';
                    break;
            }

            key = '{point.' +key;
            if (valuePrefix || valueSuffix) {
                pointFormat = pointFormat.replace(key + '}', valuePrefix + key + '}' + valueSuffix);
            }
            if (format && format !== '') {
                pointFormat = pointFormat.replace(key + '}', key + format + '}');
            }
        }

        return Highcharts.format(pointFormat, {
            point: point,
            series: point.series
        });
    },

    dataLabelFormatter: function () {
        var format = this.series.options.dataLabels._format,
            value = this.y;
        //TODO: may be percent, total, etc. Digg it later
        return LogiXML.Formatter.format(value, format);
    },

    sideLabelFormatter: function () {
        var format = this.series.options.dataLabels._format,
            value = this.point && this.point.name ? this.point.name : "",
            dataValue = this.y,
            showPointName = this.series.options.dataLabels.showPointName,
            showDataValue = this.series.options.dataLabels.showDataValue,
            ret;
        //TODO: may be percent, total, etc. Digg it later
        if (format != null && format != "") {
            if (format == "Percent" || format == "p" || format == "%" || format.indexOf("%", format.length - 1) !== -1) {
                dataValue = this.percentage / 100;
            }
            dataValue = LogiXML.Formatter.format(dataValue, format);
        } 
        if (showPointName && showDataValue) {
            ret = "<div>" + value + "<br />" + dataValue + "</div>";
        } else if (showPointName) {
            ret = value;
        } else {
            ret = dataValue;
        }
        return ret;
    },

    legendLabelFormatter: function () {
        var format = this.chart ? this.chart.options.legend._format : this.series.chart.options.legend._format;
        return LogiXML.Formatter.format(this.name, format);
    },

    stackLabelFormatter: function () {
        var format = this.options._format;

        return LogiXML.Formatter.format(this.total, format);
    },

    labelFormatter: function () {
        var format = this.axis.options.labels.format;
        if (this.dateTimeLabelFormat || this.value instanceof Date) {
            return LogiXML.Formatter.formatDate(this.value, format);
        } else {
            return LogiXML.Formatter.format(this.value, format);
        }
        //    return LogiXML.Formatter.formatNumber(this.value, format, lang, global);
        //} else if (typeof this.value === 'string') {
        //    return LogiXML.Formatter.formatString(this.value, format, lang, global);
        //}
        //return this.value;
    }
}

//------------ rdChartCanvas\modules\rdTreemapSeries.js ---------------/
/**
 * @license 
 * Highcharts funnel module, Beta
 *
 * (c) 2010-2012 Torstein Hønsi
 *
 * License: www.highcharts.com/license
 */
/*global Highcharts */
var getColorComponentFromRgbString = function(color, offset) {
    var re = /rgb\((\d+),(\d+),(\d+)\)/;
    var expression = re.exec(color);
    var index = offset / 8 + 1;
    return expression[index];
};
var getColorComponent = function (color, offset) {
    if (color.startsWith("rgb")) {
        return getColorComponentFromRgbString(color, offset);
    }
    var bigInt = parseInt(color.substring(1), 16);
    return (bigInt >> offset) & 255;
};

var Color = Highcharts.Color || {};
Color.getPercentOfSpreadColor3 = function(nValue, nMinRange, nMaxRange, sHexColorLow, sHexColorMed, sHexColorHi) {
    //Get the Percent of Spread from 2 colors.
    if (nMinRange >= nMaxRange)
        return sHexColorMed;

    //Fix the value so it's between 0 and 1, according to the Min and Max range values.
    if (nValue < nMinRange)
        nValue = nMinRange;
    if (nValue > nMaxRange)
        nValue = nMaxRange;

    nValue = (nValue - nMinRange) / (nMaxRange - nMinRange);

    var rLow = parseInt(sHexColorLow.substring(1, 3), 16);
    var gLow = parseInt(sHexColorLow.substring(3, 5), 16);
    var bLow = parseInt(sHexColorLow.substring(5, 7), 16);
    var rMed = parseInt(sHexColorMed.substring(1, 3), 16);
    var gMed = parseInt(sHexColorMed.substring(3, 5), 16);
    var bMed = parseInt(sHexColorMed.substring(5, 7), 16);
    var rHi = parseInt(sHexColorHi.substring(1, 3), 16);
    var gHi = parseInt(sHexColorHi.substring(3, 5), 16);
    var bHi = parseInt(sHexColorHi.substring(5, 7), 16);

    var factorlow = Math.sin((nValue + 0.5) * Math.PI);
    var factorMed = Math.sin(nValue * Math.PI);
    var factorHi = Math.sin((nValue - 0.5) * Math.PI);

    if (factorlow < 0) factorlow = 0;
    if (factorMed < 0) factorMed = 0;
    if (factorHi < 0) factorHi = 0;

    var r = (rLow * factorlow) + (rMed * factorMed) + (rHi * factorHi);
    var g = (gLow * factorlow) + (gMed * factorMed) + (gHi * factorHi);
    var b = (bLow * factorlow) + (bMed * factorMed) + (bHi * factorHi);

    if (r > 255)
        r = 255;
    if (g > 255)
        g = 255;
    if (b > 255)
        b = 255;
    var normalizeArgument = function(arg) {
        var result = Math.floor(arg).toString(16);
        if (result === "0")
            return "00";
        return result;
    };
    
    return "#" + normalizeArgument(r) + normalizeArgument(g) + normalizeArgument(b);
};
Color.R = function (color) { return getColorComponent(color, 16); };
Color.G = function (color) { return getColorComponent(color, 8); };
Color.B = function (color) { return getColorComponent(color, 0); };

Array.prototype.flattern = function(fnChildren) {
    var childrenFlat = [];
    for (var index = 0; index < this.length; index++) {
        var currentCell = this[index];
        var children = fnChildren(currentCell);
        if (children && children.length) {
            var flattered = children.flattern(fnChildren);
            childrenFlat = childrenFlat.concat(flattered);
        } else {
            childrenFlat.push(currentCell);
        }
    }

    return childrenFlat;
};

(function (Highcharts) {
   
    'use strict';

    var NORMAL_STATE = '',
        HOVER_STATE = 'hover',
        SELECT_STATE = 'select';
    
    // create shortcuts
    var defaultOptions = Highcharts.getOptions(),
        defaultPlotOptions = defaultOptions.plotOptions,
        seriesTypes = Highcharts.seriesTypes,
        merge = Highcharts.merge,
        noop = function () { },
        each = Highcharts.each;

    // set default options
    defaultPlotOptions.treemap = merge(defaultPlotOptions.pie, {
        center: ['50%', '50%'],
        width: '100%',
        height: '100%',

        dataLabels: {
            connectorWidth: 1,
            connectorColor: '#606060',
            align: 'left',
            verticalAlign: 'top'
        },
        size: true, // to avoid adapting to data label size in Pie.drawDataLabels
        states: {
            select: {
                color: '#C0C0C0',
                borderColor: '#000000',
                shadow: false
            }
        },
        tooltip: {
            headerFormat: '<span style="font-size: 10px">{point.key:.2f}</span><br/>',
            pointFormat: '<span style="color:{series.color}"></span>{series.name}: <b>{point.y:.2f}</b><br/>'
        }
        
    });


    seriesTypes.treemap = Highcharts.extendClass(seriesTypes.pie, {
        type: 'treemap',
        pointClass: Highcharts.Point,
        animate: noop,
        trackerGroups: ['group', 'dataLabelsGroup', 'cellsGroup'],
        gradientColors: ['#339900', '#FF0000'],
        // -----
        treeMapRectSize: function() {
            //if border is rounded
            var plotBox = this.chart.plotBox;
            return { X: plotBox.x, Y: plotBox.y, Width: plotBox.width, Height: plotBox.height };
        },
        isInsidePlot: function() {
            return true;
        },
        // -----
        calculateCells: function (cells, parentCell, parentRect) {
            var rect;
            if (parentCell == null)
                rect = parentRect || this.treeMapRectSize();
            else {
                var name = parentCell.isGroup ?  (parentCell.name || "|") : parentCell.name;
                var dimensions = LogiXML.layout.getTextDimensions(name, parentCell.style);
                var padding = 5;
                rect = { X: parentCell.Rect.X + padding, Y: parentCell.Rect.Y + dimensions.height + padding, Width: parentCell.Rect.Width - padding * 2, Height: parentCell.Rect.Height - dimensions.height - padding * 2 };
                if (!rect.Width || rect.Width < 0)
                    rect.Width = 0;
                
                if (!rect.Height || rect.Height < 0)
                    rect.Height = 0;
            }
            if (!cells || !cells.length) {
                return;
            }
            var sortFunction = function(a, b) {
                    return b.y - a.y;
                };

            cells = cells.sort(sortFunction);
            this.calculateCellSizes(rect, cells);
            
            for (var i = 0; i < cells.length; i++) {
                var cell = cells[i];
                cell.parent = parentCell;
                if (cell.children && cell.children.length) {
                    cell.children = cell.children.sort(sortFunction);
                    this.calculateCells(cell.children, cell);
                }
                    
            }
            
            var options = this.userOptions;
            
            this.evaluateCellsColors(cells, options.lowValueColor, options.mediumValueColor, options.highValueColor);
        },
        // -----

        getAspect: function(cells, iStart, iEnd, dWidth, dHeight, isVertical) {
            var dTotal = 0,
                dLocalWidth = 0,
                dLocalHeight = 0;

            for (var i = iStart; i <= iEnd; i++) {
                dTotal += cells[i].ScaledSizeValue;
            }

            if (isVertical) {
                dLocalWidth = dTotal / dHeight * 100;
                dLocalHeight = dHeight;
            } else {
                dLocalWidth = dWidth;
                dLocalHeight = dTotal / dWidth * 100;
            }

            for (i = iStart; i <= iEnd; i++) {
                cells[i].WidthTemp = dLocalWidth;
                cells[i].HeightTemp = dLocalHeight;
                var ratio = cells[i].ScaledSizeValue / dTotal;
                if (isVertical) {
                    cells[i].HeightTemp *= ratio;
                } else {
                    cells[i].WidthTemp *= ratio;
                }
            }
            var lastCell = cells[iEnd];
            return Math.max(lastCell.HeightTemp / lastCell.WidthTemp, lastCell.WidthTemp / lastCell.HeightTemp);
        },
        // -----
        calculateCellSizes: function(rect, cells) {
            if (cells.length === 0)
                return;

            if (rect.Width <= 0 || rect.Height <= 0) {
                for (var index = 0; index < cells.length; index++) {
                    cells[index].Rect = rect;
                }
            }
            var rectWidth = rect.Width;
            var rectHeight = rect.Height;

            var offsetX = 0;
            var offsetY = 0;

            //to fix negative numbers sizing
            var minCellSize = cells[0].y;

            for (var i = 1; i < cells.length; i++) {
                minCellSize = Math.min(cells[i].y, minCellSize);
            }
            var subValue = 0;
            if (minCellSize < 0)
                //19374,19376 - Add double the min value, instead of simply adding a fixed value of 1 or 10. doesn't work when the min value is a large -ve number.
                subValue = Math.abs(minCellSize) * 2;
            else if (minCellSize === 0) {
                //' For zero values, add the small +ve value of 1 or 10 based on condition.19587
                //15747
                var addValue = 1;
                subValue = Math.abs(minCellSize) + addValue;
            }

            //calculate total data amount (sum of Size column)
            var totalData = 0;
            for (i = 0; i < cells.length; i++) {
                var value = cells[i].y;
                totalData += (value + subValue);
            }
            // get 1 percent of the rectangle square
            var scaleValue = ((rect.Width * rect.Height) / totalData) / 100;
            //set scaled size for each rectangle
            for (i = 0; i < cells.length; i++) {
                value = cells[i].y;
                cells[i].ScaledSizeValue = (value + subValue) * scaleValue;
            }
            var start = 0;
            var end = 0;
            var isVertical = rectWidth > rectHeight;
            var aspectCurr = 99999;
            var aspectLast = 0;

            while (end != cells.length) {
                aspectLast = this.getAspect(cells, start, end, rectWidth, rectHeight, isVertical);

                if (((aspectLast > aspectCurr) || (aspectLast < 1)) && cells.length > 1) {
                    var currX = 0;
                    var currY = 0;

                    for (var i = start; i <= end; i++) {
                        var cellRect = cells[i].Rect || {};
                        
                        cellRect.X = rect.X + offsetX + currX;
                        cellRect.Y = rect.Y + offsetY + currY;

                        if (isVertical)
                            currY += cellRect.Height;
                        else
                            currX += cellRect.Width;

                        cells[i].Rect = cellRect;
                    }

                    if (isVertical)
                        offsetX += cells[start].Rect.Width;
                    else
                        offsetY += cells[start].Rect.Height;

                    
                    rectWidth = rect.Width - offsetX;
                    rectHeight = rect.Height - offsetY;
                    isVertical = rectWidth > rectHeight;

                    start = end;
                    aspectCurr = 99999;
                    continue;
                } else {
                    for (i = start; i <= end; i++) {
                        if (!cells[i].Rect)
                            cells[i].Rect = {};
                        cells[i].Rect.Width = cells[i].WidthTemp || 0;
                        cells[i].Rect.Height = cells[i].HeightTemp || 0 ;
                    }
                    aspectCurr = aspectLast;
                }
                end += 1;
            }
            
            var currX1 = 0;
            var currY1 = 0;

            for (i = start; i < end; i++) {
                cells[i].Rect.X = rect.X + offsetX + currX1;
                cells[i].Rect.Y = rect.Y + offsetY + currY1;
                if (isVertical)
                    currY1 += cells[i].Rect.Height;
                else
                    currX1 += cells[i].Rect.Width;
                
            }
        },
        getCenter: Highcharts.CenteredSeriesMixin.getCenter,
        drawDataLabels: function() {
            var series = this,
                seriesOptions = series.options,
                cursor = seriesOptions.cursor,
                options = seriesOptions.dataLabels,
                points = series.points,
                pointOptions,
                generalOptions,
                str,
                dataLabelsGroup;

            if (options.enabled || series._hasPointLabels) {

                // Process default alignment of data labels for columns
                if (series.dlProcessOptions) {
                    series.dlProcessOptions(options);
                }

                // Create a separate group for the data labels to avoid rotation
                dataLabelsGroup = series.plotGroup(
                    'dataLabelsGroup',
                    'data-labels',
                    series.visible ? Highcharts.VISIBLE : Highcharts.HIDDEN,
                    options.zIndex || 6
                );
                var drawChildLabels = function (point) {
                    series.drawLabel(point.name, point, dataLabelsGroup);
                    if (point.children)
                        each(point.children, function (child) {
                            drawChildLabels(child);
                        });
                };
                each(points, function (point) {
                    drawChildLabels(point);
                });
            }
        },
        /**
         * Overrides the pie translate method
         */
        translate: function(positions) {

            var // Get positions - either an integer or a percentage string must be given
                sum = 0,
                series = this,
                visible = true,
                chart = series.chart,
                options = series.options,
                data = series.data,
                half = options.dataLabels.position === 'left' ? 1 : 0;
           
            series.center = series.options.center;
            chart.isInsidePlot = series.isInsidePlot;
            if (!positions) {
			    series.center = positions = series.getCenter();
		    }
            // get the total sum
            var mappingFunction = function (point, nestingLevel) {
                // we should inherit point from Highcharts Point
                var nesting = nestingLevel;
                var parentPrototype = series.pointClass.prototype;
                point.onMouseOver = parentPrototype.onMouseOver;
                point.firePointEvent = parentPrototype.firePointEvent;
                point.getLabelConfig = parentPrototype.getLabelConfig;
                point.setState = parentPrototype.setState;
                point.onMouseOut = parentPrototype.onMouseOut;
                
                point.series = series;
                point.half = half;
                point.color = parseFloat(point.color) || 10;
                point.isGroup = point.children && point.children.length;

                point.getContrastTextColor = function (backgroundColor, darkColor, lightColor) {
                    var brightness = Color.R(backgroundColor) * 0.244627436 + Color.G(backgroundColor) * 0.672045616 + Color.R(backgroundColor) * 0.083326949;
                    return brightness < 255 * 0.5 ? darkColor : lightColor;
                };

                point.y = parseFloat(point.y) || 0;
                point.getStyle = function () {
                    if (this.isGroup) {
                        return options.dataGrouping.groupStyles[nesting];
                    }
                    return options.dataLabels.style;
                };
                point.style = point.getStyle();
                if (point.style.style) {
                    point.style.color = point.style.style.color;
                    point.style.fontSize = point.style.style.fontSize || options.dataLabels.style.fontSize;
                    point.style.fontWeight = point.style.style.fontWeight;
                    point.style.fontFamily = point.style.style.fontFamily;
                }

                point.style.cellBorderColor = point.isGroup ? point.style.cellBorderColor : options.cellBorderColor;
                point.style.cellBorderThickness = point.isGroup ? point.style.cellBorderThickness : options.cellBorderThickness;
                point.getColor = function () {
                    return this.isGroup ? this.style.backgroundColor : point.Color;
                };
                point.Color = point.getColor();
                point.darkBackgroundFontColor = options.darkBackgroundFontColor || 'White';
                point.lightBackgroundFontColor = options.lightBackgroundFontColor || 'Black';

                point.label = {};
                point.label.color = function (pt) {
                    if (pt.isGroup) {
                        return point.style.color;
                    }
                    return pt.getContrastTextColor(pt.getColor(), pt.darkBackgroundFontColor, pt.lightBackgroundFontColor);
                };

                var align = "left";
                if (point.style.align) {
                    align = point.style.align.toLowerCase();
                }
                point.label.align = point.isGroup ? align : options.dataLabels.align;
                point.label.verticalAlign = point.isGroup ? "top" : options.dataLabels.verticalAlign;
                point.label.getTextAnchor = function() {
                    var cssToSvgMapping = { 'center': 'middle', 'right': 'end', 'left': 'start' };
                    return cssToSvgMapping[this.align];
                };

                if (point.isDate)
                    if (LogiXML.isNumeric(point.name))
                        point.value = new Date(parseInt(point.name));
                    else {
                        point.value = new Date(point.name);
                    }
                else {
                    var isFloat = !/^\s*$/.test(point.name) && !isNaN(point.name);
                        
                    point.value = isFloat ? parseFloat(point.name) : point.name;    
                }
                
                point.name = LogiXML.Formatter.format(point.value, point.style.format);

                if (point.isGroup && point.style.events) {
                    point.events = point.style.events;
                    if (point.style.events.click && point.style.events.click.indexOf("SubmitForm")>-1) {
                        point.style.cursor = "pointer";
                    }
                } else {
                    point.events = options._events;
                }
                    
                for (var index = 0; point.children && index < point.children.length; index++) {
                    var child = point.children[index];
                    mappingFunction(child, nesting + 1);
                }
            };
            for (var i = 0; i < data.length; i++) {
                var item = data[i];
                mappingFunction(item, 0);
            }

            chart.cellsGroup = series.cellsGroup = chart.renderer.g().attr({ "class": "highcharts-series highcharts-tracker" }).add(chart.seriesGroup);
            
            this.calculateCells(data);
        },

        alignDataLabel: function (point) {
            var labelText = point.name,
                plotBox = this.chart.plotBox,
                context = { point: point },
                bbox = point.Rect;
            var oneLiner = LogiXML.layout.getTextDimensions("|", point.style);
            var pruneLabel = function (text, boundaries) {
                if (text === "")
                    return "";
                
                var dimensions = LogiXML.layout.getTextDimensions(text, point.style);
                if (dimensions.height > boundaries.Height) {
                    return "";
                }

                if (dimensions.width < boundaries.Width) {
                    return text.toString();
                }
                var index = 0,
                    substring = "",
                    ellipsis = "...";
                
                var split = text.split("<br/>");
                var lastSubstring = split[split.length - 1];
                while (LogiXML.layout.getTextDimensions(substring, point.style).width < boundaries.Width) {
                    substring = lastSubstring.substring(0, index++);
                }
                
                var lblText = lastSubstring.substring(0, index - 2).trim();
            
                var textLeftover = lastSubstring.substring(lblText.length).trim();
                split.pop();
                split.push(lblText);
                split.push(textLeftover);
                var concatenation = split.join("<br/>");
                var pruned = pruneLabel(concatenation, boundaries);
                if (pruned === "") {
                    split.pop();
                    if (split.length === 1 && split[0].length > 4)
                        return split[0].substring(0, split[0].length - 3) + ellipsis;
                    
                    return split.join("<br/>");
                }
                return pruned;
            };

            var extraPadding = 2;
            var padding = point.style.cellBorderThickness / 2 + extraPadding;
            var heightIfChildren = bbox.Height;
            if (point.children && point.children.length) {
                heightIfChildren = Math.min(point.children[0].Rect.Y - point.Rect.Y, heightIfChildren);
            }

            if (labelText != undefined && labelText.toString().length)
                labelText = pruneLabel(labelText.toString(), { Width: bbox.Width - padding, Height: heightIfChildren });
            else
                labelText = "";
            
            var linesNumber = labelText.split("<br/>").length || 1;
            var textDimensions = LogiXML.layout.getTextDimensions(labelText, point.style);
           
            var yOffset = bbox.Y  - plotBox.y;
            switch (point.label.verticalAlign) {
            case "bottom":
                yOffset += bbox.Height;
                break;
                case "middle":
                yOffset += (bbox.Height + textDimensions.height) / 2;
                break;
            default:
                yOffset += textDimensions.height;
                break;
            }

            yOffset -= padding + (linesNumber - 1) * oneLiner.height;

            var xOffset = bbox.X - plotBox.x;
            if (textDimensions.width + 6 <= bbox.Width)
                xOffset += extraPadding;
            
            switch (point.label.align) {
                case "right":
                    xOffset += bbox.Width -  padding;
                    break;
                case "center":
                    xOffset += (bbox.Width) / 2;
                    break;
                default:
                    xOffset += padding;
            }
            return { x: xOffset, y: yOffset, text: labelText };
        },
        /**
         * Draw a single point (wedge)
         * @param {Object} point The point object
         * @param {Object} color The color of the point
         * @param {Number} brightness The brightness relative to the color
         */
       
        drawLabel: function (labelText, point) {
            var style = point.style,
                series = this,
                chart = this.chart,
                renderer = chart.renderer;
            var css = {
                color: point.label.color(point),
                fontSize: style.fontSize,
                "font-weight": style.fontWeight,
                "font-family": style.fontFamily
            };
            var position = series.alignDataLabel(point);
            if (point.dataLabel) {
                var element = point.dataLabel.element;
                series.dataLabelsGroup.safeRemoveChild(element);
                point.dataLabel = null;
            } 
            
            var dataLabel = point.dataLabel = renderer.text(position.text, position.x, position.y)
                .attr({ 'text-anchor': point.label.getTextAnchor() })
                .css(css)
                .add(series.dataLabelsGroup);

            point.dataLabel.element.point = point;
            return dataLabel;
        },
        
        drawPoints: function () {

            var series = this,
                options = series.options,
                chart = series.chart,
                renderer = chart.renderer;

            var drawPoint = function(point) {
                var pointStyle = point.style,
                 pointAttr = {
                    fill: point.getColor(),
                    stroke: pointStyle.cellBorderColor,
                    'stroke-width': pointStyle.cellBorderThickness,
                    cursor: point.style.cursor
                };

                if (!point.pointAttr)
                    point.pointAttr = {};
                
                point.pointAttr[NORMAL_STATE] = pointAttr;
                var color = Highcharts.Color(point.getColor())
								.brighten(options.states.hover.brightness)
								.get();
                
                point.pointAttr[HOVER_STATE] = merge(pointAttr, { fill: color });

                var height = Math.round(point.Rect.Y + point.Rect.Height) - Math.round(point.Rect.Y),
                width = Math.round(point.Rect.X + point.Rect.Width) - Math.round(point.Rect.X),
                x = Math.round(point.Rect.X),
                y = Math.round(point.Rect.Y);

                if (point.graphic) {
                    var el = point.graphic.element;
                    if (document.documentMode <= 8) {
                        el.parentElement.removeChild(el);
                        delete point.graphic;
                    } else {
                        el.setAttribute('width', width);
                        el.setAttribute('height', height);
                        el.setAttribute('x', x);
                        el.setAttribute('y', y);
                        point.graphic.show();
                    }
                    
                } else {
                    point.rect = point.graphic = renderer.rect(x, y, width, height, 0).
                        attr(pointAttr).add(chart.cellsGroup);
                }

                if (point.events)
                    point.graphic.element.onclick = new Function('e', point.events.click);
                
                
                point.rect.element.point = point;
                if(point.children)
                    each(point.children, drawPoint);
            };
            each(series.data, drawPoint);
        },

        sortByAngle: noop,
        // -------
        drawTracker: Highcharts.TrackerMixin.drawTrackerPoint,
        evaluateCellsColors: function (cells, spectrPosLeft, spectrPosCenter, spectrPosRight) {
            var series = this,
                options = series.options;

            var highValueColor = options.highValueColor || series.gradientColors[0];
            var lowValueColor = options.lowValueColor || series.gradientColors[1];
            var mediumValueColor = options.mediumValueColor || Color.getPercentOfSpreadColor3(0.25, 0, 1, lowValueColor, highValueColor, highValueColor);
            var getColorByPositionOnSpectrum = function(colorLeft, colorRight, position) {
                var red = Color.R(colorLeft) + (Color.R(colorRight) - Color.R(colorLeft)) * position;
                var green = Color.G(colorLeft) + (Color.G(colorRight) - Color.G(colorLeft)) * position;
                var blue = Color.B(colorLeft) + (Color.B(colorRight) - Color.B(colorLeft)) * position;
                return 'rgb(' + Math.floor(red) + ',' + Math.floor(green) + ',' + Math.floor(blue) + ')';
            };

            if (isNaN(spectrPosLeft))
                spectrPosLeft = 0;
            if (isNaN(spectrPosCenter))
                spectrPosCenter = 0.5;
            if (isNaN(spectrPosRight))
                spectrPosRight = 1;

            if (cells.length == 0)
                return;
            var childCells = cells.flattern(function(cell) { return cell.children; });
            var sizes = [];
            for (var index = 0; index < childCells.length; index++) {
                var cell = childCells[index];
                sizes.push(cell.colorValue);
            }
          
            var cellColorMinValue = Math.min.apply(null, sizes);
            var cellColorMaxValue = Math.max.apply(null, sizes);

            var cellColorSizingValue = cellColorMinValue < 0 ? cellColorMinValue * (-1) + 1 : 0;
            var cellColorSumValue = 0,
                cellColorCount = 0;
            
            if (cellColorSizingValue > 0) {
                cellColorSumValue += cellColorCount * cellColorSizingValue;
                cellColorMinValue += cellColorSizingValue;
                cellColorMaxValue += cellColorSizingValue;
            }

            //to fix negative numbers sizing

            var minMaxRange = cellColorMaxValue - cellColorMinValue;
            for (var i = 0; i < childCells.length; i++) {
                var hmCell = childCells[i];
                hmCell.ColorValue = hmCell.colorValue;
                if (hmCell.IsGroup) {
                    continue;
                }
                if (minMaxRange === 0) {
                    hmCell.Color = lowValueColor;
                } else {
                    var scaledColorValue = ((hmCell.ColorValue + cellColorSizingValue) - cellColorMinValue) / minMaxRange;
                    if (scaledColorValue >= 0.0 && scaledColorValue <= spectrPosLeft) {
                        hmCell.Color = lowValueColor;
                    } else if (scaledColorValue > spectrPosLeft && scaledColorValue <= spectrPosCenter) {
                        tmpVal = (((hmCell.ColorValue + cellColorSizingValue) - cellColorMinValue) - minMaxRange * spectrPosLeft) / (minMaxRange * spectrPosCenter - minMaxRange * spectrPosLeft);
                        hmCell.Color = getColorByPositionOnSpectrum(lowValueColor, mediumValueColor, tmpVal);
                    } else if (scaledColorValue > spectrPosCenter && scaledColorValue < spectrPosRight) {
                        var tmpVal = ((hmCell.ColorValue + cellColorSizingValue) - cellColorMinValue - minMaxRange * (spectrPosCenter - spectrPosLeft)) /
                            (minMaxRange * (spectrPosRight + spectrPosLeft) - minMaxRange * (spectrPosCenter + spectrPosLeft));
                        hmCell.Color = getColorByPositionOnSpectrum(mediumValueColor, highValueColor, tmpVal);
                    } else if (scaledColorValue >= spectrPosRight && scaledColorValue <= 1.0) {
                        hmCell.Color = highValueColor;
                    } else
                        throw "Color scaled value out of range";
                }
                hmCell.fill = hmCell.Color;
            }
        }
    });


}(Highcharts));
//------------ rdChartCanvas\modules\rdTrendlineSeries.js ---------------/
(function (Highcharts) {

    'use strict';

    // create shortcuts
    var defaultOptions = Highcharts.getOptions(),
        defaultPlotOptions = defaultOptions.plotOptions,
        seriesTypes = Highcharts.seriesTypes,
        merge = Highcharts.merge,
        noop = function () { },
        each = Highcharts.each;

    // set default options
    defaultPlotOptions.trendline = merge(defaultPlotOptions.spline, {
    });


    seriesTypes.trendline = Highcharts.extendClass(seriesTypes.spline, {
        type: 'trendline',


        init: function (chart, options) {
            var parentId = options.parentId,
                lineAlgorithm = options.lineAlgorithm,
                parentOptions, i = 0, length = chart.series.length,
                data, regressionData;
            for (; i < length; i++) {
                if (chart.series[i].options.id == parentId) {
                    parentOptions = chart.series[i].options;
                    break;
                }
            }
            
            data = this.extractXYDataFromSeries(parentOptions);
            if (data && data.data && data.data.length >= 2) {
                lineAlgorithm = lineAlgorithm.toLowerCase().replace('regression', '');
                regressionData = this.methods[lineAlgorithm](data.data);
                options.data = regressionData;
            } 

            Highcharts.Series.prototype.init.apply(this, arguments);
        },

        methods: {

            lowess: function (data) {
                return this.loess_pairs(data, 0.25);
            },

            linear: function (data) {
                return regression('linear', data).points;
            },
            logarithmic: function (data) {
                return regression('logarithmic', data).points;
            },
            power: function (data) {
                return regression('power', data).points;
            },
            polynomial2: function (data) {
                return regression('polynomial', data, 2).points;
            },
            polynomial3: function (data) {
                return regression('polynomial', data, 3).points;
            },
            polynomial4: function (data) {
                return regression('polynomial', data, 4).points;
            },

            loess_pairs: function (pairs, bandwidth) {
                if (pairs && pairs.length < 4) {
                    return pairs;
                }
                var xval = pairs.map(function (pair) { return pair[0] });
                var yval = pairs.map(function (pair) { return pair[1] });
                var res = this.loess(xval, yval, bandwidth);
                return xval.map(function (x, i) { return [x, res[i]] });
            },

            loess: function (xval, yval, bandwidth) {
                function tricube(x) {
                    var tmp = 1 - x * x * x;
                    return tmp * tmp * tmp;
                }

                var res = [];

                var left = 0;
                var right = Math.floor(bandwidth * xval.length) - 1;

                for (var i in xval) {
                    var x = xval[i];

                    if (i > 0) {
                        if (right < xval.length - 1 &&
                        xval[right + 1] - xval[i] < xval[i] - xval[left]) {
                            left++;
                            right++;
                        }
                    }

                    var edge;
                    if (xval[i] - xval[left] > xval[right] - xval[i])
                        edge = left;
                    else
                        edge = right;
                    var d = (xval[edge] - x);
                    var denom = d == 0 || isNaN(d) ? 0 : Math.abs(1.0 / d);

                    var sumWeights = 0;
                    var sumX = 0, sumXSquared = 0, sumY = 0, sumXY = 0;

                    var k = left;
                    while (k <= right) {
                        var xk = xval[k];
                        var yk = yval[k];
                        var dist;
                        if (k < i) {
                            dist = (x - xk);
                        } else {
                            dist = (xk - x);
                        }
                        var w = tricube(dist * denom);
                        var xkw = xk * w;
                        sumWeights += w;
                        sumX += xkw;
                        sumXSquared += xk * xkw;
                        sumY += yk * w;
                        sumXY += yk * xkw;
                        k++;
                    }

                    var meanX = sumX / sumWeights;
                    var meanY = sumY / sumWeights;
                    var meanXY = sumXY / sumWeights;
                    var meanXSquared = sumXSquared / sumWeights;

                    var beta;
                    if (meanXSquared == meanX * meanX)
                        beta = 0;
                    else
                        beta = (meanXY - meanX * meanY) / (meanXSquared - meanX * meanX);

                    var alpha = meanY - beta * meanX;

                    res[i] = beta * x + alpha;
                }

                return res;
            }
        },

        extractXYDataFromSeries: function (seriesOptions) {
            var data = seriesOptions.data,
                dataInfo = seriesOptions.dataInfo,
                ret = { data: [], xType: 'Text', yType: 'Number' },
                i = 0, length,
                xType, yType, xIndex, yIndex, useXData = false;

            length = dataInfo.columnMap.length;
            for (; i < length; i++) {
                switch (dataInfo.columnMap[i].name) {
                    case "x":
                        xType = dataInfo.columnMap[i].dataType;
                        xIndex = i;
                        break;
                    case "y":
                        yType = dataInfo.columnMap[i].dataType;
                        yIndex = i;
                        break;
                }
            }

            if (xType && xType != 'Text') {
                useXData = true;
            } 
            ret.xType = xType;
            ret.yType = yType;

            i = 0; length = data.length;
            for (; i < length; i++) {
                switch (dataInfo.serilizationType) {
                    case "array":
                        ret.data.push([i, data[i]]);
                        //ret.y.push(data[i]);
                        //ret.x.push(i);
                        break;
                    case "arrays":
                        ret.data.push([useXData ? data[i][xIndex] : i, data[i][yIndex]]);
                        //ret.y.push(data[i][yIndex]);
                        //ret.x.push(useXData ? data[i][xIndex] : i);
                        break;
                    case "objects":
                        ret.data.push([useXData ? data[i].x : i, data[i].y]);
                        //ret.y.push(data[i].y);
                        //ret.x.push(useXData ? data[i].x : i);
                        break;
                }
            }
            return ret;
        }


    });


}(Highcharts));


/**
* @license
*
* Regression.JS - Regression functions for javascript
* http://tom-alexander.github.com/regression-js/
*
* copyright(c) 2013 Tom Alexander
* Licensed under the MIT license.
*
**/

; (function () {
    'use strict';

    var gaussianElimination = function (a, o) {
        var i = 0, j = 0, k = 0, maxrow = 0, tmp = 0, n = a.length - 1, x = new Array(o);
        for (i = 0; i < n; i++) {
            maxrow = i;
            for (j = i + 1; j < n; j++) {
                if (Math.abs(a[i][j]) > Math.abs(a[i][maxrow]))
                    maxrow = j;
            }
            for (k = i; k < n + 1; k++) {
                tmp = a[k][i];
                a[k][i] = a[k][maxrow];
                a[k][maxrow] = tmp;
            }
            for (j = i + 1; j < n; j++) {
                for (k = n; k >= i; k--) {
                    a[k][j] -= a[k][i] * a[i][j] / a[i][i];
                }
            }
        }
        for (j = n - 1; j >= 0; j--) {
            tmp = 0;
            for (k = j + 1; k < n; k++)
                tmp += a[k][j] * x[k];
            x[j] = (a[n][j] - tmp) / a[j][j];
        }
        return (x);
    };

    var methods = {
        linear: function (data) {
            var sum = [0, 0, 0, 0, 0], n = 0, results = [];

            for (; n < data.length; n++) {
                sum[0] += data[n][0];
                sum[1] += data[n][1];
                sum[2] += data[n][0] * data[n][0];
                sum[3] += data[n][0] * data[n][1];
                sum[4] += data[n][1] * data[n][1];
            }

            var gradient = (n * sum[3] - sum[0] * sum[1]) / (n * sum[2] - sum[0] * sum[0]);
            var intercept = (sum[1] / n) - (gradient * sum[0]) / n;
            // var correlation = (n * sum[3] - sum[0] * sum[1]) / Math.sqrt((n * sum[2] - sum[0] * sum[0]) * (n * sum[4] - sum[1] * sum[1]));

            for (var i = 0, len = data.length; i < len; i++) {
                var coordinate = [data[i][0], data[i][0] * gradient + intercept];
                results.push(coordinate);
            }

            var string = 'y = ' + Math.round(gradient * 100) / 100 + 'x + ' + Math.round(intercept * 100) / 100;

            return { equation: [gradient, intercept], points: results, string: string };
        },

        exponential: function (data) {
            var sum = [0, 0, 0, 0, 0, 0], n = 0, results = [];

            for (len = data.length; n < len; n++) {
                sum[0] += data[n][0];
                sum[1] += data[n][1];
                sum[2] += data[n][0] * data[n][0] * data[n][1];
                sum[3] += data[n][1] * Math.log(data[n][1]);
                sum[4] += data[n][0] * data[n][1] * Math.log(data[n][1]);
                sum[5] += data[n][0] * data[n][1];
            }

            var denominator = (sum[1] * sum[2] - sum[5] * sum[5]);
            var A = Math.pow(Math.E, (sum[2] * sum[3] - sum[5] * sum[4]) / denominator);
            var B = (sum[1] * sum[4] - sum[5] * sum[3]) / denominator;

            for (var i = 0, len = data.length; i < len; i++) {
                var coordinate = [data[i][0], A * Math.pow(Math.E, B * data[i][0])];
                results.push(coordinate);
            }

            var string = 'y = ' + Math.round(A * 100) / 100 + 'e^(' + Math.round(B * 100) / 100 + 'x)';

            return { equation: [A, B], points: results, string: string };
        },

        logarithmic: function (data) {
            var sum = [0, 0, 0, 0], n = 0, results = [];

            for (len = data.length; n < len; n++) {
                sum[0] += Math.log(data[n][0]);
                sum[1] += data[n][1] * Math.log(data[n][0]);
                sum[2] += data[n][1];
                sum[3] += Math.pow(Math.log(data[n][0]), 2);
            }

            var B = (n * sum[1] - sum[2] * sum[0]) / (n * sum[3] - sum[0] * sum[0]);
            var A = (sum[2] - B * sum[0]) / n;

            for (var i = 0, len = data.length; i < len; i++) {
                var coordinate = [data[i][0], A + B * Math.log(data[i][0])];
                results.push(coordinate);
            }

            var string = 'y = ' + Math.round(A * 100) / 100 + ' + ' + Math.round(B * 100) / 100 + ' ln(x)';

            return { equation: [A, B], points: results, string: string };
        },

        power: function (data) {
            var sum = [0, 0, 0, 0], n = 0, results = [];

            for (len = data.length; n < len; n++) {
                sum[0] += Math.log(data[n][0]);
                sum[1] += Math.log(data[n][1]) * Math.log(data[n][0]);
                sum[2] += Math.log(data[n][1]);
                sum[3] += Math.pow(Math.log(data[n][0]), 2);
            }

            var B = (n * sum[1] - sum[2] * sum[0]) / (n * sum[3] - sum[0] * sum[0]);
            var A = Math.pow(Math.E, (sum[2] - B * sum[0]) / n);

            for (var i = 0, len = data.length; i < len; i++) {
                var coordinate = [data[i][0], A * Math.pow(data[i][0], B)];
                results.push(coordinate);
            }

            var string = 'y = ' + Math.round(A * 100) / 100 + 'x^' + Math.round(B * 100) / 100;

            return { equation: [A, B], points: results, string: string };
        },

        polynomial: function (data, order) {
            if (typeof order == 'undefined') {
                order = 2;
            }
            var lhs = [], rhs = [], results = [], a = 0, b = 0, i = 0, k = order + 1;

            for (; i < k; i++) {
                for (var l = 0, len = data.length; l < len; l++) {
                    a += Math.pow(data[l][0], i) * data[l][1];
                }
                lhs.push(a), a = 0;
                var c = [];
                for (var j = 0; j < k; j++) {
                    for (var l = 0, len = data.length; l < len; l++) {
                        b += Math.pow(data[l][0], i + j);
                    }
                    c.push(b), b = 0;
                }
                rhs.push(c);
            }
            rhs.push(lhs);

            var equation = gaussianElimination(rhs, k);

            for (var i = 0, len = data.length; i < len; i++) {
                var answer = 0;
                for (var w = 0; w < equation.length; w++) {
                    answer += equation[w] * Math.pow(data[i][0], w);
                }
                results.push([data[i][0], answer]);
            }

            var string = 'y = ';

            for (var i = equation.length - 1; i >= 0; i--) {
                if (i > 1) string += Math.round(equation[i] * 100) / 100 + 'x^' + i + ' + ';
                else if (i == 1) string += Math.round(equation[i] * 100) / 100 + 'x' + ' + ';
                else string += Math.round(equation[i] * 100) / 100;
            }

            return { equation: equation, points: results, string: string };
        }
    };

    var regression = (function (method, data, order) {

        if (typeof method == 'string') {
            return methods[method](data, order);
        }
    });

    if (typeof exports !== 'undefined') {
        module.exports = regression;
    } else {
        window.regression = regression;
    }

}());
//------------ rdChartCanvas\rdNoDataForHighcharts.js ---------------/
/**
 * @license Highcharts JS v3.0.7 (2013-10-24)
 * Plugin for displaying a message when there is no data visible in chart.
 *
 * (c) 2010-2013 Highsoft AS
 * Author: Øystein Moseng
 *
 * License: www.highcharts.com/license
 */

(function (H) { // docs

    var seriesTypes = H.seriesTypes,
		chartPrototype = H.Chart.prototype,
		defaultOptions = H.getOptions(),
		extend = H.extend;

    // Add language option
    extend(defaultOptions.lang, {
        noData: 'No data to display'
    });

    // Add default display options for message
    defaultOptions.noData = {
        position: {
            x: 0,
            y: 0,
            align: 'center',
            verticalAlign: 'middle'
        },
        attr: {
        },
        style: {
            fontWeight: 'bold',
            fontSize: '12px',
            color: '#60606a'
        },
        text: null
    };

    /**
	 * Define hasData functions for series. These return true if there are data points on this series within the plot area
	 */
    function hasDataPie() {
        return !!this.points.length && this.points.some(function (pt) {
            return pt.y;
        });
    }

    if (seriesTypes.treemap) {
        seriesTypes.treemap.prototype.hasData = function() {
            return this.data && this.data.length;
        };
    }
    
    seriesTypes.pie.prototype.hasData = hasDataPie;

    if (seriesTypes.gauge) {
        seriesTypes.gauge.prototype.hasData = hasDataPie;
    }

    if (seriesTypes.waterfall) {
        seriesTypes.waterfall.prototype.hasData = hasDataPie;
    }

    H.Series.prototype.hasData = function () {
        return this.dataMax !== undefined && this.dataMin !== undefined;
    };

    /**
	 * Display a no-data message.
	 *
	 * @param {String} str An optional message to show in place of the default one 
	 */
    chartPrototype.showNoData = function (str) {
        var chart = this,
			options = chart.options,
			text = str || options.text || options.lang.noData,
			noDataOptions = options.noData;

        if (!chart.noDataLabel) {
            chart.noDataLabel = chart.renderer.label(text, 0, 0, null, null, null, null, null, 'no-data')
				.attr(noDataOptions.attr)
				.css(noDataOptions.style)
				.add();
            chart.noDataLabel.align(extend(chart.noDataLabel.getBBox(), noDataOptions.position), false, 'plotBox');
            
        }
    };

    /**
	 * Hide no-data message	
	 */
    chartPrototype.hideNoData = function () {
        var chart = this;
        if (chart.noDataLabel) {
            chart.noDataLabel = chart.noDataLabel.destroy();
        }
    };

    /**
	 * Returns true if there are data points within the plot area now
	 */
    chartPrototype.hasData = function () {
        var chart = this,
			series = chart.series,
			i = series.length;

        while (i--) {
            if (series[i].hasData() && !series[i].options.isInternal) {
                return true;
            }
        }

        return false;
    };

    /**
    * Destroys points (Pie Chart data labels appear on side even though there's a no data message
    */
    chartPrototype.destroyUnboundDataLabels = function () {
        var chart = this,
            series = chart.series,
            i = series.length;
        while (i--) {
            if (!series[i].hasData()) {
                for (var j = 0; j < series[i].points.length; j++) {
                    var point = series[i].points[j];
                    if (point && point.destroy)
                        point.destroy();
                }
            }
        }
    };
    /**
	 * Show no-data message if there is no data in sight. Otherwise, hide it.
	 */
    function handleNoData() {
        var chart = this;
        if (!chart.options.noData || !chart.options.noData.enabled) {
            return;
        }
        var msg = chart.options.noData.text;
        if (chart.hasData()) {
            chart.hideNoData();
        } else {
            chart.showNoData(msg);
            chart.destroyUnboundDataLabels();
        }
    }

    /**
	 * Add event listener to handle automatic display of no-data message
	 */
    chartPrototype.callbacks.push(function (chart) {
        H.addEvent(chart, 'load', handleNoData);
        H.addEvent(chart, 'redraw', handleNoData);
    });

}(Highcharts));

//------------ rdYui\chartcanvas.js ---------------/
YUI.add('chartCanvas', function (Y) {
    "use strict";
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function (obj, start) {
            for (var i = (start || 0), j = this.length; i < j; i++) {
                if (this[i] === obj) { return i; }
            }
            return -1;
        }
    }

    var Lang = Y.Lang,
        TRIGGER = 'rdChartCanvas';

    if (LogiXML.Ajax.AjaxTarget) {
        LogiXML.Ajax.AjaxTarget().on('reinitialize', function () { Y.LogiXML.ChartCanvas.createElements(true); });
    }

    Y.LogiXML.Node.destroyClassKeys.push(TRIGGER);

    Y.namespace('LogiXML').ChartCanvas = Y.Base.create('ChartCanvas', Y.Base, [], {
        _handlers: {},

        configNode: null,
        id: null,
        chart: null,
        reportName: null,
        renderMode: null,
        jsonUrl: null,
        chartPointer: null,
        refreshAfterResize: false,
        debugUrl: null,
        isUnderSE: null,
        inputElement: null,
        changeFlagElement: null,
        mask: null,
        restoreSelectionForSeriesIndex: null,

        initializer: function(config) {
            this._parseHTMLConfig();
            this.configNode.setData(TRIGGER, this);

            var chartOptions = this.extractOptionsFromHtmlNode(this.configNode);

            this._handlers.chartError = Highcharts.addEvent(this.configNode.getDOMNode(), 'error', Y.LogiXML.ChartCanvas.handleError);
            this._handlers.setSize = this.configNode.on('setSize', this.resized, this);
            Highcharts.setOptions({
                global: {
                    useUTC: false
                }
            });
            this.initChart(chartOptions);
        },

        extractOptionsFromHtmlNode: function (chartNode) {
            var options = chartNode.getAttribute('data-options'),
                chartOptions = this.parseJson(options);
            return chartOptions;
        },

        updateChart: function (chartNode) {
            var chartOptions = this.extractOptionsFromHtmlNode(chartNode),
                actionType = chartNode.getAttribute('data-action-type');
            switch (actionType) {
                case "refresh-series":
                    {
                        this.chart.showLoading('Series updating...');
                        var i = 0, length = chartOptions.series.length,
                            j = 0, jLength = this.chart.series.length,
                            seriesId;
                        for (; i < length; i++) {
                            seriesId = chartOptions.series[i].id;
                            for (j=0; j < jLength; j++) {
                                if (this.chart.series[j].options.id == seriesId) {
                                    if (chartOptions.series[i].data.length) {                                     
                                        this.chart.series[j].setData(chartOptions.series[i].data);
                                    }
                                }
                            }
                        }
                        this.chart.hideLoading();
                    }
                    break;
                case "realtime-update-series"://RealtimeSeriesUpdate
                    {
                        
                      //  this.chart.showLoading('Series updating...');
                        var i = 0, length = chartOptions.series.length,
                            j = 0, jLength = this.chart.series.length,
                            seriesId;                        
                        for (; i < length; i++) {
                            seriesId = chartOptions.series[i].id;
                            for (j = 0; j < jLength; j++) {
                                if (this.chart.series[j].options.id == seriesId) {

                                   var timespan = chartNode.getAttribute('timeSpan')
                                   var timeArr = timespan.split(':')
                                   var dateIndent = timeArr[0] * 3600000 + timeArr[1] * 60000 + timeArr[2] * 1000//in milliseconds
                                    //  var currDateTime = new Date();//localTime
                                    var currDateTime = new Date(chartOptions.series[i].lastDataValue);
                                    var date = currDateTime - dateIndent;


                                    if (chartOptions.series[i].data.length) {                                 
                                        for (var index = 0; index < chartOptions.series[i].data.length; index++) {
                                            var dataPoint = chartOptions.series[i].data[index];
                                            this.chart.series[j].addPoint(dataPoint)//fresh data
                                        }
                                    }

                                    for (var k = 0; k < this.chart.series[j].data.length; k++) {
                                        try {
                                            if (this.chart.series[j].data[k] && this.chart.series[j].data[k].x < date) {
                                                this.chart.series[j].data[k].remove();
                                            }
                                        } catch (exception_var) {
                                            console.log('exception');
                                        }
                                    }
                                    var dataInput = document.getElementById(chartOptions.series[i].correspondingHiddenInput);                                  
                                    if (dataInput) {                                     
                                        dataInput.setAttribute("Value", date)//filter value on the server side
                                    }
                                  //  date -= currDateTime.getTimezoneOffset()*60*1000;
                                   // currDateTime = currDateTime.getTime() - currDateTime.getTimezoneOffset() * 60 * 1000;
                                    this.chart.xAxis[0].setExtremes(date, currDateTime,true);
                                    
                                    //console.log(this.chart.xAxis[0].getExtremes());
                                }
                                //this.chart.redraw();
                            }
                        }
                     //   this.chart.hideLoading();
                    }
                    break;
                default:
                    throw ('Action type is undefined');
            }

        },

        destructor: function () {
            var configNode = this.configNode;
            this._clearHandlers();
            this.chart.destroy();
            configNode.setData(TRIGGER, null);
        },

        _clearHandlers: function() {
            var self = this;
            Y.each(this._handlers, function(item) {
                if (item) {
                    item.detach();
                    item = null;
                }
            });
        },

        _parseHTMLConfig: function() {

            this.configNode = this.get('configNode');
            this.id = this.configNode.getAttribute('id');
            this.reportName = this.configNode.getAttribute('data-report-name');
            this.renderMode = this.configNode.getAttribute('data-render-mode');
            this.jsonUrl = this.configNode.getAttribute('data-json-url');
            this.chartPointer = this.configNode.getAttribute('data-chart-pointer');
            this.refreshAfterResize = this.configNode.getAttribute('data-refresh-after-resize') == "True";
            this.debugUrl = this.configNode.getAttribute('data-debug-url');
            this.isUnderSE = this.configNode.getAttribute('data-under-se');
        },

       
        initChart: function(chartOptions) {
            //what about resizer?
            if (this.id) {
                var idForResizer = this.id.replace(/_Row[0-9]+$/g, "");
                if (Y.one('#rdResizerAttrs_' + idForResizer) && rdInitHighChartsResizer) {
                    rdInitHighChartsResizer(this.configNode.getDOMNode());
                }
            }
            //post processing
            if (this.renderMode != "Skeleton") {
                this.createChart(chartOptions);
            } else {
                this.createChart(chartOptions);
                this.chart.showLoading('<img src="rdTemplate/rdWait.gif" alt="loading..."></img>');
                this.requestChartData();
            }
            
        },

        createChart: function(chartOptions, fromPostProcessing) {

            if (this.chart) {
                this.chart.destroy();
            }
            LogiXML.HighchartsFormatters.setFormatters(chartOptions, false);
            //width and height by parent?
            var dataWidth = this.configNode.getAttribute('data-width'),
                dataHeight = this.configNode.getAttribute('data-height');
            if (dataWidth > 0 && dataHeight > 0) {
                chartOptions.chart.width = dataWidth;
                chartOptions.chart.height = dataHeight;
                //cleanup old size
                if (fromPostProcessing) {
                    this.configNode.removeAttribute('data-width');
                    this.configNode.removeAttribute('data-height');
                }
            }

            chartOptions.chart.renderTo = this.configNode.getDOMNode();

            if (chartOptions.series) {
                this.setActions(chartOptions.series);
            }

            if (chartOptions.tooltip) {
                chartOptions.tooltip.formatter = LogiXML.HighchartsFormatters.tooltipFormatter;
            }

            this.setSelection(chartOptions);

            if (chartOptions.chart.options3d) {
                //Fix for Pie chart depth
                if (chartOptions.series) {
                    var containsPie = false;
                    for (var i = 0; i < chartOptions.series.length; i++) {
                        if (chartOptions.series[i].type=='pie') {
                            containsPie = true;
                            break;
                        }
                    }
                    if (containsPie) {
                        if (!chartOptions.plotOptions) {
                            chartOptions.plotOptions = {};
                        }
                        if (!chartOptions.plotOptions.pie) {
                            chartOptions.plotOptions.pie = {};
                        }
                        chartOptions.plotOptions.pie.depth = chartOptions.chart.options3d.depth;
                    }
                }
            }

            this.chart = new Highcharts.Chart(chartOptions);

            this.chart.options3d = chartOptions.chart.options3d;

            if (this.chart.options3d) {
                //mouse dragging rotation
                if (!this.chart.options3d.disableDragging) {
                    addRotationMouseEvents(this.chart);
                    if (saveOptions3DState) {
                        saveRotationStateFunc = saveOptions3DState;
                    }
                }
            }

            
            

            if (chartOptions.quicktips) {
                this.setQuicktipsData(chartOptions.quicktips);
            }

            if (chartOptions.autoQuicktip === false) {
                this.chart.autoQuicktip = false;
            }

            if (this.restoreSelectionForSeriesIndex !== null) {
                this.syncSelectedValues(this.chart.series[this.restoreSelectionForSeriesIndex]);
                this.restoreSelectionForSeriesIndex = null;
            }
        },

        requestChartData: function(url) {

            Y.io(url ? url : this.jsonUrl, {
                on: {
                    success: function(tx, r) {
                        var parsedResponse = this.parseJson(r.responseText);
                        if (parsedResponse) {
                            this.createChart(parsedResponse, true);
							if (typeof setChartStateEventHandlers != 'undefined'){
                            setChartStateEventHandlers(this.chart);
							}
                        }
                    },
                    failure: function(id, o, a) {
                        this.showError("ERROR " + id + " " + a);
                    }
                },
                context: this
            });
        },

        parseJson: function(jsonString) {
            var obj;
            try {
                var reportDevPrefix = "rdChart error;";
                var redirectPrefix = "redirect:";
                
                if (jsonString.startsWith(reportDevPrefix)) {
                    this.debugUrl = jsonString.substring(reportDevPrefix.length);
                    if (this.debugUrl && this.debugUrl.startsWith(redirectPrefix)) {
                        this.debugUrl = this.debugUrl.substring(redirectPrefix.length);
                    }
                    this.showError();
                    return;
                }
                obj = Y.JSON.parse(jsonString);
                if (LogiXML.EventBus && LogiXML.EventBus.ChartCanvasEvents) {
                    LogiXML.EventBus.ChartCanvasEvents().fire('load', { id: this.id, options: obj });
                }
            } catch (e) {
                this.showError("JSON parse failed: " + jsonString);
                return;
            }
            return obj;
        },

        setSelection: function(chartOptions) {
            if (!chartOptions.series || chartOptions.series.length == 0) {
                return;
            }

            var series,
                selection,
                i = 0,
                length = chartOptions.series.length,
                self = this;

            if (!chartOptions.chart.events) {
                chartOptions.chart.events = {};
            }
            for (; i < length; i++) {
                series = chartOptions.series[i];
                if (series.selection) {
                    selection = series.selection;

                    //turn on markers for point selection
                    if (selection.mode != "Range") {
                        series.marker.enabled = true;
                    }

                    if (!series.events) {
                        series.events = {};
                    }

                    switch (selection.selectionType) {
                    case "ClickSinglePoint":
                    case "ClickMultiplePoints":
                        series.allowPointSelect = true;
                        series.accumulate = selection.selectionType == "ClickMultiplePoints";
                        this.syncSelectedValues(series);
                        series.events.pointselection = function(e) {
                            self.pointsSelected(e.target, true);
                            return false
                        };
                        break;
                    case "Area":
                    case "AreaXAxis":
                    case "AreaYAxis":
                        switch (selection.selectionType) {
                        case "AreaXAxis":
                            chartOptions.chart.zoomType = "x";
                            break;
                        case "AreaYAxis":
                            chartOptions.chart.zoomType = "y";
                            break;
                        default:
                            chartOptions.chart.zoomType = "xy";
                            break;
                        }

                        series.accumulate = true;
                        chartOptions.chart.events.selection = function(e) {
                            self.selectionDrawn(e, true);
                            return false;
                        };
                        chartOptions.chart.events.redraw = function(e) { self.chartRedrawn(e); };
                        chartOptions.chart.events.selectionStarted = function(e) { self.destroySelection(); };

                        if (selection.mode == "Point") {
                            this.syncSelectedValues(series);
                        } else {
                            this.restoreSelectionForSeriesIndex = i;
                        }
                        chartOptions.chart.customSelection = true;

                        if (!selection.disableClearSelection) {
                            chartOptions.chart.events.click = function(e) { self.destroySelection(e, true); };
                        }

                        break;
                    }
                }
            }
        },

        

        pointsSelected: function (series, fireEvent) {
            var point, idx, value, values = [],
                i = 0, length = series.points.length,
                selection = series.options.selection,
                valueElement, changeFlagElement, oldValue, newValue;

            if (!selection) {
                return;
            }

            for (; i < length; i++) {
                point = series.points[i];
                if (point.selected) {
                    value = point.id || '';
                    idx = values.indexOf(value);
                    if (idx == -1) {
                        values.push(value);
                    }
                }
            }

            if (selection.valueElementId && selection.valueElementId.length > 0) {
                valueElement = this.getOrCreateInputElement(selection.valueElementId);
                oldValue = valueElement.get('value');
                //TODO do encoding for commas in values
                newValue = values.join(',');
                valueElement.set('value', newValue);

                if (oldValue != newValue) {

                    if (selection.changeFlagElementId && selection.changeFlagElementId.length > 0) {
                        changeFlagElement = this.getOrCreateInputElement(selection.changeFlagElementId);
                        changeFlagElement.set('value', 'True');
                    }

                    if (fireEvent) {
                        HighchartsAdapter.fireEvent(series, 'selectionChange', null);

                        //if (selection.selectionType != "ClickSinglePoint" && selection.selectionType != "ClickMultiplePoints") {
                        if (newValue == '') {
                            HighchartsAdapter.fireEvent(series, 'selectionCleared', null);
                        } else {
                            HighchartsAdapter.fireEvent(series, 'selectionMade', null);
                        }
                        //}
                    }

                }
            }
        },

        rangeSelected: function (series, xMin, xMax, yMin, yMax, rect, fireEvent) {
            var point,
                i = 0, length = series.points.length,
                selection = series.options.selection,
                valueElement;

            if (!selection) {
                return;
            }

            if (selection.mode == 'Point') {

                for (; i < length; i++) {
                    point = series.points[i];
                    //TODO: check selection mode (if x only, y only, xy. Now is xy)
                    if (point.x >= xMin && point.x <= xMax && point.y >= yMin && point.y <= yMax) {
                        point.select(true, true);
                    } else {
                        point.select(false, true);
                    }
                }
                this.pointsSelected(series, fireEvent);
                return;
            }

            if (series.xAxis.isDatetimeAxis) {
                xMin = xMin == null ? '' : LogiXML.Formatter.formatDate(xMin, 'U');
                xMax = xMax == null ? '' : LogiXML.Formatter.formatDate(xMax, 'U');
            } else if (series.xAxis.categories && series.xAxis.names.length > 0) {
                if (xMin !== null) {
                    xMin = Math.max(0, Math.round(xMin));
                    if (series.xAxis.names.length > xMin) {
                        xMin = series.xAxis.names[xMin];
                    }
                }
                if (xMax !== null) {
                    xMax = Math.min(series.xAxis.names.length - 1, Math.round(xMax));
                    if (series.xAxis.names.length > xMax) {
                        xMax = series.xAxis.names[xMax];
                    }
                }
            }

            if (series.yAxis.isDatetimeAxis) {
                yMin = yMin == null ? '' : LogiXML.Formatter.formatDate(yMin, 'U');
                yMax = yMax == null ? '' : LogiXML.Formatter.formatDate(yMax, 'U');
            } else if (series.yAxis.categories && series.yAxis.names.length > 0) {
                if (yMin !== null) {
                    yMin = Math.max(0, Math.round(yMin));
                    if (series.yAxis.names.length > yMin) {
                        yMin = series.yAxis.names[yMin];
                    }
                }
                if (yMax !== null) {
                    yMax = Math.min(series.yAxis.names.length - 1, Math.round(yMax));
                    if (series.yAxis.names.length > yMax) {
                        yMax = series.yAxis.names[yMax];
                    }
                }
            }

            if (xMin === null) {
                xMin = '';
            }
            if (xMax === null) {
                xMax = '';
            }
            if (yMin === null) {
                yMin = '';
            }
            if (yMax === null) {
                yMax = '';
            }

            //range selection 
            if (selection.changeFlagElementId && selection.changeFlagElementId.length > 0) {
                valueElement = this.getOrCreateInputElement(selection.changeFlagElementId);
                valueElement.set('value', 'True');
            }

            if (selection.minXElementId && selection.minXElementId.length > 0) {
                valueElement = this.getOrCreateInputElement(selection.minXElementId);
                valueElement.set('value', xMin);
            }
            if (selection.maxXElementId && selection.maxXElementId.length > 0) {
                valueElement = this.getOrCreateInputElement(selection.maxXElementId);
                valueElement.set('value', xMax);
            }

            if (selection.minYElementId && selection.minYElementId.length > 0) {
                valueElement = this.getOrCreateInputElement(selection.minYElementId);
                valueElement.set('value', yMin);
            }

            if (selection.maxYElementId && selection.maxYElementId.length > 0) {
                valueElement = this.getOrCreateInputElement(selection.maxYElementId);
                valueElement.set('value', yMax);
            }

            if (fireEvent) {
                var eventArgs = {
                    rect: rect,
                    xMin: xMin,
                    xMax: xMax,
                    yMin: yMin,
                    yMax: yMax
                };
                HighchartsAdapter.fireEvent(series, 'selectionChange', eventArgs);
                HighchartsAdapter.fireEvent(series, 'selectionMade', eventArgs);
            }
        },

        getOrCreateInputElement: function (id) {
            var inputElement = Y.one('#' + id);
            if (inputElement === null) {
                inputElement = Y.Node.create('<input type="hidden" name="' + id + '" id="' + id + '" />');
                this.configNode.ancestor().appendChild(inputElement);
            }
            return inputElement;
        },

        destroySelection: function (e, fireEvent) {
            var i = 0, y = 0,
                length = this.chart.series.length, dataLength,
                point, series, selection, wasSelected = false, notClearSelection = false;

            if (this.rangeSelection) { 
                wasSelected = true;
            }
            //clear selected points


            for (; i < length; i++) {
                series = this.chart.series[i];
                selection = series.options.selection;

                if (!selection) {
                    continue;
                }
                switch (selection.mode) {
                    case 'Range':
                        if (!notClearSelection && series.options.selection.disableClearSelection === true) {
                            notClearSelection = true;
                        }
                        if (!notClearSelection) {
                            this.rangeSelected(series, null, null, null, null);
                            if (wasSelected && fireEvent) {
                                HighchartsAdapter.fireEvent(series, 'selectionChange', null);
                                HighchartsAdapter.fireEvent(series, 'selectionCleared', null);
                            }
                        }
                        break;

                    default:
                        if (wasSelected && fireEvent) {
                            y = 0; dataLength = series.points.length;
                            for (; y < dataLength; y++) {
                                point = series.points[y];
                                if (point.selected) {
                                    point.select(false, true);
                                }
                            }
                            this.pointsSelected(series, fireEvent);
                        }
                        break;
                }
            }

            if (wasSelected && !notClearSelection) {
                this.rangeSelection.destroy();
                this.rangeSelection = null;
            }
        },

        selectionDrawn: function (e, fireEvent) {
            var self = this,
                zoomType = this.chart.options.chart.zoomType;
            if (this.chart.inverted) {
                zoomType = zoomType == 'x' ? 'y' : zoomType == 'y' ? 'x' : zoomType;
            }
            this.rangeSelection = new Y.LogiXML.ChartCanvasRangeSelection(
            {
                callback: function (rect) { self.selectionChanged(rect, true) },
                configNode: this.configNode,
                maskRect: e.selectionBox,
                constrainRect: this.chart.plotBox,
                maskType: zoomType,
                fillColor: this.chart.options.chart.selectionMarkerFill || 'rgba(69,114,167,0.25)'
            });
            this.selectionChanged(e.selectionBox, fireEvent);
            return false;
        },

        chartRedrawn: function (e) {
            var self = this,
                zoomType = this.chart.options.chart.zoomType,
                i = 0, length = this.chart.series.length, series, selection;

            //if (this.rangeSelection) {
            //this.destroySelection(e);
            //}

            var chart = e.target,
                oldWidth = chart.oldChartWidth,
                oldHeight = chart.oldChartHeight,
                chartHeight = chart.chartHeight,
                chartWidth = chart.chartWidth,
                diffWidth, diffHeight;

            if (oldWidth && oldWidth != chartWidth) {
                diffWidth = chartWidth - oldWidth;
            }
            if (oldHeight && oldHeight != chartHeight) {
                diffHeight = chartHeight - oldHeight;
            }

            //reset selection
            if (zoomType && this.rangeSelection && (diffWidth || diffHeight)) {
                for (; i < length; i++) {
                    series = this.chart.series[i];
                    selection = series.options.selection;

                    if (!selection) {
                        continue;
                    }

                    if (selection.mode == 'Range') {
                        this.syncSelectedValues(series);
                    } else if (selection.mode == 'Point' &&
                        (selection.selectionType == "ClickSinglePoint" || selection.selectionType == "ClickMultiplePoints") && this.rangeSelection) {
                        this.destroySelection();
                    }
                }
            }
        },

        selectionChanged: function (rect, fireEvent) {
            var xMin, xMax, yMin, yMax,
                i = 0, y = 0,
                length = this.chart.series.length, dataLength,
                point, series, selection, valueElement;

            for (; i < length; i++) {
                series = this.chart.series[i];
                selection = series.options.selection;

                if (!selection || (selection.selectionType == "ClickSinglePoint" || selection.selectionType == "ClickMultiplePoints")) {
                    continue;
                }

                //turn off zoom if DisableClearSelection
                if (selection.disableClearSelection) {
                    this.chart.pointer.zoomX = false;
                    this.chart.pointer.zoomY = false;
                }

                //TODO: check if series has x/y axis
                if (this.chart.inverted) {
                    xMin = series.xAxis.toValue(rect.y + rect.height);
                    xMax = series.xAxis.toValue(rect.y);
                    yMin = series.yAxis.toValue(rect.x);
                    yMax = series.yAxis.toValue(rect.x + rect.width);
                } else {
                    xMin = series.xAxis.toValue(rect.x);
                    xMax = series.xAxis.toValue(rect.x + rect.width);
                    yMin = series.yAxis.toValue(rect.y + rect.height);
                    yMax = series.yAxis.toValue(rect.y);
                }

                this.rangeSelected(series, xMin, xMax, yMin, yMax, rect, fireEvent);
            }
        },

        syncSelectedValues: function (series) {
            var selection = series.options ? series.options.selection : series.selection,
                valueElement, value, values, id,
                i = 0, length, minX, maxX, minY, maxY, selectionBox;
            if (!selection) {
                return;
            }
            if (selection.mode == 'Point') {
                if (!selection.valueElementId || selection.valueElementId.length == 0) {
                    return;
                }

                valueElement = Y.one('#' + selection.valueElementId);
                if (!valueElement) {
                    return;
                }
                value = valueElement.get('value');
                if (!value || value.length == 0) {
                    return;
                }
                values = value.split(',');
                length = series.data.length;
                for (; i < length; i++) {
                    id = series.data[i].id;
                    if (values.indexOf(id) != -1) {
                        series.data[i].selected = true;
                        if (series.type == "pie") {
                            series.data[i].sliced = true;
                        }
                    }
                }
            }

            if (selection.mode == 'Range') {
                //if (selection.maskType == 'x' || selection.maskType == 'xy') {
                if (selection.minXElementId && selection.minXElementId.length > 0) {
                    valueElement = this.getOrCreateInputElement(selection.minXElementId);
                    minX = valueElement.get('value');
                }
                if (selection.maxXElementId && selection.maxXElementId.length > 0) {
                    valueElement = this.getOrCreateInputElement(selection.maxXElementId);
                    maxX = valueElement.get('value');
                }
                //}

                //if (selection.maskType == 'y' || selection.maskType == 'xy') {
                if (selection.minYElementId && selection.minYElementId.length > 0) {
                    valueElement = this.getOrCreateInputElement(selection.minYElementId);
                    minY = valueElement.get('value');
                }

                if (selection.maxYElementId && selection.maxYElementId.length > 0) {
                    valueElement = this.getOrCreateInputElement(selection.maxYElementId);
                    maxY = valueElement.get('value');
                }
                //}

                if ((minX && minX != "") || (minY && minY != "")) {
                    selectionBox = this.getSelectionBox(series, minX, maxX, minY, maxY);
                    if (this.rangeSelection) {
                        this.destroySelection();
                    }
                    this.selectionDrawn({ selectionBox: selectionBox }, false);
                }
            }
            
        },

        getSelectionBox: function(series, minX, maxX, minY, maxY) {
            var selectionBox = {},
                x1, x2, y1, y2, dt, tmp;
            if (series.xAxis.isDatetimeAxis) {
                minX = minX && minX != "" ? new Date(minX) : null;
                maxX = maxX && maxX != "" ? new Date(maxX) : null;
            } else if (series.xAxis.categories === true) {
                minX = series.xAxis.names.indexOf(minX);
                minX = minX == -1 ? null : minX;

                maxX = series.xAxis.names.indexOf(maxX);
                maxX = maxX == -1 ? null : maxX;
            }
            if (series.yAxis.isDatetimeAxis) {
                minY = minY && minY != "" ? new Date(minY) : null;
                maxY = maxY && maxY != "" ? new Date(maxY) : null;
            } else if (series.yAxis.categories === true) {
                minY = series.yAxis.names.indexOf(minY);
                minY = minY == -1 ? null : minY;

                maxY = series.yAxis.names.indexOf(maxY);
                maxY = maxY == -1 ? null : maxY;
            }

            x1 = series.xAxis.toPixels(minX != null && minX.toString() != "" ? minX : series.xAxis.getExtremes().min);
            x2 = series.xAxis.toPixels(maxX != null && maxX.toString() != "" ? maxX : series.xAxis.getExtremes().max);
            y1 = series.yAxis.toPixels(minY != null && minY.toString() != "" ? minY : series.yAxis.getExtremes().min);
            y2 = series.yAxis.toPixels(maxY != null && maxY.toString() != "" ? maxY : series.yAxis.getExtremes().max);

            if (isNaN(x1)) {
                x1 = series.xAxis.toPixels(series.xAxis.getExtremes().min);
            }
            if (isNaN(x2)) {
                x2 = series.xAxis.toPixels(series.xAxis.getExtremes().max);
            }
            if (isNaN(y1)) {
                y1 = series.yAxis.toPixels(series.yAxis.getExtremes().min);
            }
            if (isNaN(y2)) {
                y2 = series.yAxis.toPixels(series.yAxis.getExtremes().max);
            }

            if (this.chart.inverted) {
                selectionBox.x = y1;
                selectionBox.width = y2 - selectionBox.x;
                selectionBox.y = x2;
                selectionBox.height = x1 - selectionBox.y;
            } else {
                selectionBox.x = x1;
                selectionBox.width = x2 - selectionBox.x;
                selectionBox.y = y2;
                selectionBox.height = y1 - selectionBox.y;
            }

            return selectionBox;
        },

        setQuicktipsData: function (quicktips) {
            if (!quicktips && quicktips.length == 0) {
                return;
            }

            var i = 0, length = quicktips.length;
            for (var i = 0; i < length; i++) {
                this.chart.series[quicktips[i].index].quicktip = quicktips[i];
            }
        },

        setActions: function (series) {
            var i = 0, length = series.length,
                options;
            
            for (; i < length; i++) {
                var serie = options = series[i];
                switch (serie.type) {
                    case 'treemap':
                        options._events = options.events;
                        options.events = {};
                        break;
                    default:
                        if (options.events) {
                            for (var event in options.events) {
                                if (Lang.isString(options.events[event])) {
                                    options.events[event] = new Function('e', options.events[event]);
                                }
                            }
                        }
                        break;
                }                    
                
            }
        },

        resized: function (e) {
            if (this.chart && this.chart.options) {
                var width = e.width > 0 ? e.width : this.chart.chartWidth,
                    height = e.height > 0 ? e.height : this.chart.chartHeight;
                this.chart.setSize(width, height);
                if (e.finished) {
                    var requestUrl = null;
                    if (this.refreshAfterResize == true && this.isUnderSE) {
                        this.requestChartData(this.jsonUrl + '&rdResizerNewWidth=' + width + '&rdResizerNewHeight=' + height + "&rdResizer=True");
                        //return;
                        requestUrl = 'rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=SetElementSize&rdWidth=' + width + '&rdHeight=' + height + '&rdElementId=' + this.id + '&rdReport=' + this.reportName + '&rdRequestForwarding=Form';
                    } else if (this.refreshAfterResize) {
                        requestUrl = 'rdAjaxCommand=RefreshElement&rdRefreshElementID=' + this.id + '&rdWidth=' + width + '&rdHeight=' + height + '&rdReport=' + this.reportName + '&rdResizeRequest=True&rdRequestForwarding=Form';
                    } else if (e.notify === undefined || (e.notify == true)) {
                        requestUrl = 'rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=SetElementSize&rdWidth=' + width + '&rdHeight=' + height + '&rdElementId=' + this.id + '&rdReport=' + this.reportName + '&rdRequestForwarding=Form';
                    }
                    if (requestUrl !== null) {
                        if (this.isUnderSE === "True") {
                            requestUrl += "&rdUnderSuperElement=True"
                        }
                        rdAjaxRequest(requestUrl);
                    }
                }
            }
        },

        showError: function (message) {
            if (this.chart) {
                this.chart.destroy();
            }
            if (!message && this.debugUrl == "") {
                
                message = "<img src='rdTemplate/rdChartError.gif'>";
            }
            if (message) {
                var errorContainer = Y.Node.create("<span style='color:red'></span>");
                errorContainer.setHTML(message);
                this.configNode.append(errorContainer);
            } else {
                var aLink, imgError;
                aLink = document.createElement("A")
                aLink.href = this.debugUrl
                //Make a new IMG inside of the anchor that points to the error GIF.
                imgError = document.createElement("IMG")
                imgError.src = "rdTemplate/rdChartError.gif"

                aLink.appendChild(imgError)
                this.configNode.append(aLink);
            }
        }

    }, {
        // Static Methods and properties
        NAME: 'ChartCanvas',
        ATTRS: {
            configNode: {
                value: null,
                setter: Y.one
            }
        },

        createElements: function (isAjax) {
            if (!isAjax) {
                isAjax = false;
            }

            var chart;

            Y.all('.' + TRIGGER).each(function (node) {
                chart = node.getData(TRIGGER);
                if (!chart) {
                    chart = new Y.LogiXML.ChartCanvas({
                        configNode: node,
                        isAjax: isAjax
                    });
                }
            });
        },

        handleError: function (e) {
            var chart = e.chart,
                code = e.code,
                errorText = '';
            switch (code) {
                case 10:
                    errorText = "Can't plot zero or subzero values on a logarithmic axis";
                    break;
                case 11:
                    //errorText = "Can't link axes of different type";
                    break;
                case 12:
                    errorText = "Chart expects point configuration to be numbers or arrays in turbo mode";
                    break;
                case 13:
                    errorText = "Rendering div not found";
                    break;
                case 14:
                    errorText = "String value sent to series.data, expected Number or DateTime";
                    break;
                case 15:
                    //errorText = "Chart expects data to be sorted for X-Axis";
                    break;
                case 17:
                    errorText = "The requested series type does not exist";
                    break;
                case 18:
                    errorText = "The requested axis does not exist";
                    break;
                case 19:
                    errorText = ''; //errorText = "Too many ticks";
                    break;
                default:
                    errorText = "Undefined error";
                    break;
            }
            if (errorText == '') {
                return;
            }
            var container = Y.one(chart.renderTo),
                errorContainer = container.one(".chartError"),
                hasError = false;
            if (!errorContainer) {
                errorContainer = container.append('<div class="rdChartCanvasError" style="display: inline-block; color:red" >Chart error:<ul class="chartError"></ul></div>').one(".chartError");
            }
            errorContainer.get('children').each(function (errorNode) {
                if (errorNode.get('text') == errorText) {
                    hasError = true;
                }
            });

            if (hasError === true) {
                return;
            }
            errorContainer.append('<li>' + errorText  + '</li>');
        },

        reflowCharts: function (rootNode) {
            if (rootNode && rootNode.all) {
                var chart;
                rootNode.all('.' + TRIGGER).each(function (node) {
                    chart = node.getData(TRIGGER);
                    if (chart) {
                        chart.chart.reflow();
                    }
                });
            }
        },

        resizeToWidth: function (width, cssSelectorPrefix) {
            var chart, e;
            Y.all(cssSelectorPrefix + ' .' + TRIGGER).each(function (node) {
                chart = node.getData(TRIGGER);
                if (chart) {
                    e = { width: width, finished: true };
                    chart.resized(e);
                }
            });
        }
    });

}, '1.0.0', { requires: ['base', 'node', 'event', 'node-custom-destroy', 'json-parse', 'io-xdr', 'chartCanvasRangeSelection'] });

