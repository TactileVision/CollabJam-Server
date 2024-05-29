import { InteractionMode } from "@sharedTypes/roomTypes"
import { InteractionHandler } from "./handler/handlerInterfaces"
import { UpdateRoomMode } from "@sharedTypes/websocketTypes"
import { Logger } from "../../../util/Logger"

export class InteractionModeSwitcher {
	handler: Map<InteractionMode, InteractionHandler> = new Map<InteractionMode, InteractionHandler>()
	currentHandler: InteractionHandler | undefined = undefined
	modeUpdateRequested = (currentMode: InteractionMode, info: UpdateRoomMode): InteractionMode => {
		Logger.info(`Switching from ${currentMode} to ${info.newMode}`)
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