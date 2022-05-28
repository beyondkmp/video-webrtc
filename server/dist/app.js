"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = __importStar(require("express"));
const socketIO = __importStar(require("socket.io"));
const log4js_1 = __importDefault(require("log4js"));
const http_1 = __importDefault(require("http"));
const USER_COUNT = 3;
log4js_1.default.configure({
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
const logger = log4js_1.default.getLogger();
const app = express.default();
app.get("/", (_req, res) => {
    res.send({ uptime: process.uptime() });
});
//http server
const http_server = http_1.default.createServer(app);
const io = new socketIO.Server(http_server);
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
        }
        else {
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
//# sourceMappingURL=app.js.map