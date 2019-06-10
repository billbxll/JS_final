var simpleLevelPlan = [
  "                      ",
  "                      ",
  "  x              = x  ",
  "  x         o o    x  ",
  "  x @      xxxxx   x  ",
  "  xxxxx            x  ",
  "      x!!!!!!!!!!!!x  ",
  "      xxxxxxxxxxxxxx  ",
  "                      "
];

function Level(plan) {
  this.width = plan[0].length;
  this.height = plan.length;
  this.grid = [];
  this.actors = [];

  for (var y = 0; y < this.height; y++) {
    var line = plan[y], gridLine = [];
    for (var x = 0; x < this.width; x++) {
      var ch = line[x], fieldType = null;
      var Actor = actorChars[ch];
      if (Actor)
        this.actors.push(new Actor(new Vector(x, y), ch));
      else if (ch == "x")
        fieldType = "wall";
      else if (ch == "!")
        fieldType = "lava";
      gridLine.push(fieldType);
    }
    this.grid.push(gridLine);
  }

  this.player = this.actors.filter(function(actor) {
    return actor.type == "player";
  })[0];
  this.status = this.finishDelay = null;
}

Level.prototype.isFinished = function() {
  return this.status != null && this.finishDelay < 0;
};

function Vector(x, y) {
  this.x = x; this.y = y;
}
Vector.prototype.plus = function(other) {
  return new Vector(this.x + other.x, this.y + other.y);
};
Vector.prototype.times = function(factor) {
  return new Vector(this.x * factor, this.y * factor);
};

var actorChars = {
  "@": Player,
  "o": Coin,
  "=": Lava, "|": Lava, "v": Lava
};

function Player(pos) {
  this.pos = pos.plus(new Vector(0, -0.5));
  this.size = new Vector(0.8, 1.5);
  this.speed = new Vector(0, 0);
}
Player.prototype.type = "player";

function Lava(pos, ch) {
  this.pos = pos;
  this.size = new Vector(1, 1);
  if (ch == "=") {
    this.speed = new Vector(2, 0);
  } else if (ch == "|") {
    this.speed = new Vector(0, 2);
  } else if (ch == "v") {
    this.speed = new Vector(0, 3);
    this.repeatPos = pos;
  }
}
Lava.prototype.type = "lava";

function Coin(pos) {
  this.basePos = this.pos = pos.plus(new Vector(0.2, 0.1));
  this.size = new Vector(0.6, 0.6);
  this.wobble = Math.random() * Math.PI * 2;
}
Coin.prototype.type = "coin";

var simpleLevel = new Level(simpleLevelPlan);

function elt(name, className) {
  var elt = document.createElement(name);
  if (className) elt.className = className;
  return elt;
}

function DOMDisplay(parent, level) {
  this.wrap = parent.appendChild(elt("div", "game"));
  this.level = level;

  this.wrap.appendChild(this.drawBackground());
  this.actorLayer = null;
  this.drawFrame();
}

var scale = 20;

DOMDisplay.prototype.drawBackground = function() {
  var table = elt("table", "background");
  table.style.width = this.level.width * scale + "px";
  this.level.grid.forEach(function(row) {
    var rowElt = table.appendChild(elt("tr"));
    rowElt.style.height = scale + "px";
    row.forEach(function(type) {
      rowElt.appendChild(elt("td", type));
    });
  });
  return table;
};

DOMDisplay.prototype.drawActors = function() {
  var wrap = elt("div");
  this.level.actors.forEach(function(actor) {
    var rect = wrap.appendChild(elt("div",
                                    "actor " + actor.type));
    rect.style.width = actor.size.x * scale + "px";
    rect.style.height = actor.size.y * scale + "px";
    rect.style.left = actor.pos.x * scale + "px";
    rect.style.top = actor.pos.y * scale + "px";
  });
  return wrap;
};

DOMDisplay.prototype.drawFrame = function() {
  if (this.actorLayer)
    this.wrap.removeChild(this.actorLayer);
  this.actorLayer = this.wrap.appendChild(this.drawActors());
  this.wrap.className = "game " + (this.level.status || "");
  this.scrollPlayerIntoView();
};

DOMDisplay.prototype.scrollPlayerIntoView = function() {
  var width = this.wrap.clientWidth;
  var height = this.wrap.clientHeight;
  var margin = width / 3;

  // The viewport
  var left = this.wrap.scrollLeft, right = left + width;
  var top = this.wrap.scrollTop, bottom = top + height;

  var player = this.level.player;
  var center = player.pos.plus(player.size.times(0.5))
                 .times(scale);

  if (center.x < left + margin)
    this.wrap.scrollLeft = center.x - margin;
  else if (center.x > right - margin)
    this.wrap.scrollLeft = center.x + margin - width;
  if (center.y < top + margin)
    this.wrap.scrollTop = center.y - margin;
  else if (center.y > bottom - margin)
    this.wrap.scrollTop = center.y + margin - height;
};

DOMDisplay.prototype.clear = function() {
  this.wrap.parentNode.removeChild(this.wrap);
};

Level.prototype.obstacleAt = function(pos, size) {
  var xStart = Math.floor(pos.x);
  var xEnd = Math.ceil(pos.x + size.x);
  var yStart = Math.floor(pos.y);
  var yEnd = Math.ceil(pos.y + size.y);

  if (xStart < 0 || xEnd > this.width || yStart < 0)
    return "wall";
  if (yEnd > this.height)
    return "lava";
  for (var y = yStart; y < yEnd; y++) {
    for (var x = xStart; x < xEnd; x++) {
      var fieldType = this.grid[y][x];
      if (fieldType) return fieldType;
    }
  }
};

Level.prototype.actorAt = function(actor) {
  for (var i = 0; i < this.actors.length; i++) {
    var other = this.actors[i];
    if (other != actor &&
        actor.pos.x + actor.size.x > other.pos.x &&
        actor.pos.x < other.pos.x + other.size.x &&
        actor.pos.y + actor.size.y > other.pos.y &&
        actor.pos.y < other.pos.y + other.size.y)
      return other;
  }
};

var maxStep = 0.05;

Level.prototype.animate = function(step, keys) {
  if (this.status != null)
    this.finishDelay -= step;
		
		

  while (step > 0) {
    var thisStep = Math.min(step, maxStep);
    this.actors.forEach(function(actor) {
      actor.act(thisStep, this, keys);
    }, this);
    step -= thisStep;
  }
};

Lava.prototype.act = function(step, level) {
  var newPos = this.pos.plus(this.speed.times(step));
  if (!level.obstacleAt(newPos, this.size))
    this.pos = newPos;
  else if (this.repeatPos)
    this.pos = this.repeatPos;
  else
    this.speed = this.speed.times(-1);
};

var wobbleSpeed = 8, wobbleDist = 0.07;

Coin.prototype.act = function(step) {
  this.wobble += step * wobbleSpeed;
  var wobblePos = Math.sin(this.wobble) * wobbleDist;
  this.pos = this.basePos.plus(new Vector(0, wobblePos));
};

var playerXSpeed = 7;

Player.prototype.moveX = function(step, level, keys) {
  this.speed.x = 0;
  if (keys.left) this.speed.x -= playerXSpeed;
  if (keys.right) this.speed.x += playerXSpeed;

  var motion = new Vector(this.speed.x * step, 0);
  var newPos = this.pos.plus(motion);
  var obstacle = level.obstacleAt(newPos, this.size);
  if (obstacle)
    level.playerTouched(obstacle);
  else
    this.pos = newPos;
};

var gravity = 30;
var jumpSpeed = 17;

Player.prototype.moveY = function(step, level, keys) {
  this.speed.y += step * gravity;
  var motion = new Vector(0, this.speed.y * step);
  var newPos = this.pos.plus(motion);
  var obstacle = level.obstacleAt(newPos, this.size);
  if (obstacle) {
    level.playerTouched(obstacle);
    if (keys.up && this.speed.y > 0)
      this.speed.y = -jumpSpeed;
    else
      this.speed.y = 0;
  } else {
    this.pos = newPos;
  }
};

Player.prototype.act = function(step, level, keys) {
  this.moveX(step, level, keys);
  this.moveY(step, level, keys);

  var otherActor = level.actorAt(this);
  if (otherActor)
    level.playerTouched(otherActor.type, otherActor);

  // Losing animation
  if (level.status == "lost") {
    this.pos.y += step;
    this.size.y -= step;
  }
};

Level.prototype.playerTouched = function(type, actor) {
  if (type == "lava" && this.status == null) {
    this.status = "lost";
    this.finishDelay = 1;
  } else if (type == "coin") {
    this.actors = this.actors.filter(function(other) {
      return other != actor;
    });
    if (!this.actors.some(function(actor) {
      return actor.type == "coin";
    })) {
      this.status = "won";
      this.finishDelay = 1;
    }
  }
};

var arrowCodes = {37: "left", 38: "up", 39: "right"};
var escCodes = {40:"escape"};
function trackKeys(codes) {
  var pressed = Object.create(null);
  function handler(event) {
    if (codes.hasOwnProperty(event.keyCode)) {
      var down = event.type == "keydown";
      pressed[codes[event.keyCode]] = down;
      event.preventDefault();
    }
  }
	var startX, startY;
	function touchTemp(event) {
	
				var nowX = event.touches[0].clientX;
				var nowY = event.touches[0].clientY;
				if(nowY - startY <= -20) {
					// 因为坐标系上(0, 0)在左上角，往下走，y会变成负的
					pressed["up"] = true;
					pressed["step"] = 0.05;
				}
				if(nowX - startX >= 10) {
					// 需要把另一个方向的设置为false，否则，先往左拖，再往右拖，则左右都为true，方块就不会水平移动了。
					pressed["left"] = false;
					pressed["right"] = true;
					pressed["step"] = 0.05;
				}
				else if(nowX - startX <= -10) {
					pressed["right"] = false;
					pressed["left"] = true;
					pressed["step"] = 0.05;
				}
				
			}
			addEventListener("touchmove", touchTemp);
			
			function touchStart(event) {
				console.log("startX = ");
				console.log(event.changedTouches[0].clientX);
				startX = event.changedTouches[0].clientX;
				startY = event.changedTouches[0].clientY;
			}
			
			function touchEnd(event) {
				console.log("endX = ");
				console.log(event.changedTouches[0].clientX);
				var endX = event.changedTouches[0].clientX;
				var endY = event.changedTouches[0].clientY;
				
				// 需要设置触摸结束时，把方向设为false，否则方块会一直动。
				pressed["left"] = pressed["right"] = pressed["up"] = false;
				
			}
			
			addEventListener("touchstart", touchStart);
			addEventListener("touchend", touchEnd);
			
// 	function touch(event) {
// 		if (codes.hasOwnProperty(event.keyCode)) {
// 		  var down = event.type == "touchstart";
// 		  pressed[codes[event.keyCode]] = down;
// 		  event.preventDefault();
// 		}
// 	}
	
  addEventListener("keydown", handler);
  addEventListener("keyup", handler);
	// buttonLeft.addEventListener("touchend", null);
// 	addEventListener("touchstart", handler);
// 	addEventListener("touchend", handler);
  
  pressed.unregister = function() {
	  removeEventListener("keydown", handler);
	  removeEventListener("keyup", handler);
  }
	// pressed.touch = touch;
  return pressed;
}
// function escDeal(codes) {
// 	var pressed = Object.create(null);
// 	function handler(event) {
// 		if(codes.hasOwnProperty(event.keyCode)) {
// 			var down = event.type == "keydown";
// 			event.preventDefault();
// 			pressed[codes[event.keyCode]] = down;
// 		}
// 	}
// 	addEventListener("keydown", handler);
// 	addEventListener("keyup", handler);
// }
function runAnimation(frameFunc) {
  var lastTime = null;
  function frame(time) {
    var stop = false;
    if (lastTime != null) {
      var timeStep = Math.min(time - lastTime, 100) / 1000;
      stop = frameFunc(timeStep) === false;
    }
    lastTime = time;
    if (!stop)
      requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

var arrows = trackKeys(arrowCodes);
// var esc = escDeal(escCodes);

function runLevel(level, Display, andThen) {
  var display = new Display(document.body, level);
  var running = "yes";
  
  function animation(step) {
	  if(running == "pausing") {
		  running = "no";
		  return false;
	  }
	  
	  level.animate(step, arrows);
	  display.drawFrame(step);
	  if(level.isFinished()) {
		  display.clear();
		  
		  removeEventListener("keydown", pause);
		  arrows.unregister();
		  if(andThen) {
			  andThen(level.status);
		  }
		  return false;
	  }
  }
  
  function pause(event) {
	  if(event.keyCode == 27) {
		  if(running == "no") {
			  running = "yes";
			  runAnimation(animation);
		  }
		  else if(running == "pausing") {
			  running = "yes";
		  }
		  else if(running == "yes") {
			  running = "pausing";
		  }
	  }
  }
  addEventListener("keydown", pause);
	
	
  var arrows = trackKeys(arrowCodes);
  
  runAnimation(animation);
//   runAnimation(function(step) {
//     level.animate(step, arrows);
//     display.drawFrame(step);
//     if (level.isFinished()) {
//       display.clear();
//       if (andThen)
//         andThen(level.status);
//       return false;
//     }
//   });
}

// function runGame(plans, Display) {
//   function startLevel(n) {
//     runLevel(new Level(plans[n]), Display, function(status) {
//       if (status == "lost")
//         startLevel(n);
//       else if (n < plans.length - 1)
//         startLevel(n + 1);
//       else
//         console.log("You win!");
//     });
//   }
//   startLevel(0);
// }

function runGame(plans, Display) {
	// var life = this.remain;
	// console.log(this)
	// console.log(window.app)
	// console.log(this.app.remain);
  function startLevel(n) {
    // ---第18章---记录开始时间，以便最后给玩家积分
    var timeStart = new Date().getTime();

    runLevel(new Level(plans[n]), Display, function(status) {
		// console.log("remain " + this.app.remain);
	if (status == "lost") {
		console.log("remain " + this.app.remain);
		console.log("level = " + n);
		this.app.remain -= 1;
		if(this.app.remain > 0) {
			startLevel(n);
		}
		else {
      var oldScore = localStorage.getItem("score");
      if(oldScore == undefined || this.app.score >= oldScore) {
        localStorage.setItem("score", this.app.score);
      }
      alert("You lose\nfinal score: " + this.app.score);
      console.log("You lose\nfinal score: " + this.app.score);
      // 给玩家记录积分，如果这次得分更高，则记录新的得分。
      
      this.app.score = 0;
			this.app.remain = 3;
			startLevel(0);
		}
	} 
	else if (n < plans.length - 1) {
    var timeEnd = new Date().getTime();
    // 剩余时间分数为 关卡序数*1000 - n * 0.1 (秒) + 100，每消耗0.1秒，分数-1，如果时间用完了，则分数为100
    // 第1关满分为1100，第2关为2100，依此类推（当然满分是不可能的，因为不可能用0秒通关）
    // 由于要设置暂停时计算得分太麻烦了(其实是因为技术和时间不够)，所以暂停时，时间分数也会减少。
    var timeLeftScore = Math.floor(1000 * (n + 1) + (timeStart - timeEnd) / 1000 * 10) + 100;
    if(timeLeftScore < 100) timeLeftScore = 100;
    // 每次闯关成功，获得的分数为 剩余时间分数 * 关卡序数 * 剩余生命数，把它加到vue的变量里
    this.app.score += timeLeftScore * (n+1) * this.app.remain;
    startLevel(n + 1);

  }
	else {
    var timeEnd = new Date().getTime();
    var timeLeftScore = Math.floor(1000 * (n + 1) + (timeStart - timeEnd) / 1000 * 10) + 100;
    if(timeLeftScore < 100) timeLeftScore = 100;
    // 每次闯关成功，获得的分数为 剩余时间 * 关卡序数 * 剩余生命数，把它加到vue的变量里
    this.app.score += timeLeftScore * (n+1) * this.app.remain;
    var oldScore = localStorage.getItem("score");
    if(oldScore == undefined || this.app.score >= oldScore) {
      localStorage.setItem("score", this.app.score);
    }
    console.log("You win!\nfinal score: " + this.app.score);
    alert("You win!\nfinal score: " + this.app.score);
    this.app.score = 0;

    window.location.href = "login.html";
  }
		
    });
  }
  startLevel(0);
}