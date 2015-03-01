if (window.LogiXML === undefined) {
    window.LogiXML = {};
}
LogiXML.rdAnalysisCrosstab = {

    updateControls: function (bRefresh, sReport, sAxId, bInit   /*, associatedControlId, valueControlID, groupDropdownId*/) {

        var eleBatchSelection = document.getElementById('lblBatchSelection_' + sAxId)
        if (!eleBatchSelection && !bInit) {  //When not batch selection, update the visualization with every control change.
            bRefresh = true
        }

        var sElementIDs = sAxId + ",divAxControls_" + sAxId + ",cellAxCrosstab_" + sAxId
        sElementIDs += ',lblHeadingAnalCrosstab_' + sAxId;  //This is the AG's panel heading, when running AG.
        var selectHeaderColumn = Y.one('#rdAxHeaderColumn_' + sAxId),
            selectLabelColumn = Y.one('#rdAxLabelColumn_' + sAxId),
            selectValueColumn = Y.one('#rdAxAggrColumn_' + sAxId),
            divHeaderGrouping = Y.one('#divAxHeaderGroupByDateOperator_' + sAxId),
            selectHeaderGrouping = Y.one('#rdAxHeaderDateGroupBy_' + sAxId),
            divLabelGrouping = Y.one('#divAxLabelGroupByDateOperator_' + sAxId),
            selectLabelGrouping = Y.one('#rdAxLabelDateGroupBy_' + sAxId),
            selectAggregate = Y.one('#rdAxAggrFunction_' + sAxId),
            sHeaderColumn = selectHeaderColumn.get('value'),
            sLabelColumn = selectLabelColumn.get('value'),
            sValueColumn = selectValueColumn.get('value'),
            isValid = true;

        LogiXML.rdAnalysisCrosstab.setVisibilityForGroupByDateDiv(sHeaderColumn, sAxId, divHeaderGrouping, selectHeaderGrouping);
        LogiXML.rdAnalysisCrosstab.setVisibilityForGroupByDateDiv(sLabelColumn, sAxId, divLabelGrouping, selectLabelGrouping);
        LogiXML.rdAnalysisCrosstab.setVisibilityForAggregateOptions(sAxId, sValueColumn, selectAggregate);
        LogiXML.rdAnalysisCrosstab.setVisibilityToReverseColors(sAxId);

        isValid = LogiXML.rdAnalysisCrosstab.validateForUniqueColumns(sAxId, sHeaderColumn, sLabelColumn, sValueColumn);

        var eleBatchSelection = document.getElementById('lblBatchSelection_' + sAxId)
        if (bRefresh && isValid) {  //When not batch selection, update the visualization with every control change.
            var sAjaxUrl = 'rdAjaxCommand=RefreshElement&rdAnalCrosstabRefresh=True&rdRefreshElementID=' + sElementIDs + '&rdReport=' + sReport + '&rdAxId=' + sAxId;
            sAjaxUrl = sAjaxUrl + '&rdAxNewCommand=True';
            rdAjaxRequestWithFormVars(sAjaxUrl,'false','',true,null,null,['','','']);
        }
    },

    setVisibilityForGroupByDateDiv: function (sDataColumn, sAxId, divContainer, selectControl) {
        var eleDateColumnsForGrouping = Y.one('#rdAxPickDateColumnsForGrouping_' + sAxId);
        if (eleDateColumnsForGrouping && (sDataColumn && sDataColumn != '')) {
            var columnsForGrouping = eleDateColumnsForGrouping.get('value');
            if (columnsForGrouping.length > 0) {
                if (columnsForGrouping.indexOf(sDataColumn) > -1) {
                    divContainer.show();
                    return;
                }
            }
        }
        divContainer.hide();
    },

    validateForUniqueColumns: function (sAxId, sHeaderColumn, sLabelColumn, sValueColumn) {
        var errorDiv = Y.one('#divAxError-DuplicateColumn_' + sAxId),
            columns = [sHeaderColumn, sLabelColumn, sValueColumn],
            selectedValues = [],
            isValid = true;

        for (var i = 0; i < columns.length; i++) {
            if (selectedValues.indexOf(columns[i]) == -1) {
                selectedValues.push(columns[i]);
            } else {
                isValid = false;
            }
        }

        if (isValid) {
            errorDiv.hide();
        } else {
            errorDiv.show();
        }
        return isValid;
    },

    setVisibilityForAggregateOptions: function (sAxId, sDataColumn, selectControl) {
        var dataColumnDetailsArray = Y.one("#rdAxDataColumnDetails_" + sAxId).get('value').split(","),
            dataColumnDetailsDictionary = {},
            selectedValue = selectControl.get('value'),
            allOptions = selectControl.getAttribute('data-all-options');

        //save all options if empty
        if (!allOptions || allOptions == '') {
            allOptions = '';
            selectControl.get('children').each(function (node) {
                allOptions += node.get('outerHTML');
            });
            selectControl.setAttribute('data-all-options', allOptions);
        }

        //restore dictionary
        for (var i = 1; i < dataColumnDetailsArray.length; i++) {
            var splitedKeyValuePair = dataColumnDetailsArray[i].split(":");
            dataColumnDetailsDictionary[splitedKeyValuePair[0]] = splitedKeyValuePair[1];
        }

        if (dataColumnDetailsDictionary[sDataColumn] != "Number") {
            selectControl.get('children').each(function (node) {
                if (node.get('value').indexOf('COUNT') == -1) {
                    node.remove();
                }
            });

            if (selectedValue.indexOf('COUNT') == -1) {
                selectControl.set('value', 'COUNT');
            }
        } else if (selectControl.get('children').size() < 3){
            selectControl.get('childNodes').remove();
            selectControl.set('innerHTML', allOptions);
            selectControl.set('value', selectedValue);
        }
    },
    setVisibilityToReverseColors: function (sAxId) {
        var checked = document.getElementById('rdAxComparisionCheckbox_' + sAxId).checked;
        var row = document.getElementById('rowAxComparisonColors_' + sAxId);
        if (!row) {
            return;
        }
        if (!checked) {
            row.style.display = 'none';
        } else {
            row.style.display = 'table-row';
        }
    }
};