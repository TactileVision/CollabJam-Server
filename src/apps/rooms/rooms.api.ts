import { RequestEnterRoom, RequestUpdateUser, UpdateRoomMode, WS_MSG_TYPE } from "@sharedTypes/websocketTypes";
import { io } from "../../server";
import * as RoomDB from './rooms.data-access'
import { InteractionMode, Room } from "@sharedTypes/roomTypes";
import { Logger } from "../../util/Logger";
import { Socket } from "socket.io";
import { TactonAPI } from "../tactons/tactons.api";

const RoomsAPI = (socket: Socket) => {
	Logger.info("Setting up Tacton API for new room connection")

	socket.on("disconnecting", (reason) => {
		Logger.warn(`Removing user ${socket.id} from service because of disconnect`)
		RoomDB.removeUserFromRoom(socket.id)
	});

	socket.on(WS_MSG_TYPE.GET_AVAILABLE_ROOMS_SERV, async () => {
		const rooms = await RoomDB.getRooms()
		socket.emit(WS_MSG_TYPE.GET_AVAILABLE_ROOMS_CLI, rooms as unknown as Room[])
	})

	socket.on(WS_MSG_TYPE.LOG_OUT, async (req: RequestUpdateUser) => {
		Logger.info(`Logout from ${req.user.id} requested`)
		socket.leave(req.roomId)
		RoomDB.removeUserFromRoom(req.user.id)
		const u = await RoomDB.getUsersOfRoom(req.roomId)
		io.to(req.roomId).emit(WS_MSG_TYPE.UPDATE_USER_ACCOUNT_CLI, u);
	})

	socket.on(WS_MSG_TYPE.ENTER_ROOM_SERV, async (req: RequestEnterRoom) => {
		Logger.info("Entering room requested " + req.id)
		socket.join(req.id)

		const r = await RoomDB.getRoom(req.id)
		await RoomDB.assignUserToRoom(req.id, { name: req.userName, id: socket.id, color: "#ec660c" })
		const user = await RoomDB.getUsersOfRoom(req.id)
		console.log(user)
		socket.emit(WS_MSG_TYPE.ENTER_ROOM_CLI, {
			room: r,
			userId: socket.id,
			participants: user,
			recordings: []
		})
		io.to(req.id).emit(WS_MSG_TYPE.UPDATE_USER_ACCOUNT_CLI, user);


	})

	socket.on(WS_MSG_TYPE.UPDATE_ROOM_MODE_SERV, async (req: UpdateRoomMode) => {
		const room = await RoomDB.getRoom(req.roomId)
		const rm = room.mode
		console.log(`Changing interaction mode from ${rm} to ${req.newMode}`)
		if (rm == req.newMode) return


		//TODO Get tacton session
		/** IST -> SOLL == WIRd
		 * Jamming -> Playback = Start Playback
		 * Jamming -> Record   = Start Recording
		 * Playback -> Record  = Stop Playback, Start Recording
		 * Playback -> Jamming = Stop Playback
		 * Record -> Jamming   = Stop Recording
		 * Record -> Playback  = Stop Recording, Start Playback
		 * 
		 */

		if (rm == InteractionMode.Recording) {
			Logger.info("Stopping recording")
			TactonAPI.stopRecording(room)
		} else if (rm == InteractionMode.Playback) {
			Logger.info("Stopping playback")
		}

		RoomDB.setRecordMode(req.roomId, req.newMode)
		if (req.newMode == InteractionMode.Recording) {
			Logger.info("Start recording")
			//TODO Only start recording when a user presses a but
			TactonAPI.startRecording(room)
		} else if (req.newMode == InteractionMode.Playback) {
			Logger.info("Stopping playback")
		} else {
			Logger.info("Lets jam again")
		}
		io.to(req.roomId).emit(WS_MSG_TYPE.UPDATE_ROOM_MODE_CLI, req)


		// if (rm == InteractionMode.Jamming) {
		// 	// StartPlayback
		// 	if (update.newMode == InteractionMode.Playback && update.tactonId != undefined) {

		// 	} else if (update.newMode == InteractionMode.Recording) {

		// 	} else {
		// 		return
		// 	}
		// } else if (rm == InteractionMode.Recording) {
		// 	if (update.newMode == InteractionMode.Jamming) {
		// 		const isValidRecording = s.finishRecording()
		// 		if (isValidRecording) {
		// 			const t = s.history[s.history.length - 1]
		// 			setName(t, s, r.recordingNamePrefix)

		// 			broadCastMessage(update.roomId, WS_MSG_TYPE.GET_TACTON_CLI, t, startTimeStamp)
		// 			saveTactonAsJson(update.roomId, t)
		// 		}
		// 	} else { return }

		// } else { //rm ==Playback
		// 	if (update.newMode == InteractionMode.Jamming) {
		// 		//Stop Playback in Room by broacasting change to jamming mode to all clients. Let the client that initiated playback stop it
		// 	} else { return }
		// }

	})

}
export { RoomsAPI }