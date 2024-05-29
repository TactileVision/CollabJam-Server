export interface TactonProcessingRules {
	allowInputOnPlayback: boolean,
	startRecordingOn: "firstInput" | "immediate",
	loop: boolean,
	maxRecordLength: number

}

export const getDefaultRules = (): TactonProcessingRules => {

	return {
		allowInputOnPlayback: false,
		startRecordingOn: "firstInput",
		loop: false,
		maxRecordLength: 10000
	}
}
