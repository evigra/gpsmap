from odoo import fields, models


class services(models.Model):
    _inherit = "fleet.vehicle.log.services"
class contract(models.Model):
    _inherit = "fleet.vehicle.log.contract"
class vehicle_model(models.Model):
    _inherit = "fleet.vehicle.model"
class vehicle_model_brand(models.Model):
    _inherit = "fleet.vehicle.model.brand"
