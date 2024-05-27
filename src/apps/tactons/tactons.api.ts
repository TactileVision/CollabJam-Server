import { Logger } from "../../util/Logger";
import { ChangeTactonMetadata, RequestSendTactileInstruction, TactonIdentifier, UpdateTacton, WS_MSG_TYPE } from "@sharedTypes/websocketTypes";
import { io } from "../../server";
import { Socket } from "socket.io";
import { getRoom, } from "../rooms/rooms.data-access";
import * as Tactons from "./tactons.domain";
import * as RoomDB from '../rooms/rooms.data-access';
import { TactonModel } from "../../util/dbaccess";
import { InteractionMode } from "@sharedTypes/roomTypes";
import { mergeTactons } from "./merge";
import { copyFile } from "fs";
import { ObjectId, UUID } from "mongodb";
import { isGeneratorFunction } from "util/types";
import { Tacton, TactonInstruction } from "@sharedTypes/tactonTypes";
import { Mongoose } from "mongoose";
import { v4 as uuidv4 } from "uuid";


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
			const prefix = Tactons.getPrefixFromFilename(copy.metadata.name)
			const name = Tactons.appendCounterToPrefixName(tactons as unknown as Tacton[], prefix)
			copy.metadata.name = name

			copy.save()
			Logger.info(copy.metadata)
			io.to(req.roomId).emit(WS_MSG_TYPE.GET_TACTON_CLI, copy as unknown as Tacton)
		}
	})
	socket.on(WS_MSG_TYPE.CHANGE_TACTON_METADATA_SERV, async (req: ChangeTactonMetadata) => {
		Logger.info(`Upadating tacton metadata for ${req.tactonId}`)

		const s = await TactonModel.findOne({ uuid: req.tactonId })
		if (s == undefined) return

		if (s.metadata?.name != req.metadata.name) {
			//TODO Deciede and implement a way of renaming
		}
		s.metadata = req.metadata

		const save = await s.save()
		console.log(s)
		console.log(save)

		//TODO if something went wrong, send back the old metadata alder
		io.to(req.roomId).emit(WS_MSG_TYPE.CHANGE_TACTON_METADATA_CLI, req)
	})
	socket.on(WS_MSG_TYPE.UPDATE_TACTON_SERV, async (req: UpdateTacton) => {
		Logger.info(`Upadating tacton instructions for ${req.tactonId}`)
		//TODO Think about the merit of storing each change into the mongo db
		let tacton = await TactonModel.findOne({ uuid: req.tactonId })
		if (tacton == undefined) return
		console.log(tacton)
		//TODO 😅
		
		tacton.instructions = req.tacton.instructions as any

		console.log(req.tacton.instructions)
		// const x = await tacton.updateOne({ uuid: req.tactonId },
		// 	{
		// 		name: "foo-0",
		// 		instructions: req.tacton.instructions,
		// 	})
		const x = await tacton.save()
		console.log(tacton.instructions)

		console.log(x)
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