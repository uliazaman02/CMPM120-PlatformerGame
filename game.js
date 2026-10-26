var game = new Phaser.Game(700, 350, Phaser.AUTO, '', {
  preload: preload, create: create, update: update
});

var map, collisionLayer, cursors;
var player, enemy, goal, won;

// Tiled 1.2+ exports properties as an array; this turns them into a plain object
function props(p) {
  if (Array.isArray(p)) {
    var o = {};
    p.forEach(function (x) { o[x.name] = x.value; });
    return o;
  }
  return p || {};
}

function preload() {
  game.load.tilemap('level', 'assets/maps/level1.json', null, Phaser.Tilemap.TILED_JSON);
  game.load.spritesheet('tiles', 'assets/images/tiles.png', 35, 35);
}

function create() {
  won = false;
  game.physics.startSystem(Phaser.Physics.ARCADE);
  game.physics.arcade.gravity.y = 1000;

  // 1st argument = tileset name in Tiled, 2nd = image key from preload
  map = game.add.tilemap('level');
  map.addTilesetImage('tiles', 'tiles');

  map.createLayer('background');
  collisionLayer = map.createLayer('collision');
  map.setCollisionBetween(1, 1000, true, 'collision');
  collisionLayer.resizeWorld();

  // 'objects' = the object layer name in Tiled
  map.objects['objects'].forEach(createObject);

  cursors = game.input.keyboard.createCursorKeys();
}

function createObject(obj) {
  var p = props(obj.properties);
  // Tiled places tile objects by their bottom-left corner; Phaser uses the center
  var x = obj.x + map.tileWidth / 2;
  var y = obj.y - map.tileHeight / 2;
  // tile id in Tiled (gid) -> frame number in the sprite sheet
  var sprite = game.add.sprite(x, y, 'tiles', obj.gid - 1);
  sprite.anchor.setTo(0.5);
  game.physics.arcade.enable(sprite);
  sprite.body.collideWorldBounds = true;

  if (obj.name === 'player') {
    sprite.walkingSpeed = Number(p.walking_speed);
    sprite.jumpingSpeed = Number(p.jumping_speed);
    player = sprite;
  } else if (obj.name === 'enemy') {
    sprite.walkingSpeed = Number(p.walking_speed);
    sprite.walkingDistance = Number(p.walking_distance);
    sprite.startX = sprite.x;
    sprite.body.velocity.x = Number(p.direction) * sprite.walkingSpeed;
    enemy = sprite;
  } else if (obj.name === 'goal') {
    sprite.body.allowGravity = false;
    sprite.body.immovable = true;
    goal = sprite;
  }
}

function update() {
  game.physics.arcade.collide(player, collisionLayer);
  game.physics.arcade.collide(enemy, collisionLayer);
  game.physics.arcade.overlap(player, enemy, hitEnemy);
  game.physics.arcade.overlap(player, goal, reachGoal);

  // player movement
  player.body.velocity.x = 0;
  if (cursors.left.isDown) {
    player.body.velocity.x = -player.walkingSpeed;
    player.scale.x = -1;   // flip the sprite; swap 1 and -1 if your art faces the other way
  } else if (cursors.right.isDown) {
    player.body.velocity.x = player.walkingSpeed;
    player.scale.x = 1;
  }
  if (cursors.up.isDown && player.body.blocked.down) {
    player.body.velocity.y = -player.jumpingSpeed;
  }
  if (player.bottom >= game.world.height) {
    game.state.restart();   // fell off the map
  }

  // enemy patrol
  if (Math.abs(enemy.x - enemy.startX) >= enemy.walkingDistance) {
    enemy.body.velocity.x *= -1;
    enemy.startX = enemy.x;
    enemy.scale.x *= -1;
  }
}

function hitEnemy(pl, en) {
  if (pl.body.velocity.y > 0 && pl.y < en.y) {
    en.kill();                  // stomped from above
    pl.body.velocity.y = -300;  // small bounce
  } else {
    game.state.restart();
  }
}

function reachGoal() {
  if (won) { return; }
  won = true;
  game.add.text(260, 140, 'You win!', { font: '36px Arial', fill: '#ffffff' });
}