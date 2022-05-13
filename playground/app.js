import 'babel-polyfill'

import Editor from '../index'
import { ParagraphPlugin } from '../plugins/paragraph'
import { BreakLinePlugin } from '../plugins/break-line'
import { TextPlugin } from '../plugins/text'
import { HeaderPlugin } from '../plugins/header'
import { LinkPlugin } from '../plugins/link'
import { ImagePlugin } from '../plugins/image'
import { ListPlugin } from '../plugins/list'

const plugins = {
	text: new TextPlugin(),
	breakLink: new BreakLinePlugin(),
	header: new HeaderPlugin(),
	paragraph: new ParagraphPlugin(),
	link: new LinkPlugin(),
	image: new ImagePlugin(),
	list: new ListPlugin()
}

const editor = new Editor(document.getElementById('app'), plugins)

console.log(editor)
