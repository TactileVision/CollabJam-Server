import { Tacton } from "@sharedTypes/tactonTypes";

export const appendCounterToPrefixName = (tactons: Tacton[], prefix: string): string => {
	const names = tactons.map(t => {
		return t.metadata.name
	})
	var collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
	var sorted = names.sort(collator.compare)
	const highestPrefix = sorted.pop()

	//console.log(highestPrefix)
	//console.log(names)
	if (highestPrefix != undefined) {
		const num = highestPrefix.split("-").pop()
		if (num != undefined) {
			let len = parseInt(num) + 1
			return prefix + "-" + len
		}
	}
	return "foo"

}

export const getPrefixFromFilename = (filename: string): string => {
	const splitted = filename.split("-")
	splitted.pop()
	return splitted.join("-")
}
