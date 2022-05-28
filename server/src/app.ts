import {Server} from "socket.io";
import log4js from 'log4js';
import { createServer } from "http";

const USER_COUNT = 3;

log4js.configure({
	appenders: {
		file: {
			type: 'file',
			filename: 'app.log',
			layout: {
				type: 'pattern',
				pattern: '%r %p - %m',
			}
		}
	},
	categories: {
		default: {
			appenders: ['file'],
			level: 'debug'
		}
	}
});

const logger = log4js.getLogger();

const http_server = createServer();
const io = new Server(http_server, {path:'/xxxxxyyyyy'});

io.sockets.on('connection', (socket) => {
	socket.on('message', (room, data) => {
		logger.debug('message, room: ' + room + ", data, type:" + data.type);
		socket.to(room).emit('message', room, data);
	});

	socket.on('join', (room) => {
		socket.join(room);
		const myRoom = io.sockets.adapter.rooms[room];
		const users = (myRoom) ? Object.keys(myRoom.sockets).length : 0;
		logger.debug('the user number of room (' + room + ') is: ' + users);

		if (users < USER_COUNT) {
			socket.emit('joined', room, socket.id); //发给除自己之外的房间内的所有人
			if (users > 1) {
				socket.to(room).emit('otherjoin', room, socket.id);
			}

		} else {
			socket.leave(room);
			socket.emit('full', room, socket.id);
		}
		//socket.emit('joined', room, socket.id); //发给自己
		//socket.broadcast.emit('joined', room, socket.id); //发给除自己之外的这个节点上的所有人
		//io.in(room).emit('joined', room, socket.id); //发给房间内的所有人
	});

	socket.on('leave', (room) => {

		socket.leave(room);

		const myRoom = io.sockets.adapter.rooms[room];
		const users = (myRoom) ? Object.keys(myRoom.sockets).length : 0;
		logger.debug('the user number of room is: ' + users);

		//socket.emit('leaved', room, socket.id);
		//socket.broadcast.emit('leaved', room, socket.id);
		socket.to(room).emit('bye', room, socket.id);
		socket.emit('leaved', room, socket.id);
		//io.in(room).emit('leaved', room, socket.id);
	});

});

http_server.listen(8081, '127.0.0.1');



