/*
# L.Control.WCS Manage coordinate display and input
#
#	This file part of:	VisiOmatic
#
#	Copyright: (C) 2014,2015 Emmanuel Bertin - IAP/CNRS/UPMC,
#                          Chiara Marmo - IDES/Paris-Sud
#
#	Last modified: 05/11/2015
*/
L.Control.WCS = L.Control.extend({
	options: {
		position: 'bottomleft',
		title: 'Center coordinates. Click to change',
		coordinates: [{
			label: 'RA, Dec',
			units: 'HMS',
			nativeCelsys: false
		}]
	},

	onAdd: function (map) {
		// Create coordinate input/display box
		var _this = this,
			  dialog = this._wcsdialog =  L.DomUtil.create('div', 'leaflet-control-wcs-dialog'),
			  coordSelect = L.DomUtil.create('select', 'leaflet-control-wcs-select', dialog),
			  choose = document.createElement('option'),
		    coords = this.options.coordinates,
			  opt = [],
			  coordIndex;

		L.DomEvent.disableClickPropagation(coordSelect);
		this._currentCoord = 0;
		coordSelect.id = 'leaflet-coord-select';
		coordSelect.title = 'Switch coordinate system';
		for (var c in coords) {
			opt[c] = document.createElement('option');
			opt[c].text = coords[c].label;
			coordIndex = parseInt(c, 10);
			opt[c].value = coordIndex;
			if (coordIndex === 0) {
				opt[c].selected = true;
			}
			coordSelect.add(opt[c], null);
		}

		L.DomEvent.on(coordSelect, 'change', function (e) {
			_this._currentCoord = coordSelect.value;
			_this._onDrag();
		});

		var	input = this._wcsinput = L.DomUtil.create('input', 'leaflet-control-wcs-input', dialog);

		L.DomEvent.disableClickPropagation(input);
		input.type = 'text';
		input.title = this.options.title;
		// Speech recognition on WebKit engine
		if ('webkitSpeechRecognition' in window) {
			input.setAttribute('x-webkit-speech', 'x-webkit-speech');
		}

		map.on('move zoomend', this._onDrag, this);
		L.DomEvent.on(input, 'focus', function () {
			this.setSelectionRange(0, this.value.length);
		}, input);
		L.DomEvent.on(input, 'change', function () {
			this.panTo(this._wcsinput.value);
		}, this);

		return this._wcsdialog;
	},

	onRemove: function (map) {
		map.off('drag', this._onDrag);
	},

	_onDrag: function (e) {
		var latlng = this._map.getCenter(),
		    wcs = this._map.options.crs,
				coord = this.options.coordinates[this._currentCoord];

		if (wcs.pixelFlag) {
			this._wcsinput.value = latlng.lng.toFixed(0) + ' , ' + latlng.lat.toFixed(0);
		} else {
			if (!coord.nativeCelsys && wcs.forceNativeCelsys) {
				latlng = wcs.celsysToEq(latlng);
			} else if (coord.nativeCelsys && wcs.forceNativeCelsys === false) {
				latlng = wcs.eqToCelsys(latlng);
			}
			switch (coord.units) {
			case 'HMS':
				this._wcsinput.value = this._latLngToHMSDMS(latlng);
				break;
			case 'deg':
				this._wcsinput.value = latlng.lng.toFixed(5) + ' , ' + latlng.lat.toFixed(5);
				break;
			default:
				this._wcsinput.value = latlng.lng.toFixed(1) + ' , ' + latlng.lat.toFixed(1);
				break;
			}
		}
	},

	// Convert degrees to HMSDMS (DMS code from the Leaflet-Coordinates plug-in)
	_latLngToHMSDMS : function (latlng) {
		var lng = (latlng.lng + 360.0) / 360.0;
		lng = (lng - Math.floor(lng)) * 24.0;
		var h = Math.floor(lng),
		 mf = (lng - h) * 60.0,
		 m = Math.floor(mf),
		 sf = (mf - m) * 60.0;
		if (sf >= 60.0) {
			m++;
			sf = 0.0;
		}
		if (m === 60) {
			h++;
			m = 0;
		}
		var str = h.toString() + ':' + (m < 10 ? '0' : '') + m.toString() +
		 ':' + (sf < 10.0 ? '0' : '') + sf.toFixed(3),
		 lat = Math.abs(latlng.lat),
		 sgn = latlng.lat < 0.0 ? '-' : '+',
		 d = Math.floor(lat);
		mf = (lat - d) * 60.0;
		m = Math.floor(mf);
		sf = (mf - m) * 60.0;
		if (sf >= 60.0) {
			m++;
			sf = 0.0;
		}
		if (m === 60) {
			h++;
			m = 0;
		}
		return str + ' ' + sgn + (d < 10 ? '0' : '') + d.toString() + ':' +
		 (m < 10 ? '0' : '') + m.toString() + ':' +
		 (sf < 10.0 ? '0' : '') + sf.toFixed(2);
	},

	panTo: function (str) {
		var re = /^(-?\d+\.?\d*)\s*,\s*\+?(-?\d+\.?\d*)/g,
				result = re.exec(str),
				wcs = this._map.options.crs,
				coord = this.options.coordinates[this._currentCoord],
				latlng = wcs.parseCoords(str);
		if (latlng) {
			if (wcs.pixelFlag) {
				this._map.panTo(latlng);
			} else {
				if (!coord.nativeCelsys && wcs.forceNativeCelsys) {
					latlng = wcs.eqToCelsys(latlng);
				} else if (coord.nativeCelsys && wcs.forceNativeCelsys === false) {
					latlng = wcs.celsysToEq(latlng);
				}
				this._map.panTo(latlng);
			}
		} else {
			// If not, ask Sesame@CDS!
			L.IIPUtils.requestURL('http://cdsweb.u-strasbg.fr/cgi-bin/nph-sesame/-oI/A?' + str,
			 'getting coordinates for ' + str, this._getCoordinates, this, 10);
		}
	},

	_getCoordinates: function (_this, httpRequest) {
		if (httpRequest.readyState === 4) {
			if (httpRequest.status === 200) {
				var str = httpRequest.responseText,
					latlng = _this._map.options.crs.parseCoords(str, true);

				if (latlng) {
					_this._map.panTo(latlng);
					_this._onDrag();
				} else {
					alert(str + ': Unknown location');
				}
			} else {
				alert('There was a problem with the request to the Sesame service at CDS');
			}
		}
	}
});

L.Map.mergeOptions({
    positionControl: false
});

L.Map.addInitHook(function () {
    if (this.options.positionControl) {
        this.positionControl = new L.Control.MousePosition();
        this.addControl(this.positionControl);
    }
});

L.control.wcs = function (options) {
    return new L.Control.WCS(options);
};
