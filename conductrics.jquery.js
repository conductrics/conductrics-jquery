// jQuery plugin wrapper for Conductrics API
(function( $ ) {
	var settings = {};

	var methods = {

		// Initialize with base settings
		init : function(settingz) {
			// developer may override any of these defaults
			settings = $.extend({
				'baseUrl': 'http://api.conductrics.com',
				'apiKey': null,
				'agent': null,
				'session': null,
				'timeout': 500
			}, settingz)

			return this;
		},

		// Simple Helper API
		'toggle': function(optionz, callback) {
			var $this = $(this);
			// developer may override any of these defaults
			var options = $.extend({
				choices: ['show', 'hide'],
				initial: 'hide'
			}, optionz);
			// Initial state of dom elements
			processSelection(options.initial, $this);
			// Call out to Conductrics
			methods['get-decision'](options, function(selection) {
				processSelection(selection.code, $this);
			})
			return this;
		},

		'apply-helpers': function(optionz, callback) {
			var $this = $(this);
			var options = $.extend({
				helpers:[]
			}, optionz);

			for (var i in options.helpers) {
				var helper = options.helpers[i];
				if (helper.selector && helper.helper && helper.options) {
					if (['toggle','choose-best'].indexOf(helper.helper) >= 0) {
						// hmm, we want to call toggle() or whatever, but we don't want to get the decision again...
					}
				}
			}
		},

		// Simple Helper API
		'choose-best': function(optionz, callback) {
			var $this = $(this);
			// developer may override any of these defaults
			var options = $.extend({
				choices: $this.length,
				initial: 'hide'
			}, optionz);
			// Initial state of dom elements
			processSelection(options.initial, $this);
			// Call out to Conductrics
			methods['get-decision'](options, function(selection) {
				var i = parseInt(selection.code)
				processSelection('show', $this.eq(i));
			})
			return this;
		},

		// Simple Helper API
		'redirect-to-best-url': function(urls, optionz, callback) {
			// developer may override any of these defaults
			var options = $.extend({
			}, optionz);
			options.choices = urls.length;

			var selectedUrl = urls[0]; // in case anything goes wrong, we'll fall back to this
			
			methods['get-decision'](options, function(selection) {
				if (selection.code != null) {
					selectedUrl = urls[selection.code];
				}
				window.location.replace(selectedUrl);
			});

			return this;
		},

		// Core API
		'get-decision': function(options, callback) {
			// developer may override any of these defaults
			var options = $.extend({
				agent: settings.agent,
				session: settings.session,
				decision: 'decision-1',
				choices: ['a','b']
			}, options);

			if (!ensure(options, ['agent'])) { return }; // Bail if we don't have enough info
			if (!ensure(settings, ['baseUrl', 'apiKey'])) { return }; // Bail if we don't have enough info

			var url = constructUrl(['decisions', options.choices.toString()], options);
			var data = {apikey: settings.apiKey};
			if (options.session) {data.session = options.session};

			// Determine fallback selection - if anything goes wrong, we'll fall back to this
			if (typeof options.choices == 'number') {
				var selection = {code: 0};
			} else if (typeof options.choices.join == 'function') {
				var selection = {code: options.choices[0]};
			}

			doAjax(url, 'GET', data, function(response, textStatus, jqXHR) {
				if (textStatus == 'success') {
					selection = response.decisions[options.decision];
					alert('good ' + selection.code)
				}
				if (textStatus != 'success') {
					alert('bad')
				}
				if (typeof callback == 'function') {
					callback.apply(this, [selection, response, textStatus, jqXHR])
				}
			})
		},

		// Core API
		'send-goal': function(options, callback) {
			// developer may override any of these defaults
			var options = $.extend({
				agent: settings.agent,
				session: settings.session,
				reward: null,
				goal: 'goal-1'
			}, options);

			var url = constructUrl(['goal', options.goal], options);
			var data = {apikey: settings.apiKey};
			if (options.reward) {data.reward = options.reward};
			if (options.session) {data.session = options.session};
			if (options.goal) {data.goal = options.goal}

			doAjax(url, 'POST', data, function(response, textStatus, jqXHR) {
				if (typeof callback == 'function') {
					callback.apply(this, [response, textStatus, jqXHR])
				}
			})
		},

		// Core API
		'expire-session': function(options, callback) {
			var options = $.extend({
				agent: settings.agent,
				session: settings.session
			}, options);

			var url = constructUrl(['expire'], options);
			var data = {apikey: settings.apiKey};
			if (options.session) {data.session = options.session};

			doAjax(url, 'GET', data, function(response, textStatus, jqXHR) {
				if (typeof callback == 'function') {
					callback.apply(this, [response, textStatus, jqXHR])
				}
			})
		}
   	},

   	// Interpret certain special "command" type decision strings such as "show" and "hide"
   	processSelection = function(selected, selector) {
		switch (selected) {
			case 'show':
				selector.show();
				break;
			case 'hide':
				selector.hide();
				break;
		}
   	}

   	// Make API url construction a bit less repetitive
   	constructUrl = function(parts, options) {
   		var url = [settings.baseUrl, settings.owner, options.agent].concat(parts).join('/');
   		return url;
   	}

   	// For error messaging
	complain = function(str) {
		console.log(str);
	}

	// Basic validation
	ensure = function(options, keys) {
		for (var i in keys) {
			var key = keys[i];
			if (options[key] == undefined) {
				complain("Conductrics plugin cannot proceed because option '" + key + "' is not provided.");
				return false;
			}
		}
		return true;
	}

	getWorkaroundId = function() {
		var randomElement = function(arr) {
		  return arr[Math.floor(Math.random() * arr.length)];
		};

		var randomString = function(len, prefix) {
		  if (prefix == null) prefix = "";
		  while (prefix.length < len) {
		    prefix += randomElement("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split(""));
		  }
		  return prefix;
		};

		var workaroundID = $.cookie('conductrics-id');
		if (workaroundID == undefined) {
			workaroundID = randomString(32, 'cond-');
			$.cookie('conductrics-id', workaroundID)
		}

		return workaroundID;
	}

	// Simple wrapper around $.ajax
	doAjax = function(url, type, data, callback) {
		
		// Workaround for IE 8/9 style cross-domain requests
		if (data.session == null && window.XDomainRequest) {
			data.session = getWorkaroundId();
		}

		//jQuery.support.cors = true;
		$.ajax({
			url: url, 
			type: type,
			dataType: 'json',
			data: data,
			success: callback,
			timeout: settings.timeout,
			error: function(jqXHR, textStatus, errorThrown) { callback(null, textStatus, jqXHR) },
			xhrFields: {
				withCredentials:true
			}
		})
	}

	// Register plugin in "conductrics" namespace
	$.conductrics = $.fn.conductrics = function( method ) {
		if ( methods[method] ) {
			return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.conductrics' );
		}    
	};

})( jQuery );

/*!
 * jQuery Cookie Plugin v1.3
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2011, Klaus Hartl
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.opensource.org/licenses/GPL-2.0
 */
(function ($, document, undefined) {

	var pluses = /\+/g;

	function raw(s) {
		return s;
	}

	function decoded(s) {
		return decodeURIComponent(s.replace(pluses, ' '));
	}

	var config = $.cookie = function (key, value, options) {

		// write
		if (value !== undefined) {
			options = $.extend({}, config.defaults, options);

			if (value === null) {
				options.expires = -1;
			}

			if (typeof options.expires === 'number') {
				var days = options.expires, t = options.expires = new Date();
				t.setDate(t.getDate() + days);
			}

			value = config.json ? JSON.stringify(value) : String(value);

			return (document.cookie = [
				encodeURIComponent(key), '=', config.raw ? value : encodeURIComponent(value),
				options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
				options.path    ? '; path=' + options.path : '',
				options.domain  ? '; domain=' + options.domain : '',
				options.secure  ? '; secure' : ''
			].join(''));
		}

		// read
		var decode = config.raw ? raw : decoded;
		var cookies = document.cookie.split('; ');
		for (var i = 0, l = cookies.length; i < l; i++) {
			var parts = cookies[i].split('=');
			if (decode(parts.shift()) === key) {
				var cookie = decode(parts.join('='));
				return config.json ? JSON.parse(cookie) : cookie;
			}
		}

		return null;
	};

	config.defaults = {};

	$.removeCookie = function (key, options) {
		if ($.cookie(key) !== null) {
			$.cookie(key, null, options);
			return true;
		}
		return false;
	};

})(jQuery, document);

(function( jQuery ) {

if ( window.XDomainRequest ) {
	jQuery.ajaxTransport(function( s ) {
		if ( s.crossDomain && s.async ) {
			if ( s.timeout ) {
				s.xdrTimeout = s.timeout;
				delete s.timeout;
			}
			var xdr;
			return {
				send: function( _, complete ) {
					function callback( status, statusText, responses, responseHeaders ) {
						xdr.onload = xdr.onerror = xdr.ontimeout = xdr.onprogress = jQuery.noop;
						xdr = undefined;
						complete( status, statusText, responses, responseHeaders );
					}
					xdr = new XDomainRequest();
					xdr.open( s.type, s.url );
					xdr.onload = function() {
						callback( 200, "OK", { text: xdr.responseText }, "Content-Type: " + xdr.contentType );
					};
					xdr.onerror = function() {
						callback( 404, "Not Found" );
					};
					xdr.onprogress = function() {};
					if ( s.xdrTimeout ) {
						xdr.ontimeout = function() {
							callback( 0, "timeout" );
						};
						xdr.timeout = s.xdrTimeout;
					}
					xdr.send( ( s.hasContent && s.data ) || null );
				},
				abort: function() {
					if ( xdr ) {
						xdr.onerror = jQuery.noop();
						xdr.abort();
					}
				}
			};
		}
	});
}
})( jQuery );
