var req;

var sCurrentRequestParams = ""
var bSubmitFormAfterAjax = false
//20295
var sPrevRadioId

function rdAjaxRequest(commandParams, bValidate, sConfirm, bProcess, fnCallback, waitCfg,isUpload) {
	if (commandParams.search("rdRequestForwarding=Form") != -1) {
		rdAjaxRequestWithFormVars(commandParams, bValidate, sConfirm, bProcess);
		return;
	}
	
	if(commandParams.indexOf('rdDataTablePaging') != -1){  //Ajax Paging. 20543
	    var aCommandParams = commandParams.split('&');
	    var sDataTableId='';
	    var sDivPagingWait = 'divPagingWait_';  //#18021.
	    for(i=0;i<aCommandParams.length;i++){
	        if(aCommandParams[i].indexOf('rdRefreshElementID') > -1){
	            sDataTableId = aCommandParams[i].replace('rdRefreshElementID=', '');
	            sDivPagingWait += sDataTableId;
	            break;
	        }
	    }
	    if(!Y.Lang.isNull(Y.one('#'+ sDivPagingWait))){ //#18271.
	        Y.one('#'+ sDivPagingWait).show();  //#18080.
	    }
	}

	if (bValidate) {
		if (bValidate.length != 0) {
	        if (bValidate == "true") {
		        var sErrorMsg = rdValidateForm()
		        if (sErrorMsg) {
		            alert(sErrorMsg); //19817
		            return;
		        }
            }
        }
	}
	if (sConfirm) {
		if (sConfirm.length != 0) {
			if (!confirm(sConfirm)) {
				return;
			}
		}
	}
	
	var sUrl = "rdTemplate/rdAjax/rdAjax.aspx";
	if (window.location.href.indexOf("rdWidget") > -1) {
        if (window.location.href.indexOf("/rdTemplate")>-1) {
            sUrl = window.location.href.substring(0, window.location.href.indexOf("/rdTemplate")+1) + sUrl;
        } else {
            sUrl = "../../" + sUrl;
        }
    }

	if (bProcess) {
		if (bProcess.length != 0) {
	        if (bProcess == "true") {
	            sUrl = "rdProcess.aspx";
            }
        }
	}
   
    if (sCurrentRequestParams.length > 0) {		
        if (commandParams.indexOf('rdRET=True') != -1 && sCurrentRequestParams == commandParams) { //16442
            return; //We're still processing this request, no need to resend.
        } else {
            //21216
            setTimeout(function () {
                rdAjaxRequest(commandParams, bValidate, sConfirm, bProcess, fnCallback, waitCfg)
            }, Math.floor(Math.random() * 1000));  //Wait a random amount of time between 0 and 1 second.
            return;    
        }
    }
    sCurrentRequestParams = commandParams;
    rdShowAjaxFeedback(true,commandParams);
	
    //Show ajax wait panel
    var tTimeout;
    if (waitCfg != null) {
        //22236
        if (Y.Lang.isValue(LogiXML.WaitPanel.pageWaitPanel)) {
            LogiXML.WaitPanel.pageWaitPanel.readyWait();
            tTimeout = new Timeout(function () { LogiXML.WaitPanel.pageWaitPanel.showWaitPanel(waitCfg) }, 1000);
        }
	}

    var wrappedSuccess;
    if (Y.Lang.isFunction(fnCallback)) {
        wrappedSuccess = Y.rbind( handleSuccess, window, fnCallback );
    }
    else {
        wrappedSuccess = handleSuccess;
    }

	try {		
	    /* Configuration object for POST transaction */

		var cfg = {
			method: "POST",
			data: commandParams,			
			on: {
			    success: wrappedSuccess,
			    failure: handleFailure
			},
			arguments: {
			    timeoutID: tTimeout
			}
		};
		if (isUpload) {
		    cfg = {
		        method: "POST",
		        data: commandParams,
		        form: {
		            id: document.rdForm,
		            upload: true
		        },
		        on: {

		            complete: wrappedSuccess,
		            failure: handleFailure
		        },
		        arguments: {
		            timeoutID: tTimeout
		        }
		    };
	    }
	    req = Y.io(sUrl, cfg);
	}
	catch (e) {
	    commandParams = commandParams.replace('rdAjaxCommand', 'rdAjaxAbort')
	    if (Y.Lang.isValue(tTimeout)) {
	        tTimeout.clear();
	    }
		window.open(sUrl + "?" + commandParams,'_self')
	}
}

var handleSuccess = function(id, o, args){
    if(o.responseText !== undefined) {
        rdUpdatePage(o.responseXML, o.responseText);
            var fnCallback = arguments[arguments.length - 1];
            if ( typeof fnCallback === 'function' ) {
                fnCallback();
            }
    }
    if (Y.Lang.isValue(args.timeoutID)) {
        args.timeoutID.clear();
    }
};

var handleFailure = function (id, o, args) {
    if (o.responseText != undefined) {
        if (o.responseText.length > 0) {  //18557
		document.write(o.responseText); //9390
	}
    } //Otherwise, the user likely left this page.15770
    if (Y.Lang.isValue(args.timeoutID)) {
        args.timeoutID.clear();
    }
}

//21896 & 22052 - Refresh with wait panel hangs forever
//Wrapped refresh and call the clear() on handleSuccess and handleFailure in order to clear it.
function Timeout(fn, nInterval) {
    var sTimeoutID = setTimeout(fn, nInterval);
    this.cleared = false;
    this.clear = function () {
        this.cleared = true;
        window.clearTimeout(sTimeoutID);
    };
}

function rdAjaxRequestWithFormVars(commandURL, bValidate, sConfirm, bFromOnClick, bProcess, fnCallback, waitCfg) {
    //Build the request URL.
    if (commandURL.indexOf("RequestRealTimeAnimatedChartData") > 0)
        commandURL = commandURL + "&rdAnimatedChartRenderer=" + FusionCharts.getCurrentRenderer(); //19845.

    if (bFromOnClick) 
        commandURL = decodeURIComponent(commandURL)  //onClick and other events need decoding.#6549 and 	
	
	//Form vars:
    var sCheckboxName;
    var frm = document.rdForm
    var isUpload = false
    var uploadUrlParams = commandURL
	if (!frm) {
	    return  //The debug page is likely the current document.
	}

	var checkboxChildrenIndexes = [];
    
	for (var i=0; i < frm.elements.length; i++) { 
	    var ele = frm.elements[i]
	    
	    if (checkboxChildrenIndexes.indexOf(i) >= 0)
	        continue;

	    if (!ele.type) {
            continue;  //Not an input element.
	    }
        
	    if (ele.type == "file" && ele.getAttribute("data-ajax-upload") == "True") {
	        if (ele.value != "") {
	            var ext = ele.value.split('.')[1];
	            if (!ele.value.match('(jpg|JPG|gif|GIF|png|PNG)$')) {
	                alert('Wrong filetype!');
	                return;
	            }
	            var sInputValue = rdGetInputValues(ele)
	            if (uploadUrlParams.indexOf(sInputValue) == -1)
	                uploadUrlParams += sInputValue;
	            isUpload = true;
	        }
	    } else {

	        //19345
	        /*if (commandURL.indexOf("rdAjaxCommand=RefreshElement") != -1) {
                if (ele.name.indexOf("_Row") != -1) {
                    continue;  //Don't forward elements in tables for RefreshElements.
                }
            }*/

	        if (ele.name.lastIndexOf("-PageNr") != -1)
	            if (ele.name.lastIndexOf("-PageNr") == ele.name.length - 7)
	                continue;  //Don't forward the interactive page nr.			

	        //This parameter will always be set server side, it causes issues if we add it. 22188
	        if (ele.name == "rdDataTablePaging")
	            continue;

	        //Don't forward security stuff - it's already in session vars.
	        if (ele.name == "rdUsername") continue;
	        if (ele.name == "rdPassword") continue;
	        if (ele.name == "rdFormLogon") continue;

	        //Don't forward a variable that's already in the list, perhaps from LinkParams.
	        if (commandURL.indexOf("&" + ele.name + "=") != -1) continue;

	        //Sometimes there may be duplicate parameters in the command.  This prevents duplicates. 21117
	        //22591 - Refactored. rdGetInputValues cannot be run twice in a row without changes. The second run will return Null.
	        var sInputValue = rdGetInputValues(ele)
	        if (commandURL.indexOf(sInputValue) == -1)
	            commandURL += sInputValue;

            //24111 24167
	        if (ele.id && ele.id != "" && Y.Lang.isValue(Y.one("#" + ele.id))){
	            if(Y.Lang.isValue(Y.one("#" + ele.id).ancestor("div")) && Y.one("#" + ele.id).ancestor("div").getAttribute("data-checkboxlist")) {
	                var id = Y.one("#" + ele.id).ancestor("div").getAttribute("id");
	                for (var j = 0; j < frm.elements.length; j++) {
	                    if (frm.elements[j].id.indexOf(id + "_rdList") >= 0) {
	                        checkboxChildrenIndexes.push(j);
	                    }
	                }
	            }
	        }

	    }
	}

	if (isUpload) {
	    commandURL = uploadUrlParams;
	}
    //20295
	sPrevRadioId = "";

	commandURL = commandURL.replace("rdRequestForwarding=Form","")  //Don't come back here.
	
	rdAjaxRequest(commandURL, bValidate, sConfirm, bProcess, fnCallback, waitCfg,isUpload)
}


function rdAjaxEncodeValue(sValue){
    sValue = encodeURI(sValue)
    sValue = sValue.replace(/&/g,"%26")  //replace &
    sValue = sValue.replace(/\+/g,"%2B") //replace +
    return sValue
}

function rdUpdatePage(xmlResponse, sResponse) {	
            
    if (sResponse.length != 0) {
	    if (sResponse.indexOf("rdDebugUrl=")!=-1) { 
	        rdReportResponseError(sResponse)
	        return
	    }		
	    if (sResponse.indexOf("rdSecureKeyFailure='True'") > 0 || sResponse.indexOf("rdAuthSessionFailure='True'") > 0 || sResponse.indexOf("rdErrorAjaxRedirect='True'") > 0) { // 14518, 21430
	            if (window.DOMParser)
	            {
	                parser = new DOMParser();
	                var xmlDoc = parser.parseFromString(sResponse, "text/xml");
	                var action = xmlDoc.getElementsByTagName("form")[0].getAttribute("Action");
	                window.location = action;
	            }
	            else // Internet Explorer
	            {
                    var xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
	                xmlDoc.async = false;
	                xmlDoc.loadXML(sResponse);
	                var action = xmlDoc.getElementsByTagName("form")[0].getAttribute("Action");
	                window.location = action;
	            }
	        rdReportResponseError(sResponse)
	        return
	    }
	    if (sResponse.indexOf("rdErrorAjaxMissingRedirect='True'") > -1) { //21430
	        var sResp = sResponse.replace("rdErrorAjaxMissingRedirect='True'", "");
	        sResp = sResp.replace("True", "");
	        window.document.write(sResp);
	        return;
	    } 
	    
	    if (!xmlResponse) {
	        rdReportResponseError(sResponse)
            sCurrentRequestParams = "";
	        return
	    }		
	    if (!xmlResponse.documentElement) {
	        rdReportResponseError(sResponse)
	        return
	    }		
	    if (!xmlResponse.documentElement.getAttribute("rdAjaxCommand")){
	        rdReportResponseError(sResponse)
	        return
	    }
        //18808 19450 put all & back in the string response
	    sResponse = sResponse.replace(/_rdamp_/g, "&");
	    sResponse = sResponse.replace(/_rdlt_/g, "<");
	    sResponse = sResponse.replace(/_rdgt_/g, ">");
	    window.status =""		
	    switch (xmlResponse.documentElement.getAttribute("rdAjaxCommand")) {

		        case 'RefreshElement':		            
                    //AJAX Paging 20543
		            var isDataTablePaging = xmlResponse.documentElement.getAttribute('id')
		            var rdValidateFormText = sResponse.substring(sResponse.indexOf("function rdValidateForm()"), sResponse.indexOf("</SCRIPT>", sResponse.indexOf("function rdValidateForm()")));
		            if (window.rdValidateForm) {
		                var strrdValidateForm = rdValidateForm.toString();
		                strrdValidateForm = strrdValidateForm.substring(strrdValidateForm.indexOf("{") + 1, strrdValidateForm.length - 1);
		                strrdValidateForm += rdValidateFormText.substring(rdValidateFormText.indexOf("{") + 1, rdValidateFormText.length -1);
		                rdValidateForm = new Function(strrdValidateForm);
		            }

				    if (isDataTablePaging && isDataTablePaging.indexOf("rdDataTableDiv") > -1) {
				        //Find the HTML TABLE's DIV.
				        var sTableDivID = xmlResponse.documentElement.getAttribute('id')
				        var eleTableDiv = document.getElementById(sTableDivID)
				        if (eleTableDiv) {
				            //Write the response html to the page, replacing the original table.
				            replaceHTMLElement(eleTableDiv, sResponse, eleTableDiv.id);
				        }
				    }
                    else{
					    var sElementIDs = xmlResponse.documentElement.getAttribute('rdRefreshElementID').split(",")
					    for (var i = 0; i < sElementIDs.length; i++) {
					        var eleOld = document.getElementById(sElementIDs[i])

					        if (eleOld) {
					            //Write the response html to the page, replacing the original html
					            var sNewHtml = replaceHTMLElement(eleOld, sResponse, sElementIDs[i]);



					            // Did we replace the content's of Dashboard Panel?
					            var node = Y.one('#' + sElementIDs[i]);
					            var panelContainer = node.ancestor('div.rdDashboardPanel');
					            if (node.hasClass('panelBody') || (!Y.Lang.isNull(panelContainer) && node.getAttribute('src').indexOf('rdChart2.aspx') != -1)) {
					                var nodeFreeformLayout = Y.one('#rdFreeformLayout');
					                if (!Y.Lang.isNull(nodeFreeformLayout)) {
					                    node.setStyle('cursor', 'auto');
					                    if (node.getAttribute('src').indexOf('rdChart2.aspx') != -1) {
					                        node.setAttribute('className', 'dashboardChart');   //#18970.
					                    }
					                    LogiXML.Dashboard.FreeForm.initializePanel(panelContainer);
					                }
					            }

					            //if (sElementIDs[i].indexOf('rdDashboardParamsID-') > -1) {
					            //    var sPanelIdWithGuid = sElementIDs[i].replace('rdDashboardParamsID', '');
					            //    var eleElementsToHideOnParamsCancel = document.getElementById('rdElementsToHideOnParamsCancel' + sPanelIdWithGuid);
					            //    ShowElement(null, eleElementsToHideOnParamsCancel.value, 'Toggle');
					            //}
					            // Animated Charts.
					            if (eleOld.getAttribute('id').match('rdAnimatedChart')) {
					                if (xmlResponse.text) {   //IE.
					                    if (xmlResponse.text.toString().match('rdLoadAnimatedChart'))
					                        rdRerenderAnimatedChart(xmlResponse.text.substring(xmlResponse.text.indexOf('rdLoadAnimatedChart'), xmlResponse.text.length), eleOld);
					                }
					                else {   //FF, Chrome.
					                    if (xmlResponse.documentElement.textContent.toString().match('rdLoadAnimatedChart'))
					                        rdRerenderAnimatedChart(xmlResponse.documentElement.textContent.substring(xmlResponse.documentElement.textContent.indexOf('rdLoadAnimatedChart'), xmlResponse.documentElement.textContent.length), eleOld);
					                }
					            }
					            // Fusion Maps.
					            if (eleOld.getAttribute('id').match('rdFusionMap')) {
					                if (xmlResponse.text) {   //IE.
					                    if (xmlResponse.text.toString().match('rdLoadFusionMap'))
					                        rdRerenderAnimatedMap(xmlResponse.text.substring(xmlResponse.text.indexOf('rdLoadFusionMap'), xmlResponse.text.length), eleOld);
					                }
					                else {   //FF, Chrome.
					                    if (xmlResponse.documentElement.textContent.toString().match('rdLoadFusionMap'))
					                        rdRerenderAnimatedMap(xmlResponse.documentElement.textContent.substring(xmlResponse.documentElement.textContent.indexOf('rdLoadFusionMap'), xmlResponse.documentElement.textContent.length), eleOld);
					                }
					            }

					            if (eleOld.getAttribute("rdPopupPanel") == "True") {
					                //PopupPanel is getting re-hidden with Action.Refresh.  If it was modal, get rid of the shading.
					                var rdModalShade = rdGetModalShade(document.getElementById(sElementIDs[i]));
					                if (rdModalShade != null) {
					                    rdModalShade.style.display = "none"
					                }
					            }

					            //Tab panels need to get re-hidden and re-shown.
					            if (sElementIDs[i].indexOf("rdTabPanel_") == 0) {
					                var eleActiveTab = document.getElementById(sElementIDs[i])
					                var eleTabs = eleActiveTab.parentNode
					                for (var i = 0; i < eleTabs.childNodes.length; i++) {
					                    if (eleTabs.childNodes[i].id == eleActiveTab.id) {
					                        eleTabs.childNodes[i].style.display = ""
					                    } else {
					                        eleTabs.childNodes[i].style.display = "none"
					                    }
					                }
					            }
					        }
					    }
				    }
				  
		            //Checkbox List on Ajax call needs to be initialized 18993
					if (sResponse.indexOf("data-checkboxlist") > 0) {
					    var list = xmlResponse.getElementsByTagName("div");
					    for (var i = 0; i < list.length; i++) {
					        if (list[i].getAttribute('data-checkboxlist')) {
					            var id = list[i].getAttribute('id');
					            if (Y.Lang.isValue(Y.LogiXML)) {
					                Y.one('#' + id).plug(Y.LogiXML.rdInputCheckList);
					            }
					        }
					    }
					}

					break;
					
				case 'CalendarRefreshElement':  // Block added to support the Ajax refresh for the calendar element
					var sElementIDs = xmlResponse.documentElement.getAttribute('rdCalendarRefreshElementID').split(",")
					for (var i=0; i <  sElementIDs.length; i++) { 						
						var sElementID = sElementIDs[i]; 
						eleOld = document.getElementById(sElementID)

						if (eleOld) {
						
							var sNewHtml;
							
							if ((eleOld.tagName.toUpperCase() != "INPUT"))
								sNewHtml = replaceHTMLElement(eleOld, sResponse, sElementID);
																			
							if(sNewHtml){
							    var eleNew = document.getElementById(sElementID)
								if (eleNew.getAttribute("rdElementIdentifier")=="Calendar"){
								    //20252
								    //	rdOnloadColoring(eleNew.getAttribute("id"));
									rdOnLoadJavascriptAddition(eleNew.getAttribute("id"));
								}
								if (eleNew.getAttribute("id").match("TableForInputTime")){
									rdResizeAMPMTable();
									rdNeedForSecondsDisplay();
									rdLoadInputTimeDefaultValue();
								}   
							}   
                        }
					}
					break;
					
				case 'UpdateMapImage':
				    //Used by AWS Map Images
					var sImageID = xmlResponse.documentElement.getAttribute('id')
					var eleImage = document.getElementById(sImageID)
					if (eleImage) {
					    //Update the image SRC.
		                var sImageSrc = xmlResponse.documentElement.getAttribute('rdSrc')
		                eleImage.setAttribute("src",sImageSrc)
                    }
                    break;



				case 'RequestRefreshElement':
				    //Request back to the server so that just this element is refreshed.
					var sElementID = xmlResponse.documentElement.getAttribute('ElementID')
					var sReport = xmlResponse.documentElement.getAttribute('rdReport')
					var sRefreshDashboard = Y.Lang.isNull(xmlResponse.documentElement.getAttribute("rdRefreshDashboard")) ? '' : xmlResponse.documentElement.getAttribute("rdRefreshDashboard");
					rdAjaxRequest('rdAjaxCommand=RefreshElement&rdRefreshElementID=' + sElementID + '&rdReport=' + sReport + 'rdRequestForwarding=Form' + '&rdRefreshDashboard=' + sRefreshDashboard);
					break;
 
				case 'RequestRefreshPage':
				    window.location.href = window.location.href;
					break;

		        case 'RunJavascript':
		            var scriptString = xmlResponse.documentElement.getAttribute("Script");  //18808 19450
		            scriptString = scriptString.replace(/_rdamp/g, "&");
		            scriptString = scriptString.replace(/_rdlt_/g, "<");
		            scriptString = scriptString.replace(/_rdgt_/g, ">");
		            eval(scriptString);
					break;
					
				case 'ShowElement':
				    ShowElement(null,xmlResponse.documentElement.getAttribute("ElementID"),xmlResponse.documentElement.getAttribute("Action"));
					break;

		    case 'ShowStatus':
		        window.status = xmlResponse.documentElement.getAttribute("Status")

                if (xmlResponse.documentElement.getAttribute("Alert")) {
		            alert(xmlResponse.documentElement.getAttribute("Alert"));
		        }
				    
				//Hide the popup when status returns.
				if (typeof(rdEmailReportPopupId) != 'undefined') {  
				    if (rdEmailReportPopupId != null) {   
                        ShowElement(null,rdEmailReportPopupId,'Hide')
                        rdEmailReportPopupId = undefined
                    }
				}

		    case "RequestRealTimeAnimatedChartData":
		        //do nothing                   
				break;
					
		}

        //17343. Moved call to rdAjaxRunOnLoad() to come before the 'reinitialize' event is fired.
        //If the scripts evaluated by rdAjaxRunOnLoad() attach handlers for the 'reinitialize'
        //event the scripts need to be run before the event is fired.
        //
        //May need to run some script.
        rdAjaxRunOnLoad(xmlResponse)   
		
		LogiXML.Ajax.AjaxTarget().fire('reinitialize');
	
		if (typeof window.rdRepositionSliders != 'undefined') {
			//Move CellColorSliders, if there are any.
			rdRepositionSliders()
		}		
    }

    //23492
    var bStopFeedback = true

    if (sCurrentRequestParams.indexOf("rdDontUndoFeedback=True") >= 0) {
        var bStopFeedback = false;
    }
        
	
	sCurrentRequestParams = ""
	bSubmitFormAfterAjax = false
	
	//Hide wait panel
	if (Y.Lang.isValue(LogiXML.WaitPanel.pageWaitPanel)) {
		LogiXML.WaitPanel.pageWaitPanel.cancelWait();
		LogiXML.WaitPanel.pageWaitPanel.hideWaitPanel();	
	}
	
    //Manage feedback.

	if (xmlResponse.documentElement.getAttribute("rdAjaxCommand")){
	    if (xmlResponse.documentElement.getAttribute("rdAjaxCommand").indexOf("Request")!=-1) { 
	        //Keep feedback going if we're making another request with RequestRefreshElement or RequestRefreshPage.
	        bStopFeedback = false
        }
	}

    if (bStopFeedback) 
	    rdShowAjaxFeedback(false);
}

function replaceHTMLElement(eleOld, sResponse, newElementID) {
	var newYuiNode, placeHolder,
		oldYuiNode = Y.one( eleOld );
	
	//Find the new element's text.
    var sNewHtml;
    var nIdStart = sResponse.indexOf(" id=\"" + newElementID + "\"");
    if (nIdStart === -1)
         nIdStart = sResponse.indexOf(" ID=\"" + newElementID + "\"");
    if (nIdStart === -1) 
        return null; //error.
    var nEleStart = sResponse.substring(0,nIdStart).lastIndexOf("<");
    sNewHtml = sResponse.substring(nEleStart)
    //We have the start of the element.  Find its end.
    var nNextStart;
    var nNextClose;
    var nNextEnd;
    var nPos = 1;
    var nDepth = 1;
    var bLookForEnds = true
    while (nDepth > 0) {
        nNextStart = sNewHtml.indexOf("<",nPos);
        nNextClose = sNewHtml.indexOf("</",nPos);
        if (bLookForEnds) {
            nNextEnd = sNewHtml.indexOf("/>",nPos);
            if (nNextEnd == -1){
                bLookForEnds = false  //Save time by not looking for these rare formats: <x ... />
            }
        }
        if (nNextEnd != -1 && nNextEnd < nNextStart) {
            // "/>" found.
            nDepth -= 1;
            nPos = nNextEnd + 2;
        }else if (nNextStart == nNextClose) {
            // "</" found.
            nDepth -= 1;
            nPos = nNextClose + 2;
        }else if(nNextStart != -1 && nNextStart < nNextClose) {
            // "<" found.
            nDepth += 1;
            nPos = nNextStart + 1;
        }else{
            alert('There was an error parsing the returned Ajax XML.') //todo, keep this?  Throw an error instead.
            return null; //error.
        }
    }
    var nEleEnd
    if (nNextEnd != -1 && nNextEnd < nNextStart) {
        //ending with "/>"
        nEleEnd = nNextEnd + 2;
    }else{
        //ending with "</ ... >"
        nEleEnd = sNewHtml.indexOf(">", nNextClose) + 1;
    }
    sNewHtml = sNewHtml.substring(0,nEleEnd)
	
	//Create a YUI node and insert into the DOM.
    newYuiNode = Y.Node.create(sNewHtml);	
    if (newYuiNode) {

        //it can be update of the js object instance linked with html element
        var linkedObjectCallback = newYuiNode.getAttribute('data-linked-object-callback');
        if (linkedObjectCallback) {
            var linkedObjectType = newYuiNode.getAttribute('data-linked-object-type'),
                linkedObject = oldYuiNode.getData(linkedObjectType);
            if (linkedObject && linkedObject[linkedObjectCallback]) {
                linkedObject[linkedObjectCallback](newYuiNode);
                newYuiNode.remove(true);
                return;
            }
        }

		// Run destroy against YUI node to cleanup any attached classes and then
		// remove it from dom.
		// Use placeholder element to prevent duplicate IDs from being written to DOM
		placeHolder = Y.Node.create( '<div style="display: none;"></div>' );
		oldYuiNode.insert( placeHolder, 'before' );
		Y.each(oldYuiNode.get('children'), function(childNode) {	
			childNode.destroy(true);
		});
		oldYuiNode.remove(true);		
		
		placeHolder.replace( newYuiNode );
		placeHolder.remove( true );
	}

	return sNewHtml;
}

function rdAjaxRunOnLoad(xml) {
    var scripts = xml.getElementsByTagName('SCRIPT')
    for (var i=0; i < scripts.length; i++) {
        var attrRun = scripts[i].attributes.getNamedItem('rdAjaxRunOnLoad')
        if (attrRun) {
            if (attrRun.value == 'True') {
                if (scripts[i].text) {
                    scripts[i].text = scripts[i].text.replace(/_rdamp_/g, "&");   //18808 19450
                    scripts[i].text = scripts[i].text.replace(/_rdlt_/g, "<");
                    scripts[i].text = scripts[i].text.replace(/_rdgt_/g, ">");
                    eval(scripts[i].text); //IE
                }
                else {
                    scripts[i].textContent = scripts[i].textContent.replace(/_rdamp_/g, "&");
                    scripts[i].textContent = scripts[i].textContent.replace(/_rdlt_/g, "<");
                    scripts[i].textContent = scripts[i].textContent.replace(/_rdgt_/g, ">");
                    eval(scripts[i].textContent);
                }
            }
        }
    }
}

function rdGetFormFieldValue(fld) {
	
	var sValue
	if (fld == null) {
	    return;
	}
    if (fld.id.indexOf("rdRadioButtonGroup") == 0) {
		// Radio buttons
		sFieldId = fld.id.replace(/rdRadioButtonGroup/g, '')
		var cInputs = document.getElementsByTagName("INPUT")
		for (var i = 0; i < cInputs.length; i++) {
			if (cInputs[i].name == sFieldId) {
				if (cInputs[i].checked) {
					sValue = cInputs[i].value
					break
				}
			}
		}
		if (sValue == undefined) {
				sValue = ''
			}

	} else {
		// All other fields
		if (fld.value.length == 0) {
			sValue = ''
		} else {
			sValue = fld.value
		}
	}
	return sValue	
}

function rdReportResponseError(sResponse) {
    sCurrentRequestParams = "";
    try {
        var nPosDebugUrl = sResponse.indexOf("rdDebugUrl=")
        if (nPosDebugUrl != -1) { 
            //Normal path, redirect to the debug page.
            var sDebugUrl = sResponse.substring(nPosDebugUrl + 12)         
            sDebugUrl = sDebugUrl.substring(0,sDebugUrl.indexOf("\""))
            window.location = sDebugUrl
//        }else{
//            window.top.document.body.innerHTML = sResponse
        }
    }
    catch (e) {	
    }
}

var sFeedbackShowElementID  //#11292.
var sFeedbackHideElementID

function rdShowAjaxFeedback(bShow, sCommandParams) {
    var rdCurrFeedbackElementShow
    var rdCurrFeedbackElementHide
    
    //Undo the previous feedback.
    if (sFeedbackShowElementID) {
        for (i = 0; i < sFeedbackShowElementID.length; i++) {
            rdCurrFeedbackElementShow = document.getElementById(sFeedbackShowElementID[i].trim())
            if (rdCurrFeedbackElementShow) {
                ShowElement(null, sFeedbackShowElementID[i].trim(), 'Hide');//22558
                rdCurrFeedbackElementShow = null
            }
        }
        //19642
        sFeedbackShowElementID = undefined;
    }
    if (sFeedbackHideElementID) {
        for (i = 0; i < sFeedbackHideElementID.length; i++) {
            rdCurrFeedbackElementHide = document.getElementById(sFeedbackHideElementID[i].trim())
            if (rdCurrFeedbackElementHide) {
                ShowElement(null, sFeedbackHideElementID[i], 'Show');
                rdCurrFeedbackElementHide = null
            }
        }
        //19642
        sFeedbackHideElementID = undefined;
    }
    document.documentElement.style.cursor = "auto"

    if (bShow) {
        var sParams
        //Show an element
        sParams = sCommandParams.split("&rdFeedbackShowElementID=")
        if (sParams.length > 1) {
            sFeedbackShowElementID = sParams[1].split("&")[0].split(',')
            for(i=0;i<sFeedbackShowElementID.length;i++){           
                rdCurrFeedbackElementShow=document.getElementById(sFeedbackShowElementID[i].trim())
                if (rdCurrFeedbackElementShow) {
                    ShowElement(null, sFeedbackShowElementID[i].trim(), 'Show');
                }
            }
        }
        //Hide an element
        sParams = sCommandParams.split("&rdFeedbackHideElementID=")
        if (sParams.length > 1) {
            sFeedbackHideElementID = sParams[1].split("&")[0].split(',')
            for(i=0;i<sFeedbackHideElementID.length;i++){           
                rdCurrFeedbackElementHide=document.getElementById(sFeedbackHideElementID[i].trim())
                if (rdCurrFeedbackElementHide) {
                    ShowElement(null, sFeedbackHideElementID[i].trim(), 'Hide'); 
                }
            }
        }
    }
}

function rdGetSelectedValuesFromCheckboxList(inputName) {
    var eleList = Y.all('input[name="' + inputName + '"]'),
        uniqueValues = new Array(),
        nodeValue,
        sReturn = '';
    eleList.each(function (node) {
        if (node.get('checked') == true) {
            nodeValue = node.get('value');
            if (Y.Array.indexOf(uniqueValues, nodeValue) == -1) {
                uniqueValues.push(nodeValue);
            }
        }
    });
    if (uniqueValues.length > 0) {
        if (typeof window.rdInputValueDelimiter == 'undefined') {
            window.rdInputValueDelimiter = ','
        }

        sReturn = uniqueValues.join(rdInputValueDelimiter);
    }
    return sReturn;
}

function rdGetInputValues(ele, urlRequest) {

    var sValue = "";
    //Default parameter value is true
    urlRequest = typeof urlRequest !== 'undefined' ? urlRequest : true;
    //CheckboxList has to be processed differently
    if (ele.getAttribute("data-checkboxlist")) {
        sValue = rdGetSelectedValuesFromCheckboxList(ele.id);
        if(urlRequest)
            return '&' + ele.id + "=" + rdAjaxEncodeValue(sValue);
        else
            return sValue;
    }
    //19809
    else if (ele.getAttribute("rdelement") == "Tabs") {
        var Tabs = document.getElementById("rdActiveTabId_" + ele.id);
        if (Y.Lang.isValue(Tabs)) {
            sValue = Tabs.value;
            if (urlRequest)
                return '&' + ele.id + "=" + rdAjaxEncodeValue(sValue);
            else
                return sValue;
        }
    }
    else {
        switch (ele.type) {
            case 'hidden':
            case 'text':
            case 'email':
            case 'number':
            case 'tel':
            case 'textarea':
            case 'password':
            case 'select-one':
            case 'file':
                sValue = rdGetFormFieldValue(ele);
                if (urlRequest)
                    return '&' + ele.name + "=" + rdAjaxEncodeValue(sValue);
                else
                    return sValue;
                break;
            case 'select-multiple':
                var selectedItems = new Array();
                var bBlankSelected = false;
                for (var k = 0; k < ele.options.length; k++) {
                    if (ele.options[k].selected) {
                        selectedItems[selectedItems.length] = ele.options[k].value;
                        if (ele.options[k].value == "") { //#18305
                            bBlankSelected = true; //#18305
                        } //#18305
                    }
                }
                if (typeof window.rdInputValueDelimiter == 'undefined') { window.rdInputValueDelimiter = ',' }
                var sValue = selectedItems.join(rdInputValueDelimiter);
                if ((sValue.length > 0) || (bBlankSelected == true)) { //#5846 //#18305
                    if (urlRequest)
                        return '&' + ele.name + "=" + rdAjaxEncodeValue(sValue);
                    else
                        return sValue;
                }
                break;
            case 'checkbox':
                //20388
                if (Y.Lang.isValue(Y.one("#" + ele.id).ancestor("div")) && Y.one("#" + ele.id).ancestor("div").getAttribute("data-checkboxlist")) {
                    var parent = Y.one("#" + ele.id).ancestor("div");
                    sValue = rdGetSelectedValuesFromCheckboxList(parent.getAttribute("id"));
                    if (urlRequest)
                        return '&' + parent.getAttribute("id") + "=" + rdAjaxEncodeValue(sValue);
                    else
                        return sValue;
                }
                else {
                    sValue = rdGetSelectedValuesFromCheckboxList(ele.id);
                    if (urlRequest)
                        return '&' + ele.id + "=" + rdAjaxEncodeValue(sValue);
                    else
                        return sValue;
                }
                break;
            case 'radio':
                var sRadioId = 'rdRadioButtonGroup' + ele.name
                if (sPrevRadioId != sRadioId) {
                    sPrevRadioId = sRadioId;
                    var sValue = rdGetFormFieldValue(document.getElementById(sRadioId));
                    if (urlRequest)
                        return '&' + ele.name + "=" + rdAjaxEncodeValue(sValue);
                    else
                        return sValue;
                }
                break;
        }
    }
    return "";
}
var getElementsByClassName = function (className, tag, elm){
    if (document.getElementsByClassName) {
        getElementsByClassName = function (className, tag, elm) {
            elm = elm || document;
            var elements = elm.getElementsByClassName(className),
            nodeName = (tag)? new RegExp("\\b" + tag + "\\b", "i") : null,
            returnElements = [],
            current;
            for(var i=0, il=elements.length; i<il; i+=1){
                14.
                current = elements[i];
                15.
                if(!nodeName || nodeName.test(current.nodeName)) {
                    returnElements.push(current);
                }
            }
            return returnElements;
        };
    }
else if (document.evaluate) {
    getElementsByClassName = function (className, tag, elm) {
        tag = tag || "*";
        elm = elm || document;
        var classes = className.split(" "),
        classesToCheck = "",
        xhtmlNamespace = "http://www.w3.org/1999/xhtml",
        namespaceResolver = (document.documentElement.namespaceURI === xhtmlNamespace)? xhtmlNamespace : null,
        returnElements = [],
        elements,
        node;
        for(var j=0, jl=classes.length; j<jl; j+=1){
            classesToCheck += "[contains(concat(' ', @class, ' '), ' " + classes[j] + " ')]";
        }
        try {
            elements = document.evaluate(".//" + tag + classesToCheck, elm, namespaceResolver, 0, null);
        }
    catch (e) {
        elements = document.evaluate(".//" + tag + classesToCheck, elm, null, 0, null);
    }
        while ((node = elements.iterateNext())) {
            returnElements.push(node);
        }
        return returnElements;
    };
}
else {
getElementsByClassName = function (className, tag, elm) {
    tag = tag || "*";
    elm = elm || document;
    var classes = className.split(" "),
    classesToCheck = [],
    elements = (tag === "*" && elm.all)? elm.all : elm.getElementsByTagName(tag),
    current,
    returnElements = [],
    match;
    for(var k=0, kl=classes.length; k<kl; k+=1){
        classesToCheck.push(new RegExp("(^|\\s)" + classes[k] + "(\\s|$)"));
    }
    for(var l=0, ll=elements.length; l<ll; l+=1){
        current = elements[l];
        match = false;
        for(var m=0, ml=classesToCheck.length; m<ml; m+=1){
            match = classesToCheck[m].test(current.className);
            if (!match) {
                break;
            }
        }
        if (match) {
            returnElements.push(current);
        }
    }
    return returnElements;
};
}
return getElementsByClassName(className, tag, elm);
};
function isIE() {
    var myNav = navigator.userAgent.toLowerCase();
    return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1]) : false;
}