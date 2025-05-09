const isMac = navigator.userAgent.includes('Macintosh')
const codes = {
	'0': 48,
	'1': 49,
	'2': 50,
	'3': 51,
	'4': 52,
	'5': 53,
	'6': 54,
	'7': 55,
	'8': 56,
	'9': 57,
	'A': 65,
	'B': 66,
	'C': 67,
	'D': 68,
	'E': 69,
	'F': 70,
	'G': 71,
	'H': 72,
	'I': 73,
	'J': 74,
	'K': 75,
	'L': 76,
	'M': 77,
	'N': 78,
	'O': 79,
	'P': 80,
	'Q': 81,
	'R': 82,
	'S': 83,
	'T': 84,
	'U': 85,
	'V': 86,
	'W': 87,
	'X': 88,
	'Y': 89,
	'Z': 90,
	'BACKSPACE': 8,
	'ENTER': 13,
	'ESCAPE': 27,
	'LEFT': 37,
	'ARROWLEFT': 37,
	'UP': 38,
	'ARROWUP': 38,
	'RIGHT': 39,
	'ARROWRIGHT': 39,
	'DOWN': 40,
	'ARROWDOWN': 40,
	'INSERT': 45,
	'DELETE': 46,
	'TAB': 9,
	'HOME': 36,
	'.': 190,
	'[': 219,
	']': 221
}
const modifierCodes = {
	'META': 1,
	'ALT': 2,
	'CTRL': 4,
	'SHIFT': 8
}

export default function createShortcutMatcher(event) {
	const modifiers = 0 +
		(event.metaKey ? 1 : 0) +
		(event.altKey ? 2 : 0) +
		(event.ctrlKey ? 4 : 0) +
		(event.shiftKey ? 8 : 0)
	const code = codes[event.key.toUpperCase()]

	return (shortcut) => {
		const shortcuts = shortcut.split('/').map((item) => item.trim())
		const platformShortcut = shortcuts[1] && isMac ? shortcuts[1] : shortcuts[0]
		const chunks = platformShortcut.split('+').map((item) => item.toUpperCase())

		const parsedShortcut = chunks.reduce((result, chunk) => {
			if (modifierCodes[chunk]) {
				result.modifiers += modifierCodes[chunk]
			} else {
				result.code = codes[chunk]
			}

			return result
		}, {
			modifiers: 0,
			code: 0
		})

		return code && parsedShortcut.modifiers === modifiers && parsedShortcut.code === code
	}
}
