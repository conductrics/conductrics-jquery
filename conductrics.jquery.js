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
				timeout: settings.timeout,
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
				timeout: settings.timeout,
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
				session: settings.session,
				timeout: settings.timeout
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

	// Simple wrapper around $.ajax
	doAjax = function(url, type, data, callback) {
		$.ajax({
			url: url, 
			type: type,
			dataType: 'json',
			data: data,
			success: callback,
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
