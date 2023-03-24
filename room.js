class Rooms {
  static roomList = {};
}

class Room {
  constructor(roomId) {
    this.id = roomId
    this.memberList = {};
  }

  addMember(member) {
    this.memberList[member.id] = member;
  }

  exit(memberId) {
    delete this.memberList[memberId]
  }

  getMember(memberId) {
    return this.memberList[memberId]
  }
}

class Member {
  constructor(id, roomId, hasCameraStream, hasAudioStream, localStream, socket) {
    this.id = id
    this.roomId = roomId
    this.hasCameraStream = hasCameraStream
    this.hasAudioStream = hasAudioStream
    this.localStream = localStream
    this.socket = socket
  }
}

const createOrJoinRoom = (member) =>
  new Promise((resolve) => {
    let room;
    if (Rooms.roomList[member.roomId]) {
      room = Rooms.roomList[member.roomId];
      room.addMember(member);
    } else {
      room = new Room(member.roomId);
      room.addMember(member);
      Rooms.roomList[member.roomId] = room;
    }
    member.socket.emit("room-ready");
    resolve(room);
  });

module.exports = {
  Rooms,
  Member,
  createOrJoinRoom,
};
