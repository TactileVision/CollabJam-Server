import { Logger } from "../../util/Logger";
import { RequestSendTactileInstruction, WS_MSG_TYPE } from "@sharedTypes/websocketTypes";
import { io } from "../../server";
import { Socket } from "socket.io";
import { getRoom, } from "../rooms/rooms.data-access";
import * as Tactons from "./tactons.domain";
import * as RoomDB from '../rooms/rooms.data-access';
import { TactonModel } from "../../util/dbaccess";
import { InteractionMode } from "@sharedTypes/roomTypes";
import { mergeTactons } from "./merge";

export const TactonsWebsocketAPI = (socket: Socket) => {
	Logger.info("Setting up Tacton API for new socket connection")
	socket.on(WS_MSG_TYPE.SEND_INSTRUCTION_SERV, (req: RequestSendTactileInstruction) => {
		Tactons.tactonProcessors.get(req.roomId)?.inputInstruction(req.instructions)

	})
}

export const TactonProcessorCallbackBindings = (p: Tactons.TactonProcessor, roomId: string) => {

	p.onOutput = (i) => {
		io.to(roomId).emit(WS_MSG_TYPE.SEND_INSTRUCTION_CLI, i);
	}
	p.onNewInteractionMode = async (mode) => {
		io.to(roomId).emit(WS_MSG_TYPE.UPDATE_ROOM_MODE_CLI, mode)
		await RoomDB.setRecordMode(mode.roomId, mode.newMode)
	}

	p.onRecordingFinished = async (recordedInstructions) => {
		console.log("Recording is finished")

		console.log(recordedInstructions)
		const r = await getRoom(roomId)
		let prefix = "unnamed"
		if (r != undefined) {
			prefix = r.recordingNamePrefix
		}

		const tactons = await RoomDB.getTactonsForRoom(roomId)
		const name = Tactons.appendCounterToPrefixName(tactons, prefix)
		const newTacton = Tactons.assembleTacton(recordedInstructions, name)
		io.to(roomId).emit(WS_MSG_TYPE.GET_TACTON_CLI, newTacton)
		const ts = newTacton as any
		ts.rooms = [roomId]
		TactonModel.create(ts)

		//TactonModel.add(roomId, t)

		/*TactonMetadata {
					name: string = prefix + counter
					favorite: boolean = false
					recordDate: Date = getDateFromRecorder/Timer
					description: string = ""
					customTags: string[] = []
					bodyTags: string[] = []
		} */
		//TODO Load metadata from room to populate metadata aspect of tacton etc
		//TODO Store loaded tacton in database
		//TODO Send tacton to clients in room
	}

	p.onPlaybackFinished = async () => {
		console.log("Playback of tacton is finished")
		RoomDB.setRecordMode(roomId, InteractionMode.Jamming)
		io.to(roomId).emit(WS_MSG_TYPE.UPDATE_ROOM_MODE_CLI, { newMode: InteractionMode.Jamming, roomId: roomId, tactonId: undefined })
	}

}