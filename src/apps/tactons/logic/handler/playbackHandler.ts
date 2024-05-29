import { InstructionToClient, TactonInstruction } from "@sharedTypes/tactonTypes";
import { InteractionHandler, OutputHandler } from "./handlerInterfaces";
import { UpdateRoomMode } from "@sharedTypes/websocketTypes";
import { TactonPlayer } from "../util/tactonplayer";
import { getTacton } from "../../../../apps/rooms/rooms.data-access";
import { Logger } from "../../../../util/Logger";


export class PlaybackHandler implements InteractionHandler, OutputHandler {
	player: TactonPlayer = new TactonPlayer()

	async onEnteringMode(info: UpdateRoomMode) {
		if (info.tactonId == undefined) {
			Logger.error(`No tacton id provided for room ${info.roomId}`)
		} else {
			const t = await getTacton(info.tactonId)
			if (t != undefined) {
				// console.log("Starting playback of tacton alder")
				this.player.start(t)
			}
		}
	};
	onLeavingMode(info: UpdateRoomMode) {
		this.player.stop()
	};
	onInstructions(instructions: InstructionToClient[]) {
		if (this.onOutput != null)
			this.onOutput(instructions)
	};


	constructor() {
		this.player.onTactonPlayerFinished = () => {
			if (this.onHasFinished != null)
				this.onHasFinished(null)
		}
		this.player.onOutput = (i) => {
			if (this.onOutput != null) {
				this.onOutput(i)
			}
		}
	}
	onOutput: ((instructions: InstructionToClient[]) => void) | null = null

	onHasFinished: ((instructions: TactonInstruction[] | null) => void) | null = null;

}