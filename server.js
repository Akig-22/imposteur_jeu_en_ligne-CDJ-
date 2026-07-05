const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const themes = require('./mots.js'); 

app.use(express.static(__dirname));

let players = []; 
let turnIndex = 0;
let tourActuel = 1;

io.on('connection', (socket) => {
    
    socket.on('join-game', (name) => {
        players = players.filter(p => p.id !== socket.id);
        players.push({ id: socket.id, name: name, role: '' });
        io.emit('update-player-list', players.map(p => p.name));
    });

    socket.on('start-game', () => {
        // Tu peux remettre >= 3 ici quand tu joueras avec des amis
        if (players.length >= 1) { 
            turnIndex = 0;
            tourActuel = 1;
            
            const selection = themes[Math.floor(Math.random() * themes.length)];
            const imposterIndex = Math.floor(Math.random() * players.length);
            
            players.forEach((player, index) => {
                player.role = (index === imposterIndex) ? 'IMPOSTEUR' : 'JOUEUR';
                io.to(player.id).emit('game-started', {
                    role: player.role,
                    word: (player.role === 'IMPOSTEUR') 
                        ? 'Tu es l\'imposteur !' 
                        : `Catégorie : ${selection.categorie} <br> Mot : <b>${selection.mot}</b>`
                });
            });
            io.emit('next-turn', { name: players[turnIndex].name, tour: tourActuel });
        }
    });

    socket.on('pass-turn', () => {
        if (players.length === 0) return;
        turnIndex = (turnIndex + 1) % players.length;
        if (turnIndex === 0) tourActuel++;
        io.emit('next-turn', { name: players[turnIndex].name, tour: tourActuel });
    });

    socket.on('add-tour', () => {
        io.emit('status-msg', "Un tour de table supplémentaire a été ajouté !");
    });

    // NOUVEAU : Fin du débat
    socket.on('end-debate', () => {
        io.emit('status-msg', "Le débat est clos ! Vous pouvez maintenant révéler l'imposteur.");
        io.emit('enable-reveal-button');
    });

    socket.on('end-game', () => {
        io.emit('game-over', players.map(p => ({ name: p.name, role: p.role })));
    });

    socket.on('reset-game', () => {
        players.forEach(p => p.role = '');
        io.emit('reset-ui');
    });

    socket.on('disconnect', () => {
        players = players.filter(p => p.id !== socket.id);
        io.emit('update-player-list', players.map(p => p.name));
    });
});

const port = process.env.PORT || 3000;
http.listen(port, '0.0.0.0', () => console.log(`Serveur actif sur le port ${port}`));