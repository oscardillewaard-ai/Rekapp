// Soorten oefeningen. Rekken (statisch, PNF, dynamisch, actief) en, sinds de
// trainingssjablonen (§3.1, §6.3), training: kracht, balans en plyometrie.
// Training telt niet mee in de rekdosis (§6.4.1) en heeft een eigen B- en
// D-rubriek. Puur.

export const TRAINING_TYPES = new Set(['kracht', 'balans', 'plyometrie']);
export const isTraining = (ex) => TRAINING_TYPES.has(ex?.type);

// Waar een trainingsoefening voor is (veld focus), zoals op de tegels.
export const FOCUS_LABELS = { heupen: 'Heupkracht', enkels: 'Enkelstabiliteit' };
