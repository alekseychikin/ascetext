import 'regenerator-runtime/runtime'

import Editor from '../index'
import ParagraphPlugin from '../plugins/paragraph'
import BreakLinePlugin from '../plugins/break-line'
import TextPlugin from '../plugins/text'
import HeaderPlugin from '../plugins/header'
import LinkPlugin from '../plugins/link'
import ImagePlugin from '../plugins/image'
import ListPlugin from '../plugins/list'
import QuotePlugin from '../plugins/quote'
import UserMentionPlugin from '../plugins/user-mention'

const plugins = {
	userMention: new UserMentionPlugin(),
	text: new TextPlugin(),
	breakLine: new BreakLinePlugin(),
	paragraph: new ParagraphPlugin(),
	header: new HeaderPlugin(),
	link: new LinkPlugin(),
	image: new ImagePlugin(),
	list: new ListPlugin(),
	quote: new QuotePlugin()
}

const editor = new Editor(document.getElementById('app'), { plugins })

document.getElementById('save').addEventListener('click', () => {
	const data = [new window.ClipboardItem({ "text/html": new Blob(["<h3>no next</h3>"], { type: "text/html" }) })];
	navigator.clipboard.write(data)
	const content = editor.getContent()
	console.log(content)
})

console.log(editor)
