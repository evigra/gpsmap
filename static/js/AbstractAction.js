odoo.define('gpsmap.action', function (require) {
    "use strict";
    
    const Dialog = require('web.Dialog');
    
    var AbstractAction = require('web.AbstractAction');
    var core = require('web.core');
    const _t = core._t;
    var session = require('web.session');
    var rpc = require('web.rpc');
    var QWeb = core.qweb;

    var local = {};
    
    var localizacion_anterior;    
    var labels = new Array();
    
    var class_gpsmap = AbstractAction.extend({
        ////////////////////////////////////////////////
        events: {
            'click div.vehicle': function (e) {
                //otra =a +b
                var objeto = e.currentTarget.attributes;

                this.$("div.vehicle").removeClass("vehicle_active");
                this.device_active = objeto.device_id.value;

                this.$("[device_id='" + this.device_active + "']")
                    .addClass("vehicle_active");

                if (this.contentTemplate === "gpsmaps_maphistory") {
                    this.status_device();
                } else {
                    this.status_device(
                        this.$("div.vehicle[device_id='" + this.device_active + "']")
                    );
                }
            },
            'click li.type_report': function (e) {
                var objeto = e.currentTarget.attributes;
                this.$("li.type_report").removeClass("select");
                this.$("li.type_report[filter='" + objeto.filter.value + "']").addClass("select");
            },
            'click div#llaves': function (e) {

                if( $("img#key").attr("src") == "/gpsmap/static/img/template/swich_off.png" )
                    this.send_command()
                else
                    Dialog.confirm(this, _t("Do you want to stop the engine?"), {
                        confirm_callback: () => this.send_command(),
                    });
            },
        },
        ////////////////////////////////////////////////

        _onClickVehicle: function (e) {
            var objeto = e.currentTarget.attributes;

            this.$("div.vehicle").removeClass("vehicle_active");
            this.device_active = objeto.device_id.value;

            this.$("[device_id='" + this.device_active + "']")
                .addClass("vehicle_active");

            if (this.contentTemplate === "gpsmaps_maphistory") {
                this.status_device();
            } else {
                this.status_device(
                    this.$("div.vehicle[device_id='" + this.device_active + "']")
                );
            }
        },
        ////////////////////////////////////////////////
        
        ////////////////////////////////////////////////
        
        
        ////////////////////////////////////////////////

        send_command: function(){
            var model = {
                model:  "fleet.vehicle",
                method: "send_command",
                args:[[],{"data": this.device_active}],
            };
            self=this;
            rpc.query(model)
            .then(function (result)
            {     
                var result = JSON.parse(result);
                             
                if(result["type"]=="engineResume")
                    $("img#key").attr("src", "/gpsmap/static/img/template/swich_on.png");
                if(result["type"]=="engineStop")
                    $("img#key").attr("src", "/gpsmap/static/img/template/swich_off.png");
                
                if(result["status"]=="error")    
                    Dialog.alert(self, _t(result["message"]));
                
            });                
        },
        ////////////////////////////////////////////////
        start: function () {
            var data = this._super.apply(this, arguments);

            this._positionTimer = null;
            this._geofencesLoaded = false;
            this.geofencePolygons = [];

            this.get_menu_vehicle();
            this.status_device();

            return data;
        },        ////////////////////////////////////////////////
        get_menu_vehicle: function() { 
            this.device_active = 0;            
            var self = this;
            this._rpc({
                method: 'search_read',
                context: session.user_context,
                model: 'fleet.vehicle'
            }).then(function (result) {
                self.vehicles = result;     
                self.user=session;
                self.$("div#menu_vehicles").html(QWeb.render("menu_vehicles", {'widget': self}));           
            });  
        },



get_geofences: function () {

    

    var self = this;

    
    this._rpc({
        method: 'search_read',
        context: session.user_context,
        model: 'gps_geofence'
    }).then(function (result) {

    
        result.forEach(function (geofence) {

    
            if (!geofence.hidden) {

                var points = self.array_points(
                    geofence.polygon_coords
                );

    
                self.Polygon(points, {
                    color: geofence.color,
                    opacity: 0.8,
                    geofence: geofence.name
                });
            }

        });

    });
},
  Polygon: function (LocationsLine, option) {

    var polygon = new google.maps.Polygon({
        paths: LocationsLine,
        strokeColor: option.color || "#FF0000",
        strokeOpacity: option.opacity || 0.8,
        strokeWeight: 2,
        fillColor: option.color || "#FF0000",
        fillOpacity: 0.35,
        map: this.obj_map
    });

    polygon.setMap(this.obj_map);
    return polygon;
},
        ////////////////////////////////////////////////
        
array_points: function (data) {

    if (!data) {
        return [];
    }

    var points = [];

    // Separar cada coordenada
    var coordinates = data.split(',');

    coordinates.forEach(function (coordinate) {

        coordinate = coordinate.trim();

        if (!coordinate) {
            return;
        }

        // Separar longitud y latitud
        var values = coordinate.split(/\s+/);

        if (values.length < 2) {
            return;
        }

        var lng = parseFloat(values[0]);
        var lat = parseFloat(values[1]);

        if (isNaN(lat) || isNaN(lng)) {
            return;
        }

        points.push({
            lat: lat,
            lng: lng
        });

    });

    return points;
},        
        ////////////////////////////////////////////////
        positions: function(argument) {
            if(this.time  ==  undefined)    this.time = 1000;
            else if(this.time  ==  1000)    this.time = 20000;
            
            if(this.contentTemplate != "gpsmaps_maphistory" && this.$("div#maponline").length > 0)
                this.positions_search(argument);
            if(typeof argument != "number")
            {

                if (this._positionTimer) {
                    clearTimeout(this._positionTimer);
                }
                this._positionTimer = setTimeout(() => {
                    this.positions(argument);
                },this.time);
            }
        },


        destroy: function () {

            if (this._positionTimer) {
                clearTimeout(this._positionTimer);
                this._positionTimer = null;
            }

            if (this.geofencePolygons) {
                this.geofencePolygons.forEach(function (polygon) {
                    polygon.setMap(null);
                });
                this.geofencePolygons = [];
            }

            this._super.apply(this, arguments);
        },



        ////////////////////////////////////////////////
        positions_search:function(argument){
            var model;            
            model = {
                model: "fleet.vehicle",
                context: session.user_context,
                method: "get_last_vehicle_position",
                args:[[]],
            };
            rpc.query(model)
            .then(function (result)
            {                
                this.data_positions=result;
                fn_del_locations();
                this.positions_paint(argument);
            }.bind(this));
        },
        ////////////////////////////////////////////////
        del_locations: function ()
        {
            fn_del_locations();
        },
        ////////////////////////////////////////////////
        positions_paint:function(argument)
        {
            var iposition;
            var ivehicle;
            if(_.size(this.data_positions)>0)
            {
                for(ivehicle in this.data_positions)
                {
                    var vehicle_positions = this.data_positions[ivehicle];
                    for(iposition in vehicle_positions)
                    {
                        var position = vehicle_positions[iposition];
                        this.locationsMap(position)
                    }
                }
            }
        },
        ////////////////////////////////////////////////
        locationsMap: function(vehicle, type)
        {
            var object={
                "obj_map":          this.obj_map,
                "device_active":    this.device_active,
            };
            var data = locationsMap(object, vehicle, type)

            if(this.contentTemplate  ==  "gpsmaps_streetonline" && this.device_active  ==  vehicle["idg"])  
            //if(device_active  ==  vehicle["idg"] && vehicle["se"]  ==  undefined || vehicle["se"]  ==  "simulator")    
                
                this.execute_streetMap(vehicle);

            vehicle = data["vehicle"];
            var marcador = data["marcador"];
            fn_localizaciones(marcador, vehicle);            
        },  
        ////////////////////////////////////////////////
        centerMap: function(marcador)
        {
            this.obj_map.panTo(marcador);
        },   
         ////////////////////////////////////////////////
         
         fn_localizaciones: function(position, vehiculo)
         {
             var ivehiculo = vehiculo["idv"];
             if(localizaciones[ivehiculo]  ==  undefined)
             {
                 localizaciones[ivehiculo] = Array(position);
                 if(vehiculo["se"] != "simulator")        vehicle_data[ivehiculo] = Array(vehiculo)
             }
             else
             {
                 localizaciones[ivehiculo].unshift(position);
                 if(vehiculo["se"] != "simulator")     vehicle_data[ivehiculo].unshift(vehiculo)
             }
         },
         
         ////////////////////////////////////////////////
         status_device: function(obj)
         {
             if(this.device_active  ==  undefined)    this.device_active = 0;
             if(obj != undefined)
             {
                 if(this.$(obj).attr("latitude") != undefined)
                 {
                     var coordinates = {
                         "latitude": $(obj).attr("latitude"),
                         "longitude": $(obj).attr("longitude")
                     };
                     var position = LatLng(coordinates);
                     this.obj_map.panTo(position);
                 }
             }                    
             if(this.device_active  >  0)
             {                
                 this.obj_map.setZoom(16);
                 if(this.$("div#odometer").length>0)
                 {
                     this.$("#tablero").animate({
                         height: 58
                     }, 1000 );
                     this.$("#odometer").show();
 
                     func_odometer_speed($(obj).attr("speed"));
                     this.$("#time").html($(obj).attr("time"));
                     this.$("#date").html($(obj).attr("date"));
                     this.$("#distance").html($(obj).attr("distance"));
                 }
             }
             else
             {
                if(this.$("div#odometer").length>0)
                {
                    this.$("div#map_search").show();
                    this.$("div#odometer").hide();
                    this.$("#tablero").html("Estatus : Seleccionar un vehiculo");
                    this.$("#tablero").animate({
                        height: 25
                    }, 1000 );
                }
            }            
         },   
         ////////////////////////////////////////////////
    });

    ////////////////////////////////////////////////
    local.maponline = class_gpsmap.extend({
        contentTemplate: 'js_maponline',   
        start: function() {
            var data = this._super.apply(this, arguments);
            this._initMap();
            if(this.time  ==  undefined)
                this.positions();
            return data;
        },
        _initMap: function (idmap) {

            this.idmap = "maponline";

            var self = create_map(this);
            this.obj_map = self.obj_map;

            if (!this._geofencesLoaded) {
                this._geofencesLoaded = true;
                this.get_geofences();
            }
        },
    });
    core.action_registry.add('gpsmap.maponline', local.maponline);
    ////////////////////////////////////////////////
  
    return class_gpsmap;
});
