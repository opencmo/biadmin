function rdAcUpdateControls(bRefreshChart,sReport,sAcId) {
    var sCurrChartType = document.getElementById('rdAcChartType_'+sAcId).value
    var sElementIDs = sAcId + ",cellAcChart_" + sAcId
    var bForecast = false;
    if(document.getElementById('IslForecastType_' + sAcId) != null) bForecast = true;
	switch (sCurrChartType) {
			case 'Pie':
			case 'Bar':
				ShowElement(this.id,'lblChartXLabelColumn_'+sAcId,'Show');
				ShowElement(this.id,'lblChartXAxisColumn_'+sAcId,'Hide');
				ShowElement(this.id,'lblChartYDataColumn_'+sAcId,'Show');
				ShowElement(this.id,'lblChartYAxisColumn_'+sAcId,'Hide');
				ShowElement(this.id,'lblChartSizeColumn_'+sAcId,'Hide');
				ShowElement(this.id,'rdAcChartSizeAggrLabel_'+sAcId,'Hide');
				ShowElement(this.id,'rdAcChartXLabelColumn_'+sAcId,'Show');
				ShowElement(this.id,'rdAcChartXDataColumn_'+sAcId,'Hide');
				ShowElement(this.id,'rdAcChartYColumn_'+sAcId,'Show');
				ShowElement(this.id,'rdAcChartYAggrLabel_'+sAcId,'Show');
				ShowElement(this.id,'rdAcChartYAggrList_'+sAcId,'Show');
				ShowElement(this.id,'rowChartExtraDataColumn_'+sAcId,'Hide');
				ShowElement(this.id,'rowChartExtraAggr_'+sAcId,'Hide');	
				
				sElementIDs = sElementIDs + ',rdAcChartXLabelColumn_'+sAcId; //Refresh the Label column dropdown as well.	
				rdAcGetGroupByDateOperatorDiv(document.getElementById('rdAcChartXLabelColumn_'+sAcId).value, sAcId);
		        if(sCurrChartType == 'Pie' || sCurrChartType == ''){ 
				    document.getElementById('rdAcChartsDateGroupBy_'+sAcId).style.display = 'none';
				    document.getElementById('rdAcChartsDateGroupBy_'+sAcId + '-Caption').style.display = 'none';	           
		            if(bForecast && document.getElementById('rowChartForecast_'+sAcId) != null){
                        rdAcHideForecast(sAcId);
	                }
		        }else{
		            if(bForecast){
		                document.getElementById('IslForecastType_' + sAcId).style.display = '';
		                document.getElementById('rdAcChartForecastLabel_' + sAcId).style.display = ''		        
		                rdModifyTimeSeriesCycleLengthOptions(document.getElementById('rdAcChartsDateGroupBy_'+sAcId), sAcId);    
		                rdModifyForecastOptions(document.getElementById('rdAcChartXLabelColumn_'+sAcId).value, sAcId);
		                rdShowForecast(document.getElementById('rdAcChartXLabelColumn_'+sAcId).value, sAcId);
		            }
		        }        
				
			break;
			case 'Scatter':
				ShowElement(this.id,'lblChartXLabelColumn_'+sAcId,'Hide');
				ShowElement(this.id,'lblChartXAxisColumn_'+sAcId,'Show');
				ShowElement(this.id,'lblChartYDataColumn_'+sAcId,'Hide');
				ShowElement(this.id,'lblChartYAxisColumn_'+sAcId,'Show');
				ShowElement(this.id,'lblChartSizeColumn_'+sAcId,'Hide');
				ShowElement(this.id,'rdAcChartSizeAggrLabel_'+sAcId,'Hide');
				ShowElement(this.id,'rdAcChartXLabelColumn_'+sAcId,'Hide');
				ShowElement(this.id,'rdAcChartXDataColumn_'+sAcId,'Show');
				ShowElement(this.id,'rdAcChartYColumn_'+sAcId,'Show');
				ShowElement(this.id,'rdAcChartYAggrLabel_'+sAcId,'Hide');
				ShowElement(this.id,'rdAcChartYAggrList_'+sAcId,'Hide');
				ShowElement(this.id,'rowChartExtraDataColumn_'+sAcId,'Hide');
				ShowElement(this.id,'rowChartExtraAggr_'+sAcId,'Hide');
				
				if(bForecast) rdAcHideForecast(sAcId);
				document.getElementById('rdAcChartsDateGroupBy_'+sAcId).style.display = 'none';
				document.getElementById('rdAcChartsDateGroupBy_'+sAcId + '-Caption').style.display = 'none';
//                document.getElementById('rdAcChartsDateGroupBy_'+sAcId).value = '';	
				
				break;
			case 'Heatmap':
				ShowElement(this.id,'lblChartXLabelColumn_'+sAcId,'Show');
				ShowElement(this.id,'lblChartXAxisColumn_'+sAcId,'Hide');
				ShowElement(this.id,'lblChartYDataColumn_'+sAcId,'Hide');
				ShowElement(this.id,'lblChartYAxisColumn_'+sAcId,'Hide');
				ShowElement(this.id,'lblChartSizeColumn_'+sAcId,'Show');
				ShowElement(this.id,'rdAcChartSizeAggrLabel_'+sAcId,'Show');
				ShowElement(this.id,'rdAcChartXLabelColumn_'+sAcId,'Show');
				ShowElement(this.id,'rdAcChartXDataColumn_'+sAcId,'Hide');
				ShowElement(this.id,'rdAcChartYColumn_'+sAcId,'Show');
				ShowElement(this.id,'rdAcChartYAggrLabel_'+sAcId,'Hide');
				ShowElement(this.id,'rdAcChartYAggrList_'+sAcId,'Show');
				ShowElement(this.id,'rowChartExtraDataColumn_'+sAcId,'Show');
				ShowElement(this.id,'rowChartExtraAggr_'+sAcId,'Show');
				
				sElementIDs = sElementIDs + ',rdAcChartXLabelColumn_'+sAcId; //Refresh the Label column dropdown as well.
				if(bForecast) rdAcHideForecast(sAcId);
				document.getElementById('rdAcChartsDateGroupBy_'+sAcId).style.display = 'none';
				document.getElementById('rdAcChartsDateGroupBy_'+sAcId + '-Caption').style.display = 'none';
//                document.getElementById('rdAcChartsDateGroupBy_'+sAcId).value = '';	
				
				break;
			default:
				ShowElement(this.id,'lblChartXLabelColumn_'+sAcId,'Hide');
				ShowElement(this.id,'lblChartXAxisColumn_'+sAcId,'Show');
				ShowElement(this.id,'lblChartYDataColumn_'+sAcId,'Hide');
				ShowElement(this.id,'lblChartYAxisColumn_'+sAcId,'Show');
				ShowElement(this.id,'lblChartSizeColumn_'+sAcId,'Hide');
				ShowElement(this.id,'rdAcChartSizeAggrLabel_'+sAcId,'Hide');
				ShowElement(this.id,'rdAcChartXLabelColumn_'+sAcId,'Hide');
				ShowElement(this.id,'rdAcChartXDataColumn_'+sAcId,'Show');
				ShowElement(this.id,'rdAcChartYColumn_'+sAcId,'Show');
				ShowElement(this.id,'rdAcChartYAggrLabel_'+sAcId,'Hide');
				ShowElement(this.id,'rdAcChartYAggrList_'+sAcId,'Hide');
				ShowElement(this.id,'rowChartExtraDataColumn_'+sAcId,'Hide');
				ShowElement(this.id,'rowChartExtraAggr_'+sAcId,'Hide');
				rdAcModifyAggregationAvailability(document.getElementById('rdAcChartXDataColumn_'+sAcId).value, sAcId);
				if(bForecast){
				    document.getElementById('IslForecastType_' + sAcId).style.display = '';
				    document.getElementById('rdAcChartForecastLabel_' + sAcId).style.display = ''		        		
				    rdModifyForecastOptions(document.getElementById('rdAcChartXDataColumn_'+sAcId).value, sAcId);
				    rdModifyTimeSeriesCycleLengthOptions(document.getElementById('rdAcChartsDateGroupBy_'+sAcId), sAcId);
				    rdShowForecast(document.getElementById('rdAcChartXDataColumn_'+sAcId).value, sAcId);
				}
				rdAcGetGroupByDateOperatorDiv(document.getElementById('rdAcChartXDataColumn_'+sAcId).value, sAcId);
				break;
	}
	
	rdAcSetButtonStyle(sAcId,sCurrChartType,'Pie')
	rdAcSetButtonStyle(sAcId,sCurrChartType,'Bar')
	rdAcSetButtonStyle(sAcId,sCurrChartType,'Line')
	rdAcSetButtonStyle(sAcId,sCurrChartType,'Spline')
	rdAcSetButtonStyle(sAcId,sCurrChartType,'Scatter')
	rdAcSetButtonStyle(sAcId,sCurrChartType,'Heatmap')
	
	
	if (bRefreshChart) {    
	    var sAjaxUrl = "rdAjaxCommand=RefreshElement&rdAnalysisChartRefresh=True&rdRefreshElementID=" + sElementIDs + '&rdReport=' + sReport;
	    if(bForecast){
	        if(document.getElementById('IslForecastType_'+sAcId).style.display.toLowerCase() != 'none'){
	            if(document.getElementById('IslForecastType_'+sAcId).value != 'None'){
	                sAjaxUrl = sAjaxUrl + '&rdAddForecast=True';
	            }
	        }
	    }
	    if(document.getElementById('rdAcChartsDateGroupBy_'+sAcId) != null){
	        if(document.getElementById('rdAcChartsDateGroupBy_'+sAcId).style.display.toLowerCase() != 'none'){
	            if(document.getElementById('rdAcChartsDateGroupBy_'+sAcId).value != ''){
	                sAjaxUrl = sAjaxUrl + '&rdDateGroupBy=True';
	            }
	        }
	    }
	    sAjaxUrl = sAjaxUrl + '&rdAcNewCommand=True'; //#16126.
	    rdAjaxRequestWithFormVars(sAjaxUrl);
	}
}

function rdAcSetButtonStyle(sAcId,sCurrChartType,sButtonType) {
    var eleButton = document.getElementById('lblChart' + sButtonType + '_' + sAcId)
    if (eleButton) {
        if (sButtonType==sCurrChartType) {
            eleButton.className='rdAcCommandHighlight'
        }else{
            eleButton.className='rdAcCommand'
        }
                
        //Round the first and last buttons.
        var bStyleSet = false
        if (eleButton.parentNode.nextSibling.tagName=="A") {
            if (eleButton.parentNode.previousSibling.id.indexOf('actionShow')!=0) {
                //First button.
                eleButton.className = eleButton.className + " rdAcCommandLeft"
                bStyleSet = true
            }
       }
        if (eleButton.parentNode.previousSibling.tagName=="A") {
            if (eleButton.parentNode.nextSibling.id.indexOf('actionShow')!=0) {
                //Last button.
                eleButton.className = eleButton.className + " rdAcCommandRight"
                bStyleSet = true
            }
        }
        if (!bStyleSet) {  
            //Middle button
            eleButton.className = eleButton.className + " rdAcCommandMiddle"
        }
   
    }
}

function rdShowForecast(sColumn, sAcId){
    if(document.getElementById('IslForecastType_' + sAcId) == null) return;
    var sColumnDataType = rdAcGetColumnDataType(sColumn, sAcId) //#15892.
    if(sColumnDataType.toLowerCase() == "text"){
        rdAcHideForecast();
        return;
    }
    var eleForecastType = document.getElementById('IslForecastType_' + sAcId);
    if(eleForecastType.value == 'TimeSeriesDecomposition'){
        if(document.getElementById('rdAcChartsDateGroupBy_'+sAcId).value == "FirstDayOfYear"){
            document.getElementById('IslTimeSeriesCycleLength_' + sAcId).style.display = 'none';
            document.getElementById('IslTimeSeriesCycleLength_' + sAcId + '-Caption').style.display = 'none';
        }else{
            document.getElementById('IslTimeSeriesCycleLength_' + sAcId).style.display = '';
            document.getElementById('IslTimeSeriesCycleLength_' + sAcId + '-Caption').style.display = '';
        }
        document.getElementById('IslRegressionType_' + sAcId).style.display = 'none';
        document.getElementById('IslRegressionType_' + sAcId + '-Caption').style.display = 'none';      
        return;
    }
    else if(eleForecastType.value == 'Regression'){
        var eleRegression = document.getElementById('IslRegressionType_' + sAcId);
        document.getElementById('IslRegressionType_' + sAcId).style.display = '';
        document.getElementById('IslRegressionType_' + sAcId + '-Caption').style.display = '';
        document.getElementById('IslTimeSeriesCycleLength_' + sAcId).style.display = 'none';
        document.getElementById('IslTimeSeriesCycleLength_' + sAcId + '-Caption').style.display = 'none';
        return;
    }
    else{
        document.getElementById('IslTimeSeriesCycleLength_' + sAcId).style.display = 'none';
        document.getElementById('IslTimeSeriesCycleLength_' + sAcId + '-Caption').style.display = 'none';
        document.getElementById('IslRegressionType_' + sAcId).style.display = 'none';
        document.getElementById('IslRegressionType_' + sAcId + '-Caption').style.display = 'none';
    }
   
}

function rdAcModifyAggregationAvailability(sColumn, sAcId){
     // Function shows/Hides the Aggregation dropdown based on the X-axis column picked.
    if(document.getElementById('rdAcChartType_' + sAcId).value != "Line" && document.getElementById('rdAcChartType_' + sAcId).value != "Spline") return;   //#16559.
    if(sColumn == ''){
        document.getElementById('rowChartYAggr_' + sAcId).style.display = 'none';   
        return;
    } 
    var sDataColumnType = rdAcGetColumnDataType(sColumn, sAcId);
    if(sDataColumnType.toLowerCase() == "number"){
        ShowElement(this.id,'rdAcChartYAggrLabel_'+sAcId,'Hide');
		ShowElement(this.id,'rdAcChartYAggrList_'+sAcId,'Hide');                       
    }else{                              
        ShowElement(this.id,'rdAcChartYAggrLabel_'+sAcId,'Show');
		ShowElement(this.id,'rdAcChartYAggrList_'+sAcId,'Show');              
    }
}

function rdModifyForecastOptions(sColumn, sAcId){
    if(document.getElementById('IslForecastType_' + sAcId) == null) return;
    if(sColumn =='') return;
    var eleAcDataColumnDetails = document.getElementById('rdAcDataColumnDetails_' + sAcId);
    var eleDataForecastDropdown = document.getElementById('IslForecastType_' + sAcId);
    var sForecastValue = eleDataForecastDropdown.value;
    var eleDateGroupByDropdown = document.getElementById('rdAcChartsDateGroupBy_' + sAcId);
    var aForecastValues = ['None', 'TimeSeriesDecomposition', 'Regression']; 
    var aForecastOptions = ['', 'Time Series', 'Regression']; 
    var sDataColumnType = rdAcGetColumnDataType(sColumn, sAcId);
    if(sDataColumnType.toLowerCase() == "text"){
        rdAcHideForecast(sAcId);
        return;
    }
    if(sDataColumnType.toLowerCase() != "date" && sDataColumnType.toLowerCase() != "datetime"){
        if(eleDataForecastDropdown.options[1].value == 'TimeSeriesDecomposition'){
            eleDataForecastDropdown.remove(1);
            document.getElementById('IslTimeSeriesCycleLength_' + sAcId).style.display = 'none';
        }
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
            return;
        }
    }
}

function rdAcGetColumnDataType(sColumn, sAcId){
    var eleAcDataColumnDetails = document.getElementById('rdAcDataColumnDetails_' + sAcId);
    if(eleAcDataColumnDetails.value != ''){
        var sDataColumnDetails = eleAcDataColumnDetails.value;
        var aDataColumnDetails = sDataColumnDetails.split(',')
        if(aDataColumnDetails.length > 0){
            var i;
            for(i=0;i<aDataColumnDetails.length;i++){
                var sDataColumnDetail = aDataColumnDetails[i];
                if(sDataColumnDetail.length > 1 && sDataColumnDetail.indexOf(':') > -1){
                    var sDataColumn = sDataColumnDetail.split(':')[0];
                    if(sDataColumn == sColumn){
                        return sDataColumnDetail.split(':')[1];
                    }
                }
            }
        }
    }
}

function rdModifyTimeSeriesCycleLengthOptions(sColumnGroupByDropdown, sAcId){
    if(document.getElementById('IslForecastType_' + sAcId) == null) return;
    var eleTimeSeriesCycleLengthDropdown = document.getElementById('IslTimeSeriesCycleLength_' + sAcId);
    var sTimeSeriesCycleLength = eleTimeSeriesCycleLengthDropdown.value;
    var sColumnGroupByValue = sColumnGroupByDropdown.value
    var i; var j = 0; var aColumnGroupByOptions = ['Year', 'Quarter', 'Month', 'Week', 'Day', 'Hour']; 
    rdResetTimeSeriesCycleLenthDropdown(sAcId);
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
            document.getElementById('IslTimeSeriesCycleLength_' + sAcId).style.display = 'none';
            document.getElementById('IslTimeSeriesCycleLength_' + sAcId + '-Caption').style.display = 'none';
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
            if(document.getElementById('IslForecastType_' + sAcId).value == 'TimeSeriesDecomposition'){
                document.getElementById('IslTimeSeriesCycleLength_' + sAcId).style.display = '';
                document.getElementById('IslTimeSeriesCycleLength_' + sAcId + '-Caption').style.display = '';
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
            if(document.getElementById('IslForecastType_' + sAcId).value == 'TimeSeriesDecomposition'){
                document.getElementById('IslTimeSeriesCycleLength_' + sAcId).style.display = '';
                document.getElementById('IslTimeSeriesCycleLength_' + sAcId + '-Caption').style.display = '';
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
            if(document.getElementById('IslForecastType_' + sAcId).value == 'TimeSeriesDecomposition'){
                document.getElementById('IslTimeSeriesCycleLength_' + sAcId).style.display = '';
                document.getElementById('IslTimeSeriesCycleLength_' + sAcId + '-Caption').style.display = '';
            }
            break;
    }
    if(eleTimeSeriesCycleLengthDropdown.value == ''){
        eleTimeSeriesCycleLengthDropdown.value = eleTimeSeriesCycleLengthDropdown.options[eleTimeSeriesCycleLengthDropdown.options.length -1].value;
        if(eleTimeSeriesCycleLengthDropdown.options[eleTimeSeriesCycleLengthDropdown.options.length -1].value == "Day"){
            eleTimeSeriesCycleLengthDropdown.value = '';
        }        
    }
}

function rdResetTimeSeriesCycleLenthDropdown(sAcId){
    if(document.getElementById('IslForecastType_' + sAcId) == null) return;
    var eleTimeSeriesCycleLengthDropdown = document.getElementById('IslTimeSeriesCycleLength_' + sAcId);
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
}

function rdAcGetGroupByDateOperatorDiv(sDataColumn,sAcId){
    if(typeof(sDataColumn) == 'undefined'){
        document.getElementById('rdAcChartsDateGroupBy_'+sAcId).style.display = 'none';
	    document.getElementById('rdAcChartsDateGroupBy_'+sAcId + '-Caption').style.display = 'none';
    }
    var eleDateColumnsForGrouping = document.getElementById('rdAcPickDateColumnsForGrouping_' + sAcId);
    if(eleDateColumnsForGrouping != null){
        if(eleDateColumnsForGrouping.value.length > 0){
            if(eleDateColumnsForGrouping.value.indexOf(sDataColumn) > -1){
                document.getElementById('rdAcChartsDateGroupBy_'+sAcId).style.display = '';
                document.getElementById('rdAcChartsDateGroupBy_'+sAcId + '-Caption').style.display = '';
            }
            else {
                document.getElementById('rdAcChartsDateGroupBy_'+sAcId).style.display = 'none';
                document.getElementById('rdAcChartsDateGroupBy_'+sAcId + '-Caption').style.display = 'none';
            }
        }
        else {
            document.getElementById('rdAcChartsDateGroupBy_' + sAcId).style.display = 'none';
            document.getElementById('rdAcChartsDateGroupBy_' + sAcId + '-Caption').style.display = 'none';
        }
    }
    else {
        document.getElementById('rdAcChartsDateGroupBy_'+sAcId).style.display = 'none';
	    document.getElementById('rdAcChartsDateGroupBy_'+sAcId + '-Caption').style.display = 'none';
    }
}

function rdAcHideForecast(sAcId){
    if(document.getElementById('IslForecastType_' + sAcId) == null) return;
    document.getElementById('IslForecastType_' + sAcId).style.display = 'none';
    document.getElementById('rdAcChartForecastLabel_' + sAcId).style.display = 'none'
    document.getElementById('IslTimeSeriesCycleLength_' + sAcId).style.display = 'none';
    document.getElementById('IslTimeSeriesCycleLength_' + sAcId + '-Caption').style.display = 'none';
    document.getElementById('IslRegressionType_' + sAcId).style.display = 'none';
    document.getElementById('IslRegressionType_' + sAcId + '-Caption').style.display = 'none';
}
