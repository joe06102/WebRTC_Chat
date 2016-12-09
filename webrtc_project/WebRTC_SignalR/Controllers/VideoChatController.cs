using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using WebRTC_SignalR.Hubs;
using WebRTC_SignalR.Infrastructure;

namespace WebRTC_SignalR.Controllers
{
    public class VideoChatController : Controller
    {
        private const string SUPPORT = "support";

        private static Room room = Room.CreateInstance();

        // GET: VideoChat
        public ActionResult Index(string credential)
        {
            if(this.HttpContext.Application["room"] == null)
                this.HttpContext.Application["room"] = room ;

            if(room.IsEmpty || room.IsFull)
            {
                if(credential != SUPPORT)
                    return RedirectToAction("ChatUnavailabel");
            }

            return View();

        }

        public ActionResult ChatUnavailabel()
        {
            return View();
        }
    }
}