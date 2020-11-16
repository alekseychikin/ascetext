module.exports = function () {
	var modelElement = document.createElement('div')
	var selectionElement = document.createElement('div')

	modelElement.className = 'model'
	selectionElement.className = 'selection'

	function renderModel(model, parentElement = modelElement) {
		var element

		if (parentElement === modelElement) {
			while (parentElement.childNodes.length) {
				parentElement.childNodes[0].parentNode.removeChild(parentElement.childNodes[0])
			}
		}

		model.forEach((node) => {
			switch (node.type) {
				case 'section':
				case 'container':
				case 'widget':
				case 'node':
				case 'inlineWidget':
					element = document.createElement('div')
					break
				case 'text':
					element = document.createElement('span')
					break
			}

			switch (node.type) {
				case 'section':
					element.className = 'node section'
					element.appendChild(document.createTextNode(node.name))
					break
				case 'container':
					element.className = 'node container'
					element.appendChild(document.createTextNode(node.name))

					if (node.isChanged) {
						var changedElement = document.createElement('span')

						changedElement.className = 'changed'
						element.appendChild(changedElement)
					}

					break
				case 'widget':
					element.className = 'node widget'
					element.appendChild(document.createTextNode(node.name))
					break
				case 'node':
					element.className = 'node regular'
					element.appendChild(document.createTextNode(node.name))
					break
				case 'inlineWidget':
					element.className = 'inline-widget'

					const label = document.createElement('span')

					label.className = 'inline-widget-label'
					label.appendChild(document.createTextNode(node.name))
					element.appendChild(label)
					break
				case 'text':
					element.className = 'text'
					element.appendChild(document.createTextNode(node.content))
					break
			}

			switch (node.type) {
				case 'section':
					parentElement.appendChild(element)

					element = document.createElement('div')
					element.className = 'placeholder placeholder--bordered'
					parentElement.appendChild(element)

					break
				case 'container':
				case 'widget':
				case 'node':
					parentElement.appendChild(element)

					if (node.children.length) {
						element = document.createElement('div')
						element.className = 'placeholder'
						parentElement.appendChild(element)
					} else {
						element = document.createElement('div')
						parentElement.appendChild(element)
					}

					break
				case 'inlineWidget':
				case 'text':
					parentElement.appendChild(element)
					break
			}

			switch (node.type) {
				case 'section':
				case 'container':
				case 'widget':
				case 'node':
				case 'inlineWidget':
					renderModel(node.children, element)
					break
			}
		})
	}

	function renderSelection(selection) {
		while (selectionElement.childNodes.length) {
			selectionElement.childNodes[0].parentNode.removeChild(selectionElement.childNodes[0])
		}

		var rangeElement = document.createElement('div')
		rangeElement.className = 'selection-range'

		selectionElement.appendChild(rangeElement)

		rangeElement.appendChild(
			document.createTextNode(selection.anchorIndex.join(':') + ' – ' + selection.focusIndex.join(':'))
		)

		var flagsElement = document.createElement('div')
		flagsElement.className = 'selection-flags'

		var aafp = document.createElement('div')
		aafp.className = 'selection-flag' + (selection.aafp ? ' active' : '')
		aafp.title = 'Anchor At First Position'
		aafp.appendChild(document.createTextNode('aafp'))

		var aalp = document.createElement('div')
		aalp.className = 'selection-flag' + (selection.aalp ? ' active' : '')
		aalp.title = 'Anchor At Last Position'
		aalp.appendChild(document.createTextNode('aalp'))

		var fafp = document.createElement('div')
		fafp.className = 'selection-flag' + (selection.fafp ? ' active' : '')
		fafp.title = 'Focus At First Position'
		fafp.appendChild(document.createTextNode('fafp'))

		var falp = document.createElement('div')
		falp.className = 'selection-flag' + (selection.falp ? ' active' : '')
		falp.title = 'Focus At Last Position'
		falp.appendChild(document.createTextNode('falp'))

		var rng = document.createElement('div')
		rng.className = 'selection-flag selection-flag-range' + (selection.rng ? ' active' : '')
		rng.title = 'Selected Range'
		rng.appendChild(document.createTextNode('rng'))

		selectionElement.appendChild(flagsElement)

		flagsElement.appendChild(aafp)
		flagsElement.appendChild(aalp)
		flagsElement.appendChild(fafp)
		flagsElement.appendChild(falp)
		flagsElement.appendChild(rng)
	}

	document.body.appendChild(modelElement)
	document.body.appendChild(selectionElement)

	const style = document.createElement('style')

	style.type = 'text/css'
	style.appendChild(document.createTextNode(`
		html, body {
			margin: 0;
			padding: 0;
		}

		body {
			font: 11px/15px Menlo, monospace;
			background: #fff;
			color: #000;
		}

		.model {
			margin: 10px 15px;
		}

		.selection {
			position: fixed;
			right: 10px;
			top: 10px;
			box-sizing: border-box;
			border-radius: 2px;
			border: 1px solid #ddd;
			padding: 0 10px;
			min-width: 180px;
			height: 40px;
			line-height: 20px;
			background: #f3f3f3;
		}

		.selection-range::before {
			content: 'Selection:';
			display: inline-block;
			margin-right: 15px;
		}

		.selection-flags {
			display: flex;
		}

		.selection-flag {
			font-size: 9px;
			text-transform: uppercase;
			letter-spacing: 1px;
			line-height: 20px;
			height: 20px;
			color: #c5c5c5;
		}

		.selection-flag.active {
			color: #d9742b;
		}

		.selection-flag + .selection-flag {
			margin-left: 7px;
		}

		.selection-flag-range {
			margin-left: auto !important;
		}

		.node {
			display: inline-block;
			margin-top: 10px;
			border-radius: 2px;
			padding: 0 10px;
			height: 20px;
			line-height: 20px;
			color: #000;
		}

		.empty {
			display: block;
		}

		.node:first-child {
			margin-top: 0;
		}

		.placeholder {
			margin: 10px 0 0 15px;
		}

		.placeholder--bordered {
			margin: -10px 0 0 10px;
			border: 1px solid #c1c1c1;
			border-radius: 3px;
			padding: 20px 10px 10px 10px;
		}

		.section {
			background: #ad2294;
			color: #fff;
		}

		.regular {
			box-sizing: border-box;
			background: #f3f3f3;
			border: 1px solid #ddd;
		}

		.container {
			position: relative;
			background: #e1f2dd;
		}

		.changed {
			position: absolute;
			top: 3px;
			right: 3px;
			border-radius: 50%;
			width: 3px;
			height: 3px;
			background: #d9742b;
		}

		.widget {
			background: #dceeff;
		}

		.inline-widget {
			box-sizing: border-box;
			display: inline-block;
			margin-right: 5px;
			border: 1px solid #f3e6b6;
			color: #000;
		}

		.inline-widget-label {
			padding-right: 5px;
			background: #f3e6b6;
			background-clip: content-box;
		}

		.text {
			display: inline;
			padding-right: 5px;
			background: #f3f3f3;
			background-clip: content-box;
		}
	`))
	document.head.appendChild(style)

	rempl.getSubscriber(function(api) {
		api.ns('model').subscribe(function(model) {
			if (model) {
				console.log(model)
				renderModel(model)
			}
		})

		api.ns('selection').subscribe(function(selection) {
			if (selection) {
				renderSelection(selection)
			}
		})
	})
}
