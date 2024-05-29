import { Tacton, TactonInstruction } from "@sharedTypes/tactonTypes"
import { v4 } from "uuid"

export const assembleTacton = (instructions: TactonInstruction[], name: string, iteration: number): Tacton => {
	return {
		uuid: v4().toString(),
		instructions: instructions,
		metadata: {
			name: name,
			iteration: iteration,
			favorite: false,
			bodyTags: [],
			customTags: [],
			description: "",
			recordDate: new Date()
		}
	} as Tacton
}