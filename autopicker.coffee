do init = ->
	console.log 'initing autopicker'

	$ = window.jQuery or window.jQ or window.$
	console.log "dollar is now", $

	unless $?.fn
		_prev = window.$
		s = document.createElement('script')
		s.src = 'http://code.jquery.com/jquery-latest.min.js'
		s.onload = -> 
			window.jQuery = window.jQuery.noConflict()
			window.$ = _prev
			init()
			console.log 'injected jQuery'
		console.log 'injecting jQuery'
		document.head.appendChild(s)
		return

	highlighted = null
	basePath = "http://api.conductrics.com/js/"

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
			(if node.className then "." + node.className.split(" ").join(".") else "") + 
			(if node.nodeName.toLowerCase() is 'img' then "[src=\"#{$(node).attr('src')}\"]" else "")

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

	dialogShow = ->
		$('body').append """
			<div class="autopick-dialog">
				<form>
					<div class='autopick-dialog-selector-group'>
						<label for="selectorShowHide">Show/Hide What?</label>
						<input id="selectorShowHide" class='autopick-dialog-selector-input' type="text" placeholder="click ... to choose"/>
						<button class='autopick-dialog-selector-btn' type="button">...</button>
						<div>
							<button class="autopick-dialog-snippet-btn" type="button">Next</button>
						</div>
					</div>
				</form>
			</div>
		"""

		# wire up dialog
		$('.autopick-dialog-selector-btn')
			.click (evt) ->
				evt.preventDefault()
				evt.stopPropagation()
				hijack (chosen) ->
					console.log chosen
					selectorStr = chosen.path[-1..]
					$('.autopick-dialog-selector-input')
						.val(selectorStr)
						.focus()

		$('.autopick-dialog-selector-input')
			.bind 'focusin keyup', ->
				selectorStr = $(this).val()
				$.autoPick('unhighlight-all')
				$.autoPick('highlight', selectorStr)
				if selectorStr.length > 0
					$('.autopick-dialog-snippet-btn').removeAttr('disabled')
				else
					$('.autopick-dialog-snippet-btn').attr('disabled', 'disabled')
			.bind 'focusout', ->
				$.autoPick('unhighlight-all')
		$('.autopick-dialog-snippet-btn')
			.bind 'click', ->
				console.log 'before closest', $().closest, $
				group = $(this).parents('.autopick-dialog-selector-group')
				selectorStr = group.find('.autopick-dialog-selector-input').val()
				return unless selectorStr.length > 0
				snippet = $.autoPick 'snippet', selectorStr
				snippetShow snippet	

	dialogFinish = ->
		$('.autopick-dialog').remove()
	
	snippetShow = (snippet) ->
		$('body').append """
			<div class="autopick-dialog">
				<p>Great! Here's the code snippet to paste into your page:</p>
				<pre></pre>
				<div>
					<button class="autopick-dialog-snippet-done-btn" type="button">Finished</button>
				</div>
			</div>
		"""
		$('.autopick-dialog pre').text(snippet.replace(/\t/g, '  '))
		$('.autopick-dialog-snippet-done-btn').click ->
			$.autoPick 'finish'

	generateCodeToPaste = (selectorStr) ->
		console.log "generate"
		owner = 'your-owner-code'
		apikey = 'your-api-key'
		agent = 'jquery-example-' + Math.round(new Date().getTime() / 10000)

		str = """
			<script src="#{basePath}conductrics.jquery.js"></script>
			<script type="text/javascript">
				$.conductrics({
					owner: '#{owner}',
					apiKey: '#{apikey}',
					agent:'#{agent}'
				})

				$('#{selectorStr}').conductrics('toggle')
			</script>
		"""
		return str

	$.autoPick = (command, callback) ->
		if $("style#autopick-style").length is 0
			$("head").append("<style id='autopick-style'>
				.autopick-highlight { border: 1px solid red; background-color: khaki; }
				.autopick-overlay { position: absolute; opacity: 0.5; background-color: black; }
				.autopick-dialog { position: absolute; z-index:10000; top: 10px; left: 10px; background-color:lightyellow; border: thin solid black; border-radius:4px; padding: 15px; box-shadow: 2px 2px 5px #888;}
				.autopick-dialog pre { color:#0000bb; font-size:12px; font-family: monospace; }
				.autopick-dialog button { color:navy; padding:5px; }
				.autopick-dialog label { font-size: 12px; font-family:sans-serif; }
			</style>")
			$("body").append("<div id='autopick-overlay-top' class='autopick-overlay'>&nbsp;</div>")
			$("body").append("<div id='autopick-overlay-left' class='autopick-overlay'>&nbsp;</div>")
			$("body").append("<div id='autopick-overlay-right' class='autopick-overlay'>&nbsp;</div>")
			$("body").append("<div id='autopick-overlay-bottom' class='autopick-overlay'>&nbsp;</div>")
		switch command
			when 'start' then dialogShow()
			when 'finish' then dialogFinish()
			when 'hijack' then hijack(callback)
			when 'free' then free()
			when 'toggle' then (free() if hijacked else hijack callback)
			when 'snippet' then generateCodeToPaste callback
			when 'highlight' 
				$(callback).toggleClass('autopick-highlight')
			when 'unhighlight-all'
				$('.autopick-highlight').removeClass('autopick-highlight')
	
	window.autoPickReady?()

