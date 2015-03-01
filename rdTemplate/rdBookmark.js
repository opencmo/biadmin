function rdAddBookmark(sActionId, sReport, sBookmarkReqIds, sBookmarkSessionIds, sCollection, sBookmarkName, sCust1, sCust2, sDescription, sDescriptionMessage, nRowNr, sBookmarkId) {

    rdValidationRowNrFilter = nRowNr
	var sErrorMsg = rdValidateForm()
	if (sErrorMsg) {
        rdValidationRowNrFilter = undefined
		alert(sErrorMsg)
		return
	}
	
    var sDesc = sDescription
    if (sDescriptionMessage.length!=0){
        sDesc = rdParentPopupPanel.getElementsByTagName("Input")[0].value;
    } 
    
    //Get the list of request parameters.
    var sReqParams
    sReqParams = "&rdActionId=" + sActionId
    sReqParams += "&rdReport=" + sReport
    sReqParams += "&rdBookmarkReqIds=" + encodeURIComponent(sBookmarkReqIds)
    sReqParams += "&rdBookmarkSessionIds=" + encodeURIComponent(sBookmarkSessionIds)
    sReqParams += "&rdBookmarkCollection=" + encodeURIComponent(sCollection)
    sReqParams += "&rdBookmarkName=" + encodeURIComponent(sBookmarkName)
    sReqParams += "&rdBookmarkCustomColumn1=" + encodeURIComponent(sCust1)
    sReqParams += "&rdBookmarkCustomColumn2=" + encodeURIComponent(sCust2)
    sReqParams += "&rdBookmarkDescription=" + encodeURIComponent(sDesc)
    sReqParams += "&rdBookmarkID=" + encodeURIComponent(Y.Lang.isValue(sBookmarkId) ? sBookmarkId : '')
    var aIds = sBookmarkReqIds.split(",")
    for (var i=0; i < aIds.length; i++) {
        var sId = aIds[i]
        if (sId != "rdReport") {    //20783
            var ele = document.getElementById(sId);
            if (ele) {    //#12959.
                //Changed to rdGetInputValues (defined in rdAjax2.js)
                sReqParams += rdGetInputValues(ele);
            }
            else if (document.getElementById("rdBookmarkReqId_" + sId)) {   //20099
                sReqParams += "&" + sId + "=" + document.getElementById("rdBookmarkReqId_" + sId).innerHTML;
            }
        }
    }
    bSubmitFormAfterAjax = true
    rdValidationRowNrFilter = nRowNr  
    rdAjaxRequest("rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=AddBookmark" + sReqParams)
    rdValidationRowNrFilter = undefined
    //19809   
    if(typeof(rdParentPopupPanel) !== "undefined"){
        ShowElement(this.id,rdParentPopupPanel.id,'Hide')
    }
}

function rdEditBookmark(sActionId, sReport, BookmarkCollection, BookmarkID, sDescription, sDescriptionMessage, nRowNr, eleUpdateId) {
    rdValidationRowNrFilter = nRowNr
	var sErrorMsg = rdValidateForm()
	if (sErrorMsg) {
        rdValidationRowNrFilter = undefined
		alert(sErrorMsg)
		return
	}

    var sDesc = sDescription
    if (sDescriptionMessage.length!=0){
        sDesc = rdParentPopupPanel.getElementsByTagName("Input")[0].value;
    }
    
    var sReqParams
    sReqParams  = "&rdActionId=" + sActionId
    sReqParams += "&rdReport=" + sReport
    sReqParams += "&rdBookmarkCollection=" + BookmarkCollection
    sReqParams += "&rdBookmarkID=" + BookmarkID
    sReqParams += "&rdBookmarkDescription=" + rdAjaxEncodeValue(sDesc)
    bSubmitFormAfterAjax = true //#12541.
    rdValidationRowNrFilter = nRowNr
    rdAjaxRequest("rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=EditBookmark" + sReqParams)
    rdValidationRowNrFilter = undefined

   
   if(rdParentPopupPanel){        
        ShowElement(this.id,rdParentPopupPanel.id,'Hide')
    }
    
    if (eleUpdateId) {
        //Special for ReportCenter. Update the text.
        var eleUpdate = document.getElementById(eleUpdateId)
        if (eleUpdate) {
           if (eleUpdate.textContent != undefined) {
                eleUpdate.textContent = sDesc //Mozilla, Webkit
            } else {
                eleUpdate.innerText = sDesc //IE
            }
        }
    }

}

function rdCopyBookmark(sActionId, sReport, SourceBookmarkCollection, SourceBookmarkUsername, DestinationBookmarkCollection, BookmarkID, SharedBookmarkID, sAcknowledge, sCopiedDescription) {

    var sReqParams
    sReqParams = "&rdActionId=" + sActionId
    sReqParams += "&rdReport=" + sReport
    sReqParams += "&rdSourceBookmarkCollection=" + SourceBookmarkCollection
    sReqParams += "&rdSourceBookmarkUsername=" + SourceBookmarkUsername
    sReqParams += "&rdDestinationBookmarkCollection=" + DestinationBookmarkCollection
    sReqParams += "&rdBookmarkID=" + BookmarkID
    sReqParams += "&rdSharedBookmarkID=" + SharedBookmarkID
    sReqParams += "&rdCopiedBookmarkDescription=" + sCopiedDescription
    sReqParams += "&rdAcknowledgeMessage=" + rdAjaxEncodeValue(sAcknowledge)
    //bSubmitFormAfterAjax = true //#12541, #10184.

    rdAjaxRequest("rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=CopyBookmark" + sReqParams)

}

function rdRemoveBookmark(sActionId, sReport, BookmarkCollection, sBookmarkUserName, BookmarkID, sConfirm, eleRemoveId, sReportCenterID, nRowNr, sChildActionScript) {

    if (sConfirm) {
        if(sChildActionScript){ // show the confirm only when there is a child actionscript(a child action element to the action.RemoveBookmark) #15350, #15314.
		    if (!confirm(sConfirm)) {
			    return
		    }
		}
    }
    if (!(Y.Lang.isValue(BookmarkCollection) && BookmarkCollection != '')) {
        return; //Do not do anything when the bookmark collection is not provided, #19472.
    }
    var sReqParams
    sReqParams  = "&rdActionId=" + sActionId
    sReqParams += "&rdReport=" + sReport
    sReqParams += "&rdBookmarkCollection=" + BookmarkCollection
    sReqParams += "&rdBookmarkUserName=" + sBookmarkUserName
    sReqParams += "&rdBookmarkID=" + BookmarkID
    bSubmitFormAfterAjax = true //#12541, #10184.

    rdAjaxRequest("rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=RemoveBookmark" + sReqParams)
    
    if (eleRemoveId) {
         rdAjaxRequest('rdAjaxCommand=RefreshElement&rdReport=' + sReport + '&rdRefreshElementID=' + sReportCenterID) 
    }
    if (sChildActionScript) {
		if (sChildActionScript.length != 0) {
			if (sChildActionScript.toLowerCase().indexOf("javascript:") == 0) {
		        sChildActionScript = new Function(sChildActionScript.substr(11))    //Label
		    }else{
		        sChildActionScript = new Function(sChildActionScript)   //Button
		    }
		    sChildActionScript()
		}
	}
}


function rdShareBookmarkOrFolder(sActionId, sReport, BookmarkCollection, BookmarkID, FolderID, sharedWith, refreshDTID, bFromInput) {   
	
	var isSpanNode = false;
	var sRowId = "";

	var sReqParams = "";
	sReqParams += "&rdActionId=" + sActionId;
	sReqParams += "&rdReport=" + sReport;
	sReqParams += "&rdBookmarkCollection=" + BookmarkCollection;
	sReqParams += "&rdBookmarkID=" + BookmarkID;
	sReqParams += "&rdFolderID=" + FolderID;
	sReqParams += "&rdRefreshDTID=" + refreshDTID;
	

	if (bFromInput == "False") {

	    sReqParams += "&rdSharedCollection=" + sharedWith;

	} else {

	    sReqParams += "&rdSharedCollection=";
	    var sharedNode = Y.one("#" + sharedWith);
	    if (!Y.Lang.isNull(sharedNode)) {
	        sReqParams += sharedNode.get('value');
	        if (sharedNode._node.tagName == 'SPAN') {
	            sReqParams += sharedNode._node.innerHTML;
	            isSpanNode = true;
	            var n = sharedWith.lastIndexOf("_");
	            sRowId = "actShareBookmarkFromDataLayer_" + sharedWith.substring(n + 1);
	        }
	    }

	}
	sReqParams += "&rdSharedFromInput=" + bFromInput;
	
	bSubmitFormAfterAjax = true;

	//BookmarkID or FolderID ?
	if (BookmarkID != ''){
		rdAjaxRequestWithFormVars("rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=ShareBookmark" + sReqParams)
	} else {
		rdAjaxRequestWithFormVars("rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=ShareBookmarkFolder" + sReqParams)
	}

	//Clear out the input text box	
	document.getElementById("InpUser").value = "";

	if ( isSpanNode == true) {
		var sharedTextNode = document.createElement("span");
		sharedTextNode.textContent = "Shared!"		
		var sharedButton = document.getElementById(sRowId).parentNode;
		sharedButton.parentNode.replaceChild(sharedTextNode,sharedButton);
	}	
		
	var sRefreshParams = "";
	sRefreshParams += "&rdReport=" + sReport;
	sRefreshParams += "&rdBookmarkCollection=" + BookmarkCollection;
	sRefreshParams += "&rdBookmarkID=" + BookmarkID;
	sRefreshParams += "&rdFolderID=" + FolderID;
	
	rdAjaxRequestWithFormVars("rdAjaxCommand=RefreshElement&rdRefreshElementID=rowBookmarkSharedWith" + sRefreshParams);


}

function rdUnShareBookmarkOrFolder(sActionId, sReport, BookmarkCollection, BookmarkID, FolderID, unSharedWith, refreshDTID) {   
		
    var sReqParams = "&rdActionId=" + sActionId;
    sReqParams += "&rdReport=" + sReport;
    sReqParams += "&rdBookmarkCollection=" + BookmarkCollection;
    sReqParams += "&rdBookmarkID=" + BookmarkID;
    sReqParams += "&rdFolderID=" + FolderID;
    sReqParams += "&rdRefreshDTID=" + refreshDTID;
    sReqParams += "&rdRemoveCollections=";
	var sharedNode = Y.one("#" + unSharedWith);
	if (!Y.Lang.isNull(sharedNode)) {
		sReqParams += sharedNode.get('value');
		if (sharedNode._node.tagName == 'SPAN') {
			sReqParams += sharedNode._node.innerHTML;
		}
	}
	bSubmitFormAfterAjax = true;
	
	//BookmarkID or FolderID
	if (BookmarkID != ''){
	    rdAjaxRequest("rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=UnShareBookmark" + sReqParams);
	} else {
	    rdAjaxRequest("rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=UnShareBookmarkFolder" + sReqParams);
	} 
	
	var sRefreshParams = "";
	sRefreshParams += "&rdReport=" + sReport;
	sRefreshParams += "&rdBookmarkCollection=" + BookmarkCollection;
	sRefreshParams += "&rdBookmarkID=" + BookmarkID;
	sRefreshParams += "&rdFolderID=" + FolderID;

	rdAjaxRequestWithFormVars("rdAjaxCommand=RefreshElement&rdRefreshElementID=rowBookmarkSharedWith" + sRefreshParams);	
}




