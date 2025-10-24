// Replace with your signaling server's address
const SIGNALING_SERVER_URL = 'ws://localhost:3000';

// UI Elements
const homeScreen = document.getElementById('home-screen');
const cameraScreen = document.getElementById('camera-screen');
const monitorScreen = document.getElementById('monitor-screen');

// Buttons
const startCameraBtn = document.getElementById('start-camera');
const startMonitorBtn = document.getElementById('start-monitor');
const stopCameraBtn = document.getElementById('stop-camera');
const scanQrBtn = document.getElementById('scan-qr');
const disconnectBtn = document.getElementById('disconnect');

// Video Elements
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');

// QR Code Elements
const qrCodeContainer = document.getElementById('qr-code');
const qrScannerContainer = document.getElementById('qr-scanner');

let localStream;
let peerConnection;
let websocket;
let html5QrCode;

const stunServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

// Event Listeners
startCameraBtn.onclick = startAsCamera;
startMonitorBtn.onclick = startAsMonitor;
stopCameraBtn.onclick = stopConnection;
scanQrBtn.onclick = () => {
    qrScannerContainer.style.display = 'block';
    startQrScanner();
};
disconnectBtn.onclick = stopConnection;

function showScreen(screen) {
    homeScreen.style.display = 'none';
    cameraScreen.style.display = 'none';
    monitorScreen.style.display = 'none';
    screen.style.display = 'block';
}

async function startAsCamera() {
    showScreen(cameraScreen);
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    const roomId = Math.floor(100000 + Math.random() * 900000).toString();
    setupWebSocket(roomId, true);

    const monitorUrl = `${window.location.href.split('?')[0]}?room=${roomId}`;
    new QRCode(qrCodeContainer, {
        text: monitorUrl,
        width: 256,
        height: 256
    });
}

function startAsMonitor() {
    showScreen(monitorScreen);
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');

    if (roomId) {
        scanQrBtn.style.display = 'none';
        setupWebSocket(roomId, false);
    }
}

function startQrScanner() {
    html5QrCode = new Html5Qrcode("qr-scanner");
    html5QrCode.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        (decodedText, decodedResult) => {
            html5QrCode.stop();
            window.location.href = decodedText;
        },
        (errorMessage) => { /* handle error */ }
    ).catch((err) => {
        console.error("QR Scanner Error:", err);
    });
}

function setupWebSocket(roomId, isCamera) {
    websocket = new WebSocket(SIGNALING_SERVER_URL);

    websocket.onopen = () => {
        websocket.send(JSON.stringify({ type: 'join', roomId }));
    };

    websocket.onmessage = async (message) => {
        const data = JSON.parse(message.data);
        switch (data.type) {
            case 'monitor-joined':
                if (isCamera) createPeerConnectionAndOffer(roomId);
                break;
            case 'offer':
                if (!isCamera) handleOffer(data.offer, roomId);
                break;

            case 'answer':
                if (isCamera) handleAnswer(data.answer);
                break;
            case 'ice-candidate':
                handleIceCandidate(data.candidate);
                break;
        }
    };
}

function createPeerConnection(roomId) {
    peerConnection = new RTCPeerConnection(stunServers);
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            websocket.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate, roomId }));
        }
    };
    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
        disconnectBtn.style.display = 'block';
    };
    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }
}

async function createPeerConnectionAndOffer(roomId) {
    createPeerConnection(roomId);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    websocket.send(JSON.stringify({ type: 'offer', offer, roomId }));
}

async function handleOffer(offer, roomId) {
    createPeerConnection(roomId);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    websocket.send(JSON.stringify({ type: 'answer', answer, roomId }));
}

async function handleAnswer(answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

async function handleIceCandidate(candidate) {
    if (peerConnection && candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
}

function stopConnection() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
        peerConnection.close();
    }
    if (websocket) {
        websocket.close();
    }
    if (html5QrCode) {
        html5QrCode.stop().catch(err => {});
    }
    window.location.href = window.location.href.split('?')[0];
}
