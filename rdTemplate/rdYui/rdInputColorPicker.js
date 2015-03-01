YUI.add('rdInputColorPicker', function (Y) {
    "use strict";

    var Lang = Y.Lang,
     TRIGGER = 'rdInputColorPicker';

    if (LogiXML.Ajax.AjaxTarget) {
        LogiXML.Ajax.AjaxTarget().on('reinitialize', function () { Y.LogiXML.rdInputColorPicker.createElements(true); });
    }

    Y.LogiXML.Node.destroyClassKeys.push(TRIGGER);

    Y.namespace('LogiXML').rdInputColorPicker = Y.Base.create('rdInputColorPicker', Y.Base, [], {
        _handlers: {},
        inited: false,
        id: null,
        configNode: null,
        capacity: 10,
        colors: '#000000,#434343,#666666,#999999,#B7B7B7,#CCCCCC,#D9D9D9,#EFEFEF,#F3F3F3,#FFFFFF,#980000,#FF0000,#FF9900,#FFFF00,#00FF00,#00FFFF,#4A86E8,#0000FF,#9900FF,#FF00FF,#E6B8AF,#F4CCCC,#FCE5CD,#FFF2CC,#D9EAD3,#D0E0E3,#C9DAF8,#CFE2F3,#D9D2E9,#EAD1DC,#DD7E6B,#EA9999,#F9CB9C,#FFE599,#B6D7A8,#A2C4C9,#A4C2F4,#9FC5E8,#B4A7D6,#D5A6BD,#CC4125,#E06666,#F6B26B,#FFD966,#93C47D,#76A5AF,#6D9EEB,#6FA8DC,#8E7CC3,#C27BA0,#A61C00,#CC0000,#E69138,#F1C232,#6AA84F,#45818E,#3C78D8,#3D85C6,#674EA7,#A64D79,#85200C,#990000,#B45F06,#BF9000,#38761D,#134F5C,#1155CC,#0B5394,#351C75,#741B47,#5B0F00,#660000,#783F04,#7F6000,#274E13,#0C343D,#1C4587,#073763,#20124D,#4C1130'.split(','),
        tileTemplate: '<td style="width: 12px;" class="rdColorPanelHolder" id="colColor" onclick="javascript:Y.LogiXML.rdInputColorPicker.PickColor(this,event);"><a href="#" tabindex="0" id="<%rdTileID%>" onkeydown="Y.LogiXML.rdInputColorPicker.moveFocusOnArrow(event,<%rdColorPickerID%>,<%left%>,<%right%>,<%top%>,<%bottom%>);"><div style="width:11px;height:11px;border-width:1px;border-style:solid;border-color:#FFFFFF;background-color:<%color%>;" class="rdColorPanel"></div></a></td>',

        initializer: function (config) {
            var self = this;
            this._parseHTMLConfig();
            this.configNode.setData(TRIGGER, this);
            var img = this.configNode.one('#colorPicker_' + this.id);
            this._handlers.click = img.on('click', this.click, this);
            var storageValue = rdGetLocalStorage("rdDefaultValue_" + this.id);
            if (storageValue) {
                var colorIndicator = Y.one('#rectColorIndicator_' + this.id);
                if (colorIndicator.getStyle('backgroundColor') == "transparent")
                    colorIndicator.setStyle('backgroundColor', storageValue);
            }
        },
        click: function (e) {
            if (!this.inited) {
                this.initializePopup();
                this.inited = true;
            }
            var imgId = 'colorPicker_' + this.id;
            var image = document.getElementById(imgId);
            ShowElement(imgId, "ppColors_" + this.id, "Show");
            Y.LogiXML.rdInputColorPicker.addOnblurToColorpicker(image);
            Y.LogiXML.rdInputColorPicker.setFocusToPopup(image, e);
        },
        initializePopup: function () {
            var tiles = this.buildPopup();
            var popup = Y.one('#' + 'ppColors_{0}'.format(this.id));
            popup.one('tbody').appendChild(Y.Node.create(tiles))
            //Set selected color if it is in pallete
            var currentColor = this.configNode.one('input').getAttribute('value');
            var activeTile = popup.one('div[style*="background-color:{0}"]'.format(currentColor));
            if (activeTile) {
                var checkedImage = this.configNode.one('.CheckedAlignment');
                activeTile.appendChild(checkedImage);
                checkedImage.getDOMNode().parentElement.className += " rdImageColorSelected";
                checkedImage.getDOMNode().className = checkedImage.getDOMNode().className.replace("hidden", "");
            }
        },
        _parseHTMLConfig: function () {
            this.configNode = this.get('configNode');
            this.id = this.configNode.one('input').getAttribute('id');
            this.capacity = parseInt(this.configNode.getAttribute('data-capacity') || this.capacity, 10);
            var colorString = this.configNode.getAttribute('data-colors');
            if (colorString != "")
                this.colors = colorString.split(',');
        },
        Tile: function (id, parentId, left, right, top, bottom, color) {
            this.rdTileID = id;
            this.rdColorPickerID = parentId;
            this.left = left;
            this.right = right;
            this.top = top;
            this.bottom = bottom;
            this.color = color;
        },
        buildPopup: function () {
            var rows = "";
            var rowsCount = this.colors.length / this.capacity;
            if (rowsCount != Math.round(rowsCount)) {
                rowsCount = Math.trunc(rowsCount) + 1;
            }
            var colorNumber = 0
            for (var i = 0; i < rowsCount; i++) {
                var row = "<tr>";
                for (var j = 0; j < this.capacity ; j++) {
                    var left = "null";
                    var top = "null";
                    var bottom = "null";
                    var right = "null";
                    if (i || j) {
                        left = "'Color_{0}_{1}'".format(this.id, colorNumber - 1);
                    }
                    if (i != rowsCount - 1 || j != this.capacity - 1) {
                        if (colorNumber + 1 < this.colors.length)
                            right = "'Color_{0}_{1}'".format(this.id, colorNumber + 1);
                    }
                    if (i) {
                        top = "'Color_{0}_{1}'".format(this.id, colorNumber - this.capacity);
                    }
                    if (i != rowsCount - 1) {
                        var sum = colorNumber + this.capacity;
                        if (sum < this.colors.length) {
                            bottom = "'Color_{0}_{1}'".format(this.id, sum);
                        }
                    }
                    row += LogiXML.TemplateEngine(this.tileTemplate, new this.Tile('Color_' + this.id + '_' + colorNumber, "'ppColors_Parent'", left, right, top, bottom, this.colors[colorNumber]));
                    colorNumber++;
                    if (colorNumber == this.colors.length) {
                        break;
                    }
                }
                row += "</tr>"
                rows += row;
            }
            return rows;
        },
        destructor: function () {
            var configNode = this.configNode;
            this._clearHandlers();
            this.capacity = null;
            this.colors = null;
            this.tileTemplate = null;
            configNode.setData(TRIGGER, null);
        },

        _clearHandlers: function () {
            var self = this;
            Y.each(this._handlers, function (item) {
                if (item) {
                    if (item.detach) {
                        item.detach();
                    }
                    item = null;
                }
            });
        },
    }, {
        // Static Methods and properties
        NAME: 'rdInputColorPicker',
        ATTRS: {
            configNode: {
                value: null,
                setter: Y.one
            }
        },

        createElements: function () {
            var element;
            Y.all('.' + TRIGGER).each(function (node) {
                element = node.getData(TRIGGER);
                if (!element) {
                    element = new Y.LogiXML.rdInputColorPicker({
                        configNode: node
                    });
                }
            });
            //Y.LogiXML.ResponsiveColumnResizer.createElements();
        },
        PickColor: function (colColor, evt) {
            var self = Y.one(colColor),
                wrapper = self.ancestor('.rdInputColorPicker'),
                eleColorHolder = wrapper.one('input'),
                id = eleColorHolder.getAttribute('id'),
                colorDiv = self.one('div'),
                sColor = Y.Color.toHex(colorDiv.getStyle('background-color') || colorDiv.getDOMNode().style.backgroundColor),
                checkedImage = self.ancestor('div').one('.CheckedAlignment');
            checkedImage.getDOMNode().parentElement.className = checkedImage.getDOMNode().parentElement.className.replace("rdImageColorSelected", "");
            //input
            eleColorHolder.setAttribute("value", sColor);
            if (eleColorHolder.getDOMNode().onchange)
                eleColorHolder.getDOMNode().onchange();
            //set image to selected color
            colorDiv.appendChild(checkedImage);
            checkedImage.getDOMNode().parentElement.className += " rdImageColorSelected";
            checkedImage.getDOMNode().className = checkedImage.getDOMNode().className.replace("hidden", "");
            var elePickedColorIndicator = document.getElementById('rectColorIndicator_' + id);
            elePickedColorIndicator.style.backgroundColor = sColor;
            ShowElement('colorPicker_' + id, 'ppColors_' + id, 'Hide');

        },
        addOnblurToColorpicker: function (colColor) {
            var self = Y.one(colColor),
                wrapper = self.ancestor('.rdInputColorPicker'),
                eleColorHolder = wrapper.one('input'),
                id = eleColorHolder.getAttribute('id'),
                shade = wrapper.one(".popupPanelModal");

            shade.addClass("popupPanelModalTransparent");
            shade.on('click', function () {
                ShowElement('colorPicker_' + id, 'ppColors_' + id, 'Hide');
            });
        },
        setFocusToPopup: function (colColor, e) {
            var self = Y.one(colColor),
                wrapper = self.ancestor('.rdInputColorPicker'),
                eleColorHolder = wrapper.one('input'),
                id = eleColorHolder.getAttribute('id'),
                anchor = Y.one('#Color_' + id + '_0');
            var selectedImage = Y.one('#selectedColor_' + id);
            if (selectedImage.ancestor().get('id').indexOf('PopupPanelContent') !==-1) {
                anchor.focus();
            }
            else {
                selectedImage.ancestor('a').focus();
            }

            Y.LogiXML.rdInputColorPicker.stopEventPropogation(e);
        },
        callOnclickIfSpaceOrEnter: function (object, e, inpid) {

            if (!e.which)
                e.which = e.keyCode;
            if (isIE() && Y.LogiXML.rdInputColorPicker.colorselected) {
                Y.LogiXML.rdInputColorPicker.colorselected = false;
                return;
            }
            if ((e.which == '32') || (e.which == '13')) {
                Y.LogiXML.rdInputColorPicker.stopEventPropogation(e);
                var id = object.firstChild.getAttribute('id');
                var ele = document.getElementById(id);
                ele.parentNode.appendChild(document.getElementById('ppColors_' + id.slice(id.indexOf('_') + 1)));
                YUI().use('node-event-simulate', function (Y) {
                    Y.one('#' + id).simulate("click");
                });
                setTimeout(function () {
                    var style = document.getElementById('ppColors_' + id.slice(id.indexOf('_') + 1)).style;
                    style.top = ele.getBoundingClientRect().bottom.toString() + 'px';
                    style.left = (ele.getBoundingClientRect().left + ele.width).toString() + 'px';
                }, 5);
            }
        },
        moveFocusOnArrow: function (e, inpid, left, right, top, bottom) {
            if (!e.which)
                e.which = e.keyCode;
            if (e.which == 9) {
                return;
            }
            Y.LogiXML.rdInputColorPicker.stopEventPropogation(e);
            var nextItemId = "";
            var id = "";
            var eventsource = Y.LogiXML.rdInputColorPicker.rdGetEventSource(e);
            id = eventsource.id;
            id = id.slice(id.indexOf('_') + 1, id.lastIndexOf('_'));
            if (e.which == '37') {//left
                nextItemId = left;
            }
            else if (e.which == '38') {//up
                nextItemId = top;
            }
            else if (e.which == '39') {//right
                nextItemId = right;
            }
            else if (e.which == '40') {//down
                nextItemId = bottom;
            }
            else if (e.which == '27') {//esc
                var parent = document.getElementById('ppColors_' + id).parentNode;
                Y.one('#colorPicker_' + id).focus();
                ShowElement('colorPicker_' + id, 'ppColors_' + id, 'Hide');
                // Y.one('#colorPicker_' + id).set('tabindex', '-1');
                // document.getElementById('colorPicker_' + id).tabindex = -1;
              //  setTimeout(document.getElementById('colorPicker_' + id).setAttribute('tabindex', '-1'), 500);//we need to call it after function execution
            }
            else if (e.which == '13') {//enter 
                if (isIE() < 10) {
                    Y.LogiXML.rdInputColorPicker.PickColor(Y.LogiXML.rdInputColorPicker.rdGetEventSource(e).parentNode);
                }
                else if (isIE()) {
                    setTimeout(Y.LogiXML.rdInputColorPicker.rdGetEventSource(e).parentNode.onclick, 100);
                }
                else {
                    Y.LogiXML.rdInputColorPicker.rdGetEventSource(e).parentNode.onclick();
                }
                Y.one('#colorPicker_' + id).focus();
                Y.LogiXML.rdInputColorPicker.colorselected = true;
              //  setTimeout(document.getElementById('colorPicker_' + id).setAttribute('tabindex', '-1'), 500);//we need to call it after function execution
            }
            if (nextItemId && nextItemId != "" && nextItemId != "null") {
                nextItemId = nextItemId;
                var elem = Y.one('#' + nextItemId);
                elem.focus();
            }
        },
        rdGetEventSource: function (e) {
            return e.srcElement || e.currentTarget;
        },
        stopEventPropogation: function (e) {
            e = e || window.event;
            if (e) {
                e.cancelBubble = true;
                if (e.stopPropagation)
                    e.stopPropagation();
                if (e.preventDefault)
                    e.preventDefault();
                e.returnValue = false;
            }
        }

    });

}, '1.0.0', { requires: ['base', 'node', 'event', 'node-custom-destroy', 'json-parse', 'stylesheet', 'event-custom', 'rdInputColorPicker-css'] });

