import { InstructionSetParameter, InstructionWait, TactonInstruction, isInstructionSetParameter, isInstructionWait } from "@sharedTypes/tactonTypes";
import {v4 as uuidv4} from 'uuid';
interface ChannelInstructionBlock {
	startMs: number,
	length: number,
	intensity: number,
	channelId: number,
	ends: boolean,
	uuid: string,
	groupUuid: string | undefined
}
const optimizeBlocksByChannel = (blocksByChannel: ChannelInstructionBlock[][]) => {
	const optimizedBlocks: ChannelInstructionBlock[][] = Array.from({ length: 4 }, () => []);

	blocksByChannel.forEach((blocks, channel) => {
		let currentBlock: ChannelInstructionBlock | undefined = undefined;
		blocks.forEach(nextBlock => {
			if (currentBlock) {
				if (currentBlock.startMs + currentBlock.length === nextBlock.startMs && currentBlock.intensity === nextBlock.intensity) {
					const block: ChannelInstructionBlock = {
						...currentBlock,
						length: currentBlock.length + nextBlock.length,
						ends: nextBlock.ends
					};
					currentBlock = block;
				} else {
					optimizedBlocks[channel].push(currentBlock);
					currentBlock = nextBlock;
				}
			} else {
				currentBlock = nextBlock;
			}
		});

		if (currentBlock) {
			optimizedBlocks[channel].push(currentBlock);
		}
	});

	return optimizedBlocks;
}

export const mergeTactons = (...tactons: TactonInstruction[][]) => {
	let mergedBlocksByChannel: ChannelInstructionBlock[][] = Array.from({ length: 4 }, () => []);

	tactons.forEach(instructions => {
		const blocksByChannel: ChannelInstructionBlock[][] = Array.from({ length: 4 }, () => []);

		// Convert instructions to ChannelInstructionBlocks
		const currentBlocksByChannel: (ChannelInstructionBlock | undefined)[] = [];
		let currentTime = 0;
		for (const instruction of instructions) {
			if (isInstructionSetParameter(instruction)) {
				const i = instruction as InstructionSetParameter
				i.setParameter.channels.forEach((channel, index: number) => {
					const currentBlock = currentBlocksByChannel[channel];

					if (currentBlock && i.setParameter.intensity === 0) {
						currentBlock.ends = true;
					}

					if (currentBlock) {
						blocksByChannel[channel].push(currentBlock);
						currentBlocksByChannel[channel] = undefined;
					}
					
					if (i.setParameter.intensity > 0) {
						currentBlocksByChannel[channel] = { 
							startMs: currentTime,
							length: 0,
							intensity: i.setParameter.intensity,
							channelId: channel,
							ends: false,
							uuid: i.setParameter.uuids[index] ?? uuidv4(),
							groupUuid: i.setParameter.groupUuids[index] ?? undefined
						};
					}
				});
			} else
				if (isInstructionWait(instruction)) {
					const i = instruction as InstructionWait
					currentBlocksByChannel.forEach((block) => {
						if (block) {
							block.length += i.wait.miliseconds
						}
					})
					currentTime += i.wait.miliseconds;
				}
		}

		// console.log({ blocksByChannel: JSON.parse(JSON.stringify(blocksByChannel)) });

		// Merge blocks with already existing merged blocks from upper layers
		const newMergedBlocksByChannel: ChannelInstructionBlock[][] = Array.from({ length: 4 }, () => []);
		blocksByChannel.forEach((blocks, channel) => {
			const mergedBlocks = mergedBlocksByChannel[channel];
			let mergedBlockIndex = 0;
			let blockIndex = 0;

			while (blockIndex < blocks.length || mergedBlockIndex < mergedBlocks.length) {
				const mergedBlock = mergedBlocks[mergedBlockIndex];
				const block = blocks[blockIndex];

				if (!mergedBlock) {
					newMergedBlocksByChannel[channel].push(block);
					blockIndex++;
				} else
					if (!block) {
						newMergedBlocksByChannel[channel].push(mergedBlock);
						mergedBlockIndex++;
					} else
						if (block.startMs + block.length < mergedBlock.startMs) {
							// block is before merged block so safe to merge, but dont merge mergedBlock yet
							newMergedBlocksByChannel[channel].push(block);
							blockIndex++;
						} else {
							// if the block starts before the merged block, add a "before block"
							if (block.startMs < mergedBlock.startMs) {
								newMergedBlocksByChannel[channel].push({
									startMs: block.startMs,
									length: mergedBlock.startMs - block.startMs,
									channelId: channel,
									intensity: block.intensity,
									ends: false,
									uuid: block.uuid,
									groupUuid: block.groupUuid
								})
							}

							// block ends after merged block, so add merged block and make sure that block starts after merged block
							if (block.startMs + block.length > mergedBlock.startMs + mergedBlock.length) {
								// block starts before merged block, so adjust its start time and length
								if (block.startMs <= mergedBlock.startMs + mergedBlock.length) {
									block.length = block.startMs + block.length - mergedBlock.startMs - mergedBlock.length;
									block.startMs = mergedBlock.startMs + mergedBlock.length;
								}

								newMergedBlocksByChannel[channel].push(mergedBlock)
								mergedBlockIndex++;
							} else {
								// block ends in merged block, so skip it
								blockIndex++;
							}
						}
			}
		});

		mergedBlocksByChannel = newMergedBlocksByChannel;
		// console.log({ mergedBlocksByChannel: JSON.parse(JSON.stringify(mergedBlocksByChannel)) });
	})

	// Optimize blocks per channel by merging two neighboured blocks with same intensity into one block
	const optimizedBlocksByChannel = optimizeBlocksByChannel(mergedBlocksByChannel);
	// console.log({ optimizedBlocksByChannel: JSON.parse(JSON.stringify(optimizedBlocksByChannel)) });

	// Brings blocks into one sorted timeline over all channels
	const mergedBlocks = optimizedBlocksByChannel.flatMap(list => list).sort((a, b) => a.startMs - b.startMs);

	// Transform blocks into instruction format
	const instructions: TactonInstruction[] = [];
	const channelEndInfo: Array<{ 
		time: number;
		uuid: string;
		groupUuid?: string
	} | undefined> = Array.from({ length: optimizedBlocksByChannel.length }, () => undefined);
	let lastInstructionAt: number = 0;
	const addEndInstruction = (time: number, channel: number, uuid: string, groupUuid?: string) => {
		if (time - lastInstructionAt > 0) {
			instructions.push({ wait: { miliseconds: time - lastInstructionAt } });
		}
		instructions.push({ 
			setParameter: { 
				channels: [channel], 
				intensity: 0, 
				uuids: [uuid], 
				groupUuids: [groupUuid ?? null] 
			} 
		});
		lastInstructionAt = time;
		channelEndInfo[channel] = undefined;
	}

	mergedBlocks.forEach((block) => {
		// For all channels that ended in the past, push the wait time until the end and the end instruction
		for (let ch = 0; ch < channelEndInfo.length; ch++) {
			const info = channelEndInfo[ch];
			if (info && info.time <= block.startMs && info.time > lastInstructionAt) {
				addEndInstruction(info.time, ch, info.uuid, info.groupUuid);
			} else if (info && info.time <= block.startMs && info.time <= lastInstructionAt) {
				channelEndInfo[ch] = undefined;
			}
		}

		// if there is a gap between the current instruction and the next instruction, we want to push a wait instruction
		if (block.startMs > lastInstructionAt) {
			instructions.push({ wait: { miliseconds: block.startMs - lastInstructionAt } });
			lastInstructionAt = block.startMs;
		}

		// now merge the current instruction block
		instructions.push({
			setParameter: {
				intensity: block.intensity,
				channels: [block.channelId],
				uuids: [block.uuid],
				groupUuids: [block.groupUuid ?? null]
			}
		})

		lastInstructionAt = block.startMs;

		if (block.ends) {
			channelEndInfo[block.channelId] = {
				time: block.startMs + block.length,
				uuid: block.uuid,
				groupUuid: block.groupUuid
			}
		} else {
			channelEndInfo[block.channelId] = undefined;
		}
	})

	const remainingEnds = channelEndInfo
		.map((info, ch) => info ? { channel: ch, ...info } : undefined)
		.filter(Boolean) as { channel: number; time: number; uuid: string; groupUuid?: string }[];

	remainingEnds.sort((a, b) => a.time - b.time);
	remainingEnds.forEach(end => {
		if (end.time > lastInstructionAt) {
			instructions.push({ wait: { miliseconds: end.time - lastInstructionAt } });
		}
		instructions.push({
			setParameter: {
				channels: [end.channel],
				intensity: 0,
				uuids: [end.uuid],
				groupUuids: [end.groupUuid ?? null]
			}
		});
		lastInstructionAt = end.time;
	});

	// console.log({ instructions })

	// Optimize instructions to merge set parameter instructions that occur at the same time with the same intensity
	const optimizedInstructions: TactonInstruction[] = [];
	let currentInstruction: InstructionSetParameter | undefined = undefined;
	instructions.forEach(nextInstruction => {
		if (isInstructionSetParameter(nextInstruction)) {
			const ni = nextInstruction as InstructionSetParameter
			if (currentInstruction) {
				if (currentInstruction.setParameter.intensity === ni.setParameter.intensity) {
					currentInstruction = {
						setParameter: {
							channels: [...new Set([...currentInstruction.setParameter.channels, ...ni.setParameter.channels])],
							intensity: currentInstruction.setParameter.intensity,
							uuids: [...currentInstruction.setParameter.uuids, ...ni.setParameter.uuids],
							groupUuids: [null]
						}
					};
				} else {
					optimizedInstructions.push(currentInstruction);
					currentInstruction = ni;
				}
			} else {
				currentInstruction = ni;
			}
		} else {
			if (currentInstruction) {
				optimizedInstructions.push(currentInstruction);
				currentInstruction = undefined;
			}
			optimizedInstructions.push(nextInstruction);
		}
	})

	if (currentInstruction) {
		optimizedInstructions.push(currentInstruction);
	}

	// console.log({ optimizedInstructions })

	return optimizedInstructions;
}

