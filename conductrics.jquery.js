// jQuery plugin wrapper for Conductrics API
(function( $ ) {
	var settings = {};

	var methods = {

		// Initialize with base settings
		init : function(settingz) {
			// developer may override any of these defaults
			settings = $.extend(true, {
				'baseUrl': '//api.conductrics.com',
				'apiKey': null,
				'agent': null,
				'session': null,
				'timeout': 1000,
				'caching': false, // set to 'localStorage' to enable local decision cache
				'cachingMaxAge': (30*60), // used only if caching enabled, expressed in seconds
				// Explicit cookie support - not needed in recent versions of jQuery, but required in 1.4-era jQuery
				// Ignored if a session identifier is provided explicitly (above)
				'sessionCookies': false, // set to true to forcibly store the session id returned by Conductrics as a cookie
				'sessionCookieName': 'mpid', // Name of 'mpid' is recommended
				'sessionCookieOptions': {
					// can specify 'domain', 'expires', 'path', and other options as explained here: https://github.com/carhartl/jquery-cookie
					// The most important options are:
					// expires: 30, // number of days that the session id should be retained - if not specified, cookie is discarded when browser closed
					// domain: '.example.com', // a top-level domain, within which the cookie may be shared - so a value of '.example.com' here will allow Conductrics tracking to work between say 'www.example.com' and 'store.example.com'
					path: '/'
				}
			}, settingz)

			storageMaintain();

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
					if ($.inArray(helper.helper, ['toggle','choose-best']) >= 0) {
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

		// Simple Helper API
		'autowire': function(optionz, callback) {
			var $this = $(this).hide();
			// developer may override any of these defaults
			var options = $.extend({autoReward:true}, optionz);
			var agentData = findAutowirableAgents($this.selector);

			var features = $('body').attr('data-conductrics-features');
			for (var agentCode in agentData) {
				(function(code, data) {
					if (data && data.choices && data.choices.length >= 2) {
						$.conductrics('get-decision', {agent:code, choices:data.choices.join(','), features:features}, function(selection) {
							var sel = $this.selector + '[data-conductrics-agent="'+code+'"][data-conductrics-choice="' +selection.code+ '"]';
							$(sel).show();
						});
					}
				})(agentCode, agentData[agentCode]);
			}
			if (options.autoReward) {
				rewards = $('body').attr('data-conductrics-reward-onload');
				if (rewards) {
					rewards = rewards.split(',');
					for (var i in rewards) {
						var parts = rewards[i].split(':');
						if (parts.length >= 1) {
							goalOptions = {
								agent: parts[0],
								goal: parts[1],  // might be undefined - will default to 'goal-1' downstream
								reward: parts[2] // might be undefined - will default to 1 downstream
							};
							$.conductrics('send-goal', goalOptions, function() {
								complain('reward sent for ', goalOptions);
							});
						}
					}
				}
			}
		},

		// Core API
		'get-decision': function(options, callback) {
			// developer may override any of these defaults
			var options = $.extend({
				agent: settings.agent,
				session: settings.session,
				decision: null, // undocumented/legacy
				choices: ['a','b'],
				point: null
			}, options);

			if (!ensure(options, ['agent'])) { return }; // Bail if we don't have enough info
			if (!ensure(settings, ['baseUrl', 'owner', 'apiKey'])) { return }; // Bail if we don't have enough info

			var choices = choicesAsObj(options.choices, options.decision);
			var url = constructUrl(['decisions', choicesToStr(choices)], options);
			var data = {apikey: settings.apiKey};
			if (options.session != null) {data.session = options.session};
			if (options.features) {
				data.features = sanitizeCodesStr(options.features);
			}
			if (typeof options.point == 'string') {
				data.point = sanitizeCodesStr(options.point);
			}

			// Determine fallback selection - if anything goes wrong, we'll fall back to this
			var selection = {};
			for (var key in choices) {
				selection[key] = {code: choices[key][0]};
			}

			returnSelection = function(selection, response, textStatus, jqXHR) {
				if (typeof options.decision == 'string') {
					selection = selection[options.decision];
				} else if (!$.isPlainObject(options.choices)) {
					var decisionCode = null; /* can't rely on Object.keys in IE 8 */
					$.each(selection, function(key, val) {
						if (decisionCode == undefined) {
							decisionCode = key;
						}
					});
					selection = selection[decisionCode];
				}
				if (typeof callback == 'function') {
					callback.apply(this, [selection, response, textStatus, jqXHR]);
				}
			}

			// If local caching via HTML5 local storage is enabled
			if (settings.caching) {
				var decisions = storageRead(options, 'dec');
				if (decisions) {
					returnSelection(decisions, null, 'stored', null);
					return;
				}
			}

			// Make request
			doAjax(url, 'GET', data, function(response, textStatus, jqXHR) {
				if (textStatus == 'success' && response.decisions) {
					selection = response.decisions;
					if (settings.caching && selection) {
						storageWrite(options, 'dec', response.decisions);
					}
				}
				if (typeof callback == 'function') {
					returnSelection(selection, textStatus, jqXHR);
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

   	choicesAsObj = function (choices, providedDecisionCode) {
   		if (providedDecisionCode == null) {providedDecisionCode = ''};
   		var result = {};
   		if ($.isArray(choices)) {
   			result[providedDecisionCode] = choices;
   		} else if ($.isPlainObject(choices)) {
   			result = choices;
   		} else if (typeof choices == 'number') {
   			var ar = [];
   			for (var i = 0; i < choices; i++) {
   				ar.push(i);
   			}
   			result[providedDecisionCode] = ar;
   		} else if (typeof choices == 'string') {
   			for (var part in choices.split(',')) {
   				var pair = part.split(':');
   				if (pair.length == 1) {
   					pair.unshift(providedDecisionCode);
   				}
   				result[pair[0]] = pair[1].split(',');
   			}
   		}
   		return result;
   	},

   	choicesToStr = function (choices) {
   		var parts = [];
   		for (var key in choices) {
   			if (key == '') {
   				parts.push( choices[key] );
   			} else {
   				parts.push( key + ':' + choices[key] );
   			}
   		}
   		return parts.join('/');
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
	complain = function() {
		if (console && console.log) {
			console.log(arguments);
		}
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
		var alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");

		var randomElement = function(arr) {
		  return arr[Math.floor(Math.random() * arr.length)];
		};

		var randomString = function(len, prefix) {
		  if (prefix == null) prefix = "";
		  while (prefix.length < len) {
		    prefix += randomElement(alphabet);
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

	findAutowirableAgents = function(selector) {
		var agents = {};
		$(selector).each(function() {
			var agent = $(this).attr('data-conductrics-agent');
			var choice = $(this).attr('data-conductrics-choice');
			// agent is required
			if (validCode(agent)) {
				if (!agents[agent]) {
					agents[agent] = {choices:[]}
				}
				var choices = agents[agent].choices;
				if (!validCode(choice)) {
					choice = 'experience-' + 'abcdefghijklmnopqrstuvwxyz'[choices.length];
					$(this).attr('data-conductrics-choice', choice);
				}
				agents[agent].choices.push(choice);
			}
		});
		for (var code in agents) {
			// if there is only one option, assume intent is to test it against "nothing"
			if (agents[code].choices.length == 1) {
				agents[code].choices.push('nothing');
			}
		}
		return agents;
	}

	validCode = function(s) {
		return s != null && s.length > 0 && s.length < 25 && !(/[^0-9A-Za-z_-]/).test(s)
	}

	sanitizeCodesStr = function(str) {
		if (!str) return "";
		return sanitizeCodes(str.split(',')).join(',');
	}

	sanitizeCodes = function(codes) {
		if (!codes) return [];
		result = [];
		for (var i in codes) {
			if (validCode(codes[i])) {
				result.push(codes[i]);
			}
		}
		return result;
	}

	supportsHtmlLocalStorage = function() {
		if (settings.caching != 'localStorage') return false;
		try {
			return 'localStorage' in window && window['localStorage'] !== null;
		} catch (e) {
			return false;
		}
	}

	storageKey = function(options, name) {
		var ar = [];
		var ks = ['baseUrl', 'owner', 'agent', 'session'];
		for (var i in ks) {
			if (options[ks[i]] != null) {
				ar.push(options[ks[i]]);
			} else if (settings[ks[i]] != null) {
				ar.push(settings[ks[i]]);
			}
		}
		if (name) { ar.push(name) }
		return ar.join(':');
	}

	storageRead = function(options, name, defaultValue) {
		if (!supportsHtmlLocalStorage()) {return defaultValue};
		var store = localStorage;
		var key = storageKey(options, name);
		var stored = store.getItem(key);
		if (stored) {
			var record = JSON.parse(stored);
			if (record.val) {
				return record.val;
			}
		}
		return defaultValue;
	}

	storageWrite = function(options, name, value) {
		if (!supportsHtmlLocalStorage()) {return};
		var store = localStorage;
		var key = storageKey(options, name);
		var record = {ts:new Date().getTime(), val:value};
		store.setItem(key, JSON.stringify(record));
	}

	storageMaintain = function() {
		if (!supportsHtmlLocalStorage()) {return};
		var store = localStorage;
		for (var i = 0; i < store.length; i++) {
			var key = store.key(i);
			if (key.indexOf([settings.baseUrl, settings.owner].join(':')) == 0) { // clean expired info for this server and owner
				var stored = store.getItem(key);
				if (stored) {
					var record = JSON.parse(stored);
					if (record.ts && (record.ts + (settings.cachingMaxAge * 1000)) < new Date().getTime()) {
						store.removeItem(key);
					}
				}
			}
		}
	}

	// Simple wrapper around $.ajax
	doAjax = function(url, type, data, callback) {
		/* If XDomainRequest will be used (IE 8/9), 'POST' doesn't work as expected, so we'll just use 'GET' */
		if ( type == 'POST' && window.XDomainRequest && (window.XMLHttpRequest == undefined || new window.XMLHttpRequest().withCredentials == undefined) ) {
			type = 'GET';
			if ($.isPlainObject(data)) {
				data._method = 'POST';
			}
		}

		// Local cookie support, if enabled
		if (data.session == null && settings.sessionCookies) {
			var storedId = $.cookie(settings.sessionCookieName);
			if (storedId) {
				data.session = storedId;
			}
		}

		// Workaround for IE 8/9 style cross-domain requests
		if (data.session == null && window.XDomainRequest) {
			data.session = getWorkaroundId();
		}

		// If we still have a null session id, don't send one at all (don't send 'null')
		if (data.session == null) {
			delete data.session;
		}

		$.ajax({
			url: url,
			type: type,
			dataType: 'json',
			data: data,
			timeout: settings.timeout,
			success: function(data, textStatus, jqXHR) {
				// Local cookie support, if enabled
				if (settings.sessionCookies && data != null && data.session != null) {
					$.cookie(settings.sessionCookieName, data.session, settings.sessionCookieOptions);
				}
				// Notify callback
				if (typeof(callback) == 'function') {
					callback(data, textStatus, jqXHR);
				}
			},
			error: function(jqXHR, textStatus, errorThrown) {
				if (typeof(callback) == 'function') {
					callback(null, textStatus, jqXHR)
				}
			},
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
/* use XDomainRequest if the native XMLHttpRequest doesn't support 'withCredentials' which is a sign that it doesn't implement CORS - in practice this means IE 8/9 will use this, but 10+ will work 'normally' */
if ( window.XDomainRequest && (window.XMLHttpRequest == undefined || new window.XMLHttpRequest().withCredentials == undefined) ) {
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
