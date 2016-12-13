
var room = $.connection.videoHub;

var pc;
var offerOption =
{
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};

//部署的coturn服务地址
//stun协议只支持交换双方的地址信息，在P2P连接失败时会无法视频通话
//turn协议包含stun功能，并且支持视频流中转，在P2P连接失败时会将该服务器作为中继服务器，保证视频通话
var servers =
{
    'iceServers': [
    { 'url': 'turn:101.200.130.41', 'credential': '06102', 'username': 'big_joe' }
      //{ 'url' : 'stun:stun.l.google.com:19302' },
      //{ 'url' : 'stun:stun.services.mozilla.com' }
    ]
};

var localCam;
var remoteCam;

var remoteDesc;
var remoteCandidates = [];

var callBtn;
var cancelBtn;
var hangupBtn;
var pickupBtn;
var refuseBtn;
var pickupModal;
var hangupModal;


/* -------------------------Hub交互逻辑---------------------- */
/*------------------------------------------------------------*/

//接收对方发送的sdp数据
room.client.receiveDesc = function (descJson) {

    outputBox('receive remote desc');

    var descObj = JSON.parse(descJson);
    remoteDesc = descObj.desc;

    if (remoteDesc.type === 'offer') {
        outputBox('receive offer');
        console.log(remoteDesc);
    }

    if (remoteDesc.type === 'answer') {
        pc.setRemoteDescription(remoteDesc).then(setRemoteDescSuccessHandler, errorHandler);
        outputBox('receive answer');
        console.log(remoteDesc);
    }
}

//接收对方的候选人
room.client.receiveCandidate = function (candidateJson) {
    var candidateObj = JSON.parse(candidateJson);
    remoteCandidates.push(candidateObj.cand);

    console.log('receive candidate');
    //console.log(candidateObj.cand)
    //pc.addIceCandidate(new RTCIceCandidate(candidateObj.cand)).then(addIceCandidateSuccessHandler, errorHandler);
}

//接收广播信息
room.client.receiveMsg = function (msg) {

    outputBox(msg);
}

//关闭连接
room.client.shutDownPC = function () {

    fallBackToOrigin();

    disconnectAndRedirectClient();

}

//弹出模态框提示电话
room.client.receiveCall = function () {
    showPickupModal();
}

//通话成功,显示通话界面
room.client.receiveShowCalling = function () {
    showCalling();
}

//当房间有2个人时启动呼叫
room.client.receiveEnableCallBtn = function () {
    callBtn.disabled = false;
}

//当房间少于2个人时禁用呼叫
room.client.receiveDisableCallBtn = function () {
    callBtn.disabled = true;
}


/* -------------------------用户交互逻辑---------------------- */
/*------------------------------------------------------------*/

function call() {

    pc.createOffer(offerOption).then(createOfferSuccessHandler, errorHandler);
    room.server.sendCall();
    showCallingModal();
    outputBox(' call  started ');
}

function cancelCall() {

    room.server.shutDownConnection();
    outputBox(' call cancelled ');
}

function hangupCall() {

    room.server.shutDownConnection();
    outputBox(' call hung up ');
}

function pickUpCall() {

    pc.setRemoteDescription(remoteDesc).then(setRemoteDescSuccessHandler, errorHandler);
    pc.createAnswer().then(createAnswerSuccessHandler, errorHandler);

    room.server.sendShowCalling();

    outputBox(' call picked up ');
}

function refuseCall() {

    room.server.shutDownConnection();

    outputBox(' call refused ');
}


/* -------------------------初始化---------------------- */
/*------------------------------------------------------------*/

(function init() {
    initElement();
    addListener();
    InitPC();
    getLocalStream();//由于getUserMedia回调较晚，必须在一开始就获得stream，否则createOffer必须创建2次
})();

//初始化所有网页元素
function initElement() {
    localCam = document.getElementById('localCam');
    remoteCam = document.getElementById('remoteCam');

    callBtn = document.getElementById('call_btn');
    hangupBtn = document.getElementById('hangup_btn');
    cancelBtn = document.getElementById('cancel_btn');
    pickupBtn = document.getElementById('pickup_btn');
    refuseBtn = document.getElementById('refuse_btn');

    pickupModal = document.getElementById('pickup_modal');
    hangupModal = document.getElementById('hangup_modal');

    callBtn.disabled = true;
    //window.onbeforeunload = function () { return ''; }
}

//为网页元素添加监听
function addListener() {
    callBtn.addEventListener('click', call);
    hangupBtn.addEventListener('click', hangupCall);
    cancelBtn.addEventListener('click', cancelCall);
    pickupBtn.addEventListener('click', pickUpCall);
    refuseBtn.addEventListener('click', refuseCall);

    //remoteCam.addEventListener('resize', onResizeHandler)
    //window.addEventListener('resize', onResizeHandler)
}

//初始化p2p连接
//必须在本地createOffer前初始化远程的peerconnection
function InitPC() {

    pc = new RTCPeerConnection(servers);
    pc.onicecandidate = onIceCandidateHandler;

    outputBox('peer connection initialized ');
}


/* -------------------------事件回调---------------------- */
/*------------------------------------------------------------*/

function onResizeHandler() {

    console.log('old video width : ' + remoteCam.offsetWidth);
    console.log('old video height : ' + remoteCam.offsetHeight);

    var ratio = remoteCam.videoHeight / remoteCam.videoWidth;

    console.log('video ratio : ' + ratio);

}

//本地摄像头回调程序
function getUserMediaSuccessHandler(stream) {

    pc.onaddstream = addStreamHandler;
    pc.addStream(stream);
    localCam.srcObject = stream;
    outputBox('get local media success');
}

function addStreamHandler(event) {

    remoteCam.srcObject = event.stream;
    outputBox('add remote stream success');
}

//createOffer之后，且候选人可用时触发
function onIceCandidateHandler(event) {

    if (event.candidate !== null) {
        //console.log("candidate hangler : " + event.candidate.candidate);
        room.server.sendCandidate(JSON.stringify({ 'cand': event.candidate }));
    }
}

//添加候选人成功
function addIceCandidateSuccessHandler(candidateIndex) {

    console.log('add candidate ' + candidateIndex + ' success ');
}

//设置本地sdp成功
function setLocalDescSuccessHandler(descJson) {

    room.server.sendDesc(descJson);
    outputBox('set local desc success ');
}

//设置远程sdp成功
function setRemoteDescSuccessHandler() {

    //在setRemoteDescription之后调用，否则会报错dom exception ： error processing ice
    remoteCandidates.forEach(function (curCandidate, index) {
        pc.addIceCandidate(new RTCIceCandidate(curCandidate)).then(function () { addIceCandidateSuccessHandler(index); }, errorHandler);
    });

    outputBox('set remote desc success');
}

//创建offer成功
function createOfferSuccessHandler(desc) {

    pc.setLocalDescription(desc).then(function () { setLocalDescSuccessHandler(JSON.stringify({ 'desc': desc })); }, errorHandler);

    outputBox('create offer success ');
}

//创建answer成功
function createAnswerSuccessHandler(desc) {

    pc.setLocalDescription(desc).then(function () { setLocalDescSuccessHandler(JSON.stringify({ 'desc': desc })); }, errorHandler);
    outputBox('create answer success');
}

//回调异常处理函数
function errorHandler(error) {

    outputBox(error);
}

/* -------------------------修改状态---------------------- */
/*------------------------------------------------------------*/
//显示最初界面
function fallBackToOrigin() {

    callBtn.classList.remove('btn-hide');
    hangupBtn.classList.add('btn-hide');
    cancelBtn.classList.add('btn-hide');
    pickupBtn.classList.add('btn-hide');
    refuseBtn.classList.add('btn-hide');
    pickupModal.classList.add('modal-hide');
    hangupModal.classList.add('modal-hide');
}

//显示发起通话界面
function showCallingModal() {

    callBtn.classList.add('btn-hide');
    hangupBtn.classList.add('btn-hide');
    cancelBtn.classList.remove('btn-hide');
    pickupBtn.classList.add('btn-hide');
    refuseBtn.classList.add('btn-hide');
    pickupModal.classList.add('modal-hide');
    hangupModal.classList.remove('modal-hide');
}

//显示接听通话界面
function showPickupModal() {

    callBtn.classList.add('btn-hide');
    hangupBtn.classList.add('btn-hide');
    cancelBtn.classList.add('btn-hide');
    pickupBtn.classList.remove('btn-hide');
    refuseBtn.classList.remove('btn-hide');
    pickupModal.classList.remove('modal-hide');
    hangupModal.classList.add('modal-hide');
}

//显示通话界面
function showCalling() {

    callBtn.classList.add('btn-hide');
    hangupBtn.classList.remove('btn-hide');
    cancelBtn.classList.add('btn-hide');
    pickupBtn.classList.add('btn-hide');
    refuseBtn.classList.add('btn-hide');
    pickupModal.classList.add('modal-hide');
    hangupModal.classList.add('modal-hide');
}


/* -------------------------MISC---------------------- */
/*------------------------------------------------------------*/

//获取本地媒体流
function getLocalStream() {

    var constraints = { "audio": true, "video": { "optional": [{ "maxWidth": "1280" }, { "maxHeight": "720" }], "mandatory": {} } };
    navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccessHandler).catch(errorHandler);
}

//自动补全url 防止跳转出错
function completeUrl(url) {

    var slashReg = /\/$/;
    var ipReg = /.\d+\/$/;
    var portReg = /:\d+\/$/;
    var controllerReg = /VideoChat\/$/;
    var actionReg = /Index\/$/;
    var supportReg = /\?\w+\=\w+/;

    var hasSlash = slashReg.test(url);

    if (supportReg.test(url)) {
        return url;
    }

    if (!hasSlash)
        url += '/';

    if (portReg.test(url) || ipReg.test(url)) {

        url += 'VideoChat/ChatUnavailabel/';
        return url;
    }

    if (controllerReg.test(url)) {

        url += 'ChatUnavailabel/';
        return url;
    }

    if (actionReg.test(url)) {

        return url.replace('Index', 'ChatUnavailabel');
    }

}

//挂断后跳转用户
function disconnectAndRedirectClient() {

    var url = window.location.href;

    var supportReg = /\?\w+\=\w+/;

    if (!supportReg.test(url)) {
        $.connection.hub.stop();//不支持回调
        url = completeUrl(url);
        window.location.href = url;
        return;
    }

    destroyPC();
}

//释放p2p连接
function destroyPC() {

    if (!!pc) {
        pc.close();
        pc = null;
    }

    remoteDesc = null;
    remoteCandidates = [];

    if (!pc) {
        InitPC();
        getLocalStream();
    }
}

function outputBox(msg) {

    console.log('******************************');
    console.log('*                            *');
    console.log('*      '  + msg +     '      *');
    console.log('*                            *');
    console.log('******************************');
}

//调用该方法后才能触发 hub.OnConnected事件
$.connection.hub.start().done(
    function () {
        console.log('hub connected ');
    }
)
