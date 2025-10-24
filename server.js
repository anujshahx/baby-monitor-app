const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3000 });

const rooms = {};

wss.on('connection', ws => {
    ws.on('message', message => {
        const data = JSON.parse(message);
        const { roomId } = data;

        switch (data.type) {
            case 'join':
                if (!rooms[roomId]) {
                    rooms[roomId] = [];
                }
                rooms[roomId].push(ws);
                ws.roomId = roomId;

                if (rooms[roomId].length === 2) {
                    rooms[roomId].forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'monitor-joined' }));
                        }
                    });
                }
                break;
            
            default:
                // Broadcast to the other client in the room
                if (rooms[roomId]) {
                    rooms[roomId].forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify(data));
                        }
                    });
                }
                break;
        }
    });

    ws.on('close', () => {
        const { roomId } = ws;
        if (rooms[roomId]) {
            rooms[roomId] = rooms[roomId].filter(client => client !== ws);
            if (rooms[roomId].length === 0) {
                delete rooms[roomId];
            }
        }
    });

    console.log('Client connected');
});

console.log('Signaling server running on ws://localhost:3000');

