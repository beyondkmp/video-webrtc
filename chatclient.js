var localVideo;
var localStream;
var remoteVideo;
var peerConnection;
var uuid;
var serverConnection;

var peerConnectionConfig = {
  'iceServers': [
    { 'urls': 'stun:stun.szfjg.cf:5349' },
    {
      'urls': 'turn:turn.szfjg.cf:5349',
      'username': 'beyondkmp',
      'credential': 'fpll123'
    }
  ]
};

function connect_socket() {
  serverConnection = new WebSocket('wss://' + window.location.hostname + '/xxxxxyyyyy');
  serverConnection.onopen = () => { start(true) };
  serverConnection.onmessage = gotMessageFromServer;
  serverConnection.onclose = connect_socket; // <- rise from your grave!
  heartbeat();
}

function heartbeat() {
  if (!serverConnection) return;
  if (serverConnection.readyState !== 1) return;
  serverConnection.send("heartbeat");
  setTimeout(heartbeat, 500);
}


function pageReady() {
  uuid = createUUID();

  localVideo = document.getElementById('localVideo');
  remoteVideo = document.getElementById('remoteVideo');

  connect_socket();

  var constraints = {
    video: true,
    audio: true,
  };

  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
  } else {
    alert('Your browser does not support getUserMedia API');
  }
}

function sendToServer(data) {
  try {
    if (serverConnection.readyState === WebSocket.CLOSING || serverConnection.readyState === WebSocket.CLOSED) {
      console.error("webSocket is not open: " + serverConnection.readyState);
      return
    }
    serverConnection.send(JSON.stringify(data));
  } catch (error) {
    console.log('websocket disconnected:', error);
  }
}

function getUserMediaSuccess(stream) {
  localStream = stream;
  localVideo.srcObject = stream;
}

function start(isCaller) {
  if (peerConnection) {
    switch (peerConnection.iceConnectionState) {
      case "closed":
      case "disconnected":
      case "failed":
        closeVideoCall();
        return;
    }
    console.log("there is already a peerConnection");
    return
  }


  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  peerConnection.onicecandidate = gotIceCandidate;
  peerConnection.ontrack = gotRemoteStream;
  peerConnection.onconnectionstatechange = handleICEConnectionStateChangeEvent
  localStream.getTracks().forEach(function (track) {
    peerConnection.addTrack(track, localStream);
  });

  if (isCaller) {
    peerConnection.createOffer().then(createdDescription).catch(errorHandler);
  }
}

function handleICEConnectionStateChangeEvent(event) {
  // if (peerConnection.iceConnectionState === "failed") {
  //   /* possibly reconfigure the connection in some way here */
  //   /* then request ICE restart */
  //   peerConnection.restartIce();
  //   return;
  // }

  console.log('iceConnectionState:', peerConnection.iceConnectionState);
  switch (peerConnection.iceConnectionState) {
    case "closed":
    case "disconnected":
    case "failed":
      closeVideoCall();
      break;
  }
}

function closeVideoCall() {
  console.log("closeVideoCall");
  if (!peerConnection) return;
  peerConnection.close();
  peerConnection = null;
}

function gotMessageFromServer(message) {
  if (!peerConnection) start(false);

  var signal = JSON.parse(message.data);

  // Ignore messages from ourself
  if (signal.uuid == uuid) return;

  if (signal.sdp) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function () {
      // Only create answers in response to offers
      if (signal.sdp.type == 'offer') {
        peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
      }
    }).catch(errorHandler);
  } else if (signal.ice) {
    peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
  }
}

function gotIceCandidate(event) {
  if (event.candidate != null) {
    sendToServer({ 'ice': event.candidate, 'uuid': uuid });
  }
}

function createdDescription(description) {
  console.log('got description');

  peerConnection.setLocalDescription(description).then(function () {
    sendToServer({ 'sdp': peerConnection.localDescription, 'uuid': uuid });
  }).catch(errorHandler);
}

function gotRemoteStream(event) {
  console.log('got remote stream');
  remoteVideo.srcObject = event.streams[0];
}

function errorHandler(error) {
  console.log(error);
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}