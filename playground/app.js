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
window.printTree = (node, deep = 0) => {
	let i
	let output = ''
	let current = node.first

	for (i = 0; i < deep; i++) {
		output += '|'
	}

	output += `${node.type} (${node.id})`

	if (node.type === 'text') {
		output += ` "${node.attributes.content}"`
	}

	output += '\n'

	if (node.first) {
		for (i = 0; i < deep; i++) {
			output += '|'
		}

		output += '\\\n'
	}

	while (current) {
		output += window.printTree(current, deep + 1)
		current = current.next
	}

	if (node.first) {
		for (i = 0; i < deep; i++) {
			output += '|'
		}

		output += '/\n'
	}

	return output
}

setTimeout(() => {
	// const list = editor.builder.create('list')
	// const listItem1 = editor.builder.create('list-item')
	// const listItem2 = editor.builder.create('list-item')
	// const content1 = editor.builder.create('list-item-content')
	// const content2 = editor.builder.create('list-item-content')
	// const text1 = editor.builder.create('text', { content: 'list item 1' })
	// const text2 = editor.builder.create('text', { content: 'list item 2' })

	// editor.builder.append(editor.model, list, editor.model.first)
	// editor.builder.append(list, listItem1)
	// editor.builder.append(listItem1, content1)
	// editor.builder.append(content1, text1)

	// editor.builder.append(listItem2, content2)
	// editor.builder.append(content2, text2)

	// editor.builder.cut(editor.model.first.next.first.first.first.next)
	// editor.builder.append(editor.model.last.last.last, editor.builder.create('text', { content: ' append' }))
	// editor.builder.append(editor.model.last.last.last, editor.builder.create('text', { content: ' more' }))
	// editor.builder.append(editor.model.last, listItem1)
	console.warn('!normalize!')
	editor.builder.normalize(editor.model.last)

	// editor.builder.split(editor.model, 19)
	// editor.builder.split(editor.model, 90)
}, 1000)

setTimeout(() => {
	// const fragment = editor.builder.createFragment()
	// const text1 = editor.builder.create('text', { content: 'Just ' })
	// const text2 = editor.builder.create('text', { content: 'some', weight: 'bold' })
	// const text3 = editor.builder.create('text', { content: ' text' })

	// editor.builder.append(fragment, text1)
	// editor.builder.append(fragment, text2)
	// editor.builder.append(fragment, text3)
	// editor.builder.append(editor.model.first, text1, editor.model.first.first.next)
}, 2000)

// const data = [new window.ClipboardItem({ "text/html": new Blob([`
// 			<ol>
// 				<li>
// 					<strong>Frontend Developer at Innova, Moscow</strong>

// 					<figure class="image">
// 						<img src="https://ascetext.alekseychikin.ru/small.jpg" alt="" />
// 						<figcaption></figcaption>
// 					</figure>

// 					Created architecture and developed indoor products for company:
// 					<ul>
// 						<li>Library for providing purchase methods on external landings</li>
// 						<li>Library for collecting and analysing users behaviour</li>
// 					</ul>
// 				</li>

// 				<li>
// 					<strong>Full Stack Developer at Typomania design school, Moscow</strong><br />
// 					<em>volunteer since 2019</em><br />
// 					Created full-stack solution for videoclips competition. Besides frontend, I developed backend
// 					written on php, with Amazon services (S3, CloudFront, SNS, SES), and YouTube API integration.
// 				</li>
// 			</ol>

// 			<ol>
// 				<li>Library for providing purchase methods on external landings</li>
// 				<li>Library for collecting and analysing users behaviour</li>
// 			</ol>
// 	`], { type: "text/html" }) })]
// 	navigator.clipboard.write(data)

setTimeout(() => {
// 	const paragraph = editor.builder.create('paragraph')
// 	const text = editor.builder.create('text', {
// 		content: 'Line 2'
// 	})
// 	editor.builder.append(paragraph, text)
// 	editor.builder.append(editor.model, paragraph)
// 	console.log(editor.model)
}, 4000)

// setTimeout(() => {
// 	editor.builder.cut(editor.model.first.first)
// }, 2000)

// setTimeout(() => {
// 	const text = editor.builder.create('text', {
// 		content: 'Line 3'
// 	})
// 	const br = editor.builder.create('breakLine')
// 	editor.builder.append(editor.model.first, text)
// 	editor.builder.append(editor.model.first, br)
// }, 3000)

// setTimeout(() => {
// 	editor.builder.cut(editor.model.first.last)
// }, 4000)

// editor.selection.setSelection(editor.model.first.next.next.next.next, 30, editor.model.first.next.next.next.next.next, 50)
// setTimeout(() => {
	// editor.builder.cutUntil(editor.model.first.next.next, editor.model.first.next.next.next.next)
// }, 5000)
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

setTimeout(() => {
	// const image = editor.builder.create('image', { src: 'small.jpg' })
	// const caption = editor.builder.create('image-caption', { placeholder: 'placeholder' })

	// editor.builder.append(image, caption)
	// editor.builder.append(editor.model, image, editor.model.first)
}, 2000)
