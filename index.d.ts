type Attributes = Record<string, string | number>
type Params = Record<string, any>

declare class Node {
	constructor(type: string, attributes?: Attributes, params?: Params);
	id: number;
	type: string;
	attributes: Attributes;
	isContainer: boolean;
	isWidget: boolean;
	isSection: boolean;
	isRendered: boolean;
	isMount: boolean;
	length: number;
	childrenAmount: number;
	element?: HTMLElement;
	parent?: Node;
	previous?: Node;
	next?: Node;
	first?: Node;
	last?: Node;
	get shortcuts(): Shortcuts;
	split(builder: Builder, next: Node | number): { head: Node | null; tail: Node | null };
	getNodeUntil(nodeUntil: Node): Node;
	getPreviousSelectableNode(): Node | undefined;
	getNextSelectableNode(): Node | undefined;
	deepesetLastNode(node?: Node): Node;
	deepesetFirstNode(node?: Node): Node;
	contains(childNode: Node): boolean;
	stringify(children: string): string;
}

declare class UsefullNode extends Node {
	constructor(attributes?: Attributes, params?: Params);
}

declare class Section extends Node {
	isSection: true;
	layout: 'vertical' | 'tile'
}

declare class InlineWidget extends Node {
	isInlineWidget: true;
}

declare class Widget extends Node {
	isWidget: true;
	backspaceHandler(event: KeyboardEvent, params: HandlerParams): void;
	deleteHandler(event: KeyboardEvent, params: HandlerParams): void;
	enterHandler(event: KeyboardEvent, params: HandlerParams): void;
}

declare class Container extends Node {
	isContainer: true;
	get isEmpty(): boolean;
	onFocus(selection: Selection): void;
	onBlur(selection: Selection): void;
	onMount(core: Ascetext<Array<PluginPlugin>>): void;
	onUnmount(core: Ascetext<Array<PluginPlugin>>): void;
	onCombine(builder: Builder, container: Container): void;
	inputHandler(focused: boolean): void;
	showPlaceholder(): void;
	hidePlaceholder(): void;
	enterHandler(event: KeyboardEvent, params: HandlerParams): void;
	backspaceHandler(event: KeyboardEvent, params: HandlerParams): void;
	deleteHandler(event: KeyboardEvent, params: HandlerParams): void;
}

declare class Root extends Section {
	type: 'root'
}

declare class Fragment extends Node {
	isFragment: true;
}

type Timer = ReturnType<typeof setInterval> | null

declare class Ascetext<P extends Array<PluginPlugin>> {
	constructor(node: HTMLElement, params?: {
		plugins?: P;
		components?: Array<ComponentComponent>;
		icons?: Record<string, string>;
		sizeObserver?: (entry: SizeObserverEntry) => SizeObserverEntry;
		placeholder?: string | {
			label: string;
			className: string;
		} | ((element: HTMLElement, container: Container, focused: boolean) => boolean);
		trimTrailingContainer?: boolean;
	});
	params: {
		placeholder: ((element: HTMLElement, container: Container, focused: boolean) => void) | null;
	};
	node: HTMLElement;
	onChangeHandlers: Array<() => void>;
	plugins: P;
	model: Root;
	builder: Builder;
	normalizer: Normalizer;
	render: Render;
	parser: Parser;
	selection: Selection;
	editing: Editing;
	timeTravel: TimeTravel;
	sizeObserver: SizeObserver;
	controls: Controls;
	autocomplete: Autocomplete;
	dragndrop: Dragndrop;
	icons: IconsGetter;
	init: boolean;
	components: Array<ComponentComponent>;
	stringify(first: Node): string;
	json(first: Node): any;
	onChange(callback: () => void): () => void;
	triggerChange(): void;
	setContent(content: string): void;
	getContent(): string;
	setJson(data: any): void;
	getJson<T>(): T;
	focus(): void;
	destroy(): void;
}

export default Ascetext

declare class Publisher {
	subscribers: Array<(...params: unknown[]) => void>;
	subscribe(handler: (...params: unknown[]) => void): () => void;
	sendMessage(...params: unknown[]): void;
}

declare class Controls {
	constructor(core: Ascetext<Array<PluginPlugin>>);
	container: HTMLDivElement;
	controls: Array<HTMLElement>;
	registerControl(control: HTMLElement): void;
	unregisterControl(control: HTMLElement): void;
	destroy(): void;
}

declare class Normalizer {
	constructor(core: Ascetext<Array<PluginPlugin>>, trimTrailingContainer?: boolean);
	core: Ascetext<Array<PluginPlugin>>;
	unnormalizedNodes: Array<Node>;
	unnormalizedParents: Array<Node>;
	onChange(event: BuilderChangeEvent): void;
	pushNode(node: Node): void;
	pushParent(node: Node): void;
	normalizeHandle(): void;
	normalize(nodes: Array<Node>): void;
	normalizeParents(nodes: Array<Node>): void;
	walk(node: Node): void;
	handleNode(node: Node): void;
}

type RenderEvent = {
	type: 'append' | 'cut';
	container: Node;
	target: Node;
} | {
	type: 'update';
	target: Node;
}

interface VirtualTree {
	type: string;
	attributes: Record<string, string | boolean | number>;
	body: Array<VirtualTree>;
}

declare class Render extends Publisher {
	constructor(core: Ascetext<Array<PluginPlugin>>);
	core: Ascetext<Array<PluginPlugin>>;
	timer: Timer;
	queue: Array<RenderEvent>;
	mapNodeIdToElement: Record<number, HTMLElement>;
	mapNodeIdToNode: Record<number, Node>;
	containerAvatar: HTMLDivElement;
	onChange(change: BuilderChangeEvent): void;
	markUnrendered(target: Node, last?: Node): void;
	dropRender(): void;
	render(): void;
	cut(event: RenderEvent): void;
	append(event: RenderEvent): void;
	update(event: RenderEvent): void;
	findAnchor(node: Node): Node | null;
	createTree(target: Node, last?: Node): Array<VirtualTree>;
	createElement(tree: VirtualTree, lookahead: Array<HTMLElement | Text>): HTMLElement | Text;
	createText(tree: VirtualTree, modifiers: Array<string>, lookahead: Array<HTMLElement | Text>): Text;
	applyAttributes(element: HTMLElement, tree: VirtualTree): void;
	replaceNode(tree: VirtualTree, container: HTMLElement): HTMLElement;
	findLookahead(lookahead: Array<HTMLElement | Text>): HTMLElement | Text | null;
	generateModifiers(element: HTMLElement): Array<string>;
	handleContainer(element: HTMLElement): void;
	handleMount(node: Node, last: Node): void;
	handleUnmount(node: Node, last: Node): void;
	handleInput(node: Node): void;
	getTrailingBr(): void;
	getNodeById(id: number): Node;
	destroy(): void;
}

declare class Parser {
	constructor(root: HTMLElement);
	getVirtualTree(node: HTMLElement | Text): Array<VirtualTree>;
	removeTrailingBr(body: Array<VirtualTree>): Array<VirtualTree>;
	normalize(body: Array<VirtualTree>): Array<VirtualTree>;
	isEqualAttributes(left: Record<string, string>, right: Record<string, string>, attributes: Record<string, string>): boolean;
	getHtmlElement(current: HTMLElement): Array<VirtualTree>;
	getTextElement(current: Text, content?: Record<string, string>): Array<VirtualTree>;
	isInsideEditor(element: HTMLElement | Text): boolean;
}

declare class Dragndrop {
	constructor(core: Ascetext<Array<PluginPlugin>>);
	core: Ascetext<Array<PluginPlugin>>;
	node: HTMLElement;
	pointerdownTimer: Timer;
	isPointerDown: boolean;
	initDraggingShiftX: number;
	initDraggingShiftY: number;
	startClientX: number;
	startClientY: number;
	dragging: HTMLElement | null;
	target: HTMLElement | null;
	anchor: HTMLElement | null;
	handleDragging(container: Container | Widget, event: PointerLongEvent): void;
	pointerMoveHandler(event: PointerEvent): void;
	updateDraggingPosition(): void;
	setTargetAndAnchor(): void;
	getElementFromPoint(): HTMLElement;
	findAnchor(target: UsefullNode): UsefullNode;
	getChild(target: UsefullNode, index: number): UsefullNode;
	pointerUpHandler(): void;
	cancel(): void;
	dragStartHandler(event: DragEvent): void;
	dragOverHandler(event: DragEvent): void;
	dropHandler(DragEvent): Promise<void>;
	getElementAndCaretPositionFromPoint(event: DragEvent): {
		textNode: HTMLElement;
		offset: number;
	} | null;
	getFiles(dataTransfer: DataTransfer): Array<File>;
	keydownHandler(event: KeyboardEvent): void;
	destroy(): void;
}

type PointerLongEvent = CustomEvent<{
	clientX: number;
	clientY: number;
	pageX: number;
	pageY: number;
	screenX: number;
	screenY: number;
}>

interface DragndropDragoutEvent {
	type: 'dragout';
	target: UsefullNode | null;
	anchor: UsefullNode | null;
	dragging: UsefullNode | null;
}

interface DragndropDragoverEvent {
	type: 'dragover';
	target: UsefullNode | null;
	anchor: UsefullNode | null;
	dragging: UsefullNode | null;
}

interface DragndropDraggingEvent {
	type: 'dragging';
	shiftX: number;
	shiftY: number;
}

interface DragndropDropEvent {
	type: 'drop';
}

type DragndropEvent = DragndropDragoutEvent | DragndropDragoverEvent | DragndropDraggingEvent | DragndropDropEvent;

declare class Autocomplete {
	constructor(core: Ascetext<Array<PluginPlugin>>);
	node: HTMLElement;
	plugins: Array<PluginPlugin>;
	selection: Selection;
	builder: Builder;
	patterns: Array<{
		plugin: string;
		rule: RegExp;
	}>;
	trigger(): boolean;
	getContent(): string;
}

type BuilderChangeEvent = {
	type: 'cut';
	container: Node;
	target: Node;
	last: Node;
	anchor?: Node;
	previous?: Node;
	next?: Node;
} | {
	type: 'append';
	container: Node;
	target: Node;
	last: Node;
	anchor?: Node;
} | {
	type: 'attribute';
	target: Node;
	previous?: Node;
	next?: Node;
};

declare class Builder extends Publisher {
	constructor(core: Ascetext<Array<PluginPlugin>>);
	core: Ascetext<Array<PluginPlugin>>;
	registeredNodes: Record<string, Node>
	create<T extends UsefullNode>(name: string, ...params: any[]): T;
	createBlock(): Container;
	createFragment(): Fragment;
	setAttribute<T>(node: Node, name: string, value: T): void;
	setAttributes<T>(node: Node, attributes: T): void;
	handleAttributes(target: Node, previous?: Node, next?: Node): void;
	parseJson(body: any): Fragment;
	getJson(first: Node, last?: Node): any;
	parseVirtualTree(tree: Array<VirtualTree>): Fragment;
	splitByOffset(container: Container, offset: number): { head: Node, tail: Node };
	splitByTail(parent: Node, tail: Node): { head: Node, tail: Node };
	duplicate(target: Node): Node;
	push(node: Node, target?: Node): void;
	append(node: Node, target?: Node, anchor?: Node): void;
	cut(node?: Node): void;
	cutUntil(node?: Node, until?: Node): void;
	replace(node: Node, target: Node): void;
	replaceUntil(node: Node, target: Node, until?: Node): void;
	insertText(target: Node, anchor?: Node): Node;
	insert(target: Node): void;
	getOffsetToParent(parent: Node, target: Node): number;
	moveTail(container: Node, target: Node, offset: number): void;
	combine(container: Node, target: Node): void;
	registerPlugins(): void;
	commit(): void;
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
}

interface ActionParams {
	builder: Builder;
	anchorContainer: Container | Widget;
	focusContainer: Container | Widget;
	setSelection: Selection["setSelection"];
	restoreSelection: Selection["restoreSelection"];
	getSelectedItems: Selection["getSelectedItems"];
	focusedNodes: Selection["focusedNodes"];
}

declare class Editing {
	constructor(core: Ascetext<Array<PluginPlugin>>);
	node: Node;
	core: Ascetext<Array<PluginPlugin>>;
	updatingContainers: Array<Container>;
	modifyKeyHandlerParams: HandlerParams;
	scheduleTimer: Timer;
	keydownTimer: Timer;
	isSession: boolean;
	isUpdating: boolean;
	spacesDown: boolean;
	hadKeydown: boolean;
	removedRange: boolean;
	onCompositionStart(): void;
	onCompositionEnd(): void;
	onInput(event: Event): void;
	onKeyDown(event: KeyboardEvent): void;
	onKeyUp(event: KeyboardEvent): void;
	setKeydown(): void;
	handleModifyKeyDown(event: KeyboardEvent): void;
	handleRemoveRange(): {
		since: Node;
		until: Node;
	} | undefined;
	handleBackspaceKeyDown(event: KeyboardEvent): void;
	handleDeleteKeyDown(event: KeyboardEvent): void;
	handleEnterKeyDown(event: KeyboardEvent): void;
	getModifyKeyHandlerParams(): HandlerParams;
	scheduleUpdate(container: Node): void;
	update(node?: Node): void;
	save(): void;
	onCut(event: ClipboardEvent): void;
	onCopy(event: ClipboardEvent): void;
	copyToClipboard(clipboardData: ClipboardItemData, section: Section): void;
	onPaste(event: ClipboardEvent): void;
	insertText(content: string): void;
	getNodeOffset(container: Node, node: Node): number;
	catchShortcut(shortcutMatcher: ShortcutMatcher, shortcuts: Shortcuts): null | ((event: KeyboardEvent, params: HandlerParams) => void);
	destroy(): void;
}

declare class Selection extends Publisher {
	constructor(core: Ascetext<Array<PluginPlugin>>);
	core: Ascetext<Array<PluginPlugin>>;
	anchorIndex: Array<number> | null;
	focusIndex: Array<number> | null;
	focused: boolean;
	selectedItems: Array<Node>;
	focusedNodes: Array<Node>;
	components: Array<ComponentComponent>;
	timer: Timer;
	onUpdateHandlers: Array<(selection: Selection) => void>;
	anchorAtFirstPositionInContainer: boolean;
	anchorAtLastPositionInContainer: boolean;
	focusAtFirstPositionInContainer: boolean;
	focusAtLastPositionInContainer: boolean;
	isRange: boolean;
	anchorContainer: Container | Widget | null;
	focusContainer: Container | Widget | null;
	anchorOffset: number;
	focusOffset: number;
	setComponents(components: Array<ComponentComponent>): void;
	focus(event: FocusEvent): void;
	selectionChange(): void;
	selectionUpdate(event: {
		type: string;
		anchorNode: HTMLElement;
		focusNode: HTMLElement;
		anchorOffset: 0;
		focusOffset: 0;
		isCollapsed: boolean;
		selectedComponent: boolean;
	}): void;
	getContainerAndOffset(node: Node, offset: number): {
		container: Node;
		offset: number;
	};
	getLength(node: Node): number;
	setSelection(anchorNode: Node, anchorOffset?: number, focusNode?: Node, focusOffset?: number): void;
	onRender(node: Node): void;
	selectElements(): void;
	getChildByOffset(target: Node, offset: number): {
		element: HTMLElement;
		restOffset: number;
	};
	update(event: {
		focused: boolean;
		selectedComponent: boolean;
		anchorContainer: Node;
		anchorOffset: number;
		focusContainer: Node;
		focusOffset: number;
		isCollapsed: boolean;
	}): void;
	blur(): void;
	restoreSelection(): void;
	getSelectionInIndexes(): {
		anchorIndex: Array<string> | null;
		focusIndex: Array<string> | null;
	};
	setSelectionByIndexes(indexes: {
		anchorIndex: Array<string> | null;
		focusIndex: Array<string> | null;
	}): void;
	getDirection(anchorIndex: any, focusIndex: any): "backward" | "forward";
	getIndex(container: Node, offset: number): Array<string>;
	findElementByIndex(indexes: Array<string>, parent?: Node): {
		node: Node;
		offset: number;
	};
	getNodeByOffset(node: Node, offset: number): Node;
	getSelectedItems(): Array<Node>;
	cutRange(anchorContainer?: Node, anchorOffset?: number, focusContainer?: Node, focusOffset?: number): {
		head: Node;
		tail: Node;
	};
	getArrayRangeItems(since: Node, until: Node): Array<Node>;
	handleSelectedItems(): void;
	destroy(): void;
}

interface SizeObserverEntry {
	element: DOMRect;
	absolute: DOMRect;
}

interface SizeObserverConstructor {
	core: Ascetext<Array<PluginPlugin>>;
	id: number;
	ids: Array<number>;
	observedNodes: Array<UsefullNode>;
	handlers: Array<(entry: SizeObserverEntry) => void>;
	timer: Timer;
	middleware?: (entry: SizeObserverEntry) => SizeObserverEntry;
	observe(node: UsefullNode, handler: (entry: SizeObserverEntry, node: UsefullNode) => void): () => void;
	update(): void;
	updateHandler(): void;
	handleNode(index: number): void;
	calculateBoundings(element: HTMLElement): {
		scrollTop: number;
		scrollLeft: number;
		element: DOMRect;
		root: DOMRect;
	};
	destroy(): void;
}

declare class SizeObserver implements SizeObserverConstructor {
	constructor(core: Ascetext<Array<PluginPlugin>>, middleware?: (entry: SizeObserverEntry) => SizeObserverEntry);
	core: Ascetext<Array<PluginPlugin>>;
	id: number;
	ids: Array<number>;
	observedNodes: Array<Node>;
	handlers: Array<(entry: SizeObserverEntry) => void>;
	timer: Timer;
	middleware?: (entry: SizeObserverEntry) => SizeObserverEntry;
	observe(node: Node, handler: (entry: SizeObserverEntry) => void): () => void;
	update(): void;
	updateHandler(): void;
	handleNode(index: number): void;
	calculateBoundings(element: HTMLElement): {
		scrollTop: number;
		scrollLeft: number;
		element: DOMRect;
		root: DOMRect;
	};
	destroy(): void;
}

declare class TimeTravel extends Publisher {
	constructor(selection: Selection, builder: Builder, root: Root);
	timeline: any[];
	timeindex: number;
	isLockPushChange: boolean;
	currentBunch: any[];
	builder: Builder;
	selection: Selection;
	normalizer: Normalizer;
	previousSelection: null | {
		anchorIndex: Array<string> | null;
		focusIndex: Array<string> | null;
	};
	preservedPreviousSelection: boolean;
	reset(): void;
	onSelectionChange(selection: Selection): void;
	preservePreviousSelection(): void;
	pushChange(event: BuilderChangeEvent): void;
	commit(): void;
	goBack(): void;
	goForward(): void;
	getIndex(node: Node): Array<number>;
	findByIndex(input: Array<number>): Node;
	findByOffset(input: Array<number>, offset: number): Node;
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
export type Shortcuts = Record<string, (event: KeyboardEvent, params: HandlerParams) => void>;

declare class ComponentComponent {
	register(core: Ascetext<Array<PluginPlugin>>): void;
	unregister(): void;
	catchShortcut(matcher: ShortcutMatcher, event: KeyboardEvent): boolean;
	checkSelection(target: HTMLElement): boolean;
}

declare class Toolbar extends ComponentComponent {
	constructor();
	get css(): CSSGetter;
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
	dragndrop: Dragndrop;
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
	container: HTMLElement;
	sideToolbar: HTMLElement;
	sideToolbarContent: HTMLElement;
	centeredToolbar: HTMLElement;
	centeredToolbarContent: HTMLElement;
	toggleButtonHolder: HTMLElement;
	toggleButton: HTMLElement;
	dragIndicator: HTMLElement;
	mediaQuery: MediaQueryList;
	pointerLongDown(event: PointerLongEvent): void;
	findScrollableParents(element: HTMLElement): Array<HTMLElement>;
	viewportChange(event: any): void;
	viewportResize(): void;
	bindViewportChange(): void;
	unbindViewportChange(): void;
	onSelectionChange(): void;
	onDragNDropChange(event: DragndropEvent): void;
	updateDraggingTogglePosition(event: DragndropDraggingEvent): void;
	updateDragAnchorPosition(event: DragndropDragoverEvent): void;
	checkToolbarVisibility(event: any): void;
	onKeyDown(event: KeyboardEvent): void;
	updateSideToolbar(): void;
	updateCenteredToolbar(): null | undefined;
	updateButtonHolder(): void;
	renderButton(hasControls: boolean): void;
	renderSideToolbar(): void;
	renderSelectedToolbar(): void;
	getInsertControls(): any[];
	getReplaceControls(): any[];
	toggleSideToolbar(): void;
	renderSideControls(): void;
	renderCenteredControls(rawControls: any): void;
	controlHandler<T>(action: T, event: MouseEvent, keep?: boolean): void;
	restoreSelection(): void;
	emptySideToolbar(): void;
	showSideToolbar(): void;
	hideSideToolbar(): void;
	emptyCenteredControls(): void;
	showCenteredToolbar(): void;
	hideCenteredToolbar(): void;
	emptyToggleButtonHolder(): void;
	showToggleButtonHolder(): void;
	hideToggleButtonHolder(): void;
	wrapControls(controls: Array<Control>): any;
	isTargetInsideToolbar(target: HTMLElement): boolean;
	isTargetInsideEditor(target: HTMLElement): boolean;
	updateBoundings(container: UsefullNode): void;
	updateBoundingsHandler(entry: SizeObserverEntry, container: UsefullNode): void;
	isElementVisible(rect: DOMRect): boolean;
	setPosition(element: HTMLElement, left: number, top: number): void;
	stopUpdateBoundings(): void;
	getShortcuts(): Shortcuts;
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
	get register(): Record<string, typeof UsefullNode>;
	params: Params;
	getClosestContainer(element: HTMLElement | Text): HTMLElement | Text;
	getFirstTextChild(element: HTMLElement | Text): HTMLElement | Text;
	getLastTextChild(element: HTMLElement | Text): HTMLElement | Text;
	getInsertControls(container: Node): Array<Control>;
	getSelectControls(focusedNodes: Array<Node>, isRange: boolean): Control[];
	getReplaceControls(focusedNodes: Array<Node>): Array<Control>;
	normalize?(node: Node, builder: Builder): Node | false;
}

declare class BreakLine extends InlineWidget {
	constructor();
	render(): VirtualTree;
	split(): {
		head: any;
		tail: any;
	};
	json(): {
		type: 'breakLine';
	};
}

declare class BreakLinePlugin extends PluginPlugin {
	parseTree(element: VirtualTree, builder: Builder): BreakLine | undefined;
	parseJson(element: { type: string }, builder: Builder): BreakLine | undefined;
}

declare class Header extends Container {
	constructor(attributes: {
		level: number;
	});
	render(): VirtualTree;
	json(): {
		type: 'header';
		level: number;
	};
	json<T extends { type: string }[]>(children: T): {
		type: 'header';
		level: number;
		body: T;
	};
	json<T extends { type: string }[]>(children?: T): {
		type: 'header';
		level: number;
		body?: T;
	};
}

declare class HeaderPlugin extends PluginPlugin {
	params: {
		allowLevels: Array<number>;
	};
	supportHeaders: Array<string>;
	get icons(): IconsGetter;
	constructor(params?: {
		allowLevels: Array<number>;
	});
	parseTree(element: VirtualTree, builder: Builder): Header | undefined;
	parseJson(element: { type: string }, builder: Builder): Header | undefined;
	setHeader(level: number): (event: MouseEvent, params: ActionParams) => void;
}

declare class Image extends Widget {
	image: HTMLImageElement;
	attributes: Attributes;
	params: Params;
	constructor(attributes: Attributes, params: Params);
	render(body: Array<VirtualTree>): VirtualTree;
	getClassName(): string;
	createFile(dataURI: string): Blob;
	json(): {
		type: 'image';
		src: string;
	};
	json<T extends { type: string }>(children: T): {
		type: 'image';
		src: string;
		figcaption: T;
	};
	json<T extends { type: string }>(children?: T): {
		type: 'image';
		src: string;
		figcaption?: T;
	};
}

declare class ImageCaption extends Container {
	constructor(params: any);
	removeObserver: any;
	attributes: Record<string, string>;
	imagePlaceholder: HTMLElement;
	render(): VirtualTree;
	onMount(core: Ascetext<Array<PluginPlugin>>): void;
	onUnmount(core: Ascetext<Array<PluginPlugin>>): void;
	enterHandler(event: KeyboardEvent, params: HandlerParams): void;
	inputHandler(): void;
	json(): {
		type: 'image-caption';
	};
	json<T extends { type: string }[]>(children: T): {
		type: 'image-caption';
		body: T;
	};
	json<T extends { type: string }[]>(children?: T): {
		type: 'image-caption';
		body?: T;
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
	parseTree(element: VirtualTree, builder: Builder): Image | undefined;
	parseJson(element: { type: string }, builder: Builder): Image | undefined;
	generateImagePreview(file: File): Promise<string>;
	normalize(node: Node, builder: Builder): Node | false;
}

declare class Link extends InlineWidget {
	type: 'link';
	constructor(attributes: Attributes);
	render(): VirtualTree;
	normalize(element: any, builder: Builder): any;
	json(): {
		type: 'link';
	};
	json<T extends { type: string }[]>(children: T): {
		type: 'link';
		body: T;
	};
	json<T extends { type: string }[]>(children?: T): {
		type: 'link';
		body?: T;
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
	removeLinks(event: MouseEvent, params: ActionParams): void;
	setLink(event: MouseEvent, params: ActionParams): void;
	removeLink(event: MouseEvent, params: ActionParams): void;
	parseTree(element: VirtualTree, builder: Builder): Link | undefined;
	parseJson(element: { type: string }, builder: Builder): Link | undefined;
	wrap(match: any, builder: Builder): any;
	unwrap(node: any, builder: Builder): void;
	normalize(node: Node, builder: Builder): Node | false;
}

declare class List extends Section {
	constructor(attributes: {
		style: string;
	});
	render(): VirtualTree;
	normalize(element: any, builder: Builder): any;
	json(): {
		type: 'list';
		style: 'numerable' | 'marker';
	};
	json<T extends { type: string }[]>(children: T): {
		type: 'list';
		style: 'numerable' | 'marker';
		body: T;
	};
	json<T extends { type: string }[]>(children?: T): {
		type: 'list';
		style: 'numerable' | 'marker';
		body?: T;
	};
}

declare class ListItem extends Widget {
	constructor(params?: {});
	params: {};
	render(): VirtualTree;
	getDepth(container: any, node: any): number;
	json(): {
		type: 'list-item';
	};
	json<T extends { type: string }[]>(children: T): {
		type: 'list-item';
		body: T;
	};
	json<T extends { type: string }[]>(children?: T): {
		type: 'list-item';
		body?: T;
	};
}

declare class ListItemContent extends Container {
	constructor(params?: {});
	params: {};
	render(): VirtualTree;
	backspaceHandler(event: KeyboardEvent, params: HandlerParams): void;
	enterHandler(event: KeyboardEvent, params: HandlerParams): void;
	deleteHandler(event: KeyboardEvent, params: HandlerParams): void;
	indentLeft(event: MouseEvent, params: ActionParams): void;
	indentRight(event: MouseEvent, params: ActionParams): void;
	putEmptyBlockInMiddle(builder: Builder, setSelection: Selection["setSelection"]): void;
	json(): {
		type: 'list-item-content';
	};
	json<T extends { type: string }[]>(children: T): {
		type: 'list-item-content';
		body: T;
	};
	json<T extends { type: string }[]>(children?: T): {
		type: 'list-item-content';
		body?: T;
	};
}

declare class ListPlugin extends PluginPlugin {
	constructor(params?: {
		maxDepth: number | null;
	});
	params: {
		maxDepth: number | null;
	};
	get icons(): IconsGetter;
	parseTree(element: VirtualTree, builder: Builder): List | ListItem | ListItemContent | undefined;
	parseJson(element: { type: string }, builder: Builder): List | ListItem | ListItemContent | undefined;
	setNumberList(event: MouseEvent, params: ActionParams): void;
	setMarkerList(event: MouseEvent, params: ActionParams): void;
	normalize(node: Node, builder: Builder): Node | false;
}

declare class Paragraph extends Container {
	constructor();
	render(): VirtualTree;
	json(): {
		type: 'paragraph';
	};
	json<T extends { type: string }[]>(children: T): {
		type: 'paragraph';
		body: T;
	};
	json<T extends { type: string }[]>(children?: T): {
		type: 'paragraph';
		body?: T;
	};
}

declare class ParagraphPlugin extends PluginPlugin {
	get icons(): IconsGetter;
	parseTree(element: VirtualTree, builder: Builder): Paragraph | undefined;
	parseJson(element: { type: string }, builder: Builder): Paragraph | undefined;
	setParagraph(event: MouseEvent, params: ActionParams): void;
}

declare class Quote extends Container {
	constructor();
	render(): VirtualTree;
	json(): {
		type: 'quote';
	};
	json<T extends { type: string }[]>(children: T): {
		type: 'quote';
		body: T;
	};
	json<T extends { type: string }[]>(children?: T): {
		type: 'quote';
		body?: T;
	};
}

declare class QuotePlugin extends PluginPlugin {
	get icons(): IconsGetter;
	parse(element: HTMLElement | Text, builder: Builder): Quote | undefined;
	parseJson(element: HTMLElement | Text, builder: Builder): Quote | undefined;
	setQuote(event: MouseEvent, params: ActionParams): void;
}

export interface TextAttributes {
	content: string;
	weight?: string;
	style?: string;
	decoration?: string;
	strike?: string
}

declare class TextNode extends Node {
	constructor(attributes: TextAttributes);
	render(): VirtualTree;
	generateModifiers(): Array<string>;
	isEqual(target: Node): boolean;
	stringifyWithModifiers(modifiers: Array<string>): string;
	json(): {
		type: 'text';
		modifiers: Array<string>;
		content: string;
	};
}

declare class TextPlugin extends PluginPlugin {
	constructor(params?: {});
	params: {
		allowModifiers: Array<string>;
	};
	supportTags: Array<string>;
	get icons(): IconsGetter;
	parse(element: HTMLElement | Text, builder: Builder): TextNode | undefined;
	parseJson(element: HTMLElement | Text, builder: Builder): TextNode | undefined;
	unsetBold(event: MouseEvent, params: ActionParams): void;
	setBold(event: MouseEvent, params: ActionParams): void;
	unsetItalic(event: MouseEvent, params: ActionParams): void;
	setItalic(event: MouseEvent, params: ActionParams): void;
	unsetStrike(event: MouseEvent, params: ActionParams): void;
	setStrike(event: MouseEvent, params: ActionParams): void;
	unsetUnderline(event: MouseEvent, params: ActionParams): void;
	setUnderline(event: MouseEvent, params: ActionParams): void;
	normalize(node: Node, builder: Builder): Node | false;
}

declare function getIcon(source: string): HTMLElement;

export type InferNodes<T extends Array<PluginPlugin>> = T extends Array<{ parseJson: (...params: any) => infer U}> ? Exclude<U, undefined> : never

export {
	Ascetext,
	Builder,
	Controls,
	Selection,
	Editing,
	Render,
	VirtualTree,
	Parser,
	Dragndrop,
	PointerLongEvent,
	DragndropDragoutEvent,
	DragndropDragoverEvent,
	DragndropDraggingEvent,
	DragndropDropEvent,
	DragndropEvent,
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
	InlineWidget,
	Widget,
	Node,
	Container,
	ActionParams,
	HandlerParams,
	Paragraph,
	ParagraphPlugin,
	BreakLinePlugin,
	TextPlugin,
	Header,
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
	getIcon,
	Params
};
