from odoo import fields, models

class odometer(models.Model):
    _inherit = "fleet.vehicle.odometer"
    _order = "date ASC"
    activeTime = fields.Float('Active Time', digits = (3, 2))

    def run_scheduler_set_odometer(self):
        for vehicle in self.env['fleet.vehicle'].search([]):            
            if(vehicle.odometer_unit=='miles'):
                type_distance = 1.60934
            else:
                type_distance = 1.000
            if int(vehicle.positionid.totalDistance)>0:    
                self.create({
                    "vehicle_id": vehicle.id,
                    "value": int(vehicle.positionid.totalDistance) / type_distance,
                    "date": vehicle.positionid.devicetime,                
                    "activeTime": int(vehicle.active_time_today) / 60,
                    "unit":vehicle.odometer_unit
                })
                vehicle.active_time_today=0
