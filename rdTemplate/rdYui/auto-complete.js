YUI.add('rdAutoComplete', function (Y) {
    "use strict";

    var Lang = Y.Lang,
        TRIGGER = 'rdAutoCompleteElement';

    if (LogiXML.Ajax.AjaxTarget) {
        LogiXML.Ajax.AjaxTarget().on('reinitialize', function () { Y.LogiXML.rdAutoComplete.createElements(true); });
    }

    Y.LogiXML.Node.destroyClassKeys.push(TRIGGER);

    Y.namespace('LogiXML').rdAutoComplete = Y.Base.create('rdAutoComplete', Y.Base, [], {
        _handlers: {},

        configNode: null,
        id: null,
		values: [],
		
        initializer: function (config) {
            var self = this;
            this._parseHTMLConfig();
            this.configNode.setData(TRIGGER, this);
			var inputNode = this.configNode
			
			this._handlers.AutCompletePlugin = this.configNode.plug(Y.Plugin.AutoComplete, {
				allowTrailingDelimiter: true,
				minQueryLength: 0,
				queryDelay: 0,
				queryDelimiter: ',',
				// queryDelimiter: '||',
				resultHighlighter: 'startsWith',
				source: this.values,
				
				resultFilters: ['startsWith', function (query, results) {
					// var selected = this._inputNode.get('value').split(/\s*,\s*/);
					var selected = inputNode.get('value').split(/\s*,\s*/);
										
					selected = Y.Array.hash(selected);
					
					return Y.Array.filter(results, function (result) {
						return !selected.hasOwnProperty(result.text);
					  });
					}]
				});
				
			/* inputNode.on('focus', function () {
				inputNode.ac.sendRequest('');			
			}); */
            
        },
				
        _parseHTMLConfig: function () {
            this.configNode = this.get('configNode');
            this.id = this.configNode.getAttribute('id');
            // this.values = this.configNode.getAttribute('data-values').split(',');
			this.values = this.configNode.getAttribute('data-values').split('||');
        },
        

        destructor: function () {
            var configNode = this.configNode;
            this._clearHandlers();
            configNode.setData(TRIGGER, null);
        },

        _clearHandlers: function () {
            var self = this;
            Y.each(this._handlers, function (item) {
                if (item) {
                    if (item.detach) {
                        item.detach();
                    }
                    if (item.destroy) {
                        item.destroy();
                    }
                    item = null;
                }
            });
        }


    }, {
        // Static Methods and properties
        NAME: 'rdAutoComplete',
        ATTRS: {
            configNode: {
                value: null,
                setter: Y.one
            }
        },

        createElements: function () {

            var element;

            Y.all('.' + TRIGGER).each(function (node) {
                element = node.getData(TRIGGER);
                if (!element) {
                    element = new Y.LogiXML.rdAutoComplete({
                        configNode: node
                    });
                }
            });
        }


    });

}, '1.0.0', { requires: ['base', 'node', 'event', 'node-custom-destroy', 'autocomplete', 'autocomplete-highlighters', 'autocomplete-filters'] });
