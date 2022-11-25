import xmlrpc.client
import datetime, time
from odoo import api, fields, models


class gps_devices(models.Model):
    _name = "gps_devices"
    _description = 'GPS Devices'
    _order = "name DESC"

    name = fields.Char('Name', size=128)
    company_id = fields.Many2one('res.company', string='Company', default=lambda self: self.env.user.company_id, required=True)   
    positionid = fields.Many2one('gps_positions', ondelete = 'set null', string = "Position", index = True)
    uniqueid = fields.Char('IMEI', size = 128)
    icc = fields.Char('ICC', size = 30)
    phone = fields.Char('Phone', size = 128)
    model = fields.Char('Model', size = 128)
    lastupdate = fields.Datetime('Lastupdate')
    solesgps_id = fields.Integer()

    def write(self, vals):
        return super().write(self.save(vals))

    @api.model
    def create(self, vals):
        return super().create(self.save(vals))

    def _get_session_information(self):
        solesgps_host = self.env['ir.config_parameter'].get_param('solesgps_host')
        solesgps_user = self.env['ir.config_parameter'].get_param('solesgps_user')
        solesgps_pass = self.env['ir.config_parameter'].get_param('solesgps_pass')
        solesgps_db = self.env['ir.config_parameter'].get_param('solesgps_db')

        common = xmlrpc.client.ServerProxy('{}/xmlrpc/2/common'.format(solesgps_host))
        solesgps_uid = common.authenticate(solesgps_db, solesgps_user, solesgps_pass, {})
        solesgps_models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(solesgps_host))

        return (solesgps_models, solesgps_db, solesgps_uid, solesgps_pass)

    def save(self, vals):
        params = self.env['ir.config_parameter'].sudo()
        sync_devices = params.get_param('gpsmap.sync_devices', default = False)

        if(("positionid" not in vals or vals["positionid"]==False) and sync_devices):            
            solesgps_models, solesgps_db, solesgps_uid, solesgps_pass = self._get_session_information()
            if self.solesgps_id>0:
                solesgps_models.execute_kw(solesgps_db, solesgps_uid, solesgps_pass,'tc_devices', 'write', [[self.solesgps_id],vals])
            else:
                vals["solesgps_id"] = solesgps_models.execute_kw(solesgps_db, solesgps_uid, solesgps_pass, 'tc_devices', 'create', [vals])
        return vals
