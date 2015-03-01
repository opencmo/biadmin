
YUI.add('dashboard', function (Y) {
	var FreeForm = Y.LogiXML.Dashboard.FreeForm;

	Y.namespace('LogiInfo').Dashboard = Y.Base.create('Dashboard', Y.Base, [], {

		/*
         * Initialization Code: Sets up privately used state
         * properties, and publishes the events Tooltip introduces
         */
        initializer : function(config) {

			//Is the dashboard adjustable?
			var eleAdjustable =  document.getElementById("rdDashboardAdjustable")
			var eleFreeformLayout = document.getElementById('rdFreeformLayout');
			if (eleFreeformLayout!= null)
				if(eleFreeformLayout.id.toLowerCase() == 'rdhiddenrequestforwarding')
					eleFreeformLayout = null;   //#14758.
			if (eleFreeformLayout!= null)
				this.set('bIsFreeformLayout', true);
			if(!eleAdjustable) return;  //11475 - Does dashboard exist?

			//Initilize free form locations one time since the user can't change it
			if (eleAdjustable.innerHTML == 'False') {
			    this.set("bDashboardAdjustable", false);
			    var sClassSelector = 'rdDashboardPanel';
				if( this.get('bIsFreeformLayout') ) {
				    this.rdSizeUnAdjustablePanels(sClassSelector);
				    FreeForm.rdResizeDashboardContainer();
					return;
				}
				else {
					return;
				}
			}

			var i;
			//Make the panels draggable.
			if(typeof(rdMobileReport)=='undefined'){ //Not for mobile. 13676

				var elePanels = Y.all( 'div.rdDashboardPanel' ),
					numberOfPanels = elePanels.size();

				if ( numberOfPanels > 0 ) {
					// Currently click event changes z-index of panels
					FreeForm.addPanelClickEvents();
				}
				//Destroy the registered drag/drop nodes if any.
				for (i = 0; i < numberOfPanels; i++) {
				    Y.DD.DDM.getNode(elePanels.item(i)).destroy();
				}
				for ( i = 0; i < numberOfPanels; i++ ) {
					var elePanel = elePanels.item(i).getDOMNode();
					if(elePanel.className.indexOf('yui-resize') != -1 || elePanel.id.indexOf('rdDashboardPanel-') != 0) continue //11516,11518,11524.

					// Don't unreg the YUI Resize handles.
					var dashTitleID = elePanel.id.replace("rdDashboardPanel-","rdDashboardPanelTitle-");
					var panelNode = Y.one(elePanel);
					var drag = new Y.DD.Drag({
					    node: panelNode
					})
					if (this.get('bIsFreeformLayout')) {
					    drag.plug(Y.Plugin.DDConstrained, {
					        tickX: 10,
					        tickY: 10,
					        constrain: []   //#21229.
					    });
					}

					var pnlContent;
					var pnlDivs = panelNode.all('div');
					for (var j = 0; j < pnlDivs.size(); j++) {
						if (pnlDivs.item(j).get('id').indexOf('rdDashboard2PanelContent_') == 0) {
							pnlContent = pnlDivs.item(j);
							break;
						}
					}

					if (this.get('bIsFreeformLayout')) {
					    FreeForm.initializePanelResizer(panelNode);
					    FreeForm.rdResizeDashboardContainer();
					    //Set the panel's position and size so it's snapped to the grid.
					    panelNode.setStyle("left", FreeForm.rdRoundTo10(panelNode.getStyle("left")))
					    panelNode.setStyle("top", FreeForm.rdRoundTo10(panelNode.getStyle("top")))
					}
					//Attach drag-drop events
					drag.on('drag:start', this.DashboardPanel_onDragStart, this);
					drag.on('drag:end', this.DashboardPanel_onDragEnd, this);
					drag.on('drag:over', this.DashboardPanel_onDragOver, this);

					//Now you can only drag it from the panel title
					var hndNode = panelNode.one('tr[id="' + dashTitleID + '"]');
					panelNode.dd.addHandle(hndNode);
					if (this.get('bIsFreeformLayout')) panelNode.dd.plug(Y.Plugin.DDWinScroll, {scrollDelay:100});
					hndNode.setStyle('cursor', 'move');
				    panelNode.setStyle('opacity', '.92');
				}
			}

			//Make the columns droppable.
			var eleCols = document.getElementsByTagName("TD");
			for ( i = 0; i < eleCols.length; i++ ) {
				var eleCol = eleCols[i];
				if (eleCol.id.indexOf("rdDashboardColumn") == 0) {
					var drop = Y.one(eleCol).plug(Y.Plugin.Drop);
					drop.drop.on('drop:hit', this.DashboardColumn_onDropHit, this);
				}
			}

			//Make the Tabs droppable.
			var eleTabs = document.getElementsByTagName("LI");
			for ( i = 0; i < eleTabs.length; i++ ) {
				var eleTab = eleTabs[i];
				if (eleTab.parentNode.parentNode.id.indexOf("rdTabs-") == 0) {
					if (eleTab.title != "active") {
						if (eleTab.id != "rdTabAddNewTab") {
							var drop = Y.one('li[id="'+ eleTab.id + '"]').plug(Y.Plugin.Drop);
							drop.drop.on('drop:hit', this.Tab_onDropHit, this);
						}
					}
				}
			}

			this.rdSetAddPanelsPopupSize();
			this.rdAddRefreshEventForAddPanelsPopupCloseButton();

			if (numberOfPanels < 1) {
			    ShowElement(null, 'ppChangeDashboard', 'Show');
			}
			FreeForm.rdResizeDashboardContainer();

            //Settings Cog (mobile reports resize the tab, so no need to do this twice)
			if (typeof (rdMobileReport) === 'undefined') {
			    this.rdPositiontabSettingsCog(true);
			    Y.on('windowresize', function (e) {
			        LogiXML.Dashboard.pageDashboard.rdPositiontabSettingsCog();
			    });
			}

			//Make the Add New Tab look like a button instead of a tab.
			var nodeNewTab = Y.one("#rdTabAddNewTab")
			if (Y.Lang.isValue(nodeNewTab)) {
			  if(typeof(rdMobileReport)=='undefined'){
					var nodeA = nodeNewTab.one('a');
					nodeA.addClass('hide-tab');
					var nodeSpan = nodeA.one('span')
					nodeSpan.addClass('rdDashboardCommand');
				}else{
					// Shrink the Tab size to 50% of the screen size.
					//eleNewTab.parentNode.style.whiteSpace=''; This needs to be set in VB.
					var eleMobileDashboardTab = nodeNewTab.getDOMNode().previousSibling;
					var nTabWidth = 175;
					eleMobileDashboardTab.style.width = nTabWidth + 'px';
					eleMobileDashboardTab.style.wordWrap  = 'break-word';
					eleMobileDashboardTab.firstChild.style.paddingLeft = 2 + 'px';  // anchor tag
					eleMobileDashboardTab.firstChild.style.paddingRight = 2 + 'px';
					eleMobileDashboardTab.firstChild.style.width = (nTabWidth - 4) + 'px';
					eleMobileDashboardTab.firstChild.style.wordWrap  = 'break-word';
					eleMobileDashboardTab.firstChild.style.backgroundRepeat = 'repeat-x';
					eleMobileDashboardTab.firstChild.firstChild.style.paddingLeft = 2 + 'px';  // em tag
					eleMobileDashboardTab.firstChild.firstChild.style.paddingRight = 2 + 'px';
					eleMobileDashboardTab.firstChild.firstChild.style.width = (nTabWidth - 8) + 'px';
					eleMobileDashboardTab.firstChild.firstChild.style.wordWrap = 'break-word';
					this.rdPositiontabSettingsCog(false);
				}
			}
		},

		/* ---Events--- */

		DashboardPanel_onDragStart : function(e) {
			var pnlDragged = e.target.get('dragNode');

			if ( this.get('bIsFreeformLayout') ) {
				FreeForm.freezeDashboardContainer();

				FreeForm.showPanelonTop( pnlDragged );
				pnlDragged.setStyle('opacity', '.75');
			} else {
				pnlDragged.setStyles({
					zIndex: 1,
					opacity: .75
				});
			}
			this.rdSetAppletVisibility("hidden");
		},

		DashboardPanel_onDragEnd : function(e) {

			//endDrag occurs after DragDrop
			var pnlDragged = e.target.get('dragNode');

			if ( this.get('bIsFreeformLayout') ) {
				FreeForm.unFreezeDashboardContainer();

				var pnlTop = pnlDragged.getStyle('top').replace('px', '');
				var pnlLeft = pnlDragged.getStyle('left').replace('px', '');
				if (pnlTop < 0) pnlDragged.setStyle('top', '0px');
				if (pnlLeft < 0) pnlDragged.setStyle('left', '0px');
				pnlDragged.setStyle('opacity', '.92');
				FreeForm.rdSaveFreeformLayoutPanelPosition('rdDivDashboardpanels');
			} else {
				pnlDragged.setStyles({
					zIndex: 0,
					opacity: 1,
					left: 0,
					top: 0
				});
			}
			var posDashboardPanelFinalCoOrds = pnlDragged.getXY();
			if( this.get('bIsTouchDevice') )
				setTimeout(function(){this.rdResetDashboardPanelAfterDDScroll(pnlDragged.getDOMNode(), posDashboardPanelFinalCoOrds)}, 1000);  // Do this for the Tablet only, #15478.

			this.rdSetDropZone(null);
			this.rdSetAppletVisibility("");
		},

		DashboardPanel_onDragOver : function(e) {
			var x = 1;

			var target = e.drop.get('node');
			var dragNode = e.target.get('node');

			var eleTarget = target.getDOMNode();
			var pnlDragged = dragNode.getDOMNode();

			if (!this.get('bIsFreeformLayout') && target.get('id').indexOf("rdDashboardColumn") == 0) {
				//Find the closest DropZone that's above the current position in the same column.
				var eleDropZone, eleClosestDropZone, nClosestDistance, elePanelChild;

				for (var i=0; i < eleTarget.childNodes.length; i++) {
					if (eleTarget.childNodes[i].id.indexOf("rdDashboardDropZone") != -1) {
						eleDropZone = eleTarget.childNodes[i];
						var yDragged = this.rdGetDbPanelHeight(pnlDragged);
						var yDropZone = this.rdGetDbPanelHeight(eleDropZone);

						if (!eleClosestDropZone) {
							eleClosestDropZone = eleDropZone;
							nClosestDistance = Math.abs(yDragged - yDropZone);
						} else if (Math.abs(yDragged - yDropZone) < nClosestDistance){
							eleClosestDropZone = eleDropZone;
							nClosestDistance = Math.abs(yDragged - yDropZone);

						}
					}
				}

				if (eleClosestDropZone)
					this.rdSetDropZone(eleClosestDropZone);
			}
			else {
				//Dragging over a tab?
				if (eleTarget.tagName == "LI") {
					if (eleTarget.parentNode.parentNode.id.indexOf('rdTabs-') == 0) {
						this.rdSetDropZone(eleTarget);
					}
				}
				else
					this.rdSetDropZone(null);
			}
		},

		DashboardColumn_onDropHit : function(e) {
			if (!this.get('rdDropZoneId'))
				return;

			//Move the dragged panel
			var eleDropZone = document.getElementById(this.get('rdDropZoneId'))  //The drop zone where it was dropped.
			if (!eleDropZone)
				return;

			if (eleDropZone.tagName == "TABLE") {
				//Dropped in a drop zone.
				var pnlDragged = e.drag.get('node');
				pnlDragged.setStyles({
					left: 0,
					top: 0
				});
				if (pnlDragged.get('id').replace("rdDashboardPanel","rdDashboardDropZone") == this.get('rdDropZoneId')) {
					//Dropped on the current panel's drop zone.  Put the panel back.
					this.rdSetDropZone(null);
					//rdAnimateHome(pnlDragged.id)
					return;
				}

				var eleDropZoneBelow = document.getElementById(pnlDragged.get('id').replace("rdDashboardPanel","rdDashboardDropZone")) //The drop zone below the panel.
				var elePanelDragged = document.getElementById(pnlDragged.get('id'));
				//Move the panel and its sibling drop zone.
				if (eleDropZone.nextSibling) {
					eleDropZone.parentNode.insertBefore(eleDropZoneBelow,eleDropZone.nextSibling);
					eleDropZone.parentNode.insertBefore(elePanelDragged,eleDropZone.nextSibling);
				} else {
					eleDropZone.parentNode.appendChild(elePanelDragged);
					eleDropZone.parentNode.appendChild(eleDropZoneBelow);
				}

				this.rdSetDropZone(null);
				this.rdSaveDashboardOrder();
			}
		},

		Tab_onDropHit : function(e) {
			if (!this.get('rdDropZoneId'))
				return;

			//Move the dragged panel
			var eleDropZone = document.getElementById(this.get('rdDropZoneId'));  //The drop zone where it was dropped.
			if (!eleDropZone)
				return;

			//Dropped on a Tab
			var pnlDragged = e.drag.get('node');
			var sPanelId = pnlDragged.get('id');
			// Do not move the panel to a different Tab if the panel is a Single Instance panel.
			var eleSingleInstancePanels = Y.one('#rdDashboardSingleInstanceOnlyPanelsList');
			if(eleSingleInstancePanels != null){
				var aSingleInstancePanels = eleSingleInstancePanels.getDOMNode().value.split(',');
				for(i=0;i<aSingleInstancePanels.length;i++){
					var sSingleInstancePanelId = aSingleInstancePanels[i];
					if(sSingleInstancePanelId == sPanelId.substring(sPanelId.indexOf('rdDashboardPanel-') + 'rdDashboardPanel-'.length, sPanelId.lastIndexOf('_'))){
						return;
					}
				}
			}
			this.rdMovePanelToTab(sPanelId, e.target.get('node').get('id'), eleDropZone);
		},

		/* ---Methods--- */

		rdAddDashboardPanel : function(sPanelID,nRowNr,eleEventOriginationPopup) {

			var rdFreeformLayout = document.getElementById('rdFreeformLayout');
			if (rdFreeformLayout!= null) {
				if( rdFreeformLayout.id.toLowerCase() == 'rdhiddenrequestforwarding' ) {
					rdFreeformLayout = null;   //#14758.
				}
			}

			var rdParams = "&rdReport=" + document.getElementById("rdDashboardDefinition").value;
			rdParams += "&PanelID=" + sPanelID;

			var dashboardTabs = document.getElementById("rdActiveTabId_rdDashboardTabs");
			if ( Y.Lang.isValue( dashboardTabs ) ) {
				rdParams += "&TabID=" + dashboardTabs.value;
			}
			this.rdCalculatezIndexValue();
			if (rdFreeformLayout) {
			    rdParams += "&rdFreeformLayout=True";
			    rdParams += "&rdNewFreeformLayoutPanel=True";

			    //if( this.get('nNewAddedPanelCount') === 0 && this.get('zIndex') === 0 ) {
			    //    rdParams += "&rdFreeformLayoutStyle=Position:absolute;Left:0px;Top:0px;z-index:1;";
			    //    this.set('zIndex', 1);
			    //} else {
			    	rdParams += "&rdFreeformLayoutStyle=Position:absolute;" + "Left:" + (this.get('nNewAddedPanelCount') * 25) + "px;Top:" + (this.get('nNewAddedPanelCount') * 25) + "px;z-index:" + this.get('zIndex') + ';';
			    //}
			    rdParams += ("&rdDashboardTabStyle=Width:" + Y.DOM.winWidth() + "px;Height:" + (Y.DOM.winHeight() - Y.DOM.region(Y.DOM.byId('rdDashboardList')).top - 50) + 'px;');
			}
			else {
				// Always save size of the Tab, even if FreeForm is turned off.  This way when someone switches from Column based to FreeForm,
				// the dimensions are already saved and can be used.
				var panelContainer = Y.one( '.rdDashboardPanelContainer' );
				rdParams += "&rdDashboardTabStyle=Width:" + panelContainer.get('offsetWidth') + "px;";
			}
			this.set('nNewAddedPanelCount', this.get('nNewAddedPanelCount') + 1)
			rdAjaxRequestWithFormVars('rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=AddDashboardPanel' + rdParams)
		    //Update the count.
			if (typeof eleEventOriginationPopup === 'undefined') {
			    var eleCount = document.getElementById("lblCount_Row" + nRowNr)
			    eleCount.innerHTML = parseInt(eleCount.innerHTML) + 1
			    var eleCountDiv = document.getElementById("divCount_Row" + nRowNr)
			    eleCountDiv.className = eleCountDiv.className.replace("rdDashboardHidden", "")
			    var eleAddedDiv = document.getElementById("divAdded_Row" + nRowNr)
			    eleAddedDiv.className = eleAddedDiv.className.replace("rdDashboardHidden","")
			    //Hide the Add button?
			    if (document.getElementById("hiddenMultiInstance_Row" + nRowNr).value == "False") {
			        var eleAddNowButton = document.getElementById("lblAddPanel_Row" + nRowNr)
			        eleAddNowButton.className = "rdDashboardHidden"
			        eleCountDiv.className = "rdDashboardHidden"
			        if (Y.Lang.isNull(Y.one('#rdUseGalleryFile'))){
                        // Don't hide the DeleteThisPanel button for Report Author.
			            var eleDeletePanelButton = document.getElementById("lblDeletePanel_Row" + nRowNr)
			            eleDeletePanelButton.className = "rdDashboardHidden"
			        }
			    }
			} else {
			    //For Report Author
			    var nodeOriginationPopup = Y.one('#' + eleEventOriginationPopup);
			    var eleCount = nodeOriginationPopup.one('#lblCount_Row' + nRowNr).getDOMNode();
			    eleCount.innerHTML = parseInt(eleCount.innerHTML) + 1
			    var eleCountDiv = nodeOriginationPopup.one('#divCount_Row' + nRowNr).getDOMNode();
			    eleCountDiv.className = eleCountDiv.className.replace("rdDashboardHidden", "")
			    var eleAddedDiv = nodeOriginationPopup.one('#divAdded_Row' + nRowNr).getDOMNode();
			    eleAddedDiv.className = eleAddedDiv.className.replace("rdDashboardHidden","")
			    //Hide the Add button?
			    if (nodeOriginationPopup.one('#hiddenMultiInstance_Row' + nRowNr).getDOMNode().value == "False") {
			        var eleAddNowButton = nodeOriginationPopup.one('#lblAddPanel_Row' + nRowNr).getDOMNode();
			        eleAddNowButton.className = "rdDashboardHidden"
			        eleCountDiv.className = "rdDashboardHidden"
			        var eleDeletePanelButton = nodeOriginationPopup.one('#lblDeletePanel_Row' + nRowNr).getDOMNode();
			        eleDeletePanelButton.className = "rdDashboardHidden"
			    }
			}
		},

		rdCalculatezIndexValue: function () {
		    var eleDashboardTab = Y.one('#rdDivDashboardPanelTable');
		    var dashboardPanels = eleDashboardTab.all('.rdDashboardPanel'),
			numberofPanels = dashboardPanels.size(),
			i, panel;
		    if (numberofPanels === 0) {
		        this.set('zIndex', (this.get('zIndex') + 1));
		        return;
		    }
		    for (i = 0; i < numberofPanels; i++) {
		        panel = dashboardPanels.item(i);
		        var nPanelzIndex = panel.getComputedStyle('zIndex');
		        if (this.get('zIndex') < nPanelzIndex) {
		            this.set('zIndex', parseInt(nPanelzIndex) + 1);
		        }
		    }
		},

		rdRemoveDashboardPanel : function(sPanelElementID,eEvent) {
			var rdFreeformLayout = document.getElementById('rdFreeformLayout');
			if (rdFreeformLayout!= null)
				if(rdFreeformLayout.id.toLowerCase() == 'rdhiddenrequestforwarding')
					rdFreeformLayout = null;   //#14758.
			//Remove the panel from the page.
			var elePanel = document.getElementById(sPanelElementID)
			if (elePanel) {  //If the user clicks a lot on the same button, this may not exist.
				var eleDropZoneBelow = document.getElementById(sPanelElementID.replace("rdDashboardPanel","rdDashboardDropZone")) //The drop zone below the panel.
				elePanel.parentNode.removeChild(elePanel)
				if(eleDropZoneBelow) eleDropZoneBelow.parentNode.removeChild(eleDropZoneBelow)

				//Clear the checkbox.
				var sPanelID = sPanelElementID.replace("rdDashboardPanel-","")
				var eleChecks = document.getElementsByTagName("INPUT")
				for (var i=0; i < eleChecks.length; i++) {
					var eleCheck = eleChecks[i]
					if (eleCheck.parentNode.innerHTML.indexOf('&quot;,' + sPanelID + '&quot;') != -1) {
						eleCheck.checked = false
					}
				}

				var rdPanelParams = "&rdReport=" + document.getElementById("rdDashboardDefinition").value;
				rdPanelParams += '&PanelInstanceID=' + this.rdGetPanelInstanceId(elePanel)
				 if(rdFreeformLayout){
					FreeForm.rdResizeDashboardContainer();
					rdPanelParams += "&rdFreeformLayout=True";
				 }
				 rdPanelParams += '&DashboardID=' + document.getElementById("DashboardIdentifier").value;
				rdAjaxRequestWithFormVars('rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=RemoveDashboardPanel' + rdPanelParams)
			}
		},

		rdDeleteCustomDashboardPanel : function(sPanelElementID, nRowNr, sBookmarksCollection, sBookmarkId) {
			var rdPanelParams = "&rdReport=" + document.getElementById("rdDashboardDefinition").value;
			rdPanelParams += '&sPanelID=' + sPanelElementID;

			var dashboardTabs = document.getElementById("rdActiveTabId_rdDashboardTabs");
			if ( Y.Lang.isValue( dashboardTabs ) ) {
				rdPanelParams += "&TabID=" + dashboardTabs.value;
			}

			rdAjaxRequestWithFormVars('rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=DeleteCustomDashboardPanel' + rdPanelParams);
			var dtPanelList = document.getElementById('dtPanelList');   //#12552.
			dtPanelList.childNodes[0].childNodes[nRowNr-1].style.display='none';
		},

		rdSetDropZone : function(eleDropZone) {

			if (this.get('rdDropZoneId')) {
				var eleOldDropZone = document.getElementById(this.get('rdDropZoneId'))
				if (eleOldDropZone) {
					if (eleOldDropZone.tagName == "TABLE") {
						//Table cell.
						eleOldDropZone.firstChild.firstChild.firstChild.className="rdDashboardDropZone"  //All these children get to the table's cell.
					}else{
						//Tab
						eleOldDropZone.firstChild.firstChild.firstChild.className = eleOldDropZone.firstChild.firstChild.firstChild.className.replace(" rdDashboardDropTabActive","")
					}
				}
			}

			if (eleDropZone) {
				this.set('rdDropZoneId', eleDropZone.id);
				if (eleDropZone.tagName == "TABLE") {
					//Table cell.
					eleDropZone.firstChild.firstChild.firstChild.className="rdDashboardDropZoneActive"
				 }else{
					//Tab
					eleDropZone.firstChild.firstChild.firstChild.className = eleDropZone.firstChild.firstChild.firstChild.className + " rdDashboardDropTabActive"
				 }
		   } else {
				this.set('rdDropZoneId', null);
			}
		},

		rdSaveDashboardOrder : function() {
			var eleHiddenPanelOrder = document.getElementById("rdDashboardPanelOrder")
			eleHiddenPanelOrder.value = ""
			var elePanels = document.getElementsByTagName("DIV")
			for (var i=0; i < elePanels.length; i++) {
				var elePanel = elePanels[i]
				if (elePanel.id.indexOf("rdDashboardPanel") == 0) {
					eleHiddenPanelOrder.value += "," + this.rdGetPanelInstanceId(elePanel)
					//Add the column number
					var nColNr = elePanel.parentNode.id.replace("rdDashboardColumn","")
					eleHiddenPanelOrder.value += ":" + nColNr
				}
			}
			var rdPanelParams = "&rdReport=" + document.getElementById("rdDashboardDefinition").value
			window.status = "Saving dashboard panel positions."
			rdAjaxRequestWithFormVars('rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=UpdateDashboardPanelOrder' + rdPanelParams)
		},

		rdSaveDashboardParams: function (sPanelElementID, bPanelRename, bSaveOnEnterOptionalParam) {

		    if (typeof bSaveOnEnterOptionalParam === 'undefined') {
		        if (document.activeElement.id.indexOf('rdDashboardPanelRename-') != -1) return; //#21118.
		    }
			var sErrorMsg = rdValidateForm();
			if (sErrorMsg) {
				alert(sErrorMsg);
				return;
			}

			//Hide the Save button.
			var sPanelID = sPanelElementID.replace("rdDashboardPanel-","");
			var elePanel = document.getElementById(sPanelElementID);

		    //Update the Panel Caption
		    //Hide the rename textbox div after editing.
			var nodeRenamePanelDiv = Y.one('#rdDashboardPanelRenameDiv-' + sPanelID);
			if (!Y.Lang.isNull(nodeRenamePanelDiv)) {
			    nodeRenamePanelDiv.setStyle('display', 'none');
			}
		    //Show the Panel Caption Div after editing is done.
			var nodePanelRenameCaptionDiv = Y.one('#rdDashboardPanelCaptionDiv-' + sPanelID);
			nodePanelRenameCaptionDiv.setStyle('display', '');
		    //Show the panel settings cog.
			var nodePanelSettingsCog = Y.one('#rdPanelSettingsCog_' + sPanelID);
			nodePanelSettingsCog.setStyle("display", "");
		    //Set the changed caption.
			if (!Y.Lang.isNull(nodeRenamePanelDiv)) {
			    var sRename = nodeRenamePanelDiv.one('#' + nodeRenamePanelDiv.get("id").replace("rdDashboardPanelRenameDiv-", "rdDashboardPanelRename-")).get("value");
			    if (nodePanelRenameCaptionDiv.one('#rdDashboardCaptionID').getHTML() != sRename) {
			        nodePanelRenameCaptionDiv.one('#rdDashboardCaptionID').setHTML(sRename);
			    } else {
			        if (typeof bPanelRename != 'undefined') {
			            return;
			        }
			    }
			}
			//Refresh the panel with updated parameters.
			var panelParameters = {
				parameters : "",
				ids : ""
			};

			panelParameters = this.rdGetRecursiveInputValues(elePanel, panelParameters);
            //Moved the params inputs to a popup which is not in the panel div, collect the values seperately.
			panelParameters = this.rdGetRecursiveInputValues(document.getElementById('ppPanelParams-' + sPanelID), panelParameters);
			panelParameters.parameters += "&rdReport=" + document.getElementById("rdDashboardDefinition").value;
			if (panelParameters.parameters.indexOf('&InstanceID') == -1) {
			  panelParameters.parameters += '&InstanceID=' + this.rdGetPanelInstanceId(elePanel); //22945
			}
			if (typeof bPanelRename != 'undefined') {
			    panelParameters.parameters += "&bPanelRename=true";
			}
			window.status = "Saving dashboard panel parameters.";

			//var dd = Y.DD.DDM.getDrag(elePanel);
			//dd.destroy();
			var panelNode = Y.one( elePanel ),
				initPanelCallback = Y.bind( FreeForm.initializePanel, window, panelNode, panelNode.getData( 'resizer' ) );

			rdAjaxRequestWithFormVars('rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=SaveDashboardParams&PanelID=' + sPanelID + panelParameters.parameters + "&ParamIDs=" + panelParameters.ids, null, null, null, null, initPanelCallback);
		},

		rdEditDashboardPanel : function(sDashboardPanelID) {
			var eleDashboardPanel = document.getElementById(sDashboardPanelID);
			var sId = sDashboardPanelID.substring(17)
			var rdDashboardPanelCaptionDiv =  document.getElementById('rdDashboardPanelCaptionDiv-' + sId)
			var rdDashboardPanelEditCancelDiv = document.getElementById('rdDashboardCancel-' + sId)
			try{
				if(rdDashboardPanelCaptionDiv){ //#13683.
					if(rdDashboardPanelEditCancelDiv){
						if(rdDashboardPanelEditCancelDiv.outerHTML){
							if(rdDashboardPanelEditCancelDiv.outerHTML.indexOf('rdIgnore') != -1)
								ShowElement(this.id, rdDashboardPanelCaptionDiv, 'Show');
						}
						else if(new XMLSerializer()){
							if(new XMLSerializer().serializeToString(rdDashboardPanelEditCancelDiv).indexOf('rdIgnore') != -1)
								ShowElement(this.id, rdDashboardPanelCaptionDiv, 'Show');
						}
					}
				}
			}catch(e){}

			this.rdPreventDragFromRename('rdDashboardPanelRename-' + sId);
		},

		rdGetRecursiveInputValues : function( eleParent, panelParameters ) {
		    for (var i = 0; i < eleParent.childNodes.length; i++) {
		        var eleCurr = eleParent.childNodes[i];

		        if ((eleCurr.nodeName)&& ((eleCurr.nodeName.toLowerCase() === "shape") || (eleCurr.nodeName.toLowerCase() === '#text'))) {  //#22614.
		            break;
		        }
                //Duplicate Id's being sent back with a ProServ's setup.
		        if (!Y.Lang.isNull(eleCurr.id)) {
		            if (panelParameters.ids.indexOf(eleCurr.id) > -1 && eleCurr.id.length > 0) {
		                var aParamIds = panelParameters.ids.split(":")
                        var bBreakLoop = false
                        for (var j = 0; j < aParamIds.length; j++) {
		                    var sParamId = aParamIds[j];
		                    if (sParamId === eleCurr.id) {
		                        bBreakLoop = true;
		                        break;
		                    }
		                }
		                if (bBreakLoop) {
		                    continue;
		                }
		            }
		        }
		        switch (eleCurr.type) {
					case 'hidden':
					case 'text':
					case 'email':
					case 'number':
					case 'tel':
					case 'textarea':
					case 'password':
					case 'select-one':
					case 'rdRadioButtonGroup':
					case 'file':
						var sValue = rdGetFormFieldValue(eleCurr);
						panelParameters.parameters += '&' + eleCurr.name + "=" + rdAjaxEncodeValue(sValue);
						panelParameters.ids += ":" + eleCurr.name;
						break;
					case 'select-multiple':
						var selectedItems = new Array();
						for (var k = 0; k < eleCurr.length; k++) {
							if (eleCurr.options[k].selected) {
								selectedItems[selectedItems.length] = eleCurr.options[k].value;
							}
						}
						if ( typeof window.rdInputValueDelimiter == 'undefined' ) {
							window.rdInputValueDelimiter = ',';
						}
						var sValue = selectedItems.join(rdInputValueDelimiter);
						panelParameters.parameters += '&' + eleCurr.name + "=" + rdAjaxEncodeValue(sValue);
						panelParameters.ids += ":" + eleCurr.name;
						break;
					case 'checkbox':
						if (eleCurr.checked) {
						    var sValue = rdGetInputValues(eleCurr);
						    //21205

						    if (panelParameters.parameters.indexOf(sValue) < 0)
						        panelParameters.parameters += sValue;

						    var aPanelParameterIds = panelParameters.ids.split(":");
						    var bIdInArray = false;
						    for (var i = 0; i < aPanelParameterIds.length; i++) {
						        if (aPanelParameterIds[i] === eleCurr.name)
						            bIdInArray = true;
						    }
						    if (!bIdInArray)
							    panelParameters.ids += ":" + eleCurr.name;
						}
						break;
					default:
						if(eleCurr.getAttribute){   //#14917.
							if(eleCurr.getAttribute("type") == 'rdRadioButtonGroup'){
								var sValue = rdGetFormFieldValue(eleCurr);
								panelParameters.parameters += '&' + eleCurr.getAttribute("name") + "=" + rdAjaxEncodeValue(sValue);
								panelParameters.ids += ":" + eleCurr.getAttribute("name");
								break;
							}else{
								panelParameters = this.rdGetRecursiveInputValues( eleCurr, panelParameters );
								break;
							}
						}else{
							//Not an input element.
							panelParameters = this.rdGetRecursiveInputValues( eleCurr, panelParameters );
							break;
						}
				}
			}

			return panelParameters;
		},

		rdRenameDashboardTab: function (bSaveOnEnterOptionalParam) {
		    if (typeof bSaveOnEnterOptionalParam === 'undefined') {
		        if (document.activeElement.id.indexOf('txtRenameTab') != -1) return; //#21118.
		    }
		    //Show the cog after editing the Tab name.
		    var nodeTabSettingsCog = Y.one('#rdSettingsCog');
		    nodeTabSettingsCog.setStyle("display", "");
		    //Hide the textbox after editing is done.
		    Y.one("#rdRenameTabDiv").setStyle("display", "none");

			var sTabID = document.getElementById("rdActiveTabId_rdDashboardTabs").value
			var eleTab = document.getElementById(sTabID)
			var eleRenameTxt = Y.one("#txtRenameTab").getDOMNode();
			var sNewName = eleRenameTxt.value
			var sOldName
			if (eleTab.textContent) {
				sOldName = eleTab.textContent
			}else{
				sOldName = eleTab.innerText //IE
			}
			var eleTabNameLabel = Y.one(eleTab).one('#rdCaption_' + sTabID).getDOMNode();
			if (sNewName.replace(/ /g, '').length == 0) {
			    document.getElementById("txtRenameTab").value = sOldName
			    return
			}
            //22432 - IE does not have the textContent attribute. Need to use innerText.
			if (eleTabNameLabel.textContent) {
			    eleTabNameLabel.textContent = sNewName;
			} else {
			    eleTabNameLabel.innerText = sNewName;
			}
			//Report the new name back to the server.
			var rdParams = "&rdReport=" + document.getElementById("rdDashboardDefinition").value
			rdParams += "&TabID=" + sTabID
			rdParams += "&NewName=" + rdAjaxEncodeValue(sNewName)
			bSubmitFormAfterAjax = true //13690
			rdAjaxRequest('rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=RenameDashboardTab' + rdParams);
			LogiXML.Dashboard.pageDashboard.rdPositiontabSettingsCog();
		},

		rdShowRenameTab: function(){
		    var sTabID = document.getElementById("rdActiveTabId_rdDashboardTabs").value
		    var eleTab = document.getElementById(sTabID)

            //Hide the cog when editing the Tab name.
		    var nodeTabSettingsCog = Y.one('#rdSettingsCog');
		    nodeTabSettingsCog.setStyle("display", "none");
            //Move the Rename text div over hte Tab caption label and set the width of the Span holding the text box.
		    var nodeTabCaptionLabel = Y.one(eleTab).one("#rdCaption_" + sTabID);
		    var nodeTab = Y.one(eleTab);
		    var nodeRenameTabDiv = Y.one("#rdRenameTabDiv");
		    nodeRenameTabDiv.setStyles({
		        left: nodeTab.getX() + 5,
		        top: nodeTabCaptionLabel.getY(),
		        display: '',
		        position: 'absolute',
                width: nodeTab.get("scrollWidth") - 20
		    });
            //Now set the width of the text box.
		    var nodeRenameTabText = Y.one('#txtRenameTab');
		    nodeRenameTabText.setStyle("width", '100%');
		    nodeRenameTabText.focus();
		},

		rdShowRenamePanel: function(sPanelElementID, sPanelInstanceID){
		    var nodePanel = Y.one(sPanelElementID);
            //Show the rename textbox div for editing.
		    var nodeRenamePanelDiv = Y.one('#rdDashboardPanelRenameDiv-' + sPanelInstanceID);
		    nodeRenamePanelDiv.setStyle('display', '');
		    //Hide the Panel Caption Div.
		    var nodePanelRenameCaptionDiv = Y.one('#rdDashboardPanelCaptionDiv-' + sPanelInstanceID);
		    nodePanelRenameCaptionDiv.setStyle('display', 'none');
            //Hide the panel settings cog.
		    var nodePanelSettingsCog = Y.one('#rdPanelSettingsCog_' + sPanelInstanceID);
		    nodePanelSettingsCog.setStyle("display", "none");
            //set the focus in the text box.
		    var nodeRenamePanelTextbox = Y.one('#rdDashboardPanelRename-' + sPanelInstanceID);
		    nodeRenamePanelTextbox.focus();
		},

		rdShowRenamePanel: function(sPanelElementID, sPanelInstanceID){
		    var nodePanel = Y.one(sPanelElementID);
		    var nodeRenamePanelDiv = Y.one('#rdDashboardPanelRenameDiv-' + sPanelInstanceID);
		    nodeRenamePanelDiv.setStyle('display', '');
		    var txtRenamePanel = Y.one('#rdDashboardPanelRename-' + sPanelInstanceID).getDOMNode();
		    if (txtRenamePanel.createTextRange) {
		        var range = txtRenamePanel.createTextRange();
		        range.move('character', txtRenamePanel.value.length - 1);
		        range.select();
		    }
		    else {
		        txtRenamePanel.focus();
		        txtRenamePanel.setSelectionRange(txtRenamePanel.value.length, txtRenamePanel.value.length);
		    }

		    var nodePanelRenameCaptionDiv = Y.one('#rdDashboardPanelCaptionDiv-' + sPanelInstanceID);
		    nodePanelRenameCaptionDiv.setStyle('display', 'none');

		},

		rdMoveDashboardTab : function(sDirection) {
			var sTabID = document.getElementById("rdActiveTabId_rdDashboardTabs").value
			var eleTab = document.getElementById(sTabID)
			var eleTabContentDiv = document.getElementById('rdTabPanel_' + sTabID)
			var bMoveOK = false
			switch (sDirection) {
				case 'Left':
					var eleTabSibling = eleTab.previousSibling
					var eleTabContentDivSibling = eleTabContentDiv.previousSibling
					if (eleTabSibling && eleTabContentDivSibling) {
						eleTab.parentNode.insertBefore(eleTab.parentNode.removeChild(eleTab), eleTabSibling)
						eleTabContentDiv.parentNode.insertBefore(eleTabContentDiv.parentNode.removeChild(eleTabContentDiv), eleTabContentDivSibling)
						bMoveOK = true
					}
					break;
				case 'Right':
					var eleTabSibling = eleTab.nextSibling
					var eleTabContentDivSibling = eleTabContentDiv.nextSibling
					if (eleTabSibling && eleTabContentDivSibling) {
						if (eleTabSibling.getAttribute("id") != "rdTabAddNewTab") { //Don't move past the "Add Tab".
							if(eleTabSibling.nextSibling){
								eleTab.parentNode.insertBefore(eleTab.parentNode.removeChild(eleTab), eleTabSibling.nextSibling)
								eleTabContentDiv.parentNode.insertBefore(eleTabContentDiv.parentNode.removeChild(eleTabContentDiv), eleTabContentDivSibling.nextSibling)
								bMoveOK = true
							}else{
								eleTab.parentNode.appendChild(eleTab.parentNode.removeChild(eleTab))
								eleTabContentDiv.parentNode.appendChild(eleTabContentDiv.parentNode.removeChild(eleTabContentDiv))
								bMoveOK = true
							}
						}
					}
					break;
			}

			//Report the new name back to the server.
			if (bMoveOK) {
				var rdParams = "&rdReport=" + document.getElementById("rdDashboardDefinition").value
				rdParams += "&TabID=" + sTabID
				rdParams += "&Direction=" + sDirection
				rdAjaxRequest('rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=MoveDashboardTab' + rdParams)
			}

		},

		rdMovePanelToTab : function(sPanelElementID, sTabID, eleDropZone) {
			var elePanel = document.getElementById(sPanelElementID)
			if (elePanel) {
				//Remove the panel and its drop zone.
				var eleDropZoneBelow = document.getElementById(sPanelElementID.replace("rdDashboardPanel","rdDashboardDropZone"))
				elePanel.parentNode.removeChild(elePanel)
				if(eleDropZoneBelow)
					eleDropZoneBelow.parentNode.removeChild(eleDropZoneBelow)

			    //Reset the tab's class.
				if (!Y.Lang.isNull(eleDropZone.firstChild)) { //Do not do this for a Mobile Dashboard, #18814.
				    eleDropZone.firstChild.firstChild.firstChild.className = eleDropZone.firstChild.firstChild.firstChild.className.replace(" rdDashboardDropTabActive", "")
				}

				//Report the new name back to the server.
				var rdParams = "&rdReport=" + document.getElementById("rdDashboardDefinition").value
				rdParams += '&PanelInstanceID=' + this.rdGetPanelInstanceId(elePanel)
				rdParams += "&TabID=" + sTabID
				rdAjaxRequest('rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=MoveDashboardPanelToTab' + rdParams)
			}
		},

		rdPositiontabSettingsCog: function (bDelayPositioning) {
		    if (typeof bDelayPositioning != 'undefined') {
		        setTimeout(this.rdPositiontabSettingsCog, 500);
                return;
		    }
		    var nodeSettingsCog = Y.one('#rdSettingsCog');
		    //Tab Settings Cog.
		    var nodeActiveTab = Y.one(".selected");
		    if (Y.Lang.isNull(nodeActiveTab)) {
                nodeSettingsCog.setStyle("display", "");
		        return;
		    }
		    //Make the panels draggable.
		    if (typeof (rdMobileReport) === 'undefined') { //No draggable tabs in mobile.
		        nodeActiveTab.get("firstChild").setStyle("cursor", "move");
		    }
		    if (!Y.Lang.isNull(nodeActiveTab)) {
		        var regionActiveTab = Y.DOM.region(nodeActiveTab.getDOMNode());
		        if (typeof (rdMobileReport) == 'undefined') {
		            nodeSettingsCog.setStyles({
		                left: (regionActiveTab.left + regionActiveTab.width - 19),
		                top: (regionActiveTab.top + 4),
		                position: 'absolute',
		                display: ''
		            });
		        }
		        else {
		            nodeSettingsCog.setStyles({
		                left: (regionActiveTab.left + regionActiveTab.width - 24),
		                top: (regionActiveTab.top + 4),
		                position: 'absolute',
		                display: ''
		            });
		        }
		    }
            //Add Tab Cog.
		    var TabsUl = Y.one('#rdTabs ul')
		    var nodeAddNewTabCog = Y.one('#rdAddTabCog');
		    if (!Y.Lang.isNull(nodeAddNewTabCog)) {
		        nodeAddNewTabCog.setStyles({
		            left: TabsUl.getX() + TabsUl.get("scrollWidth") + 15,
		            top: TabsUl.getY(),
                    position: 'absolute',
                    display: ''
		        });
		    }
		},

		rdAddNewTab: function(){
		    var Tabs = Y.one('#rdTabs-rdDashboardTabs').getData('tabs');
		    document.getElementById('rdActiveTabIndex_rdDashboardTabs').value = '0';
		    document.getElementById('rdActiveTabId_rdDashboardTabs').value = 'rdTabAddNewTab';
		    var aHiddenTabValues = Y.all(Y.one('input[name=rdDashboardTabs]')); //#21257.
		    for (i = 0; i < aHiddenTabValues.size(); i++) {
		        var nodeHiddenTabValue = aHiddenTabValues.item(i);
		        if (typeof nodeHiddenTabValue.get('value') != 'undefined') {
		            nodeHiddenTabValue.set('value', 'rdTabAddNewTab');
		        }
		    }
		    Tabs.TabsTarget().fire('selectedTabChanged');
		    this.rdRefreshDashboard();
		},

		rdRefreshDashboard: function (bSetRepotLayoutInViewMode) {
		    var nodeDashboardId = Y.one('#DashboardIdentifier');
		    var dashboardTabs = document.getElementById("rdActiveTabId_rdDashboardTabs");
		    if(!Y.Lang.isNull(dashboardTabs)){
		        rdAjaxRequest('rdAjaxCommand=RefreshElement&rdRefreshElementID=' + nodeDashboardId.get("value") + ',rdDashboardTabs' + '&rdRefreshDashboard=True&rdReport=' + document.getElementById("rdDashboardDefinition").value + '&rdRequestForwarding=Form');
		    } else {  //When no tabs.
		        rdAjaxRequest('rdAjaxCommand=RefreshElement&rdRefreshElementID=' + nodeDashboardId.get("value") + ',rdDashboardPanels' + '&rdRefreshDashboard=True&rdReport=' + document.getElementById("rdDashboardDefinition").value + '&rdRequestForwarding=Form');
		    }
		},

		rdAddDashboardPanels: function(){
		    if (LogiXML.Dashboard.pageDashboard.get('nNewAddedPanelCount') > 0) {
		        LogiXML.Dashboard.pageDashboard.rdRefreshDashboard();
		    }
		    ShowElement(null, 'ppChangeDashboard,ppAddPanels', 'Hide');
		},

		rdAddRefreshEventForAddPanelsPopupCloseButton: function () {
		    var nodeChangeDashboardPopup = Y.one('#ppChangeDashboard');
		    var nodeCloseButton = nodeChangeDashboardPopup.all('#rdPopupPanelX').get("node")[0];
		    if (typeof this.rdAddDashboardPanels === 'undefined') {
		        nodeCloseButton.on('click', LogiXML.Dashboard.pageDashboard.rdAddDashboardPanels);
		    } else {
		        nodeCloseButton.on('click', this.rdAddDashboardPanels);
		    }
		},

		rdRefreshDashboardPanel: function (e, sDashboardId, bSetRepotLayoutInViewMode) {
		    rdAjaxRequest('rdAjaxCommand=RefreshElement&rdRefreshElementID=rdDashboardPanels&rdRefreshDashboard=True&rdReport=' + document.getElementById("rdDashboardDefinition").value + '&rdRequestForwarding=Form');
		},

		rdAddRefreshEventForPanelEditPopupCloseButton: function (sDashboardPanelId, bAddRefreshEvent) {
		    if (typeof bAddRefreshEvent === 'undefined' || bAddRefreshEvent === "") return;
		    var nodePanelParamsPopup = Y.one('#' + sDashboardPanelId.replace('rdDashboardPanel-', 'ppPanelParams-'))
		    var nodeCloseButton = nodePanelParamsPopup.all('#rdPopupPanelX').get("node")[0];
		    if (typeof this.rdRefreshDashboardPanel === 'undefined') {
		        nodeCloseButton.on('click', LogiXML.Dashboard.pageDashboard.rdRefreshDashboardPanel, null, sDashboardPanelId);
		    } else {
		        nodeCloseButton.on('click', this.rdRefreshDashboardPanel, null, sDashboardPanelId);
		    }
		},

		rdSetAddPanelsPopupSize: function () {
		    var eleAddPanelsList = document.getElementById('rdAddPanelsList');
		    if (eleAddPanelsList) {
		        var nPanelHeight = (3 * (Y.one("body").get("winHeight") / 4)) > 400 ? (3 * (Y.one("body").get("winHeight") / 4)) : 400;
		        eleAddPanelsList.style.height = nPanelHeight + 'px';
		        eleAddPanelsList.style.overflow = 'auto';
		    }
		},

		rdSetDashboardColumns : function(sOptionalChangeLayout) {
		    var sTabID = document.getElementById("ActiveTabIdentifier").value
			var eleTab = document.getElementById(sTabID)
			var nColumnCount = document.getElementById("lstColumnCount").value

			var nWideColumn = rdGetFormFieldValue(document.getElementById('rdRadioButtonGroupradWideColumn'))

			if (typeof sOptionalChangeLayout === 'undefined') {
			    //Report the new column count back to the server.
			    var rdParams = "&rdReport=" + document.getElementById("rdDashboardDefinition").value
			    rdParams += "&TabID=" + sTabID
			    rdParams += "&NewColumnCount=" + nColumnCount;//(nColumnCount == 'Free-form' ? 0 : nColumnCount);
			    rdParams += "&NewWideColumn=" + nWideColumn
			    rdAjaxRequest('rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=SetDashboardTabColumns' + rdParams)
			}

			if(nColumnCount == 'Free-form'){   // Freeform Layout.
			document.getElementById('divFreeformPanels').style.display = ''
			document.getElementById("divWideColumn").style.display = 'none';
			var eleFreeformLayout = document.getElementById('rdFreeformLayout');
			if (eleFreeformLayout!= null)
				if(eleFreeformLayout.id.toLowerCase() == 'rdhiddenrequestforwarding')
					eleFreeformLayout = null;   //#14758.
			if(eleFreeformLayout == null){
				eleFreeformLayout = document.createElement("INPUT");
				eleFreeformLayout.setAttribute("TYPE", "HIDDEN")
				eleFreeformLayout.setAttribute("ID", "rdFreeformLayout")
				eleFreeformLayout.setAttribute("NAME", "rdFreeformLayout")
				eleFreeformLayout.style.display = 'none';   //#14663.
				eleTab.appendChild(eleFreeformLayout);
			}
			return;
			}else{
				var eleDivFreeformPanels = document.getElementById('divFreeformPanels');
				if(eleDivFreeformPanels) eleDivFreeformPanels.style.display = 'none';
				var eleFreeformLayout = document.getElementById('rdFreeformLayout');
				if(eleFreeformLayout) eleFreeformLayout.parentNode.removeChild(eleFreeformLayout);
			}
			//Update the UI for the Layout by fixing the image names.
			var eleRadioButtons = document.getElementById("rdRadioButtonGroupradWideColumn").parentNode
			var divRadioButtons = document.getElementById("divWideColumn")
			if (nColumnCount == 1) {
				divRadioButtons.style.display="none"
			} else {
				divRadioButtons.style.display=""
				if (eleRadioButtons.childNodes.length == 1) {
					eleRadioButtons = eleRadioButtons.firstChild.firstChild //For non-IE.
				}
				for (var i=0; i < eleRadioButtons.childNodes.length; i++) {
					var ele = eleRadioButtons.childNodes[i]
						if (typeof ele.tagName != "undefined") {
						if (ele.tagName.toUpperCase() == "IMG") {
							if (ele.src.indexOf("rdLayout") != -1) {
								var src = ele.src.substring(0,ele.src.indexOf("rdLayout") + 8)
								src += nColumnCount
								src += ele.src.substring(src.indexOf("rdLayout") + 9)
								ele.src = src
							}
						}
					}
				}
			}
		},

		rdGetPanelInstanceId : function(elePanel) {
			//The instance ID is the  string after the last "-" from the ID.
			return elePanel.id.substr(elePanel.id.lastIndexOf("_") + 1)
		},

		rdRemoveDashboardParams : function() {
			//Don't pass on values from the dashboard paramers. They are only needed when saving params.13456
			var elePanelParams = document.getElementById("rdDashboardParams")
			while (elePanelParams) {
				elePanelParams.parentNode.removeChild(elePanelParams)
				elePanelParams = document.getElementById("rdDashboardParams")
			}
		},

		rdMoveMobileDashboardPanel : function(sDashboardPanelId, sChangePanelAction, sPopupPanelID) {
			// function to move the Mobile Dashboard Panels around.
		    ShowElement(this.id, sPopupPanelID, 'Toggle');

			var elePanel = document.getElementById(sDashboardPanelId);
			var elePanelResizerAttr = elePanel.nextSibling;
			var elePanelDropZone = elePanelResizerAttr.nextSibling;

			var elePrecedingPanel = null, eleSuccedingPanel = null, eleSuccedingPanelResizerAttr = null, eleSuccedingPanelDropZone = null;

			if (elePanel.previousSibling != null) {
			    if (elePanel.previousSibling.previousSibling != null) {
			        if (elePanel.previousSibling.previousSibling.previousSibling != null) {
			            elePrecedingPanel = elePanel.previousSibling.previousSibling.previousSibling;
			        }
			    }
			}

			if (elePanel.nextSibling != null) {
			    if (elePanel.nextSibling.nextSibling != null) {
			        if (elePanel.nextSibling.nextSibling.nextSibling != null) {
			            eleSuccedingPanel = elePanel.nextSibling.nextSibling.nextSibling;
			            eleSuccedingPanelResizerAttr = eleSuccedingPanel.nextSibling;
			            eleSuccedingPanelDropZone = eleSuccedingPanelResizerAttr.nextSibling;
			        }
			    }
			}

			switch(sChangePanelAction){
			    case "MoveUp":
			        if(elePrecedingPanel != null){
			            elePanelDropZone.parentNode.insertBefore(elePanelDropZone, elePrecedingPanel);
			            elePanelResizerAttr.parentNode.insertBefore(elePanelResizerAttr, elePanelDropZone);
			            elePanel.parentNode.insertBefore(elePanel, elePanelResizerAttr);
			            this.rdSaveDashboardOrder();
			            break;
			        }
			    case "MoveDown":
			        if(eleSuccedingPanel != null){
			            eleSuccedingPanelDropZone.parentNode.insertBefore(eleSuccedingPanelDropZone, elePanel);
			            eleSuccedingPanelResizerAttr.parentNode.insertBefore(eleSuccedingPanelResizerAttr, eleSuccedingPanelDropZone);
			            eleSuccedingPanel.parentNode.insertBefore(eleSuccedingPanel, eleSuccedingPanelResizerAttr);
			            this.rdSaveDashboardOrder();
			            break;
			        }
				case "Edit":
					this.rdEditDashboardPanel(sDashboardPanelId);
					break;
				case "Remove":
					if(confirm("Are you sure?"))
						this.rdRemoveDashboardPanel(sDashboardPanelId);
					break;
				default:
					this.rdMovePanelToTab(sDashboardPanelId, sChangePanelAction, elePanelDropZone);
					break;
			}
		},

		rdNavigateBetweenDashboardTabs : function(sTabIdentifier, sPopupPanelID) {
			// function runs on picking a Tab from the Tabs menu.
			ShowElement(this.id, sPopupPanelID, 'Hide');
			document.getElementById('rdActiveTabIndex_rdDashboardTabs').value = '0';
			document.getElementById('rdActiveTabId_rdDashboardTabs').value = sTabIdentifier;    // Set this Value to the New Tab Id.
			var sReportName = document.getElementById('rdDashboardDefinition').value;
			SubmitForm('rdPage.aspx?rdReport=' + sReportName + '&rdRequestForwarding=Form','', 'false');
		},

		rdShowChangePanelMenu : function(sPopupPanelID, sDashboardPanelId) {
			ShowElement(this.id, sPopupPanelID, 'Toggle');
			try{
				var elePopupPanel = document.getElementById(sPopupPanelID);
				var elePanel = document.getElementById(sDashboardPanelId);
				var elePanelPreviousSibling = elePanel.previousSibling;
				var elePanelNextSibling = elePanel.nextSibling.nextSibling.nextSibling;
				if(elePanelPreviousSibling.id.match('rdDashboardDropZone-0-0')){
					var eleOptionsList = elePopupPanel.getElementsByTagName('td')
					for(i=0; i<eleOptionsList.length; i++){
						var eleTD = eleOptionsList[i]
						if (eleTD.outerHTML.match('MoveUp')){
							if(eleTD.getAttribute('id')){
								  if(eleTD.getAttribute('id').match('rdDataMenuTable_Row'))
									eleTD.parentNode.style.display = 'none';
							}
						}
					}

				}else{
					var eleOptionsList = elePopupPanel.getElementsByTagName('td')
					for(i=0; i<eleOptionsList.length; i++){
						var eleTD = eleOptionsList[i]
						if (eleTD.outerHTML.match('MoveUp')){
							if(eleTD.getAttribute('id')){
								 if(eleTD.getAttribute('id').match('rdDataMenuTable_Row'))
									eleTD.parentNode.style.display = '';
							}
						}
					}
				}

				 if(!elePanelNextSibling){
					var eleOptionsList = elePopupPanel.getElementsByTagName('td')
					for(i=0; i<eleOptionsList.length; i++){
						var eleTD = eleOptionsList[i]
						if (eleTD.outerHTML.match('MoveDown')){
							if(eleTD.getAttribute('id')){
								  if(eleTD.getAttribute('id').match('rdDataMenuTable_Row'))
									eleTD.parentNode.style.display = 'none';
							}
						}
					}

				}else{
					var eleOptionsList = elePopupPanel.getElementsByTagName('td')
					for(i=0; i<eleOptionsList.length; i++){
						var eleTD = eleOptionsList[i]
						if (eleTD.outerHTML.match('MoveDown')){
							if(eleTD.getAttribute('id')){
								  if(eleTD.getAttribute('id').match('rdDataMenuTable_Row'))
									eleTD.parentNode.style.display = '';
							}
						}
					}
				}
			}
			catch(e){}
		},

		rdSizeUnAdjustablePanels : function(sClassSelector){

		    var aDashboardPanels = Y.Selector.query('.' + sClassSelector, Y.DOM.byId('rdDivDashboardpanels'))
			for (var i=0; i < aDashboardPanels.length; i++){
				var eleDashboardPanel = aDashboardPanels[i];
				var nHeight = (eleDashboardPanel.offsetHeight-4) + 'px';    // Substracting 4px to compensate the panel growth on every page request.
				var nWidth = (eleDashboardPanel.offsetWidth-4) + 'px';

				eleDashboardPanel.style.height = nHeight
				eleDashboardPanel.style.width = nWidth

				//var elePanelTable = eleDashboardPanel.firstChild;
				//var elePanelTitle = document.getElementById(eleDashboardPanel.id.replace('rdDashboardPanel', 'rdDashboardPanelTitle'))
				//elePanelTitle.parentNode.removeChild(elePanelTitle);
				//var nTitleHeight = elePanelTitle.offsetHeight;
				//var elePanelParams =  elePanelTitle.nextSibling;
				//var nParamsHeight
				//if(elePanelParams.style.display == 'none'){
				//	nParamsHeight = 0;
				//}else{
				//	nParamsHeight = elePanelParams.offsetHeight;
			    //}

				var eleContent = Y.one('#' + eleDashboardPanel.id.replace('rdDashboardPanel-', 'rdDashboard2PanelContent_')).getDOMNode();;
				eleContent.style.overflow = 'visible';
                //22474 - 'auto' caused scrollbars to be shown
			    //eleContent.style.overflow = 'auto';

				//eleContent.style.width = (eleDashboardPanel.offsetWidth-10) + 'px';
				//var nContentHeight = (eleDashboardPanel.offsetHeight - nTitleHeight - nParamsHeight -10)
				//eleContent.style.height = (nContentHeight < 20 ? 20 : nContentHeight) + 'px';

				eleDashboardPanel.style.overflow = 'hidden';
			}
		},

		rdSetDashboardPanelOpacity : function(eleDashboardPanel, nOpacity) {

			var aDashboardPanels = Y.all('.rdDashboardPanel');
			for (var i=0; i < aDashboardPanels.size(); i++){
				var elePnl = aDashboardPanels.item(i);
				if(elePnl.get('id') == eleDashboardPanel.get('id')) continue  // Do not change the opacity of the panel being moved.
				elePnl.setStyle('opacity', nOpacity);
			}
		},

		rdResizePanelContentOnEditCancelSave: function (e, objIDs) {
		    if (document.getElementById('rdFreeformLayout') == null) return;    //#19294.
			var context = this;
			var eleContent = document.getElementById(objIDs[0]);
			var eleDashboardPanel = document.getElementById(objIDs[1]);
			var sAction = objIDs[2];
			var elePanelTable = eleDashboardPanel.firstChild;
			var elePanelTitle = elePanelTable.firstChild.firstChild;
			var nTitleHeight = elePanelTitle.offsetHeight;
			var elePanelParams =  elePanelTitle.nextSibling;
			var nParamsHeight = 0;

			if(elePanelParams.style.display == 'none'){
				if(sAction == "Edit"){
					setTimeout(function(){context.rdResizePanelContentOnEditCancelSave(e, objIDs)}, 10);
					return;
				}
			}else{
				if(sAction == "Save" || sAction == "Cancel"){
					setTimeout(function(){context.rdResizePanelContentOnEditCancelSave(e, objIDs)}, 10);
					return;
				}
			}
			nParamsHeight = (navigator.appVersion.match('MSIE 8.0') != null ? elePanelParams.clientHeight : elePanelParams.offsetHeight);
			var nContentHeight = (eleContent.offsetHeight + nTitleHeight + nParamsHeight + 12); //#19106 Reverting changes from 18978 to fix
			eleDashboardPanel.style.height = (nContentHeight < 20 ? 20 : nContentHeight) + 'px';
			eleDashboardPanel.style.width = elePanelTable.offsetWidth + 'px'; //#18978.
			FreeForm.rdResizeDashboardContainer();
		},

		rdPreventDragFromRename : function(sRenameElementId) {
			var eleRename = document.getElementById(sRenameElementId)
			if (eleRename) {
				eleRename.onmousedown =
					function(e) {
						e = e || window.event //Get the event object for all browsers
						e.cancelBubble=true;
						return true;
					}
			}
		},

		rdGetDbPanelHeight : function(eleObject) {
			return(eleObject.offsetParent ? (this.rdGetDbPanelHeight(eleObject.offsetParent) + eleObject.offsetTop) : eleObject.offsetTop);
		},

		rdSetAppletVisibility : function(sVis) {
			//Hide objects that will intefere with DnD.
			//applets
			var eleApplets = document.getElementsByTagName("applet")
			for (var i=0; i < eleApplets.length; i++) {
				var eleApplet = eleApplets[i]
				eleApplet.style.visibility = sVis
			}
			//Flash with IE
			eleApplets = document.getElementsByTagName("object")
			for (var i=0; i < eleApplets.length; i++) {
				var eleApplet = eleApplets[i]
				eleApplet.style.visibility = sVis
			}
			//Flash with Mozilla.
			eleApplets = document.getElementsByTagName("embed")
			for (var i=0; i < eleApplets.length; i++) {
				var eleApplet = eleApplets[i]
				eleApplet.style.visibility = sVis
			}
		},

		rdResetDashboardPanelAfterDDScroll : function(elePnlDragged, posDashboardPanelFinalCoOrds) {

			var pnlDragged = Y.one(elePnlDragged);
			pnlDragged.setXY(posDashboardPanelFinalCoOrds);
		}

	},{
		// Y.Dashboard properties
		/**
		 * The identity of the widget.
		 *
		 * @property Dasbhoard.NAME
		 * @type String
		 * @default 'Dashboard'
		 * @readOnly
		 * @protected
		 * @static
		 */
		NAME : 'dashboard',

		/**
		 * Static property used to define the default attribute configuration of
		 * the Widget.
		 *
		 * @property Dasboard.ATTRS
		 * @type {Object}
		 * @protected
		 * @static
		 */
		ATTRS : {
			//Id of the current drop zone
			rdDropZoneId : { },
			//Count of new panels
			nNewAddedPanelCount : {
				value: 0
			},
			//Is this a freeform dashboard
			bIsFreeformLayout : {
				value: false
			},
			//Is this dashboard running on a touch device
			bIsTouchDevice : {
				value: LogiXML.features['touch']
			},
		    bDashboardAdjustable: {
                value: true
		    },
		    zIndex: {
                value: 0
		    }
		}
	});

}, '1.0.0', { requires: ['dd-drop-plugin', 'dd-plugin', 'dd-scroll', 'dashboard-freeform'] });

// region KPI's

var sColorPicker = '1';
var sPanelInstanceId = '';
var elePanel = null;
var eleParamsPopup = null;

function GetColorPicker(sColorPickerValue, objImg){
    sColorPicker = sColorPickerValue;
    eleParamsPopup = Y.Selector.ancestor(objImg, '[rdpopuppanel=True]', false);
    elePanel = Y.one('#' + eleParamsPopup.id.replace('ppPanelParams-', 'rdDashboardPanel-'));
    sPanelInstanceId = elePanel.get('id').substring(elePanel.get('id').lastIndexOf('_') + 1);
}

function PickGaugeGoalColor(colColor){
    var sColor = Y.Color.toHex(Y.one('#' + colColor.id).getComputedStyle('backgroundColor'));
    var eleColorHolder = document.getElementById('rdAgGaugeGoalsColor' + sColorPicker + '_' + sPanelInstanceId);
    eleColorHolder.value = sColor;
    var elePickedColorIndicator = Y.Selector.query('#rectColor' + sColorPicker, eleParamsPopup, true);
    elePickedColorIndicator.style.backgroundColor = sColor;
    ShowElement(this.id,'ppColors','Hide');
}

//End region

YUI.add('dashboard-freeform', function(Y) {
	"use strict";

	/*
	 * This code assumes you're working with FreeFrom Dashboard panels laid out like so
	 * <DIV id="rdDashboardPanel-..." class="rdDashboardPanel">
	 *   <TABLE id="rdDashboardPanelInnerTable" clas="panelInnerTable" > Yes, same id for all panels -_-
	 *     <TBODY>
	 *       <TR id="rdDashboardPanelTitle-..." class="panelTitle">
	 *       <TR id="rdDashboard2PanelParams-..." class="rdDashboardParams">
	 *       <TR id="Dashboard2PanelContent" class="rdDashboardContent">
	 *         <TD>
	 *            <DIV id="rdDashboard2PanelContent_...">
	 *              <content>
	 *
	 * -------------------------------------------------------------
	 *
	 * Dashboards as a whole could be rewritten in much simpler HTML.  I tried but the server side xpath mess
	 * was too much to work through in the time available.  For now I'm just cleaning up the code, but
	 * some ground work has been laid to reduce code duplication.
	 */

	var FreeForm = Y.namespace('LogiXML.Dashboard.FreeForm'),
        DASHBOARD_CHART_MARKER = 'dashboardChart',

	getContentWidth = function( node ) {
		node = Y.one( node );

		if ( Y.Lang.isValue( node ) ) {
			return getContentDimension( node, 'w' );
		}
		else {
			return NaN;
		}
	},

	getContentHeight = function( node ) {
		node = Y.one( node );

		if ( Y.Lang.isValue( node ) ) {
			return getContentDimension( node, 'h' );
		}
		else {
			return NaN;
		}
	},

	getContentDimension = function( node, dimension ) {
		dimension = dimension.toLowerCase();
		if ( dimension === 'w'  || dimension === 'width' ) {
			return node.get('clientWidth') - parseInt( node.getComputedStyle('paddingLeft'), 10 ) - parseInt( node.getComputedStyle('paddingRight'), 10 );
		}
		else if ( dimension === 'h' || dimension === 'height' ) {
			return node.get('clientHeight') - parseInt( node.getComputedStyle('paddingTop'), 10 ) - parseInt( node.getComputedStyle('paddingBottom'), 10 );
		}
		return NaN;
	};

	FreeForm.initializePanelResizer = function( panel ) {
		var panelNode = Y.one( panel ),
			resizeAttributes = Y.one( '#rdResizerAttrs_' + panelNode.get('id') ),
			resizer, charts;

		// Ignore calls made with no Resize options
		if ( !Y.Lang.isValue( resizeAttributes ) )
		{
			return;
		}

		// How many charts are within the panel?
		charts = panelNode.all('img.dashboardChart,div.rdChartCanvas');

		// Initialize resizer
		resizer = Y.rdResize.AddYUIResizerHandles( panelNode.get('id'), resizeAttributes )

		// Store an instance of the Panel's resizer for use later if Panel is refreshed after changing Panel Parameters
		panelNode.setData( 'resizer', resizer );

		FreeForm.initializePanel( panelNode, resizer );
		// Multiple charts/No Charts = no chart resizing
		// One chart = chart resizing
		FreeForm.addResizeEventHandlers( resizer, panelNode, charts.size() === 1 );
	};

	FreeForm.initializePanel = function( panelNode, resizerInstance ) {
		// How many charts are within the panel?
	    var charts = panelNode.all('img.dashboardChart,div.rdChartCanvas'),
			resizer = resizerInstance || panelNode.getData('resizer');

		// Multiple Charts
		if ( charts.size() !== 1 ) {
			FreeForm._initializeMultiContentPanel( panelNode, charts );
		}
		// Single Chart
		else {
			FreeForm._initializeSingleChartPanel( panelNode, charts.item(0), resizer );
		}

		charts.each(function( chartNode ) {
			//#18513 The chart needs to initialize after ajax refresh
			LogiXML.Ajax.AjaxTarget().on('reinitialize', Y.bind(FreeForm._reinitializeChart, this, '#' + chartNode.get('id'), '#' + panelNode.get('id')));
		}, this);
	};

	FreeForm._reinitializeChart = function ( chartPointer, panelPointer ) {
		// Load real chart image
		var chartNode = Y.one(chartPointer);
		var panelNode = Y.one(panelPointer);
		if (Y.Lang.isNull(panelNode)) return;   //#21129.

		if (!Y.Lang.isNull(chartNode)){
		    if (Y.Lang.isValue(chartNode) && (chartNode.hasClass("rdChartCanvas") && !Y.Lang.isValue(chartNode.getData('rdChartCanvas'))) ||
                 (chartNode.get('src') && chartNode.get('src').indexOf("rd1x1Trans.gif") != -1)) {
		        // Resize chart and load it
		        FreeForm.resizeChartToFitPanel(panelNode, chartNode);

		        // Add chart as target for resize event, otherwise things like InputChart and HoverHighlight won't work
		        if (typeof panelNode.getData('resizer') != 'undefined') {
		            panelNode.getData('resizer').addTarget(chartNode);
		        }
		    }
		}
	};

	FreeForm._initializeChartImage = function ( chartNode, availableWidth, availableHeight ) {
		// Request new chart with those dimensions
	    var chartURL = chartNode.get('src');
	    if (chartURL) {
	        chartURL = chartURL.replace('rdTemplate/rd1x1Trans.gif', 'rdTemplate/rdChart2.aspx');
	        if (Y.Lang.isValue(availableWidth) && Y.Lang.isValue(availableHeight)) {
	            chartURL = chartURL + '&rdResizeWidth=' + availableWidth + '&rdResizeHeight=' + availableHeight;

	        }
	        chartNode.set('src', chartURL);
	    }
	};

	FreeForm._isFirstPanelLoad = function( panelNode ) {
		var domStyle = panelNode.getDOMNode().style;
		return domStyle.width === '' && domStyle.height === '';
	};

	FreeForm._initializeSingleChartPanel = function( panelNode, chartNode, resizer ) {
		var firstLoad = FreeForm._isFirstPanelLoad( panelNode );

		// Is this first time panel was added to dashboard?
		if ( firstLoad ) {
			// After chart loads, save position and size of panel for next render
			chartNode.once( 'load', function() {
				// No resize needed, but this constrains the Panel Body in prep for resizing
				FreeForm.resizePanelBodytoFitPanel( panelNode );

				// PanelBody is properly sized now, but the Panel doesn't have dimensions set.
			    // Set dimensions so layout is properly saved.
				var resizeAttributes = Y.one('#rdResizerAttrs_' + panelNode.get('id'))
				if (panelNode.get('offsetWidth') < resizeAttributes.getAttribute("rdMinWidth")) {
				    panelNode.setStyle("width", resizeAttributes.getAttribute('rdMinWidth'));
				} else {
				    panelNode.setStyle('width', panelNode.get('offsetWidth'));
				}
				if (panelNode.get('offsetHeight') < resizeAttributes.getAttribute("rdMinHeight")) {
				    panelNode.setStyle("height", resizeAttributes.getAttribute('rdMinHeight'));
				} else {
				    panelNode.setStyle('height', panelNode.get('offsetHeight'));
				}

				FreeForm.rdSaveFreeformLayoutPanelPosition( 'rdDivDashboardpanels' );
			});

			// Load real chart image
			FreeForm._initializeChartImage(chartNode);

			// Remove the 100% width, use real width/height now
			chartNode.removeAttribute('width');
		}
		// Otherwise resize chart to panel
		else {
			// Constrain Panel Body to Panel
			FreeForm.resizePanelBodytoFitPanel( panelNode );

		    // Resize chart and load it
			FreeForm.resizeChartToFitPanel( panelNode, chartNode );

			FreeForm.rdResizeDashboardContainer();
		}

	    // Add chart as target for resize event, otherwise things like InputChart and HoverHighlight won't work
		if (typeof resizer != 'undefined') {
		    resizer.addTarget(chartNode);
		}
	};

	FreeForm._initializeMultiContentPanel = function( panelNode, charts ) {
		// We can only resize one Chart inside a Panel, so load charts like normal
	    var firstLoad = FreeForm._isFirstPanelLoad(panelNode);
		// Constrain panel content to size dictated by saved dimensions
	    if (!firstLoad) {
	        // Constrain Panel Body to Panel
	        FreeForm.resizePanelBodytoFitPanel(panelNode);
	    }
		// Load the real charts
		charts.each(function (chartNode) {

			if ( firstLoad ) {
				// After each chart loads, adjust size of DashboardContainer
			    chartNode.once('load', function () {
			        var resizeAttributes = Y.one('#rdResizerAttrs_' + panelNode.get('id'))
			        if (panelNode.get('offsetWidth') < resizeAttributes.getAttribute("rdMinWidth")) {
			            panelNode.setStyle("width", resizeAttributes.getAttribute('rdMinWidth'));
			        } else {
			            panelNode.setStyle('width', panelNode.get('offsetWidth'));
			        }
			        if (panelNode.get('offsetHeight') < resizeAttributes.getAttribute("rdMinHeight")) {
			            panelNode.setStyle("height", resizeAttributes.getAttribute('rdMinHeight'));
			        } else {
			            panelNode.setStyle('height', panelNode.get('offsetHeight'));
			        }
			        FreeForm.rdResizeDashboardContainer
			    });
			}

			FreeForm._initializeChartImage(chartNode);

			// Remove the 100% width, use real width/height now
			chartNode.removeAttribute( 'width' );
		});

		if ( charts.isEmpty() ) {
			FreeForm.rdResizeDashboardContainer();
		}
	};

	FreeForm.addResizeEventHandlers = function( resizer, panelNode, resizeChart ) {
	    resizer.on('resize:start', FreeForm.onPanelResizeStart, this, panelNode, resizeChart, resizer);
	    resizer.on('resize:resize', FreeForm.onPanelResize, this, panelNode, resizeChart, resizer);
	    resizer.on('resize:end', FreeForm.onPanelResizeEnd, this, panelNode, resizeChart, resizer);
	};

	/**
	 * panel - id, YUI node, or DOM node
	 * chart - id, YUI node, or DOM node
	 */
	FreeForm.resizeChartToFitPanel = function (panel, chart) {
		var chartNode = Y.one( chart ),
			panelNode = Y.one(panel),
            panelBody = panelNode.one('.panelBody'), childNodes, availableWidth, availableHeight;

		// Make sure chart is part of dashboard and it's an actual image
		if ((!chartNode.hasClass(DASHBOARD_CHART_MARKER) || chartNode.get('tagName') !== 'IMG') && !chartNode.hasClass("rdChartCanvas")) {
			return;
		}

		var charts = panelNode.all('img.dashboardChart,div.rdChartCanvas');
		childNodes = panelNode.get('children');

        //Get debug image node if there is one
		var debugNode = Y.one('#rdDebugChart');

        //Get chartfx wrapper from chartnode (should always be direct parent)
		var chartfx = chartNode.ancestor();

        //Check to make sure that we only have one chart -- if we don't we shouldn't be in this method
		if (charts.size() == 1) {

		    //Make chart size of entire panel to start -- sets correctly if the chart is the only content in panel, but too big otherwise
		    //This is to allow us to find out how much space the other content occupies in the panel
		    availableHeight = panelBody.get('clientHeight');
		    availableWidth = panelBody.get('clientWidth');

            //Have to manually adjust for debug image if it is present (due to its absolute positioning)
		    if (Y.Lang.isValue(debugNode) && debugNode.get('tagName') === 'IMG')
		        availableHeight = availableHeight - 30;

		    //Set chart minimums in case the area is very small
		    if (availableHeight <= 5)
		        availableHeight = 5;
		    if (availableWidth <= 5)
		        availableWidth = 5;

		    //Resize chart -- set width and height to match offset width/height (have to do both)
		    chart.set('width', availableWidth);
		    chart.set('height', availableHeight);
		    chart.set('offsetWidth', availableWidth);
		    chart.set('offsetHeight', availableHeight);

		    //If chart has an fx wrapper, it has to be resized too
		    if (chartfx.hasClass('chartfx-wrapper')) {
		        chartfx.set('offsetWidth', availableWidth);
		        chartfx.set('offsetHeight', availableHeight);
		    }
		    //Add scrollbars
		    panelBody.setStyle('overflow', 'scroll');

		    availableHeight = availableHeight - (panelBody.get('scrollHeight') - panelBody.get('clientHeight'));

		    if (availableHeight <= 5)
		        availableHeight = 5;

		    chart.set('height', availableHeight);
		    chart.set('offsetHeight', availableHeight);

		    if (chartfx.hasClass('chartfx-wrapper'))
		        chartfx.set('offsetHeight', availableHeight);
		    availableWidth = availableWidth - (panelBody.get('scrollWidth') - panelBody.get('clientWidth'));

		    if (availableWidth <= 5)
		        availableWidth = 5;

		    if (!chartNode.hasClass("rdChartCanvas")) {
		        //Set dimensions - dimensions should be current height/width - any overflow that we have
		        chart.set('width', availableWidth);
		        chart.set('offsetWidth', availableWidth);

		        if (chartfx.hasClass('chartfx-wrapper'))
		            chartfx.set('offsetWidth', availableWidth);

		            //Draw a new chart with the correct dimensions
		            var dashboardContainer = chart, chartUrl, urlPieces, urlParameters, urlParametersObject;
		            chartUrl = chart.get('src');
		            urlPieces = chartUrl.split('?');

		            // Parse parameters from URL and turn into object
		            urlParameters = urlPieces[1];
		            urlParametersObject = Y.QueryString.parse(urlParameters);


		            //If the URL already has the resize dimension, the image has already been initialized
		            if (urlParametersObject.hasOwnProperty('rdResizeWidth')) {
		                urlParametersObject['rdResizeWidth'] = availableWidth;
		                urlParametersObject['rdResizeHeight'] = availableHeight;

		                // Rebuild URL with adjusted parameters
		                chartUrl = urlPieces[0] + '?' + Y.QueryString.stringify(urlParametersObject);

		                // Get new chart with adjusted width/height
		                chart.set('src', chartUrl);
		            }

		            else {
		                //We need to initialize the image
		                FreeForm._initializeChartImage(chart, availableWidth, availableHeight);
		            }
		        } else {
                    //ChartCanvas
		            if (Y.Lang.isValue(chart.getData('rdChartCanvas'))) {
		                chart.fire('setSize', { width: availableWidth, height: availableHeight, finished: true, notify: false });
		            } else {
                        //object is not yet created. just set attributes
		                chart.setAttribute("data-width", availableWidth);
		                chart.setAttribute("data-height", availableHeight);
		            }
		        }
            //Get rid of the scroll bars
		    panelBody.setStyle('overflow', 'hidden');
		}
	};

	/*
	 * Update size of PanelConent Div(body) to reflect changes in Panel container
	 * <DIV id="rdDashboardPanel-..." class="rdDashboardPanel">
	 * ...
	 *	<DIV id="rdDashboard2PanelContent_..." class="panelBody">
	 */
	FreeForm.resizePanelBodytoFitPanel = function( panel ) {
		var panelNode = Y.one( panel ),
			panelBody = panelNode.one( '.panelBody' ),
			tdBody = panelBody.ancestor( 'td' ),
			trBody = panelBody.ancestor( 'tr' ),
			innerTable = panelNode.one( '.panelInnerTable' ),
			panelTitle = innerTable.one('.panelTitle'),
			panelParameters = innerTable.one('.rdDashboardParams'),
			availableWidth, availableHeight;

	    // Set Width
	    // Width of Panel - padding/margin all the containers take up
	    // Resizer check is to restrict behavior to freeform layout mode.
	    if (Y.Lang.isValue(panelNode.getData('resizer'))) {
	        availableWidth = panelNode.get('clientWidth') - ( innerTable.get('offsetWidth') - getContentWidth( tdBody ) );
	        panelBody.set( 'offsetWidth', availableWidth );


		    // Set Height
		    // Height of Panel - margin of table - height of all other content - padding of panel Body containers - bottom margin of Panel Body
		    availableHeight = panelNode.get('clientHeight') - parseInt( innerTable.getComputedStyle('marginTop'), 10 ) - parseInt( innerTable.getComputedStyle('marginBottom'), 10 )
			    // Panel Title and Panel Parameters - ie7/8 being stupid, hence the display check
			    - ( panelTitle.getStyle( 'display' ) === 'none' ? 0 : panelTitle.get('offsetHeight') )
			    - ( panelParameters.getStyle( 'display' ) === 'none' ? 0 : panelParameters.get('offsetHeight') )
			    // Padding of TR and TD containers
			    - parseInt( trBody.getComputedStyle('paddingTop'), 10 ) - parseInt( trBody.getComputedStyle('paddingBottom'), 10 )
			    - parseInt( tdBody.getComputedStyle('paddingTop'), 10 ) - parseInt( tdBody.getComputedStyle('paddingBottom'), 10 )
			    // Margin of Panel Body
			    - parseInt( panelBody.getComputedStyle('marginBottom'), 10 );

		    panelBody.set( 'offsetHeight', availableHeight );
	    }
	    else {
	        //Remove any height that may have been set by paramter expand / collapse code
	        panelNode.setStyle('height', '');
	    }
	};

	FreeForm.addPanelClickEvents = function() {
		var dashboardContainer = Y.one( '#rdDivDashboardpanels' );
		if ( Y.Lang.isValue( dashboardContainer ) ) {
			dashboardContainer.delegate( 'click', FreeForm.onPanelClick, '.rdDashboardPanel', this );
		}
	};

	FreeForm.onPanelResizeStart = function (e, panel, resizer) {

	    var panelNode = Y.one(panel);
	    var charts = panelNode.all('img.dashboardChart,div.rdChartCanvas');

	    //Set panel level variable to let us know if there is more than one chart
        //This needs to be set here in case the number of charts on the panel is variable
	    if (charts.size() == 1) {
	        panelNode.setData("oneChart", true);
	    }
	    else
	        panelNode.setData("oneChart", false);

        var dashboardContainer = panel.ancestor('#rdDivDashboardpanels');

	    FreeForm.freezeDashboardContainer();
	    FreeForm.showPanelonTop(panel);
	    panel.setStyle('opacity', .75);

	    // Save width/height of panel so we can calculate difference between original size and after resize
	    panel.setData('resizeCurrentWidth', panel.get('offsetWidth'));
	    panel.setData('resizeCurrentHeight', panel.get('offsetHeight'));

	};

	FreeForm.onPanelResize = function (e, panel, resizeChart, resizer) {
	    var chart = panel.one('img.dashboardChart,div.rdChartCanvas'),
			panelBody = panel.one( '.panelBody' ),
			widthDiff = panel.get( 'offsetWidth' ) - panel.getData( 'resizeCurrentWidth' ),
			heightDiff = panel.get( 'offsetHeight' ) - panel.getData( 'resizeCurrentHeight' );

		var panelNode = Y.one(panel);

        //Make sure we only have one chart
		if (panelNode.getData("oneChart")) {

            //Make sure chart is a defined node
		    if (chart) {
		        var chartfx = chart.ancestor();
		        var resizeWidth, resizeHeight;
		        if (chart.hasClass("rdChartCanvas")) {
		            var chartContainer = chart.one('*')
		            if (chartContainer != null) {
		                resizeWidth = chartContainer.get('offsetWidth') + widthDiff;
		                resizeHeight = chartContainer.get('offsetHeight') + heightDiff;
		            } else {
		                resizeWidth = chart.get('offsetWidth') + widthDiff;
		                resizeHeight = chart.get('offsetHeight') + heightDiff;
		            }
		        } else {
		            resizeWidth = chart.get('width') + widthDiff;
		            resizeHeight = chart.get('height') + heightDiff;
		        }

                //Set minimum height and width if necessary
		        if (resizeWidth <= 5) {
		            resizeWidth = 5;
		        }
		        if (resizeHeight <= 5) {
		            resizeHeight = 5;
		        }

                //If the chart has a chartfx-wrapper, resize that along with the chart
		        if (chartfx.hasClass('chartfx-wrapper')) {
		            chartfx.set('offsetWidth', resizeWidth);
		            chartfx.set('offsetHeight', resizeHeight);
		        }

                //Adjust chart
		        chart.set('offsetWidth', resizeWidth);
		        chart.set('offsetHeight', resizeHeight);
		        if (chart.hasClass("rdChartCanvas")) {
		            chart.fire('setSize', { width: resizeWidth, height: resizeHeight, finished: false, notify: false });
		        }
		    }
		}

	    // We have to adjust panel and panel body, otherwise title text area gets clipped as well as the content.
		panelBody.set('offsetWidth', panelBody.get('offsetWidth') + widthDiff);
		panelBody.set('offsetHeight', panelBody.get('offsetHeight') + heightDiff);

		panel.setData('resizeCurrentWidth', panel.get('offsetWidth'));
		panel.setData('resizeCurrentHeight', panel.get('offsetHeight'));
	};

	FreeForm.onPanelResizeEnd = function( e, panel, resizeChart, resizer) {
		var dashboardContainer = panel.ancestor('#rdDivDashboardpanels'),
			chart, chartUrl, urlPieces, urlParameters, urlParametersObject;

		var panelNode = Y.one(panel);

		FreeForm.unFreezeDashboardContainer();
		dashboardContainer.all( '.rdDashboardPanel' ).setStyle( 'opacity', .92 );
		FreeForm.rdSaveFreeformLayoutPanelPosition('rdDivDashboardpanels');

        //Only resize chart if there is only one chart in the panel
		if (panelNode.getData("oneChart")) {
		    chart = panel.one('img.dashboardChart,div.rdChartCanvas');
		    FreeForm.resizeChartToFitPanel(panel, chart);

		}

	};

	/*
	 * Bring panel to top and save panel positions, sizes, and z-indices.
	 *
	 * This generates way too many AJAX calls.  Clicks from other buttons like
	 * Edit/Save/Cancel call this as well.  I could filter out calls here by
	 * ignoring Inputs, Button, and javascript actions triggered by <A>s but really
	 * the other actions should stop propogation of their events.
	 */
	FreeForm.onPanelClick = function( e ) {
		var clickedPanel = e.currentTarget,
			dashboardContainer = Y.one( '#rdDivDashboardpanels' );

		FreeForm.showPanelonTop( clickedPanel );
		FreeForm.rdSaveFreeformLayoutPanelPosition( dashboardContainer.get('id') );
	};

	FreeForm.showPanelonTop = function (panel) {
		var dashboardContainer = panel.ancestor( '.dashboardPanelContainer' );
		var	allDashboardPanels = dashboardContainer.all( '.rdDashboardPanel' );
		var nPanelZindex = parseInt(panel.getStyle('zIndex'), 10);
		var nTopZindex = 0
		var nPanelsOnTop = 0
	    allDashboardPanels.each( function( panelNode ) {
	        var nCurrZindex = parseInt(panelNode.getStyle('zIndex'), 10);
	        if ( nTopZindex < nCurrZindex ) {
	            nTopZindex = nCurrZindex
	        }else if(nTopZindex == nCurrZindex) {
	            nPanelsOnTop += 1
	        }
	    }, this );
	    if (nPanelsOnTop > 1) {
	        nTopZindex += 1
	    }
		if (nPanelZindex < nTopZindex) {
		    nPanelZindex = nTopZindex + 1
		    panel.setStyle( 'zIndex', nPanelZindex);
		}
	};

	FreeForm.rdResizeDashboardContainer = function() {
		var elePanelContainer = Y.one('#rdDivDashboardpanels'),
			aDashboardPanels, i;
		if (elePanelContainer == null) {
		    elePanelContainer = Y.one('#rdDivDashboardPanelTable');
		    if (Y.Lang.isNull(elePanelContainer)) {
		        return;
		    }
		}
		aDashboardPanels = elePanelContainer.all('.rdDashboardPanel');
		var nRight = 0; var nBottom = 0;

		for ( i = 0; i < aDashboardPanels.size(); i++ ) {
			var elePanelItem = aDashboardPanels.item(i);
			var regionPanelItem = Y.DOM.region(elePanelItem.getDOMNode());
			if(i == 0){
				nRight = regionPanelItem.right;
				nBottom = regionPanelItem.bottom;
			}else{
				if(regionPanelItem.right > nRight) nRight = regionPanelItem.right;
				if(regionPanelItem.bottom > nBottom) nBottom = regionPanelItem.bottom;
			}
		}

		var regionPanelContainer = Y.DOM.region(elePanelContainer.getDOMNode());
		if(aDashboardPanels.size() > 0){
			var eleTab = Y.Selector.ancestor(aDashboardPanels.item(0), '.rdTabPanel', false)
			if (Y.Lang.isValue(document.getElementById('rdFreeformLayout'))) {
			    if (nRight < Y.DOM.viewportRegion().right) {
			        elePanelContainer.setStyle('height', (nBottom - regionPanelContainer.top + 20) + 'px');
			        elePanelContainer.setStyle('width', (Y.DOM.viewportRegion().right - regionPanelContainer.left - 20 + 'px'));
			        if (eleTab) eleTab.setStyle('width', (Y.DOM.viewportRegion().right - regionPanelContainer.left - 20 + 'px'));
			        //Make the Main content div atleast the size of the Dashboard container.
			        if (!Y.Lang.isNull(Y.one('#divMainContent'))) {
			            Y.one('#divMainContent').setStyle('width', (Y.DOM.viewportRegion().right - regionPanelContainer.left - 20 + 'px'));
			        }
			    } else {
			        elePanelContainer.setStyle('width', nRight + 'px');
			        if (eleTab) eleTab.setStyle('width', (nRight + 10) + 'px');
			        //Make the Main content div atleast the size of the Dashboard container.
			        if (!Y.Lang.isNull(Y.one('#divMainContent'))) {
			            Y.one('#divMainContent').setStyle('width', nRight + 'px');
			        }
			    }
			}
		}else{
		    elePanelContainer.setStyle('width', '100%');
            elePanelContainer.setStyle('height', '');
		}
	};


	FreeForm.rdSaveFreeformLayoutPanelPosition = function( sPanelContainerId ) {
		FreeForm.rdResizeDashboardContainer();
		var eleDashboardTab = Y.one( '#' + sPanelContainerId );

		if ( !Y.Lang.isValue( eleDashboardTab ) ) {
			return;
		}

		// Go through each of the panels and save their CSS styling
		var eleHiddenPanelOrder = Y.one( '#rdDashboardPanelOrder' ),
			dashboardPanels = eleDashboardTab.all('.rdDashboardPanel'),
			numberofPanels = dashboardPanels.size(),
			i, panel, panelSettings = '';

		for ( i = 0; i < numberofPanels; i++ ) {
		    panel = dashboardPanels.item( i );
			panelSettings += ',' + Y.LogiInfo.Dashboard.prototype.rdGetPanelInstanceId( panel.getDOMNode() );
			panelSettings += ':0:STYLE=';
			// Instead of cssText property, manually grab the styles we want to save
			panelSettings += 'z-index:' + panel.getComputedStyle('zIndex') + ';';
			panelSettings += ' position: ' + panel.getComputedStyle('position') + ';';
			panelSettings += ' left: ' + FreeForm.rdRoundTo10(panel.getComputedStyle('left')) + ';';
			panelSettings += ' top: ' + FreeForm.rdRoundTo10(panel.getComputedStyle('top')) + ';';
			panelSettings += ' width: ' + FreeForm.rdRoundTo10(panel.getComputedStyle('width')) + ';';
			panelSettings += ' height: ' + FreeForm.rdRoundTo10((parseInt(panel.getComputedStyle('height'),10))) + 'px' + ';';
		}


		eleHiddenPanelOrder.set( 'value', panelSettings );

		var rdPanelParams = "&rdReport=" + document.getElementById("rdDashboardDefinition").value;
		rdPanelParams += "&rdFreeformLayout=True";
		var eleTab = Y.Selector.ancestor(eleDashboardTab, '.rdTabPanel');
		if (eleTab) {
			eleTab.parentNode.setStyle('overflow', 'hidden');
			rdPanelParams += ("&rdDashboardTabID=" +  eleTab.get('id').substring(eleTab.get('id').lastIndexOf("_") + 1));
		}

		var regionTab = Y.DOM.region(eleDashboardTab.getDOMNode());
		var sTabStyle = "Width:" + (regionTab.right - regionTab.left) + 'px';
		sTabStyle += ";Height:" + (regionTab.bottom - regionTab.top) + 'px';
		rdPanelParams += ("&rdDashboardTabStyle=" + sTabStyle);

		window.status = "Saving dashboard panel positions.";
		rdAjaxRequestWithFormVars('rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=UpdateDashboardPanelOrder' + rdPanelParams);
	};

	FreeForm.rdRoundTo10 = function (value) {
	    var bKeepPx = false
        if (typeof (value.replace) != 'undefined') {
            if (value.indexOf("px") != -1) {
                bKeepPx = true
                value = value.replace("px", "")
            }
	    }
	    value = parseInt(value / 10) * 10
	    if (bKeepPx) {
	        value = value + "px"
	    }
        return value
	};

	FreeForm.freezeDashboardContainer = function() {
		var dashContainer = Y.one('#rdDivDashboardpanels');
		var containerWidth = dashContainer.getDOMNode().clientWidth,
			containerHeight = dashContainer.getDOMNode().clientHeight;

		dashContainer.setStyle('position', 'absolute');
		dashContainer.ancestor('div').setStyles({
			width: containerWidth,
			height: containerHeight
		});
	};

	FreeForm.unFreezeDashboardContainer = function() {
		var dashContainer = Y.one('#rdDivDashboardpanels');
		dashContainer.ancestor('div').setStyles({
			width: '',
			height: ''
		});
		dashContainer.setStyle('position', 'relative');
	}

	LogiXML.Dashboard.FreeForm = FreeForm;

}, '1.0.0', { requires:['node-base', 'rdResize', 'querystring', 'dd-constrain', 'dd-proxy', 'dd-drop-plugin', 'dd-plugin', 'dd-scroll'] });
