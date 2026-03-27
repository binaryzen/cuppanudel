export async function createInputProvider() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);

    return { context, source };
}
