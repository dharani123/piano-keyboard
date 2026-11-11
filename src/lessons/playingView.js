// Where to scroll for a Sheet Reading exercise: the keys a little under the top of the
// window, with the voice controls above them and the staff below.
const KEYS_FROM_TOP = 0.23; // share of the window height
const BOTTOM_MARGIN = 16;

// How far to scroll, given where the keys' top and the exercise panel's bottom are on
// screen now. On a short window the panel wins, so the staff is never cut off.
export function playingViewDelta({ keysTop, panelBottom, windowHeight }) {
  const toPlaceKeys = keysTop - windowHeight * KEYS_FROM_TOP;
  const toShowPanel = panelBottom + BOTTOM_MARGIN - windowHeight;
  return Math.round(Math.max(toPlaceKeys, toShowPanel));
}
