/**
 * What the API client is doing, for the app's own feedback: how many requests are in flight (the
 * top progress bar) and "something was saved" (so the screens reload their data by themselves).
 */

type Listener = () => void;

let inFlight = 0;
const busyListeners = new Set<Listener>();
const savedListeners = new Set<Listener>();

export const activity = {
  started() {
    inFlight++;
    busyListeners.forEach((l) => l());
  },
  finished() {
    inFlight = Math.max(0, inFlight - 1);
    busyListeners.forEach((l) => l());
  },
  saved() {
    savedListeners.forEach((l) => l());
  },
  busy: () => inFlight > 0,
  onBusyChange(l: Listener) {
    busyListeners.add(l);
    return () => void busyListeners.delete(l);
  },
  onSaved(l: Listener) {
    savedListeners.add(l);
    return () => void savedListeners.delete(l);
  },
};
