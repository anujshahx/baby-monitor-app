const showCameraBtn = document.getElementById('show-camera');
const showMonitorBtn = document.getElementById('show-monitor');

const cameraPanel = document.getElementById('camera-panel');
const monitorPanel = document.getElementById('monitor-panel');

const startCameraBtn = document.getElementById('start-camera');
const offerTextarea = document.getElementById('offer-sdp');
const answerTextarea = document.getElementById('answer-sdp');
const completeConnectionBtn = document.getElementById('complete-connection');
const localVideo = document.getElementById('local-video');

const monitorOfferTextarea = document.getElementById('monitor-offer');
const createAnswerBtn = document.getElementById('create-answer');
const monitorAnswerTextarea = document.getElementById('monitor-answer');
const remoteVideo = document.getElementById('remote-video');

let localStream;
let peerConnection;
let remoteStream;

const servers = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] };

showCameraBtn.onclick = () => {
  monitorPanel.style.display = 'none';
  cameraPanel.style.display = 'block';
};

showMonitorBtn.onclick = () => {
  cameraPanel.style.display = 'none';
  monitorPanel.style.display = 'block';
};

startCameraBtn.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;

  peerConnection = new RTCPeerConnection(servers);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      // For simplicity ignoring ICE candidate exchange here
    }
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  offerTextarea.value = JSON.stringify(peerConnection.localDescription);
};

completeConnectionBtn.onclick = async () => {
  try {
    const answer = JSON.parse(answerTextarea.value);
    if (!answer || !answer.type || !answer.sdp) {
      alert('Invalid SDP Answer');
      return;
    }
    await peerConnection.setRemoteDescription(answer);
  } catch {
    alert('Invalid JSON in SDP Answer');
  }
};

createAnswerBtn.onclick = async () => {
  try {
    const offer = JSON.parse(monitorOfferTextarea.value);
    if (!offer || !offer.type || !offer.sdp) {
      alert('Invalid SDP Offer');
      return;
    }

    peerConnection = new RTCPeerConnection(servers);

    peerConnection.ontrack = event => {
      if (!remoteStream) {
        remoteStream = new MediaStream();
        remoteVideo.srcObject = remoteStream;
      }
      remoteStream.addTrack(event.track);
    };

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        // ICE candidate handling skipped here
      }
    };

    await peerConnection.setRemoteDescription(offer);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    monitorAnswerTextarea.value = JSON.stringify(peerConnection.localDescription);
  } catch {
    alert('Invalid SDP Offer JSON');
  }
};
