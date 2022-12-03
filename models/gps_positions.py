import xmlrpc.client
import datetime, time, string
import json
from odoo import fields, models, _
import re


class gps_positions(models.Model):
    _name = "gps_positions"
    _description = 'GPS Positions'
    _order = "devicetime DESC"
    _pointOnVertex = ""

    protocol = fields.Char(size = 15)
    deviceid = fields.Many2one('gps_devices', ondelete = 'set null', string = "GPS Device", index = True)
    vehicleid = fields.Many2one('fleet.vehicle', ondelete = 'set null', string = "Vehicle", index = True)
    geofence_ids = fields.Many2many('gps_geofences', 'gps_positions_geofences_rel', 'positions_id', 'geofence', string = 'Geofences')
    servertime = fields.Datetime('Server Time')
    devicetime = fields.Datetime('Device Time')
    fixtime = fields.Datetime('Error Time')
    latitude = fields.Float(digits = (3, 6))
    longitude = fields.Float(digits = (3, 6))
    altitude = fields.Float(digits = (6, 2))
    speed = fields.Float(digits = (3, 2))
    course = fields.Float(digits = (3, 2))
    batery = fields.Float(digits = (3, 2))
    distance = fields.Float(digits = (7, 3))
    totalDistance = fields.Float(digits = (10, 3))
    gas = fields.Float('Gas', digits = (5, 2))
    status = fields.Char('Type', size = 50)
    event = fields.Char(size = 70)

    def get_geofence(self, data, fleet):
        data_return = []
        for alert in self.env['gps_alerts'].search([]):
            if(data["vehicleid"] in alert.vehicle_ids.mapped("id")):
                point = '%s %s' % (data["longitude"],data["latitude"])
                for geofence in alert.geofence_ids:
                    if("IN" == self.pointInPolygon(point, geofence.area.split(', '))):
                        data_return.append(geofence.id)
        return data_return

    def get_distance(self, json_vals):
        data = 0
        if("distance" in json_vals and json_vals["distance"]):
            data=json_vals["distance"]
        return data

    def get_totalDistance(self, json_vals):
        data = 0
        if("totalDistance" in json_vals and json_vals["totalDistance"]):
            data = json_vals["totalDistance"]
        if("totalDistance" in json_vals and json_vals["totalDistance"]):
            data = json_vals["totalDistance"]
        return data

    def get_batery(self, json_vals):
        data = 0
        if("batteryLevel" in json_vals and json_vals["batteryLevel"]):
            data = json_vals["batteryLevel"]
        return data

    def get_gas(self, json_vals):
        data = 0
        if("io3" in json_vals and json_vals["io3"]):
            data = json_vals["io3"]
        elif("fuel1" in json_vals and json_vals["fuel1"]):
            data = json_vals["fuel1"]
        elif("fuel" in json_vals and json_vals["fuel"]):
            data = json_vals["fuel"]
        return data

    def get_event(self, json_vals, vals, fleet):
        data = "Stopped"

        if("alarm" in json_vals and json_vals["alarm"]):
            data = json_vals["alarm"]
        elif("motion" in json_vals and json_vals["motion"] and float(vals["speed"])>2):
            data = "Moving"
        return data

    def get_other_information(self, json_vals,vals, fleet):
        if(fleet.odometer_unit=='miles'):
            vals["speed"] = 1.15 * float(vals["speed"])
        else:
            vals["speed"] = 1.852 * float(vals["speed"])
        return vals


    def get_status(self, json_vals,vals, fleet):
        time_now = datetime.datetime.utcnow()
        time_before = time_now - datetime.timedelta(minutes = 15)
        time_after = time_now + datetime.timedelta(minutes = 15)

        devicetime = datetime.datetime.strptime(vals["devicetime"], '%Y-%m-%d %H:%M:%S')
        fixtime = datetime.datetime.strptime(vals["fixtime"], '%Y-%m-%d %H:%M:%S')

        data="Offline"
        if("alarm" in json_vals and json_vals["alarm"]):
            data = "Alarm"
        elif(devicetime < time_before):
            data = "Offline"
        elif(time_before < devicetime and devicetime < time_after and fixtime<time_before):
            data = "GPS Offline"
        elif(time_before < devicetime and devicetime < time_after):
            data = "Online"
        return data

    def _get_session_information(self):
        solesgps_host = self.env['ir.config_parameter'].sudo().get_param('solesgps_host')
        solesgps_user = self.env['ir.config_parameter'].sudo().get_param('solesgps_user')
        solesgps_pass = self.env['ir.config_parameter'].sudo().get_param('solesgps_pass')
        solesgps_db = self.env['ir.config_parameter'].sudo().get_param('solesgps_db')
        common = xmlrpc.client.ServerProxy('{}/xmlrpc/2/common'.format(solesgps_host))
        solesgps_uid = common.authenticate(solesgps_db, solesgps_user, solesgps_pass, {})
        solesgps_models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(solesgps_host))

        return (solesgps_models, solesgps_db, solesgps_uid, solesgps_pass)

    def run_scheduler_get_position(self):
        solesgps_models, solesgps_db, solesgps_uid, solesgps_pass = self._get_session_information()
        datas=solesgps_models.execute_kw(solesgps_db, solesgps_uid, solesgps_pass,
            'fleet.vehicle', 'cron_positions',[])

        for data in json.loads(datas):
            device = self.env['gps_devices'].search([["solesgps_id","=",data["deviceid"]]])
            if(device.name):
                fleet = self.env['fleet.vehicle'].search([["gps1_id","=",device.id]])
                if(fleet.id>0):
                    json_vals = json.loads(data["attributes"])
                    data.pop("attributes")

                    data = self.get_other_information(json_vals,data, fleet)
                    data["distance"] = self.get_distance(json_vals)
                    data["gas"] = self.get_gas(json_vals)
                    data["totalDistance"] = self.get_totalDistance(json_vals)
                    data["batery"] = self.get_batery(json_vals)
                    data["event"] = self.get_event(json_vals, data, fleet)
                    data["status"] = self.get_status(json_vals, data, fleet)

                    data["vehicleid"] = fleet.id
                    data["deviceid"] = device.id
                    geofences = self.get_geofence(data, fleet)
                    if(len(geofences)>0):
                        data["geofence_ids"] =[[6, False, geofences]]
                    position = self.create(data)
                    device.write({"positionid": position})
                    fleet.write({"positionid": position})

    def js_positions_history(self,arg):
        data_arg = arg["data"]["domain"]
        positions_arg = [
            '&','&',
            ('devicetime', '>', data_arg[0]),
            ('devicetime', '<', data_arg[1]),
            ('status', 'in', ('Online','Offline','Alarm','GPS Offline'))
        ]
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
                totalDistance = int(pos.totalDistance / 1000)                
                position = {
                    "idv": vehicle.id,
                    "idg": vehicle.gps1_id.id,
                    "nam": vehicle.name,
                    "lic": vehicle.license_plate,
                    "ima": vehicle.image_vehicle,
                    "vsp": vehicle.speed,
                    "oun": vehicle.odometer_unit,
                    "lat": pos.latitude,
                    "lon": pos.longitude,
                    "alt": pos.altitude,
                    "psp": pos.speed,
                    "tde": pos.devicetime,
                    "dat": pos.devicetime.strftime("%Y-%m-%d"),
                    "tim": pos.devicetime.strftime("%H:%M"),
                    "tse": pos.servertime,
                    "tfi": pos.fixtime,
                    "sta": pos.status,
                    "eve": pos.event,
                    "gas": pos.gas,
                    "dis": pos.distance,
                    "dto": totalDistance,
                    "cou": pos.course,
                    "bat": pos.batery,
                }
                if(not positions):
                    positions = {}
                if(vehicle.gps1_id.id not in positions and vehicle.gps1_id.id>0): 
                    positions[vehicle.gps1_id.id] = {}                
                if(vehicle.gps1_id.id>0):
                    positions[vehicle.gps1_id.id][i] = position
            return positions
        except re.error:
            raise UserError(_('Error in the filter'))
        
    def pointInPolygon(self, point, polygon, pointOnVertex=True):
        _pointOnVertex = pointOnVertex
        point = self.pointStringToCoordinates(point)

        vertices = []
        for vertex in polygon:
            vertices.append(self.pointStringToCoordinates(vertex))

        intersections = 0
        for i in range(len(vertices)):
            vertex1 = vertices[i - 1]
            vertex2 = vertices[i]
            if float(vertex1['y']) == float(vertex2['y']) and float(vertex1['y']) == float(point['y']) and float(
                    point['x']) > min(float(vertex1['x']), float(vertex2['x'])) and float(point['x']) < max(
                    float(vertex1['x']), float(vertex2['x'])):
                return 'BORDE'
            if float(point['y']) > min(float(vertex1['y']), float(vertex2['y'])) and float(point['y']) <= max(
                    float(vertex1['y']), float(vertex2['y'])) and float(point['x']) <= max(float(vertex1['x']), float(
                    vertex2['x'])) and float(vertex1['y']) != float(vertex2['y']):
                xinters = (float(point['y']) - float(vertex1['y'])) * (float(vertex2['x']) - float(vertex1['x'])) / (
                            float(vertex2['y']) - float(vertex1['y'])) + float(vertex1['x'])
                if xinters == float(point['x']):
                    return 'BORDE'
                if float(vertex1['x']) == float(vertex2['x']) or float(point['x']) <= float(xinters):
                    intersections = intersections + 1

        if intersections % 2 != 0:
            return 'IN'
        else:
            return 'OUT'

    def pointStringToCoordinates(self, point):
        coordinates = point.split(' ')
        coordinate = {}
        coordinate['x'] = coordinates[0]
        coordinate['y'] = coordinates[1]
        return coordinate