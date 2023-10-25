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
/*
document.getElementById('save').addEventListener('click', () => {
	const data = [new window.ClipboardItem({ "text/html": new Blob([`
		<html>
<body>
<!--StartFragment--><span style="font-style:italic;font-weight:600" data-token-index="0" class="notion-enable-hover" data-reactroot="">Создание нового листа: по клику на Create New List открываем сразу создаем новый пустой watchlist: </span><!--EndFragment-->
</body>
</html>
	`], { type: "text/html" }) })]
	navigator.clipboard.write(data)
	const content = editor.getContent()
	console.log(content)
})

console.log(editor)

document.getElementById('copy-list').addEventListener('click', () => {
	const data = [new window.ClipboardItem({ "text/html": new Blob([`
		<ul>
			<li>first</li>
			<li>second</li>
		</ul>
	`], { type: "text/html" }) })]
	navigator.clipboard.write(data)
})
document.getElementById('copy-containers').addEventListener('click', () => {
	const data = [new window.ClipboardItem({ "text/html": new Blob([`
		<p>First</p>
		<p>Second</p>
		<p>Third</p>
	`], { type: "text/html" }) })]
	navigator.clipboard.write(data)
})
document.getElementById('copy-table').addEventListener('click', () => {
	const data = [new window.ClipboardItem({ "text/html": new Blob([`
		<p>before</p>
		<table>
			<tr>
				<td>First</td>
				<td>Second</td>
				<td>Third</td>
			</tr>
		</table>
		<p>after</p>
	`], { type: "text/html" }) })]
	navigator.clipboard.write(data)
})
*/
