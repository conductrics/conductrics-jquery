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
	basePath = "/"

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
		console.log "free-ing"
		return unless hijacked
		$(document)
			.unbind('mousemove')
			.unbind('click')
		$(".autopick-overlay").hide()
		hijacked = false

	dialogShow = ->
		$('body').append """
			<div class="autopicker-dialog">
				<form>
					<div class='autopicker-dialog-selector-group'>
						<label for="selectorShowHide">Show/Hide What?:</label>
						<input id="selectorShowHide" class='autopicker-dialog-selector-input' type="text" placeholder="click ... to choose"/>
						<button class='autopicker-dialog-selector-btn' type="button">...</button>
						<div>
							<button class="autopicker-dialog-snippet-btn" type="button">Next</button>
						</div>
					</div>
				</form>
			</div>
		"""

		# wire up dialog
		$('.autopicker-dialog-selector-btn')
			.click (evt) ->
				evt.preventDefault()
				evt.stopPropagation()
				hijack (chosen) ->
					console.log chosen
					$('.autopicker-dialog-selector-input')
						.val(chosen.path[-1..])
						.focus()
		$('.autopicker-dialog-selector-input')
			.bind 'focusin keyup', ->
				selectorStr = $(this).val()
				$.autoPick('unhighlight-all')
				$.autoPick('highlight', selectorStr)
			.bind 'focusout', ->
				$.autoPick('unhighlight-all')
		$('.autopicker-dialog-snippet-btn')
			.bind 'click', ->
				group = $(this).closest('.autopicker-dialog-selector-group')
				selectorStr = group.find('.autopicker-dialog-selector-input').val()
				return unless selectorStr.length > 0
				snippet = $.autoPick 'snippet', selectorStr
				snippetShow snippet			

	dialogFinish = ->
		$('.autopicker-dialog').remove()
	
	snippetShow = (snippet) ->
		$('body').append """
			<div class="autopicker-dialog">
				<p>Great! Here's the code snippet to paste into your page:</p>
				<pre></pre>
				<div>
					<button class="autopicker-dialog-snippet-done-btn" type="button">Finished</button>
				</div>
			</div>
		"""
		$('.autopicker-dialog pre').text(snippet.replace(/\t/g, '  '))
		$('.autopicker-dialog-snippet-done-btn').click ->
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

	jQuery.autoPick = (command, callback) ->
		if $("style#autopick-style").length is 0
			$("head").append("<style id='autopick-style'>
				.autopick-highlight { border: 1px solid red; background-color: khaki; }
				.autopick-overlay { position: absolute; opacity: 0.5; background-color: black; }
				.autopicker-dialog { position: absolute; top: 10px; left: 10px; background-color:lightyellow; border: thin solid black; border-radius:4px; padding: 15px; box-shadow: 2px 2px 5px #888;}
				.autopicker-dialog pre { color:#0000bb; font-size:12px; font-family: monospace; }
				.autopicker-dialog button { color:navy; padding:5px; }
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

