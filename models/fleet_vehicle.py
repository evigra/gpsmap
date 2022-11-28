from odoo import fields, models


class vehicle(models.Model):
    _inherit = "fleet.vehicle"
    
    image_vehicle = fields.Selection([
        ('01', 'Gray Vehicle'),
        ('02', 'Red Vehicle'),
        ('03', 'Gray van'),
        ('04', 'Gray van'),
        ('05', 'White truck'),
        ('06', 'White van'),
        ('07', 'Blue van'),
        ('30', 'Moto'),
        ('90', 'Black Phone'),
        ('91', 'Blue  Phone'),
        ('92', 'Green Phone'),
        ('93', 'Red  Phone')
        ], 'Img GPS', default = '01', help = 'Image of GPS Vehicle', required = True)
    temporal_id = fields.Many2one('res.partner', 'temporal')
    economic_number = fields.Char('Economic Number', size = 50)
    speed = fields.Char(default = 100, size = 3)
    motor = fields.Boolean('Motor', default = True, tracking = True)
    gps1_id = fields.Many2one('gps_devices', ondelete = 'set null', string = "GPS", index = True)
    positionid = fields.Many2one('gps_positions', ondelete = 'set null', string = "Position", index = True)

    def get_last_vehicle_position(self):
        positions_arg = [('positionid', '!=', False)]
        vehicles = self.search(positions_arg)
        positions = {}
        for vehicle in vehicles:
            pos = vehicle["positionid"]

            totalDistance = int(pos.totalDistance/1000)

            position = {
                "idv": vehicle["id"],
                "idg": pos.deviceid.id,
                "nam": vehicle["name"],
                "lic": vehicle["license_plate"],
                "ima": vehicle["image_vehicle"],
                "vsp": vehicle["speed"],
                "oun": vehicle["odometer_unit"],
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
                "dto": totalDistance,
                "cou": pos.course,
                "bat": pos.batery,
            }
            if(pos.deviceid.id>0):
                positions[pos.deviceid.id] = {0: position}
        return positions