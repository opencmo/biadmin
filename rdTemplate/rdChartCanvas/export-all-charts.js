var page = require('webpage').create(),
    system = require('system'),
    fs = require('fs');

function TryParseInt(str, defaultValue) {
    var retValue = defaultValue;
    if (str !== null) {
        if (str.length > 0) {
            if (!isNaN(str)) {
                retValue = parseInt(str);
            }
        }
    }
    return retValue;
}

if (system.args.length < 3) {
    console.log('Usage: printheaderfooter.js URL filename');
    phantom.exit(1);
} else {
    var address = system.args[1];
    var output = system.args[2];
    var ids = system.args[3].split(',');
    var pageWidth = TryParseInt(system.args[4], 1200);
    page.viewportSize = { width: pageWidth, height: 800 };
    /*page.paperSize = {
        format: 'A4',
        margin: "1cm",
        footer: {
			height: "1cm",
			contents: phantom.callback(function(pageNum, numPages) {
            return "<div style='text-align:right; background-color: #ccc;'>Page Footer " + pageNum + " / " + numPages + "</div>";
			})
        },
		header: {
			height: "1cm",
			contents: phantom.callback(function(pageNum, numPages) {
            return "<div style='text-align:center; background-color: #ccc;' >Page header " + pageNum + " / " + numPages + "</div>";
			})
		}
		
    };*/

page.open(address, function (status) {
    if (status !== 'success') {
        console.log('Unable to load the address!');
    } else {                
        window.setTimeout(function () {
            var i = 0, length = ids.length, id, chart;
            for (; i < length; i++) {
                id = ids[i];
                if (id == '') {
                    continue;
                }
                var chart = page.evaluate(function (id) {
                    var el = Y.one('#' + id + ''),
                        svg = null, ret = "Can't find the chart",
                        chartHeight = null;
                    if (el && el.get('children').size() >= 1) {
                        chartHeight = el.get('offsetHeight');
                        ret = el.get('children').item(0).get('outerHTML');
                    }
                    if (ret) {
                        var idxStart = ret.indexOf('<svg');
                        var idxEnd = ret.indexOf('</svg>')
                        if (idxStart && idxEnd) {
                            ret = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' + ret.substr(idxStart, idxEnd + 6 - idxStart);
                        }
                    }
                    return ret;
                }, id);
                var fileName = output.replace('{0}', id);
                fs.write(fileName, chart, 'w');
            }
            phantom.exit();
        }, 3000);
    }
});

//page.onResourceReceived = function (resource) {
    
//    if (resource.headers == null || resource.headers == "") {
//        console.log('Not loaded Url: ' + resource.url);
//    }
//    /*for (var propertyName in resource) {
//        console.log(propertyName + ' : ' + resource[propertyName]);
//    }*/
    
//}
}