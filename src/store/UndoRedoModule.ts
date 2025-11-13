import { TactonInstruction} from "@sharedTypes/tactonTypes";
import {Logger} from "../util/Logger";

interface TactonState {
    instructions: TactonInstruction[];
}

const trackedTactons: Map<string, {
    history: TactonState[];
    pointer: number;
}> = new Map();

// maximal number of tracked changes
const MAX_HISTORY = 10;

function clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Starts tracking a new Tacton.
 * If already present, nothing happens.
 */
const startTrackingChanges = (tactonId: string, initialState: TactonInstruction[]): void => {
    if (trackedTactons.has(tactonId)) return;
    trackedTactons.set(tactonId, {
        history: [clone({instructions: initialState})],
        pointer: 0,
    });
}

/**
 * Adds a new state (replaces previous state),
 * older versions remain available for undo.
 */
const updateTacton = (tactonId: string, newState: TactonInstruction[]): void => {    
    const entry = trackedTactons.get(tactonId)!;
    if (!entry) {
        Logger.error(`Tacton ${tactonId} is not tracked`);
        return undefined;
    }
    entry.history = entry.history.slice(0, entry.pointer + 1);
    entry.history.push(clone({instructions: newState}));

    if (entry.history.length > MAX_HISTORY) {
        entry.history.shift();
    } else {
        entry.pointer++;
    }
}

/**
 * Undoes the last state and returns it
 */
const undoAction = (tactonId: string): TactonInstruction[] | undefined => {
    const entry = trackedTactons.get(tactonId);
    if (!entry) {
        Logger.error(`Tacton ${tactonId} is not tracked`);
        return undefined;
    }

    if (entry.pointer <= 0) return clone(entry.history[entry.pointer]).instructions;
    entry.pointer--;
    return clone(entry.history[entry.pointer]).instructions;
}

/**
 * Repeats the last undone action and restores it
 */
const redoAction = (tactonId: string): TactonInstruction[] | undefined => {
    const entry = trackedTactons.get(tactonId);
    if (!entry) {
        Logger.error(`Tacton ${tactonId} is not tracked`);
        return undefined;
    }

    if (entry.pointer >= entry.history.length - 1)
        return clone(entry.history[entry.pointer]).instructions;

    entry.pointer++;
    return clone(entry.history[entry.pointer]).instructions;
}


/**
 * Deletes tracked changes from tacton
 */
const untrackTacton = (tactonId: string): void => {
    trackedTactons.delete(tactonId);
    Logger.info(`Stop tracking changes for tacton ${tactonId}`);
}

export default {
    startTrackingChanges,
    updateTacton,
    undoAction,
    redoAction,
    untrackTacton
}