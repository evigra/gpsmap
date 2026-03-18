from odoo import fields, models
import requests
import re

class ResConfigSettings(models.TransientModel):
    _inherit = ['res.config.settings']

    sync_devices = fields.Boolean(config_parameter='gpsmap.sync_devices')
    