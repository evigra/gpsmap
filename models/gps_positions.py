import xmlrpc.client
import time, string, pytz
from datetime import datetime, timezone, timedelta
#from pytz import timezone, UTC
import json, random
from odoo import fields, models, _
from odoo.tools import format_datetime
from odoo.tools.misc import formatLang, format_date, get_lang
from odoo.exceptions import ValidationError 
from odoo.exceptions import UserError
import re

class gps_positions(models.Model):
    _name = "gps_positions"
    _description = 'GPS Positions'
    _order = "devicetime DESC"
    _pointOnVertex = ""

    protocol = fields.Char(size = 15)
    attributes = fields.Char(size = 1000)
    network = fields.Char(size = 1000)
    deviceid = fields.Many2one('gps_devices', ondelete = 'set null', string = "GPS Device", index = True)
    vehicleid = fields.Many2one('fleet.vehicle', ondelete = 'set null', string = "Vehicle", index = True)
    servertime = fields.Datetime('Server Time')
    devicetime = fields.Datetime(string = "Device Time", store=True)
    fixtime = fields.Datetime('Error Time')
    latitude = fields.Float(digits = (3, 6))
    longitude = fields.Float(digits = (3, 6))
    altitude = fields.Float(digits = (6, 2))
    speed = fields.Float(digits = (3, 2), group_operator='max')
    course = fields.Float(digits = (3, 2))
    batery = fields.Float(digits = (3, 2))
    distance = fields.Float(digits = (7, 3), group_operator='max')
    totalDistance = fields.Float(digits = (10, 3), group_operator='max')
    gas = fields.Float('Gas', digits = (5, 2), group_operator='max')
    ignition = fields.Boolean(default = False)
    speeding = fields.Boolean(default = False)
    gpsoffline = fields.Boolean(default = False)
    alarm = fields.Boolean(default = False)
    valid = fields.Boolean(default = False)
    status = fields.Char('Type', size = 50)
    event = fields.Char(size = 70)
    active_time = fields.Float(string = 'Active Time', digits = (3, 2))
    offline_time = fields.Integer('Offline Time')

    def get_distance(self, json_vals):
        data = 0
        if("distance" in json_vals and json_vals["distance"]):
            data=json_vals["distance"] / 1000
        return round(data,2)

    def get_totalDistance(self, json_vals):
        data = self.get_sensor(json_vals, ("totalDistance",""))  
        if data: 
            data = data / 1000
        return data

    def get_batery(self, json_vals):
        data = self.get_sensor(json_vals, ("batteryLevel",""))
        if not data: 
            data = 0

        return data
    def get_sensor(self, json_vals, sensores):
        for s in sensores:
            val = json_vals.get(s)
            if val is not None:
                return val

    def get_gas(self, json_vals):
        data = self.get_sensor(json_vals, ("fuel", "fuel1", "fuel2", "io3", "adc1", "analog1"))
        if not data: 
            data = 0
        return round(data,2)

    def get_ignition(self, json_vals):
        data = self.get_sensor(json_vals, ("ignition", ""))
        if not data: 
            data = False
        return data

    def get_event(self, json_vals, gps_position):
        data = "Stopped"

        if("alarm" in json_vals and json_vals["alarm"]):
            data = json_vals["alarm"]
        elif("motion" in json_vals and json_vals["motion"] and float(gps_position["speed"])>2):
            data = "Moving"
        return data

    def get_event_speeding(self, vals,gps_position, fleet):
        vals["speeding"] = False

        if(fleet.odometer_unit=='miles'):
            vals["speed"] = 1.15 * float(gps_position["speed"])
        else:
            vals["speed"] = 1.852 * float(gps_position["speed"])
        
        if(int(fleet.speed)>0 and int(gps_position["speed"]) > int(fleet.speed)):        
            vals["event"] ="Speeding"
            vals["speeding"] = True
        else:
            vals["speeding"] = False
            
        return vals
    
    def get_status(self, gps_position, json_vals,data, fleet):
        time_now = datetime.now(timezone.utc)

        time_before = time_now - timedelta(minutes = 30)
        time_after = time_now + timedelta(minutes = 30)

        data["servertime"] = datetime.fromisoformat(gps_position["serverTime"]) 
        data["devicetime"] = datetime.fromisoformat(gps_position["deviceTime"]) 
        data["fixtime"] = datetime.fromisoformat(gps_position["fixTime"])
        
        data["status"]="Offline"
        data["gpsoffline"] = False
        data["alarm"] = False
        
        if("alarm" in json_vals and json_vals["alarm"]):
            data["status"] = "Alarm"                        
            data["alarm"] = True     
                            
        elif(data["devicetime"] < time_before):
            data["status"] = "Offline"
        elif(time_before < data["devicetime"] and data["devicetime"] < time_after and data["fixtime"]<time_before):
            data["status"] = "GPS Offline"            
            data["gpsoffline"] = True                 
        elif(time_before < data["devicetime"] and data["devicetime"] < time_after):
            data["status"] = "Online"

        return data

    def last_positions(self):
        host, session = self.env['gpsmap'].sudo()._get_session_information()
        try:
            to_time = fields.Datetime.now()
            params = {
                "from": to_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "to": to_time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
            
            requests = session.get(f"{host}/positions", params=params)
            if requests.status_code != 200:
                raise Exception(f"Error getting positions: {requests.text}")
            return requests.json()
        except requests.exceptions.RequestException as e:
            raise UserError(f"Error obtaining the latest positions: {str(e)}")


    def run_scheduler_get_position(self):
        positions = self.last_positions()
        try:
            for gps_position in positions:
                device = self.env['gps_devices'].search([["solesgps_id","=",gps_position["deviceId"]]])
                fleet = self.env['fleet.vehicle'].search([["gps1_id","=",device.id]])

                json_vals=gps_position["attributes"]

                if int(gps_position["course"]) ==0:
                    course = device.course 
                else:
                    course          = gps_position["course"]

                data={}
                #data["distance"]        = self.get_distance(json_vals)
                data["gas"]             = self.get_gas(json_vals)
                data["totalDistance"]   = self.get_totalDistance(json_vals)
                data["batery"]          = self.get_batery(json_vals)
                data["event"]           = self.get_event(json_vals, gps_position)
                data["ignition"]        = self.get_ignition(json_vals)
                
                data["vehicleid"]       = fleet.id
                data["deviceid"]        = device.id

                data["course"]          = course
                data["valid"]           = gps_position["valid"]
                data["altitude"]        = gps_position["altitude"]
                data["protocol"]        = gps_position["protocol"]
                data["latitude"]        = round(gps_position["latitude"],6)
                data["longitude"]       = round(gps_position["longitude"],6)
                
                data = self.get_status(gps_position, json_vals, data, fleet)
                data = self.get_event_speeding(data, gps_position, fleet)

                data["servertime"]      = data["servertime"].strftime("%Y-%m-%d %H:%M:%S") 
                data["devicetime"]      = data["devicetime"].strftime("%Y-%m-%d %H:%M:%S")
                data["fixtime"]         = data["fixtime"].strftime("%Y-%m-%d %H:%M:%S")

                data["attributes"]      = gps_position["attributes"]
                data["network"]         = gps_position["network"]

                data_devicetime = datetime.strptime(data["devicetime"], "%Y-%m-%d %H:%M:%S")

                if device.lastupdate:
                    time_delta = data_devicetime - device.lastupdate
                    time = time_delta.total_seconds() / 60
                else:
                    time =0

                data["active_time"]=0
                if (fleet.positionid.devicetime is False or fleet.positionid.devicetime < data_devicetime) and data["speed"]>5:
                    if time<4 :
                        data["active_time"] = time
                    else: 
                        data["active_time"] = 3
                        data["offline_time"] = time

                position = self.create(data)

                data_fleet={
                    "positionid":           position,
                    "ignition":             data["ignition"],                    
                    "speeding":             data["speeding"],
                    "gpsoffline":           data["gpsoffline"],    
                    "active_time_today":    fleet.active_time_today + data["active_time"]
                }

                if fleet.positionid.devicetime is False or fleet.positionid.devicetime < data_devicetime:
                    data_device={
                        "positionid":position,
                        "lastupdate":data["devicetime"],
                        "course":gps_position["course"]
                    }
                    if not device.protocolid:
                        protocol = self.env['gps_protocol'].search([["name","=",gps_position["protocol"]]])
                        data_device["protocolid"]=protocol
                        data_device["port"]=protocol.port

                    device.write(data_device)
                    data_fleet["positionid"]=position

                fleet.write(data_fleet)

        except requests.exceptions.RequestException as e:
            raise UserError(f"Error processing positions: {str(e)}")



    def js_positions_history(self,arg):        
        user_tz = pytz.timezone(self.env.user.tz or 'UTC')
        data_arg = arg["data"]["domain"]        
        positions_arg = ['&','&' ]

        date_max = datetime.strptime(data_arg[0], '%Y-%m-%d %H:%M')
        max = user_tz.localize(date_max).astimezone(pytz.UTC).strftime("%Y-%m-%d %H:%M")

        date_min = datetime.strptime(data_arg[1], '%Y-%m-%d %H:%M')
        min = user_tz.localize(date_min).astimezone(pytz.UTC).strftime("%Y-%m-%d %H:%M")

        positions_arg.append(('devicetime', '>', max))
        positions_arg.append(('devicetime', '<', min))
        positions_arg.append(('status', 'in', ('Online','Offline','Alarm','GPS Offline')))                
 
        if(data_arg[2] in ['Movement','Stopped']):
            positions_arg.insert(5,('event', '=', data_arg[2]))
        if(data_arg[2] in ['Offline','Alarm','GPS Offline']):
            positions_arg.insert(5,('status', '=', data_arg[2]))
                    
        if(len(data_arg)==4):
            positions_arg.insert(0,'&')
            positions_arg.insert(6,('deviceid', '=', int(data_arg[3])))
        try:
            data_positions = self.search(positions_arg, order='devicetime asc')
            positions = {}
            i=0
            for pos in data_positions:
                i+=1    
                vehicle = pos.vehicleid                                    

                position = self.js_positions(vehicle, pos)

                #if(not positions):
                #    positions = {}
                if(vehicle.gps1_id.id not in positions and vehicle.gps1_id.id>0): 
                    positions[vehicle.gps1_id.id] = {}                
                if(vehicle.gps1_id.id>0):
                    positions[vehicle.gps1_id.id][i] = position
            return positions
        except re.error:
            raise UserError(_('Error in the filter'))

    def js_positions(self, vehicle, pos):                    

        devicetime = fields.Datetime.context_timestamp(self, pos.devicetime)
        fixtime = fields.Datetime.context_timestamp(self, pos.fixtime)

        return {
            "idv": vehicle.id,
            "idp": pos.id,
            "idg": vehicle.gps1_id.id,
            "nam": vehicle.name,
            "eco": vehicle.economic_number,
            "lic": vehicle.license_plate,
            "col": vehicle.color_vehicle,
            "ima": vehicle.image_vehicle,
            "vsp": vehicle.speed,
            "oun": vehicle.odometer_unit,
            "lat": pos.latitude,
            "lon": pos.longitude,
            "alt": pos.altitude,
            "psp": pos.speed,
            "tde": devicetime,
            "dat": devicetime.strftime("%Y-%m-%d"),
            "tim": devicetime.strftime("%H:%M"),
            "tse": pos.servertime,
            "tfi": pos.fixtime,
            "sta": pos.status,
            "eve": pos.event,
            "gas": pos.gas,
            "dis": pos.distance,
            "dto": pos.totalDistance,
            "cou": pos.course,
            "bat": pos.batery,
        }
        