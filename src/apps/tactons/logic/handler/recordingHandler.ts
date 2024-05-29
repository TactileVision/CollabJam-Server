import { InstructionToClient, TactonInstruction } from "@sharedTypes/tactonTypes";
import { InteractionHandler, OutputHandler } from "./handlerInterfaces";
import { UpdateRoomMode } from "@sharedTypes/websocketTypes";
import { Logger } from "../../../../util/Logger";
import { TactonProcessingRules } from "../tactonProcessingRule";
import { removePauseFromEnd, turnOffAllOutputs } from "../util/tacton";
import { TactonInstructionRecorder } from "../util/TactonInstructionRecorder";


export class RecordingHandler implements InteractionHandler, OutputHandler {
	recorder: TactonInstructionRecorder = new TactonInstructionRecorder()
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
