// JSLint options:
/*jslint browser: true, forin: true, nomen: true, sub: true, white: true, regexp: true */
/*global LogiXML: true, YUI: false, Y: false, document: false, Node: false, window: false */

/*
 * JSlint doesn't like "use strict"; at the top of JS files unless you scope.  Reason being
 * this file might be concatenated with others therefore force the concatenated file to run in
 * strict mode.  global.js is always loaded independently so we're fine. */

"use strict";
/* 
 * Create namespace for LogiXML javascript code to live under.
 * Help prevent collisions with customer code and remove functions
 * from global space.
 */
if (window.LogiXML === undefined) {
    window.LogiXML = {};
}
LogiXML.rd = {};
LogiXML.guids = {};

Array.prototype.maxArray = function () {
    return Math.max.apply(null, this);
};

Array.prototype.minArray = function () {
    return Math.min.apply(null, this);
};

String.prototype.startsWith = function(str) {
    return this.indexOf(str) === 0;
};
String.prototype.endsWith = function(str) {
    return this.indexOf(str, this.length - str.length) !== - 1;
};

if (!Array.prototype.some) {
    Array.prototype.some = function (fun /*, thisArg */) {
        'use strict';
        if (this === void 0 || this === null)
            throw new TypeError();

        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun !== 'function')
            throw new TypeError();

        var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
        for (var i = 0; i < len; i++) {
            if (i in t && fun.call(thisArg, t[i], i, t))
                return true;
        }

        return false;
    };
}

LogiXML.layout = {};
LogiXML.layout.getTextDimensions = function(text, style, className) {
    var div = document.createElement("lDiv");
    document.body.appendChild(div);
    if (style) {
        div.style.fontFamily = style.fontFamily;
        div.style.fontSize = style.fontSize;
        div.style.fontWeight = style.fontWeight || 'normal';
        if (style.width) {
            div.style.width = style.width;
        }
    }
    div.style.position = "absolute";
    div.style.left = -1000;
    div.style.top = -1000;
    div.innerHTML = text;
    if (className) {
        div.className = className;
    }

    var result = {
        width: div.clientWidth,
        height: div.clientHeight
    };
    document.body.removeChild(div);
    div = null;
    return result;
};

(function () {
	// Based on tests from Modernizer -- http://www.modernizr.com
	// At some point just switch over to Modernizer, for now this is lighter
	LogiXML.features = {};
	
	var tests = {},
		features = LogiXML.features,
		junk = 'junk',
		feature;
	
	tests['localstorage'] = function() {
        try {
            localStorage.setItem(junk, junk);
            localStorage.removeItem(junk);
            return true;
        } catch(e) {
            return false;
        }
    };
	
	tests['canvas'] = function() {
        var elem = document.createElement('canvas');
        return !!(elem.getContext && elem.getContext('2d'));
    };
	
	tests['touch'] = function() {
		// Modernizer Test in case this one has problems
		// return ('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch;
		try {
		    //document.createEvent('TouchEvent');   //Chrome returns true in latest versions.
		    return 'ontouchstart' in window;
		} catch (e) {
			return false;
		}		
	};
	
	for( feature in tests ) {
		if ( tests.hasOwnProperty(feature) ) {
			features[feature.toLowerCase()] = tests[feature]();
		}
	}
}());

// Utilities
LogiXML.inspect = function( inspectMe ) {
	var inspectString = "",
		item;
	if ( typeof inspectMe === 'object' || typeof inspectMe === 'array' )
	{
		for( item in inspectMe )
		{
			inspectString += item + " : " + inspectMe[item] + "\n";
		}
		return inspectString;
	}
	
	return inspectMe;
};

LogiXML.isDomNode = function( checkMe ) {
	return (typeof Node === 'object' ?
		// DOM2 supporting browser check
		checkMe instanceof Node :
		// Non-compliant browser check
		checkMe && typeof checkMe === 'object' && typeof checkMe.nodeType === 'number' && typeof checkMe.nodeName=== 'string');	
};

LogiXML.isNumeric = function(input) {
    var re = /^-{0,1}\d*\.{0,1}\d+$/;
    return re.test(input);
};

LogiXML.opacityValidator = function( val ) {
	var opacity = val;
	if ( Y.Lang.isString( val ) ) {
		opacity = parseFloat( val );
	}
	
	if ( Y.Lang.isNumber( opacity ) ) {
		return val >= 0.0 && val <= 1.0;
	}
	
	return false;
};

LogiXML.isNodeVisible = function (node) {

	if (node.getStyle('display') == 'none')
		return false

	while (Y.Lang.isValue(node.ancestor())) {
		node = node.ancestor();
		
		if (node.getStyle('display') == 'none')
			return false;
	}
	
	return true;
}

LogiXML.String = {};
/*
 * Checks if a String is whitespace, empty ("") or null.
 * non-strings always return undefined
*/
LogiXML.String.isBlank = function( testMe ) {
	
	if ( Y.Lang.isString( testMe ) ) {
		return (testMe.length !== 0) ? Y.Lang.trim( testMe ) === '' : true ;
	}
	
	return undefined;
};

LogiXML.String.isNotBlank = function( testMe ) {
	
	if ( Y.Lang.isString( testMe ) ) {
		return !LogiXML.String.isBlank( testMe );
	}
	
	return undefined;
};

LogiXML.Math = {};

LogiXML.Math.expRegression = function (data) {
    var N = data.length;
    var y = [];
    var x = [];
    for (var i = 0; i < data.length; i++) {
        // ignore points <= 0, log undefined.
        if (data[i][1] <= 0) {
            N--;
        }
        else {
            x.push(data[i][0]);
            y.push(Math.log(data[i][1]));
        }
    }
    var SX = 0;
    var SY = 0;
    var SXX = 0;
    var SXY = 0;
    var SYY = 0;
    for (i = 0; i < N; i++) {
        SX = SX + x[i];
        SY = SY + y[i];
        SXY = SXY + x[i] * y[i];
        SXX = SXX + x[i] * x[i];
        SYY = SYY + y[i] * y[i];
    }
    var slope = (N * SXY - SX * SY) / (N * SXX - SX * SX);
    var intercept = (SY - slope * SX) / N;
    var interceptExp = Math.exp(intercept);
    var slopeExp = Math.exp(slope);
    var result = [];
    for (i = 0; i < data.length; i++) {
        result.push([x[i], interceptExp * Math.pow(slopeExp, x[i])]);
    }
    result.sort();
    return result;
};
// we expect an array of arrays here where every sub array is the list of coordinates [[x,y],[x1,y1]...]
LogiXML.Math.linearRegression = function (coordinates) {
    /**
    * Code for regression extracted from jqplot.trendline.js
    *
    * Version: 1.0.0a_r701
    *
    * Copyright (c) 2009-2011 Chris Leonello
    * jqPlot is currently available for use in all personal or commercial projects
    * under both the MIT (http://www.opensource.org/licenses/mit-license.php) and GPL
    * version 2.0 (http://www.gnu.org/licenses/gpl-2.0.html) licenses. This means that you can
    * choose the license that best suits your project and use it accordingly.
    *
    **/
    var sx = 0;
    var sy = 0;
    var sxx = 0;
    var sxy = 0;
    var syy = 0;
    for (var index = 0; index < coordinates.length; index++) {
        var x = coordinates[index][0];
        var y = coordinates[index][1];
        sx = sx + x;
        sy = sy + y;
        sxy = sxy + x * y;
        sxx = sxx + x * x;
        syy = syy + y * y;
    }
    var slope = (coordinates.length * sxy - sx * sy) / (coordinates.length * sxx - sx * sx);
    var intercept = (sy - slope * sx) / coordinates.length;
    var result = [];
    // we can optimize this by adding only first and last points to the resulting array
    for (index = 0; index < coordinates.length; index++) {
        x = coordinates[index][0];
        result.push([x, slope * x + intercept]);
    }
    result.sort();
    return result;
};
LogiXML.Math.roundToSignificantDigit =  function( val, sig ) {
	if ( !(Y.Lang.isNumber( val ) && Y.Lang.isNumber( sig )) ) {
		return undefined;
	}
	
	if ( isNaN( val ) || isNaN( sig ) ) {
		return undefined;
	}
	
	if ( val === 0 ) {
		return 0;
	}
	
	if ( Math.round( val ) === val )
	{
		return val;
	}
	
	var mult = Math.pow(10, sig - Math.floor(Math.log(val < 0 ? -val: val) / Math.LN10) - 1);
	return Math.round(val * mult) / mult;
};

LogiXML.Math.getSignificantDigits = function( val ) {
	var significantDigits = 0;
	if ( isNaN( val ) ) {
		return undefined;
	}
	
	if ( val === 0 ) {
		return 0;
	}
	
	val = Math.abs(val).toString();
	// We need to get rid of the leading zeros for the numbers.
	val = val.replace( /^0+/, '');
	
	// Remove trailing 0's
	var re = /[^0](\d*[^0])?/;
	
	// Check if the number has a decimal point
	// Yes, then significant digits is just length of the string minus the decimal point
	if ( /\./.test( val ) ) {
		significantDigits = val.length - 1;
	}
	// No, well remove trailing 0's and check the length
	else {
		significantDigits = (val.match( re ) || [''])[0].length;
	}
	
	return significantDigits;
};

//Namespaces for super elements
LogiXML.Dashboard = {};
LogiXML.AnalysisGrid = {};

//Namespaces for supporting JS files
LogiXML.Ajax = {};
LogiXML.Ajax.AjaxTarget = function() {
	if ( LogiXML.Ajax._ajaxTarget === undefined )
	{
		LogiXML.Ajax._ajaxTarget = new Y.EventTarget();
	}
		
	return LogiXML.Ajax._ajaxTarget;
};
LogiXML.SubReport = {};
LogiXML.SubReport.initSubReports = function() {
	Y.each(Y.all('iframe'), function(nodeFrame) {		
		if (LogiXML.isNodeVisible(nodeFrame) 
		&& !Y.Lang.isValue(nodeFrame.getData('waitkey'))
		&& nodeFrame.getAttribute('src') == '') 			
			nodeFrame.set('src', nodeFrame.getData('hiddensource'));
	});
}
LogiXML.Tabs = new Array();
LogiXML.WaitPanel = {};
LogiXML.Resize = {};
LogiXML.DraggableColumns = {};
LogiXML.ResizableColumns = {};
LogiXML.CellColorSlider = {};
LogiXML.InputSlider = {};
LogiXML.PopupPanel = {};
LogiXML.PopupMenu = {};

	/* Shim in Date parsing and toString code for ISO 8601 from https://github.com/kriskowal/es5-shim
	 * 
	 * Copyright 2009, 2010 Kristopher Michael Kowal. All rights reserved.
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to
	 * deal in the Software without restriction, including without limitation the
	 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
	 * sell copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
	 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
	 * IN THE SOFTWARE.
	 */
(function(){
	//
	// Date
	// ====
	//

	// ES5 15.9.5.43
	// http://es5.github.com/#x15.9.5.43
	// This function returns a String value represent the instance in time
	// represented by this Date object. The format of the String is the Date Time
	// string format defined in 15.9.1.15. All fields are present in the String.
	// The time zone is always UTC, denoted by the suffix Z. If the time value of
	// this object is not a finite Number a RangeError exception is thrown.
	if (!Date.prototype.toISOString || (new Date(-62198755200000).toISOString().indexOf('-000001') === -1)) {
		Date.prototype.toISOString = function toISOString() {
			var result, length, value, year;
			if (!isFinite(this)) {
				throw new RangeError("Date.prototype.toISOString called on non-finite value.");
			}

			// the date time string format is specified in 15.9.1.15.
			result = [this.getUTCMonth() + 1, this.getUTCDate(),
				this.getUTCHours(), this.getUTCMinutes(), this.getUTCSeconds()];
			year = this.getUTCFullYear();
			year = (year < 0 ? '-' : (year > 9999 ? '+' : '')) + ('00000' + Math.abs(year)).slice(0 <= year && year <= 9999 ? -4 : -6);

			length = result.length;
			while (length--) {
				value = result[length];
				// pad months, days, hours, minutes, and seconds to have two digits.
				if (value < 10) {
					result[length] = "0" + value;
				}
			}
			// pad milliseconds to have three digits.
			return year + "-" + result.slice(0, 2).join("-") + "T" + result.slice(2).join(":") + "." +
				("000" + this.getUTCMilliseconds()).slice(-3) + "Z";
		};
	}
	
	// ES5 15.9.4.2
	// http://es5.github.com/#x15.9.4.2
	// based on work shared by Daniel Friesen (dantman)
	// http://gist.github.com/303249
	if (!Date.parse || Date.parse("+275760-09-13T00:00:00.000Z") !== 8.64e15) {
		// XXX global assignment won't work in embeddings that use
		// an alternate object for the context.
		Date = (function(NativeDate) {

			// Date.length === 7
			var Date = function Date(Y, M, D, h, m, s, ms) {
				var length = arguments.length;
				if (this instanceof NativeDate) {
					var date = length === 1 && String(Y) === Y ? // isString(Y)
						// We explicitly pass it through parse:
						new NativeDate(Date.parse(Y)) :
						// We have to manually make calls depending on argument
						// length here
						length >= 7 ? new NativeDate(Y, M, D, h, m, s, ms) :
						length >= 6 ? new NativeDate(Y, M, D, h, m, s) :
						length >= 5 ? new NativeDate(Y, M, D, h, m) :
						length >= 4 ? new NativeDate(Y, M, D, h) :
						length >= 3 ? new NativeDate(Y, M, D) :
						length >= 2 ? new NativeDate(Y, M) :
						length >= 1 ? new NativeDate(Y) :
									  new NativeDate();
					// Prevent mixups with unfixed Date object
					date.constructor = Date;
					return date;
				}
				return NativeDate.apply(this, arguments);
			};

			// 15.9.1.15 Date Time String Format.
			var isoDateExpression = new RegExp("^" +
				"(\\d{4}|[\+\-]\\d{6})" + // four-digit year capture or sign + 6-digit extended year
				"(?:-(\\d{2})" + // optional month capture
				"(?:-(\\d{2})" + // optional day capture
				"(?:" + // capture hours:minutes:seconds.milliseconds
					"T(\\d{2})" + // hours capture
					":(\\d{2})" + // minutes capture
					"(?:" + // optional :seconds.milliseconds
						":(\\d{2})" + // seconds capture
						"(?:\\.(\\d{3}))?" + // milliseconds capture
					")?" +
				"(?:" + // capture UTC offset component
					"Z|" + // UTC capture
					"(?:" + // offset specifier +/-hours:minutes
						"([-+])" + // sign capture
						"(\\d{2})" + // hours offset capture
						":(\\d{2})" + // minutes offset capture
					")" +
				")?)?)?)?" +
			"$");

			// Copy any custom methods a 3rd party library may have added
			for (var key in NativeDate) {
				Date[key] = NativeDate[key];
			}

			// Copy "native" methods explicitly; they may be non-enumerable
			Date.now = NativeDate.now;
			Date.UTC = NativeDate.UTC;
			Date.prototype = NativeDate.prototype;
			Date.prototype.constructor = Date;

			// Upgrade Date.parse to handle simplified ISO 8601 strings
			Date.parse = function parse(string) {
				var match = isoDateExpression.exec(string);
				if (match) {
					match.shift(); // kill match[0], the full match
					// parse months, days, hours, minutes, seconds, and milliseconds
					for (var i = 1; i < 7; i++) {
						// provide default values if necessary
						match[i] = +(match[i] || (i < 3 ? 1 : 0));
						// match[1] is the month. Months are 0-11 in JavaScript
						// `Date` objects, but 1-12 in ISO notation, so we
						// decrement.
						if (i == 1) {
							match[i]--;
						}
					}

					// parse the UTC offset component
					var minuteOffset = +match.pop(), hourOffset = +match.pop(), sign = match.pop();

					// compute the explicit time zone offset if specified
					var offset = 0;
					if (sign) {
						// detect invalid offsets and return early
						if (hourOffset > 23 || minuteOffset > 59) {
							return NaN;
						}

						// express the provided time zone offset in minutes. The offset is
						// negative for time zones west of UTC; positive otherwise.
						offset = (hourOffset * 60 + minuteOffset) * 6e4 * (sign == "+" ? -1 : 1);
					}

					// Date.UTC for years between 0 and 99 converts year to 1900 + year
					// The Gregorian calendar has a 400-year cycle, so
					// to Date.UTC(year + 400, .... ) - 12622780800000 == Date.UTC(year, ...),
					// where 12622780800000 - number of milliseconds in Gregorian calendar 400 years
					var year = +match[0];
					if (0 <= year && year <= 99) {
						match[0] = year + 400;
						return NativeDate.UTC.apply(this, match) + offset - 12622780800000;
					}

					// compute a new UTC date value, accounting for the optional offset
					return NativeDate.UTC.apply(this, match) + offset;
				}
				return NativeDate.parse.apply(this, arguments);
			};

			return Date;
		})(Date);
	}
}());

// Shim in String trim if needed
if ( !String.prototype.trim ) {
	String.prototype.trim = function() {
		return this.replace(/^\s+|\s+$/g,'');
	};
}
LogiXML.isNotEmptyObject = function (object) {
    return (object.y != null && object.y != undefined) ||
        (object.low != null && object.low != undefined ||
        object.high != null && object.high != undefined);
};

if (!Array.isArray) {
    Array.isArray = function (arg) {
        return Object.prototype.toString.call(arg) === '[object Array]';
    };
}

LogiXML.isNotEmpty2dArray = function (object) {
    return Array.isArray(object) &&
        (object[0] != null && object[0] != undefined ||
        object[1] != null && object[1] != undefined);
};
LogiXML.isNotEmptyValue = function (object) {
    return typeof object == "number";
};
LogiXML.hasValue = function (object) {
    return (object != null &&
        (this.isNotEmptyObject(object) ||
        this.isNotEmpty2dArray(object) ||
        this.isNotEmptyValue(object)));
};
LogiXML.newIndex = function getRandomInt(min, max) {
    min = min || 0;
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
LogiXML.getRandomElements = function (array, count) {
    if (array.length <= count) {
        return array;
    }
    var indexes = [];
    do {
        var index = LogiXML.newIndex(count);
        if (!indexes.indexOf(index) != -1) {
            indexes.push(index);
        }
    } while (indexes.length <= count)
    return indexes;
};
