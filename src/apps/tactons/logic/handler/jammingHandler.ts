import { InstructionToClient, TactonInstruction } from "@sharedTypes/tactonTypes";
import { InteractionHandler, OutputHandler } from "./handlerInterfaces";
import { UpdateRoomMode } from "@sharedTypes/websocketTypes";

export class JammingHandler implements InteractionHandler, OutputHandler {
	onOutput: ((instructions: InstructionToClient[]) => void) | null = null;
	onEnteringMode: (info: UpdateRoomMode) => void = () => {

	};
	onLeavingMode: (info: UpdateRoomMode) => void = () => {

	};
	onInstructions: (instructions: InstructionToClient[]) => void = (instructions) => {
		if (this.onOutput != null)
			this.onOutput(instructions)

	};
	onHasFinished: ((instructions: TactonInstruction[] | null) => void) | null = () => {

	};;
}