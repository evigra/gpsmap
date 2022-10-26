globalThis.object_gpsmap;
globalThis.object_positions;
odoo.define('gpsmap.fleet', function (require) {
    "use strict";
    var AbstractAction = require('web.AbstractAction');
    var core = require('web.core');
    var session = require('web.session');
    var Widget = require('web.Widget');
    var rpc = require('web.rpc');
    var QWeb = core.qweb;

    var local = {};
    var localizaciones = new Array();
    var labels = new Array();
    var vehicle_data = new Array();
    var localizacion_anterior;
    var coordinate_active = undefined;
    var simulation_action = "stop";
    var isimulacion = 1;
    var simulation_stop = 0;
    var simulation_time = 100;
    var geofence;

    //////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////


    var class_gpsmap = AbstractAction.extend({

        async willStart() {
            console.log("1 willStart() =======================");            
            await this._super.apply(this, arguments); 
            console.log("2 willStart() =======================");

            this.locationsMarker = new Array();
            this.GeoMarker = Array();
            this.GeoMarker1 = Array();
            this.lineas = Array();
            this.Polyline = undefined;
            this.time = 0;
            this.obj_map;
            this.device_active = 0;

            console.log("3 willStart() =======================");
            this.vehicles = await this.get_vehicles();

            console.log("4 willStart() vehicles=======================");
            console.log(this.vehicles);

            //return this._super.apply(this, arguments);
            //return await this._super.apply(this, arguments);
            //return await this._super(...arguments);
        },
        ////////////////////////////////////////////////
        events: {
            'click div.vehicle': function (e) {
                var objeto = e.currentTarget.attributes;
                $("div.vehicle").removeClass("vehicle_active");
                this.device_active = objeto.vehicle.value;
                $("[vehicle = '" + this.device_active + "']").addClass("vehicle_active");

                if(this.template  ==  "gpsmaps_maphistory")
                    this.status_device();
                else
                    this.status_device(this.$("div.vehicle[vehicle = '" + this.device_active + "']"));
            },
            'click button#action_play': function (e) {
                if(_.size(globalThis.object_positions)>0)
                {
                    simulation_action = "play";
                    this.del_locations();
                    $("div#odometer").show();
                    this.paint_history(isimulacion);
                }
            },
            'click li.type_report': function (e) {
                var objeto = e.currentTarget.attributes;
                $("li.type_report").removeClass("select");
                $("li.type_report[filter='" + objeto.filter.value + "']").addClass("select");
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
            'click button#action_addpoint': function (e) {
                this.GeoMarker.push(coordinate);
                this.GeoMarker1.push(elocation);
                if(this.GeoMarker1.length>1)
                {
                    this.puntos();
                    this.polilinea(this.GeoMarker1);
                }
            },
        },
        ////////////////////////////////////////////////
        async start() { 
            if (typeof google !==  'object' || typeof google.maps !==  'object') {
                await new Promise(resolve => {
                    this.trigger_up('gmap_api_request', {
                        editableMode: this.editableMode,
                        onSuccess: () => resolve(),
                    });
                });
                return;
            }
            
            this.map();
            if(this.template != "gpsmaps_maphistory")
            {
                this.$("div#filtro").hide();
                this.$("div#buttons_history").hide();
                this.status_device($("[vehicle = '" + this.device_active + "']"));
            }
            return this._super.apply(this, arguments);
        },
        ////////////////////////////////////////////////
        get_vehicles: function() { 

            return new Promise(resolve => {
                self=this;
                var def = this._rpc({
                    method: 'search_read',
                    context: session.user_context,
                    model: 'fleet.vehicle'
                })
                .then(function(res)
                {
                    console.log("1.1 get_vehicles() res=======================");
                    console.log(res);
                    self.vehicles = res;                
                });
                console.log("1.2 get_vehicles() self.vehicles=======================");
                console.log(self.vehicles);

                resolve(self.vehicles);
            });


        },


        ////////////////////////////////////////////////

        status_device: function(obj)
        {
            if(this.device_active  ==  undefined)    this.device_active = 0;
            if(obj != undefined)
            {
                if($(obj).attr("latitude") != undefined)
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
                if($("div#odometer").length>0)
                {
                    $("div#map_search").show();
                    $("div#odometer").hide();
                    $("#tablero").html("Estatus : Seleccionar un vehiculo");
                    $("#tablero").animate({
                        height: 25
                    }, 1000 );
                }
            }
            else
            {
                this.obj_map.setZoom(16);
                if($("div#odometer").length>0)
                {
                    $("#tablero").animate({
                        height: 58
                    }, 1000 );
                    $("#odometer").show();

                    this.func_odometer_speed($(obj).attr("speed"));
                    $("#time").html($(obj).attr("time"));
                    $("#date").html($(obj).attr("date"));
                    $("#distance").html($(obj).attr("distance"));
                }
            }
        },
        ////////////////////////////////////////////////
        position: function(argument) {
            if(argument  ==  undefined)                 this.positions(argument);
            else if($("#data_tablero").length  ==  0)
            {
                this.position(argument);
            }
        },
        ////////////////////////////////////////////////
        positions: function(argument) {
            if(self.time  ==  0)            self.time = 4000;
            else if(self.time  ==  4000)    this.time = 20000;

            if(this.template != "gpsmaps_maphistory" && $("div#maponline").length > 0)
                this.positions_search(argument);
            if(typeof argument != "number")
            {
                setTimeout(function()
                {
                    self.positions(argument);
                },self.time);
            }
        },
        ////////////////////////////////////////////////
        positions_search:function(argument){
            var model;
            if(this.template  ==  "gpsmaps_maphistory")
            {
                console.log("positions_search ###################");
                var start_time = $("input#start").val();
                var end_time = $("input#end").val();

                /*
                if(start_time  ==  "" || end_time  ==  "")
                {
                    this.displayNotification({
                        title: "titulo:",
                        message: "MEnsaje",
                        type: 'danger',
                    });
                    return false;
                }
                */

                var filter = $("li[class = 'type_report select']").attr("filter");

                var option_args = {
                    "domain":[start_time, end_time, filter],
                };

                if(this.device_active != 0)
                {    
                    //option_args["domain"].push(["deviceid", " = ", this.device_active]);
                    option_args["domain"].push(this.device_active);
                    //alert(this.device_active);
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
            rpc.query(model)
            .then(function (result)
            {
                console.log(result);
                globalThis.object_positions = result;
                self.del_locations();
                self.positions_paint(argument);
            });
        },
        ////////////////////////////////////////////////
        positions_paint:function(argument)
        {
            var iposition;
            var ivehicle;

            if(_.size(globalThis.object_positions)>0)
            {
                for(ivehicle in globalThis.object_positions)
                {
                    var vehicle_positions = globalThis.object_positions[ivehicle];
                    for(iposition in vehicle_positions)
                    {
                        var position = vehicle_positions[iposition];
                        this.locationsMap(position)
                    }
                }
            }
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

            this.$("div.vehicle[vehicle = " + vehicle["idv"] + "]")
            .attr("latitude", vehicle["lat"])
            .attr("longitude", vehicle["lon"])
            .attr("position", vehicle["idp"])
            .attr("speed", vehicle["psp"])
            .attr("date", vehicle["dat"])
            .attr("time", vehicle["tim"])
            .attr("distance", vehicle["dto"])
            ;

            if(icon_status! = "")
            {
                var img_icon = "<img width = \"20\" title = \""+ vehicle["eve"] +"\" src = \"/gpsmap/static/img/template/"+ icon_status +"\" >";
                if(vehicle["sta"]  ==  "Offline")
                {
                    img_icon = "<a href = \"tel:" + vehicle["te"] +"\">"+img_icon +"</a>";
                }
                $("div.vehicle[vehicle = " + vehicle["idv"] + "] div.event_device").html(img_icon);
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

            if(labels[vehicle["idv"]]  ==  undefined)
            {
                labels[vehicle["idv"]] = new MapLabel({
                    text:             vehicle["nam"],
                    position:         posicion,
                    map:             this.obj_map,
                    fontSize:         14,
                    fontColor:        "#8B0000",
                    align:             "center",
                    strokeWeight:    5,
                });
            }
            labels[vehicle["idv"]].set('position', posicion);

            if(this.device_active  ==  vehicle["idv"] && vehicle["se"]  ==  undefined || vehicle["se"]  ==  "simulator")
            {
                this.centerMap(posicion);
                this.func_odometer(vehicle);
            }
            var marcador = this.markerMap(posicion, icon);

            this.fn_localizaciones(marcador, vehicle);
        },
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

        ////////////////////////////////////////////////
        func_odometer: function (item)
        {
            this.func_odometer_speed(item["psp"]);
            this.func_odometer_gas(item["gas"]);
            this.func_odometer_batery(item["bat"]);

            $("#datetime").html(item["tde"]);
            $("#time").html(item["tim"]);
            $("#date").html(item["dat"]);
            $("#distance").html(item["dto"]);
            $("#unity").html(item["oun"]);

            var tablero1 = "";
            var tablero2 = "";

            if(!(item["ge"]  ==  undefined || item["ge"]  ==  false || item["ge"]  ==  "false"))
                tablero1 = tablero1 + " :: " + item["ge"];

            if(!(item["eve"]  ==  undefined || item["eve"]  ==  false || item["eve"]  ==  "false"))    //evento
                tablero1 = " :: " + item["eve"];

            if(!(item["ad"]  ==  undefined || item["ad"]  ==  false || item["ad"]  ==  "false"))
                tablero1 = "UBICACION :: " + item["ad"] + tablero1;

            if(this.template  ==  "gpsmaps_streetonline") this.execute_streetMap(item);

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
        ////////////////////////////////////////////////

        ////////////////////////////////////////////////
        centerMap: function(marcador)
        {
            this.obj_map.panTo(marcador);
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
        ////////////////////////////////////////////////
        ////////////////////////////////////////////////

        paint_history: function(isimulacion)
        {
            if(_.size(globalThis.object_positions)>0)
            {
                if(_.size(globalThis.object_positions[this.device_active]) > isimulacion)
                {
                    localizacion_anterior = undefined;
                    var vehicle = globalThis.object_positions[this.device_active][isimulacion];
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

        ////////////////////////////////////////////////

        limpiar_virtual: function ()
        {
            var indexMarker;
            for(indexMarker = 0; indexMarker < this.locationsMarker.length; indexMarker++)
            {
                this.locationsMarker[indexMarker].setMap(null);
            }
            this.locationsMarker.length = 0;
            this.locationsMarker = Array();
        },
        limpiar_real: function ()
        {
            this.limpiar_virtual();
            $("input#area").val("");

            this.limpiar_lineas();

            this.GeoMarker = Array();
            this.GeoMarker1 = Array();
        },
        limpiar_lineas: function ()
        {
            var ilineas;
            for(ilineas in this.lineas)
            {
                this.lineas[ilineas].setMap(null);
            }
            this.lineas.length = 0;
            this.lineas = Array();
        },

        puntos: function()
        {
            var index;
            var punto = new String();
            var puntos = new String();
            for(index in this.GeoMarker)
            {
                punto = this.GeoMarker[index];
                if(puntos  ==  "")  puntos = punto["longitude"] + " " + punto["latitude"];
                else            puntos+= ", "+punto["longitude"] + " " + punto["latitude"];
            }
            puntos = "POLYGON((" + puntos + "))";
            $("textarea[name = 'area']").val(puntos);
            return puntos;
        },
        polilinea: function (LocationsLine,color)
        {
            this.limpiar_lineas();

            var auxiliar = LocationsLine;

            var punto = this.GeoMarker1[this.GeoMarker1.length -1]
            auxiliar.push(this.GeoMarker1[0]);
            auxiliar.push(punto);

            if(color  ==  undefined)    var color = "#FF0000";
            if(color  ==  "")             var color = "#FF0000";

            var data_linea = {
                path: auxiliar,
                geodesic: true,
                strokeColor: color,
                strokeOpacity: 1.0,
                strokeWeight: 2,
                map:this.obj_map
            };

            this.lineas.push(new google.maps.Polyline(data_linea));
        },
        show_poligono: function (LocationsLine,option)
        {
            if(option  ==  undefined)            option = {};
            if(option.color  ==  undefined)        option.color = "#FF0000";
            if(option.color  ==  "")             option.color = "#FF0000";

            if(option.opacity  ==  undefined)    option.opacity = 0.8;
            if(option.opacity  ==  "")             option.opacity = 0.8;


            this.geofence = new google.maps.Polygon({
                paths:          LocationsLine,
                map:            this.obj_map,
                strokeColor:    option.color,
                strokeOpacity:  option.color,
                strokeWeight:   2,
                fillColor:      option.color,
                fillOpacity:    0.35
            });


            if(option.geofence != undefined)
            {
                var total_lat = 0;
                var total_lng = 0;
                var may_lat = 0;
                var may_lng = 0;
                var iLocationsLine;
                for(iLocationsLine in LocationsLine)
                {
                    if(LocationsLine[iLocationsLine].lat>may_lat)
                    {
                        may_lat = LocationsLine[iLocationsLine].lat
                        may_lng = LocationsLine[iLocationsLine].lng
                    }
                    total_lat = total_lat + LocationsLine[iLocationsLine].lat;
                    total_lng = total_lng + LocationsLine[iLocationsLine].lng;
                }
                may_lat = may_lat - 0.00005;

                iLocationsLine = parseInt(iLocationsLine)+1;

                var t_lat = (total_lat / (iLocationsLine));
                var t_lng = total_lng / (iLocationsLine);

                var posicion = this.LatLng({latitude:t_lat,longitude:t_lng});

                var mapLabel = new MapLabel({
                    text:             option.geofence,
                    position:         posicion,
                    map:             this.obj_map,
                    fontSize:         14,
                    fontColor:        "#000000",
                    align:             "center",
                    strokeWeight:    5,
                });
            }

        },
        poligon: function (elocation,color)
        {
            if (typeof this.geofence  === 'object')
            {
                this.geofence.setMap(null);
            }
            {
                this.obj_map.panTo(elocation);

                var triangleCoords = [
                    new google.maps.LatLng(parseFloat(elocation.lat()),     parseFloat(elocation.lng())),
                    new google.maps.LatLng(parseFloat(elocation.lat()-0.01), parseFloat(elocation.lng()-0.01)),
                    new google.maps.LatLng(parseFloat(elocation.lat()-0.01), parseFloat(elocation.lng()+0.01))
                ];

                this.geofence.setOptions({
                    paths:          triangleCoords,
                    draggable:      true, // turn off if it gets annoying
                    editable:       true,
                    strokeColor:    '#FF0000',
                    strokeOpacity:  0.8,
                    strokeWeight:   2,
                    fillColor:      '#FF0000',
                    fillOpacity:    0.35,
                    map:            this.obj_map
                });
            }
            if (typeof this.geofence  === 'object')
            {
                globalThis.object_gpsmap = this;
                google.maps.event.addListener(globalThis.object_gpsmap.geofence.getPath(), "set_at", globalThis.object_gpsmap.getPolygonCoords);
                google.maps.event.addListener(globalThis.object_gpsmap.geofence.getPath(), "insert_at", globalThis.object_gpsmap.getPolygonCoords);
            }
        },
        getPolygonCoords: function()
        {
            var puntos = "";
            var punto;
            var len = globalThis.object_gpsmap.geofence.getPath().getLength();

            globalThis.object_gpsmap.foreach(globalThis.object_gpsmap.geofence.getPath().sd);
            for (var i = 0; i < len; i++)
            {
                var punto = globalThis.object_gpsmap.geofence.getPath().sd[i];
                if(puntos  ==  "")  puntos = punto.lat() + " " + punto.lng();
                else            puntos  += ", " + punto.lat() + " " + punto.lng();
            }
            punto = globalThis.object_gpsmap.geofence.getPath().sd[0];
            puntos += ", " + punto.lat() + " " + punto.lng();

            puntos = "POLYGON((" + puntos + "))";
            $("textarea[name = 'area']")
                .val(puntos)
                .change();
        },
        geofences_paint: function()
        {
            var data = {
                model:  "tc_geofences",
                method: "search_read",
                context: session.user_context,
            };

            this.geofences = this._rpc(data).then(function(res)   {
                var igeofences;
                for(igeofences in res)
                {
                    var geofence = res[igeofences];
                    var geofence_id = geofence["area"];

                    if(geofence["hidden"]  ==  false && geofence["area"] != false)
                    {
                        var flightPlanCoordinates = self.array_points(geofence["area"]);
                        self.show_poligono(flightPlanCoordinates,{color: geofence["color"], geofence: geofence["name"]});
                    }
                }
            });
        },
        array_points: function (points)
        {
            var i_vec_points;
            var array_points = new Array();
            points = points.substring(9, points.length - 2);   // Returns "ell"
            var vec_points = points.split(", ");

            for(i_vec_points in vec_points)
            {
                var point = vec_points[i_vec_points];
                if(point != "")
                {
                    var vec_point = point.split(" ");
                    var obj_point = {lat: parseFloat(vec_point[0]), lng: parseFloat(vec_point[1])};
                    array_points.push(obj_point);
                }
            }
            return array_points;
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

            if($("div#"+object).length>0 && $("div#"+object).html()  ==  "")
            {
                var mapC = this.$("#" + object);
                this.obj_map = new google.maps.Map(mapC.get(0), mapOptions);
                this.geocoder = new google.maps.Geocoder();
                var trafficLayer = new google.maps.TrafficLayer();
                trafficLayer.setMap(this.obj_map);

                this.geofence = new google.maps.Polygon();
                this.gMEvent = google.maps.event;
            }
            else
            {
                setTimeout(function()
                {
                    location.reload(true);
                },300);
            }
        },
        map: function(object) {
            if(object  ==  undefined)   object = "maponline";

            var iZoom = 5;
            var iMap = "ROADMAP";  //ROADMAP, HYBRID
            var coordinates = {latitude: 19.057522756727606, longitude: -104.29785901920393};

            if($("div#"+object).length>0)
            {
                this.CreateMap(iZoom,iMap,coordinates,object);
            }
            else
            {
                setTimeout(function()
                {
                    self.map(object);
                },300);
            }
        },

        ////////////////////////////////////////////////
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
        
        willStart: function () {            
            var retornar = this._super.apply(this, arguments);

            console.log("1.2 willStart this.vehicles=======================");
            console.log(this.vehicles);

            console.log("1.3  willStart retornar.vehicles=======================");
            console.log(retornar.vehicles);


            this.status_device();
            return retornar;
        },
        start: function() {
            //alert("start aaa");
            var data_return = this._super.apply(this, arguments);
   
            this.vehicles_js = this.vehicles;
            this.variable_lalo = "funciona";
            this.$el.html(QWeb.render(this.template, {'widget': this}));           

            console.log("3.1  start this.vehicles=======================");
            console.log(this.vehicles);

            console.log("3.2  start this.vehicles=======================");
            console.log(data_return.vehicles);

   
            this.positions();
            this.status_device($("vehicle_active"));
            return data_return;
        },
    });
    core.action_registry.add('gpsmap.maponline', local.maponline);
    //////////////////////////////////////////////////////////////////////////////////////
    local.streetonline = class_gpsmap.extend({
        template: 'gpsmaps_streetonline',
        willStart: function () {
            var retornar = this._super.apply(this, arguments);
            //this.geofences_paint();
            this.positions();
            return retornar;
        },
    });
    core.action_registry.add('gpsmap.streetonline', local.streetonline);
    //////////////////////////////////////////////////////////////////////////////////////
    local.maphistory = class_gpsmap.extend({
        template: 'gpsmaps_maphistory',
        start: function() {
            var retornar = this._super.apply(this, arguments);
   

            //console.log("history start: function()");

            //this.template = "gpsmaps_maphistory";
            //return this._super.apply(this, arguments);
            //this.positions_online();
            //this.geofences_paint();

            return retornar;
        },
        init: function() {
            return this._super.apply(this, arguments);
            this.startTime();
            //return this._super.apply(this, arguments);
        },
        startTime: function() {
            var start_time = new Date().toISOString().slice(0,10) + " 07:00";
            var end_time = new Date().toISOString().slice(0,10) + " 23:59";

            //if($("input#start").length>0)
            {
                $('input#start').val(start_time);
                this.$("input#end").val(end_time);
            }
            //else
            {

            }
        },
    });
    core.action_registry.add('gpsmap.maphistory', local.maphistory);
    return class_gpsmap;
});