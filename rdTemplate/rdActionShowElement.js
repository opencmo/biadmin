var rdParentPopupPanel;    // Variable to hold the parent PopUp object. Used in case of a Calendar and AddBookmark.

function ShowElement(sParentId,sElementId,sAction,sEffect) {
    if(sElementId == null) return;
    if(sElementId.tagName) {
        // sElementId is actually an element object.
        rdShowSingleElement(sElementId,sAction,sEffect)

    }else {
	    var sIds = sElementId.split(",")
	    for (k=0; k < sIds.length; k++) {

            var sId = Y.Lang.trim(sIds[k]);
            
            var sCurrAction = sAction
            if(sId.split(":").length==2){
                //The action is in the element ID.
                sCurrAction = sId.split(":")[1]
                sId = sId.split(":")[0]
            }
            
            //When in a data table, the sParentID will have a row number.
            //It gets appended to the ID of the element so that only that row is affected.
            //Adjust the indexOf value to look for the lastIndexOf in case the user has placed _Row
            //as part of the ID.
            if (sParentId) {
                if (sParentId.lastIndexOf("_CtCol") != -1) {
                    //For crosstab columns:
                    var idSuffix = sParentId.substr(sParentId.lastIndexOf("_CtCol"))
                    //idSuffix = idSuffix.substr(0,col.indexOf("_Row")) 
                    if (sId.indexOf(idSuffix) == -1) {
                        sId = sId + idSuffix
                    }
                }else if(sParentId.lastIndexOf("_Row") != -1) {
                    //For rows in tables"
                    var idSuffix = sParentId.substr(sParentId.lastIndexOf("_Row"))
                    if (sId.indexOf(idSuffix) == -1) {
                        sId = sId + idSuffix
                    }
                }
            }
            var c = document.getElementById(sId);
            if(c==null){
                if (sId.indexOf("_Row") != -1){
                    c = document.getElementById(sId.substr(0,sId.lastIndexOf("_Row")));
                    if(c==null){    //#15227.
                        if(sId.indexOf("_CtCol") != -1){
                            c = document.getElementById(sId.substr(0,sId.lastIndexOf("_CtCol")));
                        }
                    }
                }
            }
            if(c){
                if(!sElementId.match('PPDatePickerForInputDate') && !sElementId.match('PPTimePickerForInputTime')){
                    if(c.getAttribute('rdPopupPanel') == 'True') 
                        rdParentPopupPanel = c;    //#11760.
                }
                else{   // Fix to make the new Calendar PopUp from a PopUpPanel, #11924.
                    if(rdParentPopupPanel){
                        var rdCurrPopupPanelObj = c.parentNode;
                        if(rdCurrPopupPanelObj){
                            while(rdCurrPopupPanelObj){
                                if(rdCurrPopupPanelObj != rdParentPopupPanel){
                                    rdCurrPopupPanelObj = rdCurrPopupPanelObj.parentNode;
                                }
                                else{
                                    if(rdCurrPopupPanelObj.firstChild.id.match('rdPopupPanelTable')){
                                        if(rdCurrPopupPanelObj.parentNode)  
                                            rdCurrPopupPanelObj.parentNode.appendChild(c);  // Add the new sibling as a child to the parent of the already popped out Div.                              
                                    }
                                    break;
                                }
                            }                
                        }
                    }
                    if(sAction.toLowerCase() != 'hide'){    //#14844.
                        var eleHiddenParent = c.parentNode;
                        while(eleHiddenParent != null){                        
                            if(eleHiddenParent.style){
                                if(eleHiddenParent.style.display == 'none'){
                                    eleHiddenParent.parentNode.appendChild(c);
                                    break;
                                }
                            }
                            eleHiddenParent = eleHiddenParent.parentNode;
                        }
                    }
                }
            }
		    
            if (c != null ) {
			 if (rdParentPopupPanel != null){
                if (rdParentPopupPanel.getAttribute('id') == c.getAttribute('id') && sCurrAction.toLowerCase() == 'hide') {     //21889
                    for (g = 0; g < rdParentPopupPanel.parentNode.children.length; g++) {
                        var childElement = rdParentPopupPanel.parentNode.children[g];
                        if (childElement.id.match('PPDatePickerForInputDate') || childElement.id.match('PPTimePickerForInputTime')) {
                            rdShowSingleElement(childElement, sCurrAction, childElement.id, sEffect);
                        }
                    }
                }
				}
                rdShowSingleElement(c, sCurrAction, sId, sEffect);
                if (Y.Lang.isValue(Y.LogiXML)) {
                    if (Y.Lang.isValue(Y.LogiXML.rdInputCheckList) && c.id.indexOf("checkboxToggle") > 0 && k == 1) {
                        rdSaveCheckboxListState(c);
                    }
                }
   		    }
    	
	    } //Next ID.
	}
	
	if (typeof window.rdRepositionSliders != 'undefined') {
		//Move CellColorSliders, if there are any.
		rdRepositionSliders()
	}
}

function rdShowSingleElement(c,sAction,sId,sEffect) {
	if (Y.Lang.isValue(LogiXML)) {
		if (c.getAttribute("rdPopupPanel") == 'True' && !Y.Lang.isValue(LogiXML.PopupPanel.rdShowPopupPanel))
			setTimeout(function() { rdShowSingleElement(c,sAction,sId,sEffect); }, 100);
		else		
			_rdShowSingleElement(c,sAction,sId,sEffect);
	}
	else
		setTimeout(function() { rdShowSingleElement(c,sAction,sId,sEffect); }, 100);
}

function _rdShowSingleElement(c,sAction,sId,sEffect) {
    //Show a single element.  "c" is the element itself.
	if(c.nodeName == "COL" && navigator.product == "Gecko" && navigator.productSub && navigator.productSub > "20041010" && (navigator.userAgent.indexOf("rv:1.8") != -1 || navigator.userAgent.indexOf("rv:1.9") != -1)) {
		//Allow table column hiding for Mozilla.
		c.style.display=""
		if (sAction=="Show"){
			c.style.visibility="";
		}else if (sAction=="Hide") {
			c.style.visibility="collapse";
		} else {
			c.style.visibility=(c.style.visibility=="" ? "collapse":"");  //Toggle.
		}
	} else {
		if (sAction=="Show"){
			c.style.display="";
		}else if (sAction=="Hide") {
		    c.style.display = "none";

		} else {
		    c.style.display = (c.style.display == "" ? "none" : "");

		}
	}
	
	if (sId) {
	    if (c.getAttribute("id")!="popupFilter" && c.getAttribute("rdNoElementShowHistory") != "True") { //Special case for this DG element and #14008.
	        var windowCurr = window
	        while (windowCurr) {
	            try {
	                var rdShowElementHistory = windowCurr.document.getElementById("rdShowElementHistory")
	                if (rdShowElementHistory) {
                        //20257
	                    var sOldState = sId + "=Hide,";
	                    rdShowElementHistory.value = rdShowElementHistory.value.replace(sOldState, "");
	                    sOldState = sId + "=Show,";
	                    rdShowElementHistory.value = rdShowElementHistory.value.replace(sOldState, "");

	                    rdShowElementHistory.value = rdShowElementHistory.value + sId + "=" + (c.style.display == "" ? "Show" : "Hide") + ","
    		        }
    		        try {
                        //If there's a parent, this is running as an IFRAME.  Add this shown element to the parent's ShowElementHistory. #6634
                        if (windowCurr.frameElement) {
                            windowCurr = windowCurr.parent
                        }else{
                            windowCurr = null
                        }
                    }
                    catch(e){
	                    windowCurr = null
	                    }
                    finally {}
	            }
                catch(e){
                    windowCurr = null
                    }
                finally {}
            }
        }
	}
	
	if (c.style.display != "none") {
       if (sEffect=="FadeIn" || typeof rdUseFadeIn != "undefined") {
	        rdFadeElementIn(c,250)
	    }
		
		//Special handling for any IFrame subelements.
		//Set the SRC attribute of all subordinate IFrames so that the requested pages are downloaded now.
		Y.each(Y.one(c).all('iframe'), function(nodeFrame) {			
			if (LogiXML.isNodeVisible(nodeFrame)) {						
				var sSrc = nodeFrame.getData("hiddensource");
				if (Y.Lang.isValue(sSrc) 
				&& (nodeFrame.getDOMNode().getAttribute("src") != sSrc)) {
					if (Y.Lang.isValue(LogiXML.WaitPanel.pageWaitPanel))
							LogiXML.WaitPanel.pageWaitPanel.showFrameWait(nodeFrame);
							
					nodeFrame.set('src', sSrc + '&rdRnd=' + Math.floor(Math.random() * 100000));				
				}				 				
			}
		});
		
		if (c.getAttribute("rdPopupPanel")=="True") {            
            LogiXML.PopupPanel.rdShowPopupPanel(c)
            if(rdRepositionPopupPanel){ //#12931.
                rdRepositionPopupPanel(c, c.offsetHeight, c.offsetWidth, 1);
            }
		}

	    //Special for Bookmark renames and IE. 18917
		if (sId.indexOf("Bookmark") != -1) {
		    var nRowSuffixPos = sId.lastIndexOf("_Row")
		    if (nRowSuffixPos != -1) {
		        var sRowSuffix = sId.substr(nRowSuffixPos)
		        var eleBookmarkDesc = document.getElementById("txtEditBookmarkDescription" + sRowSuffix)
		        if (eleBookmarkDesc) {
                    try {
		                eleBookmarkDesc.focus(); eleBookmarkDesc.focus() //Set the focus twice to fix the input field.
                    }
		            catch (e) { }
		        }
		    }
		}

		if ( Y.Lang.isValue(Y.rdSlider) )
            rdShowHiddenInputSliders(c);        

    } else {  //Hiding    
        if (c.getAttribute("rdPopupPanel")=="True") {
            rdHidePopupPanelAndModalShade(c);
            Y.one('body').detach('keydown', rdHidePopupPanelOnEscKeyPress); 
        }
	}

	//More special IFrame handling.  If this page is in a frame,
	//the frame needs to be resized from the parent window.
	try {
	    if (frameElement) {
		    if (frameElement.contentWindow) {
			    if (parent.iframeResize) {
			        if(c.style.display == 'none'){
			            parent.iframeResize(frameElement, "OptionalParam")  //#12347.
			        }else{
			            parent.iframeResize(frameElement)
			        }				    
			    }
		    }
	    }
    }
    catch(e){}

}

function rdShowElementsFromHistory() {
	var hiddenShowElementHistory = document.getElementById("rdShowElementHistory")
	if (hiddenShowElementHistory) {
		var sHistory = hiddenShowElementHistory.value
		var sEvents = sHistory.split(",")
		for (var i=0; i < sEvents.length; i++) {
			var sElementID = sEvents[i].split("=")[0]
			var sAction = sEvents[i].split("=")[1]
			if (document.getElementById(sElementID)) {
			    if (document.getElementById(sElementID).className.indexOf("rdDataCalendarPopUp") == -1) {
			        ShowElement(null, sElementID, sAction)
			    }
			}
		}
		hiddenShowElementHistory.value = sHistory
	}
}

function rdColumnDisplayVisibility() {
	if(navigator.product == "Gecko" && navigator.productSub && navigator.productSub > "20041010" && (navigator.userAgent.indexOf("rv:1.8") != -1 || navigator.userAgent.indexOf("rv:1.9") != -1)) {
		var cCols = document.getElementsByTagName("COL")
		for (var i=0; i < cCols.length; i++) {
		    if (cCols[i].style.display == "none") {
			    cCols[i].style.display = null
			    cCols[i].style.visibility = "collapse"
		    }
		}
	}
}

function rdFadeElementIn(ele, nDuration){
    var node = Y.one(ele);
	node.setStyle('opacity', '0');		
	node.show();
	
	node.transition({
		duration: nDuration / 1000,
		opacity: {
					'value' : 1,
					'easing': 'ease-in'
		}
	});
}

function rdFadeElementOut(ele, nDuration){
   var node = Y.one(ele);
		
	node.transition({
		duration: nDuration / 1000,
		opacity: {
					'value' : 0,
					'easing': 'ease-in'
		}
	}, function() {
		this.hide();
	});		
}

function rdFindPosX(obj)
  {
    var curleft = 0;
    if (obj) {
        if(obj.offsetParent)
            while(1) 
            {
              curleft += obj.offsetLeft;
              if(!obj.offsetParent)
                break;
              obj = obj.offsetParent;
            }
        else if(obj.x)
            curleft += obj.x;
    }
    return curleft;
  }

function rdFindPosY(obj)
  {
    var curtop = 0;
    if (obj) {
        if(obj.offsetParent)
            while(1)
            {
              curtop += obj.offsetTop;
              if(!obj.offsetParent)
                break;
              obj = obj.offsetParent;
            }
        else if(obj.y)
            curtop += obj.y;
    }
    return curtop;
}

function rdSaveCheckboxListState(c) {
    var inputNode = c.parentNode.parentNode.nextSibling;
    var parentID = inputNode.id.split("_rdList")[0];

    var rdExpandCollapseHistory = document.getElementById(parentID + "_rdExpandedCollapsedHistory")
    var sOldState = "," + inputNode.id + ":expanded";
    rdExpandCollapseHistory.value = rdExpandCollapseHistory.value.replace(sOldState, "");
    sOldState = "," + inputNode.id + ":collapsed";
    rdExpandCollapseHistory.value = rdExpandCollapseHistory.value.replace(sOldState, "");

    if (inputNode.getAttribute("rdExpanded") == "true") {
        var parentID = inputNode.id.split("_")[0];
        rdExpandCollapseHistory.value = rdExpandCollapseHistory.value + "," + inputNode.id + ":collapsed";
        inputNode.setAttribute("rdExpanded", "false");
    }
    else {
        var parentID = inputNode.id.split("_")[0];
        rdExpandCollapseHistory.value = rdExpandCollapseHistory.value + "," + inputNode.id + ":expanded";
        inputNode.setAttribute("rdExpanded", "true");
    }
    Y.LogiXML.rdInputCheckList.prototype.expandCollapseChildren(inputNode);
}