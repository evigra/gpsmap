from odoo import fields, models


class gps_protocol(models.Model):
    _name = "gps_protocol"
    _description = 'GPS Port'
    _order = "port ASC"

    name = fields.Char(size = 15)
    port = fields.Char(size = 5)
