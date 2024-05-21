import { InteractionMode, Room, User } from "@sharedTypes/roomTypes";
import { RoomModel, UserModel, getRoomsCollection, getUserCollection } from '../../util/dbaccess'
import { Logger } from "../../util/Logger";

const addRoom = async (room: Room) => {
	const s = await RoomModel.find({ id: room.id })
	if (s.length == 0) RoomModel.create(room)
	// else console.log("Room already exists")
}

const getRooms = async (): Promise<Room[]> => {
	return await RoomModel.find({})
}

const getRoom = async (id: string): Promise<Room | undefined> => {
	const rooms = await getRooms()
	return rooms.find(r => { return r.id == id })
}

const assignUserToRoom = async (roomId: string, user: User) => {
	const userExists = await UserModel.find({ id: user.id })
	if (userExists.length == 0) {
		Logger.info(`Adding user ${user.name} (${user.id}) to room ${roomId}`);
		await UserModel.create({ id: user.id ?? "", name: user.name, color: user.color, roomId: roomId, })
	} else if (userExists.length == 1) {
		Logger.info(`Moving user ${user.name} (${user.id}) to room ${roomId}`);
		await UserModel.updateOne({ id: user.id, }, { roomId: roomId })
	}
}

const deleteUser = async (userId: string) => {
	await UserModel.deleteOne({ id: userId })
}
const removeUserFromRoom = async (userId: string) => {
	await UserModel.updateOne({ id: userId }, { roomId: "" })
	Logger.info(`Removed user ${userId} from his current room`)
}
const getUsersOfRoom = async (id: string): Promise<User[]> => {
	const x = await UserModel.find({ roomId: id })
	x.forEach(user => delete user.roomId)
	return x
}
const getUser = async (id: string): Promise<User> => {
	const user = await UserModel.findOne({ id: id }) as unknown as User
	return user
}


const setRecordMode = async (roomId: string, recordMode: InteractionMode) => {
	await RoomModel.updateOne({id: roomId, mode: recordMode})
}

export {
	addRoom,
	getRoom,
	getRooms,
	assignUserToRoom,
	getUsersOfRoom,
	removeUserFromRoom,
	setRecordMode,
	getUser,
	deleteUser
}

