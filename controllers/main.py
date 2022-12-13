import json, datetime
from odoo import http, _
from odoo.http import request

class controller_gpsmap(http.Controller):
                
    @http.route('/gpsmap/mirror/<string:md5_mirror>', type='http', auth='public', website=True)
    def portal_gpsmap_mirror(self, md5_mirror):
        time_now = datetime.datetime.utcnow()
        env = request.env(context=dict(request.env.context, show_address=True, no_tag_br=True))
        mirror = env['gps_mirror'].sudo()

        data = mirror.search([
            '&','&',
            ('start', '<=', time_now),
            ('end', '>=', time_now),
            ('key', '=', md5_mirror),            
        ])
        return request.render("gpsmap.frontend_mirror", {'vehicles': data.vehicle_ids, 'mirror_account': md5_mirror})
        
    @http.route('/gpsmap/positions/<string:md5_mirror>', type='json', auth='none', methods=['POST','GET'])
    def portal_gpsmap_positions(self, md5_mirror):
        time_now = datetime.datetime.utcnow()
        env = request.env(context=dict(request.env.context, show_address=True, no_tag_br=True))
        mirror = env['gps_mirror'].sudo()

        data = mirror.search([
            '&','&',
            ('start', '<=', time_now),
            ('end', '>=', time_now),
            ('key', '=', md5_mirror),            
        ])
        positions = {}
        for vehicle in data.vehicle_ids:
            if(vehicle.positionid):
                pos = vehicle.positionid
                totalDistance = int(pos.totalDistance/1000)
                devicetime = pos.devicetime - datetime.timedelta(hours = 6)                
                position = {
                    "idv": vehicle.id,
                    "idg": pos.deviceid.id,
                    "nam": vehicle.name,
                    "lic": vehicle.license_plate,
                    "ima": vehicle.image_vehicle,
                    "vsp": vehicle.speed,
                    "oun": vehicle.odometer_unit,
                    "idp": pos.id,
                    "lat": pos.latitude,
                    "lon": pos.longitude,
                    "alt": pos.altitude,
                    "psp": pos.speed,
                    "tde": devicetime,
                    "dat": devicetime.strftime("%Y-%m-%d"),
                    "tim": devicetime.strftime("%H:%M"),
                    "tse": pos.servertime,
                    "tfi": pos.fixtime,
                    "sta": pos.status,
                    "eve": pos.event,
                    "gas": pos.gas,
                    "dis": pos.distance,
                    "dto" :totalDistance,
                    "cou": pos.course,
                    "bat": pos.batery,                    
                }
                if(pos.deviceid.id>0):
                    positions[pos.deviceid.id] = {0: position}                
        return {'positions': positions}
