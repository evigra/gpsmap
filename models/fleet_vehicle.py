from odoo import fields, models
import datetime, pytz, json, logging, warnings
_logger = logging.getLogger(__name__)


class vehicle(models.Model):
    _inherit = "fleet.vehicle"
    _order = "economic_number ASC"
    image_vehicle = fields.Selection([
        ('01', 'Gray Vehicle'),
        ('02', 'Red Vehicle'),
        ('03', 'Gray van'),
        ('04', 'Gray van'),
        ('05', 'White truck'),
        ('06', 'White van'),
        ('07', 'Blue van'),
        ('30', 'Moto'),
        ('90', 'Black Phone'),
        ('91', 'Blue  Phone'),
        ('92', 'Green Phone'),
        ('93', 'Red  Phone')
        ], 'Img GPS', default = '01', help = 'Image of GPS Vehicle', required = True)
    temporal_id = fields.Many2one('res.partner', 'temporal')
    economic_number = fields.Char('Economic Number', size = 50)
    speed = fields.Char(default = 0, size = 3)
    active_time_today = fields.Integer()
    speeding = fields.Boolean(default = False)
    gpsoffline = fields.Boolean(default = False)
    alarm = fields.Boolean(default = False)
    engine = fields.Boolean(default = True, tracking = True)
    ignition = fields.Boolean(default = False)
    gps1_id = fields.Many2one('gps_devices', ondelete = 'set null', string = "GPS", index = True)
    positionid = fields.Many2one('gps_positions', ondelete = 'set null', string = "Position", index = True)
    geofence_ids = fields.Many2many('gps_geofences', 'fleet_geofences_rel', 'fleet_id', 'geofence', string = 'Geofences')

    def local_timezone(self, time, tz):
        time_zone = time.replace(tzinfo=pytz.utc)
        return time_zone.astimezone(pytz.timezone(tz)).strftime("%Y-%m-%d %H:%M:%S")

    def get_last_vehicle_position(self):
        positions_arg = [('positionid', '!=', False)]
        vehicles = self.search(positions_arg)
        positions = {}
        tz = pytz.timezone(self.env.user.tz) if self.env.user.tz else pytz.utc
        for vehicle in vehicles:
            pos = vehicle["positionid"]

            totalDistance = int(pos.totalDistance/1000)
            devicetime=datetime.datetime.utcnow()

            devicetime= self.local_timezone(pos.devicetime, "America/Mexico_City"),
            devicetime=devicetime[0]
            

            fixtime=datetime.datetime.utcnow()

            fixtime= self.local_timezone(pos.fixtime, "America/Mexico_City"),
            fixtime=fixtime[0]




            status=pos.status
            if(status in ("Online","Alarm")):
                time_now = datetime.datetime.utcnow()
                time_before = time_now - datetime.timedelta(minutes = 15)

                if(pos.devicetime < time_before):
                    status = "Offline"

            position = {
                "idv": vehicle["id"],
                "idg": pos.deviceid.id,
                "nam": vehicle["name"],
                "eco": vehicle["economic_number"],
                "lic": vehicle["license_plate"],
                "ima": vehicle["image_vehicle"],
                "vsp": vehicle["speed"],
                "oun": vehicle["odometer_unit"],
                "idp": pos.id,
                "lat": pos.latitude,
                "lon": pos.longitude,
                "alt": pos.altitude,
                "psp": pos.speed,
                "tde": devicetime,
                "dat": devicetime[0:10],
                "tim": devicetime[10:16],
                "tse": pos.servertime,
                "tfi": pos.fixtime,
                "tfi": fixtime,
                "sta": status,
                "eve": pos.event,
                "gas": pos.gas,
                "dis": pos.distance,
                "dto": totalDistance,
                "cou": pos.course,
                "bat": pos.batery,
            }
            if(pos.deviceid.id>0):
                positions[pos.deviceid.id] = {0: position}
        return positions

    def send_command(self, vals):
        message=False
        params = self.env['ir.config_parameter'].sudo()
        sync_devices = params.get_param('gpsmap.sync_devices', default = False)
        vehicle = self.search([["gps1_id","=", int(vals["data"])]])
        device=vehicle.gps1_id

        if(vehicle.engine==True):
            command="engineStop"
        else:
            command="engineResume"

        if(not sync_devices):
            message = "It is not synchronized with the solesgps.com platform"            

        if(not int(device.solesgps_id)):
            message = "The vehicle does not have a GPS assigned"

        if(message):
            warnings.warn(message)
            return {'status':'error', 'message':message}

        solesgps_models, solesgps_db, solesgps_uid, solesgps_pass = device._get_session_information()
        
        if(not(solesgps_models or solesgps_uid)):
            return {'status':'error', 'message':'we could not establish a connection with the platform solesgps.com'}
                            
        vals = solesgps_models.execute_kw(solesgps_db, solesgps_uid, solesgps_pass,'tc_devices', 'execute_commands', [{'engine':True},[{'device':device.solesgps_id, 'command':command}]])   
        if("status" in vals[0]):
            _logger.error(vals[0]["message"])
            return vals[0] 
            
        vals = json.loads(vals[0])
                                                
        if("engineResume" in vals["type"]):
            vehicle.engine=True
        else:
            vehicle.engine=False        
                    
        return vals
