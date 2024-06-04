import { InstructionToClient, Tacton, TactonInstruction, impl } from "@sharedTypes/tactonTypes";
import { Logger } from "../../../util/Logger";
import { UpdateRoomMode } from "@sharedTypes/websocketTypes";
import { InteractionMode } from "@sharedTypes/roomTypes";
import { v4 as uuidv4 } from "uuid";
import { JammingHandler } from "./handler/jammingHandler";
import { PlaybackHandler } from "./handler/playbackHandler";
import { RecordingHandler } from "./handler/recordingHandler";
import { OverdubbingHandler } from "./handler/overdubbingHandler";
import { InteractionModeSwitcher } from "./InteractionModeSwitcher";




export class TactonProcessor {
	modeSwitcher: InteractionModeSwitcher = new InteractionModeSwitcher()
	jammingHandler: JammingHandler = new JammingHandler()
	playbackHandler: PlaybackHandler = new PlaybackHandler()
	recordingHandler: RecordingHandler = new RecordingHandler()
	// editingHandler: editingHandler = new EditingHandler()
	overdubbingHandler: OverdubbingHandler = new OverdubbingHandler()

	onOutput: ((instructions: InstructionToClient[]) => void) | null = null
	onNewInteractionMode: ((newMode: UpdateRoomMode) => void) | null = null
	onRecordingFinished: ((recordedInstructions: TactonInstruction[]) => void) | null = null
	onPlaybackFinished: (() => void) | null = null
	onOverdubbingFinished: ((tactonId: string, overdubbedInstructions: TactonInstruction[]) => void) | null = null


	inputInstruction(instructions: InstructionToClient[]) {
		if (this.modeSwitcher.currentHandler != null) {
			this.modeSwitcher.currentHandler?.onInstructions(instructions)
		}
	}

	async inputInteractionMode(currentMode: InteractionMode, req: UpdateRoomMode) {
		const m = this.modeSwitcher.modeUpdateRequested(currentMode, req)
		if (m != currentMode) {
			if (this.onNewInteractionMode != null)
				this.onNewInteractionMode(req)
		}
	}

	constructor() {
		this.modeSwitcher.handler.set(InteractionMode.Jamming, this.jammingHandler)
		this.modeSwitcher.handler.set(InteractionMode.Playback, this.playbackHandler)
		this.modeSwitcher.handler.set(InteractionMode.Recording, this.recordingHandler)
		// this.modeSwitcher.handler.set(InteractionMode.Editing, this.editingHandler)
		this.modeSwitcher.handler.set(InteractionMode.Overdubbing, this.overdubbingHandler)
		this.modeSwitcher.currentHandler = this.jammingHandler

		const output = (i: InstructionToClient[]) => {
			if (this.onOutput != null)
				this.onOutput(i)
		}

		this.playbackHandler.onOutput = (i) => { output(i) }
		this.recordingHandler.onOutput = (i) => { output(i) }
		this.jammingHandler.onOutput = (i) => { output(i) }
		this.overdubbingHandler.onOutput = (i) => { output(i) }


		this.playbackHandler.onHasFinished = () => {
			if (this.onPlaybackFinished != null)
				this.onPlaybackFinished()
		}

		this.recordingHandler.onHasFinished = (i) => {
			Logger.info("RecordingHanlder has finished")
			if (this.onRecordingFinished != null) {
				if (i != null)
					this.onRecordingFinished(i)
				else
					this.onRecordingFinished([])

			}
		}
		this.overdubbingHandler.onHasFinished = (i) => {
			Logger.info("Overdubbing has finished:")

			//Pass both the id of the tacton overdubbed, as well as the new data to the callback
			if (this.onOverdubbingFinished != null) {
				const t = this.overdubbingHandler.playbackHandler.player.tacton

				if (i != null && t?.uuid != undefined)
					this.onOverdubbingFinished(t?.uuid, i)
				else
					this.onOverdubbingFinished("", [])
			}
		}

	}
}






export const tactonProcessors: Map<string, TactonProcessor> = new Map<string, TactonProcessor>()
