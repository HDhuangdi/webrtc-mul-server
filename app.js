const { Server } = require("socket.io");
const https = require("https");
// const http = require("http");
const express = require("express");
const fs = require('fs')
const { Rooms, createOrJoinRoom, Member } = require("./room");
const { serializeMember } = require('./utils')

const app = express();
var options = {
  key: fs.readFileSync('/opt/pem/hzcjtz.com.key'),
  cert: fs.readFileSync('/opt/pem/hzcjtz.com.crt')
};
var server = https.createServer(options, app).listen(9876);
// var server = http.createServer(app).listen(8088);
const io = new Server(server, { cors: true });

io.on("connect", async (socket) => {
  socket.on("join-room", async (newMember) => {
    const member = new Member(newMember.id, newMember.roomId, newMember.hasCameraStream, newMember.hasAudioStream, newMember.localStream, socket)
    const room = await createOrJoinRoom(member);

    console.log(`用户(${member.id})加入房间(${room.id})`);

    for (let id in room.memberList) {
      if (id === member.id) continue;
      console.log(`用户(${member.id})在房间(${room.id})发送init receive事件给用户(${id})`);
      room.getMember(id).socket.emit("init-receive", serializeMember(member));
    }

    socket.on("init-send", (otherMember) => {
      console.log(`用户(${member.id})在房间(${room.id})接收到init send事件来自用户(${otherMember.id})`);
      room.getMember(otherMember.id).socket.emit("init-send", serializeMember(member));
    });

    socket.on("signal", (data) => {
      console.log(`用户(${member.id})在房间(${room.id})收到sending signal事件来自用户(${data.member.id})`);
      const sendMember = room.getMember(data.member.id);
      if (!sendMember) return;
      sendMember.socket.emit("signal", {
        member: serializeMember(member),
        signal: data.signal,
      });
    });

    socket.on("disconnect", () => {
      console.log(`用户(${member.id})从房间(${room.id})断开连接`);
      socket.broadcast.emit("remove-peer", serializeMember(member));
      room.exit(member.id);
    });

    socket.on("hangup", () => {
      console.log(`用户(${member.id})从房间(${room.id})退出连接`);
      socket.broadcast.emit("remove-peer", serializeMember(member));
      room.exit(member.id);
    });

    socket.on("switch-stream", (switchedMember) => {
      const serializedSwitchedMember = room.getMember(switchedMember.id)
      console.log(`用户(${serializedSwitchedMember.id})切换流，视频流：${switchedMember.hasCameraStream}，音频流：${switchedMember.hasAudioStream}`);
      serializedSwitchedMember.hasCameraStream = switchedMember.hasCameraStream
      serializedSwitchedMember.hasAudioStream = switchedMember.hasAudioStream
      socket.broadcast.emit("stream-switched", serializeMember(serializedSwitchedMember));
    });

    socket.on("no-stream-join", joinedMember => {
      console.log(`无视频流用户(${joinedMember.id})向房间(${room.id})发送no-stream-joined事件`);
      socket.broadcast.emit("no-stream-joined", serializeMember(joinedMember));
    })

    socket.on('init-send-done', sendMember => {
      console.log(`用户(${member.id})向用户(${sendMember.id})发送init-send-done事件`);
      const serializedSendMember = room.getMember(sendMember.id)
      serializedSendMember.socket.emit('init-send-done')
    })
  });
});

app.get('/getRooms', (req, res) => {
  const rooms = []
  for (const roomId in Rooms.roomList) {
    const rawRoom = Rooms.roomList[roomId]
    const room = {
      id: rawRoom.id,
      members: []
    }
    for (const memberId in rawRoom.memberList) {
      const rawMember = rawRoom.memberList[memberId]
      
      const member = {
        id: rawMember.id,
        roomId: rawMember.roomId,
        hasCameraStream: rawMember.hasCameraStream,
        hasAudioStream: rawMember.hasAudioStream,
      }
      room.members.push(member)
    }
    rooms.push(room)
  }
  res.send({ data: rooms, success: true })
})