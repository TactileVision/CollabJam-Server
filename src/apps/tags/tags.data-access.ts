import { Logger } from "../../util/Logger"
import { TagModel } from "../../util/dbaccess"

const initTags = async (bodyTags: string[], customTags: string[], promptTags: string[]) => {
	const t = await TagModel.findOne({ id: 1 })
	if (t == undefined) {
		Logger.info("Creating tags for server ")
		await TagModel.create({ id: 1, customTags: customTags })
		await TagModel.updateOne({ id: 1 }, { bodyTags: bodyTags, customTags: customTags, promptTags: promptTags })
	} else {
		await addCustomTags(customTags)
		await addBodyTags(customTags)
		await addPromptTags(promptTags)

	}
}

const addBodyTags = async (tags: string[]): Promise<boolean> => {
	const t = await TagModel.findOne({ id: 1 })
	let update: boolean = false
	if (t != undefined) {
		tags.forEach(tag => {
			if (t.bodyTags.findIndex(x => { return x == tag }) == -1) {
				t.bodyTags.push(tag)
				update = true
			}
		})
		await t.save()
	}
	return update
}

//Returns true if a new tag is inserted into the array
const addCustomTags = async (tags: string[]): Promise<boolean> => {
	const t = await TagModel.findOne({ id: 1 })
	let update: boolean = false
	if (t != undefined) {
		tags.forEach(tag => {
			if (t.customTags.findIndex(x => { return x == tag }) == -1) {
				t.customTags.push(tag)
				update = true
			}
		})
		await t.save()
	}
	return update
}

const getCustomTags = async (): Promise<String[]> => {
	const t = await TagModel.findOne({ id: 1 })
	return t?.customTags || []
}
const getBodyTags = async (): Promise<String[]> => {
	const t = await TagModel.findOne({ id: 1 })
	return t?.bodyTags || []

}
const getPromptTags = async (): Promise<String[]> => {
	const t = await TagModel.findOne({ id: 1 })
	return t?.promptTags || []
}

const addPromptTags = async (prompts: string[]): Promise<boolean> => {
	const p = await TagModel.findOne({ id: 1 })
	let update: boolean = false
	if (p != undefined) {
		prompts.forEach(prompt => {
			if (prompt != "" && p.promptTags.findIndex(x => { return x == prompt }) == -1) {
				p.promptTags.push(prompt)
				update = true
			}
		})
		await p.save()
	}
	return update
}

export {
	initTags,
	addCustomTags,
	getCustomTags,
	getBodyTags,
	addPromptTags,
	getPromptTags
}