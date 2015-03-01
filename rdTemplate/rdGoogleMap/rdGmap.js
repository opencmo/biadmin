var gMaps = []
var ie7Processed = false
function rdGmapLoad(sMapID) {
        var spanMap = document.getElementById(sMapID)
        //Map types
        var sMapTypes = spanMap.getAttribute("GoogleMapTypes")
        var aMapTypes = new Array()
        if (sMapTypes) {
            var asMapTypes = spanMap.getAttribute("GoogleMapTypes").split(",")
            for (var i=0; i < asMapTypes.length; i++) {
                switch (asMapTypes[i]) {
                    case 'Map':
                       aMapTypes.push(google.maps.MapTypeId.ROADMAP)
                        break;
                    case 'Satellite':
                        aMapTypes.push(google.maps.MapTypeId.SATELLITE)
                        break;
                    case 'Hybrid':
                        aMapTypes.push(google.maps.MapTypeId.HYBRID)
                        break;
                    case 'Terrain':
                        aMapTypes.push(google.maps.MapTypeId.TERRAIN)
                        break;
                }
            }
        }
        
        var initMapTypeId = null
        if (aMapTypes.length != 0){
            initMapTypeId = aMapTypes[0];
        }
        else {
            initMapTypeId = google.maps.MapTypeId.ROADMAP
            aMapTypes = [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.HYBRID, google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.TERRAIN]
        }
        
          //Zoom control
        var sZoomControlStyle = spanMap.getAttribute("GoogleMapZoomControl").toLowerCase()
        var zoomControlStyle = null
        switch (sZoomControlStyle){
            case 'large':
                zoomControlStyle = google.maps.ZoomControlStyle.LARGE
                break;
            case 'small':
                zoomControlStyle = google.maps.ZoomControlStyle.SMALL
                break;
            default:
                zoomControlStyle = google.maps.ZoomControlStyle.DEFAULT
                break;
        }
       
        var sInitialLatitude = spanMap.getAttribute("InitialLatitude") == null ? "" : spanMap.getAttribute("InitialLatitude").replace(/ /g,'')
        var sInitialLongitude = spanMap.getAttribute("InitialLongitude") == null ? "" : spanMap.getAttribute("InitialLongitude").replace(/ /g,'')
        
        var centerLatLng = new google.maps.LatLng(0, 0)
        if (sInitialLatitude.length > 0 && sInitialLongitude.length > 0){
            try{
                centerLatLng = new google.maps.LatLng(sInitialLatitude, sInitialLongitude)
            }
            catch(e){
            }        
        }
               
        var sInitialZoom = spanMap.getAttribute("InitialZoomLevel") == null ? "" : spanMap.getAttribute("InitialZoomLevel").replace(/ /g,'')
        var nInitialZoom = !isNaN(sInitialZoom) && sInitialZoom.length > 0  ? parseInt(sInitialZoom) : null
                
        //Show/hide controls
        
        var sMapScale = spanMap.getAttribute("MapScale").toLowerCase()
        var bShowScale = sMapScale == "true" ? true : false
        
        var sGoogleMapStreetView = spanMap.getAttribute("GoogleMapStreetView").toLowerCase()
        var bShowStreetView = sGoogleMapStreetView == "false" ? false : true
        
        var sGoogleMapPan = spanMap.getAttribute("GoogleMapPanControl").toLowerCase()
        var bShowPan = sGoogleMapPan == "false" ? false : true
        
        var bShowZoom = sZoomControlStyle == "false" ? false : true

        var sGoogleMapTypeControl = spanMap.getAttribute("GoogleMapTypeControl").toLowerCase()
        var bShowMapTypeControl = sGoogleMapTypeControl =="false" ? false : true
        var mapTypeControlStyle = null
        switch (sGoogleMapTypeControl){
            case 'buttons':
                mapTypeControlStyle = google.maps.MapTypeControlStyle.HORIZONTAL_BAR
                break;
            case 'dropdown':
                mapTypeControlStyle = google.maps.MapTypeControlStyle.DROPDOWN_MENU
                break;
            default:
                mapTypeControlStyle = google.maps.MapTypeControlStyle.DEFAUL
                break;
        }
             
        //support of the old "GoogleMapControl" attribute
        var sGoogleMapControl = spanMap.getAttribute("GoogleMapControl").toLowerCase()
        if (sGoogleMapControl.indexOf("small") != -1){
            zoomControlStyle = google.maps.ZoomControlStyle.SMALL
        }
        else if (sGoogleMapControl == "none" && sGoogleMapStreetView == "" && sGoogleMapPan == "" && sZoomControlStyle == "" && sGoogleMapTypeControl == ""){
            bShowStreetView = false
            bShowPan = false
            bShowZoom = false
            bShowMapTypeControl = false
        }

        var mapOptions = {
          zoom: nInitialZoom == null ? 8 : nInitialZoom,
          center: centerLatLng,
          mapTypeId: initMapTypeId,
          mapTypeControlOptions: {mapTypeIds:aMapTypes, style:mapTypeControlStyle},
          zoomControlOptions: {style:zoomControlStyle},
          scaleControl: bShowScale,
          panControl: bShowPan,
          zoomControl: bShowZoom,
          mapTypeControl: bShowMapTypeControl,
          streetViewControl: bShowStreetView
        };

        var map = new google.maps.Map(document.getElementById(sMapID), mapOptions)
        
		if (spanMap.getAttribute("GoogleMapShowTraffic").toLowerCase() == "true"){
			var trafficLayer = new google.maps.TrafficLayer();
			trafficLayer.setMap(map);
		}
		
        var bounds = new google.maps.LatLngBounds();
        var infowindow = new google.maps.InfoWindow({content: ""});
        var bUseClustering = spanMap.getAttribute("UseClustering") == null ? false : true
        var aMapMarkerRows = document.getElementsByTagName(sMapID + "_rdMapMarker");
        var markers = [];
        for (var i=0; i < aMapMarkerRows.length; i++) {
	        var eleMapMarkerRow = aMapMarkerRows[i]
	        //Validate the marker.
	        var lat
	        var lng
	        if (eleMapMarkerRow.getAttribute("rdCoordinates").length!=0){
	            //For KML files.
	            lat = parseFloat(eleMapMarkerRow.getAttribute("rdCoordinates").split(",")[1])
	            lng = parseFloat(eleMapMarkerRow.getAttribute("rdCoordinates").split(",")[0])
	        } else {
	            lat = parseFloat(eleMapMarkerRow.getAttribute("Latitude"))
	            lng = parseFloat(eleMapMarkerRow.getAttribute("Longitude"))
	        }
	        if (isNaN(lat) || isNaN(lng)){continue}
	        if (lat==0 && lng==0) {continue}
	        
	        var options = new Object()  //GMarkerOptions object
	        var point = new google.maps.LatLng(lat, lng)
            options.position = point
            
           //Marker image.
            var sMarkerId = eleMapMarkerRow.getAttribute("rdMarkerID")
            var eleMarkerImage = document.getElementById("rdMapMarkerImage_" + sMapID + "_" + sMarkerId) //"+"_Row" + (i + 1))
            if (eleMarkerImage) {
                var widthImage = parseInt(eleMarkerImage.getAttribute("width"))
                var heightImage = parseInt(eleMarkerImage.getAttribute("height"))
                if (widthImage == 0) { //IE
                    if (eleMarkerImage.currentStyle) {
                        widthImage = parseInt(eleMarkerImage.currentStyle.width)
                        heightImage = parseInt(eleMarkerImage.currentStyle.height)
                    }
                    else {//19546. If not IE/Opera, then do this
                        widthImage = 1;
                        heightImage = 1;
                    }
                }
                var icon = new google.maps.MarkerImage()
                icon.url = eleMarkerImage.getAttribute("src")
                icon.size = new google.maps.Size(widthImage, heightImage)
                icon.scaledSize = new google.maps.Size(widthImage, heightImage)
                icon.anchor = new google.maps.Point(widthImage / 2, heightImage) //bottom middle.
                options.icon = icon
                //Tooltip
                if (eleMarkerImage.title) {
                    options.title = eleMarkerImage.title
                }
                //Don't want this to appear in the Info bubble.
                eleMarkerImage.parentNode.removeChild(eleMarkerImage)
            }
            
            if (eleMapMarkerRow.getAttribute("Tooltip").length!=0){
                options.title = eleMapMarkerRow.getAttribute("Tooltip")
            }
            var marker = null
            if (eleMapMarkerRow.getAttribute("rdMarkerLabel") != null){
                options.labelContent = eleMapMarkerRow.getAttribute("rdMarkerLabel")
                options.labelAnchor = options.icon == undefined ? new google.maps.Point(22, 0) : options.icon.anchor
                options.labelClass = eleMapMarkerRow.getAttribute("rdMarkerClass")
                marker = new MarkerWithLabel(options)
            }
            else{
                marker = new google.maps.Marker(options)
            }
			marker.isMarker = true
            var eleMarker = document.getElementById(eleMapMarkerRow.getAttribute("rdMarkerID"))
            rdCreateMarkerAction(map, marker, eleMarker, eleMapMarkerRow.getAttribute("rdActionSpanID"), infowindow)
            if(!bUseClustering){
                marker.setMap(map)
            }
            else{
                markers.push(marker)
            }
            //Add the marker to the bounds, extending the bounds.
            bounds.extend(point) 
        }
        var markerCluster = null
        if (bUseClustering == true){
            markerCluster = new MarkerClusterer(map, markers)
        }

        var nMinLat; var nMaxLat; var nMinLon; var nMaxLon;
        var aMapPolygonRows = document.getElementsByTagName(sMapID + "_rdMapPolygon");
        if  (aMapPolygonRows.length > 0) {
            for (var i=0; i < aMapPolygonRows.length; i++) {
	            var eleMapPolygonRow = aMapPolygonRows[i]
                if (eleMapPolygonRow.getAttribute("rdEncodedPoints").length > 0){
                    var polygonPoints = google.maps.geometry.encoding.decodePath(eleMapPolygonRow.getAttribute("rdEncodedPoints"))
                    var encodedPolygon = new google.maps.Polygon({
                          paths: polygonPoints,
                          strokeColor: eleMapPolygonRow.getAttribute("rdBorderColor"),
                          strokeOpacity: eleMapPolygonRow.getAttribute("rdBorderOpacity"),
                          strokeWeight: parseInt(eleMapPolygonRow.getAttribute("rdBorderThickness")),
                          fillColor: eleMapPolygonRow.getAttribute("rdFillColor"),
                          fillOpacity: eleMapPolygonRow.getAttribute("rdFillOpacity"),
                          map : map
                        });
					encodedPolygon.isMarker = false
                    var elePolygon = document.getElementById(eleMapPolygonRow.getAttribute("rdPolygonID"))
                    rdCreateMarkerAction(map, encodedPolygon, elePolygon, eleMapPolygonRow.getAttribute("rdActionSpanID"), infowindow)
                    //Add the poly's extents to the bounds, extending the bounds.
                    bounds.extend(new google.maps.LatLng(eleMapPolygonRow.getAttribute("rdMinLat"), eleMapPolygonRow.getAttribute("rdMinLon"))); 
                    bounds.extend(new google.maps.LatLng(eleMapPolygonRow.getAttribute("rdMaxLat"), eleMapPolygonRow.getAttribute("rdMaxLon")));
                }
            }
        }
        
        var aMapPolylineRows = document.getElementsByTagName(sMapID + "_rdMapPolyline");
        if  (aMapPolylineRows.length > 0) {
            for (var i=0; i < aMapPolylineRows.length; i++) {
	            var eleMapPolylineRow = aMapPolylineRows[i]
                if (eleMapPolylineRow.getAttribute("rdEncodedPoints").length > 0){
                    var plPoints = google.maps.geometry.encoding.decodePath(eleMapPolylineRow.getAttribute("rdEncodedPoints"))
                    var plObject = new google.maps.Polyline({
                      path: plPoints,
                      strokeColor: eleMapPolylineRow.getAttribute("rdBorderColor"),
                      strokeOpacity: eleMapPolylineRow.getAttribute("rdBorderOpacity"),
                      strokeWeight: parseInt(eleMapPolylineRow.getAttribute("rdBorderThickness")),
                      map: map
                    });
                    plObject.isMarker = false
                    var elePolyline = document.getElementById(eleMapPolylineRow.getAttribute("rdPolylineID"))
                    rdCreateMarkerAction(map, plObject, elePolyline, eleMapPolylineRow.getAttribute("rdActionSpanID"), infowindow)
                    //Add the line's extents to the bounds, extending the bounds.
                    bounds.extend(new google.maps.LatLng(eleMapPolylineRow.getAttribute("rdMinLat"), eleMapPolylineRow.getAttribute("rdMinLon"))); 
                    bounds.extend(new google.maps.LatLng(eleMapPolylineRow.getAttribute("rdMaxLat"), eleMapPolylineRow.getAttribute("rdMaxLon")));
                }
            }
       }

        //Set the location
        var rdSetMapLocation = function() {
            var zeroLatLng = new google.maps.LatLng(0, 0)
            if (!centerLatLng.equals(zeroLatLng) || nInitialZoom != null){
                 if (!centerLatLng.equals(zeroLatLng))
                     mapOptions.center = centerLatLng
                 else
                     mapOptions.center = bounds.getCenter()
                 map.setOptions(mapOptions)
            }
            else {
                map.fitBounds(bounds)
                var zoom = map.getZoom()
                if (zoom==0){
                    zoom=1
                    map.setZoom(zoom) 
                }  
            }
        }
        
        var aMapKmls = document.getElementsByTagName(sMapID + "_rdKml");
        if  (aMapKmls.length > 0) {
            for (var i=0; i < aMapKmls.length; i++) {
	            var eleMapKml = aMapKmls[i]
                var kml = new google.maps.KmlLayer(eleMapKml.getAttribute("rdKmlUrl"), {map: map})
            }
        }
        
        if  (aMapKmls.length == 0) {
            rdSetMapLocation()  //Set viewport based on markers and/polygons
        }

        try{    // Need to access the 'map' object to resize/re-center the Map.
            if(rdInitGoogleMapsResizer){
                Y.on('domready', function(e) {
                    rdInitGoogleMapsResizer(sMapID, map);
                });
            }
        }
        catch(e){ }
        //15646, 15537
		if(navigator.appVersion.match('MSIE 7.0') != null){
			if(gMaps.length > 0 && ie7Processed == false){
                google.maps.event.addListener(gMaps[0], 'tilesloaded', function() {
				    var oldMapType = gMaps[0].getMapTypeId()
                    gMaps[0].setMapTypeId(null); 
                    gMaps[0].setMapTypeId(oldMapType);
                    google.maps.event.clearListeners(gMaps[0], 'tilesloaded')
                  });
				ie7Processed = true
			}
			gMaps.push(map)
		}
}

function rdCreateMarkerAction(map, marker, eleMarker, sMarkerActionSpanID, infowindow) {
    if (eleMarker) {
        if (eleMarker.getAttribute("rdActionMapMarkerInfo")=="true") {
            //A bubble-style Info window.
            google.maps.event.addListener(marker, "click", function(point) {
                //This is for IFRAMES (SubReports) that may be in the info panel.
                cFrames = eleMarker.getElementsByTagName("IFRAME");
			    for (var i = 0; i < cFrames.length; i++) {
			        var cFrame = cFrames[i];
			        var sSrc = Y.one(cFrame).getData("hiddensource");			        
			        if (sSrc != null) {   //There is no HiddenSource if the element was initially visible.
				        if (cFrame.getAttribute("src") == null) {   //For nonIE
					        cFrame.setAttribute("src", sSrc + "&rdRnd=" + Math.floor(Math.random() * 100000));
				        }										    //For IE.
				        if (cFrame.getAttribute("src").indexOf(sSrc) == -1) {
					        cFrame.setAttribute("src", sSrc + "&rdRnd=" + Math.floor(Math.random() * 100000));
				        }
			        }
		        }
		        infowindow.setContent(eleMarker.innerHTML);
		        if(this.isMarker != true){
		            infowindow.setPosition(point.latLng);
					infowindow.open(map);
		        }
				else{
		            infowindow.open(map, this);
		            Y.LogiXML.ChartCanvas.createElements();
				}
            });
        } else if (sMarkerActionSpanID) {
            var eleActionSpan = document.getElementById(sMarkerActionSpanID)
            if (eleActionSpan) {
                google.maps.event.addListener(marker, "click", function() {eleActionSpan.click()} )
            }
        } else {
            //No Action for the image.
        }
    }
}
