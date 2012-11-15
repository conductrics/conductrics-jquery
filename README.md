# jQuery Plugin for Conductrics

This is a jQuery plugin for the Conductrics service, which provides an API for bandit-style optimization, dynamic targeting, and A/B testing. We'll assume here that you are at familiar with the basic idea of the service. If not, please see http://www.conductrics.com for information about the service itself. Thanks!

## What This Plugin Does

### Main Purpose
The plugin provides a convenient way to use the Conductrics Learning API:

+ **Getting Decisions from Conductrics** - To have Conductrics select from a list of options. As a simple example, the "options" might be whether to show some new feature or not, but it's really up to you what the options are. This will become clearer in the examples below.
+ **Sending Goals to Conductrics** - To "reward" Conductrics when a conceptual goal is achieved (typically a conversion or purchase, or perhaps a page view or other interaction). This allows the service to "learn" which options tend to lead to goals. 
+ **Expiring Sessions** - To tell Conductrics that a particular session has ended (typically when an end user gestures to "log out" or "exit", etc).

*So, this plugin's main purpose is to provide a simple wrapper around the REST-style API exposed by the Conductrics service. If this plugin doesn't make things easier for you, you are welcome to just use the API directly via jQuery.ajax() and friends.*

### Sugar on Top
This plugin also provides some helpers that make it particularly easy to:

+ **Run "Tests" that show or hide parts of a page**, based on a jQuery selector. Useful in situations where you have some kind of content that you want to show or hide based on how well users respond to it.
+ **Run "Tests" that select from a list of elements on a page,** based on items matched by a jQuery selector. Useful in situations where you have a few different content experiences, and you want Conductrics to select the one that has been proven to be most effective.

## Getting Set Up

1. Include jQuery.
2. Include the plugin file (conductrics.jquery.js).
3. Use the constructor function to provide your 'account owner' code and API key from Conductrics.

```html
	<script src="http://code.jquery.com/jquery.min.js"></script>
	<script src="http://conductrics.github.com/conductrics-jquery/conductrics.jquery.js"></script>

	<script type="text/javascript">
		$(function() {

			// Initialize Conductrics plugin
			$.conductrics({
				owner: 'owner_123456789', 
				apiKey: '987654321',
				agent: 'my-agent-code' // use a different agent code for each 'test' or optimization project
			})
		})
	</script>
```

* **Note on URLs:** You may want to keep copies of the script files (jquery.min.js and conductrics.jquery.js) on your server, along with your other page content. There's nothing wrong with using the hosted locations shown in this snippet, but we can't guarantee the availablility of the jQuery or github CDNs. *

## Main Learning API

There are two basic steps:

1. **Getting a Decision**, which makes a selection from a set of options and returns the chosen one.
2. **Sending a Reward**, so we can learn how often each option leads to success in the real world.

You can wire these two steps into any web or mobile app.

The result is that your app "learns" what works most often, and favors the "best" option most of the time. Conductrics can cross-reference this learning with "targeting" data like geo-location or user segment, because the best option for one type of visitor might not be the best for another.

### 'get-decision' method

The plugin provides a 'get-decision' method for getting a selection from a Conductrics "agent". This method corresponds to the 'decision' call in the Conductrics Learning API. 

Each Condutrics agent cares about tracking success for each option in a set of options. Whenever one of your visitors or users encounters a spot in your site or app where one of those options should appear, you use this method to get a 'decision' from your agent.The Conductrics service 'decides' which option should be selected, and returns that selection to the jQuery plugin, where you can then do whatever is appropriate.

##### To get a decision from a Conductrics agent:

```javascript
	// Get a decision from Conductrics
	$.conductrics('get-decision', {choices:['big', 'small']}, function(selection) {
		switch (selection.code) {
			case 'big':
				// do something!
				break;
			case 'small':
				// do something else!
				break;
		}
	})
```

The arguments for 'get-decision' are as follows:

1. An options object which you can use to override the default behavior. 
The most important property of this object is **choices**, which you can use to specify the list of choices that you want your agent to choose amongst. Just provide an array of strings as shown above -- one of them will come back as the selection from the Conductrics service and get passed to your callback. If you don't provide any **choices**, the plugin uses ["a","b"] as a default.

2. A callback function which will receive the selection from the Conductrics service. The selection will be an object that has a **code** property, which will be one of the strings that were provided as options (so, in this example, you can expect selection.code to be either "big" or "small").

### 'send-goal' method

Great. Your agent is making decisions for you and you're showing the appropriate content or functionality to your users.

The only thing that's left is to let your agent know when a goal is achieved, so your agent can 'credit' the option it selected as having led to success.

##### To send a goal to Conductrics:

```javascript
	// Send a reward to Conductrics when success is achieved
	$('.demo-goal').click(function() {
		$.conductrics('send-goal')
	})
```

Optionally, you may send a numeric goal value, if the goal that has just been achieved has one conceptually (think a purchase on an e-commerce site; that goal's value can probably be thought of as the actual purchase amount). Provide the numeric value via the **reward** property of the optional second argument, like so:

```javascript
	// Send a reward to Conductrics when success is achieved
	$('.demo-goal').click(function() {
		$.conductrics('send-goal', {reward:14.99})
	})
```

### expire-session

This is often not needed at all, but if your site or app is such that your users or visitors will have a way to explicity 'log out' or 'exit', you can let the Conductrics service know. This will close out the user's session, cause the Conductrics service to ignore any subsequent goals, and make them eligible to get a different choice shoudl they re-encounter the same agent. 

```javascript
	// Send a reward to Conductrics when success is achieved
	$('.demo-logout').click(function() {
		$.conductrics('expire-session')
	})
```

## Helper Methods

### 'toggle' method

Given a jQuery selector, shows or hides whatever the selector matches:

```javascript
	$(document).ready(function() {
	
		// Have Conductrics either show or hide something
		$('.something').conductrics('toggle')
	})
```

### 'choose-best' method

Given a jQuery select which matches two or more elements, shows one of the elements and hides the others:

```javascript
	$(document).ready(function() {
	
		// Have Conductrics either show or hide something
		$('.areas-to-test-against-each-other').conductrics('choose-best')
	})
```

### 'redirect-to-best-url' method

Given an array of URLs, redirects to one of the URLs dynamically, favoring the best-performing URL over time.
The first URL in the list will be the "fallback" if there is a problem reaching your Conductrics agent for any reason.

```javascript
	$(document).ready(function() {
	
		// Redirect to one of these URLs
		$.conductrics('redirect-to-best-url', ['http://google.com', 'http://bing.com'])
	})
```