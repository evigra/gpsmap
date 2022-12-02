from odoo import fields, models, api


class gps_alerts(models.Model):
    _name = "gps_alerts"
    _description = 'GPS Alerts'

    name = fields.Char('Name', size = 75 , required=True)
    description = fields.Char('Description', size = 150)
    vehicle_ids = fields.Many2many('fleet.vehicle', 'gps_alerts_vehicles_rel', 'vehicle_id', 'alert', string = 'Vehicles')
    geofence_ids = fields.Many2many('gps_geofences', 'gps_alerts_geofences_rel', 'geofence_id', 'alert', string = 'Geofences')
