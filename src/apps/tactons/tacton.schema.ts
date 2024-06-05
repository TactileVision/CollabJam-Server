import { InstructionSetParameter, InstructionWait, TactonInstruction, isInstructionWait } from "@sharedTypes/tactonTypes";
import * as Mongoose from "mongoose";
import { Logger } from "../../util/Logger";

export const TactonMetadataSchema = new Mongoose.Schema({
	name: {
		type: String,
		required: false,
		default: "unnamed"
	},
	iteration: {
		type: Number,
		required: false,
		default: 0
	},
	favorite: {
		type: Boolean,
		required: true,
		default: false
	},
	recordDate: {
		type: Date,
		required: true,
		default: new Date()
	},
	notes: {
		type: String,
		required: false,
		default: ""
	},
	prompt: {
		type: String,
		required: false,
		default: ""
	},
	intention: {
		type: String,
		required: false,
		default: ""
	},
	customTags: {
		type: [String],
		required: false,
		default: []
	},
	bodyTags: {
		type: [String],
		required: false,
		default: []
	}

})

export const InstructionWaitSchema = new Mongoose.Schema({
	wait: {
		milliseconds: {
			type: Number, required: true
		},
	}
})
export const InstructionSetParameterSchema = new Mongoose.Schema({
	setParameter: {
		channel: {
			type: [Number], required: true
		},
		intensity: {
			type: Number, required: true
		},
	}
})

const resolveType = (obj: string): TactonInstruction => {

	const instruction = JSON.parse(obj)
	Logger.info(obj)
	Logger.info(instruction)
	if (isInstructionWait(instruction as TactonInstruction)) {
		return instruction as InstructionWait
	} else {
		return instruction as InstructionSetParameter
	}
}

export const TactonInstructionSchema = new Mongoose.Schema({
	instruction: {
		type: {},
		set: (val: unknown) => {
			return JSON.stringify(val)
		},
		get: (val: unknown) => {
			// console.log(val)
			const x = JSON.parse(val as string)
			if (isInstructionWait(x as TactonInstruction)) {
				return x as InstructionWait
			} else {
				return x as InstructionSetParameter
			}
		},
	}

})

export const TactonSchema = new Mongoose.Schema({
	uuid: {
		type: String,
	},
	rooms: [String],
	instructions: [{
		type: {}, required: true, set: (val: unknown) => {
			return JSON.stringify(val)
		},
		get: (val: unknown) => {
			// console.log(val)
			const x = JSON.parse(val as string)
			if (isInstructionWait(x as TactonInstruction)) {
				return x as InstructionWait
			} else {
				return x as InstructionSetParameter
			}
		},
	}],
	metadata: { type: TactonMetadataSchema, /* required: true */ }

})
