import { InstructionToClient, TactonInstruction } from "@sharedTypes/tactonTypes";
import { InteractionHandler, OutputHandler } from "./handlerInterfaces";
import { UpdateRoomMode } from "@sharedTypes/websocketTypes";
import { Logger } from "../../../../util/Logger";

import { PlaybackHandler } from "./playbackHandler";
import { RecordingHandler } from "./recordingHandler";
import { mergeTactons } from "../util/merge";


export class OverdubbingHandler implements InteractionHandler, OutputHandler {
	playbackHandler = new PlaybackHandler()
	recordHandler = new RecordingHandler()
	playbackChannelState = new Array<number>(16).fill(0)

	onOutput: ((instructions: InstructionToClient[]) => void) | null = null
	onEnteringMode(info: UpdateRoomMode) {
		//TODO get max length of tacton:
		this.recordHandler.rules = {
			allowInputOnPlayback: true,
			loop: true,
			maxRecordLength: 10000,
			startRecordingOn: "immediate"
		}
		this.playbackHandler.onEnteringMode(info)
		this.recordHandler.onEnteringMode(info)
		//TODO Set record timer to the length of the playback
	}

	onLeavingMode(info: UpdateRoomMode) {
		this.recordHandler.onLeavingMode(info)
		this.playbackHandler.onLeavingMode(info)
	}

	onInstructions(instructions: InstructionToClient[]) {
		//TODO Stor for each channel the current playback value and return to that value if the instructions contain a 0 amlitude value
		this.recordHandler.onInstructions(instructions)
		// if (this.onOutput != null)
		// 	this.onOutput(instructions)
	}

	onHasFinished: ((instructions: TactonInstruction[] | null) => void) | null = null

	constructor() {
		// this.recordHandler.onHasFinished 
		this.playbackHandler.onHasFinished = (instructions) => {
			Logger.info("Overdubbing playback finished")

			this.recordHandler.onRecordingTimerOver()

		}
		this.recordHandler.onHasFinished = (instructions) => {
			//Both the player, as well as the handler are finished now, therefore we will merge the two TactonInstruction[] into one 
			Logger.info("Overdubbing recording finished")
			// const rt = this.recordHandler.recorder.stop()
			//Merge Tactons an share it with the callback function
			if (this.onHasFinished != null) {
				const pt = this.playbackHandler.player.tacton?.instructions == undefined ? [] : this.playbackHandler.player.tacton?.instructions


				let rt: TactonInstruction[] = []
				if (instructions != null) rt = instructions
				const t = mergeTactons(rt, pt)
				Logger.info(this.playbackHandler.player.tacton)
				this.onHasFinished(t)

			}

		}
		this.recordHandler.onOutput = (i) => {
			//TODO look at packages and insert playback stored state if needed
			// i.forEach(inst => {
			// 	inst.channels.forEach(channel => {
					
			// 	});
			// })
			if (this.onOutput != null)
				this.onOutput(i)
		}
		this.playbackHandler.onOutput = (i) => {
			//TODO Grab output from playback handler to 
			i.forEach(inst => {
				inst.channels.forEach(channel => {
					this.playbackChannelState[channel] = inst.intensity
				});
			})
			console.log(this.playbackChannelState)
			Logger.info(`--${i.length}--`)
			// if (this.onOutput != null)
			// 	this.onOutput(i)
		}
	}
}
