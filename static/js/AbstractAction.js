odoo.define('gpsmap.action', function (require) {
    "use strict";
    
    var AbstractAction = require('web.AbstractAction');
    var core = require('web.core');
    var session = require('web.session');
    var rpc = require('web.rpc');
    var QWeb = core.qweb;

    var local = {};
    var isimulacion = 1;
    var simulation_action = "stop";
    var simulation_stop = 0;
    var simulation_time = 100;
    var localizacion_anterior;
    var coordinate_active = undefined;
    var vehicle_data = new Array();
    var localizaciones = new Array();
    var labels = new Array();

    var class_gpsmap = AbstractAction.extend({
        ////////////////////////////////////////////////
        events: {
            'click div.vehicle': function (e) {
                var objeto = e.currentTarget.attributes;
                this.$("div.vehicle").removeClass("vehicle_active");
                this.device_active = objeto.device_id.value;
                this.$("[device_id = '" + this.device_active + "']").addClass("vehicle_active");

                if(this.contentTemplate  ==  "gpsmaps_maphistory")
                    this.status_device();
                else
                    this.status_device(this.$("div.vehicle[device_id = '" + this.device_active + "']"));
            },
            'click button#action_play': function (e) {
                if(_.size(this.data_positions)>0)
                {
                    simulation_action = "play";
                    this.del_locations();
                    $("div#odometer").show();
                    this.paint_history(isimulacion);
                }
            },
            'click li.type_report': function (e) {
                var objeto = e.currentTarget.attributes;
                this.$("li.type_report").removeClass("select");
                this.$("li.type_report[filter='" + objeto.filter.value + "']").addClass("select");
            },
            'click button#action_search': function (e) {
                this.positions_search();
            },
            'click button#action_pause': function (e) {
                simulation_action = "pause";
            },
            'click button#action_stop': function (e) {
                isimulacion = 1;
                simulation_action = "stop";
            },
        },
        ////////////////////////////////////////////////
        start: function() {             
            var data=this._super.apply(this, arguments);     
            this.get_menu_vehicle();       
            this.get_geofences();
            return data;
        },
        ////////////////////////////////////////////////
        get_menu_vehicle: function() { 
            this.device_active = 0;            
            var self = this;
            this._rpc({
                method: 'search_read',
                context: session.user_context,
                model: 'fleet.vehicle'
            }).then(function (result) {
                self.vehicles = result;                
                self.$("div#menu_vehicles").html(QWeb.render("menu_vehicles", {'widget': self}));           
            });            
        },
        ////////////////////////////////////////////////
        get_geofences: function() { 
            var self = this;
            this._rpc({
                method: 'search_read',
                context: session.user_context,
                model: 'gps_geofences'
            }).then(function (result) {
                for(var igeofences in result)
                {		                
                    var geofence                    =result[igeofences];		                                    
                    if(geofence["hidden"]==false)
                    {                        
                        var flightPlanCoordinates=self.array_points(geofence["area"]);                             
                        self.Polygon(flightPlanCoordinates,{color:geofence["color"],geofence:geofence["name"]});	
                    }    
                }                

            });            
        },
        array_points: function(points) 
        {
            var array_points=new Array();
    
            var vec_points  =points.split(", ");
            for(var i_vec_points in vec_points)
            {                   
                var point       =vec_points[i_vec_points];
                if(point!="")
                {                
                    var vec_point   =point.split(" ");	                   
                    var obj_point={lat:parseFloat(vec_point[1]),lng:parseFloat(vec_point[0])};
                    array_points.push(obj_point);
                }
            }        
           return array_points;
        },     
        Polygon: function(LocationsLine,option) 
        {	            
            if(option==undefined)			option={};
            if(option.color==undefined)		option.color="#FF0000";		
            if(option.color=="") 			option.color="#FF0000";
            
            if(option.opacity==undefined)	option.opacity=0.8;		
            if(option.opacity=="") 			option.opacity=0.8;
        
            var Polygon = new google.maps.Polygon({
                paths: LocationsLine,
                strokeColor: option.color,
                strokeOpacity: option.color,
                strokeWeight: 2,
                fillColor: option.color,
                fillOpacity: 0.35,
                map:             this.obj_map,
            });	
            Polygon.setMap(this.obj_map);
        }, 	           

        ////////////////////////////////////////////////
        positions: function(argument) {
            if(this.time  ==  undefined)    this.time = 1000;
            else if(this.time  ==  1000)    this.time = 20000;
            
            if(this.contentTemplate != "gpsmaps_maphistory" && this.$("div#maponline").length > 0)
                this.positions_search(argument);
            if(typeof argument != "number")
            {
                self=this;
                setTimeout(function()
                {
                    self.positions(argument);
                },this.time);
            }
        },
        ////////////////////////////////////////////////
        positions_search:function(argument){
            var model;
            if(this.contentTemplate  ==  "gpsmaps_maphistory")
            {
                var start_time = this.$("input#start").val();
                var end_time = this.$("input#end").val();

                var filter = this.$("li[class = 'type_report select']").attr("filter");

                var option_args = {
                    "domain":[start_time, end_time, filter],
                };

                if(this.device_active != 0)
                {    
                    option_args["domain"].push(this.device_active);
                }
                model = {
                    model:  "gps_positions",
                    method: "js_positions_history",
                    args:[[],{"data": option_args, "fields": []}],
                };
            }
            else
            {
                model = {
                    model: "fleet.vehicle",
                    method: "get_last_vehicle_position",
                    args:[[]],
                };
            }
            self=this;
            rpc.query(model)
            .then(function (result)
            {                
                self.data_positions=result;
                self.del_locations();
                self.positions_paint(argument);
            });
        },
        ////////////////////////////////////////////////
        del_locations: function ()
        {
            var idvehicle;
            var iposiciones;
            if(localizaciones.length>0)
            {
                for(idvehicle in localizaciones)
                {
                    // console.log("entra");
                    //if(simulation_action  ==  "play")
                        var positions_vehicle = localizaciones[idvehicle];
                    if(positions_vehicle.length > 0)
                    {
                        for(iposiciones in positions_vehicle)
                        {
                            localizaciones[idvehicle][iposiciones].setVisible(false);
                            localizaciones[idvehicle][iposiciones].setMap(null);
                        }
                    }
                }
            }
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
            if(type  ==  undefined)     type = "icon";
            else                    type = "marker";

            if(vehicle["st"]  ==  undefined) vehicle["st"] = "1";
            if(vehicle["st"]  ==  "") vehicle["st"] = "1";
            if(vehicle["mo"]  ==  "map") vehicle["st"] = "1";

            var coordinates = {latitude: vehicle["lat"], longitude: vehicle["lon"]};
            var posicion = this.LatLng(coordinates);

            var icon_status = "";

            if(vehicle["sta"] == "alarm")                                icon_status = "alarm.png";
            if(vehicle["sta"] == "Online")                            icon_status = "car_signal1.png";
            if(vehicle["sta"] == "Offline")
            {
                icon_status = "car_signal0.png";
                if(vehicle["ho"]  ==  1)                                icon_status = "car_signal1.png";
            }
            if(vehicle["sta"] ==  "ignitionOn")                        icon_status = "swich_on.png";
            if(vehicle["sta"] ==  "ignitionOff")                        icon_status = "swich_off.png";

            if(vehicle["psp"]<5 && vehicle["sta"] == "Online")        icon_status = "stop.png";
            if(vehicle["psp"]>5 && vehicle["sta"] == "Online")        icon_status = "car_signal1.png";

            this.$("div.vehicle[device_id = " + vehicle["idg"] + "]")
            .attr("latitude", vehicle["lat"])
            .attr("longitude", vehicle["lon"])
            .attr("position", vehicle["idp"])
            .attr("speed", vehicle["psp"])
            .attr("date", vehicle["dat"])
            .attr("time", vehicle["tim"])
            .attr("distance", vehicle["dto"])
            ;

            if(icon_status != "")
            {
                var img_icon = "<img width = \"20\" title = \""+ vehicle["eve"] +"\" src = \"/gpsmap/static/img/template/"+ icon_status +"\" >";
                if(vehicle["sta"]  ==  "Offline")
                {
                    img_icon = "<a href = \"tel:" + vehicle["te"] +"\">"+img_icon +"</a>";
                }
                $("div.vehicle[device_id = " + vehicle["idg"] + "] div.event_device").html(img_icon);
            }

            var icon = undefined;
            if(type  ==  "icon")
            {
                var marcador;
                if(vehicle["cou"] == undefined)        vehicle["cou"] = 1;
                if(vehicle["cou"])                   icon = vehicle["cou"];

                if(icon>22 && icon<67)    icon = 45;
                else if(icon<112)        icon = 90;
                else if(icon<157)        icon = 135;
                else if(icon<202)        icon = 180;
                else if(icon<247)        icon = 225;
                else if(icon<292)        icon = 270;
                else if(icon<337)        icon = 315;
                else                    icon = 0;

                var image = "01";
                if(!(vehicle["ima"]  ==  undefined || vehicle["ima"]  ==  false))        image = vehicle["ima"];

                icon = "/gpsmap/static/img/vehicles/vehicle_" +image+ "/i"+icon+ ".png";
            }

            if(labels[vehicle["idg"]]  ==  undefined)
            {
                labels[vehicle["idg"]] = new MapLabel({
                    text:             vehicle["nam"],
                    position:         posicion,
                    map:             this.obj_map,
                    fontSize:         14,
                    fontColor:        "#8B0000",
                    align:             "center",
                    strokeWeight:    5,
                });
            }
            labels[vehicle["idg"]].set('position', posicion);
            if(this.device_active  ==  vehicle["idg"] && vehicle["se"]  ==  undefined || vehicle["se"]  ==  "simulator")
            {
                this.centerMap(posicion);
                this.func_odometer(vehicle);
            }
            var marcador = this.markerMap(posicion, icon);
            this.fn_localizaciones(marcador, vehicle);
        },
        ////////////////////////////////////////////////
        LatLng: function (co)
        {
            return new google.maps.LatLng(co.latitude,co.longitude);
        },  
        ////////////////////////////////////////////////
        centerMap: function(marcador)
        {
            this.obj_map.panTo(marcador);
        },   
        ////////////////////////////////////////////////           
        func_odometer_speed: function (data)
        {
            var vel = data*16/10-110;  // 15
            $("path.speed").attr({"transform":"rotate("+ vel +" 250 250)"});
        },        
        func_odometer_gas: function (data)
        {
            var alt = data*12/10-12;    // 10
            $("path.gas").attr({"transform":"rotate("+ alt +" 250 250)"});
        },
        func_odometer_batery: function (data)
        {
            var bat = data*12/10-110;    //10
            $("path.batery").attr({"transform":"rotate("+ bat +" 250 250)"});
        },
        func_odometer: function (item)
        {
            this.func_odometer_speed(item["psp"]);
            this.func_odometer_gas(item["gas"]);
            this.func_odometer_batery(item["bat"]);
 
            this.$("#datetime").html(item["tde"]);
            this.$("#time").html(item["tim"]);
            this.$("#date").html(item["dat"]);
            this.$("#distance").html(item["dto"]);
            this.$("#unity").html(item["oun"]);
 
            var tablero1 = "";
            var tablero2 = "";
 
            if(!(item["ge"]  ==  undefined || item["ge"]  ==  false || item["ge"]  ==  "false"))
                tablero1 = tablero1 + " :: " + item["ge"];
 
            if(!(item["eve"]  ==  undefined || item["eve"]  ==  false || item["eve"]  ==  "false"))    //evento
                tablero1 = " :: " + item["eve"];
 
            if(!(item["ad"]  ==  undefined || item["ad"]  ==  false || item["ad"]  ==  "false"))
                tablero1 = "UBICACION :: " + item["ad"] + tablero1;
 
            if(this.contentTemplate  ==  "gpsmaps_streetonline") this.execute_streetMap(item);
 
            var tablero = "\
                <table id = \"data_tablero\">\
                    <tr><td width = \"40\"  style = \"color:#fff;\"></td>\
                    <td style = \"color:#fff;\"><a href = \"tel:" + item["phone"] +"\"  style = \"color:#fff;\">" + tablero1 + "</a></td></tr>\
                    <tr><td width = \"40\"  style = \"color:#fff;\"></td>\
                    <td style = \"color:#fff;\">" +tablero2 + "</td></tr>\
                </table>\
            ";
            $("#tableros").html(tablero1);
         },
         ////////////////////////////////////////////////
         markerMap: function(position, icon, markerOptions)
         {
             if(markerOptions  ==  undefined)    var markerOptions = new Object();
  
             markerOptions.position = position;
             markerOptions.map = this.obj_map;
             if(icon != undefined)
                 markerOptions.icon = icon;
  
             var marker2 = new google.maps.Marker(markerOptions);
              return marker2
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
                     var position = this.LatLng(coordinates);
                     this.obj_map.panTo(position);
                 }
             }
             if(this.device_active  ==  0)
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
             else
             {
                 this.obj_map.setZoom(16);
                 if(this.$("div#odometer").length>0)
                 {
                     this.$("#tablero").animate({
                         height: 58
                     }, 1000 );
                     this.$("#odometer").show();
 
                     this.func_odometer_speed($(obj).attr("speed"));
                     this.$("#time").html($(obj).attr("time"));
                     this.$("#date").html($(obj).attr("date"));
                     this.$("#distance").html($(obj).attr("distance"));
                 }
             }
         },   
         ////////////////////////////////////////////////
         execute_streetMap: function (vehicle)
         {
             var coordinates = {latitude:vehicle["lat"],longitude:vehicle["lon"]};
 
             if(coordinate_active  ==  undefined) coordinate_active = {};
             var txt_active = coordinate_active["latitude"] + "," + coordinate_active["longitude"];
             var txt_history = coordinates["latitude"] + "," + coordinates["longitude"];
 
             var txt = txt_active + " " + txt_history;
 
             if(txt_active != txt_history)
             {
                 coordinate_active = coordinates;
                 var posicion = this.LatLng(coordinates);
 
                 this.centerMap(posicion);
                 var curso = vehicle["cou"];
                 var panoramaOptions = {
                     position: posicion,
                     pov: {
                         heading:  curso,
                         pitch:    10
                     }
                 };
                 var panorama = new google.maps.StreetViewPanorama(document.getElementById('street'), panoramaOptions);
                 this.obj_map.setStreetView(panorama);
             }            
         },
         ////////////////////////////////////////////////
         paint_history: function(isimulacion)
         {
             if(_.size(this.data_positions)>0)
             {
                 if(_.size(this.data_positions[this.device_active]) > isimulacion)
                 {
                     localizacion_anterior = undefined;
                     var vehicle = this.data_positions[this.device_active][isimulacion];
                     if(vehicle["psp"] > 4)
                     {
                         simulation_stop = 0;
                         simulation_time = 600;
                     }
                     else
                     {
                         if(simulation_stop < 20)
                         {
                             simulation_stop = simulation_stop+1;
                             if(simulation_time  ==  600)    simulation_time = 300;
                         }
                         else
                         {
                             if(simulation_time  ==  300)    simulation_time = 5;
                         }
                     }
                     vehicle["se"] = "simulator";
                     this.locationsMap(vehicle);
 
                     setTimeout(function()
                     {
                         if(simulation_action != "pause")
                             self.del_locations();
                         isimulacion = isimulacion+1;
 
                         if(simulation_action  ==  "play")
                             self.paint_history(isimulacion);
 
                     },simulation_time);
                 }
             }
         },         
    });

    ////////////////////////////////////////////////
    local.maponline = class_gpsmap.extend({
        contentTemplate: 'js_maponline',   
        start: function() {
            var data = this._super.apply(this, arguments);
            this._initMap();
            this.positions();
            return data;
        },
        _initMap: function(idmap) {
            var self=create_map(this);
            this.obj_map=self.obj_map;
        },
    });
    core.action_registry.add('gpsmap.maponline', local.maponline);
    ////////////////////////////////////////////////
    local.streetonline = class_gpsmap.extend({
        contentTemplate: 'gpsmaps_streetonline',   
        start: function() {
            var data = this._super.apply(this, arguments);
            this._initMap();
            this.positions();
            return data;
        },
        _initMap: function(idmap) {
            var self=create_map(this);
            this.obj_map=self.obj_map;
        },
    });
    core.action_registry.add('gpsmap.streetonline', local.streetonline);
    ////////////////////////////////////////////////
    local.maphistory = class_gpsmap.extend({
        contentTemplate: 'gpsmaps_maphistory',   
        start: function() {
            var data = this._super.apply(this, arguments);
            this._initMap();
            this.startTime();
            return data;
        },
        _initMap: function(idmap) {
            var self=create_map(this);
            this.obj_map=self.obj_map;
        },
        startTime: function() {
            var start_time = new Date().toISOString().slice(0,10) + " 07:00";
            var end_time = new Date().toISOString().slice(0,10) + " 23:59";

            this.$('input#start').val(start_time);
            this.$("input#end").val(end_time);
        },

    });
    core.action_registry.add('gpsmap.maphistory', local.maphistory);

});
