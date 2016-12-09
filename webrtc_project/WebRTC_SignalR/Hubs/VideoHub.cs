using Microsoft.AspNet.SignalR;
using Microsoft.AspNet.SignalR.Hubs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Newtonsoft.Json.Serialization;
using Newtonsoft.Json.Linq;
using System.Diagnostics;
using System.Configuration;
using WebRTC_SignalR.Infrastructure;

namespace WebRTC_SignalR.Hubs
{
    [HubName("videoHub")]
    public class VideoHub:Hub
    {
        private const int MAX_NUMBER = 2;
        public static Room videoRoom = (Room)HttpContext.Current.Application["room"];
       

        public VideoHub()
        {
            if(!videoRoom.HasHandler)
            {
                videoRoom.Join += sendEnableCallBtn;
                videoRoom.Join += sendDisableCallBtn;
            }

        }

        /// <summary>
        /// 房间有2人时启用呼叫按钮
        /// </summary>
        public void sendEnableCallBtn()
        {
            if(videoRoom.IsFull)
                Clients.All.receiveEnableCallBtn();
        }

        /// <summary>
        /// 房间少于2人时禁用呼叫按钮
        /// </summary>
        public void sendDisableCallBtn()
        {
            if (!videoRoom.IsFull)
                Clients.All.receiveDisableCallBtn();
        }

        /// <summary>
        /// 通知所有已连接的客户端
        /// </summary>
        /// <param name="desc"></param>
        public void broadCast(string msg)
        {
            Clients.All.receiveMsg(msg);
        }

        /// <summary>
        /// 发送sdp数据
        /// </summary>
        /// <param name="sdp"></param>
        public void sendDesc(string descJson)
        {
            var otherId = videoRoom.GetOtherMember(Context.ConnectionId);
            if(!string.IsNullOrEmpty(otherId))
                Clients.Client(otherId).receiveDesc(descJson);
        }

        /// <summary>
        /// 发送候选人信息
        /// </summary>
        /// <param name="candidate"></param>
        public void sendCandidate(string candidateJson)
        {
            var otherId = videoRoom.GetOtherMember(Context.ConnectionId);
            if (!string.IsNullOrEmpty(otherId))
                Clients.Client(otherId).receiveCandidate(candidateJson);
        }

        /// <summary>
        /// 给对方弹出通话提示
        /// </summary>
        public void sendCall()
        {
            var otherId = videoRoom.GetOtherMember(Context.ConnectionId);
            if (!string.IsNullOrEmpty(otherId))
                Clients.Client(otherId).receiveCall();
        }

        /// <summary>
        /// 对方接受邀请后关闭挂断界面，开始通话
        /// </summary>
        public void sendCollapseHangupModal()
        {
            var otherId = videoRoom.GetOtherMember(Context.ConnectionId);
            if (!string.IsNullOrEmpty(otherId))
                Clients.Client(otherId).receiveCollapseHangupModal();
        }

        /// <summary>
        /// 对方接受邀请后显示挂断按钮
        /// </summary>
        public void sendShowHangupBtn()
        {
            var otherId = videoRoom.GetOtherMember(Context.ConnectionId);
            if (!string.IsNullOrEmpty(otherId))
                Clients.All.receiveShowHangupBtn();
        }

        /// <summary>
        /// 挂断所有连接
        /// </summary>
        public void shutDownConnection()
        {
            Clients.All.shutDownPC();
        }

        /// <summary>
        /// 客户连接到服务器时触发
        /// </summary>
        /// <returns></returns>
        public override System.Threading.Tasks.Task OnConnected()
        {
            videoRoom.AddMember(Context.ConnectionId);
            broadCast("Connected : " + Context.ConnectionId);
         
            return base.OnConnected();
        }

        /// <summary>
        /// 客户断开连接时触发
        /// </summary>
        /// <param name="stopCalled"></param>
        /// <returns></returns>
        public override System.Threading.Tasks.Task OnDisconnected(bool stopCalled)
        {
            videoRoom.RemoveMember(Context.ConnectionId);
            broadCast("Disconnected : " + Context.ConnectionId);

            //房间中有人断开连接 则关闭通话
            shutDownConnection();                

            return base.OnDisconnected(stopCalled);
        }

    }
}