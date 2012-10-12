do init = ->
	console.log 'initing autopicker'
	if not window.jQuery?
		s = document.createElement('script')
		s.src = 'http://code.jquery.com/jquery-latest.min.js'
		s.onload = init
		console.log 'injecting jQuery'
		document.head.appendChild(s)
		return

	highlighted = null

	mousemove = (callback) -> (evt) ->
		evt.preventDefault()
		evt.stopPropagation()
		elem = document.elementFromPoint evt.clientX, evt.clientY
		if elem isnt highlighted
			highlighted = elem
			if not elem then return
			pos = $(elem).offset()
			if not pos then return
			width = $(elem).width() + 1
			height = $(elem).height() + 1
			top = (pos.top - 4)
			left = (pos.left - 4)
			right = (pos.left + width + 5)
			bottom = (pos.top + height + 5)
			$(".autopick-overlay").show()
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
			path: [describe(node)]
			parents: [node]
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
		$(".autopick-overlay").hide()
		hijacked = false

	jQuery.autoPick = (command, callback) ->
		if $("style#autopick-style").length is 0
			$("head").append("<style id='autopick-style'>
				.autopick-highlight { border: 1px solid red; background-color: khaki; }
				.autopick-overlay { position: absolute; opacity: 0.5; background-color: black; }
			</style>")
			$("body").append("<div id='autopick-overlay-top' class='autopick-overlay'>&nbsp;</div>")
			$("body").append("<div id='autopick-overlay-left' class='autopick-overlay'>&nbsp;</div>")
			$("body").append("<div id='autopick-overlay-right' class='autopick-overlay'>&nbsp;</div>")
			$("body").append("<div id='autopick-overlay-bottom' class='autopick-overlay'>&nbsp;</div>")
		switch command
			when 'hijack' then hijack(callback)
			when 'free' then free()
			when 'toggle' then (free() if hijacked else hijack callback)
			when 'highlight' then $(callback).toggleClass('autopick-highlight')
	
	window.autoPickReady?()

