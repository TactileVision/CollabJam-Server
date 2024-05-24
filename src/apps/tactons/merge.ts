import { InstructionSetParameter, InstructionWait, TactonInstruction, isInstructionSetParameter, isInstructionWait } from "@sharedTypes/tactonTypes";
interface ChannelInstructionBlock {
	startMs: number,
	length: number,
	intensity: number,
	channelId: number,
	ends: boolean
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
				i.setParameter.channels.forEach(channel => {
					const currentBlock = currentBlocksByChannel[channel];

					if (currentBlock && i.setParameter.intensity === 0) {
						currentBlock.ends = true;
					}

					if (currentBlock) {
						blocksByChannel[channel].push(currentBlock);
						currentBlocksByChannel[channel] = undefined;
					}

					if (i.setParameter.intensity > 0) {
						currentBlocksByChannel[channel] = { startMs: currentTime, length: 0, intensity: i.setParameter.intensity, channelId: channel, ends: false };
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

		console.log({ blocksByChannel: JSON.parse(JSON.stringify(blocksByChannel)) });

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
									ends: false
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
		console.log({ mergedBlocksByChannel: JSON.parse(JSON.stringify(mergedBlocksByChannel)) });
	})

	// Optimize blocks per channel by merging two neighboured blocks with same intensity into one block
	const optimizedBlocksByChannel = optimizeBlocksByChannel(mergedBlocksByChannel);
	console.log({ optimizedBlocksByChannel: JSON.parse(JSON.stringify(optimizedBlocksByChannel)) });

	// Brings blocks into one sorted timeline over all channels
	const mergedBlocks = optimizedBlocksByChannel.flatMap(list => list).sort((a, b) => a.startMs - b.startMs);

	// Transform blocks into instruction format
	const instructions: TactonInstruction[] = [];
	const channelNeedsEndAt: (number | undefined)[] = [];
	let lastInstructionAt = 0;

	const addEndInstruction = (time: number, channel: number) => {
		if (time - lastInstructionAt > 0) {
			instructions.push({ wait: { miliseconds: time - lastInstructionAt } });
		}
		instructions.push({ setParameter: { channels: [channel], intensity: 0 } });
		lastInstructionAt = time;
		channelNeedsEndAt[channel] = undefined;
	}

	mergedBlocks.forEach((block) => {
		// For all channels that ended in the past, push the wait time until the end and the end instruction
		const channelsEnd = channelNeedsEndAt.map((time, channel) => [time, channel]).sort((a, b) => (a[0] || 0) - (b[0] || 0));
		channelsEnd.forEach(([time, channel]) => {
			if (time !== undefined && channel !== undefined) {
				if (time < block.startMs) {
					addEndInstruction(time, channel);
				}
			}
		})

		// if there is a gap between the current instruction and the next instruction, we want to push a wait instruction
		if (block.startMs > lastInstructionAt) {
			instructions.push({ wait: { miliseconds: block.startMs - lastInstructionAt } });
		}

		// now merge the current instruction block
		instructions.push({
			setParameter: {
				intensity: block.intensity,
				channels: [block.channelId]
			}
		})

		lastInstructionAt = block.startMs;

		if (block.ends) {
			channelNeedsEndAt[block.channelId] = block.startMs + block.length;
		} else {
			channelNeedsEndAt[block.channelId] = undefined;
		}
	})

	const channelsEnd = channelNeedsEndAt.map((time, channel) => [time, channel]).sort((a, b) => (a[0] || 0) - (b[0] || 0));
	channelsEnd.forEach(([time, channel]) => {
		if (time !== undefined && channel !== undefined) {
			addEndInstruction(time, channel);
		}
	});

	console.log({ instructions })

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
							intensity: currentInstruction.setParameter.intensity
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

	console.log({ optimizedInstructions })

	return optimizedInstructions;
}

