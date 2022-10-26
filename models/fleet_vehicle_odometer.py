from odoo import fields, models
import pytz


class odometer(models.Model):
    _inherit = "fleet.vehicle.odometer"
    _order = "date ASC"
    activeTime = fields.Float('Active Time', digits = (3, 2))
