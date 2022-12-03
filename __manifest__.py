{
    'name' : 'GPSMap',
    'price' : '0.0',
    'currency' : 'EUR',
    'images': ['static/description/map_online.png'],
    'author': "SolesGPS :: Eduardo Vizcaino",
    'category': 'Human Resources/Fleet GPS',
    "version": "15.0.0.0.0",
    'website' : 'https://odoo.solesgps.com:8069',
    'summary' : 'Locate the satellite coordinates that your GPS devices throw. Save that information here and see it on the map.',
    'description' : """
GPS DEVICES
=====================================
With this module, we will help you to manage your GPS devices, with which you will be able to see the vehicles of your fleet on a map.

Main features
-------------
* Add GPS devices and relate them to the vehicles.
* Geolocate your vehicles on the map, minute by minute.
* Make a simulation of the geolocation history.
* Generates reports with speed, fuel, mileage.
""",
    'depends': [
        'fleet',
    ],
    'data': [
        # DATA
        'data/fleet_vehicle_model_brand.xml',
        'data/fleet_vehicle_model.xml',
        'data/gps_protocol.xml',
        'data/gps_commands.xml',
        'data/ir_config_parameter.xml',
        'data/ir_cron.xml',

        'security/security.xml',
        'security/ir.model.access.csv',

        # VIEW
        'views/assets_backend.xml',
        'views/fleet_vehicle_odometer.xml',
        'views/fleet_vehicle.xml',
        'views/gps_alerts.xml',
        'views/gps_commands.xml',
        'views/gps_devices.xml',
        'views/gps_geofences.xml',
        'views/gps_positions.xml',
        'views/gpsmaps_maponline.xml',
        'views/menuitem.xml',
        
        'views/res_config_settings_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            '/gpsmap/static/js/google.js',
            '/gpsmap/static/js/maplabel.js',
            '/gpsmap/static/js/AbstractAction.js',
            '/gpsmap/static/js/index.js',
        ],
        'web.assets_qweb': [
            'gpsmap/static/xml/*.xml',
        ],        
    },    
    'demo': ['data/demo.xml'],
    #'qweb': ['static/xml/*.xml'],
    'installable': True,
    'application': True,
}
