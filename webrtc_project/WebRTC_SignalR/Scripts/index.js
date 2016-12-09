var room = $.connection.videoHub;

var pc;
var offerOption =
{
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};

//�����coturn�����ַ
//stunЭ��ֻ֧�ֽ���˫���ĵ�ַ��Ϣ����P2P����ʧ��ʱ���޷���Ƶͨ��
//turnЭ�����stun���ܣ�����֧����Ƶ����ת����P2P����ʧ��ʱ�Ὣ�÷�������Ϊ�м̷���������֤��Ƶͨ��
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


/* -------------------------Hub�����߼�---------------------- */
/*------------------------------------------------------------*/

//���նԷ����͵�sdp����
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

//���նԷ��ĺ�ѡ��
room.client.receiveCandidate = function (candidateJson) {
    var candidateObj = JSON.parse(candidateJson);
    remoteCandidates.push(candidateObj.cand);

    console.log('receive candidate :')
    console.log(candidateObj.cand)
    //pc.addIceCandidate(new RTCIceCandidate(candidateObj.cand)).then(addIceCandidateSuccessHandler, errorHandler);
}

//���չ㲥��Ϣ
room.client.receiveMsg = function (msg) {
    console.log(msg);
}

//�ر�����
room.client.shutDownPC = function () {

    $.connection.hub.stop();//��֧�ֻص�

    var url = window.location.href;

    url = completeUrl(url);

    window.location.href = url;

}

//����ģ̬����ʾ�绰
room.client.receiveCall = function () {
    pickupModal.classList.toggle('modal-hide');
}

//ͨ���ɹ����رչҶϴ���
room.client.receiveCollapseHangupModal = function () {
    hangupModal.classList.toggle('modal-hide');
}

//ͨ���ɹ������غ��а�ť����ʾ�Ҷϰ�ť
room.client.receiveShowHangupBtn = function () {
    callBtn.classList.toggle('btn-hide');
    hangupBtn.classList.toggle('btn-hide');
}

//��������2����ʱ��������
room.client.receiveEnableCallBtn = function () {
    callBtn.disabled = false;
}

//����������2����ʱ���ú���
room.client.receiveDisableCallBtn = function () {
    callBtn.disabled = true;
}


/* -------------------------�û������߼�---------------------- */
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


/* -------------------------��ʼ��---------------------- */
/*------------------------------------------------------------*/

(function init() {
    initElement();
    addListener();
    InitPC();
    getLocalStream();//����getUserMedia�ص�����������һ��ʼ�ͻ��stream������createOffer���봴��2��
})();

//��ʼ��������ҳԪ��
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

//Ϊ��ҳԪ����Ӽ���
function addListener() {
    callBtn.addEventListener('click', call);
    hangupBtn.addEventListener('click', hangupCall);
    cancelBtn.addEventListener('click', cancelCall);
    pickupBtn.addEventListener('click', pickUpCall);
    refuseBtn.addEventListener('click', refuseCall);

    //remoteCam.addEventListener('resize', onResizeHandler)
    //window.addEventListener('resize', onResizeHandler)
}

//��ʼ��p2p����
//�����ڱ���createOfferǰ��ʼ��Զ�̵�peerconnection
function InitPC() {
    pc = new RTCPeerConnection(servers);
    pc.onicecandidate = onIceCandidateHandler;
}


/* -------------------------�¼��ص�---------------------- */
/*------------------------------------------------------------*/

function onResizeHandler() {

    console.log('old video width : ' + remoteCam.offsetWidth);
    console.log('old video height : ' + remoteCam.offsetHeight);

    var ratio = remoteCam.videoHeight / remoteCam.videoWidth;

    console.log('video ratio : ' + ratio);

}

//��������ͷ�ص�����
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

//createOffer֮���Һ�ѡ�˿���ʱ����
function onIceCandidateHandler(event) {

    if (event.candidate !== null) {
        console.log("candidate availabel : " + event.candidate.candidate);
        room.server.sendCandidate(JSON.stringify({ 'cand': event.candidate }));
    }
}

//��Ӻ�ѡ�˳ɹ�
function addIceCandidateSuccessHandler(candidateIndex) {

    console.log('add candidate ' + candidateIndex + ' success ');
}

//���ñ���sdp�ɹ�
function setLocalDescSuccessHandler(descJson) {

    room.server.sendDesc(descJson);
}

//����Զ��sdp�ɹ�
function setRemoteDescSuccessHandler() {

    //��setRemoteDescription֮����ã�����ᱨ��dom exception �� error processing ice
    remoteCandidates.forEach(function (curCandidate, index) {
        pc.addIceCandidate(new RTCIceCandidate(curCandidate)).then(function () { addIceCandidateSuccessHandler(index); }, errorHandler);
    });

    console.log('set remote desc success');
}

//����offer�ɹ�
function createOfferSuccessHandler(desc) {

    pc.setLocalDescription(desc).then(function () { setLocalDescSuccessHandler(JSON.stringify({ 'desc': desc })); }, errorHandler);
}

//����answer�ɹ�
function createAnswerSuccessHandler(desc) {

    pc.setLocalDescription(desc).then(function () { setLocalDescSuccessHandler(JSON.stringify({ 'desc': desc })); }, errorHandler);
    console.log('create answer success');
}

//�ص��쳣������
function errorHandler(error) {

    console.log(error);
}


/* -------------------------MISC---------------------- */
/*------------------------------------------------------------*/

//��ȡ����ý����
function getLocalStream() {

    var constraints = { "audio": true, "video": { "optional": [{ "maxWidth": "1280" }, { "maxHeight": "720" }], "mandatory": {} } };
    navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccessHandler).catch(errorHandler);
}

//�Զ���ȫurl ��ֹ��ת����
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

//���ø÷�������ܴ��� hub.OnConnected�¼�
$.connection.hub.start().done(
    function () {
        console.log('hub connected ');
    }
)
