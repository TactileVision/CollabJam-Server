import { InteractionMode, Room, User } from "@sharedTypes/roomTypes";
import { RoomModel, TactonModel, TagModel, UserModel } from '../../util/dbaccess'
import { Logger } from "../../util/Logger";
import { Tacton } from "@sharedTypes/tactonTypes";
import { getColorForUser } from "../../types/defaultColorUsers";


// RoomModel.watch().on('change', data =>{
// 	console.log("Room changed")
// 	console.log(data)
// })

const addRoom = async (room: Room) => {
	const s = await RoomModel.find({ id: room.id })
	if (s.length == 0) RoomModel.create(room)
	else Logger.info("Room already exists")
}

const getRooms = async (): Promise<Room[]> => {
	return await RoomModel.find({})
}

const getRoom = async (id: string): Promise<Room | undefined> => {
	const rooms = await getRooms()
	return rooms.find(r => { return r.id == id })
}

const assignUserToRoom = async (roomId: string, user: User) => {
	Logger.info(`Assigning user ${user.id} to room`)

	const userExists = await UserModel.find({ id: user.id })
	Logger.info(userExists)
	if (userExists.length == 0) {
		Logger.info(`Adding user ${user.name} (${user.id}) to room ${roomId}`);
		await UserModel.create({ id: user.id ?? "", name: user.name, color: getColorForUser(user.id), roomId: roomId, muted: false })
	} else if (userExists.length == 1) {
		Logger.info(`Moving user ${user.name} (${user.id}) to room ${roomId}`);
		await UserModel.updateOne({ id: user.id, }, { roomId: roomId, name: user.name, color: getColorForUser(user.id), muted: false })
	}
}

const deleteUser = async (userId: string) => {
	Logger.info("deleting user")
	await UserModel.deleteOne({ id: userId })
}
const removeUserFromRoom = async (userId: string) => {
	await UserModel.updateOne({ id: userId }, { roomId: "" })
	Logger.info(`Removed user ${userId} from his current room`)
}
const getUsersOfRoom = async (id: string): Promise<User[]> => {
	const x = await UserModel.find({ roomId: id })
	// x.forEach(user => delete user.roomId)
	return x
}
const getUser = async (id: string): Promise<User> => {

	const user = await UserModel.findOne({ id: id }) as unknown as User
	Logger.info(`Getting user ${id}`)
	Logger.info(user)
	return user
}

const getTactonsForRoom = async (roomId: string): Promise<Tacton[]> => {
	const x = await TactonModel.find({ rooms: roomId })
	const y = x as unknown as Tacton[]
	return y
}
const getTacton = async (tactonId: string): Promise<Tacton | null> => {
	console
	const x = await TactonModel.findOne({ uuid: tactonId })
	if (x != undefined) {
		const t = x as unknown as Tacton
		return t
	}

	return null
}
const setRecordMode = async (roomId: string, recordMode: InteractionMode) => {
	await RoomModel.updateOne({ id: roomId }, { mode: recordMode })
}



export async function setNamePrefix(roomId: string, prefix: string) {
	await RoomModel.updateOne({ id: roomId }, { recordingNamePrefix: prefix })
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
	deleteUser,
	getTactonsForRoom,
	getTacton,

}
