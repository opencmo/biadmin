YUI.add('resizable-columns', function (Y) {
    
    var ResizableColumns = Y.namespace('LogiXML.ResizableColumns');

    ResizableColumns.initialize = function () {
        //Initilize Resizable columns
        ResizableColumns.rdInitResizableColumns();

        //Wire up for re-init after refreshelement
        LogiXML.Ajax.AjaxTarget().on('reinitialize', this.rdInitResizableColumns);
    };

    ResizableColumns.rdInitResizableColumns = function () {

        var htmlTables = Y.all('table[rdResizableColumnsID]');
        var table, header;
        var tableWidth, tableNode;

        for (var i = 0; i < htmlTables.size() ; i++) {
            table = htmlTables.item(i).getDOMNode();
            
            // Safari doesn't support table.tHead, sigh
            if (table.tHead == null) {
                table.tHead = table.getElementsByTagName('thead')[0];
            }
            var resizeTable = false;
            tableNode = Y.one(table);
            var headers = table.tHead.rows[0].cells;
            for (var j = 0; j < headers.length; j++) {
                (function (j) {
                    header = Y.one(headers[j]);
                    
                    //Get the resize handle
                    var node = Y.one(header.one('td.rdResizeHeaderRow'));
                    if (Y.Lang.isValue(node)) {

                        var headerHTML = header._stateProxy.outerHTML;

                        if (Y.Lang.isValue(header.getDOMNode().style.width) && header.getDOMNode().style.width != "" && parseInt(header.getStyle('width'), 10) > 0) {
                            //19263
                            if (headerHTML.indexOf("rdcondelement") > 0 && header.getAttribute('conditionalProcessed') == "") {
                                header.setAttribute('conditionalProcessed', 'true');
                                header.getDOMNode().style.width = (parseInt(header.getDOMNode().style.width, 10) + 12) + 'px';
                            }
                                
                        }
                        else if (parseInt(header.getStyle('width'), 10) > 0) {
                            //19263
                            if (headerHTML.indexOf("rdcondelement") > 0) {
                                header.setAttribute('conditionalProcessed', 'true');
                                header.getDOMNode().style.width = (header.get('offsetWidth') + 4) + 'px';
                            }
                            else
                                header.getDOMNode().style.width = (header.get('offsetWidth') - 8) + 'px';
                        }
                        else { //19600 20413
                            header.getDOMNode().style.width = '100px';
                        }

                            //Only show handle when inside the cell. For touch always show.
                            if (LogiXML.features['touch']) {
                                node.one('img[id$="-ResizeHandle"]').setStyle('visibility', 'visible');
                            }
                            else {
                                node.ancestor("TH", true).on('mouseover', function (e) {
                                    e.currentTarget.one('img[id$="-ResizeHandle"]').setStyle('visibility', 'visible');
                                });
                                node.ancestor("TH", true).on('mouseout', function (e) {
                                    e.currentTarget.one('img[id$="-ResizeHandle"]').setStyle('visibility', 'hidden');
                                });
                            }
                            
                            //In case of AJAX refresh, we don't want to create an extra drag node
                            if (!Y.Lang.isValue(node.dd)) {

                                //Plug drag node to allow us to drag resize handle
                                node.plug(Y.Plugin.Drag);
                                var dd = node.dd;
                                //Plug proxy node to maintain position of resize handle
                                dd.plug(Y.Plugin.DDProxy, {
                                    positionProxy: true,
                                    resizeFrame: false,
                                    moveOnEnd: false
                                });

                                var hndNode = node.one('img[id$="-ResizeHandle"]');
                                if (!LogiXML.features['touch'])
                                    hndNode.setStyle('visibility', 'hidden');

                                dd.addHandle('#' + hndNode.get('id')).plug(Y.Plugin.DDWinScroll, { vertical: false, scrollDelay: 5 });;
                                hndNode.setStyle('cursor', 'col-resize');

                                dd.on('drag:start', ResizableColumns._onResizeStart);
                                //This event occurs on all drag events, needed to make sure that we don't make the column too small or go in the wrong direction
                                dd.on('drag:drag', ResizableColumns._onResize, node);
                                dd.on('drag:end', ResizableColumns._onResizeEnd, node);

                            }
                        }                
                })(j);
            }



            var tableDOM = tableNode.getDOMNode();

            tableWidth = 0;
            //19277
            tableNode.all('TH').each(function (node) {
                nodeDOM = node.getDOMNode();
                var tableDOM = node.one('TABLE');
                if (Y.Lang.isValue(tableDOM))
                    tableDOM = tableDOM.getDOMNode();
                //This is necessary in case there was a sort done and we have added extra characters to the header
                if (Y.Lang.isValue(tableDOM))
                    if (tableDOM.scrollWidth > nodeDOM.clientWidth)
                        nodeDOM.style.width = tableDOM.scrollWidth + "px";
                    
                //20275 22405
                if (node.hasClass('yui3-dd-draggable') && !node.ancestor().hasClass('rdAgHeaderRow')  && nodeDOM.getAttribute("id").indexOf("-TH") > -1) {
                    if (typeof parseInt(nodeDOM.style.width, 10) === 'number' && !isNaN(parseInt(nodeDOM.style.width, 10))) { //21231

                        tableWidth += parseInt(nodeDOM.style.width, 10);
                        //19409
                        if (LogiXML.features['touch'])
                            tableWidth += 12;
                    }
                }
                nodeDOM.style.overflow = "hidden";
                nodeDOM.style.textOverflow = "clip";
            });

            tableNode.all('TD').each(function (node) {
                nodeDOM = node.getDOMNode();
                nodeDOM.style.overflow = "hidden";
                nodeDOM.style.textOverflow = "clip";
            });

            //Set table style to fixed so that table will leave viewport if necessary
            if (typeof tableWidth === 'number' && !isNaN(tableWidth)) { //21231
               // tableDOM.style.width = tableWidth + 'px';
                tableDOM.style.maxWidth = tableWidth + 'px';
                tableDOM.style.tableLayout = "fixed";
            }
        }
    };

    /* -----Events----- */

    ResizableColumns._onResizeStart = function (e) {

        var drag = e.target;
        var dragNode = drag.get('dragNode');
        var node = drag.get('node');

        //Make sure node and source table exist
        if (!node) {
            e.halt();
            return;
        }

        

        var sourceTableNode = node.ancestor('table', false);
        if (!sourceTableNode) {
            e.halt();
            return;
        }

        //Set style of dragnode --  column resize cursor as the mouse and make sure nothing else is visible
        dragNode.setStyles({
            opacity: '.00',
            borderLeft: '0px solid',
            borderTop: '0px',
            borderBottom: '0px',
            cursor: 'col-resize',
            backgroundColor: 'transparent'
        });
        
    };

    ResizableColumns._onResize = function (e) {

        var drag = e.target;
        var dragNode = drag.get('dragNode');
        var dragTable = dragNode.one('table');
        var tdNode = drag.get('node');
        var node = drag.get('node').ancestor("TH", true);

        //node.setStyle("borderRight", "3px solid gray");

        //20 px is the minimum
        if (drag.mouseXY[0] <= (node.getX() + 20) ) {
            e.halt();
            return;
        }

        var originalWidth = node.get('offsetWidth');
        var finishPoint = node.getX() + node.get('clientWidth');
        var resizeDifference = drag.mouseXY[0] - finishPoint;
        var widthDifference = originalWidth + resizeDifference ; // current width + the difference of the resize + 4 for padding of the td

        var sourceTableNode = node.ancestor('table', true);
        if (!sourceTableNode) {
            e.halt();
            return;
        }

        var sourcetableDOM = sourceTableNode.getDOMNode();
        //Firefox requires fixed layout to be set like this
        sourcetableDOM.style.tableLayout = "fixed";
        var headers = sourceTableNode.getDOMNode().tHead.rows[0].cells;
        var header, tableWidth = 0;
        //Loop through TH's and add up the width of the table
        for (var j = 0; j < headers.length; j++) {
            header = Y.one(headers[j]);
            //Add everything except node we are modifing because if table is in auto-layout (which it shouldn't be) setting the node width before 
            //we get these values can alter them
            if (header != node) {
                tableWidth += parseInt(header.getStyle('width'), 10);
                if (LogiXML.features['touch'])
                    tableWidth += 12;
            }
         }

        //Set node width
        node.setStyle('width', widthDifference + "px");
        //Adjust width if we made it to small
        var scroll = node.get('scrollWidth');
        var tableScroll = node.one('table').get('scrollWidth');

        if (tableScroll > scroll) //Firefox
            node.setStyle('width', tableScroll + "px");
        else if (scroll > widthDifference)
            node.setStyle('width', scroll + "px");

        tableWidth += parseInt(node.getStyle('width'), 10);
        //19409
        if (LogiXML.features['touch'])
            tableWidth += 12;

        var sourceTableDOM = sourceTableNode.getDOMNode();
        //Firefox requires fixed layout to be set like this

        sourceTableDOM.style.tableLayout = "fixed";
        sourceTableDOM.style.width = tableWidth + 'px';
        

    };

    ResizableColumns._onResizeEnd = function (e) {

        var drag = e.target;
        var dragNode = drag.get('dragNode');
        var tdNode = drag.get('node');
        var node = drag.get('node').ancestor("TH",true);

        var originalWidth = node.get('offsetWidth');
        var finishPoint = node.getX() + node.get('offsetWidth');
        var resizeDifference = drag.mouseXY[0] - finishPoint;
        var widthDifference = originalWidth + resizeDifference;

        var sourceTableNode = node.ancestor('table', true);
        if (!sourceTableNode) {
            e.halt();
            return;
        }

        var headers = sourceTableNode.getDOMNode().tHead.rows[0].cells;
        var header, tableWidth = 0;
        //Loop through TH's and add up the width of the table
        for (var j = 0; j < headers.length; j++) {
            header = Y.one(headers[j]);
            //Add everything except node we are modifing because if table is in auto-layout (which it shouldn't be) setting the node width before 
            //we get these values can alter them
            if (header != node) {
                tableWidth += parseInt(header.getStyle('width'), 10);
                if (LogiXML.features['touch'])
                    tableWidth += 12;
            }
        }
            
        //Set node width
        node.setStyle('width', widthDifference + "px");
        //Adjust width if we made it to small
        var scroll = node.get('scrollWidth');
        var tableScroll = node.one('table').get('scrollWidth');

        if (tableScroll > scroll) //Firefox
            node.setStyle('width', tableScroll + "px");
        else if (scroll > widthDifference)
            node.setStyle('width', scroll + "px");
        //Add final resized col width to table
        tableWidth += parseInt(node.getStyle('width'), 10);
        if (LogiXML.features['touch'])
            tableWidth += 12;

        //Set table style and width
        var sourceTableDOM = sourceTableNode.getDOMNode();

        //Firefox requires fixed layout to be set like this
        sourceTableDOM.style.tableLayout = "fixed";
        sourceTableDOM.style.width = tableWidth + 'px';
        

        sourceTableNode.all('TD').each(function (node) {
            nodeDOM = node.getDOMNode();
            nodeDOM.style.overflow = "hidden";
            nodeDOM.style.textOverflow = "clip";
        });

        //Build AJAX post string
        var sResize = "";
        var sourceTable = sourceTableNode.getDOMNode();

        var headers = sourceTable.tHead.rows[0].cells;
        var header, headerNode;
        for (var j = 0; j < headers.length; j++) {
            header = headers[j];
            headerNode = Y.one(header);
            var sResizeColId = sourceTable.tHead.rows[0].cells[j].id.replace("-TH", "");
            if (Y.Lang.isValue(headerNode.getAttribute('rdctcolnr')) && parseInt(headerNode.getAttribute('rdctcolnr'),10) >= 0)
                sResize += "," + sResizeColId + "_rdctcolnr" + ":" + parseInt(headerNode.getDOMNode().style.width, 10) + "_" + headerNode.getAttribute('rdctcolnr');
            else
                sResize += "," + sResizeColId + ":" + parseInt(headerNode.getDOMNode().style.width,10);
        }


        sResize += "," + sourceTableNode.getAttribute('ID') + ":" + tableWidth;
        var sResizableColumnsID = sourceTable.getAttribute("rdResizableColumnsID");

        //For Logi: Save the new column sizes back to the server
        if (sourceTable.id == "dtAnalysisGrid") {
            var hiddenNoCache = document.createElement("INPUT"); 
            hiddenNoCache.type = "HIDDEN";
            hiddenNoCache.id = "rdNoXslCache";
            hiddenNoCache.name = "rdNoXslCache";
            hiddenNoCache.value = "True";
            sourceTable.tHead.rows[0].cells[0].appendChild(hiddenNoCache);

            rdAjaxRequest('rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=SaveResizableColumns&rdResizableColumnsID=' + sResizableColumnsID + '&rdResize=' + sResize + '&rdIsAg=True&rdAgID=' + document.rdForm.rdAgId.value);
        } else {

            rdAjaxRequest('rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=SaveResizableColumns&rdResizableColumnsID=' + sResizableColumnsID + '&rdResize=' + sResize);
        }
        
    };

    LogiXML.ResizableColumns = ResizableColumns;

}, '1.0.0', { requires: ['dd-constrain', 'dd-proxy', 'dd-drop-plugin', 'dd-plugin', 'dd-scroll'] });

