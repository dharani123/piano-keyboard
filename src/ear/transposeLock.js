// Ear exercises judge what you hear, so transpose is held at 0 while any of
// them is running; the player's own setting comes back when they finish.
export const effectiveTranspose = (transpose, locks) => (locks > 0 ? 0 : transpose);
