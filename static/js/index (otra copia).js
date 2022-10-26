odoo.define('gpsmap.fleet', function (require) {
    "use strict";
    var AbstractAction = require('web.AbstractAction');
    var core = require('web.core');
    var session = require('web.session');
    var Widget = require('web.Widget');
    var rpc = require('web.rpc');
    var QWeb = core.qweb;

    var local = {};

    var class_gpsmap = AbstractAction.extend({
        ////////////////////////////////////////////////
        start: function() { 
            var self = this;
            var def = this._rpc({
                method: 'search_read',
                context: session.user_context,
                model: 'fleet.vehicle'
            }).then(function (result) {
                self.vehicles = result;                
                self.$("div#menu_vehicles").html(QWeb.render("menu_vehicles", {'widget': self}));           

            });
            self.map();
            var data=this._super.apply(self, arguments);
            
            return data;
        },
        ////////////////////////////////////////////////
        centerMap: function(marcador)
        {
            this.obj_map.panTo(marcador);
        },
        ////////////////////////////////////////////////
        CreateMap: function(iZoom,iMap,coordinates,object)
        {
            if(iMap  ==  "ROADMAP")                    var tMap = google.maps.MapTypeId.ROADMAP;
            if(iMap  ==  "HYBRID")                    var tMap = google.maps.MapTypeId.HYBRID;
            var directionsService;

            var position = this.LatLng(coordinates);
            var mapOptions = new Object();

            if(iZoom != "")                        mapOptions.zoom = iZoom;
            if(position != "")                    mapOptions.center = position;
            if(iMap != "")                        mapOptions.mapTypeId = tMap;

            mapOptions.ScaleControlOptions = {position: google.maps.ControlPosition.TOP_RIGHT}
            mapOptions.RotateControlOptions = {position: google.maps.ControlPosition.TOP_RIGHT}
            mapOptions.zoomControlOptions = {position: google.maps.ControlPosition.TOP_LEFT};
            mapOptions.streetViewControlOptions = {position: google.maps.ControlPosition.TOP_RIGHT}

            var mapC = this.$("#" + object);
            this.obj_map = new google.maps.Map(mapC.get(0), mapOptions);
            this.geocoder = new google.maps.Geocoder();
            var trafficLayer = new google.maps.TrafficLayer();
            trafficLayer.setMap(this.obj_map);

            this.geofence = new google.maps.Polygon();
            this.gMEvent = google.maps.event;
        },
        map: function(object) {
            if(object  ==  undefined)   object = "maponline";

            var iZoom = 5;
            var iMap = "ROADMAP";  //ROADMAP, HYBRID
            var coordinates = {latitude: 19.057522756727606, longitude: -104.29785901920393};

            this.CreateMap(iZoom,iMap,coordinates,object);
        },
        LatLng: function (co)
        {
            return new google.maps.LatLng(co.latitude,co.longitude);
        },
    });
   //////////////////////////////////////////////////////////////////////////////////////
   //////////////////////////////////////////////////////////////////////////////////////
   //////////////////////////////////////////////////////////////////////////////////////
    local.maponline = class_gpsmap.extend({
        template: 'js_maponline',   
        start: function() {
            var data = this._super.apply(this, arguments);
            return data;
        },
    });
    core.action_registry.add('gpsmap.maponline', local.maponline);
    //////////////////////////////////////////////////////////////////////////////////////

    return class_gpsmap;
});