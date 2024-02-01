import { Tacton, isInstructionSetParameter, InstructionSetParameter, isInstructionWait, InstructionWait } from "@sharedTypes/tactonTypes";
import { TactonRecordingSession } from "../types";




function removePauseFromEnd(t: Tacton) {
	// Case 1 - Ends with Pause
	// Case 2 - Ends with Vibration 
	// the last set parameter is for setting all items to zero and the last wait indicates the time between the last input and the deactivation
	// when the second last setParameter Instruction sets a value to 0, remove the following wait instruction
	// console.log(t.instructions)
	const instructions = t.instructions.filter(inst => { return isInstructionSetParameter(inst) == true; }) as InstructionSetParameter[];
	if (instructions.length > 2 && instructions[instructions.length - 2].setParameter.intensity == 0) {
		t.instructions.splice(t.instructions.length - 2, 1);
	}
	else if (instructions.length > 2 && instructions[instructions.length - 2].setParameter.intensity == 0) {
		t.instructions.splice(t.instructions.length - 2, 1);
	}
}

function turnOffAllOutputs(t: Tacton, lastModified: number) {
	//get all unique channels
	//add instruction with all channels and intensity 0
	const sp = t.instructions.filter(i => { return isInstructionSetParameter(i) == true }) as InstructionSetParameter[]
	const uniqueChannels = [...new Set(sp.map(item => item.setParameter.channelIds).flat())];
	t.instructions.push({ wait: { miliseconds: new Date().getTime() - lastModified } })
	t.instructions.push({ setParameter: { intensity: 0, channelIds: uniqueChannels } })
	// console.log(uniqueChannels)
	// console.log(t)

}

export function processTactonInstructions(tacton: Tacton, lastModified: number) {
	turnOffAllOutputs(tacton, lastModified);
	removePauseFromEnd(tacton);
}

export function setName(tacton: Tacton, session: TactonRecordingSession, recordingNamePrefix: string) {
	const prefix = session.history.filter(e => {
		return e.metadata.name.startsWith(recordingNamePrefix + "-") == true
	})
	let len = prefix.length.toString()
	tacton.metadata.name = recordingNamePrefix + "-" + len
}
export function getDuration(tacton: Tacton): number {
	let d = 0
	tacton.instructions.filter(i => { return isInstructionWait(i) == true }).forEach(i => {
		d += (i as InstructionWait).wait.miliseconds
	})
	return d
}

function hasInstructions(tacton: Tacton): boolean {
	return tacton.instructions.filter(i => { return isInstructionSetParameter(i) == true }).length > 1
}

export function isWellFormed(tacton: Tacton): boolean {
	return getDuration(tacton) > 0 && hasInstructions(tacton)
}
