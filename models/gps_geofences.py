from odoo import fields, models, api


class gps_geofences(models.Model):
    _name = "gps_geofences"
    _description = 'GPS Geofence'

    name = fields.Char('Name', size = 75 , required=True)
    map = fields.Char('Name', size = 75)
    description = fields.Char('Description', size = 150)
    area = fields.Text('area')
    attributes = fields.Text('Attributes')
    color = fields.Selection([
        ('green', 'Green'),
        ('red', 'Red'),
        ('blue', 'Blue'),
        ('black', 'Black'),
        ('grey', 'Grey'),
        ('yellow', 'Yellow'),
        ], 'Color', default = 'green', help = 'Color of geofence')
    hidden = fields.Boolean('Hidden')
    company_ids = fields.Many2many('res.company', 'gps_geofences_res_company_rel', 'user_id', 'cid', string = 'Companies', default = lambda self: self.env.user.company_id)

    @api.model
    def create(self, vals):
        rec = super().create(self.save(vals))
        return rec

    def write(self, vals):
        rec = super().write(self.save(vals))
        return rec

    def save(self, vals):
        vals["attributes"] = {}
        if("color" in vals):
            vals["attributes"]["color"] = vals["color"]

        #vals["attributes"] = json.dumps(vals["attributes"])

        return vals

    def geofences(self):
        alerts_obj = self.env['gpsmap.geofence_device']

        alerts_args = []
        alerts_data = alerts_obj.search(alerts_args, offset = 0, limit = None, order = None)

        #if len(alerts_data)>0:
            #for alerts in alerts_data:
            #    print('ALERT =  =  = =================',alerts.name)

        return alerts_data
