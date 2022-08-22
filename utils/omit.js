export default function omit(object, field) {
	// eslint-disable-next-line no-unused-vars
	const { [field]: omited, ...rest } = object

	return rest
}
