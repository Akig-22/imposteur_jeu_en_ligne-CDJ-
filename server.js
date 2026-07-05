const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const themes = require('./main/mots.js'); // Importation de ta liste de 100 mots

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
        if (players.length >= 3) {
            turnIndex = 0;
            tourActuel = 1;
            
            // Sélection aléatoire parmi tes 100 mots
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

// Port dynamique pour le déploiement cloud
const port = process.env.PORT || 3000;
http.listen(port, () => console.log(`Serveur actif sur le port ${port}`));