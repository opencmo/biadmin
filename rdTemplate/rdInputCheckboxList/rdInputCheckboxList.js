YUI.add('rd-inputCheckList-plugin', function (Y) {
    'use strict';

    //Define querySelectorAll if it's not defined (IE7)
    if (!document.querySelectorAll) {
        (function (d, s) { d = document, s = d.createStyleSheet(); d.querySelectorAll = function (r, c, i, j, a) { a = d.all, c = [], r = r.split(','); for (i = r.length; i--;) { s.addRule(r[i], 'k:v'); for (j = a.length; j--;) a[j].currentStyle.k && c.push(a[j]); s.removeRule(0) } return c } })()
    }
    //create namespaced plugin class
    Y.namespace('LogiXML').rdInputCheckList = Y.Base.create("rdInputCheckList", Y.Plugin.Base, [], {
		_noneSelectedText: 'Select options',
		_selectedText: '# selected',
		_multiple: true,
		_isDropdown: false,
		_isOpen: false,
        _isHierarchical: false,
		_valueDelimiter: ",",
		_saveInLocalStorage: false,
		_columns: 1,
		_checkAllIsVisible: false,
		_maxLevel: 0,
		_leafNodes: 0,
		_actions: [],
        //constructor
        initializer: function () {
			this._container = this.get("host");
			this._id = this._container.getAttribute("id");
			if (!Y.Lang.isValue(this._container) || !Y.Lang.isValue(this._id)) {
				return;
			}
			var sIsDropdown = this._container.getAttribute("data-dropdown");
			if (Y.Lang.isString(sIsDropdown) && sIsDropdown.toLowerCase() === "true") {
				this._isDropdown = true;
			}
			var multiple = this._container.getAttribute("data-multiple");
			this._multiple = LogiXML.String.isBlank(multiple) ? true : multiple == "False" ? false : true;
			// is there check-all? 21775
			this._checkAllBtn = Y.one("#" + this._id + "_check_all");
			this._inputs = Y.all('input[type="checkbox"][id^="' + this._id + '_rdList"]');

			if (this._inputs.size() > 0 && this._inputs._nodes[0]) {
			    if (this._inputs._nodes[0].getAttribute("rdLevel")) {
			        this._isHierarchical = true;

			        var leafNodes = document.querySelectorAll('[rdLeaf][id^="' + this._id + '_rdList"]');
			        this._leafNodes = leafNodes.length;
			    }
			}
			//IE7
			if (this._inputs.size() > 0 && this._inputs.item(0).get("id").indexOf("check_all") != -1) {
			    this._inputs = this._inputs.slice(1, this._inputs.size());
			}	
			if (this._checkAllBtn) {
				if (this._multiple == false || this._inputs.size() <= 1) {
					this._checkAllBtn.get('parentNode').hide();
				} else {
					this._checkAllIsVisible = true;
				}
			}
			this._noneSelectedText = this._container.getAttribute("data-noneselected-caption");
			this._selectedText = this._container.getAttribute("data-selected-caption");
			if (this._isDropdown === true) {
				this._dropDownHandler = Y.one("#" + this._id + "_handler");
				this._caption = this._dropDownHandler.one("span.rd-checkboxlist-caption");
				this._img = this._dropDownHandler.one("span.rd-checkboxlist-icon");
				this._spacer = Y.Node.create('<img style="height:1px;" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="""" />');
				this._container.append(this._spacer);
				//attach events
				this._docClickHandle = Y.one("document").on("mousedown", function (e) {this.onDocMouseDown(e); }, this);
				this._dropDownHandle = this._dropDownHandler.on("click", function (e) {this.togglePopup(e); }, this);
			}
			if (this._checkAllIsVisible === true) {
			    this._handleCheckAll = this._checkAllBtn.on("click", function (e) {this.onCheckAllClicked(e); }, this);
			}
			this._inputsHandle = this._inputs.on("click", function (e) {this.onCheckboxClicked(e); }, this);
			//Subscribe for Ajax refreshing?
			if (Y.Lang.isValue(LogiXML) && Y.Lang.isValue(LogiXML.Ajax)) {
				var id = this._id;
				LogiXML.Ajax.AjaxTarget().on('reinitialize', function (e) {var chkList = Y.one("#" + id); if (Y.Lang.isValue(chkList)) {chkList.plug(Y.LogiXML.rdInputCheckList);}});
			}
			
			var actAttributes = ["data-action-onclick","data-action-onchange"], i, length = actAttributes.length, action;
			this._actions = [];
			for (i = 0; i < length; i++) {
				action = this._container.getAttribute(actAttributes[i]);
				if (LogiXML.String.isNotBlank(action)) {
					if (action.indexOf("javascript:") == 0) {
						action = action.substring("javascript:".length);
					}
				}
				this._actions.push(action.replace(/'/g,"\""));
			}

            //Hierarchical
			var changeHistory = document.getElementById(this._id + "_rdExpandedCollapsedHistory").value;
			if (changeHistory != "")
			    this.restoreCheckboxState(changeHistory);
            //Hierarchical
			var parentNodes = document.querySelectorAll('[rdExpanded]');
			if (this._isHierarchical) {
			    for (i = 0; i < parentNodes.length; i++) {
			        if(parentNodes[i].getAttribute("rdLevel") == "1")
			            this.initializeExpandCollapse(parentNodes[i], false);
			    }
			}

			this.onCheckboxClicked(null);
            //Element was hidden during loading, make it visible now
			document.getElementById(this._id + "_hideWaiting").style.display = "";
        },

        //clean up on destruction
        destructor: function () {
			if (this._handleCheckAll) {
				this._handleCheckAll.detach();
				this._handleCheckAll = null;
			}
			if (this._dropDownHandle) {
				this._dropDownHandle.detach();
				this._dropDownHandle = null;
			}
			if (this._inputsHandle) {
				this._inputsHandle.detach();
				this._inputsHandle = null;
			}
			if (this._docClickHandle) {
				this._docClickHandle.detach();
				this._docClickHandle = null;
			}
        },
        
        setCheckboxOpacity: function (eleChk, alpha) {
            if(eleChk.getAttribute("rdChecked") == "some")
                Y.one(eleChk).setStyle('opacity', '0.3');
            else
                Y.one(eleChk).setStyle('opacity', '1.0');
        },
		onCheckAllClicked: function (e) {
		    var isChecked = e.currentTarget.get("checked");
		    this._inputs.each(function (node) {
		        var rdLevel = node.getAttribute("rdLevel");
			    node.set("checked", isChecked);
			    if (rdLevel != "") {
			        if (isChecked) {
			            node.set("rdChecked", "all");
			            Y.one(node).setStyle('opacity', '1.0');
			        }
			        else {
			            node.set("rdChecked", "none");
			            Y.one(node).setStyle('opacity', '1.0');
			        }
			    }
			});
			this.onCheckboxClicked({ checkall: true });
            

		},
		open: function () {
			if (this._isOpen === true) {
				return;
			}
			var popupWidth = this._dropDownHandler.get('offsetWidth');
			var popupPosition = this._dropDownHandler.getXY();
			popupPosition[1]  += this._dropDownHandler.get('offsetHeight');
			this._container.setStyles({
				position: "absolute",
				display: "block"
			});
			this._container.setXY(popupPosition);
			this.setPopupWidth();
			this._isOpen = true;
		},
		close: function (e) {
			if (this._isOpen) {
			    this._container.hide();
				this._isOpen = false;
			}
		},
		togglePopup: function () {
			if (!this._isOpen) {
				this.open();
			} else {
				this.close();
			}
		},
		setPopupWidth : function () {
			var ddWidth = this._dropDownHandler.get('offsetWidth');
			this._spacer.setStyle('width', ddWidth + 'px');
			var popupWidth = this._container.get('offsetWidth');
			var diff = popupWidth - ddWidth;
			if (diff > 0) {
				this._spacer.setStyle('width', (ddWidth - diff)  + 'px');
			}
		},
		onDocMouseDown: function (e) {
			if (this._isOpen && e.target !== this._dropDownHandler && !this._dropDownHandler.contains(e.target) && !this._container.contains(e.target)) {
				this.close();
			}
		},

        //***Hierarchical Checkbox Functions
		uncheckAllChildren: function(currentNode) {
		    var targetLevel = currentNode.getAttribute("rdLevel");
		    currentNode.setAttribute("rdChecked", "none");

		    var currentLevel = targetLevel;

		    var nextSibling = currentNode.parentNode.parentNode.nextSibling;

		    while (nextSibling) {
		        var nextSiblingInput;
		        for (var i = 0; i < nextSibling.childNodes[0].childNodes.length; i++) {
		            if (nextSibling.childNodes[0].childNodes[i].tagName == "INPUT") {
		                nextSiblingInput = nextSibling.childNodes[0].childNodes[i];
		                break;
		            }
		        }
		        //When we find the next element that is either the same level or higher, we're finished
		        if (parseInt(nextSiblingInput.getAttribute("rdLevel"), 10) <= parseInt(targetLevel, 10)) {
		            break;
		        }
		        //recursively check all children
		        if (parseInt(nextSiblingInput.getAttribute("rdLevel"), 10) >= parseInt(targetLevel, 10) + 1) {
		            nextSiblingInput.checked = false;
		            nextSiblingInput.setAttribute("rdChecked", "none");
		            this.uncheckAllChildren(nextSiblingInput);

		        }

		        nextSibling = nextSibling.nextSibling;
		    }
		},
		uncheckAllParents: function(currentNode) {

		    var targetLevel = currentNode.getAttribute("rdLevel");
		    //currentNode.setAttribute("rdChecked", "none");
		    var currentLevel = parseInt(targetLevel, 10) - 1;

		    var prevSibling = currentNode.parentNode.parentNode.previousSibling;
		    while (prevSibling) {
		        var prevSiblingInput;
		        for (var i = 0; i < prevSibling.childNodes[0].childNodes.length; i++) {
		            if (prevSibling.childNodes[0].childNodes[i].tagName == "INPUT") {
		                prevSiblingInput = prevSibling.childNodes[0].childNodes[i];
		                break;
		            }
		        }
		        if (parseInt(prevSiblingInput.getAttribute("rdLevel"),10) == currentLevel) {

		            if (this.someChildrenChecked(prevSiblingInput) === true) {
		                prevSiblingInput.setAttribute("rdChecked", "some");
		                prevSiblingInput.checked = true;
		                this.setCheckboxOpacity(prevSiblingInput, "0.3");
		            }
		            else {
		                prevSiblingInput.checked = false;
		                prevSiblingInput.setAttribute("rdChecked", "none");
		                this.setCheckboxOpacity(prevSiblingInput, "0.0");
		                
		            }
		            this.uncheckAllParents(prevSiblingInput);
		            break;
		        }
		        prevSibling = prevSibling.previousSibling;
		    }
		    
		},
		checkAllChildren: function(currentNode) {
		    var targetLevel = currentNode.getAttribute("rdLevel");
		    currentNode.setAttribute("rdChecked", "all");
		    var currentLevel = targetLevel;

		    var nextSibling = currentNode.parentNode.parentNode.nextSibling;

		    while (nextSibling) {
		        var nextSiblingInput;
		        for (var i = 0; i < nextSibling.childNodes[0].childNodes.length; i++) {
		            if (nextSibling.childNodes[0].childNodes[i].tagName == "INPUT") {
		                nextSiblingInput = nextSibling.childNodes[0].childNodes[i];
		                break;
		            }
		        }
                //When we find the next element that is either the same level or higher, we're finished
		        if (parseInt(nextSiblingInput.getAttribute("rdLevel"), 10) <= parseInt(targetLevel, 10)) {
		            break;
		        }
                //recursively check all children
		        if (parseInt(nextSiblingInput.getAttribute("rdLevel"), 10) >= parseInt(targetLevel, 10) + 1) {
		            nextSiblingInput.checked = true;
		            nextSiblingInput.setAttribute("rdChecked", "all");
		            this.setCheckboxOpacity(nextSiblingInput, "0.0");
		            this.checkAllChildren(nextSiblingInput);
		        }

		        nextSibling = nextSibling.nextSibling;
		    }
		},
		initializeExpandCollapse: function (currentNode, hiddenChild) {

		    var targetLevel = parseInt(currentNode.getAttribute("rdLevel"), 10);
		    //First parent will be 1 level up
		    var hideLevel = targetLevel + 1;
		    var nextSibling = currentNode.parentNode.parentNode.nextSibling;
		    var showHide;
		    //showing or hiding?
		    if (currentNode.getAttribute("rdExpanded") == "true") {
		        showHide = "";
		    }
		    else {
		        hiddenChild = true;
		        showHide = "none";
		    }
		    while (nextSibling) {
		        var nextSiblingInput;
		        for (var i = 0; i < nextSibling.childNodes[0].childNodes.length; i++) {
		            if (nextSibling.childNodes[0].childNodes[i].tagName == "INPUT") {
		                nextSiblingInput = nextSibling.childNodes[0].childNodes[i];
		                break;
		            }
		        }
		        //When we find the next element that is either the same level or higher, we're finished
		        if (parseInt(nextSiblingInput.getAttribute("rdLevel"), 10) == hideLevel) {
		            nextSibling.style.display = showHide;
		            this.initializeExpandCollapse(nextSiblingInput, hiddenChild);
		        }
		        else if (parseInt(nextSiblingInput.getAttribute("rdLevel"), 10) > hideLevel && hiddenChild)
		            nextSibling.style.display = "none";

		        else if (parseInt(nextSiblingInput.getAttribute("rdLevel"), 10) < hideLevel) {
		            break;
		        }

		        nextSibling = nextSibling.nextSibling;
		    }
		    
		},
		expandCollapseChildren: function (currentNode) {

		    var targetLevel = parseInt(currentNode.getAttribute("rdLevel"), 10);
		    //First parent will be 1 level up
		    var hideLevel = targetLevel + 1;
		    var nextSibling = currentNode.parentNode.parentNode.nextSibling;
		    var showHide;
		    //showing or hiding?
		    if (currentNode.getAttribute("rdExpanded") == "true") {
		        showHide = "";
		    }
		    else {
		        showHide = "none";
		    }
		    while (nextSibling) {
		        var nextSiblingInput;
		        for (var i = 0; i < nextSibling.childNodes[0].childNodes.length; i++) {
		            if (nextSibling.childNodes[0].childNodes[i].tagName == "INPUT") {
		                nextSiblingInput = nextSibling.childNodes[0].childNodes[i];
		                break;
		            }
		        }
		        //When we find the next element that is either the same level or higher, we're finished
		        if (parseInt(nextSiblingInput.getAttribute("rdLevel"), 10) == hideLevel && showHide == "") {
		            nextSibling.style.display = showHide;
		            if (nextSiblingInput.getAttribute("rdExpanded") == "true")
		                this.expandCollapseChildren(nextSiblingInput);
		        }
		        else if (parseInt(nextSiblingInput.getAttribute("rdLevel"), 10) >= hideLevel && showHide == "none") {
		            nextSibling.style.display = showHide;
		        }
		        else if (parseInt(nextSiblingInput.getAttribute("rdLevel"), 10) < hideLevel) {
		            break;
		        }

		        nextSibling = nextSibling.nextSibling;
		    }
		    
		},
		restoreCheckboxState: function (changeHistory) {
		    //Restore expanded/collapsed status
		    var modifiedBranches = document.getElementById(this._id + "_rdExpandedCollapsedHistory").value.split(",");
		    for (var i = 0; i < modifiedBranches.length; i++) {
		        var statusId = modifiedBranches[i].split(":");
		        var checkbox = document.getElementById(statusId[0]);
		        if (checkbox) {
		            if (statusId[1] == "expanded" && checkbox.getAttribute("rdExpanded") == "false") {
		                //Switch to collapsed symbol
		                //This is the location of the on image
		                checkbox.previousSibling.firstChild.firstChild.firstChild.click();
		            }
		            else if (checkbox.getAttribute("rdExpanded") == "true" && statusId[1] == "collapsed") {
		                //Switch to expanded symbol
		                //This is the location of the off image
		                checkbox.previousSibling.firstChild.childNodes[1].firstChild.click();
		            }
               }
		    }
		},
		checkAllParents: function(currentNode) {
		    //Parent li item is 2 levels up
		    var targetLevel = currentNode.getAttribute("rdLevel");
            //First parent will be 1 level up
		    var currentLevel = parseInt(targetLevel, 10) - 1;
		    var prevSibling = currentNode.parentNode.parentNode.previousSibling;
		    while (prevSibling) {
		        var prevSiblingInput;
		        for (var i = 0; i < prevSibling.childNodes[0].childNodes.length; i++) {
		            if (prevSibling.childNodes[0].childNodes[i].tagName == "INPUT") {
		                prevSiblingInput = prevSibling.childNodes[0].childNodes[i];
		                break;
		            }
		        }
		        if (parseInt(prevSiblingInput.getAttribute("rdLevel"),10) == currentLevel) {

		            if (this.allChildrenChecked(prevSiblingInput) === true) {
		                prevSiblingInput.setAttribute("rdChecked", "all");
		                prevSiblingInput.checked = true;
		                this.setCheckboxOpacity(prevSiblingInput, "0.0");
		            }
		            else {
		                prevSiblingInput.checked = true;
		                prevSiblingInput.setAttribute("rdChecked", "some");
		                this.setCheckboxOpacity(prevSiblingInput, "0.3");
		            }
		            this.checkAllParents(prevSiblingInput);
		            break;
		        }
		        prevSibling = prevSibling.previousSibling;
		    }
		},
		allChildrenChecked: function(currentNode) {

		    var targetLevel = currentNode.getAttribute("rdLevel");
		    var currentLevel = targetLevel;
		    //Parent li item is 2 levels up
		    var nextSibling = currentNode.parentNode.parentNode.nextSibling;
		    while (nextSibling) {
		        var nextSiblingInput;
		        for (var i = 0; i < nextSibling.childNodes[0].childNodes.length; i++) {
		            if (nextSibling.childNodes[0].childNodes[i].tagName == "INPUT") {
		                nextSiblingInput = nextSibling.childNodes[0].childNodes[i];
		                break;
		            }
		        }
		        //When we find the next element that is either the same level or higher, we're finished
		        if (parseInt(nextSiblingInput.getAttribute("rdLevel"), 10) > targetLevel) {
		            if (nextSiblingInput.getAttribute("rdChecked") != "all")
		                return false;
		        }
		        if (parseInt(nextSiblingInput.getAttribute("rdLevel"), 10) <= targetLevel) {
		            break;
		        }
		        nextSibling = nextSibling.nextSibling;
		    }
		    return true;
		},
		someChildrenChecked: function(currentNode) {

		    var targetLevel = parseInt(currentNode.getAttribute("rdLevel"), 10);
		    var nextSibling = currentNode.parentNode.parentNode.nextSibling;
		    while (nextSibling) {
		        var nextSiblingInput;
		        for (var i = 0; i < nextSibling.childNodes[0].childNodes.length; i++) {
		            if (nextSibling.childNodes[0].childNodes[i].tagName == "INPUT") {
		                nextSiblingInput = nextSibling.childNodes[0].childNodes[i];
		                break;
		            }
		        }
		        
		        if (parseInt(nextSiblingInput.getAttribute("rdLevel"), 10) > targetLevel) {
		            if (nextSiblingInput.getAttribute("rdChecked") != "none")
		                return true;
		        }
		        //When we find the previous element that is either the same level or lower, we're finished
		        if (parseInt(nextSiblingInput.getAttribute("rdLevel"), 10) <= targetLevel) {
		            break;
		        }

		        nextSibling = nextSibling.nextSibling;
		    }
            /*
		    var prevSibling = currentNode.parentNode.parentNode.previousSibling;
		    while (prevSibling) {
		        var prevSiblingInput;
		        for (var i = 0; i < prevSibling.childNodes[0].childNodes.length; i++) {
		            if (prevSibling.childNodes[0].childNodes[i].tagName == "INPUT") {
		                prevSiblingInput = prevSibling.childNodes[0].childNodes[i];
		                break;
		            }
		        }
		        
		        if (parseInt(prevSiblingInput.getAttribute("rdLevel"), 10) > targetLevel) {
		            if (prevSiblingInput.getAttribute("rdChecked") != "none")
		                return true;
		        }
		        //When we find the next element that is either the same level or higher, we're finished
		        if (parseInt(prevSiblingInput.getAttribute("rdLevel"), 10) <= targetLevel) {
		            break;
		        }
		        prevSibling = prevSibling.previousSibling;
		    }*/
		    return false;
		},
        //***End Hierarchical Functions

		onCheckboxClicked: function (e) {
			var checked = [];
			var id = this._id;
            //only hit this code if its a hierarchical list
			if (e && e.currentTarget && this._isHierarchical) {
			    //Have to go forward to see if all nodes are checked
                //and then backwards to check all parent nodes (differentiated by the attribute rdLevel)
			    var targetNode = e.currentTarget._node;
                //It's been checked
			    if (targetNode.checked === true && targetNode.getAttribute("rdChecked") != "some") {
			        targetNode.setAttribute("rdChecked", "all");
			        this.setCheckboxOpacity(targetNode, "0.0");
			        this.checkAllChildren(targetNode);
                    this.checkAllParents(targetNode);
			    }
			    //it was partially checked
			    else if (targetNode.checked === false && targetNode.getAttribute("rdChecked") == "some") {
                    //Have to recheck it
			        targetNode.checked = true;
			        targetNode.setAttribute("rdChecked", "all");
			        this.setCheckboxOpacity(targetNode, "0.0");
			        this.checkAllChildren(targetNode);
			        this.checkAllParents(targetNode);
			    }
                //it was fully check and now unchecked
			    else {
			        targetNode.setAttribute("rdChecked", "none");
			        this.uncheckAllChildren(targetNode);
			        this.uncheckAllParents(targetNode);
			    }

                //Save checkbox state
			    var checkboxStateHidden = document.getElementById(id + "_rdCheckboxState");
			    if (checkboxStateHidden) {
			        var stateArray = checkboxStateHidden.value.split(",");
			        var stateString = "";
                    //Remove any possible commas from node value so it doesn't mess up string formatting
			        
			        this._inputs.each(function (node) {
			            var nodeValue = node._node.value.replace(/,/g, "");
			            stateString += node._node.getAttribute("rdLevel") + ":" + node._node.getAttribute("rdChecked") + ":" + nodeValue + ",";
			        });
			        checkboxStateHidden.value = stateString;
			    }
			}

			if (this._isHierarchical) {
			    this._inputs.each(function (node) {
			        if (node.get("checked") === true && node.get("name") === id) {
			            if (node.getAttribute("rdLeaf") == "true") {
			                checked.push(node);
			                node._node.setAttribute("rdChecked", "all");
			            }
			        }
			    });
                //Initialization specific to hierarchical
			    if (e == null) {
			        for (var i = 0; i < checked.length; i++) {
                        //Check parents of all checked nodes
			            this.checkAllParents(checked[i]._node);
			        }
                    
			    }
			}
			else {
			    this._inputs.each(function (node) {
			        if (node.get("checked") === true && node.get("name") === id) {
			            checked.push(node);
			        }
			    });
			}
			var i, caption = "", length = checked.length;
			if (this._multiple == false && e) {
				for (i = 0; i < length; i++) {
					if (checked[i] != e.currentTarget) {
						checked[i].set('checked', false);
					}
				}
				checked = [];
				length = 0;
				if (e.currentTarget.get('checked') == true) {
					checked.push(e.currentTarget);
					length = 1;
				}
			}
			if (this._checkAllIsVisible) {
			    var inputSize = this._inputs.size();
			    if (this._isHierarchical) {
			        inputSize = this._leafNodes;
			    }
                    
			    if (checked.length == inputSize) {
					this._checkAllBtn.set('checked', true);
				} else {
					this._checkAllBtn.set('checked', false);
				}
			}
			if (this._isDropdown == true) {
				for (i = 0; i < length; i++) {
					if (i > 0) {
						caption += ", ";
					}
					caption += checked[i].get('parentNode').one('span').get('text');
				}
				this.setCaption(caption, checked);
			}
			if (e && this._actions.length > 0) {
			    for (i = 0; i < this._actions.length; i++) {
					eval(this._actions[i]);
				}
			}
		},
		setCaption: function (caption, checked) {
			if (caption == "") {
				this._caption.set('text', this._noneSelectedText);
				return;
			}
			this._dropDownHandler.setStyle('position', 'absolute');
			//measure caption length
		    //	this._caption.hide();
		    //	var mSpan = Y.Node.create('<span style="visibility: hidden;">0</span>');
			//this._dropDownHandler.append(mSpan);
			//var oldHeight = mSpan.get('offsetHeight');
			//mSpan.set('text', caption);
			//var textWidth = mSpan.get('offsetWidth');
			//var newHeight = mSpan.get('offsetHeight');
			//this._dropDownHandler.removeChild(mSpan);
			//mSpan.destroy();
			//mSpan.get('parentNode').removeChild(mSpan);
			//this._caption.show();
			////calculate space for caption
			//var allowedWidth = this._dropDownHandler.get('offsetWidth') - this._img.get('offsetWidth');
			//var padding = this._caption.getX() - this._dropDownHandler.getX();
			//allowedWidth -= padding * 2;
			//if (allowedWidth > textWidth && oldHeight == newHeight) {
			//	this._caption.set('text', caption);
			//} else {
			//	this._caption.set('text', this._selectedText.replace("#", checked.length).replace("#", this._inputs._nodes.length));
			//}
			if (LogiXML.layout.getTextDimensions(caption, {}).width < LogiXML.layout.getTextDimensions("", {}, this._dropDownHandler.getAttribute("class")).width) {
			    this._caption.set('text', caption);
			} else {
			    this._caption.set('text', this._selectedText.replace("#", checked.length).replace("#", this._inputs._nodes.length));
			}
			this._dropDownHandler.setStyle('position', 'relative');
		}
    }, {
		NAME: "rdInputCheckList",
        NS: "rdInputCheckList",
        ATTRS: {}
    });
}, "1.0.0", { requires: ['base', 'plugin', 'json'] });

if (this.LogiXML === undefined) {
    this.LogiXML = {};
    this.LogiXML.rd = {};
} else if (this.LogiXML.rd === undefined) {
    this.LogiXML.rd = {};
}

//Temporary. Should be moved somewhere else.
LogiXML.rd.setInputElementListValue = function (elementId, sValue) {
	'use strict';
	var listContainer = Y.one("#" + elementId);
	if (!Y.Lang.isValue(listContainer)) {
		return;
	}
	var sValueDelimiter = listContainer.getAttribute("rdInputValueDelimiter");
	var aValues = sValue.split(sValueDelimiter);
	var listItems = listContainer.all('[id^=' + elementId + '_rdList]');
	var i, listLength = listItems.size(), listItemType = "";
	for (i = 0; i < listLength; i++) {
	    listItemType = listItems.item(i).getAttribute('type');
		switch (listItemType) {
		case "checkbox":
			if (Y.Array.indexOf(aValues, listItems.item(i).get('value')) != -1) {
				listItems.item(i).set('checked', true);
			}
			break;
		}
	}
};




