import datetime
from odoo import api, fields, models
import hashlib


class gps_mirror(models.Model):
    _name = "gps_mirror"
    _description = 'GPS Mirror'
    _order = "end DESC"

    name = fields.Char(size = 32, default = '_get_hash')
    url = fields.Char(size = 150, default = '_get_hash')

    vehicle_ids = fields.Many2many('fleet.vehicle')
    start = fields.Date()
    end = fields.Date()

    @api.model
    def create(self, vals):
        if('name' not in vals):
            url = self.env['ir.config_parameter'].sudo().get_param('web.base.url')

            str2hash = datetime.datetime.utcnow()
            vals["name"]=hashlib.md5(str(str2hash).encode()).hexdigest()
            vals["url"]= url + '/gpsmap/mirror/' + vals["name"]

        return super().create(vals)
