/*
# L.Control.IIP adjusts the rendering of an IIP layer
# (see http://iipimage.sourceforge.net/documentation/protocol/)
#
#	This file part of:	Leaflet-IVV
#
#	Copyright: (C) 2013 Emmanuel Bertin - IAP/CNRS/UPMC,
#                     Chiara Marmo - IDES/Paris-Sud
#
#	Last modified:		01/09/2013
*/
L.Control.IIP = L.Control.extend({
	options: {
		title: 'a control related to IIPImage',
		collapsed: true,
		position: 'topleft'
	},

	initialize: function (baseLayers,  options) {
		L.setOptions(this, options);
		this._className = 'leaflet-control-iipimage';
		this._layers = baseLayers;
	},

	onAdd: function (map) {
		var className = this._className,
			container = this._container = L.DomUtil.create('div', className + ' leaflet-bar');
		//Makes this work on IE10 Touch devices by stopping it from firing a mouseout event when the touch is released
		container.setAttribute('aria-haspopup', true);

		if (!L.Browser.touch) {
			L.DomEvent.disableClickPropagation(container);
			L.DomEvent.on(container, 'mousewheel', L.DomEvent.stopPropagation);
		} else {
			L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
		}

		this._dialog = L.DomUtil.create('div', className + '-dialog', container);
		if (this.options.collapsed) {
			if (!L.Browser.android) {
				L.DomEvent
				    .on(container, 'mouseover', this._expand, this)
				    .on(container, 'mouseout', this._collapse, this);
			}

			var toggle = this._toggle = L.DomUtil.create('a', className + '-toggle leaflet-bar', container);
			toggle.href = '#';
			toggle.title = this.options.title;

			if (L.Browser.touch) {
				L.DomEvent
				    .on(toggle, 'click', L.DomEvent.stop)
				    .on(toggle, 'click', this._expand, this);
			}
			else {
				L.DomEvent.on(toggle, 'focus', this._expand, this);
			}

			this._map.on('click', this._collapse, this);
			// TODO keyboard accessibility
		} else {
			this._expand();
		}

		this._checkLayer();

		return	this._container;
	},

	_checkLayer: function () {
		var layer = this._layer = this._findActiveBaseLayer();
		if (layer) {
			this._initDialog();
		} else if (this._prelayer) {
			// Layer metadata are not ready yet: listen for 'metaload' event
			this._prelayer.once('metaload', this._checkLayer, this);
		}
	},

	_initDialog: function () {
		var className = this._className,
			container = this._container,
			dialog = this._dialog,
			toggle = this._toggle,
			layer = this._layer;
    // Setup the rest of the dialog window here
	},

	_expand: function () {
		L.DomUtil.addClass(this._container, this._className + '-expanded');
	},

	_collapse: function () {
		this._container.className = this._container.className.replace(' ' + this._className + '-expanded', '');
	},

  /**
* Get currently active base layer on the map
* @return {Object} l where l.name - layer name on the control,
* l.layer is L.TileLayer, l.overlay is overlay layer.
*/
	getActiveBaseLayer: function () {
		return this._activeBaseLayer;
	},

  /**
* Get currently active overlay layers on the map
* @return {{layerId: l}} where layerId is <code>L.stamp(l.layer)</code>
* and l @see #getActiveBaseLayer jsdoc.
*/

	_findActiveBaseLayer: function () {
		var layers = this._layers;
		this._prelayer = undefined;
		for (var layername in layers) {
			var layer = layers[layername];
			if (!layer.overlay) {
				if (layer._premap) {
					this._prelayer = layer;
				} else if (this._map.hasLayer(layer) && layer.iip) {
					return layer;
				}
			}
		}
		return undefined;
	},

	_onInputChange:	function (input, pname, value) {
		var pnamearr = pname.split(/\[|\]/);
		if (pnamearr[1]) {
			input.layer.iip[pnamearr[0]][parseInt(pnamearr[1], 10)] = value;
		}	else {
			input.layer.iip[pnamearr[0]] = value;
		}
		input.layer.redraw();
	}

});

L.control.iip = function (baseLayers, options) {
	return new L.Control.IIP(baseLayers, options);
};

