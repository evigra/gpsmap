from odoo import fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = ['res.config.settings']

    sync_devices = fields.Boolean(config_parameter='gpsmap.sync_devices')
