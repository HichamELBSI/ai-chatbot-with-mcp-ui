export function postMessageToParent(message: any) {
  // @ts-expect-error - window is not typed correctly
  if (window.parent) {
    // @ts-expect-error - window is not typed correctly
    window.parent.postMessage(message, '*');
  }
}
