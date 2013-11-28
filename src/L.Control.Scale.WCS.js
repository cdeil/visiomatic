/*
# L.Control.Scale.WCS adds degree and pixel units to the standard L.Control.Scale
#
#	This file part of:	Leaflet-IVV
#
#	Copyright: (C) 2013 Emmanuel Bertin - IAP/CNRS/UPMC,
#                     Chiara Marmo - IDES/Paris-Sud
#
#	Last modified:		28/11/2013
*/

L.Control.Scale.WCS = L.Control.Scale.extend({
	options: {
		position: 'bottomleft',
		maxWidth: 128,
		metric: false,
		imperial: false,
		degrees: true,
		pixels: true,
		planetRadius: 6378137.0,
		updateWhenIdle: false
	},

	_addScales: function (options, className, container) {
		if (options.metric) {
			this._mScale = L.DomUtil.create('div', className + '-line', container);
		}
		if (options.imperial) {
			this._iScale = L.DomUtil.create('div', className + '-line', container);
		}
		if (options.degrees) {
			this._dScale = L.DomUtil.create('div', className + '-line', container);
		}
		if (options.pixels) {
			this._pScale = L.DomUtil.create('div', className + '-line', container);
		}

		this.angular = options.metric || options.imperial || options.degrees;
	},

	_update: function () {
		var options = this.options,
		    map = this._map;

		if (options.pixels) {
			var crs = map.options.crs;
			if (crs.options && crs.options.nzoom) {
				var pixelScale = Math.pow(2.0, crs.options.nzoom - 1 - map.getZoom());
				this._updatePixels(pixelScale * options.maxWidth);
			}
		}

		if (this.angular) {
			var center = map.getCenter(),
			    cosLat = Math.cos(center.lat * Math.PI / 180),
			    dist = Math.sqrt(this._jacobian(center)) * cosLat,
			    maxDegrees = dist * options.maxWidth;

			if (options.metric) {
				this._updateMetric(maxDegrees * Math.PI / 180.0 * options.planetRadius);
			}
			if (options.imperial) {
				this._updateImperial(maxDegrees * Math.PI / 180.0 * options.planetRadius);
			}
			if (options.degrees) {
				this._updateDegrees(maxDegrees);
			}
		}
	},

// Return the Jacobian determinant of the astrometric transformation at latLng
	_jacobian: function (latlng) {
		var map = this._map,
		    p0 = map.project(latlng),
		    latlngdx = map.unproject(p0.add([10.0, 0.0])),
		    latlngdy = map.unproject(p0.add([0.0, 10.0]));
		return 0.01 * Math.abs((latlngdx.lng - latlng.lng) *
		                        (latlngdy.lat - latlng.lat) -
		                       (latlngdy.lng - latlng.lng) *
		                        (latlngdx.lat - latlng.lat));
	},

	_updatePixels: function (maxPix) {
		var scale = this._pScale;

		if (maxPix > 1.0e6) {
			var maxMPix = maxPix * 1.0e-6,
			mPix = this._getRoundNum(maxMPix);
			scale.style.width = this._getScaleWidth(mPix / maxMPix) + 'px';
			scale.innerHTML = mPix + ' Mpx';
		} else if (maxPix > 1.0e3) {
			var maxKPix = maxPix * 1.0e-3,
			kPix = this._getRoundNum(maxKPix);
			scale.style.width = this._getScaleWidth(kPix / maxKPix) + 'px';
			scale.innerHTML = kPix + ' kpx';
		} else {
			var pix = this._getRoundNum(maxPix);
			scale.style.width = this._getScaleWidth(pix / maxPix) + 'px';
			scale.innerHTML = pix + ' px';
		}
	},

	_updateDegrees: function (maxDegrees) {
		var maxSeconds = maxDegrees * 3600.0,
		    scale = this._dScale;

		if (maxSeconds < 1.0) {
			var maxMas = maxSeconds * 1000.0,
			mas = this._getRoundNum(maxMas);
			scale.style.width = this._getScaleWidth(mas / maxMas) + 'px';
			scale.innerHTML = mas + ' mas';
		} else if (maxSeconds < 60.0) {
			var seconds = this._getRoundNum(maxSeconds);
			scale.style.width = this._getScaleWidth(seconds / maxSeconds) + 'px';
			scale.innerHTML = seconds + ' &#34;';
		} else if (maxSeconds < 3600.0) {
			var maxMinutes = maxDegrees * 60.0,
			    minutes = this._getRoundNum(maxMinutes);
			scale.style.width = this._getScaleWidth(minutes / maxMinutes) + 'px';
			scale.innerHTML = minutes + ' &#39;';
		} else {
			var degrees = this._getRoundNum(maxDegrees);
			scale.style.width = this._getScaleWidth(degrees / maxDegrees) + 'px';
			scale.innerHTML = degrees + ' &#176;';
		}
	}

});

L.control.scale.wcs = function (options) {
	return new L.Control.Scale.WCS(options);
};
