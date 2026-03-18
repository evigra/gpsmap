import json, datetime, pytz
from odoo import fields, models, http, _
from odoo.http import request


class controller_gpsmap(http.Controller):

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
                position = pos.js_positions(vehicle, pos)

                if(pos.deviceid.id>0):
                    positions[pos.deviceid.id] = {0: position}                
        return {'positions': positions}

