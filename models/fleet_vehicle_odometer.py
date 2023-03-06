from odoo import fields, models

class odometer(models.Model):
    _inherit = "fleet.vehicle.odometer"
    _order = "date ASC"
    activeTime = fields.Float('Active Time / hr', digits = (3, 2))

    def run_scheduler_set_odometer(self):
        for vehicle in self.env['fleet.vehicle'].search([]):
            
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
