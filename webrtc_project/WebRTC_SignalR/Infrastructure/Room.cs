using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace WebRTC_SignalR.Infrastructure
{
    public class Room
    {
        private const int MAX_NUMBER = 2 ;

        private static Room instance = null;

        private static readonly object locker = new object();

        private static IList<string> clients ;
        
        /// <summary>
        /// 用户加入房间事件
        /// </summary>
        public event Action Join;


        private Room() 
        {
            clients = new List<string>();
        }

        /// <summary>
        /// 创建Room对象单例
        /// </summary>
        /// <returns></returns>
        public static Room CreateInstance()
        {
            lock (locker)
            {
                if (instance == null)
                    instance = new Room();
            }

            return instance;
        }

        /// <summary>
        /// Join是否有订阅程序
        /// </summary>
        public bool HasHandler
        {
            get 
            {
                return Join != null;
            }
        }

        /// <summary>
        /// 房间是否为空
        /// </summary>
        public bool IsEmpty
        {
            get
            {
                return clients.Count == 0 ? true : false;
            }
        }

        /// <summary>
        /// 房间是否已满
        /// </summary>
        public bool IsFull 
        { 
            get 
            {
                return clients.Count >= MAX_NUMBER ? true : false;
            } 
        }

        /// <summary>
        /// 当前房间人数
        /// </summary>
        public int RoomNumber
        {
            get
            {
                return clients.Count;
            }
        }

        /// <summary>
        /// 将用户添加到房间
        /// </summary>
        /// <param name="id"></param>
        public void AddMember(string id)
        {
            if (IsFull)
                return;

            clients.Add(id);
            if (HasHandler)
                Join();
        }

        /// <summary>
        /// 将用户移出房间
        /// </summary>
        /// <param name="id"></param>
        public void RemoveMember(string id)
        {
            if (IsEmpty)
                return;

            if (clients.Contains(id))
            {
                clients.Remove(id);

                if (HasHandler)
                    Join();
            }
        }

        /// <summary>
        /// 获取对方ID
        /// </summary>
        public string GetOtherMember(string curId)
        {
            if (!IsFull)
                return null;

            return clients.Where(id => id != curId).FirstOrDefault();
        }

    }
}