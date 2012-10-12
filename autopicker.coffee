
# Assumes jQuery

highlighted = null

mousemove = (callback) -> (evt) ->
	evt.preventDefault()
	evt.stopPropagation()
	elem = document.elementFromPoint evt.pageX, evt.pageY
	if elem isnt highlighted
		highlighted = elem
		$(".autopick-highlight").removeClass("autopick-highlight")
		pos = $(elem).addClass("autopick-highlight").offset()
		width = $(elem).width() + 1
		height = $(elem).height() + 1
		top = (pos.top - 2)
		left = (pos.left - 2)
		right = (pos.left + width + 3)
		bottom = (pos.top + height + 3)
		$("#autopick-overlay-top").css
			left: 0
			top: 0
			width: "100%"
			height: top + "px"
		$("#autopick-overlay-bottom").css
			left: 0
			top: bottom + "px"
			height: "100%"
			width: "100%"
		$("#autopick-overlay-left").css
			width: left + "px"
			left: 0
			top: top + "px"
			height: (bottom - top) + "px"
		$("#autopick-overlay-right").css
			left: right + "px"
			top: top + "px"
			height: (bottom - top) + "px"
			width: "100%"

click = (callback) -> (evt) ->
	evt.preventDefault()
	evt.stopPropagation()
	callback(report(evt.target))
	free()

describe = (node) ->
	return "null" if node is null
	"#{node.nodeName.toLowerCase()}" +
		(if node.id then "##{node.id}" else "") +
		(if node.className then "." + node.className.split(" ").join(".") else "")

report = (node) ->
	return "null" if node is null
	ret =
		id: []
		class: {}
		path: []
		parents: []
	p = node
	parents = []
	while true
		if p = p.parentNode
			break if p is document
			ret.parents.unshift p
			ret.path.unshift describe(p)
			if p.id
				ret.id.unshift p.id
			p.className?.split(" ").forEach (x) -> ret.class[x] = 1
		else break
	delete ret[""]
	return ret

hijacked = false
hijack = (callback) ->
	return if hijacked
	$(document).bind('mousemove', mousemove callback).bind('click', click callback)
	hijacked = true
free = ->
	return unless hijacked
	$(document)
		.unbind('mousemove')
		.unbind('click')
	$("#autopick-tooltip, .autopick-overlay").hide()
	hijacked = false

jQuery.autoPick = (command, callback) ->
	if $("style#autopick-style").length is 0
		$("head").append("<style id='autopick-style'>
			.autopick-highlight {
			}
			.autopick-overlay {
				position: absolute;
				opacity: 0.5;
				background-color: black;
			}
			#autopick-tooltip {
				position: absolute;
				background-color: khaki;
			}
		</style>")
		$("body").append("<div id='autopick-overlay-top' class='autopick-overlay'>&nbsp;</div>")
		$("body").append("<div id='autopick-overlay-left' class='autopick-overlay'>&nbsp;</div>")
		$("body").append("<div id='autopick-overlay-right' class='autopick-overlay'>&nbsp;</div>")
		$("body").append("<div id='autopick-overlay-bottom' class='autopick-overlay'>&nbsp;</div>")
	switch command
		when 'hijack' then hijack(callback)
		when 'free' then free()
		when 'toggle' then free() if hijacked else hijack(callback)



		
