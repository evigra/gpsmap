import xmlrpc.client
import datetime, time
from odoo import api, fields, models
from odoo.exceptions import UserError

class gps_devices(models.Model):
    _name = "gps_devices"
    _description = 'GPS Devices'
    _order = "name DESC"

    name = fields.Char('Name', size=128)
    positionid = fields.Many2one('gps_positions', ondelete = 'set null', string = "Position", index = True)
    protocolid = fields.Many2one('gps_protocol', ondelete = 'set null', string = "Protocol", index = True)
    uniqueid = fields.Char('IMEI', size = 128)
    port = fields.Char('Port', size = 4)
    phone = fields.Char('Phone', size = 128)
    model = fields.Char('Model', size = 128)
    lastupdate = fields.Datetime('Lastupdate')
    course = fields.Float(digits = (3, 2))
    solesgps_id = fields.Integer('Traccar ID')
    engine = fields.Boolean('Motor', default=True)
    commands = fields.Char('Commands', size = 256)

    @api.model
    def create(self, vals):
        vals=self._sync_to_traccar(vals)
        return super().create(vals)

    def write(self, vals):
        if("positionid" in vals and vals["positionid"]): 
            return super().write(vals) 
        vals=self._sync_to_traccar(vals)
        return super().write(vals)

    def _sync_to_traccar(self, vals):
        params = self.env['ir.config_parameter'].sudo()
        sync_devices = params.get_param('gpsmap.sync_devices')

        #sync_devices = False
        if(not sync_devices):
            return vals

        host, session = self.env['gpsmap'].sudo()._get_session_information()
        url = f"{host}/devices"

        headers = {
            "Content-Type": "application/json"
        }

        try:
            if self.solesgps_id>0:
                if "uniqueid" not in vals: 
                    vals["uniqueid"]=self.uniqueid
                if "name" not in vals: 
                    vals["name"]=self.name
                if "phone" not in vals: 
                    vals["phone"]=self.phone
                if "model" not in vals: 
                    vals["model"]=self.model
            
            params = {"uniqueId": vals["uniqueid"]}
            response = session.get(url, params=params)

            data = {
                "name": vals["name"],
                "uniqueId": vals["uniqueid"],
                "phone": vals["phone"] or "",
                "model": vals["model"] or "",
                "disabled": False
            }

            if response.status_code == 200 and response.json():
                # ACTUALIZAR DEVICE
                device_id = response.json()[0].get("id")
                update_url = f"{url}/{device_id}"

                data["id"] = device_id
                vals["solesgps_id"] = device_id

                response = session.put(
                    update_url,
                    json=data,
                    headers=headers                    
                )
                if response.status_code not in (200, 204):
                    raise UserError(f"Error actualizando Traccar: {response.text}")
            else:       
                # CREAR DEVICE
                response = session.post(
                    url,
                    json=data,
                    headers=headers                    
                )
                if response.status_code not in (200, 201):
                    raise UserError(f"Error Traccar: {response.text}")
                result = response.json()

                device_id  = result.get("id")
                vals["solesgps_id"] = device_id

            response = session.get(
                f"{host}/commands/types",
                params={"deviceId": device_id},
                headers=headers                    
            )

            result = response.json()
            vals["commands"]=result

            return vals
        
        except requests.exceptions.RequestException as e:
            raise UserError(f"Error conectando con Traccar: {str(e)}")
