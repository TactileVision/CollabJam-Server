import mongoose from 'mongoose';
import { MongoClient } from "mongodb";
import { RoomSchema, TagSchema, UserSchema } from "../apps/rooms/room.schema";
import { TactonSchema } from '../apps/tactons/tacton.schema';
import { InteractionMode } from '@sharedTypes/roomTypes';

// Connection URL
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const RoomModel = mongoose.model('Room', RoomSchema)
const TactonModel = mongoose.model('Tacton', TactonSchema)
const TagModel = mongoose.model('Tags', TagSchema )
const UserModel = mongoose.model('User', UserSchema)
let db

// let tactons: Collection
// Database Name
const dbName = 'collabjam';

export const initDB = async () => {
	db = await mongoose.connect(url, { dbName: dbName });
	await UserModel.deleteMany({}) //Remove all of the Kaderleichen from the server
	await RoomModel.updateMany({}, { mode: InteractionMode.Jamming })
}

export { RoomModel, UserModel, TactonModel,TagModel };
