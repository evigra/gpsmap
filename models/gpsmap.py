import xmlrpc.client
import datetime, time
from odoo import api, fields, models
from odoo.exceptions import UserError
import requests
import re

class gpsmap(models.Model):
    _name = "gpsmap"
    _description = 'Conection with server'

    def _get_session_information(self):
        host = self.env['ir.config_parameter'].sudo().get_param('gpsmap.host')
        user = self.env['ir.config_parameter'].sudo().get_param('gpsmap.user')
        password = self.env['ir.config_parameter'].sudo().get_param('gpsmap.pass')

        if not host or not user or not password:
            raise UserError("Incomplete Traccar configuration")

        host = f"{host}/api"
        session = requests.Session()

        try:
            session.post(f"{host}/session", data={
                "email": user,
                "password": password
            })        
            
            return host, session  
        except requests.exceptions.RequestException as e:
            raise UserError(f"Error connecting to Traccar: {str(e)}")
    