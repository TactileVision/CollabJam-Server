import { Logger } from "../../util/Logger";
import { RequestEnterRoom, RequestSendTactileInstruction, WS_MSG_TYPE } from "@sharedTypes/websocketTypes";
import { io } from "../../server";
import { Socket } from "socket.io";

export const TactonsAPI = (socket : Socket) => {
	// io.on("connection", (socket) => {
	Logger.info("Setting up Tacton API for new socket connection")

	//Broadcasts received instructions to all clients in the room
	socket.on(WS_MSG_TYPE.SEND_INSTRUCTION_SERV, (req: RequestSendTactileInstruction) => {
		io.to(req.roomId).emit(WS_MSG_TYPE.SEND_INSTRUCTION_CLI, req.instructions);
	})
	// })
}