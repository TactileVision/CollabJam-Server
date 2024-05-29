import { InstructionToClient, TactonInstruction } from "@sharedTypes/tactonTypes";
import { Logger } from "../../../../util/Logger";

export class TactonInstructionRecorder {
	reset() {
		this.instructions = []
		this.isRecording = false;
	}
	recordDate: Date | undefined = undefined
	lastModified: number = new Date().getTime()
	isRecording: boolean = false
	instructions: TactonInstruction[] = [] as TactonInstruction[]
	setStartPoint() {
		Logger.info("[TactonInstructionRecorder] Setting start point")
		this.lastModified = new Date().getTime()
	}

	//call this when a instruction is received
	record(newInstructions: InstructionToClient[], startImmediately: boolean) {
		//console.log("Recording")
		this.isRecording = true;
		// if (this.instructions.length > 0 || startImmediately) {
		const timeDiff = new Date().getTime() - this.lastModified
		const parameter = {
			wait: {
				miliseconds: timeDiff
			}
		}
		this.instructions.push(parameter)
		// }
		newInstructions.forEach(i => {
			const parameter = {
				setParameter: {
					channels: i.channels,
					intensity: i.intensity
				}
			}
			this.instructions.push(parameter)
		});
		this.lastModified = new Date().getTime()
	}

	stop(): TactonInstruction[] {
		this.isRecording = false;
		return this.instructions
	}
}

