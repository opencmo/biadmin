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

            if (!chartOptions.chart.events) {
                chartOptions.chart.events = {};
            }
            chartOptions.chart.events.load = function (e) {
                var chart = this;
                if (chart.yAxis && chart.yAxis.length > 0) {
                    var extremes = chart.yAxis[0].getExtremes();
                    if (chart.yAxis[0].options && chart.yAxis[0].options.min == undefined && extremes.min < 0 && extremes.dataMin >= 0) {
                        chart.yAxis[0].setExtremes(0, null, true, false);
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
                            if (typeof setChartStateEventHandlers != 'undefined') {
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
