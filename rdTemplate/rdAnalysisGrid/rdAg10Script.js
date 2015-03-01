YUI.add('analysis-grid', function(Y) {

	var rdFilterOldComparisonOptionsArray = new Array();    // Array holds the Analysis Grid Filter Comparison options ('Starts With' and 'Contains') in memory.
	var rdFilterNewComparisonOptionsArray = new Array();    // Array holds the Analysis Grid Filter Comparison option ('Date Range') in memory.
	// Holding the values in memory seems to be a better option to handle the issues that may raise with internationalization.

	Y.namespace('LogiInfo').AnalysisGrid = Y.Base.create('AnalysisGrid', Y.Base, [], {
	
		initializer : function() {
		
			//Show the selected tab (if the menu is not hidden)
			if ( !Y.Lang.isValue(Y.one('hideAgMenu'))
			&& Y.Lang.isValue(document.getElementById('rdAgCurrentOpenPanel')))
				this.rdAgShowMenuTab(document.getElementById('rdAgCurrentOpenPanel').value,true);
			
			//Open the correct chart panel if there is an error
			var chartError = Y.one('#rdChartError');
			if (Y.Lang.isValue(chartError))
				this.rdAgShowChartAdd(chartError.get('value'));
		
			//Initialize draggable panels if not disabled
			if (Y.Lang.isValue(Y.one('#rdAgDraggablePanels')))
				this.rdInitDraggableAgPanels();
		},
		
		/* -----Analysis Grid Methods----- */
		
		rdAgShowMenuTab: function (sTabName, bCheckForReset) {

		    var bNoData = false
		    //if (sTabName.length == 0) {
		        var eleStartTableDropdown = document.getElementById('rdStartTable')
		        if (eleStartTableDropdown != null) {
		            if (eleStartTableDropdown.selectedIndex == 0) {
		                //No table selected in QB. Show the QB.
		                sTabName = "QueryBuilder"
		                bNoData = true
		            }
		        }
		    //}

			var bOpen = true;
			if (sTabName.length==0){
				bOpen=false;
			}else{
				var eleSelectedTab = document.getElementById('col' + sTabName);
				var eleSelectedRow = document.getElementById('row' + sTabName);
				if (eleSelectedTab.className.indexOf('rdAgSelectedTab')!=-1) {
					bOpen = false;
				}
				if (bCheckForReset){
					if (location.href.indexOf("rdAgLoadSaved")!=-1){
						bOpen = false;
					}
				}
			}
			if (bNoData) {
			    bOpen = true;  //When no data, that tab must always remain open.
			}

			document.getElementById('rdAgCurrentOpenPanel').value = '';
			this.rdSetClassNameById('colQueryBuilder', 'rdAgUnselectedTab');
			this.rdSetClassNameById('colLayout', 'rdAgUnselectedTab');
			this.rdSetClassNameById('colCalc', 'rdAgUnselectedTab');
			this.rdSetClassNameById('colSortOrder','rdAgUnselectedTab');
			this.rdSetClassNameById('colFilter','rdAgUnselectedTab');
			this.rdSetClassNameById('colGroup','rdAgUnselectedTab');
			this.rdSetClassNameById('colAggr','rdAgUnselectedTab');
			this.rdSetClassNameById('colChart','rdAgUnselectedTab');
			this.rdSetClassNameById('colCrosstab','rdAgUnselectedTab');
			this.rdSetClassNameById('colPaging','rdAgUnselectedTab');
			
			this.rdSetDisplayById('rowQueryBuilder', 'none');
			this.rdSetDisplayById('rowLayout', 'none');
			this.rdSetDisplayById('rowCalc', 'none');
			this.rdSetDisplayById('rowSortOrder','none');
			this.rdSetDisplayById('rowFilter','none');
			this.rdSetDisplayById('rowGroup','none');
			this.rdSetDisplayById('rowAggr','none');
			this.rdSetDisplayById('rowChart','none');
			this.rdSetDisplayById('rowCrosstab','none');
			this.rdSetDisplayById('rowPaging','none');
			
			if (bOpen) {
				document.getElementById('rdAgCurrentOpenPanel').value = sTabName;
				eleSelectedTab.className = 'rdAgSelectedTab';
		//        ShowElement(this.id,'row' + sTabName,'Show');

				eleSelectedRow.style.display = '';
				if(!bCheckForReset)   // Avoid flicker/fading effect when Paged/Sorted/Postbacks.
					rdFadeElementIn(eleSelectedRow.firstChild,400);    //#11723, #17294 tr does not handle transition well.
			}
			
			this.rdSetPanelModifiedClass('QueryBuilder');
			this.rdSetPanelModifiedClass('Layout');
			this.rdSetPanelModifiedClass('Calc');
			this.rdSetPanelModifiedClass('SortOrder');
			this.rdSetPanelModifiedClass('Filter');
			this.rdSetPanelModifiedClass('Group');
			this.rdSetPanelModifiedClass('Aggr');
			this.rdSetPanelModifiedClass('Chart');
			this.rdSetPanelModifiedClass('Crosstab');
			this.rdSetPanelModifiedClass('Paging');


			if (bNoData) {
			    this.rdSetPanelDisabledClass('Layout')
			    this.rdSetPanelDisabledClass('Calc');
			    this.rdSetPanelDisabledClass('SortOrder');
			    this.rdSetPanelDisabledClass('Filter');
			    this.rdSetPanelDisabledClass('Group');
			    this.rdSetPanelDisabledClass('Aggr');
			    this.rdSetPanelDisabledClass('Chart');
			    this.rdSetPanelDisabledClass('Crosstab');
			    this.rdSetPanelDisabledClass('Paging');
            }

			if (typeof window.rdRepositionSliders != 'undefined') {
				//Move CellColorSliders, if there are any.
				rdRepositionSliders();
			}

			if (sTabName=="Filter") {
				this.rdAgShowPickDistinctButton();
			}
			
			if (sTabName=="Group") {
				this.rdAgGetGroupByDateOperatorDiv();
			}
			if (sTabName=="Chart") {
				this.rdAgGetChartsGroupByDateOperatorDiv();
			}
			if (sTabName=="Crosstab") {
				this.rdAgGetCrosstabHeaderGroupByDateOperatorDiv();
				this.rdAgGetCrosstabLabelGroupByDateOperatorDiv();
			}
		},

		rdAgLayoutSelect: function (sAllNone) {
		    var nlCheckboxes = Y.all('.rdAgColVisible')
		    for (var i = 0; i < nlCheckboxes.size() ; i++) {
		        nlCheckboxes.item(i).set('checked', (sAllNone == "All"))
		    }
		},

		rdQbColumnSelect: function (sAllNone) {
		    var nlCheckboxes = Y.all('.rdAgColSelect')
		    for (var i = 0; i < nlCheckboxes.size() ; i++) {
		        nlCheckboxes.item(i).set('checked', (sAllNone == "All"))
		    }
		},

		rdSetClassNameById: function (sId, sClassName) {
			var ele = document.getElementById(sId);
			if(ele) {
				ele.className = sClassName;
			}
		},
		rdSetDisplayById : function(sId, sDisplay) {
			var ele = document.getElementById(sId);
			if(ele) {
				ele.style.display = sDisplay;
			}
		},
		rdSetPanelModifiedClass: function (sPanel) {
		    var nodeButton = Y.one("#col" + sPanel);
		    if (Y.Lang.isValue(nodeButton) && nodeButton.one('table').hasClass('rdHighlightOn'))
		        nodeButton.addClass(nodeButton.get('className') + "On");
		},
		rdSetPanelDisabledClass: function (sPanel) {
		    var nodeButton = Y.one("#col" + sPanel);
		    if (nodeButton != null) {
		        nodeButton.addClass("rdAgDisabledTab");
		    }
		},
		rdAgShowPickDistinctButton: function () {
			// Function gets called on the onchange event of the Filter column dropdown.           
			this.rdAgRemoveAllWhiteSpaceNodesFromFilterOperatorDropdown();        // Do this to clear the FilterOparator dropdown off all whitespace/text nodes.
			ShowElement(this.id,'divPickDistinct','Show');
			var i = 0;
			if (document.rdForm.rdAgFilterColumn.value!=""){
				 //Dates
				if((document.rdForm.rdAgPickDateColumns.value.indexOf(document.rdForm.rdAgFilterColumn.value + ",")!=-1) | (document.rdForm.rdAgPickDateColumns.value.indexOf(document.rdForm.rdAgFilterColumn.value +"-NoCalendar" + ",")!=-1 )){
					// Manipulate the DataColumn Dropdown.       
					if(document.rdForm.rdAgFilterOperator.lastChild.value == 'Date Range'){    // condition specific for a fresh dropdown.
						for(i=1;i<=1;i++){
							rdFilterNewComparisonOptionsArray.push(document.rdForm.rdAgFilterOperator.lastChild);    // remove the new Comparison option 'Date Range'.
							document.rdForm.rdAgFilterOperator.removeChild(document.rdForm.rdAgFilterOperator.lastChild); 
						}  
						if (document.rdForm.rdAgFilterOperator.lastChild.value == 'Not Contains') {    //remove 'Not Contains' and 3 options before that.
							for (i=0;i<=3;i++){
								rdFilterOldComparisonOptionsArray.push(document.rdForm.rdAgFilterOperator.lastChild);
								document.rdForm.rdAgFilterOperator.removeChild(document.rdForm.rdAgFilterOperator.lastChild); 
							}
						}
						 for(i=1;i<=1;i++){ // Add the new Comparison option 'Date Range' back.
							document.rdForm.rdAgFilterOperator.appendChild(rdFilterNewComparisonOptionsArray.pop());
						}  
					}
					else{   // condition specific for an already manipulated dropdown.
					    if (document.rdForm.rdAgFilterOperator.lastChild.value == 'Not Contains') {    //remove 'Not Contains' and 3 options before that.
							for (i=0;i<=3;i++){
								rdFilterOldComparisonOptionsArray.push(document.rdForm.rdAgFilterOperator.lastChild);
								document.rdForm.rdAgFilterOperator.removeChild(document.rdForm.rdAgFilterOperator.lastChild); 
							}
						}
						for(i=1;i<=1;i++){ // Add the new Comparison option 'Date Range' back.
							document.rdForm.rdAgFilterOperator.appendChild(rdFilterNewComparisonOptionsArray.pop());
						}
					}
					this.rdAgManipulateFilterInputTextBoxValuesForDateColumns(document.rdForm.rdAgFilterColumn.value, document.rdForm.rdAgFilterOperator.value, document.rdForm.rdAgCurrentFilterValue.value, document.rdForm.rdAgCurrentDateType.value);
					return;
				}
				// Distinct values popup.
				else if(document.rdForm.rdAgPickDistinctColumns.value.indexOf(document.rdForm.rdAgFilterColumn.value + ",")!=-1){
					if(document.rdForm.rdAgFilterOperator.lastChild.value == 'Date Range'){
						for(i=1;i<=1;i++){
							rdFilterNewComparisonOptionsArray.push(document.rdForm.rdAgFilterOperator.lastChild);    // remove the new Comparison option.
							document.rdForm.rdAgFilterOperator.removeChild(document.rdForm.rdAgFilterOperator.lastChild); 
						}  
						if(document.rdForm.rdAgFilterOperator.lastChild.value != 'Not Contains'){    // condition specific for an already manipulated dropdown.
						    for (i = 0; i <= 3; i++) {
						        document.rdForm.rdAgFilterOperator.appendChild(rdFilterOldComparisonOptionsArray.pop());
							}
						}
					}
					var elePopupIFrame = document.getElementById('subPickDistinct')
					var sSrc = Y.one(elePopupIFrame).getData("hiddensource");
					//Put the picked column name into the URL.
					var nStart = sSrc.indexOf("&rdAgDataColumn=")
					var nEnd = sSrc.indexOf("&", nStart + 1)
					sSrc = sSrc.substr(0,nStart) + "&rdAgDataColumn=" + encodeURI(document.rdForm.rdAgFilterColumn.value) + sSrc.substr(nEnd)
					Y.one(elePopupIFrame).setData("hiddensource", sSrc);
					//elePopupIFrame.setAttribute("HiddenSource", elePopupIFrame.getAttribute("HiddenSource").replace("rdPickDataColumn",encodeURI(document.rdForm.rdAgFilterColumn.value)))
					this.rdAgHideAllFilterDivs();
					ShowElement(this.id,'divPickDistinct','Show')
					ShowElement(this.id,'divPickDistinctPopUpButton','Show')
					elePopupIFrame.removeAttribute("src") //Clear the list so it's rebuilt when the user clicks.
					//15311
					//rdAgManipulateFilterInputTextBoxValuesForDateColumns(document.rdForm.rdAgFilterColumn.value, document.rdForm.rdAgFilterOperator.value, document.rdForm.rdAgCurrentFilterValue.value, document.rdForm.rdAgCurrentDateType.value);
					return;
				}
				else{                      
					this.rdAgHideAllFilterDivs();
					ShowElement(this.id,'divPickDistinct','Show')     
					if(document.rdForm.rdAgFilterOperator.lastChild.value != 'Not Contains'){
						if(document.rdForm.rdAgFilterOperator.lastChild.value == 'Date Range'){
							for(i=1;i<=1;i++){
							rdFilterNewComparisonOptionsArray.push(document.rdForm.rdAgFilterOperator.lastChild);    // remove the new Comparison option 'Date Range'.
							document.rdForm.rdAgFilterOperator.removeChild(document.rdForm.rdAgFilterOperator.lastChild); 
							} 
						}
						if(rdFilterOldComparisonOptionsArray[0]){                    
							for(i=0;i<=3;i++){
								document.rdForm.rdAgFilterOperator.appendChild(rdFilterOldComparisonOptionsArray.pop());
							}
						}
					}            
				}
			}
			else{   // When no column is selected.
				this.rdAgHideAllFilterDivs();
				ShowElement(this.id,'divPickDistinct','Show')    
				document.rdForm.rdAgFilterOperator.value = "="; 
			}
		},		
		rdAgGetGroupByDateOperatorDiv : function(){
			// Function used by the Grouping division for hiding/unhiding the GroupByOperator Div.
			if((document.rdForm.rdAgPickDateColumnsForGrouping.value.indexOf(document.rdForm.rdAgGroupColumn.value + ",")!=-1) && (document.rdForm.rdAgGroupColumn.value.length != 0)){
				if(Y.Lang.isValue(Y.one('#divGroupByDateOperator')))
					ShowElement(this.id,'divGroupByDateOperator','Show');
			}
			else{
				if(Y.Lang.isValue(Y.one('#divGroupByDateOperator'))){
					ShowElement(this.id,'divGroupByDateOperator','Hide');
					document.rdForm.rdAgDateGroupBy.value='';
				}
			}
		},
		rdAgGetChartsGroupByDateOperatorDiv : function(){
			// Function used by the Charts division for hiding/unhiding the GroupByOperator Div for the Charts except for Pie and Scatter.
			var sChartType = document.rdForm.rdAgChartType.value;
			if(sChartType == 'Pie' || sChartType == 'Bar'){
				if((document.rdForm.rdAgPickDateColumnsInChartForGrouping.value.indexOf(document.rdForm.rdAgChartXLabelColumn.value + ",")!=-1) && (document.rdForm.rdAgChartXLabelColumn.value.length != 0)){
					ShowElement(this.id,'divChartsGroupByDateOperator','Show');
				}else{
					ShowElement(this.id,'divChartsGroupByDateOperator','Hide');
					document.rdForm.rdAgChartsDateGroupBy.value='';
				}
			}else if(sChartType == 'Line' || sChartType == 'Spline'){
				if((document.rdForm.rdAgPickDateColumnsInChartForGrouping.value.indexOf(document.rdForm.rdAgChartXDataColumn.value + ",")!=-1) && (document.rdForm.rdAgChartXDataColumn.value.length != 0)){
				    ShowElement(this.id,'divChartsGroupByDateOperator','Show');
				    // change the y-axis drop down when a date column is selected in line charts...(show all)
				    var aAggrList = []; var aAggrListLabel = []; var aAggrGroupLabel = []; var aAggrGroupLabelClass = [];
				    this.rdAgGetColumnList(aAggrList, aAggrListLabel, '', aAggrGroupLabel, aAggrGroupLabelClass, false);
				    rdchangeList('rdAgChartYColumn', aAggrList, aAggrListLabel, '', aAggrGroupLabel, aAggrGroupLabelClass);
				}else{
					ShowElement(this.id,'divChartsGroupByDateOperator','Hide');
					document.rdForm.rdAgChartsDateGroupBy.value = '';
				    // change y-axis dropdown back to show only numeric data columns...
					var aAggrList = []; var aAggrListLabel = []; var aAggrGroupLabel = []; var aAggrGroupLabelClass = [];
					this.rdAgGetColumnList(aAggrList, aAggrListLabel, 'number', aAggrGroupLabel, aAggrGroupLabelClass, false);
					rdchangeList('rdAgChartYColumn', aAggrList, aAggrListLabel, '', aAggrGroupLabel, aAggrGroupLabelClass);
				}
			}else{
				ShowElement(this.id,'divChartsGroupByDateOperator','Hide');
				document.rdForm.rdAgChartsDateGroupBy.value='';
			}    
		},
		rdAgGetCrosstabHeaderGroupByDateOperatorDiv : function(){
			// Function used by the Crosstabs division for hiding/unhiding the GroupByOperator Div for the header Column dropdown.
			if((document.rdForm.rdAgPickDateColumnsInCrossTabForGrouping.value.indexOf(document.rdForm.rdAgCrosstabHeaderColumn.value + ",")!=-1) && (document.rdForm.rdAgCrosstabHeaderColumn.value.length != 0)){
				if(Y.Lang.isValue(Y.one('#divCrosstabHeaderGroupByDateOperator')))
					ShowElement(this.id,'divCrosstabHeaderGroupByDateOperator','Show');
			}
			else{
				if(Y.Lang.isValue(Y.one('#divCrosstabHeaderGroupByDateOperator'))){
					ShowElement(this.id,'divCrosstabHeaderGroupByDateOperator','Hide');
					document.rdForm.rdAgCrosstabHeaderDateGroupBy.value='';
				}
			}
		},
		rdAgGetCrosstabLabelGroupByDateOperatorDiv : function(){
		 // Function used by the Crosstabs division for hiding/unhiding the GroupByOperator Div for the Label Column dropdown.
			if((document.rdForm.rdAgPickDateColumnsInCrossTabForGrouping.value.indexOf(document.rdForm.rdAgCrosstabLabelColumn.value + ",")!=-1) && (document.rdForm.rdAgCrosstabLabelColumn.value.length != 0)){
				if(Y.Lang.isValue(Y.one('#divCrosstabLabelGroupByDateOperator')))
					ShowElement(this.id,'divCrosstabLabelGroupByDateOperator','Show');
			}
			else{
				if(Y.Lang.isValue(Y.one('#divCrosstabLabelGroupByDateOperator'))){
					ShowElement(this.id,'divCrosstabLabelGroupByDateOperator','Hide');
					document.rdForm.rdAgCrosstabLabelDateGroupBy.value='';
				}
			}
		},
		
		rdAgRemoveAllWhiteSpaceNodesFromFilterOperatorDropdown : function(){
			// Function removes all the unnecessary text/WhiteSpace nodes from the dropdown which cause issues with different browsers.
			var elerdAgFilterOperator = document.rdForm.rdAgFilterOperator;
			if(elerdAgFilterOperator){
				for(i=0; i<= elerdAgFilterOperator.childNodes.length; i++){
					if(elerdAgFilterOperator.childNodes[i]) 
						if(elerdAgFilterOperator.childNodes[i].nodeName == '#text')
							elerdAgFilterOperator.removeChild(elerdAgFilterOperator.childNodes[i]);
				}
			}
		},
		
		rdAgManipulateFilterInputTextBoxValuesForDateColumns : function(sFilterColumn, sFilterOperator, sFilterValue, sDateType, sSlidingDateName) {
			// Function runs to set the values of the filter into the input text boxes.
			document.rdForm.rdAgFilterColumn.value = sFilterColumn;
			if(sFilterOperator.indexOf('&lt;') > -1)  sFilterOperator = sFilterOperator.replace('&lt;','<');    //#17188.
			document.rdForm.rdAgFilterOperator.value = sFilterOperator;
			if(Y.Lang.isValue(Y.one('#rdAgCurrentFilterValue')))
				document.rdForm.rdAgCurrentFilterValue.value = sFilterValue;
			var sDateTypeOperator;
			var sSlidingDateValue;
			var sInputElementValue = sFilterValue.split('|')[0];
			if (sFilterValue) {
				document.rdForm.rdAgFilterStartDate.value = sInputElementValue;
				document.rdForm.rdAgFilterStartDateTextbox.value = sInputElementValue;
				document.rdForm.rdAgFilterValue.value = sInputElementValue; 
				document.rdForm.rdAgFilterEndDate.value = '';
				document.rdForm.rdAgFilterEndDateTextbox.value = '';
				if(sDateType){
					sDateTypeOperator = sDateType.split(',')[0];
					if(sDateTypeOperator)
						document.rdForm.rdAgSlidingTimeStartDateFilterOpearator.value = sDateTypeOperator;
				}
				else{
					document.rdForm.rdAgSlidingTimeStartDateFilterOpearator.value = "Specific Date";
				}
				if(sSlidingDateName){
					sSlidingDateValue = sSlidingDateName.split(',')[0];
					if(sSlidingDateValue)
						document.rdForm.rdAgSlidingTimeStartDateFilterOpearatorOptions.value = sSlidingDateValue;
				}  
				if(sFilterValue.split('|')[1]){
					sInputElementValue = sFilterValue.split('|')[1];
					document.rdForm.rdAgFilterEndDate.value = sInputElementValue;
					document.rdForm.rdAgFilterEndDateTextbox.value = sInputElementValue;
					if(sDateType){
						sDateTypeOperator = sDateType.split(',')[1];
						if(sDateTypeOperator)
							document.rdForm.rdAgSlidingTimeEndDateFilterOpearator.value = sDateTypeOperator;
					}
					else{
						document.rdForm.rdAgSlidingTimeEndDateFilterOpearator.value = "Specific Date";
					} 
					if(sSlidingDateName){
						sSlidingDateValue = sSlidingDateName.split(',')[1];
						if(sSlidingDateValue)
							document.rdForm.rdAgSlidingTimeEndDateFilterOpearatorOptions.value = sSlidingDateValue;
					} 
				}
			}
			this.rdAgShowProperElementDiv(sFilterColumn, sFilterOperator);    // Run through this function to show hide the divs
		},
		
		rdAgShowProperElementDiv : function(sFilterColumn, sFilterOperator){
			// Function runs on clicking the filter link with the filter info to show the proper panel/Div.
			if(sFilterColumn){    
				if(document.rdForm.rdAgPickDateColumns.value.indexOf(sFilterColumn + ",")!=-1){
					if(sFilterOperator == 'Date Range'){
						this.rdAgHideAllFilterDivs();
						ShowElement(this.id,'divSlidingTimeStartDateFilterOpearator','Show')
						ShowElement(this.id,'divSlidingTimeEndDateFilterOpearator','Show')
						if(document.rdForm.rdAgSlidingTimeStartDateFilterOpearator.value == 'Specific Date'){ 
							ShowElement(this.id,'divFilterStartDateCalendar','Show')
							ShowElement(this.id,'divSlidingTimeStartDateFilterOpearatorValues','Hide')
						}
						if(document.rdForm.rdAgSlidingTimeEndDateFilterOpearator.value == 'Specific Date'){
							ShowElement(this.id,'divFilterEndDateCalendar','Show')
							ShowElement(this.id,'divSlidingTimeEndDateFilterOpearatorValues','Hide')
						}                        
						if(document.rdForm.rdAgSlidingTimeStartDateFilterOpearator.value == 'Sliding Date'){
							ShowElement(this.id,'divSlidingTimeStartDateFilterOpearatorValues','Show')
							ShowElement(this.id,'divFilterStartDateCalendar','Hide')
						}
						if(document.rdForm.rdAgSlidingTimeEndDateFilterOpearator.value == 'Sliding Date'){
							ShowElement(this.id,'divSlidingTimeEndDateFilterOpearatorValues','Show')
							ShowElement(this.id,'divFilterEndDateCalendar','Hide')
						}                   
					}
					else{
						this.rdAgHideAllFilterDivs();
						ShowElement(this.id,'divSlidingTimeStartDateFilterOpearator','Show')
						if(document.rdForm.rdAgSlidingTimeStartDateFilterOpearator.value == 'Specific Date'){
							ShowElement(this.id,'divFilterStartDateCalendar','Show')
							ShowElement(this.id,'divSlidingTimeStartDateFilterOpearatorValues','Hide')
						}
						else{               
							ShowElement(this.id,'divFilterStartDateCalendar','Hide')     
							ShowElement(this.id,'divSlidingTimeStartDateFilterOpearatorValues','Show')
						}
					}   
				}
				else if(document.rdForm.rdAgPickDateColumns.value.indexOf(sFilterColumn +"-NoCalendar" + ",")!=-1){
				   if(sFilterOperator == 'Date Range'){
						this.rdAgHideAllFilterDivs();
						ShowElement(this.id,'divSlidingTimeStartDateFilterOpearator','Show')
						ShowElement(this.id,'divSlidingTimeEndDateFilterOpearator','Show')
						if(document.rdForm.rdAgSlidingTimeStartDateFilterOpearator.value == 'Specific Date'){ 
							ShowElement(this.id,'divFilterStartDateTextbox','Show')
							ShowElement(this.id,'divSlidingTimeStartDateFilterOpearatorValues','Hide')
						}
						if(document.rdForm.rdAgSlidingTimeEndDateFilterOpearator.value == 'Specific Date'){
							ShowElement(this.id,'divFilterEndDateTextbox','Show')
							ShowElement(this.id,'divSlidingTimeEndDateFilterOpearatorValues','Hide')
						}
						if(document.rdForm.rdAgSlidingTimeStartDateFilterOpearator.value == 'Sliding Date'){
							ShowElement(this.id,'divSlidingTimeStartDateFilterOpearatorValues','Show')
							ShowElement(this.id,'divFilterStartDateTextbox','Hide')
						}
						if(document.rdForm.rdAgSlidingTimeEndDateFilterOpearator.value == 'Sliding Date'){
							ShowElement(this.id,'divSlidingTimeEndDateFilterOpearatorValues','Show')
							ShowElement(this.id,'divFilterEndDateTextbox','Hide')
						}    
					}
					else{
						this.rdAgHideAllFilterDivs();
						 ShowElement(this.id,'divSlidingTimeStartDateFilterOpearator','Show')
						 if(document.rdForm.rdAgSlidingTimeStartDateFilterOpearator.value == 'Specific Date'){ 
							ShowElement(this.id,'divFilterStartDateTextbox','Show')
							ShowElement(this.id,'divSlidingTimeStartDateFilterOpearatorValues','Hide')
						}
						if(document.rdForm.rdAgSlidingTimeStartDateFilterOpearator.value == 'Sliding Date'){
							ShowElement(this.id,'divSlidingTimeStartDateFilterOpearatorValues','Show')
							ShowElement(this.id,'divFilterStartDateTextbox','Hide')
						}
					}
				}
				else{  // When filter column is not a Date column.
					if(document.rdForm.rdAgPickDistinctColumns.value.indexOf(document.rdForm.rdAgFilterColumn.value + ",")!=-1){
						this.rdAgHideAllFilterDivs();
						ShowElement(this.id,'divPickDistinct','Show')
						ShowElement(this.id,'divPickDistinctPopUpButton','Show')}
					else{
						this.rdAgHideAllFilterDivs();
						ShowElement(this.id,'divPickDistinct','Show')
					}
				}
			}
		},
		
		rdAgHideAllFilterDivs : function(){
			// Function hides all the Divs mentioned below used to seperate elements that are used in specific conditions under the Filters section.
				ShowElement(this.id,'divPickDistinct','Hide');                               // Div holds a common TextBox.

				ShowElement(this.id,'divPickDistinctPopUpButton','Hide');                    // Div holds the popup button that pulls up the list of ID's, like CustomerID, OrderID etc. This above div is always hidden for Date Time Columns.   
																																																											   
				ShowElement(this.id,'divSlidingTimeStartDateFilterOpearator','Hide');        // Div holds a dropdown with the sliding time filter operatior values like Sliding Date etc.
																  
				ShowElement(this.id,'divSlidingTimeEndDateFilterOpearator','Hide');          // Div holds a dropdown with the sliding time filter operatior values.
																  
				ShowElement(this.id,'divSlidingTimeStartDateFilterOpearatorValues','Hide');  // Div holds a dropdown with the sliding time filter operatior option values like Today, Yesterday etc.
																
				ShowElement(this.id,'divSlidingTimeEndDateFilterOpearatorValues','Hide');    // Div holds a dropdown with the sliding time filter operatior option values like Today, Yesterday etc.
				
				ShowElement(this.id,'divFilterStartDateCalendar','Hide');        // Div holds a calendar control for start date.
				
				ShowElement(this.id,'divFilterEndDateCalendar','Hide');           // Div holds a calendar control for start date.
				
				ShowElement(this.id,'divFilterStartDateTextbox','Hide');          // Div holds a textbox for start date.
				
				ShowElement(this.id,'divFilterEndDateTextbox','Hide');            // Div holds a textbox for end date.
		},
		
		/* -----Action.Javascript Methods----- */
		
		rdAgShowChartAdd : function(sChartType) {
			document.rdForm.rdAgChartType.value=sChartType;
			ShowElement(this.id,'divChartAdd','Show');
			var bForecast = false;
			if(document.getElementById('IslAgForecastType') != null) bForecast = true;
			switch (sChartType) {
					case 'Pie':
			        case 'Bar':
			            ShowElement(this.id, 'lblChartXLabelColumn', 'Show');
			            ShowElement(this.id, 'lblChartXAxisColumn', 'Hide');
			            ShowElement(this.id, 'lblChartYDataColumn', 'Show');
			            ShowElement(this.id, 'lblChartYAxisColumn', 'Hide');
			            ShowElement(this.id, 'lblChartSizeColumn', 'Hide');
			            ShowElement(this.id, 'rdAgChartXLabelColumn', 'Show');
			            ShowElement(this.id, 'rdAgChartXDataColumn', 'Hide');
			            ShowElement(this.id, 'rdAgChartXNumberColumn', 'Hide');
			            ShowElement(this.id, 'rdAgChartYAggrLabel', 'Show');
			            ShowElement(this.id, 'rdAgChartSizeColumnAggrLabel', 'Hide');
			            ShowElement(this.id, 'rdAgChartYAggrList', 'Show');
			            ShowElement(this.id, 'rdAgChartXLabelTextColumn', 'Hide');
			            ShowElement(this.id, 'rowChartExtraDataColumn', 'Hide');
			            ShowElement(this.id, 'rowChartExtraAggr', 'Hide');
			            ShowElement(this.id, 'lblChartYDataAggregation', 'Hide');
			            ShowElement(this.id, 'rdAgGaugeMin', 'Hide');
			            ShowElement(this.id, 'rdAgGaugeGoal1', 'Hide');
			            ShowElement(this.id, 'rdAgGaugeGoal2', 'Hide');
			            ShowElement(this.id, 'rdAgGaugeMax', 'Hide');
			            ShowElement(this.id, 'divGaugeError-BlankData', 'Hide');
			            ShowElement(this.id, 'divHeatmapError-BlankSizeColumn', 'Hide');
			            ShowElement(this.id, 'divHeatmapError-BlankColorColumn', 'Hide');
			            ShowElement(this.id, 'divChartError-BlankXAxis', 'Hide');
			            ShowElement(this.id, 'divChartError-BlankYAxis', 'Hide');
			            this.rdAgGetChartsGroupByDateOperatorDiv();
			            if (bForecast) {
    			            if (sChartType == "Bar") {
			                    document.getElementById('rowChartForecast').style.display = '';
			                    document.getElementById('IslAgForecastType').style.display = '';
			                    document.getElementById('rdAgChartForecastLabel').style.display = ''
			                    this.rdAgModifyTimeSeriesCycleLengthOptions(document.getElementById('rdAgChartsDateGroupBy'));
			                    this.rdAgModifyForecastOptions(document.getElementById('rdAgChartXLabelColumn').value);
			                    this.rdAgShowForecastOptions();
			                } else {
    			                this.rdAgHideForecast();
			                }
			            }
			            var aAggrList = []; var aAggrListLabel = []; var aAggrGroupLabel = []; var aAggrGroupLabelClass = [];
			            this.rdAgGetColumnList(aAggrList, aAggrListLabel, '', aAggrGroupLabel, aAggrGroupLabelClass, false);
			            rdchangeList('rdAgChartYColumn', aAggrList, aAggrListLabel, '', aAggrGroupLabel, aAggrGroupLabelClass);
			            break;			        
					case 'Heatmap':
						ShowElement(this.id,'lblChartXLabelColumn','Show');
						ShowElement(this.id,'lblChartXAxisColumn','Hide');
						ShowElement(this.id,'lblChartYDataColumn','Hide');
						ShowElement(this.id,'lblChartYAxisColumn','Hide');
						ShowElement(this.id,'lblChartSizeColumn','Show');
						ShowElement(this.id,'rdAgChartXLabelTextColumn','Show');
						ShowElement(this.id,'rdAgChartXLabelColumn','Hide');
						ShowElement(this.id,'rdAgChartXDataColumn','Hide');
						ShowElement(this.id,'rdAgChartXNumberColumn','Hide');
						ShowElement(this.id,'rdAgChartYAggrLabel','Hide');
						ShowElement(this.id,'rdAgChartSizeColumnAggrLabel','Show');
						ShowElement(this.id,'rdAgChartYAggrList','Show');
						ShowElement(this.id,'rowChartExtraDataColumn','Show');
						ShowElement(this.id,'rowChartExtraAggr','Show');
						ShowElement(this.id,'divChartsGroupByDateOperator','Hide');
						ShowElement(this.id,'lblChartYDataAggregation','Hide');
						ShowElement(this.id,'rdAgGaugeMin','Hide');
						ShowElement(this.id,'rdAgGaugeGoal1','Hide');
						ShowElement(this.id,'rdAgGaugeGoal2','Hide');
						ShowElement(this.id, 'rdAgGaugeMax', 'Hide');
						ShowElement(this.id, 'divChartError-BlankData', 'Hide');
						ShowElement(this.id, 'divGaugeError-BlankData', 'Hide');
						ShowElement(this.id, 'divChartError-BlankXAxis', 'Hide');
						ShowElement(this.id, 'divChartError-BlankYAxis', 'Hide');
						document.rdForm.rdAgChartsDateGroupBy.value='';
						this.rdAgHideForecast();
						break;
					case 'Scatter':
						ShowElement(this.id,'lblChartXLabelColumn','Hide');
						ShowElement(this.id,'lblChartXAxisColumn','Show');
						ShowElement(this.id,'lblChartYDataColumn','Hide');
						ShowElement(this.id,'lblChartYAxisColumn','Show');
						ShowElement(this.id,'lblChartSizeColumn','Hide');
						ShowElement(this.id,'rdAgChartXLabelColumn','Hide');
						ShowElement(this.id,'rdAgChartXDataColumn','Show');
						ShowElement(this.id,'rdAgChartXNumberColumn','Hide');
						ShowElement(this.id,'rdAgChartYAggrLabel','Hide');
						ShowElement(this.id,'rdAgChartSizeColumnAggrLabel','Hide');
						ShowElement(this.id,'rdAgChartYAggrList','Hide');
						ShowElement(this.id,'divChartsGroupByDateOperator','Hide');
						ShowElement(this.id,'rdAgChartXLabelTextColumn','Hide');
						ShowElement(this.id,'rowChartExtraDataColumn','Hide');
						ShowElement(this.id,'rowChartExtraAggr','Hide');
						ShowElement(this.id,'lblChartYDataAggregation','Hide');
						ShowElement(this.id,'rdAgGaugeMin','Hide');
						ShowElement(this.id,'rdAgGaugeGoal1','Hide');
						ShowElement(this.id,'rdAgGaugeGoal2','Hide');
						ShowElement(this.id,'rdAgGaugeMax','Hide');
						ShowElement(this.id, 'divGaugeError-BlankData', 'Hide');
						ShowElement(this.id, 'divChartError-BlankData', 'Hide');
						ShowElement(this.id, 'divChartError-BlankLabel', 'Hide');
						ShowElement(this.id, 'divHeatmapError-BlankSizeColumn', 'Hide');
						ShowElement(this.id, 'divHeatmapError-BlankColorColumn', 'Hide');
						document.rdForm.rdAgChartsDateGroupBy.value='';
						this.rdAgHideForecast();
						var aAggrList = []; var aAggrListLabel = []; var aAggrGroupLabel = []; var aAggrGroupLabelClass = [];
						this.rdAgGetColumnList(aAggrList, aAggrListLabel, 'number', aAggrGroupLabel, aAggrGroupLabelClass, false);
						rdchangeList('rdAgChartYColumn', aAggrList, aAggrListLabel, '', aAggrGroupLabel, aAggrGroupLabelClass);
						break;
					case 'Gauge':
					   ShowElement(this.id,'lblChartXLabelColumn','Hide');
						ShowElement(this.id,'lblChartXAxisColumn','Hide');
						ShowElement(this.id,'lblChartYDataColumn','Show');
						ShowElement(this.id,'lblChartYAxisColumn','Hide');
						ShowElement(this.id,'lblChartSizeColumn','Hide');
						ShowElement(this.id,'rdAgChartXLabelColumn','Hide');
						ShowElement(this.id,'rdAgChartXDataColumn','Hide');
						ShowElement(this.id,'rdAgChartXNumberColumn','Hide');
						ShowElement(this.id,'rdAgChartYAggrLabel','Show');
						ShowElement(this.id,'rdAgChartSizeColumnAggrLabel','Hide');
						ShowElement(this.id,'rdAgChartYAggrList','Show');
						ShowElement(this.id,'rdAgChartXLabelTextColumn','Hide');
						ShowElement(this.id,'rowChartExtraDataColumn','Hide');
						ShowElement(this.id,'rowChartExtraAggr','Hide');
						ShowElement(this.id,'lblChartYDataAggregation','Hide');
						ShowElement(this.id,'rdAgGaugeMin','Show');
						ShowElement(this.id,'rdAgGaugeGoal1','Show');
						ShowElement(this.id,'rdAgGaugeGoal2','Show');
						ShowElement(this.id,'rdAgGaugeMax','Show');
						ShowElement(this.id,'divChartError-BlankData','Hide');
						ShowElement(this.id, 'divChartError-BlankLabel', 'Hide');
						ShowElement(this.id, 'divHeatmapError-BlankSizeColumn', 'Hide');
						ShowElement(this.id, 'divHeatmapError-BlankColorColumn', 'Hide');
						ShowElement(this.id, 'divChartError-BlankXAxis', 'Hide');
						ShowElement(this.id, 'divChartError-BlankYAxis', 'Hide');
						if((document.getElementById('rdAgGaugeAggregationValue').value == '' || Y.DOM.getText(Y.one('#lblChartYDataAggregation')) == '') && document.getElementById('rdAgChartYColumn').value != ''){
							this.rdGetAgGaugeAggregation();
						}
						ShowElement(this.id,'divChartsGroupByDateOperator','Hide');
						document.rdForm.rdAgChartsDateGroupBy.value='';
						this.rdAgHideForecast();
						var aAggrList = []; var aAggrListLabel = []; var aAggrGroupLabel = []; var aAggrGroupLabelClass = [];
						this.rdAgGetColumnList(aAggrList, aAggrListLabel, 'number', aAggrGroupLabel, aAggrGroupLabelClass, false);
						rdchangeList('rdAgChartYColumn', aAggrList, aAggrListLabel, '', aAggrGroupLabel, aAggrGroupLabelClass);
						break;
					default:  //Line,Spline
						ShowElement(this.id,'lblChartXLabelColumn','Hide');
						ShowElement(this.id,'lblChartXAxisColumn','Show');
						ShowElement(this.id,'lblChartYDataColumn','Hide');
						ShowElement(this.id,'lblChartYAxisColumn','Show');
						ShowElement(this.id,'lblChartSizeColumn','Hide');
						ShowElement(this.id,'rdAgChartXLabelColumn','Hide');
						ShowElement(this.id,'rdAgChartXDataColumn','Show');
						ShowElement(this.id,'rdAgChartXNumberColumn','Hide');
						ShowElement(this.id,'rdAgChartYAggrLabel','Show');
						ShowElement(this.id,'rdAgChartSizeColumnAggrLabel','Hide');
						ShowElement(this.id,'rdAgChartYAggrList','Show');
						ShowElement(this.id,'rdAgChartXLabelTextColumn','Hide');
						ShowElement(this.id,'rowChartExtraDataColumn','Hide');
						ShowElement(this.id,'rowChartExtraAggr','Hide');
						ShowElement(this.id,'lblChartYDataAggregation','Hide');
						ShowElement(this.id,'rdAgGaugeInput','Hide');
						ShowElement(this.id,'rdAgGaugeMin','Hide');
						ShowElement(this.id,'rdAgGaugeGoal1','Hide');
						ShowElement(this.id,'rdAgGaugeGoal2','Hide');
						ShowElement(this.id,'rdAgGaugeMax','Hide');
						ShowElement(this.id, 'divGaugeError-BlankData', 'Hide');
						ShowElement(this.id, 'divChartError-BlankData', 'Hide');
						ShowElement(this.id, 'divChartError-BlankLabel', 'Hide');
						ShowElement(this.id, 'divHeatmapError-BlankSizeColumn', 'Hide');
						ShowElement(this.id, 'divHeatmapError-BlankColorColumn', 'Hide');
						this.rdAgGetChartsGroupByDateOperatorDiv();
						if(bForecast){
							document.getElementById('rowChartForecast').style.display = '';
							document.getElementById('IslAgForecastType').style.display = '';
							document.getElementById('rdAgChartForecastLabel').style.display = '';
							this.rdAgModifyTimeSeriesCycleLengthOptions(document.getElementById('rdAgChartsDateGroupBy'));    
							this.rdAgModifyForecastOptions(document.getElementById('rdAgChartXDataColumn').value);
							this.rdAgShowForecastOptions();
						}
						var aAggrList = []; var aAggrListLabel = []; var aAggrGroupLabel = []; var aAggrGroupLabelClass = [];
						this.rdAgGetColumnList(aAggrList, aAggrListLabel, 'number', aAggrGroupLabel, aAggrGroupLabelClass, false);
						rdchangeList('rdAgChartYColumn', aAggrList, aAggrListLabel, '', aAggrGroupLabel, aAggrGroupLabelClass);
						break;
			}
			this.rdAgModifyAggregationAvailability(document.getElementById('rdAgChartXDataColumn').value);   //#18599.
			//Highlight the selected chart.
			document.getElementById('lblChartAddPie').className = "rdAgCommand";
			document.getElementById('lblChartAddBar').className = "rdAgCommand";
			document.getElementById('lblChartAddLine').className = "rdAgCommand";
			document.getElementById('lblChartAddSpline').className = "rdAgCommand";
			document.getElementById('lblChartAddScatter').className = "rdAgCommand";
            //22351
			document.getElementById('lblChartAddGauge').className = "rdAgCommand";
			if(document.getElementById('lblChartAddHeatmap') != null){
				document.getElementById('lblChartAddHeatmap').className = "rdAgCommand";
			}
			var eleSelectedCommand = document.getElementById('lblChartAdd' + sChartType);
			eleSelectedCommand.className = "rdAgCommand rdAgCommandHightlight";
			
		},

		rdAgManipulateFilterOptionsDropdownForDateColumns : function(sFilterColumn, sFilterOperator, sFilterValue){
			// Function gets called when the filter link (with the filter info displayed above the data table) displayed is clicked to set the drop down values.  
			this.rdAgRemoveAllWhiteSpaceNodesFromFilterOperatorDropdown();      
			document.rdForm.rdAgFilterColumn.value = sFilterColumn;
			var i = 0;
			if(document.rdForm.rdAgFilterColumn.value){
				if((document.rdForm.rdAgPickDateColumns.value.indexOf(document.rdForm.rdAgFilterColumn.value + ",")!=-1)|(document.rdForm.rdAgPickDateColumns.value.indexOf(document.rdForm.rdAgFilterColumn.value +"-NoCalendar" + ",")!=-1)){
					if(document.rdForm.rdAgFilterOperator.lastChild.value == 'Date Range'){
						for(i=1;i<=1;i++){
							rdFilterNewComparisonOptionsArray.push(document.rdForm.rdAgFilterOperator.lastChild);    // remove the new Comparison option 'Date Range'.
							document.rdForm.rdAgFilterOperator.removeChild(document.rdForm.rdAgFilterOperator.lastChild); 
						}  
						if(document.rdForm.rdAgFilterOperator.lastChild.value == 'Contains'){    //remove the options 'Starts With' and 'Contains'.
							for (i=0;i<=1;i++){
								rdFilterOldComparisonOptionsArray.push(document.rdForm.rdAgFilterOperator.lastChild);
								document.rdForm.rdAgFilterOperator.removeChild(document.rdForm.rdAgFilterOperator.lastChild); 
							}
						}
						for(i=1;i<=1;i++){ // Add the new Comparison option 'Date Range' back.
							document.rdForm.rdAgFilterOperator.appendChild(rdFilterNewComparisonOptionsArray.pop());
						}  
					}
					else{
					   if(document.rdForm.rdAgFilterOperator.lastChild.value == 'Contains'){    //remove the options 'Starts With' and 'Contains'.
							for (i=0;i<=1;i++){
								rdFilterOldComparisonOptionsArray.push(document.rdForm.rdAgFilterOperator.lastChild);
								document.rdForm.rdAgFilterOperator.removeChild(document.rdForm.rdAgFilterOperator.lastChild); 
							}
						}
						for(i=1;i<=1;i++){ // Add the new Comparison option 'Date Range' back.
							document.rdForm.rdAgFilterOperator.appendChild(rdFilterNewComparisonOptionsArray.pop());
						}  
					}
					document.rdForm.rdAgFilterColumn.value = "Date Range"           
				}
			   else if(document.rdForm.rdAgFilterOperator.lastChild.value != 'Contains'){   // Code path executed for putting the original options back.
					if(document.rdForm.rdAgFilterOperator.lastChild.value == 'Date Range'){
						for(i=1;i<=1;i++){
							rdFilterNewComparisonOptionsArray.push(document.rdForm.rdAgFilterOperator.lastChild);    // remove the new Comparison option.
							document.rdForm.rdAgFilterOperator.removeChild(document.rdForm.rdAgFilterOperator.lastChild); 
						}  
						if(document.rdForm.rdAgFilterOperator.lastChild.value != 'Contains'){    //Add the original options back.
						    for (i = 0; i <= 1; i++) {
						        if (rdFilterOldComparisonOptionsArray.length > 0) {
						            document.rdForm.rdAgFilterOperator.appendChild(rdFilterOldComparisonOptionsArray.pop());
                                    //22860 - Existance check to prevent trying to pop an empty array
						        }
							}
						}
					}  
				}
			}   
		},
		
		rdAgSetPickedFilterValue : function(nPickListRowNr) {
			var fraPopup = document.getElementById("subPickDistinct");
			var eleValue = fraPopup.contentWindow.document.getElementById("lblFilter_Row" + nPickListRowNr);
			var sValue;
			if (eleValue.textContent) {
				sValue = eleValue.textContent; //Mozilla
			}else{
				 sValue = eleValue.innerText;  //IE
			}
			document.rdForm.rdAgFilterValue.value = sValue;
		},
		
		rdAgModifyAggregationAvailability : function(sColumn) {
			// Function shows/Hides the Aggregation dropdown based on the X-axis column picked.
			if (document.rdForm.rdAgChartType.value == "Line" || document.rdForm.rdAgChartType.value == "Spline") {   //#16559.
				if (sColumn == '') {
					document.getElementById('rowChartAggr').style.display = 'none';
					return;
				}
				var sDataColumnType = this.rdAgGetColumnDataType(sColumn);
				if (sDataColumnType.toLowerCase() == "number") {
					document.getElementById('rowChartAggr').style.display = 'none';
				} else {
					document.getElementById('rowChartAggr').style.display = '';
				}
			} else {
				document.getElementById('rowChartAggr').style.display = '';
			}
		},
		
		rdAgPickProperElementDiv : function(){
			// Function used to regulate the hiding/unhiding of the Divs containing the InputDate elements, called on the onchange event of the filter operator(values like <, <= etc) dropdown.
			if(document.rdForm.rdAgFilterColumn.value){
				this.rdAgShowProperElementDiv(document.rdForm.rdAgFilterColumn.value, document.rdForm.rdAgFilterOperator.value);
			} 
		},

		rdAgModifyAggregateOptions : function(sColumn){
            // This function modifies the aggregate drilldown based on the y-axis column datatype...    
            var sDataColumnType = this.rdAgGetColumnDataType(sColumn);
            if (Y.Lang.isValue(sDataColumnType)) {
                rdchangeList('rdAgChartYAggrList', '', '',sDataColumnType, '');
            }            
		},

		/* ----Analysis Grid Forecasting----- */

		rdAgShowForecastOptions : function() {
			if(document.getElementById('IslAgForecastType') == null) return;
			var eleForecastType = document.getElementById('IslAgForecastType');
			if(eleForecastType.value == 'TimeSeriesDecomposition'){
				if(document.getElementById('rdAgChartsDateGroupBy').value == "FirstDayOfYear"){
					document.getElementById('IslAgTimeSeriesCycleLength').style.display = 'none';
					document.getElementById('IslAgTimeSeriesCycleLength' + '-Caption').style.display = 'none';
				}else{
					document.getElementById('IslAgTimeSeriesCycleLength').style.display = '';
					document.getElementById('IslAgTimeSeriesCycleLength' + '-Caption').style.display = '';
				}
				document.getElementById('IslAgRegressionType').style.display = 'none';
				document.getElementById('IslAgRegressionType'+ '-Caption').style.display = 'none';      
				return;
			}
			else if(eleForecastType.value == 'Regression'){
				var eleRegression = document.getElementById('IslAgRegressionType');
				document.getElementById('IslAgRegressionType').style.display = '';
				document.getElementById('IslAgRegressionType' + '-Caption').style.display = '';
				document.getElementById('IslAgTimeSeriesCycleLength').style.display = 'none';
				document.getElementById('IslAgTimeSeriesCycleLength' + '-Caption').style.display = 'none';
				return;
			}
			else{
				document.getElementById('IslAgTimeSeriesCycleLength').style.display = 'none';
				document.getElementById('IslAgTimeSeriesCycleLength' + '-Caption').style.display = 'none';
				document.getElementById('IslAgRegressionType').style.display = 'none';
				document.getElementById('IslAgRegressionType' + '-Caption').style.display = 'none';
			}   
		},

        /* ---This function gets a list of AG columns for the datatype specified --- */
		rdAgGetColumnList : function(array, arrayLabel, sDataType, aAggrGroupLabel, aAggrGroupLabelClass, includeGroupAggr) {
		    var eleAgDataColumnDetails = document.getElementById('rdAgDataColumnDetails');		    
		    if (eleAgDataColumnDetails.value != '') {
		        var sDataColumnDetails = eleAgDataColumnDetails.value;
		        var aDataColumnDetails = sDataColumnDetails.split(',')
		        if (aDataColumnDetails.length > 0) {
		            var i; var j = 0;
		            var sColumnVal = '';
		            for (i = 0; i < aDataColumnDetails.length; i++) {
		                var sDataColumnDetail = aDataColumnDetails[i];
		                if (includeGroupAggr == false && sDataColumnDetail.indexOf('^') > -1) {
		                    sDataColumnDetail = '';
		                }
		                if (sDataColumnDetail.length > 1 && sDataColumnDetail.indexOf(':') > -1) {
		                    var sDataColumnType = sDataColumnDetail.split(':')[1].split("|")[0];
		                    if (sDataType == '') {		                       
		                        sColumnVal = sDataColumnDetail.split(':')[0];
		                        array[i] = sColumnVal.split(';')[0];
		                        arrayLabel[i] = sColumnVal.split(';')[1];
                                /* 21211 - Non IE browsers need a blank value defined for empty array entries */
		                        if (i == 1) {  
		                            array[0] = '';
		                            arrayLabel[0] = '';
		                        }
		                        if (sDataColumnDetail.indexOf("|") > -1) {
		                            aAggrGroupLabel[i] = sDataColumnDetail.split('|')[1].split('-')[0];
		                            if (sDataColumnDetail.indexOf("^") > -1) {
		                                aAggrGroupLabelClass[i] = sDataColumnDetail.split('-')[1].split('^')[0];
		                            }
		                            else {
		                                aAggrGroupLabelClass[i] = sDataColumnDetail.split('|')[1].split('-')[1];
		                            }
		                        }
		                        else {
		                            aAggrGroupLabel[i] = '';
		                            aAggrGroupLabelClass[i] = '';
		                        }
		                    } 
		                    else if (sDataType == 'number' && sDataColumnType == 'Number') {		                        
		                        sColumnVal = sDataColumnDetail.split(':')[0];
		                        array[j] = sColumnVal.split(';')[0];
		                        arrayLabel[j] = sColumnVal.split(';')[1];
		                        j++;
		                        if (sDataColumnDetail.indexOf("|") > -1) {
		                            aAggrGroupLabel[j] = sDataColumnDetail.split('|')[1].split('-')[0];
		                            aAggrGroupLabelClass[j] = sDataColumnDetail.split('|')[1].split('-')[1];
		                        }
		                        else {
		                            aAggrGroupLabel[j] = '';
		                            aAggrGroupLabelClass[j] = '';
		                        }
		                    }
		                }
		            }
		            if ( sDataType == 'number' ) {
		                array.unshift('');
		                arrayLabel.unshift('');
		            }		            
		        }
		    }		    
	    },
        	
		rdAgGetColumnDataType : function(sColumn){
			var eleAgDataColumnDetails = document.getElementById('rdAgDataColumnDetails'); 
			if(eleAgDataColumnDetails.value != ''){
				var sDataColumnDetails = eleAgDataColumnDetails.value;
				var aDataColumnDetails = sDataColumnDetails.split(',')
				if(aDataColumnDetails.length > 0){
					var i;
					for(i=0;i<aDataColumnDetails.length;i++){
						var sDataColumnDetail = aDataColumnDetails[i];
						if(sDataColumnDetail.length > 1 && sDataColumnDetail.indexOf(':') > -1){
						    var sDataColumn = sDataColumnDetail.split(':')[0];
						    sDataColumn = sDataColumnDetail.split(';')[0];
						    if (sDataColumn == sColumn) {
                                //22397
								return sDataColumnDetail.split(':')[1].split("|")[0];
							}
						}
					}
				}
			}
		},		

		rdAgModifyForecastOptions : function(sColumn){
			// Function modifies the forecast type dropdown based on the X-Axis column value.
			if(document.rdForm.rdAgChartType.value == "Pie" || document.rdForm.rdAgChartType.value == "Scatter" || document.rdForm.rdAgChartType.value == "Heatmap"){this.rdAgHideForecast(); return;}   //#16559.
			if(document.getElementById('IslAgForecastType') == null) return;
			if(sColumn == ''){this.rdAgResetForecastValues(); return;}
			var eleAgDataColumnDetails = document.getElementById('rdAgDataColumnDetails');
			var eleDataForecastDropdown = document.getElementById('IslAgForecastType');
			var sForecastValue = eleDataForecastDropdown.value;
			var eleDateGroupByDropdown = document.getElementById('rdAgChartsDateGroupBy');
			var aForecastValues = ['None', 'TimeSeriesDecomposition', 'Regression']; 
			var aForecastOptions = ['', 'Time Series', 'Regression']; 
			var sDataColumnType = this.rdAgGetColumnDataType(sColumn);
			if(Y.Lang.isValue(sDataColumnType)){
				if(sDataColumnType.toLowerCase() == "text"){
					this.rdAgHideForecast();
					return;
				}
				if(sDataColumnType.toLowerCase() != "date" && sDataColumnType.toLowerCase() != "datetime"){
					if(eleDataForecastDropdown.options[1].value == 'TimeSeriesDecomposition'){
						eleDataForecastDropdown.remove(1);
					}
					document.getElementById('rowChartForecast').style.display = '';                                    
					document.getElementById('IslAgForecastType').style.display = '';
					document.getElementById('rdAgChartForecastLabel').style.display = '';
					document.getElementById('IslAgTimeSeriesCycleLength').style.display = 'none';
					document.getElementById('IslAgTimeSeriesCycleLength'+ '-Caption').style.display = 'none';
				}else{
					if(eleDataForecastDropdown.options.length < 3){ 
						var j;
						for(j=0;j<4;j++){
							if(eleDataForecastDropdown.options.length > 0){
								eleDataForecastDropdown.remove(0);
							}
						}
						var k;
						for(k=0;k<aForecastOptions.length;k++){
							var eleForecastOption = document.createElement('option');
							eleForecastOption.text = aForecastOptions[k];
							eleForecastOption.value = aForecastValues[k];
							eleDataForecastDropdown.add(eleForecastOption);
						}
						if(sForecastValue.length > 0){
							eleDataForecastDropdown.value = sForecastValue;
						}                                   
					}
					document.getElementById('rowChartForecast').style.display = '';
					document.getElementById('IslAgForecastType').style.display = '';
					document.getElementById('rdAgChartForecastLabel').style.display = ''
				}
			}
		},
		rdAgResetForecastValues : function(){
			// Function resets all forecast related element values.
			if(document.getElementById('IslAgForecastType') == null) return;
			document.getElementById('IslAgForecastType').value = '';
			document.getElementById('IslAgTimeSeriesCycleLength').value = '';
			document.getElementById('IslAgRegressionType').value = 'Linear';
		},

		rdAgModifyTimeSeriesCycleLengthOptions : function(eleColumnGroupByDropdown){

			// Function modifies the forecast cycle length options based on the Groupby dropdown value.
			if(document.getElementById('IslAgForecastType') == null) return;
			if(document.rdForm.rdAgChartType.value == "Pie" || document.rdForm.rdAgChartType.value == "Scatter" || document.rdForm.rdAgChartType.value == "Heatmap") return;
			var eleTimeSeriesCycleLengthDropdown = document.getElementById('IslAgTimeSeriesCycleLength');
			var sTimeSeriesCycleLength = eleTimeSeriesCycleLengthDropdown.value;
			var sColumnGroupByValue = eleColumnGroupByDropdown.value
			var i; var j = 0; var aColumnGroupByOptions = ['Year', 'Quarter', 'Month', 'Week', 'Day', 'Hour']; 
			this.rdResetTimeSeriesCycleLenthDropdown();
			switch(sColumnGroupByValue){
				case 'FirstDayOfYear':
				 for(i=0;i<7;i++){
						var eleTimeSeriesCycleLengthOption = eleTimeSeriesCycleLengthDropdown.options[j]
						if(eleTimeSeriesCycleLengthOption != null){
							if(eleTimeSeriesCycleLengthOption.value != ''){
								eleTimeSeriesCycleLengthDropdown.remove(j);
							}else{
								if(eleTimeSeriesCycleLengthOption.value == sTimeSeriesCycleLength){
									eleTimeSeriesCycleLengthDropdown.value = sTimeSeriesCycleLength;
								}
								j += 1;
							}
						}
					}
					document.getElementById('IslAgTimeSeriesCycleLength').style.display = 'none';
					document.getElementById('IslAgTimeSeriesCycleLength' + '-Caption').style.display = 'none';
					break;
				case 'FirstDayOfQuarter':
				for(i=0;i<7;i++){
						var eleTimeSeriesCycleLengthOption = eleTimeSeriesCycleLengthDropdown.options[j]
						if(eleTimeSeriesCycleLengthOption != null){
							if(eleTimeSeriesCycleLengthOption.value != '' && eleTimeSeriesCycleLengthOption.value != 'Year'){
								eleTimeSeriesCycleLengthDropdown.remove(j);
							}else{
								if(eleTimeSeriesCycleLengthOption.value == sTimeSeriesCycleLength){
									eleTimeSeriesCycleLengthDropdown.value = sTimeSeriesCycleLength;
								}
								j += 1;
							}
						}
					}
					if(document.getElementById('IslAgForecastType').value == 'TimeSeriesDecomposition'){
						document.getElementById('IslAgTimeSeriesCycleLength').style.display = '';
						document.getElementById('IslAgTimeSeriesCycleLength' + '-Caption').style.display = '';
					}
					break;
				case 'FirstDayOfMonth':
					for(i=0;i<7;i++){
						var eleTimeSeriesCycleLengthOption = eleTimeSeriesCycleLengthDropdown.options[j]
						if(eleTimeSeriesCycleLengthOption != null){
							if(eleTimeSeriesCycleLengthOption.value != '' && eleTimeSeriesCycleLengthOption.value != 'Year' && eleTimeSeriesCycleLengthOption.value != 'Quarter'){
								eleTimeSeriesCycleLengthDropdown.remove(j);
							}else{
								if(eleTimeSeriesCycleLengthOption.value == sTimeSeriesCycleLength){
									eleTimeSeriesCycleLengthDropdown.value = sTimeSeriesCycleLength;
								}
								j += 1;
							}
						}
					}
					if(document.getElementById('IslAgForecastType').value == 'TimeSeriesDecomposition'){
						document.getElementById('IslAgTimeSeriesCycleLength').style.display = '';
						document.getElementById('IslAgTimeSeriesCycleLength' + '-Caption').style.display = '';
					}
					break;
				case 'Date':
					for(i=0;i<7;i++){
						var eleTimeSeriesCycleLengthOption = eleTimeSeriesCycleLengthDropdown.options[j]
						if(eleTimeSeriesCycleLengthOption != null){
							if(eleTimeSeriesCycleLengthOption.value != '' && eleTimeSeriesCycleLengthOption.value != 'Year' && eleTimeSeriesCycleLengthOption.value != 'Quarter' && eleTimeSeriesCycleLengthOption.value != 'Month' && eleTimeSeriesCycleLengthOption.value != 'Week'){
								eleTimeSeriesCycleLengthDropdown.remove(j);
							}else{
								if(eleTimeSeriesCycleLengthOption.value == sTimeSeriesCycleLength){
									eleTimeSeriesCycleLengthDropdown.value = sTimeSeriesCycleLength;
								}
								j += 1;
							}
						}
					}
					if(document.getElementById('IslAgForecastType').value == 'TimeSeriesDecomposition'){
						document.getElementById('IslAgTimeSeriesCycleLength').style.display = '';
						document.getElementById('IslAgTimeSeriesCycleLength' + '-Caption').style.display = '';
					}
					break;
			}
			if(eleTimeSeriesCycleLengthDropdown.value == ''){
				eleTimeSeriesCycleLengthDropdown.value = eleTimeSeriesCycleLengthDropdown.options[eleTimeSeriesCycleLengthDropdown.options.length -1].value;
				if(eleTimeSeriesCycleLengthDropdown.options[eleTimeSeriesCycleLengthDropdown.options.length -1].value == "Day"){
					eleTimeSeriesCycleLengthDropdown.value = '';
				}        
			}
		},

		rdResetTimeSeriesCycleLenthDropdown : function() {
			// Function resets the forecast cycle length dropdown.
			if(document.getElementById('IslAgForecastType') == null) return;
			var eleTimeSeriesCycleLengthDropdown = document.getElementById('IslAgTimeSeriesCycleLength');
			var i; var aColumnGroupByOptions = ['', 'Year', 'Quarter', 'Month', 'Week', 'Day']; 
			if(eleTimeSeriesCycleLengthDropdown.options.length >5) return;
			for(i=0;i<7;i++){
				if(eleTimeSeriesCycleLengthDropdown.options.length > 0){
					eleTimeSeriesCycleLengthDropdown.remove(0);
				}else{
					break;
				}
			}
			for(i=0;i<aColumnGroupByOptions.length;i++){
				var eleTimeSeriesOption = document.createElement('option');
				eleTimeSeriesOption.text = aColumnGroupByOptions[i];
				eleTimeSeriesOption.value = aColumnGroupByOptions[i];
				eleTimeSeriesCycleLengthDropdown.add(eleTimeSeriesOption);
			}
		},
		
		rdAgHideForecast : function(){
			// Function hides all forecast related elements.
			if(document.getElementById('IslAgForecastType') == null) return;
			document.getElementById('rowChartForecast').style.display = 'none';
			document.getElementById('IslAgForecastType').style.display = 'none';
			document.getElementById('IslAgForecastType').value = '';
			document.getElementById('rdAgChartForecastLabel').style.display = 'none'
			document.getElementById('IslAgTimeSeriesCycleLength').style.display = 'none';
			document.getElementById('IslAgTimeSeriesCycleLength'+ '-Caption').style.display = 'none';
			document.getElementById('IslAgRegressionType').style.display = 'none';
			document.getElementById('IslAgRegressionType' + '-Caption').style.display = 'none';
		},
		
		/* -----KPIs------ */
		rdGetAgGaugeAggregation : function(){
			Y.one('#lblChartYDataAggregation').hide();
			Y.one('#lblSuggestedMinMax').hide();
			if(document.rdForm.rdAgChartType.value != "Gauge") return;
			if(document.getElementById('rdAgChartYColumn').value == '' || document.getElementById('rdAgChartYAggrList').value == '') return;
			Y.one('#lblChartYDataAggregation').hide();
			Y.one('#lblSuggestedMinMax').hide();
			var sRefreshIDs = document.getElementById("rdAgReportId").value + ',lblChartYDataAggregation,rdAgGaugeAggregationValue,lblSuggestedMinMax';
			var eleMinValueBox = document.getElementById('txtMinValue')
			var rdAgRefreshParams = "&rdReport=" + document.getElementById("rdAgReportId").value;
			rdAgRefreshParams += "&rdAgId=" + document.getElementById('rdAgId').value;
			rdAgRefreshParams += "&rdAgAggregateColumnValue=" + document.getElementById('rdAgChartYColumn').value;
			rdAgRefreshParams += "&rdAgAggregation=" + document.getElementById('rdAgChartYAggrList').value;
			rdAgRefreshParams += "&rdDataCache=" + document.getElementById('rdDataTableDiv-dtAnalysisGrid').getAttribute("rdDataCache");
			rdAgRefreshParams += "&rdAgAggregationText=" + document.getElementById('rdAgChartYAggrList').options[document.getElementById('rdAgChartYAggrList').selectedIndex].text;
			rdAgRefreshParams += "&rdAgGetGaugeAggregation=True";
			rdAjaxRequestWithFormVars("rdAjaxCommand=RefreshElement&rdRefreshElementID=" + sRefreshIDs + rdAgRefreshParams, false, "", false, false, this.ShowMinMaxSuggestionLink)
		},
		ShowMinMaxSuggestionLink : function(){
		    LogiXML.AnalysisGrid.rdSetClassNameById('colChart', 'rdAgUnselectedTab');   //#20970.
		    Y.one('#divSuggestedMinMax').show();
		    if (Y.one('#rdChartError')) {
		        Y.one('#rdChartError').remove();
		    }
		    ShowElement(this.id, 'divGaugeError-BlankData', 'Hide');
		},
		
		AutoPopulateMinMaxValues : function(){
			var nMin = document.getElementById('txtMinValue').value;
			var nMax = document.getElementById('txtMaxValue').value;
			var nGoal1 = document.getElementById('txtGoal1').value; 
			var nGoal2 = document.getElementById('txtGoal2').value;
			if(document.getElementById('rdAgGaugeAggregationValue').value == '') return;
			var nAggregationLength = parseInt(document.getElementById('rdAgGaugeAggregationValue').value).toString().length
			var fAggregation = parseFloat(document.getElementById('rdAgGaugeAggregationValue').value);
			var sBuiltValue;
			if(fAggregation<0){
				sBuiltValue = '-1';
				if(fAggregation<-1){   
					for(i=0;i<nAggregationLength-1;i++){
						sBuiltValue += '0';
					}
				}
				document.getElementById('txtMinValue').value = sBuiltValue;
				document.getElementById('txtMaxValue').value = 0;
				if(parseFloat(nGoal1) > 0){ //#17769.
					document.getElementById('txtGoal1').value = '';
				}
				if(parseFloat(nGoal2) > 0){
					 document.getElementById('txtGoal2').value = '';
				}
			}else{
				document.getElementById('txtMinValue').value = 0;
				sBuiltValue = '1';
				if(fAggregation>1){        
					for(i=0;i<nAggregationLength;i++){
						sBuiltValue += '0';
					}
				}
				document.getElementById('txtMaxValue').value = sBuiltValue;      
				if(parseFloat(nGoal1) > parseFloat(sBuiltValue)){   //#17769.
					document.getElementById('txtGoal1').value = '';
				}
				if(parseFloat(nGoal2) > parseFloat(sBuiltValue)){
					 document.getElementById('txtGoal2').value = '';
				}
			}    
		},
	
		/* -----Draggable Panels----- */
		rdInitDraggableAgPanels : function(){
			var bDraggableAgPanels = false;
			var eleDraggableAgPanels = document.getElementById('rdAgDraggablePanels');
			if (eleDraggableAgPanels!= null) bDraggableAgPanels = true;  
		  			
			var aDraggableAgPanels = this.rdGetDraggableAgPanels();
		    //Destroy the registered drag/drop nodes if any.
			for (i = 0; i < aDraggableAgPanels.length; i++) {
			    Y.DD.DDM.getNode(aDraggableAgPanels[i]).destroy();
			}
			if (aDraggableAgPanels.length > 1) {
			    for (var i = 0; i < aDraggableAgPanels.length; i++) {
			        var eleAgPanel = aDraggableAgPanels[i];
			        if (bDraggableAgPanels) {

			            var pnlNode = Y.one('#' + eleAgPanel.id);
			            var pnlDD = new Y.DD.Drag({
			                node: pnlNode
			            }).plug(Y.Plugin.DDConstrained, {
			                stickY: true
			            });
			            var pnlDrop = pnlNode.plug(Y.Plugin.Drop);

			            var pnlDragged = null;
			            var originalPanelPosition = [0, 0];
			            var bDoNothingMore = false;

			            pnlDD.on('drag:start', this.Panel_onDragStart, this);
			            pnlDD.on('drag:drag', this.Panel_onDrag, this);
			            pnlDD.on('drag:over', this.Panel_onDragOver, this);
			            pnlDD.on('drag:drophit', this.Panel_onDropHit, this);
			            pnlDD.on('drag:end', this.Panel_onDragEnd, this);

			            var elePanelHeaderId = (Y.Selector.query('table.rdAgContentHeadingRow', eleAgPanel).length == 0 ?
                                                Y.Selector.query('td.rdAgContentHeading', eleAgPanel)[0].id :
                                                Y.Selector.query('table.rdAgContentHeadingRow', eleAgPanel)[0].id);

			            var pnlTitleNode = Y.one('#' + elePanelHeaderId);
			            pnlDD.addHandle('#' + elePanelHeaderId).plug(Y.Plugin.DDWinScroll, { horizontal: false, vertical: true, scrollDelay: 100, windowScroll: true });
			            pnlTitleNode.setStyle('cursor', 'move');
			        }
			    }
			}
		},
			
		/* -----Events----- */
		
		Panel_onDragStart : function(e) {
			pnlDragged = e.target.get('dragNode').getDOMNode();
			this.rdSetDraggableAgPanelsZIndex(pnlDragged, e.target.panels);
			Y.DOM.setStyle(pnlDragged, "opacity", '.65');
			originalPanelPosition = Y.DOM.getXY(pnlDragged);
			bDoNothingMore = false;
			this.set('targetPanel', null);
		},
		
		Panel_onDragOver : function(e) {
			this.set('targetPanel', e.drop.get('node').getDOMNode());
			
			var eleTargetPanel = this.get('targetPanel');
			pnlDragged = e.target.get('dragNode').getDOMNode();
			
			if(eleTargetPanel.id.match('rdDivAgPanelWrap_')) {
					var regionDraggedPanel = Y.DOM.region(pnlDragged);
					var regionTargetPanel = Y.DOM.region(eleTargetPanel);
					var nTargetPanelHeight = regionTargetPanel.height; 
					eleTargetPanelHandle = eleTargetPanel.nextSibling;
					if(originalPanelPosition[1] < regionDraggedPanel.top){
						if(regionDraggedPanel.top > (regionTargetPanel.top + Math.round(nTargetPanelHeight/2))){
							 eleTargetPanel.nextSibling.firstChild.firstChild.firstChild.className = 'rdAgDropZoneActive';
						}else{
							 eleTargetPanel.previousSibling.firstChild.firstChild.firstChild.className = 'rdAgDropZoneActive';
						}
					}else{
						 if(regionDraggedPanel.top < (regionTargetPanel.top + Math.round(nTargetPanelHeight/2))){
							eleTargetPanel.previousSibling.firstChild.firstChild.firstChild.className = 'rdAgDropZoneActive';                             
						}else{
							eleTargetPanel.nextSibling.firstChild.firstChild.firstChild.className = 'rdAgDropZoneActive';  
						}
					}
				} 
		},
		
		Panel_onDrag : function(e) {
			this.rdNeutralizeDropZoneColor();   
			
			var eleTargetPanel = this.get('targetPanel');
			
			if(!Y.Lang.isValue(eleTargetPanel)){							
				pnlDragged.previousSibling.firstChild.firstChild.firstChild.className = 'rdAgDropZoneActive';
			}
		},
		
		Panel_onDropHit : function(e) {
			this.rdMoveAgPanels(pnlDragged, this.get('targetPanel'), originalPanelPosition, bDoNothingMore);		    
			pnlDragged.style.cssText = '';
			Y.DOM.setStyle(pnlDragged, "opacity", '1');
			bDoNothingMore = true;
		},
		
		Panel_onDragEnd : function(e) {
			var context = this;
			this.rdMoveAgPanels(pnlDragged, this.get('targetPanel'), originalPanelPosition, bDoNothingMore);
			pnlDragged.style.cssText = '';
			Y.DOM.setStyle(pnlDragged, "opacity", '1');
			if(LogiXML.features['touch']) 
				setTimeout(function(){context.rdResetAGPanelAfterDDScroll(pnlDragged)}, 1000);  // Do this for the Tablet only, #15364.
		},
		
		/* -----Draggable Panel Methods----- */
		
		rdMoveAgPanels : function(eleDraggedPanel, eleTargetPanel, originalPanelPosition, bDoNothing) {
			
			if(!bDoNothing){
			
				var regionDraggedPanel = Y.DOM.region(eleDraggedPanel);						
				var eleDraggedPanelHandle = eleDraggedPanel.nextSibling;
					
				if(eleTargetPanel){						
					
					var regionTargetPanel = Y.DOM.region(eleTargetPanel);	
					var nTargetPanelHeight = regionTargetPanel.height;
					var eleTargetPanelHandle = eleTargetPanel.nextSibling;							
					
					if(eleTargetPanel.id.match('rdDivAgPanelWrap_')) {
						
						if(originalPanelPosition[1] < regionDraggedPanel.top){
							if(regionDraggedPanel.top > (regionTargetPanel.top + Math.round(nTargetPanelHeight/2))){
								 if(eleTargetPanelHandle.nextSibling){
									eleTargetPanel.parentNode.insertBefore(eleDraggedPanel, eleTargetPanelHandle.nextSibling);
									eleTargetPanel.parentNode.insertBefore(eleDraggedPanelHandle, eleTargetPanelHandle.nextSibling.nextSibling);                                
								}else{
									 eleTargetPanel.parentNode.appendChild(eleDraggedPanel);
									 eleTargetPanel.parentNode.appendChild(eleDraggedPanelHandle);
								}
							}else{
								eleTargetPanel.parentNode.insertBefore(eleDraggedPanel, eleTargetPanel);
								eleTargetPanel.parentNode.insertBefore(eleDraggedPanelHandle, eleTargetPanel);
							}
							this.rdSaveDraggableAgPanelPositions();
						}else{
							 if(regionDraggedPanel.top < (regionTargetPanel.top + Math.round(nTargetPanelHeight/2))){
								eleTargetPanel.parentNode.insertBefore(eleDraggedPanel, eleTargetPanel);
								eleTargetPanel.parentNode.insertBefore(eleDraggedPanelHandle, eleTargetPanel);                          
							}else{
								if(eleTargetPanelHandle.nextSibling){
									eleTargetPanel.parentNode.insertBefore(eleDraggedPanel, eleTargetPanelHandle.nextSibling);
									eleTargetPanel.parentNode.insertBefore(eleDraggedPanelHandle, eleTargetPanelHandle.nextSibling.nextSibling);
								}else{
									eleTargetPanel.parentNode.appendChild(eleDraggedPanel);
									eleTargetPanel.parentNode.appendChild(eleDraggedPanelHandle);
								}
							} 
							this.rdSaveDraggableAgPanelPositions();
						}
					}
				}
				else{
					var aDraggableAgPanels = this.rdGetDraggableAgPanels();
					var regionDraggedPanel = Y.DOM.region(eleDraggedPanel);
					if(originalPanelPosition[1] < regionDraggedPanel.top){
						if(eleDraggedPanel.id != aDraggableAgPanels[aDraggableAgPanels.length-1].id){
							if(regionDraggedPanel.top > Y.DOM.region(aDraggableAgPanels[aDraggableAgPanels.length-1]).bottom){
								aDraggableAgPanels[0].parentNode.appendChild(eleDraggedPanel);
								aDraggableAgPanels[0].parentNode.appendChild(eleDraggedPanelHandle);
								this.rdSaveDraggableAgPanelPositions();
							}
						}
					}else{
						if(eleDraggedPanel.id != aDraggableAgPanels[0].id){
							if(regionDraggedPanel.top < Y.DOM.region(aDraggableAgPanels[0]).top){
								aDraggableAgPanels[0].parentNode.insertBefore(eleDraggedPanel, aDraggableAgPanels[0]);
								aDraggableAgPanels[0].parentNode.insertBefore(eleDraggedPanelHandle, aDraggableAgPanels[0]);
								this.rdSaveDraggableAgPanelPositions();
							}
						}
					}
				}
				this.rdNeutralizeDropZoneColor();
				eleDraggedPanel.style.top = '0px';   
				eleDraggedPanel.style.left = '0px';
			}
			
		},
		
		rdSaveDraggableAgPanelPositions : function(){
			var rdPanelParams = "&rdReport=" + document.getElementById("rdAgReportId").value;
			rdPanelParams += "&rdAgPanelOrder="; 
			var aDraggableAgPanels = this.rdGetDraggableAgPanels();
			for (var i=0; i < aDraggableAgPanels.length; i++){
				var eleAgPnl = aDraggableAgPanels[i];
				rdPanelParams += eleAgPnl.id.replace('rdDivAgPanelWrap_', '') + ',';
			}
			rdPanelParams += "&rdAgId=" + document.getElementById('rdAgId').value;

			window.status = "Saving dashboard panel positions.";
			rdAjaxRequestWithFormVars('rdAjaxCommand=rdAjaxNotify&rdNotifyCommand=UpdateAgPanelOrder' + rdPanelParams);
		},
		
		rdGetDraggableAgPanels : function(){
				var aDraggableAgPanels = new Array();
				var eleDivAgPanels = document.getElementById('rdDivAgPanels');
				if(eleDivAgPanels == null) return aDraggableAgPanels; //#16596.
				var aDraggableAgDivs = eleDivAgPanels.getElementsByTagName("div")
				for(i=0;i<aDraggableAgDivs.length;i++){
					var eleDraggableAgDiv = aDraggableAgDivs[i];
					if(eleDraggableAgDiv.id){
						if((eleDraggableAgDiv.id.indexOf('rdDivAgPanelWrap_rowTable') > -1) || 
						   (eleDraggableAgDiv.id.indexOf('rdDivAgPanelWrap_rowChart') > -1) ||
						   (eleDraggableAgDiv.id.indexOf('rdDivAgPanelWrap_rowCrosstab_') > -1)) {
						    if(Y.Lang.isValue(eleDraggableAgDiv.firstChild.firstChild)){
						        if(eleDraggableAgDiv.firstChild.firstChild.firstChild.style.display != 'none'){
						            aDraggableAgPanels.push(eleDraggableAgDiv);
						        }
						    }else{
                                //Defensive way of avoiding the empty panel issues.
						        var eleEmptyPanel = Y.one(eleDraggableAgDiv).getDOMNode();
						        var eleEmptyPanelDropZone = eleEmptyPanel.previousSibling;
						        eleEmptyPanel.parentNode.removeChild(eleEmptyPanel);
						        eleEmptyPanelDropZone.parentNode.removeChild(eleEmptyPanelDropZone);
						        eleDraggableAgDiv = Y.one('#' + eleDraggableAgDiv.id).getDOMNode();
						        aDraggableAgPanels.push(eleDraggableAgDiv);
						    }
						}
					}
				}
				return aDraggableAgPanels;
		},
		
		rdSetDraggableAgPanelsZIndex : function(eleAgPanel, aDraggableAgPanels){
			
			aDraggableAgPanels = this.rdGetDraggableAgPanels()
			for (var i=0; i < aDraggableAgPanels.length; i++){
				var eleAgPnl = aDraggableAgPanels[i];
				if(eleAgPnl.id == eleAgPanel.id){
					 Y.DOM.setStyle(eleAgPnl, "zIndex", 1000);
				}else{
					Y.DOM.setStyle(eleAgPnl, "zIndex", 0);
				}           
			}    
		},
					
		rdResetAGPanelAfterDDScroll : function(elePnlDragged){

			var pnlDragged = Y.one(elePnlDragged);
			pnlDragged.setStyles({
				left:0,
				top:0        
			});    
		},
		
		rdNeutralizeDropZoneColor : function(){

			var aDropZoneTDs = Y.Selector.query('td.rdAgDropZoneActive', Y.DOM.byId('rdDivAgPanels'));
			for (var i=0; i < aDropZoneTDs.length; i++){
				var eleDropZoneTD = aDropZoneTDs[i];
				eleDropZoneTD.className = 'rdAgDropZone';
			}
		}
		
	},{
		// Y.AnalysisGrid properties		
		/**
		 * The identity of the widget.
		 *
		 * @property AnalysisGrid.NAME
		 * @type String
		 * @default 'AnalysisGrid'
		 * @readOnly
		 * @protected
		 * @static
		 */
		NAME : 'analysisgrid',
		
		/**
		 * Static property used to define the default attribute configuration of
		 * the Widget.
		 *
		 * @property AnalysisGrid.ATTRS
		 * @type {Object}
		 * @protected
		 * @static
		 */
		ATTRS : {
		
			targetPanel : {
				value: null
			}
		
			/*rdFilterOldComparisonOptionsArray: {
				value: new Array()
			},
			rdFilterNewComparisonOptionsArray: {
				value: new Array()
			}*/			
		}
	});

}, '1.0.0', {requires: ['dd-drop-plugin', 'dd-plugin', 'dd-scroll', 'dd-constrain']});



var sColorPicker = '1';

function GetColorPicker(sColorPickerValue, obj){
    sColorPicker = sColorPickerValue;    
}

function PickGaugeGoalColor(colColor){
    var sColor = Y.Color.toHex(Y.one('#' + colColor.id).getComputedStyle('backgroundColor'));
    var eleColorHolder = document.getElementById('rdAgGaugeGoalsColor' + sColorPicker);
    eleColorHolder.value = sColor;
    var elePickedColorIndicator = document.getElementById('rectColor' + sColorPicker);
    elePickedColorIndicator.style.backgroundColor = sColor;
    ShowElement(this.id,'ppColors','Hide');
}

/* --- Helper functions to change drop down lists for AG aggregate as well as y-axis columns.--- */
function rdchangeList(rdEleId, aNewAggrList, aLabel, sDataColumnType, aAggrGroupLabel, aAggrGroupLabelClass) {
    var rdAggrList = document.getElementById(rdEleId);
    var sSelectedValue = rdAggrList.options[rdAggrList.selectedIndex].text;
    rdemptyList(rdEleId);    
    rdfillList(rdEleId, aNewAggrList, aLabel, sDataColumnType, sSelectedValue, aAggrGroupLabel, aAggrGroupLabelClass);
}

function rdemptyList(rdEleId) {
    var rdAggrList = document.getElementById(rdEleId);
    while (rdAggrList.options.length) rdAggrList.options[0] = null;

    //Remove the option groups if they are present (they get rebuilt later)
    for (var i = 0; i < rdAggrList.childNodes.length; i++) {
        if (rdAggrList.childNodes[i].nodeName == "optgroup" || rdAggrList.childNodes[i].nodeName == "OPTGROUP") {
            rdAggrList.childNodes[i].parentNode.removeChild(rdAggrList.childNodes[i]);
            i = i - 1;
        }
    }
}

function rdfillList(rdEleId, arr, aLabel, sDataColumnType, sSelectedValue, arrGroupLabel, arrGroupLabelClass) {
    var rdAggrList = document.getElementById(rdEleId);    
    if ( sDataColumnType != '' ) {
        if (sDataColumnType.toLowerCase() == "text" || sDataColumnType.toLowerCase() == "datetime") {
            arr = ["COUNT", "DISTINCTCOUNT"];
            aLabel = ["Count", "Distinct Count"];
        }
        else {
            arr = ["SUM", "AVERAGE", "STDEV", "COUNT", "DISTINCTCOUNT", "MIN", "MAX"];
            aLabel = ["Sum", "Average", "Standard Deviation", "Count", "Distinct Count", "Minimum", "Maximum"];
        }
    }

    var arrList = arr;
    var arrLabel = aLabel;
    var group = null;
    for (i = 0; i < arrList.length; i++) {
        //Option Grouping
        if (arrGroupLabel[i] != "" && arrGroupLabel[i]) {
            //create new group (either first one or the group item name has changed)
            if (group == null || group.getAttribute("Label") != arrGroupLabel[i]) {
                var group = document.createElement("optgroup");
                group.setAttribute("Label", arrGroupLabel[i]);
                group.setAttribute("Class", arrGroupLabelClass[i]);
                rdAggrList.appendChild(group);
            }
            option = new Option(arrLabel[i], arrList[i]);
            group.appendChild(option);
        }
        //Non grouped
        else {
            option = new Option(arrLabel[i], arrList[i]);
            rdAggrList.options[rdAggrList.length] = option;
        }

        // set the selected value '21254
        if (arrLabel[i] == sSelectedValue) {
            rdAggrList.selectedIndex = i;
        }
    }
}

