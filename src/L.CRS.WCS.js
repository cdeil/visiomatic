/*
# L.WCS emulates the FITS WCS (World Coordinate System) popular among
# the astronomical community (see http://www.atnf.csiro.au/people/mcalabre/WCS/)
#
#	This file part of:	Leaflet-IVV
#
#	Copyright: (C) 2013 Emmanuel Bertin - IAP/CNRS/UPMC,
#                     Chiara Marmo - IDES/Paris-Sud
#
#	Last modified:		11/11/2013
*/

L.WCS = L.Class.extend({
	includes: L.Mixin.Events,

	options: {
		projection: L.Projection.WCS.TAN,
		ctype: {x: 'RA--TAN', y: 'DEC--TAN'},
		naxis: L.point(256, 256, true),
		nzoom: 9,
		crpix: L.point(129, 129),
		crval: L.latLng(0.0, 0.0),		// (\delta_0, \phi_0)
		cd: [[1.0, 0.0], [0.0, 1.0]],
		natpole: L.latLng(90.0, 180.0),	// (\theta_p, \phi_p)
		tileSize: L.point(256, 256),
		celpole: L.latLng(0.0, 0.0),	// (\delta_p, \alpha_p)
		natfid: L.latLng(0.0, 90.0),	// (\theta_0, \phi_0)
		cdinv: [[1.0, 0.0], [0.0, 1.0]]
	},

	initialize: function (url, options) {
		options = L.setOptions(this, options);
		if (url) {
			L.IIPUtils.requestURI(url + '&obj=Summary-info',
			 'getting FITS image header',
			 this._readWCS, this);
		} else {
			this._finalize();
		}
	},

	code: 'WCS',

	projection: L.Projection.WCS,

	latLngToPoint: function (latlng, zoom) { // (LatLng, Number) -> Point
		var projectedPoint = this.options.projection.project(latlng, this.options),
		    scale = this.scale(zoom);
		return this.transformation._transform(projectedPoint, scale);
	},

	pointToLatLng: function (point, zoom) { // (Point, Number[, Boolean]) -> LatLng
		var scale = this.scale(zoom),
				untransformedPoint = this.transformation.untransform(point, scale);
		return this.options.projection.unproject(untransformedPoint, this.options);
	},

	project: function (latlng) {
		return this.options.projection.project(latlng, this.options);
	},

	scale: function (zoom) {
		return Math.pow(2, zoom - this.options.nzoom + 1);
	},

// Return base zoom level at a given resolution for a given tile size
	zoom1: function (point, tileSize) {
		return Math.ceil(Math.log(Math.max(point.x / tileSize.x, point.y / tileSize.y)) / Math.LN2);
	},

	_finalize: function () {
		var options = this.options;
		switch (options.ctype.x.substr(5, 3)) {
		case 'ZEA':
			options.projection = L.Projection.WCS.ZEA;
			break;
		case 'TAN':
			options.projection = L.Projection.WCS.TAN;
			break;
		default:
			options.projection = L.Projection.WCS.TAN;
			break;
		}
		this.transformation = new L.Transformation(1, -0.5, -1, options.naxis.y + 0.5);
		options.projection.paraminit(options);
		this.code += ':' + options.projection.code;
		this.ready = true;
		this.fire('metaload');
	},

	_readWCS: function (wcs, httpRequest) {
		if (httpRequest.readyState === 4) {
			if (httpRequest.status === 200) {
				var _this = wcs,
				 hdr = httpRequest.responseText,
				 opt = _this.options,
				 key = _this._readFITSKey,
				 v;
				if ((v = key('CTYPE1', hdr))) { opt.ctype.x = v; }
				if ((v = key('CTYPE2', hdr))) { opt.ctype.y = v; }
				if ((v = key('NAXIS1', hdr))) { opt.naxis.x = parseInt(v, 10); }
				if ((v = key('NAXIS2', hdr))) { opt.naxis.y = parseInt(v, 10); }
				if ((v = key('CRPIX1', hdr))) { opt.crpix.x = parseFloat(v, 10); }
				if ((v = key('CRPIX2', hdr))) { opt.crpix.y = parseFloat(v, 10); }
				if ((v = key('CRVAL1', hdr))) { opt.crval.lng = parseFloat(v, 10); }
				if ((v = key('CRVAL2', hdr))) { opt.crval.lat = parseFloat(v, 10); }
				if ((v = key('CD1_1', hdr))) { opt.cd[0][0] = parseFloat(v, 10); }
				if ((v = key('CD1_2', hdr))) { opt.cd[0][1] = parseFloat(v, 10); }
				if ((v = key('CD2_1', hdr))) { opt.cd[1][0] = parseFloat(v, 10); }
				if ((v = key('CD2_2', hdr))) { opt.cd[1][1] = parseFloat(v, 10); }
				_this._finalize();
			}
		}
	},

	_readFITSKey: function (keyword, str) {
		var key = keyword.trim().toUpperCase().substr(0, 8),
			nspace = 8 - key.length,
			keyreg = new RegExp(key + '\\ {' + nspace.toString() +
			 '}=\\ *(?:\'(\\S*)\\ *\'|([-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?))'),
			match = keyreg.exec(str);
		if (!match) {
			return null;
		} else if (match[1]) {
			return match[1];
		} else {
			return match[2];
		}
	}

});

L.wcs = function (options) {
	return new L.WCS(options);
};
