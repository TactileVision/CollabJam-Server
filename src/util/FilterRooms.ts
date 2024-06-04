export interface RoomListFilter {
	isActive: boolean;
	roomsToShow: string[];
}

export const roomFilter: RoomListFilter = {
	isActive: false,
	roomsToShow: [
		"105d1f69-bd3f-49f5-9615-cf7e8209e929", //name: "Demo 1",
		"4ec34f34-97f9-44b5-bc53-1a321a2288ee", //name: "Demo 2",
		"4ec34f34-97f9-44b5-bc53-1a321aaaaa11", //name: "Team_1",
		"4ec34f34-97f9-44b5-bc53-1a321aaaaa12", //name: "Team_1-P_1",
		"4ec34f34-97f9-44b5-bc53-1a321aaaaa13", //name: "Team_1-P_2",
		"4ec34f34-97f9-44b5-bc53-1a321aaaaa21", //name: "Team_2",
		"4ec34f34-97f9-44b5-bc53-1a321aaaaa22", //name: "Team_2-P_1",
		"4ec34f34-97f9-44b5-bc53-1a321aaaaa23", //name: "Team_2-P_2",
		"4ec34f34-97f9-44b5-bc53-1a321aaaaa31", //name: "Team_3",
		"4ec34f34-97f9-44b5-bc53-1a321aaaaa32", //name: "Team_3-P_1",
		"4ec34f34-97f9-44b5-bc53-1a321aaaaa33", //name: "Team_3-P_2",
		"4ec34f34-97f9-44b5-bc53-1a321aaaaa41", //name: "Team_4",
		"4ec34f34-97f9-44b5-bc53-1a321aaaaa42", //name: "Team_4-P_1",
		"4ec34f34-97f9-44b5-bc53-1a321aaaaa43", //name: "Team_4-P_2",
		"4ec34f34-97f9-44b5-bc53-1a321aaaaa51", //name: "Team_5",
		"4ec34f34-97f9-44b5-bc53-1a321aaaaa52", //name: "Team_5-P_1",
		"4ec34f34-97f9-44b5-bc53-1a321aaaaa53", //name: "Team_5-P_2",
	],
};
