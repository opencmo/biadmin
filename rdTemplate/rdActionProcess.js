function RunProcess(sActionsXml, bValidate, sConfirm, sTarget, waitCfg) {

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
		
	if (typeof rdSaveInputCookies != 'undefined'){rdSaveInputCookies()}
	if (typeof rdSaveInputsToLocalStorage != 'undefined'){rdSaveInputsToLocalStorage()}
	
	if (sTarget) {
		sOldTarget = document.rdForm.target
		if (sTarget != '') {
			document.rdForm.target=sTarget
		} else {
			document.rdForm.target='_self'
		}
	}


	//Add the actions to a new Hidden form field.  First, make sure that the hidden element doesn't already exist.  (Happens with Opera Back button.)
	var hiddenProcessAction=document.getElementById("rdProcessAction")
	if (hiddenProcessAction) { 
        hiddenProcessAction.parentNode.removeChild(hiddenProcessAction);//#4217
	}
	
    //Remove hidden forwarding elements that have other input elements.
	var eleInputs = document.getElementsByTagName("INPUT")
    var eleTextAreas = document.getElementsByTagName("TEXTAREA")
    for (var i=eleInputs.length-1; i > -1; i--) {
        var eleInput = eleInputs[i]
        if (eleInput.id=="rdHiddenRequestForwarding") {
            //Is there another input element with the same id?  (Can't use getElementById())
            for (var k=eleInputs.length-1; k > -1; k--) {
                if (k != i) {
                    if (eleInputs[k].name == eleInput.name && eleInput.parentNode) {
                        eleInput.parentNode.removeChild(eleInput)  //Remove the hidden forwarding element.
                    }
                }
            }
            for (var k=eleTextAreas.length-1; k > -1; k--) { 
                if (eleTextAreas[k].name == eleInput.name && eleInput.parentNode) {
                    eleInput.parentNode.removeChild(eleInput)  //Remove the hidden forwarding element.
                }
            }
        }
    }
	
	hiddenProcessAction=document.createElement("INPUT");
	hiddenProcessAction.type="HIDDEN"
	hiddenProcessAction.id="rdProcessAction"
	hiddenProcessAction.name="rdProcessAction"
	hiddenProcessAction.value=encodeURIComponent(sActionsXml)
	document.rdForm.appendChild(hiddenProcessAction);
			
	var hiddenRnd=document.createElement("INPUT");
	hiddenRnd.type="HIDDEN"
	hiddenRnd.id="rdRnd"
	hiddenRnd.name="rdRnd"
	hiddenRnd.value=Math.floor(Math.random() * 100000)
	document.rdForm.appendChild(hiddenRnd);
			
	var hiddenScrollX=document.createElement("INPUT");
	hiddenScrollX.type="HIDDEN"
	hiddenScrollX.id="rdScrollX"
	hiddenScrollX.name="rdScrollX"
	hiddenScrollX.value=rdGetScroll('x')
	document.rdForm.appendChild(hiddenScrollX);
	var hiddenScrollY=document.createElement("INPUT");
	hiddenScrollY.type="HIDDEN"
	hiddenScrollY.id="rdScrollY"
	hiddenScrollY.name="rdScrollY"
	hiddenScrollY.value=rdGetScroll('y')
	document.rdForm.appendChild(hiddenScrollY);
			
	//document.rdForm.action="rdProcess.aspx?&rdRnd=" + Math.floor(Math.random() * 100000)
	document.rdForm.action="rdProcess.aspx?"
	document.rdForm.submit();
	document.rdForm.action= ""; //#4434
	
	//Show wait panel
	if (waitCfg != null) {
		LogiXML.WaitPanel.pageWaitPanel.set('cancel', false);
		setTimeout(function() {LogiXML.WaitPanel.pageWaitPanel.showWaitPanel(waitCfg)}, 1000);
	}
	
	if (sTarget) {
		document.rdForm.target = sOldTarget
	}

}


