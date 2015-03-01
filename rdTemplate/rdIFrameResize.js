function iframeResize(o, sOptionalParam) {

    if (o.src != "") {
        // Normally contentDocument is all you need, but IE7 doesn't have that property 
        if (o.contentWindow === null) //21313
            return;

        var iframeNode = Y.one(o),
            documentNode = Y.one(o.contentWindow.document),
			bodyNode = documentNode.one('body'),
			htmlNode = documentNode.one('html'),
			width, height, fixedWidth, fixedHeight;

        //iframe MUST have display set for the size settings to take effect
        iframeNode.setStyle('display', '');

        iframeNode.setStyle('overflow', 'hidden');
        // An onload will fire with the initial page load even though the iframes are essentially empty.
        if (bodyNode.get('scrollWidth') == 0 && bodyNode.get('scrollHeight') == 0) {
            return;
        }

        htmlNode.setStyles({
            'margin': 0,
            'width': '100%',
            'height': '100%'
        });
        bodyNode.setStyles({
            'margin': 0,
            'width': '100%',
            'height': '100%'
        });

        //19377 - Save current position on page
        var currentHeight = document.documentElement.scrollTop > document.body.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop;
        var currentWidth = document.documentElement.scrollLeft > document.body.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft;

        fixedWidth = iframeNode.getAttribute('rdIFrameFixedWidth');
        fixedHeight = iframeNode.getAttribute('rdIFrameFixedHeight');
        // Convert from string boolean to real boolean
        fixedWidth = Y.Lang.isString(fixedWidth) ? (fixedWidth.toLowerCase() === 'true' ? true : false) : false;
        fixedHeight = Y.Lang.isString(fixedHeight) ? (fixedHeight.toLowerCase() === 'true' ? true : false) : false;

        // User defined Width, px or % based
        if (fixedWidth) {
            o.style.width = o.width;


            switch (iframeNode.getAttribute("Scrolling")) {
                case 'yes':
                    iframeNode.setStyles({ 'overflowX': 'visible' });
                    break;
                case 'no':
                    iframeNode.setStyles({ 'overflowX': 'hidden' });
                    break;
                default:
                    iframeNode.setStyles({ 'overflowX': 'auto' });
                    break;
            }
        }
        else {
            width = htmlNode.get('scrollWidth');
            o.style.width = width + 'px';
            o.width = width + 'px';
        }

        // User defined Height, px or % based
        if (fixedHeight) {

            o.style.height = o.height;

            // If user didn't set a fixedWidth we need to enable scroll bars, works great except for IE7
            if (!fixedWidth && htmlNode.get('scrollHeight') > htmlNode.get('offsetHeight')) {
                iframeNode.setStyles({
                    'overflowY': 'scroll',
                    'overflowX': 'hidden'
                });
                var scrollbarWidth = htmlNode.get('scrollWidth') - htmlNode.get('clientWidth') + iframeNode.get('scrollWidth');
                o.style.width = scrollbarWidth + 'px';
                o.width = scrollbarWidth + 'px';
            }
        }
        else {
            //reset the iframe so that it can determine the appropriate height if the content has shrunk
            o.style.height = '1px';
            o.height = '1px';

            //now get the iframe height based on the scrollable area
            height = htmlNode.get('scrollHeight');

            if (bodyNode.get('scrollHeight') > htmlNode.get('scrollHeight') && height == 1)
                height = bodyNode.get('scrollHeight');

            o.style.height = height + 'px';
            o.height = height + 'px';
        }

        //Return to position on page
        window.scrollTo(currentWidth, currentHeight); //19377
    }
    rdCheckForAPopupPanelParent(o)  //#12818.

    // Does this frame have a parent that needs to be resized?
    if (Y.Lang.isValue(frameElement) && Y.Lang.isFunction(window.parent.iframeResize)) {
        window.parent.iframeResize(frameElement);
    }

    var freeForm = Y.namespace('LogiXML.Dashboard.FreeForm');
    if (freeForm && Y.Lang.isFunction(freeForm.rdResizeDashboardContainer)) {
        freeForm.rdResizeDashboardContainer();
    }
}

function rdCheckForAPopupPanelParent(eleHTMLIFrameElement) {
    try {
        if (!eleHTMLIFrameElement) return;
        var eleParentObj = eleHTMLIFrameElement.parentNode;
        while (eleParentObj) {
            if (Y.Lang.isValue(eleParentObj.attributes) && eleParentObj.attributes["rdPopupPanel"]) {
                rdPositionPopupPanel(eleParentObj)
                return;
            } else {
                eleParentObj = eleParentObj.parentNode;
            }
        }
    }
    catch (e) { }
}
