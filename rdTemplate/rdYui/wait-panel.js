// JSLint options:
/*global LogiXML, YUI, document, window*/
//18934

YUI.add('waitpanel', function (Y) {
	
	var DEFAULTWAITMESSAGE = 'Please wait...';
	
	Y.namespace('LogiXML').WaitPanel = Y.Base.create('WaitPanel', Y.Base, [], {
	
		/*
         * Initialization Code: Sets up privately used state
         * properties, and publishes the events Tooltip introduces
         */
        initializer : function(config) {
			this._intervalKey = 0;
			
			this.initPageWaitFrames(); 
			
			//Ajax reinit handler
			LogiXML.Ajax.AjaxTarget().on('reinitialize', this.initPageWaitFrames, this);
			
			//Tabchange handler
			if (Y.Lang.isValue(Y.LogiXML.Tabs))
				Y.LogiXML.Tabs.prototype.TabsTarget().on('selectedTabChanged', this.initPageWaitFrames, this);
			
			//Initialize waitall image for chrome
			document.body.insertBefore(Y.Node.create('<div style="display: none; background-image: url(\'rdTemplate/rdWaitAll.gif\')" />').getDOMNode(), document.body.children[0]);
		},
		
		createWaitContent : function(waitMessage, waitClass, waitCaptionClass, animGif, waitKey) {
			var imgPath = 'rdTemplate/';
			if (animGif)
				imgPath += 'rdWait.gif';
			else
			    imgPath += 'rdWaitAll.gif';
			
		    //18934
			if (waitMessage.indexOf("\\x") != -1 || waitMessage.indexOf("%20") != -1) {   //19096 We only want to decode if it has been encoded
			    waitMessage = waitMessage.replace(/\\x/g, "%"); //Had to convert \x to % for YUI's decode function
			    waitMessage = Y.HistoryHash.decode(waitMessage);
			}
			
			var sWaitKey = '';
			var sSetStyle = '';
			if (Y.Lang.isValue(waitKey)) {
				sWaitKey = '_' + waitKey;
			}
			
			sSetStyle = 'style="';
			
			//Set default style if there is no class
			if (waitClass == "")
				sSetStyle += 'background-color: #fff; border: 1px solid #000;';			
			sSetStyle += 'display: table;"'; //This prevents the div from stretching
				
			return Y.Node.create(
						'<div id="rdWait' + sWaitKey + '" ' + sSetStyle + ' class="' + waitClass 
						+ '" ><table><tr><td><div id="rdWaitImage" style="width: 32px; height: 32px; background-image: url(' + imgPath + '); background-position: 0px 0px;" ></div></td><td><span class="' 
						+ waitCaptionClass + '" >' + waitMessage 
						+ '</td></table></span></div>');
		},
	
		showWaitPanel : function(waitCfg) {
	
			if (this.isWaitCanceled()) {				
				return;			
			}
			else if (Y.Cookie.exists('rdFileDownloadComplete')) {
				Y.Cookie.remove('rdFileDownloadComplete', {path: '/'});
				return;
			}
			
			var waitMessage, waitClass, waitCaptionClass;
			if (waitCfg[0] != '')
				waitMessage = waitCfg[0];
			else
				waitMessage = DEFAULTWAITMESSAGE;
			if (waitCfg[1] != '')
				waitClass = waitCfg[1];
			else
				waitClass = '';
			if (waitCfg[2] != '')
				waitCaptionClass = waitCfg[2];
			else
				waitCaptionClass = '';
					
			if (!Y.Lang.isValue(document.getElementById('rdWait')))
				document.body.insertBefore(this.createWaitContent(waitMessage, waitClass, waitCaptionClass).getDOMNode(), document.body.children[0]);
						
			if (!Y.Lang.isValue(this._pnlWait)) {
				this._pnlWait = new Y.Panel({
					srcNode			: '#rdWait',								
					zIndex			: 9300,
					centered		: true,
					modal			: true,
					render			: true,
					buttons			: null				
				});			
			}							
			
			//Show the panel
			this._pnlWait.show();
						
			//Fade it in
			var node = Y.one('.yui3-widget-mask');						
			node.transition({
				duration: .25,
				opacity: {
					'value' : .5,
					'easing': 'ease-in'				
				}
			});
							
			/*
			 * Act like an animated gif by constantly changing left offset on horizontal image.
			 * Image is comprised of side-by-side frames you would see in an gif.
			 * Div container acts like a viewport with height and width set to dimensions of a single frame.
			 * Time delay on window.setInterval controls how fast the image updates and thus animates.
			 */			 			
			LogiXML.WaitPanel._loadingCounter = 0;
			var animateImage = function() {
				// 7 is the number of frames in the image
				// 32 is the width of a single frame
				var mod = LogiXML.WaitPanel._loadingCounter % 7,
				loadingImage = document.getElementById('rdWaitImage'),
				offset = -32 * mod;
				LogiXML.WaitPanel._loadingCounter++;
				
				loadingImage.style.backgroundPosition = offset + 'px 0px'
				
				//Check for response cookie
				if (Y.Cookie.exists('rdFileDownloadComplete')) {
					Y.Cookie.remove('rdFileDownloadComplete', {path: '/'});
					LogiXML.WaitPanel.pageWaitPanel.hideWaitPanel();
				}					
			};

			this._intervalKey = window.setInterval(animateImage, 100);
		},
		
		hideWaitPanel : function() {			
			if (Y.Lang.isValue(this._pnlWait)) {			
			    this._pnlWait.hide();
			    var waitPanel = document.getElementById('rdWait');
			    if (waitPanel) {
			        waitPanel.parentElement.removeChild(waitPanel);
                    this._pnlWait.destroy(); // 22310
			        this._pnlWait = null;
			    }
				window.clearInterval(this._intervalKey);
			}					
		},
		
		readyWait : function() {			
			this.get('cancelStack').push(false);			
		},
		
		cancelWait : function() {
			var stk = this.get('cancelStack');
			stk[stk.length - 1] = true;			
		},
		
		isWaitCanceled : function() {			
			return this.get('cancelStack').pop();			
		},

		showFrameWait : function(nodeFrame) {
			//Handle waiting			
			var waitKey = nodeFrame.getData('waitkey');
			if ( nodeFrame.getAttribute('src') == '' && Y.Lang.isValue(waitKey)) {	
				var waitMessage, waitClass, waitCaptionClass;
				if (nodeFrame.getData('waitmessage') != '')
					waitMessage = nodeFrame.getData('waitmessage');
				else
					waitMessage = DEFAULTWAITMESSAGE;
				if (Y.Lang.isValue(nodeFrame.getData('waitclass')))
					waitClass = nodeFrame.getData('waitclass');
				else
					waitClass = '';
				if (Y.Lang.isValue(nodeFrame.getData('waitcaptionclass')))
					waitCaptionClass = nodeFrame.getData('waitcaptionclass');
				else
					waitCaptionClass = '';
				
				waitKey = nodeFrame.get('id')+ '_' + waitKey;
				if (!Y.Lang.isValue(document.getElementById('rdWait_' + waitKey)))
					nodeFrame.insertBefore(this.createWaitContent(waitMessage, waitClass, waitCaptionClass, true, waitKey), nodeFrame);
											
				nodeFrame.setStyle('display', 'none');
				
				//Set frame onload event
				nodeFrame.on('load', this.hideFrameWait);
				
				//Start loading the iframe				
				nodeFrame.set('src', nodeFrame.getData('hiddensource'));
			}
		},
		
		hideFrameWait : function(e) {		
			var nodeFrame = e.target;
			var frameSibling = nodeFrame.previous();
			
			if (Y.Lang.isValue(frameSibling) && frameSibling.get('id').indexOf('rdWait') == 0) {
				nodeFrame.previous().remove(); 
				nodeFrame.setStyle('display', '');				
			}
		},
		
		initPageWaitFrames : function() {
		    Y.each(Y.all('iframe'), function (nodeFrame) {
		        if (LogiXML.isNodeVisible(nodeFrame) && Y.Lang.isValue(nodeFrame.getData('waitkey')))
		            this.showFrameWait(nodeFrame);
                var sib = nodeFrame.previous();
                //node before iframe (waitdiv or not)
                if (sib != null && sib._node != null && (sib._node.nodeName == 'DIV' || sib._node.nodeName == 'div') && sib._node.id.indexOf('rdWait_' > -1)) { //this is waitdiv
		            sib = sib.previous();
		            if (sib != null && sib._node != null && (sib._node.nodeName == 'DIV' || sib._node.nodeName == 'div') && sib._node.id.indexOf('rdWait_' > -1)) {//this is another one waitdiv, deleting
		                sib._node.parentNode.removeChild(sib._node);
		            }
		        }
			},this);
		}
		
	}, {
		// Y.WaitPanel properties
		
		/**
		 * The identity of the widget.
		 *
		 * @property WaitPanel.NAME
		 * @type String
		 * @default 'WaitPanel'
		 * @readOnly
		 * @protected
		 * @static
		 */
		NAME : 'waitpanel',
		
		/**
		 * Static property used to define the default attribute configuration of
		 * the Widget.
		 *
		 * @property SliderBase.ATTRS
		 * @type {Object}
		 * @protected
		 * @static
		 */
		ATTRS : {
			/**
			* Cancels the show panel action
			*/
			cancelStack : {
				value : new Array()
			}		
		}
	});	

}, '1.0.0', {requires: ['base','panel','transition','cookie','history']});
