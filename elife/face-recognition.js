const fs = require('fs')
const video = document.getElementById('video')
const faceapi = require("face-api.js");
const path = require("path");
const { ipcRenderer } = require('electron');
const remote = require('electron').remote
var Path = require('path');
const { electron } = require('process');
const u = require('@elife/utils');
let loginUserName;

// load the models
function openWebcam(){
  let resourcePath=unpackedAsarPath()
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromDisk(resourcePath),
  faceapi.nets.faceLandmark68Net.loadFromDisk(resourcePath),
  faceapi.nets.faceRecognitionNet.loadFromDisk(resourcePath),
  faceapi.nets.ssdMobilenetv1.loadFromDisk(resourcePath)
  ]).then(startVideo)
  // document.getElementById('scan').innerHTML='Everlife is scaning your face'

  faceapi.env.monkeyPatch({
    Canvas: HTMLCanvasElement,
    Image: HTMLImageElement,
    ImageData: ImageData,
    Video: HTMLVideoElement,
    createCanvasElement: () => document.createElement('canvas'),
    createImageElement: () => document.createElement('img')
  })

  function startVideo() {
    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(function (stream) {
          video.srcObject = stream;
        })
        .catch(function (err0r) {
          console.log("Something went wrong!");
        });
    }
  }

  video.addEventListener('play', async () => {
  //create the canvas from video element as we have created above
  const canvas = faceapi.createCanvasFromMedia(video)
  //append canvas to body
  document.body.append(canvas)
  // displaySize will help us to match the dimension with video screen and accordingly it will draw our detections
  // on the streaming video screen
  const displaySize = { width: video.width, height: video.height }
  faceapi.matchDimensions(canvas, displaySize)
  const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();

  const resizedDetections = faceapi.resizeResults(detections, displaySize)
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  const labeledFaceDescriptors  = await loadEverProfiles()
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6)
  const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor))
  results.forEach((result, i) => {
    const box = resizedDetections[i].detection.box
      const drawBox = new faceapi.draw.DrawBox(box, {label: result.label.toString()})
   loginUserName = result.label.toString()

      if(loginUserName =='unknown'){
      let data="enter password"
      ipcRenderer.send('login',data)
       var window = remote.getCurrentWindow()
       window.close()


    }else{
      let winData = 'Go to main Window'
      ipcRenderer.send('main-window', winData )
      var window = remote.getCurrentWindow()
       window.close()
    }
  })
  })
  const directoryPath = u.faceImgLoc()

  const files = fs.readdirSync(directoryPath)
  const imageFiles=fs.readdirSync(directoryPath+'/')

  function loadEverProfiles() {

    const labels = files
    return Promise.all(
      labels.map(async label => {
        const descriptions = []
        for (let i = 0; i <files.length; i++) {
          const img = await faceapi.fetchImage(directoryPath +'/'+imageFiles[i])
          const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
          descriptions.push(detections.descriptor)
        }

        return new faceapi.LabeledFaceDescriptors(label, descriptions)
      })
    )
  }

}

function unpackedAsarPath() {
  let p = path.join(__dirname,'..','./models' )
  if (p.includes('/app.asar/') ||
      p.includes('\\app.asar\\')) {
        p = p.replace('app.asar','app.asar.unpacked')
  }
  return p
}

