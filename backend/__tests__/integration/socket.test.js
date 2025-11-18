const io = require('socket.io-client');
const http = require('http');
const socketIO = require('socket.io');

describe('Socket.IO Integration Tests', () => {
    let httpServer;
    let ioServer;
    let clientSocket;
    let serverSocket;

    beforeAll((done) => {
        httpServer = http.createServer();
        ioServer = socketIO(httpServer, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        httpServer.listen(() => {
            const port = httpServer.address().port;
            clientSocket = io(`http://localhost:${port}`, {
                transports: ['websocket']
            });

            ioServer.on('connection', (socket) => {
                serverSocket = socket;
            });

            clientSocket.on('connect', done);
        });
    });

    afterAll(() => {
        ioServer.close();
        clientSocket.close();
        httpServer.close();
    });

    describe('Connection', () => {
        it('should connect to socket server', (done) => {
            expect(clientSocket.connected).toBe(true);
            done();
        });

        it('should emit and receive messages', (done) => {
            serverSocket.on('test-message', (data) => {
                expect(data).toBe('test');
                done();
            });

            clientSocket.emit('test-message', 'test');
        });
    });

    describe('Room Operations', () => {
        it('should join a room', (done) => {
            const roomData = { pin: '123456', username: 'testuser' };

            serverSocket.on('joinRoom', (data) => {
                expect(data.pin).toBe(roomData.pin);
                expect(data.username).toBe(roomData.username);
                done();
            });

            clientSocket.emit('joinRoom', roomData);
        });

        it('should leave a room', (done) => {
            serverSocket.on('leaveRoom', () => {
                done();
            });

            clientSocket.emit('leaveRoom');
        });
    });

    describe('Message Operations', () => {
        it('should send a message', (done) => {
            const messageData = {
                roomPin: '123456',
                username: 'testuser',
                message: 'Hello, World!'
            };

            serverSocket.on('sendMessage', (data) => {
                expect(data.message).toBe(messageData.message);
                done();
            });

            clientSocket.emit('sendMessage', messageData);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid room join', (done) => {
            clientSocket.on('roomJoinError', (error) => {
                expect(error).toBeDefined();
                done();
            });

            clientSocket.emit('joinRoom', { pin: '', username: '' });
        });
    });
});
