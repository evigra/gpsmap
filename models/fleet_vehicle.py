from odoo import fields, models
from odoo.exceptions import UserError

import datetime, pytz, json, logging, warnings
_logger = logging.getLogger(__name__)


class vehicle(models.Model):
    _inherit = "fleet.vehicle"
    _order = "economic_number ASC"

    economic_number = fields.Char('Economic Number', size = 50)
    speed = fields.Char(default = 0, size = 3)
    active_time_today = fields.Integer()
    speeding = fields.Boolean(default = False)
    gpsoffline = fields.Boolean(default = False)
    alarm = fields.Boolean(default = False)
    ignition = fields.Boolean(default = False)
    gps1_id = fields.Many2one('gps_devices', ondelete = 'set null', string = "GPS", index = True)
    positionid = fields.Many2one('gps_positions', ondelete = 'set null', string = "Position", index = True)
    color_vehicle = fields.Selection([
        ('#0000ff', 'Blue'),
        ('#ff0000', 'Red'),
        ('#fff000', 'Yellow'),
        ('#ffffff', 'White'),
        ('#ffa500', 'Orange'),
        ('#000000', 'Black')
    ], 'Color GPS', default = '#0000ff', help = 'Color Vehicle', required = True)
    image_vehicle = fields.Selection([
        ('truck', 'Truck'),
        ('vehicle', 'Vehicle'),
        ('backhoe', 'Backhoe'),
        ], 'Img GPS', default = 'truck', help = 'Image of GPS Vehicle', required = True)


    def get_last_vehicle_position(self):
        positions_arg = [('positionid', '!=', False)]
        vehicles = self.search(positions_arg)
        positions = {}
        tz = pytz.timezone(self.env.user.tz) if self.env.user.tz else pytz.utc
        for vehicle in vehicles:
            pos = vehicle["positionid"]

            devicetime = fields.Datetime.context_timestamp(self, pos.devicetime)
            fixtime = fields.Datetime.context_timestamp(self, pos.fixtime)

            status=pos.status
            if(status in ("Online","Alarm")):
                time_now = datetime.datetime.utcnow()
                time_before = time_now - datetime.timedelta(minutes = 15)

                if(pos.devicetime < time_before):
                    status = "Offline"
                    pos.status="Offline"
            position = pos.js_positions(vehicle, pos)
            if(pos.deviceid.id>0):
                positions[pos.deviceid.id] = {0: position}
        return positions
 
    def run_scheduler_set_odometer(self):
        for vehicle in self.search([]):
            
            if(vehicle.odometer_unit=='miles'):
                type_distance = 1609.34
            else:
                type_distance = 1000

            self.create({
                "vehicle_id": vehicle.id,
                "value": int(vehicle.positionid.totalDistance) / type_distance,
                "date": vehicle.positionid.devicetime,                
                "activeTime": int(vehicle.active_time_today) / 60,
            })
            vehicle.active_time_today=0