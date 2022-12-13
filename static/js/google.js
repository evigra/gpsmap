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
    
    if(self.$("#" + self.idmap).length==1)
        var mapC = self.$("#" + self.idmap);
    else
        var mapC = $("#" + self.idmap);
    
    self.obj_map = new google.maps.Map(mapC.get(0), mapOptions);
    self.geocoder = new google.maps.Geocoder();
    var trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(self.obj_map);

    self.geofence = new google.maps.Polygon();
    self.gMEvent = google.maps.event;
    return self;
}

function markerMap(map, position, icon, markerOptions)
{
    if(markerOptions  ==  undefined)    var markerOptions = new Object();

    markerOptions.position = position;
    markerOptions.map = map;
    if(icon != undefined)
        markerOptions.icon = icon;

    var marker2 = new google.maps.Marker(markerOptions);
     return marker2
}
function LatLng(co)
{
    return new google.maps.LatLng(co.latitude,co.longitude);
}  
function del_locations(obj_loc)
{
    var idvehicle;
    var iposiciones;
    if(_.size(obj_loc.localizaciones)>0)
    {
        for(idvehicle in obj_loc.localizaciones)
        {
            var positions_vehicle = obj_loc.localizaciones[idvehicle];
            if(positions_vehicle.length > 0)
            {
                for(iposiciones in positions_vehicle)
                {
                    obj_loc.localizaciones[idvehicle][iposiciones].setVisible(false);
                    obj_loc.localizaciones[idvehicle][iposiciones].setMap(null);
                }
            }
        }
    }
    return obj_loc;
}
