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
      //{ 'url' : 'turn:192.168.238.128','credential':'yundu2','username':'yundu2'}
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

    console.log('receive remote desc');

    var descObj = JSON.parse(descJson);
    remoteDesc = descObj.desc;

    if (remoteDesc.type === 'offer') {
        console.log('receive offer : ');
        console.log(remoteDesc);
    }

    if (remoteDesc.type === 'answer') {
        pc.setRemoteDescription(remoteDesc).then(setRemoteDescSuccessHandler, errorHandler);
        console.log('receive answer : ');
        console.log(remoteDesc);
    }
}

//接收对方的候选人
room.client.receiveCandidate = function (candidateJson) {
    var candidateObj = JSON.parse(candidateJson);
    remoteCandidates.push(candidateObj.cand);

    console.log('receive candidate :')
    console.log(candidateObj.cand)
    //pc.addIceCandidate(new RTCIceCandidate(candidateObj.cand)).then(addIceCandidateSuccessHandler, errorHandler);
}

//接收广播信息
room.client.receiveMsg = function (msg) {
    console.log(msg);
}

//关闭连接
room.client.shutDownPC = function () {

    $.connection.hub.stop();//不支持回调

    var url = window.location.href;

    url = completeUrl(url);

    window.location.href = url;

}

//弹出模态框提示电话
room.client.receiveCall = function () {
    pickupModal.classList.toggle('modal-hide');
}

//通话成功，关闭挂断窗口
room.client.receiveCollapseHangupModal = function () {
    hangupModal.classList.toggle('modal-hide');
}

//通话成功，隐藏呼叫按钮，显示挂断按钮
room.client.receiveShowHangupBtn = function () {
    callBtn.classList.toggle('btn-hide');
    hangupBtn.classList.toggle('btn-hide');
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
    if (pc === null)
        InitPC();
    pc.createOffer(offerOption).then(createOfferSuccessHandler, errorHandler);
    room.server.sendCall();
    hangupModal.classList.toggle('modal-hide');
}

function cancelCall() {
    room.server.shutDownConnection();
    hangupModal.classList.toggle('modal-hide');
}

function hangupCall() {
    room.server.shutDownConnection();
}

function pickUpCall() {
    if (pc === null)
        InitPC();

    pc.setRemoteDescription(remoteDesc).then(setRemoteDescSuccessHandler, errorHandler);
    pc.createAnswer().then(createAnswerSuccessHandler, errorHandler);

    pickupModal.classList.toggle('modal-hide');
    room.server.sendCollapseHangupModal();
    room.server.sendShowHangupBtn();

    console.log('pick up the call');
}

function refuseCall() {

    room.server.shutDownConnection();

    pickupModal.classList.toggle('modal-hide');

    console.log('call refused');
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
    console.log('get local media success');
}

function addStreamHandler(event) {
    remoteCam.srcObject = event.stream;
    console.log('add remote stream success');
}

//createOffer之后，且候选人可用时触发
function onIceCandidateHandler(event) {

    if (event.candidate !== null) {
        console.log("candidate availabel : " + event.candidate.candidate);
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
}

//设置远程sdp成功
function setRemoteDescSuccessHandler() {

    //在setRemoteDescription之后调用，否则会报错dom exception ： error processing ice
    remoteCandidates.forEach(function (curCandidate, index) {
        pc.addIceCandidate(new RTCIceCandidate(curCandidate)).then(function () { addIceCandidateSuccessHandler(index); }, errorHandler);
    });

    console.log('set remote desc success');
}

//创建offer成功
function createOfferSuccessHandler(desc) {

    pc.setLocalDescription(desc).then(function () { setLocalDescSuccessHandler(JSON.stringify({ 'desc': desc })); }, errorHandler);
}

//创建answer成功
function createAnswerSuccessHandler(desc) {

    pc.setLocalDescription(desc).then(function () { setLocalDescSuccessHandler(JSON.stringify({ 'desc': desc })); }, errorHandler);
    console.log('create answer success');
}

//回调异常处理函数
function errorHandler(error) {

    console.log(error);
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

//调用该方法后才能触发 hub.OnConnected事件
$.connection.hub.start().done(
    function () {
        console.log('hub connected ');
    }
)
