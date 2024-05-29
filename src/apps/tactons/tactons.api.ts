import { Logger } from "../../util/Logger";
import { ChangeTactonMetadata, RequestSendTactileInstruction, TactonIdentifier, TactonMove, UpdateTacton, WS_MSG_TYPE } from "@sharedTypes/websocketTypes";
import { io } from "../../server";
import { Socket } from "socket.io";
import { getRoom, } from "../rooms/rooms.data-access";
import * as Tactons from "./tactons.domain";
import * as RoomDB from '../rooms/rooms.data-access';
import { TactonModel } from "../../util/dbaccess";
import { InteractionMode } from "@sharedTypes/roomTypes";
import { ObjectId, } from "mongodb";
import { Tacton, } from "@sharedTypes/tactonTypes";
import { v4 as uuidv4 } from "uuid";
import { getIterationForName } from "./tactons.data-access";
import { MoveOptions } from "fs-extra";


export const TactonsWebsocketAPI = (socket: Socket) => {
	Logger.info("Setting up Tacton API for new socket connection")
	socket.on(WS_MSG_TYPE.SEND_INSTRUCTION_SERV, (req: RequestSendTactileInstruction) => {
		Tactons.tactonProcessors.get(req.roomId)?.inputInstruction(req.instructions)

	})
	socket.on(WS_MSG_TYPE.DELETE_TACTON_SERV, async (req: TactonIdentifier) => {
		Logger.info(`Deleting tacton ${req.tactonId} from room ${req.roomId}`)
		const del = await TactonModel.deleteOne({ uuid: req.tactonId })
		io.to(req.roomId).emit(WS_MSG_TYPE.DELETE_TACTON_CLI, {
			delted: del.deletedCount == 1 ? true : false,
			tacton: req,
		})
	})
	socket.on(WS_MSG_TYPE.DUPLICATE_TACTON_SERV, async (req: TactonIdentifier) => {
		Logger.info(`Duplicating tacton ${req.tactonId} from room ${req.roomId}`)
		const tactons = await TactonModel.find({ rooms: req.roomId })
		const copy = await TactonModel.findOne({ uuid: req.tactonId })
		if (copy == undefined || copy == null || tactons == null || tactons == undefined) {
			return
		}


		//TODO Move to it's own function in tactons.domain.ts
		copy._id = new ObjectId()
		copy.uuid = uuidv4().toString()
		copy.isNew = true; //<--------------------IMPORTANT
		if (copy.metadata != undefined && copy.metadata.name != undefined) {
			const iteration = await getIterationForName(copy.metadata.name)
			// const prefix = Tactons.getPrefixFromFilename(copy.metadata.name)
			copy.metadata.iteration = iteration
			copy.save()
			Logger.info(copy.metadata)
			io.to(req.roomId).emit(WS_MSG_TYPE.GET_TACTON_CLI, copy as unknown as Tacton)
		}
	})

	socket.on(WS_MSG_TYPE.CHANGE_TACTON_METADATA_SERV, async (req: ChangeTactonMetadata) => {
		Logger.info(`Upadating tacton metadata for ${req.tactonId}`)

		const s = await TactonModel.findOne({ uuid: req.tactonId })
		if (s == undefined) return

		//Update name and iteration based on that name in both structs
		if (s.metadata?.name != req.metadata.name) {
			const iteration = await getIterationForName(req.metadata.name)
			s.metadata = req.metadata
			s.metadata.iteration = iteration
			req.metadata.iteration = iteration
			//TODO Deciede and implement a way of renaming
		}

		const save = await s.save()
		// console.log(s)
		// console.log(save)

		//TODO if something went wrong, send back the old metadata alder
		io.to(req.roomId).emit(WS_MSG_TYPE.CHANGE_TACTON_METADATA_CLI, req)
	})

	socket.on(WS_MSG_TYPE.UPDATE_TACTON_SERV, async (req: UpdateTacton) => {
		Logger.info(`Upadating tacton instructions for ${req.tactonId}`)
		//TODO Think about the merit of storing each change into the mongo db
		let tacton = await TactonModel.findOne({ uuid: req.tactonId })
		if (tacton == undefined) return
		// console.log(tacton)
		//TODO 😅

		tacton.instructions = req.tacton.instructions as any

		// console.log(req.tacton.instructions)
		// const x = await tacton.updateOne({ uuid: req.tactonId },
		// 	{
		// 		name: "foo-0",
		// 		instructions: req.tacton.instructions,
		// 	})
		const x = await tacton.save()
		// console.log(tacton.instructions)

		// console.log(x)
		io.to(req.roomId).emit(WS_MSG_TYPE.UPDATE_TACTON_CLI, { roomId: req.roomId, tacton: tacton as unknown as Tacton, tactonId: req.tactonId })
	})
	/*             case WS_MSG_TYPE.UPDATE_TACTON_SERV: {
				const session = TactonModule.sessions.get(msg.payload.roomId);
				if (!session) return;

				const index = session.history.findIndex((tacton) => tacton.uuid === msg.payload.tacton.uuid);
				if (index === -1) return;

				session.history[index] = msg.payload.tacton;
				StoreManager.broadCastMessage(msg.payload.roomId, WS_MSG_TYPE.UPDATE_TACTON_CLI, msg.payload, msg.startTimeStamp);
				saveTactonAsJson(msg.payload.roomId, session.history[index]);
				break;
			} */
	socket.on(WS_MSG_TYPE.MOVE_TACTON_SERV, async (req: TactonMove) => {
		//TODO Get tacton from DB
		Logger.info(`Moving tacton ${req.tacton.tactonId} from ${req.tacton.roomId} to ${req.tacton.tactonId}`)

		const tactonsInNewRoom = await TactonModel.find({ rooms: req.newRoomId })
		const tactonToMove = await TactonModel.findOne({ uuid: req.tacton.tactonId })
		Logger.info(tactonsInNewRoom)
		Logger.info(tactonToMove)
		if (tactonToMove == undefined || tactonToMove == null) return

		if (tactonToMove.metadata == undefined || tactonToMove.metadata == null) return
		//TODO Check if room exists

		Logger.info(`Moving tacton ${req.tacton.tactonId} from ${req.tacton.roomId} to ${req.tacton.tactonId}`)
		//TODO Check if room contains a tacton with the same basename, if so prepend original room name to tacton name
		const isDuplicate = tactonsInNewRoom.find(t => { t.metadata?.name == tactonToMove?.metadata?.name })
		if (isDuplicate != undefined && tactonToMove.metadata != undefined) {
			tactonToMove.metadata.name = "foo" + tactonToMove.metadata?.name
		}
		//TODO Update current tacton accordingly, this solution only works right now, because we only have one roomid per tacton in the array
		tactonToMove.rooms.pop()
		tactonToMove.rooms.push(req.newRoomId)

		const t = await tactonToMove.save()

		io.to(req.tacton.roomId).emit(WS_MSG_TYPE.DELETE_TACTON_CLI, { delted: true, tacton: req.tacton })
		io.to(req.newRoomId).emit(WS_MSG_TYPE.GET_TACTON_CLI, tactonToMove as unknown as Tacton)
		//TODO SEND delete message to old room
		//TODO SEND add message to new room
	})
}

export const TactonProcessorCallbackBindings = (p: Tactons.TactonProcessor, roomId: string) => {

	p.onOutput = (i) => {
		// console.log(i)
		io.to(roomId).emit(WS_MSG_TYPE.SEND_INSTRUCTION_CLI, i);
	}
	p.onNewInteractionMode = async (mode) => {
		io.to(roomId).emit(WS_MSG_TYPE.UPDATE_ROOM_MODE_CLI, mode)
		await RoomDB.setRecordMode(mode.roomId, mode.newMode)
	}

	p.onRecordingFinished = async (recordedInstructions) => {
		Logger.info("PROCESSOR RECORDING FINISHED")
		const r = await getRoom(roomId)
		let prefix = "unnamed"
		if (r != undefined) {
			prefix = r.recordingNamePrefix
		}

		const iteration = await getIterationForName(prefix)
		const newTacton = Tactons.assembleTacton(recordedInstructions, prefix, iteration)
		io.to(roomId).emit(WS_MSG_TYPE.GET_TACTON_CLI, newTacton)
		const ts = newTacton as any
		ts.rooms = [roomId]
		TactonModel.create(ts)
		p.inputInteractionMode(InteractionMode.Recording, { newMode: InteractionMode.Jamming, roomId: roomId, tactonId: ts.uuid })
	}

	p.onPlaybackFinished = async () => {
		// console.log("Playback of tacton is finished")
		// console.log(roomId)
		RoomDB.setRecordMode(roomId, InteractionMode.Jamming)
		io.to(roomId).emit(WS_MSG_TYPE.UPDATE_ROOM_MODE_CLI, { newMode: InteractionMode.Jamming, roomId: roomId, tactonId: undefined })
	}

	p.onOverdubbingFinished = async (tactonId, overdubbedInstructions) => {
		RoomDB.setRecordMode(roomId, InteractionMode.Jamming)
		await TactonModel.updateOne({ uuid: tactonId, }, { instructions: overdubbedInstructions, 'metadata.date': new Date() })
		const t = await TactonModel.findOne({ uuid: tactonId })

		if (t != undefined && t != null) {
			io.to(roomId).emit(WS_MSG_TYPE.UPDATE_TACTON_CLI, { roomId: roomId, tactonId: tactonId, tacton: t as unknown as Tacton })
			io.to(roomId).emit(WS_MSG_TYPE.UPDATE_ROOM_MODE_CLI, { newMode: InteractionMode.Jamming, roomId: roomId, tactonId: undefined })
		} else {
			Logger.error(`Tacton ${tactonId} does not exist`)
			//TODO Store as a new tacton
		}
		p.inputInteractionMode(InteractionMode.Overdubbing, { newMode: InteractionMode.Jamming, roomId: roomId, tactonId: tactonId })

	}
}