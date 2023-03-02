/// <reference types="node" />

export declare class Ascetext {
	constructor(container: HTMLElement, params?: {
		plugins?: Record<string, PluginPlugin>;
		icons?: Record<string, string>;
		toolbar?: (instance: Ascetext) => Toolbar;
	});
	destroy(): void;
}

export declare class Node {
	type: string;
	parent: Node;
	first: Node;
	last: Node;
	previous: Node;
	next: Node;
	isSection: boolean;
	isContainer: boolean;
	isWidget: boolean;
}

export declare class Selection {
	selectedItems: Array<Node>;
	anchorContainer: Node;
	focuseContainer: Node;
	isRange: boolean;
	constructor(core: Ascetext);
	setSelection(anchorNode: Node, anchorOffset: number, focusNode?: Node, focusOffset?: number): void;
	restoreSelection(): void;
	getSelectionInIndexes(): Array<number>;
}

export declare class Control {
	slug: string;
	label: string;
	icon: string;
	action: () => void;
	type: string;
}

export declare class ControlControl {
	element: HTMLElement;
	params: Control;
	handler: (action: () => void, event: Event) => void;
	constructor(params: Control);
	getElement(): HTMLElement;
	setEventListener(handler: (action: () => void, event: Event) => void): void;
}

export declare class ControlButton extends ControlControl {}

export declare class PluginPlugin {
	getInsertControls(container: Node): Array<Control>;
	getReplaceControls(container: Node): Array<Control>;
	getSelectControls(selectedNodes: Array<Node>, isRange: boolean): Array<Control>;
}

export declare class Toolbar {
	constructor(core: Ascetext);
	isShowTooltip: boolean;
	element: HTMLElement;
	tooltip: HTMLElement;
	lastFocusedRange: boolean;
	icons: Record<string, string>;
	core: Ascetext;
	selection: Selection;
	focusedNodes: Array<Node>;
	plugins: Record<string, PluginPlugin>;
	previousSelection: Array<number>;
	onSelectionChange(): void;
	onMouseDown(event: MouseEvent): void;
	emptyTooltip(): void;
	setPosition(position?: 'caret' | 'center'): void;
	showTooltip(type: string): void;
	hideTooltip(): void;
	controlHandler(action: () => void, event: Event): void;
	destroy(): void;
}
