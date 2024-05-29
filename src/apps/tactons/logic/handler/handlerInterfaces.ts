import { InstructionToClient, TactonInstruction } from "@sharedTypes/tactonTypes"
import { UpdateRoomMode } from "@sharedTypes/websocketTypes"

export interface InteractionHandler {
	onEnteringMode: (info: UpdateRoomMode) => void
	onLeavingMode: (info: UpdateRoomMode) => void
	onInstructions: (instructions: InstructionToClient[]) => void
	onHasFinished: ((instructions: TactonInstruction[] | null) => void) | null
}

export interface OutputHandler {
	onOutput: ((instructions: InstructionToClient[]) => void) | null
}


