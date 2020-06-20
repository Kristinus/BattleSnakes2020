const bodyParser = require('body-parser')
const express = require('express')
const Graph = require('./astar').Graph
const astar = require('./astar').astar


const PORT = process.env.PORT || 3000

const app = express()
app.use(bodyParser.json())

app.get('/', handleIndex)
app.post('/start', handleStart)
app.post('/move', handleMove)
app.post('/end', handleEnd)

app.listen(PORT, () => console.log(`Battlesnake Server listening at http://127.0.0.1:${PORT}`))

class Board {
  constructor(data, me) {
    this.actions = {up:{x:0, y:+1}, down:{x:0, y:-1}, left:{x:-1, y:0}, right:{x:+1, y:0}};
    this.height = data.height;
    this.width = data.width;
    this.food = data.food;
    this.snakes = data.snakes;
    this.shout = '';
    // init board with border
    this.board = [...Array(this.height)].map((e,i) => {
        return Array(this.width).fill(1);
    });
    // add snakes
    for(const snake of this.snakes) {
      for(const pos of snake.body) {
        this.board[pos.x][pos.y] = 0;
      }
      // Add possible move to snake tails
      const pos = snake.body[snake.body.length-1];
      this.board[pos.x][pos.y] = 3;
      // Add higher weight to larger snake possible moves
      if(snake.id != me.id && snake.length >= me.length) {
        for(const action in this.actiona) {
          const dir = this.actions[action];
          const newPos = this.getPos(coord, dir);
          if(this.board[newPos.x][newPos.y] >= 1) {
            this.board[newPos.x][newPos.y] += 4;
          }
        }
      }
    }
    // add food
    // for(const pos of this.food) {
    //   this.board[pos.x][pos.y] = 1;
    // }

    this.graph = new Graph(this.board);
  }

  // Is valid space on board
  isValid(coord) {
    if(coord.x < 0 || coord.y < 0 || coord.x >= this.height || coord.y >= this.width) {
      return false;
    }
    if(this.board[coord.x][coord.y] == 0) {
      return false;
    }
    return true;
  }

  getPos(coord, dir) {
    return {x: coord.x+dir.x, y:coord.y+dir.y};
  }

  getDir(pos1, pos2) {
    const x = pos2.x - pos1.x;
    const y = pos2.y - pos1.y;
    for(const move in this.actions) {
      const dir = this.actions[move];
      if(dir.x == x && dir.y == y) {
        return move;
      }
    }
  }

  getDistance(pos1, pos2) {
    var d1 = Math.abs(pos2.x - pos1.x);
    var d2 = Math.abs(pos2.y - pos1.y);
    return d1 + d2;
  }

  getMoveTo(pos1, pos2) {
    // A* algorithm from pos1 to pos2
    const start = this.graph.grid[pos1.x][pos1.y];
    const end = this.graph.grid[pos2.x][pos2.y];
    const result = astar.search(this.graph, start, end);
    if(result[0]) {
      if(result.length == 1) {
        this.shout = `ATE_FOOD ${start} --> ${end}`;
      }
      else {
        this.shout = `${start} --> ${end}`;
      }
      return this.getDir(pos1, result[0]);
    }
  }

  getMoveToFood(coord) {
    // Go to nearest food
    let _nearest;
    let minDist = Number.MAX_SAFE_INTEGER;
    for(const pos of this.food) {
      if(this.board[pos.x][pos.y] == 1) {
        const dist = this.getDistance(coord, pos);
        if(dist < minDist) {
          minDist = dist;
          _nearest = pos;
        }
      }
    }
    
    if(_nearest) {
      const move = this.getMoveTo(coord, _nearest);
      return move;
    }
  }
  
  getBestMove(snake) {
    let move = this.getMoveToFood(snake.head);
    if(move) {
      return move;
    }
    // If no path to nearest food
    // Conservative mode - follow tail
    const tail = snake.body[snake.body.length-1];
    move = this.getMoveTo(snake.head, tail);
    if(move) {
      return move;
    }

    const possibleMoves = [];
    for(const move in this.actions) {
      const dir = this.actions[move];
      const newPos = this.getPos(coord, dir);
      // Check if valid move
      if (this.isValid(newPos)) {
        possibleMoves.push(move);

        // Check if beside food
        for(const pos of this.food) {
          if(newPos.x == pos.x && newPos.y == pos.y) {
            return move;
          }
        }
      }
    }
    console.log(possibleMoves);
    move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)]
    this.shout = `${move}`;
    return move;
  }
}

class Snake {
  constructor(data) {
    this.health = data.health;
    this.body = data.body;
    this.head = data.head;
    this.length = data.length;
  }
}


function handleIndex(request, response) {
  const battlesnakeInfo = {
    apiversion: '1',
    author: 'Kristinus',
    color: '#262626',
    head: 'shac-gamer',
    tail: 'shac-mouse'
  }
  response.status(200).json(battlesnakeInfo)
}

function handleStart(request, response) {
  const data = request.body
  console.log(data.game.id);
  

  console.log('START')
  response.status(200).send('ok')
}

function handleMove(request, response) {
  const data = request.body
  const snake = new Snake(data.you);
  const board = new Board(data.board, snake);
  
  const move = board.getBestMove(snake);

  const shout = board.shout;

  console.log(`${data.turn}: MOVE: ${move}, \tSHOUT: ${board.shout}`);
  response.status(200).send({
    move: move,
    shout: shout
  })
}

function handleEnd(request, response) {
  const data = request.body
  console.log(`${data.game.id}\n${data.turn}: ${data.you.shout}`);

  console.log('END')
  response.status(200).send('ok')
}