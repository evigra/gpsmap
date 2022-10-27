from odoo import fields, models
import pytz


class gps_commands(models.Model):
    _name = "gps_commands"
    _description = 'GPS Commands'
    _order = "name DESC"

    name = fields.Char('Name', size = 50)
    protocol_id = fields.Many2one('gps_protocol', ondelete = 'set null')
    command = fields.Char(size = 50)
    sample = fields.Char(size = 50)
    optional = fields.Boolean()
    priority = fields.Integer()
