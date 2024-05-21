import { Logger } from "../../util/Logger";
import { RequestSendTactileInstruction, WS_MSG_TYPE } from "@sharedTypes/websocketTypes";
import { io } from "../../server";
import { Socket } from "socket.io";
import { getRoom, } from "../rooms/rooms.data-access";
import { InteractionMode, Room } from "@sharedTypes/roomTypes";
import * as Tactons from "./tactons.domain";

export const TactonsWebsocketAPI = (socket: Socket) => {
	// io.on("connection", (socket) => {
	Logger.info("Setting up Tacton API for new socket connection")

	//Broadcasts received instructions to all clients in the room
	socket.on(WS_MSG_TYPE.SEND_INSTRUCTION_SERV, (req: RequestSendTactileInstruction) => {
		io.to(req.roomId).emit(WS_MSG_TYPE.SEND_INSTRUCTION_CLI, req.instructions);

	})
	// })
}

export const TactonAPI = {
	startRecording: (room: Room) => {
		console.log("Start recording")
		let timer = Tactons.timers.get(room.id)
		if (timer == undefined) {
			console.log("create timer")
			Tactons.timers.set(room.id, new Tactons.RecordingTimer(10, room.maxDurationRecord, () => {
				console.log("Recording ended")
			}))
		}
		timer = Tactons.timers.get(room.id)
		console.log(timer)
		timer?.start()
	},
	stopRecording: (room: Room) => {
		const timer = Tactons.timers.get(room.id)
		timer?.stop()
	},
	record: async (req: RequestSendTactileInstruction) => {
		const room = await getRoom(req.roomId)
		if (room == undefined) return;
		if (room.mode == InteractionMode.Recording) {
			console.log("adding instruciton to tacton recording")
		}
	},

	//TODO Add return value
	getTactonsForRoom: async (roomId: string)  => {

	}

}