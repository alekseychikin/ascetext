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

window.printTree = (node, deep = 0) => {
	let i
	let output = ''
	let current = node.first

	for (i = 0; i < deep; i++) {
		output += '|'
	}

	output += `${node.type} (${node.id};${node.childrenAmount})`

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
const editor = new Editor(document.getElementById('app'), {
	plugins,
	placeholder: 'Here is where your story comes...'
})

console.log(editor.model)
window.editor = editor

// setTimeout(() => {
// 	editor.setJson(JSON.parse(`[
//   {
//     "type": "list",
//     "decor": "marker",
//     "body": [
//       {
//         "type": "list-item",
//         "body": [
//           {
//             "type": "list-item-content",
//             "body": [
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/565",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "565"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " – "
//               },
//               {
//                 "type": "text",
//                 "modifiers": [
//                   "bold"
//                 ],
//                 "content": "Eutychius of Constantinople"
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " was arrested after he refused "
//               },
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/Byzantine_Empire",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "Byzantine"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " emperor "
//               },
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/Justinian_I",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "Justinian I"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": "'s order to adopt the tenets of the "
//               },
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/Aphthartodocetae",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "Aphthartodocetae"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": ", a sect of "
//               },
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/Non-Chalcedonian_Christianity",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "non-Chalcedonian Christians"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": "."
//               }
//             ]
//           }
//         ]
//       },
//       {
//         "type": "list-item",
//         "body": [
//           {
//             "type": "list-item-content",
//             "body": [
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/1273",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "1273"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " – "
//               },
//               {
//                 "type": "text",
//                 "modifiers": [
//                   "bold"
//                 ],
//                 "content": "Muhammad II"
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " became "
//               },
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/Emirate_of_Granada",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "Sultan of Granada"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " after "
//               },
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/Muhammad_I_of_Granada",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "his father"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": "'s death in a riding accident."
//               }
//             ]
//           }
//         ]
//       },
//       {
//         "type": "list-item",
//         "body": [
//           {
//             "type": "list-item-content",
//             "body": [
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/1879",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "1879"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " – "
//               },
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/Anglo-Zulu_War",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "Anglo-Zulu War"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": ": The "
//               },
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/Zulu_Kingdom",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "Zulu"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " forces of "
//               },
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/Cetshwayo",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "King Cetshwayo"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " "
//               },
//               {
//                 "type": "text",
//                 "modifiers": [
//                   "italic"
//                 ],
//                 "content": "(pictured)"
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " achieved a decisive victory at the "
//               },
//               {
//                 "type": "text",
//                 "modifiers": [
//                   "bold"
//                 ],
//                 "content": "Battle of Isandlwana"
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": "."
//               }
//             ]
//           }
//         ]
//       },
//       {
//         "type": "list-item",
//         "body": [
//           {
//             "type": "list-item-content",
//             "body": [
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/1973",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "1973"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " – The "
//               },
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/Supreme_Court_of_the_United_States",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "U.S. Supreme Court"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": "'s "
//               },
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/Lists_of_landmark_court_decisions",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "landmark decision"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " in "
//               },
//               {
//                 "type": "text",
//                 "modifiers": [
//                   "bold",
//                   "italic"
//                 ],
//                 "content": "Roe v. Wade"
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " struck down laws restricting "
//               },
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/Abortion",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "abortion"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " during the first two "
//               },
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/Pregnancy#Trimesters",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "trimesters of pregnancy"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": "."
//               }
//             ]
//           }
//         ]
//       },
//       {
//         "type": "list-item",
//         "body": [
//           {
//             "type": "list-item-content",
//             "body": [
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/2006",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "2006"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " – "
//               },
//               {
//                 "type": "text",
//                 "modifiers": [
//                   "bold"
//                 ],
//                 "content": "Evo Morales"
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " was inaugurated as "
//               },
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/President_of_Bolivia",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "President of Bolivia"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": ", becoming the country's first "
//               },
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/Indigenous_peoples_in_Bolivia",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "indigenous"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " president."
//               }
//             ]
//           }
//         ]
//       },
//       {
//         "type": "list-item",
//         "body": [
//           {
//             "type": "list-item-content",
//             "body": [
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/2012",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "2012"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " – "
//               },
//               {
//                 "type": "text",
//                 "modifiers": [
//                   "bold"
//                 ],
//                 "content": "Croatia held a referendum"
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " in which it voted to become a member of the "
//               },
//               {
//                 "type": "link",
//                 "url": "https://en.wikipedia.org/wiki/European_Union",
//                 "body": [
//                   {
//                     "type": "text",
//                     "modifiers": [],
//                     "content": "European Union"
//                   }
//                 ]
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": "."
//               }
//             ]
//           }
//         ]
//       },
//       {
//         "type": "list-item",
//         "body": [
//           {
//             "type": "list-item-content",
//             "body": [
//               {
//                 "type": "text",
//                 "modifiers": [
//                   "bold"
//                 ],
//                 "content": "Christian Ramsay"
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " (d. 1839)"
//               }
//             ]
//           }
//         ]
//       },
//       {
//         "type": "list-item",
//         "body": [
//           {
//             "type": "list-item-content",
//             "body": [
//               {
//                 "type": "text",
//                 "modifiers": [
//                   "bold"
//                 ],
//                 "content": "Vito Cascio Ferro"
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " (b. 1862)"
//               }
//             ]
//           }
//         ]
//       },
//       {
//         "type": "list-item",
//         "body": [
//           {
//             "type": "list-item-content",
//             "body": [
//               {
//                 "type": "text",
//                 "modifiers": [
//                   "bold"
//                 ],
//                 "content": "S. Vithiananthan"
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " (d. 1989)"
//               }
//             ]
//           }
//         ]
//       },
//       {
//         "type": "list-item",
//         "body": [
//           {
//             "type": "list-item-content",
//             "body": [
//               {
//                 "type": "text",
//                 "modifiers": [
//                   "bold"
//                 ],
//                 "content": "Ursula K. Le Guin"
//               },
//               {
//                 "type": "text",
//                 "modifiers": [],
//                 "content": " (d. 2018)"
//               }
//             ]
//           }
//         ]
//       }
//     ]
//   }
// ]`))
// 	console.log(window.printTree(window.editor.model))
// }, 2000)
