function create_map(self)
{    
    if(self.idmap  ==  undefined)   self.idmap = "maponline";

    var directionsService;

    var mapOptions = new Object();
    var data_return = new Object();

    mapOptions.zoom = 5;
    mapOptions.center = {
        lat: 19.057522756727606,
        lng: -104.29785901920393
    };
    mapOptions.minZoom= 3;
    mapOptions.maxZoom= 20;
    mapOptions.mapTypeId = google.maps.MapTypeId.ROADMAP;
    mapOptions.ScaleControlOptions = {position: google.maps.ControlPosition.TOP_RIGHT}
    mapOptions.RotateControlOptions = {position: google.maps.ControlPosition.TOP_RIGHT}
    mapOptions.zoomControlOptions = {position: google.maps.ControlPosition.TOP_LEFT};
    mapOptions.streetViewControlOptions = {position: google.maps.ControlPosition.TOP_RIGHT}

    var mapC = self.$("#" + self.idmap);
    self.obj_map = new google.maps.Map(mapC.get(0), mapOptions);
    self.geocoder = new google.maps.Geocoder();
    var trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(self.obj_map);

    self.geofence = new google.maps.Polygon();
    self.gMEvent = google.maps.event;
    return self;
}
