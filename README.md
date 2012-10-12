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

## Installation and Usage

1. Include jQuery. Version 1.7.1 was current at the time of this writing.
2. Include the plugin file (conductrics.jquery.js).
3. Use the init() function to provide your 'account owner' code and API key from Conductrics.





## Main Learning API

### get-decision

### send-goal

### expire-session