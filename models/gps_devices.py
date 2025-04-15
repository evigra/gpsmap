"""

import xmlrpc.client

root = 'http://%s:%d/xmlrpc/' % (HOST, PORT)

uid = xmlrpc.client.ServerProxy(root + 'common').login(DB, USER, PASS)
print("Logged in as %s (uid: %d)" % (USER, uid))

# Create a new note
sock = xmlrpc.client.ServerProxy(root + 'object')
args = {
    'color' : 8,
    'memo' : 'This is a note',
    'create_uid': uid,
}
note_id = sock.execute(DB, uid, PASS, 'note.note', 'create', args)


"""



import xmlrpc.client
import datetime, time
from odoo import api, fields, models

#from odoo.tools.misc import formatLang, format_date, get_lang
import re

class gps_devices(models.Model):
    _name = "gps_devices"
    _description = 'GPS Devices'
    _order = "name DESC"

    name = fields.Char('Name', size=128)
    company_id = fields.Many2one('res.company', string='Company', default=lambda self: self.env.company, required=True)
    positionid = fields.Many2one('gps_positions', ondelete = 'set null', string = "Position", index = True)
    protocolid = fields.Many2one('gps_protocol', ondelete = 'set null', string = "Protocol", index = True)
    uniqueid = fields.Char('IMEI', size = 128)
    icc = fields.Char('ICC', size = 30)
    phone = fields.Char('Phone', size = 128)
    model = fields.Char('Model', size = 128)
    lastupdate = fields.Datetime('Lastupdate')
    solesgps_id = fields.Integer()
    engine = fields.Boolean('Motor', default=True)

    def write(self, vals):
        return super().write(self.save(vals))

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            return super().create(self.save(vals))

    def _get_session_information(self):
        solesgps_models = False
        solesgps_uid = False
        solesgps_host = self.env['ir.config_parameter'].get_param('solesgps_host')
        solesgps_user = self.env['ir.config_parameter'].get_param('solesgps_user')
        solesgps_pass = self.env['ir.config_parameter'].get_param('solesgps_pass')
        solesgps_db = self.env['ir.config_parameter'].get_param('solesgps_db')

        
        solesgps_host = 'http://server16.solesgps.com:7916/xmlrpc/'
        solesgps_db = "server16"
        solesgps_user="admin"
        solesgps_pass="admin"
        

        common = xmlrpc.client.ServerProxy(solesgps_host + "common")
        try:
            solesgps_uid = common.login(solesgps_db, solesgps_user, solesgps_pass)                
            solesgps_models = xmlrpc.client.ServerProxy(solesgps_host + '2/object')
            return (solesgps_models, solesgps_db, solesgps_uid, solesgps_pass)
        #except Exception:
        except re.error:
            if(solesgps_uid is False):
                raise UserError(_('Fallo el logueo'))
                print("Fallo el logueo #################")              
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
        else:
            if(not self.protocolid):
                protocol = self.env['gps_protocol'].search([["name","=",self.positionid.protocol]])
                vals["protocolid"]=protocol.id
        return vals
