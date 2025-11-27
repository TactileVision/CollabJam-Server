import {
	RequestEnterRoom,
	RequestUpdateUser,
	UpdateEditingUserUUIDS,
	UpdateRoomMode,
	WS_MSG_TYPE
} from "@sharedTypes/websocketTypes";
import { io } from "../../server";
import * as RoomDB from './rooms.data-access'
import * as TagsDB from '../tags/tags.data-access'
import { Room } from "@sharedTypes/roomTypes";
import { Logger } from "../../util/Logger";
import { Socket } from "socket.io";
import { tactonProcessors } from "../tactons/logic/tactons.domain";
import { getColorForUser } from "../../types/defaultColorUsers";
import {isInstructionSetParameter, Tacton, TactonInstruction} from "@sharedTypes/tactonTypes";
import {v4 as uuidv4} from "uuid";
import RoomModule from "../../store/RoomModule";
import UndoRedoModule from "../../store/UndoRedoModule";

const RoomsAPI = (socket: Socket) => {
	Logger.info("Setting up Tacton API for new room connection")

	socket.on("disconnecting", (reason) => {
		Logger.warn(`Removing user ${socket.id} from service because of disconnect`)
		RoomDB.deleteUser(socket.id)
		RoomModule.setLocks(socket.id, [])
		const roomId: string | undefined = RoomModule.lastRoomIdOfUser.get(socket.id);
		if (roomId == undefined) return;

		const updateEditingUserResp: UpdateEditingUserUUIDS = {
			roomId: roomId,
			userId: socket.id,
			uuids: []
		}
		io.to(roomId).emit(WS_MSG_TYPE.UPDATE_EDITING_USER_UUIDS_CLI, updateEditingUserResp);
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
		console.log(req)
		const u = await RoomDB.getUsersOfRoom(req.roomId)
		io.to(req.roomId).emit(WS_MSG_TYPE.UPDATE_USER_ACCOUNT_CLI, u);
		
		// unlock blocks
		RoomModule.setLocks(req.user.id, []);
		const updateEditingUserResp: UpdateEditingUserUUIDS = {
			roomId: req.roomId,
			userId: req.user.id,
			uuids: []
		}
		
		// if lastUser, stop tracking
		if (u.length === 0) {
			let tactons: Tacton[] = await RoomDB.getTactonsForRoom(req.roomId);
			tactons.forEach((tacton: Tacton): void => {
				UndoRedoModule.untrackTacton(tacton.uuid);
			});
		}
		
		RoomModule.updateLastRoomOfUser(req.user.id);		
		io.to(req.roomId).emit(WS_MSG_TYPE.UPDATE_EDITING_USER_UUIDS_CLI, updateEditingUserResp);
	})

	socket.on(WS_MSG_TYPE.ENTER_ROOM_SERV, async (req: RequestEnterRoom) => {
		Logger.info("Entering room requested " + req.id)
		socket.join(req.id)

		const r = await RoomDB.getRoom(req.id)
		await RoomDB.assignUserToRoom(req.id, { name: req.userName, id: socket.id, color: getColorForUser(req.id), muted: false })
		let tactons: Tacton[] = await RoomDB.getTactonsForRoom(req.id)
		tactons = migrateToUuids(tactons);
		const user = await RoomDB.getUsersOfRoom(req.id)
		const locks = RoomModule.getLocks();
		RoomModule.updateLastRoomOfUser(socket.id, req.id);
		socket.emit(WS_MSG_TYPE.ENTER_ROOM_CLI, {
			room: r,
			userId: socket.id,
			participants: user,
			recordings: tactons,
			userLocks: locks
		})
		io.to(req.id).emit(WS_MSG_TYPE.UPDATE_USER_ACCOUNT_CLI, user);

		socket.emit(WS_MSG_TYPE.UPDATE_AVAILABLE_TAGS_CLI, { customTags: await TagsDB.getCustomTags(), bodyTags: await TagsDB.getBodyTags(), promptTags: await TagsDB.getPromptTags() })
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
		Logger.info(`Setting room prefix for room ${req.roomId} to ${req.prefix}`)
		await RoomDB.setNamePrefix(req.roomId, req.prefix)

		const r = await RoomDB.getRoom(req.roomId)
		Logger.info(r)
		if (r != undefined)
			io.to(req.roomId).emit(WS_MSG_TYPE.ROOM_INFO_CLI, r)
	})

	socket.on(WS_MSG_TYPE.UPDATE_EDITING_USER_UUIDS_SERV, async (req: UpdateEditingUserUUIDS) => {
		const room: Room | undefined = await RoomDB.getRoom(req.roomId)
		if (room == undefined || req.userId == null) return
		RoomModule.setLocks(req.userId, req.uuids);
		io.to(req.roomId).emit(WS_MSG_TYPE.UPDATE_EDITING_USER_UUIDS_CLI, req);
	})
}
export { RoomsAPI }

function migrateToUuids(tactons: Tacton[]): Tacton[] {
	tactons.forEach((tacton: Tacton): void => {
		let isValid: boolean = true;
		for (const instruction of tacton.instructions) {
			// check the first setParameter for uuids
			if (isInstructionSetParameter(instruction)) {	
				// must has uuids
				if (!instruction.setParameter.uuids) {
					isValid = false;
					break;
				}

				// uuids must be same length as array
				const uuidsLength = instruction.setParameter.uuids.length;
				const channelLength = instruction.setParameter.channels.length;
				if (uuidsLength !== channelLength) {						
					isValid = false;
					break;
				}
				
				// uuids must be string
				instruction.setParameter.uuids.forEach((uuids) => {
					if (typeof uuids !== "string") {
						isValid = false;
					}
				})
				
				if (!isValid) break;
			} 
		}
		
		if (!isValid) {
			tacton.instructions = addUuidsToInstruction(tacton.instructions);
		}
	});	
	return tactons;
}
function addUuidsToInstruction(instructions: TactonInstruction[]): TactonInstruction[] {
	const activeUuidsByChannel: (string | undefined)[] = Array(4).fill(undefined);
	instructions.forEach((instruction: TactonInstruction): void => {
		if (!isInstructionSetParameter(instruction)) return;

		const params = instruction.setParameter;
		const channels = params.channels;
		
		// groupUuids
		if (!params.groupUuids || !Array.isArray(params.groupUuids)) {
			params.groupUuids = channels.map(() => null);
		} else if (params.groupUuids.length !== channels.length) {
			const existing = params.groupUuids;
			params.groupUuids = channels.map((_, i) => existing[i] ?? null);
		}

		//uuids 
		if (!params.uuids || !Array.isArray(params.uuids)) {
			params.uuids = [];
		}

		channels.forEach((ch, idx) => {
			const intensity = params.intensity;

			if (intensity > 0) {
				// new Block -> generate uuid
				if (!activeUuidsByChannel[ch]) {
					activeUuidsByChannel[ch] = uuidv4();
				}
				params.uuids[idx] = activeUuidsByChannel[ch]!;
			} else {
				// end of block -> use uuid
				const activeUuid = activeUuidsByChannel[ch];
				if (activeUuid) {
					params.uuids[idx] = activeUuid;
					activeUuidsByChannel[ch] = undefined;
				} else {
					// fallback ?
					params.uuids[idx] = uuidv4();
				}
			}
		});
	});

	return instructions;
}