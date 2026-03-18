from odoo import fields, models
import requests
import re

class ResConfigSettings(models.TransientModel):
    _inherit = ['res.config.settings']

    sync_devices = fields.Boolean(config_parameter='gpsmap.sync_devices')
    google_map_api_key = fields.Char(size = 50, config_parameter='gpsmap.google_map_api_key')
    gpsmap_host = fields.Char(size = 50, config_parameter='gpsmap.host')
    gpsmap_user = fields.Char(size = 50, config_parameter='gpsmap.user')
    gpsmap_pass = fields.Char(size = 50, config_parameter='gpsmap.pass')

    