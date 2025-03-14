import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;

let faceLandmarker;

/*const faceLandmarkerPromise = FilesetResolver.forVisionTasks(
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
).then(resolver => {
  return FaceLandmarker.createFromOptions(resolver, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
    },
    runningMode: 'IMAGE',
    numFaces: 1
  });
});*/

async function createFaceLandmarker() {
    if(!faceLandmarker){
      const filesetResolver = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
        faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                delegate: "GPU"
            },
            outputFaceBlendshapes: true,
            runningMode: "IMAGE",
            numFaces: 1
        });
      }
}
//createFaceLandmarker();

async function getLandmarks(imageElement) {
  //const faceLandmarker = await faceLandmarkerPromise;
  if(!faceLandmarker){
    console.log("Try again");
  }
  const result = faceLandmarker.detect(imageElement);
  return result.faceLandmarks.length > 0 ? result.faceLandmarks[0] : null;
}

function warpFace(ctx, landmarks) {
  if (!landmarks) return;

  // Example of shifting mouth upwards for a subtle smile effect
  const mouthTopIndex = 13;  // Adjust index based on landmark structure
  const mouthBottomIndex = 14;
  
  landmarks[mouthTopIndex].y -= 0.02;
  landmarks[mouthBottomIndex].y += 0.02;
  
  // Further transformations can be added here
}

/*window.addEventListener('load', () => {
  createFaceLandmarker()
    .then(() => console.log('MediaPipe FaceLandmarker initialized'))
    .catch(err => console.error('Initialization error:', err));
});*/

/*window.createFaceLandmarker = createFaceLandmarker;
window.getLandmarks = getLandmarks;
window.warpFace = warpFace;
window.faceLandmarker = faceLandmarker;*/
