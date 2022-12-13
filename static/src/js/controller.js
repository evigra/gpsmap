/** @odoo-module **/

import publicWidget from 'web.public.widget';
import time from 'web.time';

publicWidget.registry.gpsmapMirror = publicWidget.Widget.extend({
    selector: '#controller_gpsmap',

    events: {
        'click div.vehicle': function (e) {
            var objeto = e.currentTarget.attributes;
            this.$("div.vehicle").removeClass("vehicle_active");
            this.device_active = objeto.device_id.value;            
            this.$("[device_id = '" + this.device_active + "']").addClass("vehicle_active");
            this.status_device(this.$("div.vehicle[device_id = '" + this.device_active + "']"));
        },
    },

    start: function() {
        var data = this._super.apply(this, arguments);
        this.mirror = $("div#menu_vehicles").attr("mirror");
        this._initMap();
        return data;
    },
    _initMap: function() {
        this.idmap="maponline";
        this.localizaciones=new Array();
        this.vehicle_data = new Array();
        var self=create_map(this);
        this.obj_map=self.obj_map;
        this.positions();
    },
    positions: function(argument) {
        if(this.time  ==  undefined)    this.time = 1000;
        else if(this.time  ==  1000)    this.time = 20000;
        
        if($("div#maponline").length > 0)
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
    positions_search:function(argument){
        self=this;
        this._rpc({
            route: '/gpsmap/positions/' + this.mirror,
        }).then(function (data) {        
            self.data_positions=data;
            self.del_locations();
            self.positions_paint(argument);
        });        
    },
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
                    var position = vehicle_positions[iposition][0];
                    this.locationsMap(position)
                }
            }
        }
    },

    locationsMap: function(vehicle, type)
    {
        if(type  ==  undefined)     type = "icon";
        else                        type = "marker";

        if(vehicle["st"]  ==  undefined) vehicle["st"] = "1";
        if(vehicle["st"]  ==  "") vehicle["st"] = "1";
        if(vehicle["mo"]  ==  "map") vehicle["st"] = "1";

        var coordinates = {latitude: vehicle["lat"], longitude: vehicle["lon"]};
        var posicion = LatLng(coordinates);

        var icon_status = "";

        if(vehicle["sta"] == "alarm")                                icon_status = "alarm.png";
        if(vehicle["sta"] == "Online")                            icon_status = "car_signal1.png";
        if(vehicle["sta"] == "Offline" || vehicle["sta"] == "GPS Offline")
        {
            icon_status = "car_signal0.png";
            if(vehicle["ho"]  ==  1)                                icon_status = "car_signal1.png";
        }
        if(vehicle["sta"] ==  "ignitionOn")                        icon_status = "swich_on.png";
        if(vehicle["sta"] ==  "ignitionOff")                        icon_status = "swich_off.png";

        if(vehicle["psp"]<5 && vehicle["sta"] == "Online")        icon_status = "stop.png";
        if(vehicle["psp"]>5 && vehicle["sta"] == "Online")        icon_status = "car_signal1.png";

        $("div.vehicle[device_id = " + vehicle["idg"] + "]")
        .attr("date", vehicle["dat"])
        .attr("time", vehicle["tim"])
        .attr("speed", vehicle["psp"])
        .attr("latitude", vehicle["lat"])
        .attr("longitude", vehicle["lon"])
        .attr("position", vehicle["idp"])
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

        var marcador = markerMap(this.obj_map, posicion, icon);
        this.fn_localizaciones(marcador, vehicle);
    },
    status_device: function(obj)
    {
        if(this.device_active  ==  undefined)    this.device_active = 0;
        /*
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
            */
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
        //}
    },   
    func_odometer_speed: function (data)
    {
        var vel = data*16/10-110;  // 15            
        $("path.speed").attr({"transform":"rotate("+ vel +" 250 250)"});
    },       
    del_locations: function ()
    {
        var idvehicle;
        var iposiciones;
        if(_.size(this.localizaciones)>0)
        {
            for(idvehicle in this.localizaciones)
            {
                var positions_vehicle = this.localizaciones[idvehicle];
                if(positions_vehicle.length > 0)
                {
                    for(iposiciones in positions_vehicle)
                    {
                        this.localizaciones[idvehicle][iposiciones].setVisible(false);
                        this.localizaciones[idvehicle][iposiciones].setMap(null);
                    }
                }
            }
        }
    },   
    fn_localizaciones: function(position, vehiculo)
    {
        var ivehiculo = vehiculo["idv"];
        if(this.localizaciones[ivehiculo]  ==  undefined)
        {
            this.localizaciones[ivehiculo] = Array(position);
            if(vehiculo["se"] != "simulator")        this.vehicle_data[ivehiculo] = Array(vehiculo)
        }
        else
        {
            this.localizaciones[ivehiculo].unshift(position);
            if(vehiculo["se"] != "simulator")     this.vehicle_data[ivehiculo].unshift(vehiculo)
        }
    },     
});

export default publicWidget.registry.gpsmapMirror;
