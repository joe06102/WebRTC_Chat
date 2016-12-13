
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

//���նԷ��ĺ�ѡ��
room.client.receiveCandidate = function (candidateJson) {
    var candidateObj = JSON.parse(candidateJson);
    remoteCandidates.push(candidateObj.cand);

    console.log('receive candidate');
    //console.log(candidateObj.cand)
    //pc.addIceCandidate(new RTCIceCandidate(candidateObj.cand)).then(addIceCandidateSuccessHandler, errorHandler);
}

//���չ㲥��Ϣ
room.client.receiveMsg = function (msg) {

    outputBox(msg);
}

//�ر�����
room.client.shutDownPC = function () {

    fallBackToOrigin();

    disconnectAndRedirectClient();

}

//����ģ̬����ʾ�绰
room.client.receiveCall = function () {
    showPickupModal();
}

//ͨ���ɹ�,��ʾͨ������
room.client.receiveShowCalling = function () {
    showCalling();
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

    outputBox('peer connection initialized ');
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
    outputBox('get local media success');
}

function addStreamHandler(event) {

    remoteCam.srcObject = event.stream;
    outputBox('add remote stream success');
}

//createOffer֮���Һ�ѡ�˿���ʱ����
function onIceCandidateHandler(event) {

    if (event.candidate !== null) {
        //console.log("candidate hangler : " + event.candidate.candidate);
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
    outputBox('set local desc success ');
}

//����Զ��sdp�ɹ�
function setRemoteDescSuccessHandler() {

    //��setRemoteDescription֮����ã�����ᱨ��dom exception �� error processing ice
    remoteCandidates.forEach(function (curCandidate, index) {
        pc.addIceCandidate(new RTCIceCandidate(curCandidate)).then(function () { addIceCandidateSuccessHandler(index); }, errorHandler);
    });

    outputBox('set remote desc success');
}

//����offer�ɹ�
function createOfferSuccessHandler(desc) {

    pc.setLocalDescription(desc).then(function () { setLocalDescSuccessHandler(JSON.stringify({ 'desc': desc })); }, errorHandler);

    outputBox('create offer success ');
}

//����answer�ɹ�
function createAnswerSuccessHandler(desc) {

    pc.setLocalDescription(desc).then(function () { setLocalDescSuccessHandler(JSON.stringify({ 'desc': desc })); }, errorHandler);
    outputBox('create answer success');
}

//�ص��쳣������
function errorHandler(error) {

    outputBox(error);
}

/* -------------------------�޸�״̬---------------------- */
/*------------------------------------------------------------*/
//��ʾ�������
function fallBackToOrigin() {

    callBtn.classList.remove('btn-hide');
    hangupBtn.classList.add('btn-hide');
    cancelBtn.classList.add('btn-hide');
    pickupBtn.classList.add('btn-hide');
    refuseBtn.classList.add('btn-hide');
    pickupModal.classList.add('modal-hide');
    hangupModal.classList.add('modal-hide');
}

//��ʾ����ͨ������
function showCallingModal() {

    callBtn.classList.add('btn-hide');
    hangupBtn.classList.add('btn-hide');
    cancelBtn.classList.remove('btn-hide');
    pickupBtn.classList.add('btn-hide');
    refuseBtn.classList.add('btn-hide');
    pickupModal.classList.add('modal-hide');
    hangupModal.classList.remove('modal-hide');
}

//��ʾ����ͨ������
function showPickupModal() {

    callBtn.classList.add('btn-hide');
    hangupBtn.classList.add('btn-hide');
    cancelBtn.classList.add('btn-hide');
    pickupBtn.classList.remove('btn-hide');
    refuseBtn.classList.remove('btn-hide');
    pickupModal.classList.remove('modal-hide');
    hangupModal.classList.add('modal-hide');
}

//��ʾͨ������
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

//�ҶϺ���ת�û�
function disconnectAndRedirectClient() {

    var url = window.location.href;

    var supportReg = /\?\w+\=\w+/;

    if (!supportReg.test(url)) {
        $.connection.hub.stop();//��֧�ֻص�
        url = completeUrl(url);
        window.location.href = url;
        return;
    }

    destroyPC();
}

//�ͷ�p2p����
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

//���ø÷�������ܴ��� hub.OnConnected�¼�
$.connection.hub.start().done(
    function () {
        console.log('hub connected ');
    }
)
