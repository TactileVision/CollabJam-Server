import { InstructionToClient, Tacton, TactonInstruction, impl } from "@sharedTypes/tactonTypes";
import { Logger } from "../../util/Logger";
import { UpdateRoomMode } from "@sharedTypes/websocketTypes";
import { InteractionMode } from "@sharedTypes/roomTypes";
import { v4 as uuidv4 } from "uuid";
import { removePauseFromEnd, turnOffAllOutputs } from "../../util/tacton";
import { TactonPlayer } from "./tactonplayer";
import { getTacton } from "../rooms/rooms.data-access";
import { mergeTactons } from "./merge";
export interface TactonProcessingRules {
	allowInputOnPlayback: boolean,
	startRecordingOn: "firstInput" | "immediate",
	loop: boolean,
	maxRecordLength: number

}

export const getDefaultRules = (): TactonProcessingRules => {

	return {
		allowInputOnPlayback: false,
		startRecordingOn: "firstInput",
		loop: false,
		maxRecordLength: 10000
	}
}

interface InteractionHandler {
	onEnteringMode: (info: UpdateRoomMode) => void
	onLeavingMode: (info: UpdateRoomMode) => void
	onInstructions: (instructions: InstructionToClient[]) => void
	onHasFinished: ((instructions: TactonInstruction[] | null) => void) | null
}

interface OutputHandler {
	onOutput: ((instructions: InstructionToClient[]) => void) | null
}



export class ModeSwitcher {
	handler: Map<InteractionMode, InteractionHandler> = new Map<InteractionMode, InteractionHandler>()
	currentHandler: InteractionHandler | undefined = undefined
	modeUpdateRequested = (currentMode: InteractionMode, info: UpdateRoomMode): InteractionMode => {
		// console.log(currentMode)
		// console.log(info.newMode)
		if (currentMode == info.newMode)
			return info.newMode

		//TODO Check if we should even switch!

		const handler = this.handler.get(currentMode)
		if (handler != null) {
			handler.onLeavingMode(info)
		}

		const newHandler = this.handler.get(info.newMode)
		if (newHandler != null) {
			newHandler.onEnteringMode(info)
		}
		this.currentHandler = newHandler

		return info.newMode
	}
}

//Room Logic

class JammingHandler implements InteractionHandler, OutputHandler {
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
class PlaybackHandler implements InteractionHandler, OutputHandler {
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

class RecordingHandler implements InteractionHandler, OutputHandler {
	recorder: TactonInstructionRecorder = new TactonInstructionRecorder()
	//TODO Make elapsedTimeWatcher optional (for overdubbing)
	// elapsedTimeWatcher: ElapsedTimeWatcher = new ElapsedTimeWatcher()
	intervalHandle: NodeJS.Timeout | null = null


	rules: TactonProcessingRules = { allowInputOnPlayback: false, loop: false, startRecordingOn: "firstInput", maxRecordLength: 10000 }

	onOutput: ((instructions: InstructionToClient[]) => void) | null = null
	onHasFinished: ((instructions: TactonInstruction[] | null) => void) | null = null;

	onEnteringMode(info: UpdateRoomMode) {
		//console.log("enetring record mode") 
		if (this.rules.startRecordingOn == "immediate") {
			// this.elapsedTimeWatcher.startTimer(500, this.rules.maxRecordLength, () => { this.onRecordingTimerOver() })
			this.recorder.setStartPoint()
			this.intervalHandle = setInterval(() => {
				this.onRecordingTimerOver()
			}, this.rules.maxRecordLength)
			// this.recorder.record([], true)
		}
	}
	onLeavingMode(info: UpdateRoomMode) {
		Logger.info("LEAVING RECORD MODE")
		// this.elapsedTimeWatcher.stopTimer()
		this.onRecordingTimerOver()
		this.recorder.reset()
	};
	onInstructions(instructions: InstructionToClient[]) {
		if (this.rules.startRecordingOn == "firstInput" && this.recorder.isRecording == false) {
			this.recorder.setStartPoint()
			this.intervalHandle = setInterval(() => {
				this.onRecordingTimerOver()
			}, this.rules.maxRecordLength)
			// this.elapsedTimeWatcher.startTimer(500, this.rules.maxRecordLength, () => { this.onRecordingTimerOver() })
		} else {

		}
		this.recorder.record(instructions, false)
		if (this.onOutput != null)
			this.onOutput(instructions)
	};

	onRecordingTimerOver() {
		if (this.intervalHandle != null) {
			Logger.info("Stopping the Time watcher")
			clearInterval(this.intervalHandle);
			this.intervalHandle = null

			Logger.info("RecordingHandler - Timer is over")
			const t = this.recorder.stop()
			//console.log(t)
			turnOffAllOutputs(t, this.recorder.lastModified);
			removePauseFromEnd(t);

			if (this.onHasFinished != null)
				this.onHasFinished(t)
		}
	}

	constructor() {

	}

}

// class EditingHandler implements InteractionHandler, OutputHandler {
// 	onOutput: ((instructions: InstructionToClient[]) => void) | null;
// 	onEnteringMode: (info: UpdateRoomMode) => void;
// 	onLeavingMode: (info: UpdateRoomMode) => void;
// 	onInstructions: (instructions: InstructionToClient[]) => void;
// 	onHasFinished: ((instructions: TactonInstruction[] | null) => void) | null;

// }


class OverdubbingHandler implements InteractionHandler, OutputHandler {
	// player: TactonPlayer = new TactonPlayer()
	playbackHandler = new PlaybackHandler()
	recordHandler = new RecordingHandler()

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
		this.recordHandler.onInstructions(instructions)
		if (this.onOutput != null)
			this.onOutput(instructions)
	}

	onHasFinished: ((instructions: TactonInstruction[] | null) => void) | null = null

	constructor() {
		// this.recordHandler.onHasFinished 
		this.playbackHandler.onHasFinished = (instructions) => {
			// this.recordHandler.recordingTimer.stopTimer()
			Logger.info("Overdubbing playback finished")

			// this.recordHandler.elapsedTimeWatcher.stopTimer() //Trigger that the recordingIsFinished callback
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
	}
}




export class TactonProcessor {

	modeSwitcher: ModeSwitcher = new ModeSwitcher()
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


	// setRules(rules: TactonProcessingRules) { this.rules = rules }

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

		const output = (i: InstructionToClient[]) => {
			//console.log("Output")
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

/*
export class ElapsedTimeWatcher {
	intervalHandle: NodeJS.Timeout | null = null
	interval = 20 //updateInterval
	lastCallMs = 0
	currentMs = 0
	maxTimeMs = 0
	onTimeOver: (() => void) | null = null
	onTimerUpdate: ((currentMs: number) => void) | null = null

	isRunning(): boolean { return this.intervalHandle != null; }
	advanceTime(): number {
		const now = new Date().getTime()
		const deltaT = now - this.lastCallMs
		this.lastCallMs = now
		this.currentMs = this.currentMs + deltaT
		Logger.info(`${this.currentMs / 1000}/${this.maxTimeMs / 1000} seconds recorded`);

		if (this.currentMs >= this.maxTimeMs && this.maxTimeMs != 0) {
			Logger.info("ADVANCE TIME -  STOPTIMER");
			this.stopTimer()
		}
		return this.currentMs
	}

	startTimer(updateIntervalMs: number, maxTimeMs: number, onTimeOver?: (() => void)) {
		this.interval = updateIntervalMs;
		this.maxTimeMs = maxTimeMs;
		if (onTimeOver) {
			this.onTimeOver = onTimeOver
		}

		Logger.info("Starting recording timer");
		this.currentMs = 0
		this.lastCallMs = new Date().getTime()
		if (this.intervalHandle == null) {
			this.intervalHandle = setInterval(() => { this.advanceTime() }, this.interval);
		} else {
			Logger.info("RecordingTimer already running");
		}

	}
	stopTimer() {
		if (this.intervalHandle != null) {
			Logger.info("Stopping the ElapsedTimeWatcher")
			clearInterval(this.intervalHandle);
			this.intervalHandle = null
			if (this.onTimeOver != null) {
				this.onTimeOver()
			}
		}
	}
}
*/

export const assembleTacton = (instructions: TactonInstruction[], name: string, iteration: number): Tacton => {
	return {
		uuid: uuidv4().toString(),
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



export const appendCounterToPrefixName = (tactons: Tacton[], prefix: string): string => {
	const names = tactons.map(t => {
		return t.metadata.name
	})
	var collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
	var sorted = names.sort(collator.compare)
	const highestPrefix = sorted.pop()

	//console.log(highestPrefix)
	//console.log(names)
	if (highestPrefix != undefined) {
		const num = highestPrefix.split("-").pop()
		if (num != undefined) {
			let len = parseInt(num) + 1
			return prefix + "-" + len
		}
	}
	return "foo"

}

export const getPrefixFromFilename = (filename: string): string => {
	const splitted = filename.split("-")
	splitted.pop()
	return splitted.join("-")
}


export const tactonProcessors: Map<string, TactonProcessor> = new Map<string, TactonProcessor>()
