
# Assumes jQuery

highlighted = null

mousemove = (evt) ->
	evt.preventDefault()
	evt.stopPropagation()
	elem = document.elementFromPoint evt.pageX, evt.pageY
	if elem isnt highlighted
		highlighted = elem
		$(".autopick-highlight").removeClass("autopick-highlight")
		pos = $(elem).addClass("autopick-highlight").offset()
		width = $(elem).width() + 1
		height = $(elem).height() + 1
		top = (pos.top - 1) + "px"
		left = (pos.left - 1) + "px"
		right = (pos.left + width) + "px"
		bottom = (pos.top + height) + "px"
		$("#autopick-overlay-top").css
			width: "100%"
			top: 0
			left: 0
			height: top
		$("#autopick-overlay-left").css
			width: left
			left: 0
			top: top
			height: "100%"
		$("#autopick-overlay-right").css
			left: right
			top: top
			height: "100%"
			width: "100%"
		$("#autopick-overlay-bottom").css
			left: left
			top: bottom
			height: "100%"
			width: width

	$("#autopick-tooltip").show().css
		top: (evt.pageY + 10) + "px"
		left: (evt.pageX + 10) + "px"

click = (evt) ->
	evt.preventDefault()
	evt.stopPropagation()

hijacked = false
hijack = ->
	return if hijacked
	$(document).bind('mousemove', mousemove).bind('click', click)
	hijacked = true
free = ->
	return unless hijacked
	$(document).unbind('mousemove', mousemove).unbind('click', click)
	$("#autopick-tooltip").hide()
	hijacked = false

jQuery.autoPick = (command = 'toggle') ->
	if $("style#autopick-style").length is 0
		$("head").append("<style id='autopick-style'>
			.autopick-highlight {
			}
			.autopick-overlay {
				position: absolute;
				opacity: 0.7;
				background-color: black;
			}
			#autopick-tooltip {
				position: absolute;
				opacity: 0.7;
				background-color: khaki;
			}
		</style>")
		$("body").append("<span id='autopick-tooltip' style='display:none'>This is a tooltip.</span>")
		$("body").append("<div id='autopick-overlay-top' class='autopick-overlay'>&nbsp;</div>")
		$("body").append("<div id='autopick-overlay-left' class='autopick-overlay'>&nbsp;</div>")
		$("body").append("<div id='autopick-overlay-right' class='autopick-overlay'>&nbsp;</div>")
		$("body").append("<div id='autopick-overlay-bottom' class='autopick-overlay'>&nbsp;</div>")
	switch command
		when 'hijack' then hijack()
		when 'free' then free()
		when 'toggle' then free() if hijacked else hijack()

	p = @[0]
	while p
		p = p.parentNode


		
