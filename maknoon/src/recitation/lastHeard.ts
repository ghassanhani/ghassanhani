/**
 * What the recitation check heard in the last listening (kept in memory only, gone when the app
 * closes; never stored or sent): shown in Settings so a reciter can see why a word was or was not
 * marked. `judged`: the finished phrases slips are judged on; `second`: the second reading of the
 * same phrases; `live`: the phone's own recognizer (moves the reveal only).
 */
export const lastHeard = { all: '', judged: '', second: '', live: '', slips: '' };
