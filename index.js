import Ascetext from './core/rich-editor'

import ParagraphPlugin, { Paragraph } from './plugins/paragraph'
import BreakLinePlugin from './plugins/break-line'
import TextPlugin from './plugins/text'
import HeaderPlugin, { Header } from './plugins/header'
import LinkPlugin, { Link } from './plugins/link'
import ImagePlugin, { Image, ImageCaption } from './plugins/image'
import ListPlugin, { List, ListItem, ListItemContent } from './plugins/list'
import Toolbar from './core/toolbar'
import ControlButton from './controls/button'
import ControlFile from './controls/file'
import ControlLink from './controls/link'
import ControlInput from './controls/input'

export {
	ParagraphPlugin,
	Paragraph,
	BreakLinePlugin,
	TextPlugin,
	HeaderPlugin,
	Header,
	LinkPlugin,
	Link,
	ImagePlugin,
	Image,
	ImageCaption,
	ListPlugin,
	List,
	ListItem,
	ListItemContent,
	Toolbar,
	ControlButton,
	ControlFile,
	ControlLink,
	ControlInput
}

export default Ascetext
