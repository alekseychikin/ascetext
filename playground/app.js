import 'regenerator-runtime/runtime'

import Editor from '../index.js'
import ParagraphPlugin from '../plugins/paragraph.js'
import BreakLinePlugin from '../plugins/break-line.js'
import TextPlugin from '../plugins/text.js'
import HeaderPlugin from '../plugins/header.js'
import LinkPlugin from '../plugins/link.js'
import ImagePlugin from '../plugins/image.js'
import ListPlugin from '../plugins/list.js'
import QuotePlugin from '../plugins/quote.js'

const plugins = [
	new TextPlugin(),
	new BreakLinePlugin(),
	new ParagraphPlugin(),
	new HeaderPlugin(),
	new LinkPlugin(),
	new ImagePlugin({
		placeholder: 'Add image caption'
	}),
	new ListPlugin(),
	new QuotePlugin()
]

const editor = new Editor(document.getElementById('app'), {
	plugins,
	placeholder: 'Here is where your story comes...'
})

console.log(editor.model)
window.editor = editor
