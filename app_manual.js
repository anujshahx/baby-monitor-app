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
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    peerConnection = new RTCPeerConnection(servers);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = () => {
      // ICE candidate handling omitted for simplicity
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    offerTextarea.value = JSON.stringify(peerConnection.localDescription);
  } catch (err) {
    alert('Error accessing camera/microphone or creating offer: ' + err.message);
  }
};

completeConnectionBtn.onclick = async () => {
  try {
    const answerText = answerTextarea.value.trim();
    if (!answerText) {
      alert('Please paste the SDP Answer first.');
      return;
    }
    const answer = JSON.parse(answerText);
    if (!answer.type || !answer.sdp) {
      alert('Invalid SDP Answer format.');
      return;
    }
    await peerConnection.setRemoteDescription(answer);
    alert('Connection complete! You should see the stream.');
  } catch (e) {
    alert('Invalid JSON in SDP Answer: ' + e.message);
  }
};

createAnswerBtn.onclick = async () => {
  try {
    const offerText = monitorOfferTextarea.value.trim();
    if (!offerText) {
      alert('Please paste the SDP Offer first.');
      return;
    }
    const offer = JSON.parse(offerText);
    if (!offer.type || !offer.sdp) {
      alert('Invalid SDP Offer format.');
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

    peerConnection.onicecandidate = () => {
      // ICE candidate handling omitted for simplicity
    };

    await peerConnection.setRemoteDescription(offer);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    monitorAnswerTextarea.value = JSON.stringify(peerConnection.localDescription);
  } catch (e) {
    alert('Error creating answer: ' + e.message);
  }
};
