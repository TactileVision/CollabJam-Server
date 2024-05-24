import * as Mongoose from "mongoose";

// export const InteractionModeSchema = new Mongoose.Schema<InteractionMode>({
// 	type: Number,
// 	enum: [1, 2, 3], //1: Jamming, 2: Recording, 3: Playback
// 	default: 1
// })
//TODO? https://onexception.dev/news/1261808/custom-ids-in-mongoose-query-population
//Check out  "@sharedTypes/roomTypes"
export const UserSchema = new Mongoose.Schema({
	id: {
		type: String,
		required: true,
		// _id: true
	},
	name: {
		type: String,
		required: true,
		default: ""
	},
	color: {
		type: String,
		required: true,
		default: "#000000"
	},
	roomId: {
		type: String,
		required: false
	},
	muted: {
		type: Boolean,
		required: true
	}
})


//Check out  "@sharedTypes/roomTypes"
export const RoomSchema = new Mongoose.Schema({
	id: {
		type: String,
		required: true,
		default: ""
		// _id: true
	}, name: String,
	description: String,
	recordingNamePrefix: String,
	mode: {
		type: Number,
		//1: Jamming, 2: Recording, 3: Playback
		min: 1,
		max: 3,
		default: 1
	},
	maxDurationRecord: Number,
	currentRecordingTime: Number,
	participants: [{ type: UserSchema }],
})