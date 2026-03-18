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
        this.$("div#odometer").hide();
        return data;
    },
    _initMap: function() {
        this.idmap="maponline";
        //this.labels = new Array();
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
                    if(this.device_active>0)
                        this.status_device(this.$("div.vehicle[device_id = '" + this.device_active + "']"));
                }
            }
        }
    },

    locationsMap: function(vehicle, type)
    {

        var object={
            "obj_map":this.obj_map,
            //"":,
        };
        var data = locationsMap(object, vehicle, type)
        vehicle = data["vehicle"];
        var marcador = data["marcador"];


       fn_localizaciones(marcador, vehicle);
    },
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

                this.func_odometer_speed($(obj).attr("speed"));
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
    func_odometer_speed: function (data)
    {
        var vel = data*16/10-110;  // 15            
        $("path.speed").attr({"transform":"rotate("+ vel +" 250 250)"});
    },       
    del_locations: function ()
    {
        fn_del_locations();
    },   
    fn_localizaciones: function(position, vehiculo)
    {
        fn_localizaciones();    
    },     
});

export default publicWidget.registry.gpsmapMirror;
