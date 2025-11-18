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
                transports: ['websocket'],
                reconnection: false
            });

            ioServer.on('connection', (socket) => {
                serverSocket = socket;
                done();
            });
        });
    });

    afterAll((done) => {
        if (clientSocket && clientSocket.connected) {
            clientSocket.disconnect();
        }
        if (ioServer) {
            ioServer.close();
        }
        if (httpServer) {
            httpServer.close(done);
        } else {
            done();
        }
    });

    describe('Connection', () => {
        it('should connect to socket server', (done) => {
            // Wait a bit for connection to establish if not already connected
            if (clientSocket.connected) {
                expect(clientSocket.connected).toBe(true);
                done();
            } else {
                clientSocket.once('connect', () => {
                    expect(clientSocket.connected).toBe(true);
                    done();
                });
            }
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
});
