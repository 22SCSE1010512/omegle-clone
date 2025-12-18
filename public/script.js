const socket = io();

const status = document.getElementById("status");
const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const nextBtn = document.getElementById("nextBtn");

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

let localStream;
let peerConnection;

const config = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

// Get camera
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localStream = stream;
        localVideo.srcObject = stream;
    });

// Socket events
socket.on("matched", async () => {
    status.innerText = "Connected to stranger";
    input.disabled = false;

    peerConnection = new RTCPeerConnection(config);

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = e => {
        remoteVideo.srcObject = e.streams[0];
    };

    peerConnection.onicecandidate = e => {
        if (e.candidate) {
            socket.emit("ice", e.candidate);
        }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer);
});

socket.on("offer", async offer => {
    peerConnection = new RTCPeerConnection(config);

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = e => {
        remoteVideo.srcObject = e.streams[0];
    };

    peerConnection.onicecandidate = e => {
        if (e.candidate) {
            socket.emit("ice", e.candidate);
        }
    };

    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", answer);
});

socket.on("answer", answer => {
    peerConnection.setRemoteDescription(answer);
});

socket.on("ice", candidate => {
    peerConnection.addIceCandidate(candidate);
});

socket.on("message", msg => {
    chatBox.innerHTML += `<p><b>Stranger:</b> ${msg}</p>`;
});

socket.on("partnerLeft", () => {
    status.innerText = "Stranger left. Waiting...";
    input.disabled = true;
    remoteVideo.srcObject = null;
    peerConnection && peerConnection.close();
});

// Buttons
sendBtn.onclick = () => {
    if (input.value.trim()) {
        chatBox.innerHTML += `<p><b>You:</b> ${input.value}</p>`;
        socket.emit("message", input.value);
        input.value = "";
    }
};

nextBtn.onclick = () => {
    socket.emit("next");
    chatBox.innerHTML = "";
};
