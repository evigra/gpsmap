var localizaciones = new Array();
var vehicle_data = new Array();
var simulation_action = "stop";
var isimulacion = 1;

async function create_map(self)
{    
    if(self.idmap  ==  undefined)   self.idmap = "maponline";

    var directionsService;

    var mapOptions = new Object();
    var data_return = new Object();

    mapOptions.zoom = 17;
    mapOptions.center = {
        lat: 19.057522756727606,
        lng: -104.29785901920393
    };

    mapOptions.mapId= window.GOOGLE_MAP_ID;
    mapOptions.minZoom= 3;
    mapOptions.maxZoom= 20;
    mapOptions.zoomControl = true;
    mapOptions.fullscreenControl = false;
    //mapOptions.mapTypeControl = true;
    mapOptions.mapTypeId = google.maps.MapTypeId.ROADMAP;
    mapOptions.ScaleControl = {position: google.maps.ControlPosition.TOP_RIGHT}
    mapOptions.RotateControlOptions = {position: google.maps.ControlPosition.TOP_RIGHT}
    mapOptions.zoomControlOptions = {position: google.maps.ControlPosition.TOP_LEFT};
    mapOptions.streetViewControlOptions = {position: google.maps.ControlPosition.TOP_RIGHT}
    
    if(self.$("#" + self.idmap).length==1)
        var mapC = self.$("#" + self.idmap);
    else
        var mapC = $("#" + self.idmap);
        const { Map } = await google.maps.importLibrary("maps");

        self.obj_map = new Map(mapC.get(0), mapOptions);
        
        var trafficLayer = new google.maps.TrafficLayer();
        trafficLayer.setMap(self.obj_map);
    
    return self;
}

function markerMap(map, position, vehicle, markerOptions)
{
    if(markerOptions  ==  undefined)    var markerOptions = new Object();

    markerOptions.position = position;
    markerOptions.map = map;
    
    if(vehicle != undefined)
    {
        const svgIcon = document.createElement("div");
        const truck = `
            <rect x="260" y="158" width="80" height="70" rx="12" fill="`+ vehicle["col"] +`" stroke="#444" stroke-width="14"/>
            <rect x="270" y="123" width="60" height="35" rx="12" fill="`+ vehicle["col"] +`" stroke="#444" stroke-width="14"/>
            <rect x="260" y="248" width="80" height="230" rx="12" fill="#d9d9d9" stroke="#444" stroke-width="14"/>
        `;    

        const car = `
            <rect x="250" y="200" width="100" height="200" rx="20" fill="`+ vehicle["col"] +`" stroke="#444" stroke-width="14"/>
            <rect x="260" y="260" width="80" height="80" rx="20" opacity="0.4" fill="#d9e6ff" stroke="#444" stroke-width="14"/>

            <rect x="260" y="180" width="35" height="35" rx="8" fill="#ffd966"/>
            <rect x="310" y="180" width="35" height="35" rx="8" fill="#ffd966"/>
            <rect x="260" y="385" width="35" height="35" rx="8" fill="#ff0000"/>
            <rect x="310" y="385" width="35" height="35" rx="8" fill="#ff0000"/>
        `;    

        const backhoe = `
            <rect x="200" y="320" width="30" height="70" rx="20" fill="#2f2f2f" stroke="#111" stroke-width="10"/>
            <rect x="350" y="320" width="30" height="70" rx="20" fill="#2f2f2f" stroke="#111" stroke-width="10"/>

            <rect x="230" y="220" width="15" height="35" rx="20" fill="#2f2f2f" stroke="#111" stroke-width="10"/>
            <rect x="335" y="220" width="15" height="35" rx="20" fill="#2f2f2f" stroke="#111" stroke-width="10"/>

            <rect x="260" y="220" width="60" height="90" rx="20" fill="#f4b400" stroke="#a67c00" stroke-width="12"/>
            <rect x="245" y="300" width="90" height="90" rx="20" fill="#f4b400" stroke="#a67c00" stroke-width="12"/>
            <rect x="215" y="165" width="150" height="40" rx="20" fill="#f4b400" stroke="#a67c00" stroke-width="12"/>

            <rect x="255" y="440" width="70" height="40" rx="12" fill="#f4b400" stroke="#a67c00" stroke-width="10"/>
            <rect x="280" y="395" width="25" height="70" rx="12" fill="#f4b400" stroke="#a67c00" stroke-width="10"/>
        `;
    
        var img_vehicle = car;
        
        if(vehicle["ima"]=="truck")
            img_vehicle = truck;
        if(vehicle["ima"]=="backhoe")
            img_vehicle = backhoe;

        var red_superior = Math.ceil(vehicle["cou"] / 10) * 10;
        var red_inferior = Math.floor(vehicle["cou"] / 10) * 10;

        var frame = (red_superior + red_inferior) / 2;


        svgIcon.innerHTML = `
            <div style="position:absolute; transform:translate(-50%, -50%);">            
            <svg width="100" height="100" viewBox="0 0 600 600"
                xmlns="http://www.w3.org/2000/svg">
                <g transform="rotate(`+ frame +` 300 300)">
                    `+ img_vehicle +`
                </g>
                <text
                    fill="#8B0000"
                    stroke="#ffffff"
                    stroke-width="25"
                    stroke-linejoin="round"
                    paint-order="stroke"
                    text-anchor="middle"
                    font-size="80"
                    font-weight="bold"
                    y="560"
                    x="300"
                    >                             
                    `+ vehicle["eco"] +`
                </text>
            </svg>     
            </div>       
        `;
        markerOptions.content = svgIcon;
        markerOptions.title = vehicle["eco"];
    }    
    
    var marker2 = new google.maps.marker.AdvancedMarkerElement(markerOptions);
    return marker2
}
function LatLng(co)
{
    return new google.maps.LatLng(co.latitude,co.longitude);
}  


function positions_paint()
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
}



function locationsMap(object, vehicle, type)
{
    var obj_map         =object["obj_map"];
    var device_active   =object["device_active"];


    if(type  ==  undefined)     type = "icon";
    else                        type = "marker";

    if(vehicle["st"]  ==  undefined)    vehicle["st"] = "1";
    if(vehicle["st"]  ==  "")           vehicle["st"] = "1";
    if(vehicle["mo"]  ==  "map")        vehicle["st"] = "1";

    var coordinates = {latitude: vehicle["lat"], longitude: vehicle["lon"]};
    var posicion = LatLng(coordinates);

    var icon_status = "";

    if(vehicle["sta"] == "alarm")              icon_status = "alarm.png";
    if(vehicle["sta"] == "Online")             icon_status = "car_signal1.png";
    if(vehicle["sta"] == "Offline" || vehicle["sta"] == "GPS Offline")
    {
        icon_status = "car_signal0.png";
        if(vehicle["ho"]  ==  1)               icon_status = "car_signal1.png";
    }
    if(vehicle["sta"] ==  "ignitionOn")        icon_status = "swich_on.png";
    if(vehicle["sta"] ==  "ignitionOff")       icon_status = "swich_off.png";

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

    if(type  ==  "icon")
    {
        var marcador;
        if(vehicle["cou"] == undefined)        vehicle["cou"] = 1;
    }
    if(device_active  ==  vehicle["idg"] && vehicle["se"]  ==  undefined || vehicle["se"]  ==  "simulator")
    {
    
        
        obj_map.panTo(posicion);

        //this.centerMap(posicion);
        func_odometer(vehicle);
    }
    
    var marcador = markerMap(obj_map, posicion, vehicle);
    //this.fn_localizaciones(marcador, vehicle);

    data={  
        "vehicle":vehicle,
        "marcador":marcador,
        
    }
    return data
}


function func_odometer_speed(data)
{
    var vel = data*16/10-110;  // 15            
    $("path.speed").attr({"transform":"rotate("+ vel +" 250 250)"});
}  
function func_odometer_gas(data)
{
    var alt = data*12/10-12;    // 10
    $("path.gas").attr({"transform":"rotate("+ alt +" 250 250)"});
}
function func_odometer_batery(data)
{
    var bat = data*12/10-110;    //10
    $("path.batery").attr({"transform":"rotate("+ bat +" 250 250)"});
}
function func_odometer(item)
{
    
    func_odometer_speed(item["psp"]);
    func_odometer_gas(item["gas"]);
    func_odometer_batery(item["bat"]);

    this.$("#datetime").html(item["tde"]);
    this.$("#time").html(item["tim"]);
    this.$("#date").html(item["dat"]);
    this.$("#distance").html(item["dto"]);
    this.$("#unity").html(item["oun"]);

    var tablero1 = "";
    var tablero2 = "";

    if(item["sta"]  ==  "GPS Offline" || item["sta"]  ==  "Offline")    //status
        tablero1+= item["sta"] + " :: ";
    if(item["sta"]  ==  "GPS Offline")   //fixtime
        tablero1="(" +item["tfi"] + ") " + tablero1;

    if(!(item["eve"]  ==  undefined || item["eve"]  ==  false || item["eve"]  ==  "false"))    //event
        tablero1+= " " + item["eve"];

    if(this.contentTemplate  ==  "gpsmaps_streetonline") this.execute_streetMap(item);

    $("#tableros").html(tablero1);
}


function fn_localizaciones(position, vehiculo)
{
    var ivehiculo = vehiculo["idv"];
    if(localizaciones[ivehiculo]  ==  undefined)
    {
        localizaciones[ivehiculo] = Array(position);
        if(vehiculo["se"] != "simulator")        vehicle_data[ivehiculo] = Array(vehiculo);
    }
    else
    {
        localizaciones[ivehiculo].unshift(position);
        if(vehiculo["se"] != "simulator")     vehicle_data[ivehiculo].unshift(vehiculo);
    }
}

function fn_del_locations()
{    
    var idvehicle;
    var iposiciones;
    if(localizaciones.length>0)
    {
        for(idvehicle in localizaciones)
        {
            var positions_vehicle = localizaciones[idvehicle];
            if(positions_vehicle.length > 0)
            {
                for(iposiciones in positions_vehicle)
                {
                    localizaciones[idvehicle][iposiciones].setMap(null);
                }
            }
        }
    }
}