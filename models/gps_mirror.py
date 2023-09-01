from odoo import api, fields, models     
import hashlib, datetime, pytz

class gps_mirror(models.Model):
    _name = "gps_mirror"
    _description = 'GPS Mirror'
    _order = "end DESC"

    name = fields.Char(size = 32)
    key = fields.Char(size = 32)
    url = fields.Char(size = 150)
    default_timezone = fields.Char(size = 150, string='Timezone', default=lambda self: self.env.user.tz or 'UTC')
    company_id = fields.Many2one('res.company', string='Company', default=lambda self: self.env.company, required=True)   

    vehicle_ids = fields.Many2many('fleet.vehicle')
    start = fields.Datetime()
    end = fields.Datetime()
    
    def write(self, vals):
        return super().write(self.save(vals))

    @api.model
    def create(self, vals):
        return super().create(self.save(vals))

    def save(self, vals):
        url = self.env['ir.config_parameter'].sudo().get_param('web.base.url')

        str2hash = datetime.datetime.utcnow()
        vals["key"]=hashlib.md5(str(str2hash).encode()).hexdigest()
        vals["url"]= url + '/gpsmap/mirror/' + vals["key"]

        return vals
        

    def get_positions_mirror(self, md5_mirror):        
        data = self.sudo().search([('key', '=', md5_mirror["key"])])
        positions = {}
                    
        for vehicle in data.vehicle_ids:
            if(vehicle.positionid):
                pos = vehicle.positionid

                position = {
                    "idv": vehicle.id,
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
                    "tde": pos.devicetime,
                    "dat": pos.devicetime.strftime("%Y-%m-%d"),
                    "tim": pos.devicetime.strftime("%H:%M"),
                    "tse": pos.servertime,
                    "tfi": pos.fixtime,
                    "sta": pos.status,
                    "eve": pos.event,
                    "gas": pos.gas,
                    "dis": pos.distance,
                    #"dto" :totalDistance,
                    "cou": pos.course,
                    "bat": pos.batery,

                }
                if(pos.deviceid.id>0):
                    positions[pos.deviceid.id] = {0: position}
                    
        return positions