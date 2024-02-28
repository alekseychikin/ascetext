declare class Node<S = Record<string, string>> {
	constructor(type: string, attributes?: S);
	id: number;
	type: string;
	attributes: S;
	isContainer: boolean;
	isWidget: boolean;
	isSection: boolean;
	isGroup: boolean;
	isDeleteEmpty: boolean;
	isMount: boolean;
	element: HTMLElement;
	parent?: Node;
	next?: Node;
	previous?: Node;
	first?: Node;
	last?: Node;
	setElement(element: HTMLElement): void;
	accept(node: Node): boolean;
	getNodeUntil(nodeUntil: Node): Node;
	get shortcuts(): Record<string, (event: KeyboardEvent, params: HandlerParams) => false | undefined>;
	getClosestContainer(): Node;
	getPreviousSelectableNode(): false | Node | undefined;
	getNextSelectableNode(): false | Node | undefined;
	getOffset(element: any): number;
	getChildByOffset(offset: number): {
		node: Node;
		element: HTMLElement;
	};
	getLastNode(): Node;
	split(offset: number, builder: Builder): {
		head: Node | null;
		tail: Node | null;
	};
	deepesetLastNode(node?: Node): Node | undefined;
	deepesetFirstNode(node?: Node): Node | undefined;
	contains(childNode: Node): boolean;
	json<T>(children?: T): {
		type: string;
		body?: T;
	};
}

declare class Section extends Node {
	isSection: true;
	constructor(type: string);
	append(node: Node, anchor: Node, { builder, appendDefault }: {
		builder: Builder;
		appendDefault: Builder["appendHandler"];
	}): void;
}

declare class WithControls extends Node {
	onFocus(): void;
	onBlur(): void;
}

declare class InlineWidget extends WithControls {
	isInlineWidget: true;
}

interface HandlerParams {
	builder: Builder;
	setSelection: Selection["setSelection"];
	restoreSelection: Selection["restoreSelection"];
	anchorAtFirstPositionInContainer: boolean;
	anchorAtLastPositionInContainer: boolean;
	focusAtFirstPositionInContainer: boolean;
	focusAtLastPositionInContainer: boolean;
	anchorContainer: Node;
	focusContainer: Node;
	anchorOffset: number;
	focusOffset: number;
	focused: boolean;
	focusedNodes: Selection["focusedNodes"];
	isLockPushChange: boolean;
}

interface ActionParams {
	builder: Builder;
	anchorContainer: Node;
	focusContainer: Node;
	setSelection: Selection["setSelection"];
	restoreSelection: Selection["restoreSelection"];
	getSelectedItems: Selection["getSelectedItems"];
	focusedNodes: Selection["focusedNodes"];
}

declare class Widget extends WithControls {
	isWidget: true;
	constructor(type: string, attributes?: any);
	backspaceHandler(event: KeyboardEvent, params: HandlerParams): false | undefined;
	deleteHandler(event: KeyboardEvent, params: HandlerParams): false | undefined;
	enterHandler(event: KeyboardEvent, params: HandlerParams): false | undefined;
	scheduleUpdate(): void;
	update(previous: any): void;
}

declare class Container extends Node {
	isContainer: true;
	get isEmpty(): boolean;
	append(target: Node, anchor: Node, { builder, appendDefault }: {
		builder: Builder;
		appendDefault: Builder["appendHandler"];
	}): void;
	enterHandler(event: KeyboardEvent, params: HandlerParams): false | undefined;
	backspaceHandler(event: KeyboardEvent, params: HandlerParams): false | undefined;
	deleteHandler(event: KeyboardEvent, params: HandlerParams): false | undefined;
	showPlaceholder: () => void;
	hidePlaceholder: () => void;
}

declare class Root extends Section {
}

declare class Fragment extends Node {
	isFragment: true;
}

declare class Group extends Node {
	isGroup: true;
}

type inferBody<T, S> = T extends { body: infer U } ? { body: inferBody<U, S> } : S
type InferReturn<T> = T extends (param: any) => { body: infer U } ? { body: inferBody<U, ReturnType<T>> } : ReturnType<T>

export default class Ascetext {
	constructor(node: HTMLElement, params?: {
		plugins?: Array<PluginPlugin>;
		components?: Array<Component>;
		icons?: Record<string, string>;
		sizeObserver?: (entry: SizeObserverEntry) => SizeObserverEntry;
		placeholder?: string | {
			label: string;
			className: string;
		} | ((element: HTMLElement, container: Container, focused: boolean) => void);
	});
	stringify(first: Node): string;
	onChange(callback: any): () => void;
	onNodeChange(changes: any): void;
	placeholder: (element: HTMLElement, container: Container, focused: boolean) => void;
	node: HTMLElement;
	controlsContainer: HTMLElement;
	onChangeHandlers: any[];
	plugins: Array<PluginPlugin>;
	components: Array<Component>;
	icons: any;
	model: Root;
	builder: Builder;
	editing: Editing;
	selection: Selection;
	timeTravel: TimeTravel;
	sizeObserver: SizeObserver;
	controls: any;
	autocomplete: Autocomplete;
	onChangeTimer: number | null;
	init: boolean;
	json(first: any): any;
	setContent(content: any): void;
	getContent(): string;
	triggerChange(): void;
	setJson(data: any): void;
	getJson<T>(): T;
	unmountAll(): void;
	focus(): void;
	destroy(): void;
}

declare class Autocomplete {
	constructor(core: Ascetext);
	onEdit(): void;
	node: HTMLElement;
	plugins: Array<PluginPlugin>;
	selection: Selection;
	builder: Builder;
	editing: Editing;
	patterns: ({
		plugin: string;
		rule: any;
	} | null)[];
	lastAnchorContainer: any;
	lastAnchorOffset: any;
	getRangeOffsets(selection: Selection, start: any, finish: any): {
		left: any;
		top: any;
		width: any;
		height: any;
	};
}

declare class Builder {
	constructor(core: Ascetext);
	core: Ascetext;
	parse(element: any): Fragment;
	appendHandler(node: any, target: any, anchor: any): void;
	handleMount(node: any): void;
	handleUnmount(node: any): void;
	create<T>(name: string, ...params: any[]): T;
	createBlock(): Container;
	createFragment(): Fragment;
	setAttribute<T>(node: Node, name: string, value: T): void;
	setAttributes<T>(node: Node, attributes: T): void;
	handleAttributes(target: any, previous: any, next: any): void;
	normalize(node: Node): void;
	parseJson(body: any): Fragment;
	split(container: Node, offset: number): any;
	push(node: Node, target: Node): void;
	append(node: Node, target: Node, anchor?: Node): void;
	cut(node: any): void;
	cutUntil(node: any, until: any): void;
	handleText(current: any): void;
	replace(node: any, target: any): void;
	replaceUntil(node: any, target: any, until: any): void;
	canAccept(container: any, current: any): any;
	insert(node: any, target: any, offset: any): void;
	moveTail(container: any, target: any, offset: any): void;
}

declare class Editing {
	constructor(core: Ascetext);
	handleRemoveRange(): "" | {
		html: string;
		text: string;
	};
	handleBackspace(event: any): void;
	handleBackspaceKeyDown(event: any): void;
	handleDelete(event: any): void;
	handleDeleteKeyDown(event: any): void;
	handleEnterKeyDownRange(event: any): void;
	handleEnterKeyDownSingle(event: any): void;
	handleEnterKeyDown(event: any): void;
	handleModifyKeyDown(event: any): void;
	update(): void;
	onKeyDown(event: any): void;
	onInput(event: any): void;
	onPaste(event: any): void;
	onCut(event: any): void;
	node: any;
	core: Ascetext;
	updatingContainers: any[];
	modifyKeyHandlerParams: {};
	scheduleTimer: number | null;
	captureSinceAndUntil(items: any, startIndex: any): {
		since: any;
		until: any;
	};
	getModifyKeyHandlerParams(): {};
	scheduleUpdate(container: Node): void;
	isChanged: boolean | undefined;
	handleTextInRemoveNodes(node: Node): void;
	save(): void;
	getClosestContainerInSection(node: Node): any;
	destroy(): void;
}

declare class Selection {
	constructor(core: Ascetext);
	update(event: any): void;
	onUpdate(handler: (selection: Selection) => void): () => void;
	setSelection(anchorNode: any, anchorOffset?: any, focusNode?: any, focusOffset?: any): void;
	restoreSelection(): void;
	core: Ascetext;
	selection: {};
	anchorIndex: any[] | null;
	focusIndex: any[] | null;
	focused: boolean;
	skipUpdate: boolean;
	onUpdateHandlers: ((selection: Selection) => void)[];
	selectedItems: Node[];
	focusedNodes: Node[];
	timer: any;
	isRange: boolean;
	anchorAtFirstPositionInContainer: boolean | undefined;
	anchorAtLastPositionInContainer: boolean | undefined;
	focusAtFirstPositionInContainer: boolean | undefined;
	focusAtLastPositionInContainer: boolean | undefined;
	anchorContainer: any;
	focusContainer: any;
	anchorOffset: any;
	focusOffset: any;
	blur(): null | undefined;
	getSelectionParams(node: any, offset: any): {
		element: any;
		index: any;
	};
	getSelectionInIndexes(): {
		anchorIndex: any[] | null;
		focusIndex: any[] | null;
	};
	setSelectionByIndexes(indexes: any): void;
	getDirection(anchorIndex: any, focusIndex: any): "backward" | "forward";
	getIndex(container: any, element: any, offset: any): any[];
	findElementByIndex(indexes: number[]): HTMLElement | Text;
	getSelectedItems(): any[];
	cutRange(anchorContainer?: any, anchorOffset?: any, focusContainer?: any, focusOffset?: any): {
		head: any;
		tail: any;
	};
	getArrayRangeItems(since: any, until: any): any[];
	handleSelectedItems(anchorNode: any, focusNode: any): void;
	destroy(): void;
}

interface SizeObserverEntry {
	scrollTop: number;
	scrollLeft: number;
	element: DOMRect;
	root: DOMRect;
}

interface SizeObserverConstructor {
	core: Ascetext;
	update(): null | undefined;
	updateHandler(): void;
	id: number;
	ids: number[];
	observedElements: any[];
	handlers: any[];
	timer: number | null;
	observe(element: HTMLElement, handler: (entry: SizeObserverEntry) => void): () => void;
	calculateBoundings(element: any): {
		scrollTop: number;
		scrollLeft: number;
		element: any;
		root: any;
	};
	destroy(): void;
}

declare class SizeObserver implements SizeObserverConstructor {
	constructor(core: Ascetext);
	core: Ascetext;
	update(): null | undefined;
	updateHandler(): void;
	id: number;
	ids: number[];
	observedElements: any[];
	handlers: any[];
	timer: number | null;
	observe(element: HTMLElement, handler: (entry: SizeObserverEntry) => void): () => void;
	calculateBoundings(element: any): {
		scrollTop: number;
		scrollLeft: number;
		element: any;
		root: any;
	};
	destroy(): void;
}

declare class TimeTravel {
	constructor(selection: Selection, builder: Builder);
	onSelectionChange(selection: Selection): void;
	commit(): void;
	timeline: any[];
	timeindex: number;
	isLockPushChange: boolean;
	currentBunch: any[];
	builder: Builder;
	selection: Selection;
	previousSelection: any;
	preservedPreviousSelection: boolean;
	reset(): void;
	preservePreviousSelection(): void;
	pushChange(event: any): void;
	goBack(): void;
	goForward(): void;
}

type CSSGetter = Record<string, string>;
type IconsGetter = Record<string, string>;

interface Control {
	slug: string;
	label?: string;
	type?: string;
	shortcut?: string;
	icon?: string;
	showLabel?: boolean;
	showIcon?: boolean;
	selected?: boolean;
	disabled?: boolean;
	action?: (event: any, params: ActionParams) => void;
	cancel?: (event: any, params: ActionParams) => void;
}

export type ShortcutMatcher = (shortcut: string) => boolean;

declare class ComponentComponent {
	register(core: Ascetext): void;
	unregister(): void;
	catchShortcut(matcher: ShortcutMatcher, event: KeyboardEvent): boolean;
	checkSelection(target: HTMLElement): boolean;
}

declare class Toolbar extends ComponentComponent {
	constructor();
	get css(): CSSGetter;
	onSelectionChange(): void;
	controlHandler<T>(action: T, event: MouseEvent, keep?: boolean): void;
	showSideToolbar(): void;
	hideSideToolbar(): void;
	renderSideControls(): void;
	restoreSelection(): void;
	getSelectedItems(): any;
	toggleSideToolbar(): void;
	checkToolbarVisibility(event: any): void;
	wrapControls(controls: Control[]): any;
	updateBoundings(container: any): void;
	viewportChange(event: any): void;
	viewportResize(): void;
	isShowToggleButtonHolder: boolean;
	isShowSideToolbar: boolean;
	isShowCenteredToolbar: boolean;
	isMobile: boolean;
	customMode: boolean;
	skip: boolean;
	builder: Builder;
	selection: Selection;
	timeTravel: TimeTravel;
	editing: Editing;
	plugins: Array<PluginPlugin>;
	icons: any;
	sizeObserver: SizeObserver | null;
	focusedNodes: any[];
	lastRangeFocused: boolean;
	previousSelection: any;
	previousContainer: any;
	previousSideMode: string;
	nextControlsToRender: any;
	sideControls: any[];
	centeredControls: any[];
	sideMode: string;
	cancelObserver: any;
	containerAvatar: any;
	insertButton: any;
	replaceButton: any;
	sideToolbar: any;
	centeredToolbar: any;
	toggleButtonHolder: any;
	toggleButton: any;
	mediaQuery: MediaQueryList;
	bindViewportChange(): void;
	unbindViewportChange(): void;
	onKeyDown(event: KeyboardEvent): void;
	updateButtonHolder(): void;
	renderInsertButton(): void;
	renderReplaceButton(hasControls: boolean): void;
	updateSideToolbar(): void;
	updateCenteredToolbar(): null | undefined;
	renderSideToolbar(): void;
	renderSelectedToolbar(): void;
	getInsertControls(): any[];
	getReplaceControls(): any[];
	renderCenteredControls(rawControls: any): void;
	emptySideToolbar(): void;
	emptyCenteredControls(): void;
	showCenteredToolbar(): void;
	hideCenteredToolbar(): void;
	emptyToggleButtonHolder(): void;
	showToggleButtonHolder(): void;
	hideToggleButtonHolder(): void;
	isTargetInsideToolbar(target: HTMLElement): boolean;
	isTargetInsideEditor(target: HTMLElement): boolean;
	stopUpdateBoundings(): void;
	setAvatar(entry: any): any;
	destroy(): void;
}

declare class ControlControl {
	constructor(params?: Control);
	params: Control;
	element: HTMLElement;
	createElement(): void;
	setEventListener(handler: any): void;
	handler: any;
	getElement(): HTMLElement;
}

declare class ControlButton extends ControlControl {
	get css(): CSSGetter;
	constructor(params: Control);
	handleAction(event: any): void;
	getElement(): HTMLButtonElement;
}

declare class ControlFile extends ControlControl {
	element: HTMLLabelElement;
	input: HTMLInputElement;
	constructor(params: Control);
	handleAction(event: any): void;
	getElement(): HTMLLabelElement;
}

declare class ControlInput extends ControlControl {
	element: HTMLInputElement;
	handlers: {};
	constructor(params: Control);
	handleAction(event: any): void;
	handleCancel(event: any): void;
	handleKeydown(event: any): void;
	getElement(): HTMLInputElement;
}

declare class ControlLink extends ControlControl {
	element: HTMLAnchorElement;
	constructor(params: Control);
}

declare class PluginPlugin {
	get register(): Record<string, {
		new(...params: any[]): Node;
	}>;
	getClosestContainer(element: HTMLElement | Text): HTMLElement | Text;
	getFirstTextChild(element: HTMLElement | Text): HTMLElement | Text;
	getLastTextChild(element: HTMLElement | Text): HTMLElement | Text;
	getInsertControls(container: Node): Control[];
	getSelectControls(focusedNodes: Node[], isRange: any): Control[];
	getReplaceControls(focusedNodes: Node[]): Control[];
}

declare class BreakLine extends InlineWidget {
	constructor();
	render(): HTMLElement;
	split(): {
		head: any;
		tail: any;
	};
	json(): {
		type: 'breakLine';
	};
}

declare class BreakLinePlugin extends PluginPlugin {
	parse(element: HTMLElement | Text, builder: Builder): BreakLine | undefined;
	parseJson(element: HTMLElement | Text, builder: Builder): BreakLine | undefined;
}

declare class Header extends Container {
	constructor(attributes: any);
	render(): HTMLElement;
	json<T>(children: T): {
		type: 'header';
		level: number;
		body: T;
	};
}

declare class HeaderPlugin extends PluginPlugin {
	params: {
		allowLevels: number[];
	};
	supportHeaders: string[];
	get icons(): IconsGetter;
	constructor(params?: {
		allowLevels: number[];
	});
	parse(element: HTMLElement | Text, builder: Builder): Header | undefined;
	parseJson(element: HTMLElement | Text, builder: Builder): Header | undefined;
	setHeader(level: number): (event: any, params: ActionParams) => void;
}

declare class Image extends Widget {
	image: HTMLImageElement;
	attributes: Record<string, string>;
	constructor(attributes?: {});
	render(): HTMLElement;
	update(previous: any): void;
	getClassName(): string;
	json<T>(children?: T): {
		type: 'image';
		src: string;
		figcaption?: T;
	};
}

declare class ImageCaption extends Container {
	removeObserver: any;
	attributes: Record<string, string>;
	constructor(params: any);
	render(): HTMLElement;
	onMount({ controls, sizeObserver }: {
		controls: any;
		sizeObserver: any;
	}): void;
	imagePlaceholder: HTMLElement;
	onUnmount({ controls }: {
		controls: any;
	}): void;
	enterHandler(event: KeyboardEvent, params: HandlerParams): false | undefined;
	inputHandler(): void;
	json<T>(children: T): {
		type: 'image-caption',
		body: T
	};
}

declare class ImagePlugin extends PluginPlugin {
	constructor(params?: {});
	toggleFloatLeft(image: Container): (event: MouseEvent, params: ActionParams) => void;
	toggleFloatRight(image: Container): (event: MouseEvent, params: ActionParams) => void;
	toggleSizeWide(image: Container): (event: MouseEvent, params: ActionParams) => void;
	toggleSizeBanner(image: Container): (event: MouseEvent, params: ActionParams) => void;
	insertImage(container: Container): (event: InputEvent, params: ActionParams) => Promise<void>;
	updateImage(image: Container): (event: InputEvent, params: ActionParams) => Promise<void>;
	params: {
		onSelectFile: (file: File, image: Image) => Promise<string>;
		placeholder?: string;
	};
	get icons(): IconsGetter;
	parse(element: HTMLElement | Text, builder: Builder): Image | undefined;
	parseJson(element: any, builder: Builder): Image | undefined;
	generateImagePreview(file: File): Promise<string>;
}

declare class Link extends InlineWidget {
	type: 'link';
	attributes: Record<string, string>;
	constructor(attributes: any);
	render(): HTMLAnchorElement;
	normalize(element: any, builder: Builder): any;
	json<T>(children: T): {
		type: 'link';
		url: string;
		body: T;
	};
}

declare class LinkPlugin extends PluginPlugin {
	get icons(): IconsGetter;
	get autocompleteRule(): RegExp;
	openLinkControls(): (Control & {
		placeholder?: string;
		autofocus?: boolean;
		cancel?: (event: any, params: ActionParams) => any;
	})[][];
	removeLinks(event: any, params: ActionParams): void;
	setLink(event: any, params: ActionParams): void;
	parse(element: HTMLElement | Text, builder: Builder): Link | undefined;
	parseJson(element: HTMLElement | Text, builder: Builder): Link | undefined;
	removeLink(event: any, params: ActionParams): void;
	wrap(match: any, builder: Builder): any;
	unwrap(node: any, builder: Builder): void;
}

declare class List extends Group {
	constructor(attributes?: {
		decor: string;
	});
	render(): any;
	normalize(element: any, builder: Builder): any;
	json<T>(children: T): {
		type: 'list';
		decor: 'numerable' | 'marker';
		body: T;
	};
}

declare class ListItem extends Group {
	constructor(params?: {});
	params: {};
	render(): any;
	append(target: any, anchor: any, { builder, appendDefault }: {
		builder: Builder;
		appendDefault: any;
	}): void;
	getDepth(container: any, node: any): number;
	json<T>(children: T): {
		type: 'list-item';
		body: T;
	}
}

declare class ListItemContent extends Container {
	constructor(params?: {});
	params: {};
	render(): any;
	cut({ builder }: {
		builder: Builder;
	}): void;
	backspaceHandler(event: KeyboardEvent, params: HandlerParams): false | undefined;
	enterHandler(event: KeyboardEvent, params: HandlerParams): false | undefined;
	deleteHandler(event: KeyboardEvent, params: HandlerParams): false | undefined;
	indentLeft(event: any, params: ActionParams): void;
	indentRight(event: any, params: ActionParams): void;
	putEmptyBlockInMiddle(builder: Builder, setSelection: Selection["setSelection"]): void;
	json<T>(children: T): {
		type: 'list-item-content';
		body: T;
	}
}

declare class ListPlugin extends PluginPlugin {
	constructor(params?: {
		maxDepth: number | null;
	});
	params: {
		maxDepth: number | null;
	};
	get icons(): IconsGetter;
	parse(element: any, builder: Builder): List | ListItem | ListItemContent | undefined;
	parseJson(element: any, builder: Builder): List | ListItem | ListItemContent | undefined;
	setNumberList(event: any, params: ActionParams): void;
	setMarkerList(event: any, params: ActionParams): void;
}

declare class Paragraph extends Container {
	constructor();
	render(): HTMLElement;
	json<T>(children: T): {
		type: 'paragraph';
		body: T;
	}
}

declare class ParagraphPlugin extends PluginPlugin {
	get icons(): IconsGetter;
	parse(element: HTMLElement | Text, builder: Builder): Paragraph | undefined;
	parseJson(element: HTMLElement | Text, builder: Builder): Paragraph | undefined;
	setParagraph(event: any, params: ActionParams): void;
}

declare class Quote extends Container {
	constructor();
	render(): HTMLElement;
	json<T>(children: T): {
		type: 'quote';
		body: T;
	}
}

declare class QuotePlugin extends PluginPlugin {
	get icons(): IconsGetter;
	parse(element: HTMLElement | Text, builder: Builder): Quote | undefined;
	parseJson(element: HTMLElement | Text, builder: Builder): Quote | undefined;
	setQuote(event: any, params: ActionParams): void;
}

export interface TextAttributes {
	content: string;
	weight?: string;
	style?: string;
	decoration?: string;
	strike?: string
}

declare class TextNode extends Node<TextAttributes> {
	constructor(attributes: TextAttributes);
	render(): any;
	update(): void;
	create(modifiers: any): any;
	generateModifiers(): string[];
	normalize(target: any, builder: any): any;
	isEqual(target: any): boolean;
	split(position: any, builder: any): {
		head: any;
		tail: any;
	};
	stringifyWithModifiers(modifiers: any): any;
	json(): {
		type: 'text';
		modifiers: string[];
		content: string;
	};
}

declare class TextPlugin extends PluginPlugin {
	constructor(params?: {});
	params: {
		allowModifiers: string[];
	};
	supportTags: any[];
	get icons(): IconsGetter;
	parse(element: HTMLElement | Text, builder: Builder): TextNode | undefined;
	parseJson(element: HTMLElement | Text, builder: Builder): TextNode | undefined;
	unsetBold(event: any, params: ActionParams): void;
	setBold(event: any, params: ActionParams): void;
	unsetItalic(event: any, params: ActionParams): void;
	setItalic(event: any, params: ActionParams): void;
	unsetStrike(event: any, params: ActionParams): void;
	setStrike(event: any, params: ActionParams): void;
	unsetUnderline(event: any, params: ActionParams): void;
	setUnderline(event: any, params: ActionParams): void;
}

type InferNodes<T extends Array<PluginPlugin>> = T extends Array<{ parse: (...params: any) => infer U}> ? Exclude<U, undefined> : never

declare function getIcon(source: string): HTMLElement;

export {
	Ascetext,
	Builder,
	Selection,
	Editing,
	TimeTravel,
	SizeObserverConstructor,
	SizeObserver,
	SizeObserverEntry,
	ComponentComponent,
	Toolbar,
	Control,
	ControlControl,
	ControlButton,
	ControlFile,
	ControlLink,
	ControlInput,
	Section,
	Group,
	InlineWidget,
	Widget,
	WithControls,
	Node,
	Container,
	ActionParams,
	HandlerParams,
	ParagraphPlugin,
	BreakLinePlugin,
	TextPlugin,
	HeaderPlugin,
	Link,
	LinkPlugin,
	Image,
	ImagePlugin,
	ImageCaption,
	List,
	ListItem,
	ListItemContent,
	ListPlugin,
	QuotePlugin,
	PluginPlugin,
	InferNodes,
	getIcon
};
