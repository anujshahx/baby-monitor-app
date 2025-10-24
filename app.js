// baby-monitor serverless signaling with manual QR code exchange
const startCameraBtn = document.getElementById('start-camera');
const startMonitorBtn = document.getElementById('start-monitor');
const cameraScreen = document.getElementById('camera-screen');
const homeScreen = document.getElementById('home-screen');
const monitorScreen = document.getElementById('monitor-screen');

const qrCodeContainer = document.getElementById('qr-code');
const qrScanner = document.getElementById('qr-scanner');
const scanAnswerBtn = document.getElementById('scan-answer');
const restartCameraBtn = document.getElementById('restart-camera');
const localVideo = document.getElementById('local-video');
const status = document.getElementById('status');

const scanOfferBtn = document.getElementById('scan-offer');
const qrScannerMonitor = document.getElementById('qr-scanner-monitor');
const answerQrContainer = document.getElementById('answer-qr-code');
const remoteVideo = document.getElementById('remote-video');
const statusMonitor = document.getElementById('status-monitor');
const restartMonitorBtn = document.getElementById('restart-monitor');

let peerConnection;
let localStream;
let remoteStream;
let html5QrCode;

const servers = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] };

function show(screen) {
  homeScreen.style.display = 'none';
  cameraScreen.style.display = 'none';
  monitorScreen.style.display = 'none';
  screen.style.display = 'block';
}

startCameraBtn.onclick = async () => {
  show(cameraScreen);
  status.textContent = 'Starting camera...';

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    peerConnection = new RTCPeerConnection(servers);

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        // ICE candidate exchange omitted for simplicity
      }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    qrCodeContainer.innerHTML = '';
    new QRCode(qrCodeContainer, {
      text: JSON.stringify(offer),
      width: 250,
      height: 250
    });

    status.textContent = 'Scan this QR code from the monitor phone to connect.';
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
  }
};

scanAnswerBtn.onclick = () => {
  qrScanner.style.display = 'block';
  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode('qr-scanner');
  }
  html5QrCode.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: 250 },
    async decodedText => {
      try {
        const answer = JSON.parse(decodedText);
        await peerConnection.setRemoteDescription(answer);
        status.textContent = 'Connected! Streaming baby video now.';
        qrScanner.style.display = 'none';
        html5QrCode.stop();
      } catch (err) {
        status.textContent = 'Invalid QR Code scanned.';
      }
    },
    errorMessage => {}
  );
};

restartCameraBtn.onclick = () => {
  if (html5QrCode) html5QrCode.stop();
  if (peerConnection) peerConnection.close();
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  qrCodeContainer.innerHTML = '';
  status.textContent = '';
  show(homeScreen);
};

startMonitorBtn.onclick = () => {
  show(monitorScreen);
  statusMonitor.textContent = 'Step 1: Scan offer QR from Camera.';
};

scanOfferBtn.onclick = () => {
  qrScannerMonitor.style.display = 'block';
  if (!html5QrCode) {
    html5QrCode = new Html5QrCode('qr-scanner-monitor');
  }
  html5QrCode.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: 250 },
    async decodedText => {
      qrScannerMonitor.style.display = 'none';
      html5QrCode.stop();
      let offer;
      try {
        offer = JSON.parse(decodedText);
      } catch {
        statusMonitor.textContent = 'Invalid QR received.';
        return;
      }
      peerConnection = new RTCPeerConnection(servers);
      peerConnection.ontrack = e => {
        if (!remoteStream) {
          remoteStream = new MediaStream();
          remoteVideo.srcObject = remoteStream;
        }
        remoteStream.addTrack(e.track);
      };
      peerConnection.onicecandidate = () => {};
      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      answerQrContainer.innerHTML = '';
      new QRCode(answerQrContainer, {
        text: JSON.stringify(answer),
        width: 250,
        height: 250
      });

      statusMonitor.textContent = 'Step 2: Scan this answer QR code on the Camera phone.';
    },
    errorMessage => {}
  );
};

restartMonitorBtn.onclick = () => {
  if (html5QrCode) html5QrCode.stop();
  if (peerConnection) peerConnection.close();
  remoteVideo.srcObject = null;
  remoteStream = null;
  answerQrContainer.innerHTML = '';
  statusMonitor.textContent = '';
  show(homeScreen);
};

show(homeScreen);
