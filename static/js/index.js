odoo.define('gpsmap.FieldMap', function (require) {
    'use strict';

    var core = require('web.core');
    var BasicFields = require('web.basic_fields');
    var _t = core._t;
    var qweb = core.qweb;
    var self;
    

    var FieldMap = BasicFields.InputField.extend({
        supportedFieldTypes: ['text'],
        start: function () {
            this.shapes = new Array();
            self=create_map(this);            
            return this._super();
        },
        _renderEdit: function () {
            this._super.apply(this, arguments);
            this._initDrawing();
        },
        _initDrawing: function (mode) {
            var drawingOptions = {
                fillColor: '#006ee5',
                strokeWeight: 0,
                fillOpacity: 0.45,
                editable: true
            };

            this.gmapDrawingManager = new google.maps.drawing.DrawingManager({
                drawingControl: true,
                drawingControlOptions: {
                    position: google.maps.ControlPosition.TOP_CENTER,
                    drawingModes: ['polygon']
                },
                map: self.obj_map,
                polygonOptions: drawingOptions,
            });
            google.maps.event.addListener(this.gmapDrawingManager, 'overlaycomplete', this._overlayCompleted.bind(this));
        },
        _overlayCompleted: function (event) {
            var uniqueId = new Date().getTime();
            var newShape = event.overlay;
            newShape.type = event.type;            
            
            this._deleteSelectedShaped();
            this.shapes[uniqueId] = newShape;
            
            google.maps.event.addListener(newShape, 'click', this._setSelectedShape.bind(this, newShape));
            this._setSelectedShape(newShape);
            this._onPolygonCommit();  
        },
        _setSelectedShape: function (newShape) {
            this.selectedShape = newShape; 
            this.selectedShape.editable=false;           
        },
        _deleteSelectedShaped: function () {            
            
            if(this.shapes.length>0)
            {
                this.shapes.forEach(function (item) {
                    this._setSelectedShape(this.shapes[item])
                    delete this.shapes[item];
                    this.selectedShape.setMap(null);
                });
            }
        },        
        _onPolygonCommit: function () {
            var paths = this.selectedShape.getPath();            
            var puntos="";
            paths.forEach(function (item) {                
                if(puntos=="")  puntos=item.lng()+" "+item.lat();
                else            puntos+=", "+item.lng()+" "+item.lat();			
            });

            var item=paths.cd[0];
            puntos+=", "+item.lng()+" "+item.lat();
            $("textarea[name='area']")
            .val(puntos)
            .focus()
            .change();
        },

    });
    return FieldMap;
});    




odoo.define('gpsmap.FieldsRegistry', function (require) {
    'use strict';
  
    var registry = require('web.field_registry');
    var FieldMap = require('gpsmap.FieldMap');
    var core = require('web.core');

    var maponline = FieldMap.extend({
        template: 'div_map',   
    });
    
    registry.add('map_drawing_shape', maponline);  
});
