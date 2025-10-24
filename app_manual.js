const servers = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] };

// Panels
const cameraPanel = document.getElementById('camera-panel');
const monitorPanel = document.getElementById('monitor-panel');

// Show buttons
const showCameraBtn = document.getElementById('show-camera');
const showMonitorBtn = document.getElementById('show-monitor');

// Camera side elements
const startCameraBtn = document.getElementById('start-camera');
const offerSDPTextarea = document.getElementById('offer-sdp');
const offerCandidatesTextarea = document.getElementById('offer-candidates');
const answerSDPTextarea = document.getElementById('answer-sdp');
const answerCandidatesTextarea = document.getElementById('answer-candidates');
const completeConnectionBtn = document.getElementById('complete-connection');
const localVideo = document.getElementById('local-video');

// Monitor side elements
const monitorOfferTextarea = document.getElementById('monitor-offer');
const monitorOfferCandidatesTextarea = document.getElementById('monitor-offer-candidates');
const createAnswerBtn = document.getElementById('create-answer');
const monitorAnswerTextarea = document.getElementById('monitor-answer');
const monitorAnswerCandidatesTextarea = document.getElementById('monitor-answer-candidates');
const remoteVideo = document.getElementById('remote-video');

let peerConnection;
let localStream;
let remoteStream;

showCameraBtn.onclick = () => {
  monitorPanel.style.display = 'none';
  cameraPanel.style.display = 'block';
};

showMonitorBtn.onclick = () => {
  cameraPanel.style.display = 'none';
  monitorPanel.style.display = 'block';
};

// Utility function to stringify ICE candidates array for textarea
function candidatesToString(candidates) {
  return candidates.map(c => JSON.stringify(c)).join('\n');
}

// Parse multiple ICE candidates lines
function stringToCandidates(str) {
  return str.split('\n').map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null; // Skip invalid lines
    }
  }).filter(c => c);
}

// Camera side: start stream and create offer
startCameraBtn.onclick = async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    peerConnection = new RTCPeerConnection(servers);

    const localCandidates = [];
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        localCandidates.push(event.candidate);
        offerCandidatesTextarea.value = candidatesToString(localCandidates);
      }
    };

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    offerSDPTextarea.value = JSON.stringify(peerConnection.localDescription);
  } catch (err) {
    alert('Error starting camera or creating offer: ' + err.message);
  }
};

// Camera side: complete connection by applying answer and answer ICE candidates
completeConnectionBtn.onclick = async () => {
  try {
    const answerText = answerSDPTextarea.value.trim();
    const answerCandidatesText = answerCandidatesTextarea.value.trim();

    if (!answerText) return alert('Paste the SDP Answer from monitor.');

    const answerDesc = JSON.parse(answerText);
    if (!answerDesc.type || !answerDesc.sdp) return alert('Invalid SDP Answer.');

    await peerConnection.setRemoteDescription(answerDesc);

    if (answerCandidatesText) {
      const candidates = stringToCandidates(answerCandidatesText);
      for (const candidate of candidates) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    }

    alert('Connection complete! Streaming should start shortly.');
  } catch (e) {
    alert('Error applying answer or ICE candidates: ' + e.message);
  }
};

// Monitor side: create answer after receiving offer and offer ICE candidates
createAnswerBtn.onclick = async () => {
  try {
    const offerText = monitorOfferTextarea.value.trim();
    const offerCandidatesText = monitorOfferCandidatesTextarea.value.trim();

    if (!offerText) return alert('Paste the SDP Offer from camera.');

    const offerDesc = JSON.parse(offerText);
    if (!offerDesc.type || !offerDesc.sdp) return alert('Invalid SDP Offer.');

    peerConnection = new RTCPeerConnection(servers);

    remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;

    peerConnection.ontrack = event => {
      remoteStream.addTrack(event.track);
    };

    const remoteCandidates = [];
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        remoteCandidates.push(event.candidate);
        monitorAnswerCandidatesTextarea.value = candidatesToString(remoteCandidates);
      }
    };

    if (offerCandidatesText) {
      const candidates = stringToCandidates(offerCandidatesText);
      for (const candidate of candidates) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    }

    await peerConnection.setRemoteDescription(offerDesc);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    monitorAnswerTextarea.value = JSON.stringify(peerConnection.localDescription);
    alert('Answer created! Send the SDP and candidates back to camera device.');
  } catch (e) {
    alert('Error creating answer: ' + e.message);
  }
};
