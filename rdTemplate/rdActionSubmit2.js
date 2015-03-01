
function SubmitForm(sPage, sTarget, bValidate, sConfirm, bFromOnClick, waitCfg) {
    
    if (typeof bSubmitFormAfterAjax != 'undefined'){ //10041
        if (bSubmitFormAfterAjax){ 
            setTimeout(function(){SubmitForm(sPage, sTarget, bValidate, sConfirm, bFromOnClick, waitCfg)},1000)
            return
        }
    }

//    Commented out to address #14590.
//    if (document.getElementById("rdDashboardParams")){
//        if(sTarget == ''){  //#13727.
//            rdRemoveDashboardParams()
//        }
//    }
    
    if (bFromOnClick) {
        sPage = decodeURIComponent(sPage)  //onClick and other eventes need decoding.#6549
    }

	if (bValidate == "true") {
		var sErrorMsg = rdValidateForm()
		if (sErrorMsg) {
			alert(sErrorMsg)
			return
		}
	}
	
	if (sConfirm) {
		if (sConfirm.length != 0) {
			if (!confirm(sConfirm)) {
				return
			}
		}
	}
	
	sOldTarget = document.rdForm.target
	if (sTarget != '') {
		document.rdForm.target=sTarget
	} else {
		document.rdForm.target='_self'
	}
	
    var eleRemoved = new Array(0)
	
	if (sPage.search("rdRequestForwarding=Form") == -1) {
	    //No RequestForwarding, remove all RequestForwarding elements.
		while (true) {
			var eleForward = document.getElementById("rdHiddenRequestForwarding")
			if (eleForward) {
				eleRemoved.push(eleForward.parentNode.removeChild(eleForward))
			} else {
				break
			}
		}
	} else {
	    //RequestForwarding, remove elements that are in the request.
        var eleInputs = document.getElementsByTagName("INPUT")
        for (var i=eleInputs.length-1; i > -1; i--) {
            var eleInput = eleInputs[i]
            if (eleInput.type=="hidden") {
                //Is the var in the request string?
                if (sPage.indexOf("?" + eleInput.name + "=")!=-1 || sPage.indexOf("&" + eleInput.name + "=")!=-1) {
                    eleRemoved.push(eleInput.parentNode.removeChild(eleInput))
                }
            }
        }
        //Remove hidden forwarding elements that have other input elements.
        var eleTextAreas = document.getElementsByTagName("TEXTAREA")
        for (var i=eleInputs.length-1; i > -1; i--) {
            var eleInput = eleInputs[i]
            if (eleInput.id=="rdHiddenRequestForwarding") {
                //Is there another input element with the same id?  (Can't use getElementById())
                for (var k=eleInputs.length-1; k > -1; k--) {
                    if (k != i) {
                        if (eleInputs[k].name == eleInput.name) {
                            try{
                                eleRemoved.push(eleInput.parentNode.removeChild(eleInput))  //Remove the hidden forwarding element.
                            }catch(e){}
                        }
                    }
                }
                for (var k=eleTextAreas.length-1; k > -1; k--) { 
                    if (eleTextAreas[k].name == eleInput.name) {
                        eleRemoved.push(eleInput.parentNode.removeChild(eleInput))  //Remove the hidden forwarding element.
                    }
                }
            }
        }

	}
	
	if (sPage.indexOf("rdSubmitScroll") != -1) {
		sPage=sPage.replace("rdSubmitScroll","rdScrollX=" + rdGetScroll('x') + "&rdScrollY=" + rdGetScroll('y') )
	}

	if (typeof rdSaveInputCookies != 'undefined'){rdSaveInputCookies()}
	if (typeof rdSaveInputsToLocalStorage != 'undefined'){rdSaveInputsToLocalStorage()}

    if (!document.createHiddenInput) {
        document.createHiddenInput = function (id, value, name) {
            var input = document.createElement("INPUT");
            input.type = "HIDDEN";
            input.id = id;
            input.name = name || id;
            input.value = value;
            return input;
        };
    }

    var hiddenRnd = document.createHiddenInput("rdRnd", Math.floor(Math.random() * 100000));
    document.rdForm.appendChild(hiddenRnd);

    if (sPage.indexOf("javascript:")==0) {
	    sPage = sPage.replace("javascript:","") //11673
	    eval(sPage)
	}else{		
			
	    document.rdForm.action=sPage;
	    document.rdForm.submit();
		
		//Show wait panel
		if (waitCfg != null) {
			LogiXML.WaitPanel.pageWaitPanel.readyWait();
			setTimeout(function() {LogiXML.WaitPanel.pageWaitPanel.showWaitPanel(waitCfg)}, 1000);
		}
	}
	
	//Put the form back, in case we went to another target window.
	document.rdForm.target = sOldTarget

	//Replace the removed elements.
	while (eleRemoved.length!=0){
	    document.rdForm.appendChild(eleRemoved.pop())
	}

}

function SubmitSort(sPage, RowCnt, SortRowLimit, SortRowLimitMsg) {
	if (SortRowLimit.length != 0) {
		nRowCnt = parseInt(RowCnt,10)
		nSortRowLimit = parseInt(SortRowLimit,10)
		if (nRowCnt > nSortRowLimit) {
			alert(SortRowLimitMsg)
			return
		}
	}

	SubmitForm(sPage,'')
}

function NavigateLink2(sUrl, sTarget, bValidate, sFeatures, sConfirm, waitCfg) {

	if (bValidate == "true") {
		var sErrorMsg = rdValidateForm()
		if (sErrorMsg) {
			alert(sErrorMsg)
			return
		}
	}
	
	if (sConfirm) {
		if (sConfirm.length != 0) {
			if (!confirm(sConfirm)) {
				return
			}
		}
	}
	
	if (sUrl.toLowerCase().indexOf("javascript:") == 0) {
		//Not submitting the page, run javascript instead.  This works with Target.Link.
		var runScript = new Function(sUrl.substr(11))
		runScript()
		return
	}
	
	//If the URL has a ? at the end, remove it.
	if (sUrl.substring(sUrl.length-1,sUrl.length) == "?") {
		sUrl = sUrl.substring(0,sUrl.length - 1)
	}
	//Replace + with %20. 20424
	//var pattern = /\+/ig;
	//sUrl = sUrl.replace(pattern,"%20");
	//Replace # with %23.
	var pattern = /\#/ig;
	sUrl = sUrl.replace(pattern,"%23");

	if (typeof rdSaveInputCookies != 'undefined'){rdSaveInputCookies()}
	if (typeof rdSaveInputsToLocalStorage != 'undefined'){rdSaveInputsToLocalStorage()}

	switch (sTarget) {
		case '_parent':
		    window.parent.location.href = sUrl;
			break;
		case '_top':
		    window.top.location.href = sUrl;
			break;
		case '_modal':
		    window.showModalDialog(sUrl, '', sFeatures);
			break;
		case '':
			window.location.assign(sUrl);
			
			//Show wait panel
			if (waitCfg != null) {
				LogiXML.WaitPanel.pageWaitPanel.readyWait();
				setTimeout(function() {LogiXML.WaitPanel.pageWaitPanel.showWaitPanel(waitCfg)}, 1000);				
			}	
			
			break;
		default:
			window.open(sUrl,sTarget,sFeatures)
			break;
	}
}

function SubmitFormCrawlerFriendly(sPage, sTarget, bValidate, sConfirm) {
	sPage = unescape(sPage)
	SubmitForm(sPage, sTarget, bValidate, sConfirm)
}

function NavigateCrawlerFriendly(sUrl, sTarget, bValidate, sFeatures, sConfirm) {
	sUrl = unescape(sUrl)
	NavigateLink2(sUrl, sTarget, bValidate, sFeatures, sConfirm)
}


function rdBodyPressEnter(sID) {
	var ele = document.getElementById(sID);
	if (ele) {
	    if (ele.tagName=="INPUT") {  //button
	        ele.click();
	        //button
	    } else {
	        //span or image
		    window.location.assign(ele.parentNode.href);
	    }
	}
}
