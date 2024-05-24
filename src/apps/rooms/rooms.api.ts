import { RequestEnterRoom, RequestUpdateUser, UpdateRoomMode, WS_MSG_TYPE } from "@sharedTypes/websocketTypes";
import { io } from "../../server";
import * as RoomDB from './rooms.data-access'
import { InteractionMode, Room } from "@sharedTypes/roomTypes";
import { Logger } from "../../util/Logger";
import { Socket } from "socket.io";
import { tactonProcessors } from "../tactons/tactons.domain";

const RoomsAPI = (socket: Socket) => {
	Logger.info("Setting up Tacton API for new room connection")

	socket.on("disconnecting", (reason) => {
		Logger.warn(`Removing user ${socket.id} from service because of disconnect`)
		RoomDB.deleteUser(socket.id)
	});

	socket.on(WS_MSG_TYPE.GET_AVAILABLE_ROOMS_SERV, async () => {
		const rooms = await RoomDB.getRooms()
		socket.emit(WS_MSG_TYPE.GET_AVAILABLE_ROOMS_CLI, rooms as unknown as Room[])
	})

	//LOG OUT means logging out from the room
	socket.on(WS_MSG_TYPE.LOG_OUT, async (req: RequestUpdateUser) => {
		Logger.info(`Logout from ${req.user.id} requested`)
		socket.leave(req.roomId)
		await RoomDB.removeUserFromRoom(req.user.id)
		Logger.info(`Notifying users from room ${req.roomId}`)
		const u = await RoomDB.getUsersOfRoom(req.roomId)
		io.to(req.roomId).emit(WS_MSG_TYPE.UPDATE_USER_ACCOUNT_CLI, u);
	})

	socket.on(WS_MSG_TYPE.ENTER_ROOM_SERV, async (req: RequestEnterRoom) => {
		Logger.info("Entering room requested " + req.id)
		socket.join(req.id)

		const r = await RoomDB.getRoom(req.id)
		await RoomDB.assignUserToRoom(req.id, { name: req.userName, id: socket.id, color: "#ec660c", muted: false })
		const tactons = await RoomDB.getTactonsForRoom(req.id)
		const user = await RoomDB.getUsersOfRoom(req.id)
		socket.emit(WS_MSG_TYPE.ENTER_ROOM_CLI, {
			room: r,
			userId: socket.id,
			participants: user,
			recordings: tactons
		})
		io.to(req.id).emit(WS_MSG_TYPE.UPDATE_USER_ACCOUNT_CLI, user);

		if (r?.mode == InteractionMode.Playback) {
			const tid = tactonProcessors.get(r.id)?.player.tacton?.uuid
			if (tid != undefined) {
				socket.emit(WS_MSG_TYPE.UPDATE_ROOM_MODE_CLI, { roomId: r.id, tactonId: tid, newMode: InteractionMode.Playback })

			}
		}


	})

	socket.on(WS_MSG_TYPE.UPDATE_ROOM_MODE_SERV, async (req: UpdateRoomMode) => {
		const room = await RoomDB.getRoom(req.roomId)
		if (room == undefined) return
		tactonProcessors.get(req.roomId)?.inputInteractionMode(room.mode, req)
		//TODO Get tacton session
		/** IST -> SOLL == WIRd
		 * Jamming -> Playback = Start Playback
		 * Jamming -> Record   = Start Recording
		 * Playback -> Record  = Stop Playback, Start Recording
		 * Playback -> Jamming = Stop Playback
		 * Record -> Jamming   = Stop Recording
		 * Record -> Playback  = Stop Recording, Start Playback
		 */
	})

	socket.on(WS_MSG_TYPE.CHANGE_ROOMINFO_TACTON_PREFIX_SERV, async (req: { roomId: string, prefix: string }) => {
		await RoomDB.setNamePrefix(req.roomId, req.prefix)

		const r = await RoomDB.getRoom(req.roomId)
		Logger.info(r)
		if (r != undefined)
			io.to(req.roomId).emit(WS_MSG_TYPE.ROOM_INFO_CLI, r)
	})

}
export { RoomsAPI }