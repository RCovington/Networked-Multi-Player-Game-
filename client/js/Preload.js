
FunkyMultiplayerGame.Preload = function () {
};

FunkyMultiplayerGame.Preload.prototype = {

    preload: function () {
        this.load.image("btn-join-game",    'assets/btn-join-game.png');
        this.load.image("red-fly",          'assets/red-fly.png');
    },

    create: function () {
        // Skip menu and go directly to game since players are already in the game
        this.state.start("Game");
    }
};