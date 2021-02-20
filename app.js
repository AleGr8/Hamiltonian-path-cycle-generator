const canvas = document.getElementById("canvas");
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const ctx = canvas.getContext("2d");

const DIR = {
  LEFT: 0,
  UP: 1,
  RIGHT: 2,
  DOWN: 3,
  UNDEFINED: -1
};
const DIR_VECTOR = [ //tells each direction the (x,y) to add to move there
  {
    x: -1,
    y: 0
  }, {
    x: 0,
    y: -1
  }, {
    x: 1,
    y: 0
  }, {
    x: 0,
    y: 1
  },
];

//---------------------------Paramethers-------------------------
const CELL_SIZE = 20;
const SHUFFLE_FACTOR = 5; //how much the path is scrambled (* grid size) (less than 5 is usually enough with small grid)
const type = "path" //path / cycle
//---------------------------------------------------------------

const nCellX = WIDTH / CELL_SIZE;
const nCellY = HEIGHT / CELL_SIZE;
console.log("width: " + WIDTH + "\t#cells: " + nCellX);
console.log("height: " + HEIGHT + "\t#cells: " + nCellY);
console.log("type : " + type);

if (nCellX !== Math.round(nCellX) || nCellY !== Math.round(nCellY))
  throw "!!ERROR!! the number of cells must be an integer";
if (nCellX % 2 !== 0)
  throw "!!ERROR!! the number of horizontal cells must be even";
if (type !== "cycle" && type !== "path")
  throw "!!ERROR!! type must be set to 'path' or 'cycle'";


let path = createRandomHamiltonian(type)
drawPath();

//-------------------------------------------------------------------


//main function
function createRandomHamiltonian(type) {
  // get simple cycle
  let path = createSimpleHamiltonianCycle(nCellX, nCellY);
  // select random point where to break the cycle and get an hamiltonian path
  let pathBegin = {
    x: Math.floor(Math.random() * nCellX),
    y: Math.floor(Math.random() * nCellY)
  };

  let pathEnd = goThatDirection(pathBegin, path[pathBegin.y][pathBegin.x].incomingDirection);


  path[pathBegin.y][pathBegin.x].incomingDirection = DIR.UNDEFINED;
  path[pathEnd.y][pathEnd.x].direction = DIR.UNDEFINED;
  //


  //------------------------now use Backbite algorithm to shuffle the path--------------------------

  for (let i = 0; i < nCellX * nCellX * SHUFFLE_FACTOR; i++) {

    //select one of the two ends
    pathBegin = (Math.random() < 0.5) ? pathBegin : pathEnd;
    pathEnd = correctPathDirections(path, pathBegin); //change direction/incomingDirection so that the flow is always from pathBegin to pathEnd

    //------------ choose one of the neighbour of pathbegin (not pathEnd nor a direction where it is already connected)
    let direction;
    let landing; //the coordinates of where the direction points
    let tries = 0;
    do {
      direction = Math.floor(Math.random() * 4);
      landing = goThatDirection(pathBegin, direction);
      tries++;
    } while (
      ((path[pathBegin.y][pathBegin.x].direction === direction) || //  there is already a connection
        (landing == null) || // direction lead outside of the grid
        (path[landing.y][landing.x].direction === DIR.UNDEFINED)) && // landing is pathEnd
      tries < 10);

    // if pathBegin is one corner it has only two neightbours. if it is already connected to one of them and the other is pathEnd,
    // the cycle will loop forever. in this situation just skip to another iteration and ,at some point, pathEnd will be selected
    // as pathbegin to avoid this
    if (!(tries < 10))
      continue;

    //-----------------------connect pathBegin and landing------------------------

    //connect right segment of pathBegin
    path[pathBegin.y][pathBegin.x].incomingDirection = direction;
    // connect right segment of landing: direction points to pathEnd and incomingDirection to pathBegin so changing incomingDirection
    //still gives a complete path
    pathBegin = goThatDirection(landing, path[landing.y][landing.x].incomingDirection); //update new pathBegin
    path[pathBegin.y][pathBegin.x].direction = DIR.UNDEFINED;
    path[landing.y][landing.x].incomingDirection = (direction + 2) % 4;
  }
  pathEnd = correctPathDirections(path, pathBegin);

  if (type === "path")
    return path;
  //-------------------------------------------------------------------------------------------------------------------------
  //---------------------------- AT THIS POINT 'path' IS A SHUFFLED HAMILTONIAN PATH ------------------------------------------
  //-------------------------------------------------------------------------------------------------------------------------

  // To get back to an Hamiltonian cycle, the algorithm tries to close the distance between pathBegin-pathEnd and eventually link them
  // together. it works exactly as before but now tries to choose a direction that decreses the distance between end/path
  for (let i = 0; i < nCellX * nCellX * SHUFFLE_FACTOR; i++) { //this number of iteration should be enough

    pathBegin = (Math.random() < 0.5) ? pathBegin : pathEnd;
    pathEnd = correctPathDirections(path, pathBegin);

    let direction;
    let landing;
    let tries = 0;
    do {
      direction = getBiasDirection(pathBegin, pathEnd); //now the choice is not uniform
      landing = goThatDirection(pathBegin, direction);
      tries++;
    } while (
      ((path[pathBegin.y][pathBegin.x].direction === direction) || //  there is already a connection
        (landing == null)) && // direction lead outside of the grid
      tries < 10);

    if (!(tries < 10))
      continue;

    if (path[landing.y][landing.x].direction === DIR.UNDEFINED) { //found the end!
      //connect the two
      path[pathBegin.y][pathBegin.x].incomingDirection = direction;
      path[pathEnd.y][pathEnd.x].direction = (direction + 2) % 4;
      break;
    }


    //-----------------------connect pathBegin and landing------------------------
    path[pathBegin.y][pathBegin.x].incomingDirection = direction;
    pathBegin = goThatDirection(landing, path[landing.y][landing.x].incomingDirection); //update new pathBegin
    path[pathBegin.y][pathBegin.x].direction = DIR.UNDEFINED;
    path[landing.y][landing.x].incomingDirection = (direction + 2) % 4;
  }

  //---------------------------------------

  if (path[pathBegin.y][pathBegin.x].direction === DIR.UNDEFINED || path[pathBegin.y][pathBegin.x].incomingDirection === DIR.UNDEFINED)
    pathEnd = correctPathDirections(path, pathBegin); //if loop failed to connect end and start (never happened to me)
  else //set (0,0) as start of the cycle
    pathEnd = correctPathDirections(path, {
      x: 0,
      y: 0
    });

  return path;
}

//choose a direction aiming to close the distance between start and end
function getBiasDirection(start, end) {
  let deltaX = end.x - start.x;
  let deltaY = end.y - start.x;
  if (deltaX > 0) //tries to go right
    return (Math.random() > 2 / 3) ? DIR.RIGHT : Math.floor(Math.random() * 4);
  else if (deltaX < 0) //bias toward left
    return (Math.random() > 2 / 3) ? DIR.LEFT : Math.floor(Math.random() * 4);

  if (deltaY > 0) //tries to go down
    return (Math.random() > 2 / 3) ? DIR.DOWN : Math.floor(Math.random() * 4);
  else if (deltaY < 0)
    return (Math.random() > 2 / 3) ? DIR.UP : Math.floor(Math.random() * 4);

  //it should never happen that both deltaX and deltaY are 0 but to be sure
  return Math.floor(Math.random() * 4);
}

// changes 'direction' and 'incomingDirection' of each cell in order to have the right flow starting from 'start'.
// Returns the end coordinates
function correctPathDirections(path, start) {
  //if start is the end, swap direction and incoming direction
  if (path[start.y][start.x].direction === DIR.UNDEFINED) {
    path[start.y][start.x].direction = path[start.y][start.x].incomingDirection;
    path[start.y][start.x].incomingDirection = DIR.UNDEFINED
  }
  //keep following the direction and swap when needed
  let current = start;
  let next;
  for (let i = 1; i < nCellX * nCellY; i++) {
    next = goThatDirection(current, path[current.y][current.x].direction)
    if (path[next.y][next.x].incomingDirection !== (path[current.y][current.x].direction + 2) % 4) {
      path[next.y][next.x].direction = path[next.y][next.x].incomingDirection;
      path[next.y][next.x].incomingDirection = (path[current.y][current.x].direction + 2) % 4;
    }
    current = next;
  }
  if (path[start.y][start.x].direction !== DIR.UNDEFINED && path[start.y][start.x].incomingDirection !== DIR.UNDEFINED)
    return; //this is done only at the end when I call the function with (0,0) and there is no need to set an endpoint

  path[current.y][current.x].direction = DIR.UNDEFINED;
  return current;
}

//returns the (x,y) coordinates when moving 'direction' from 'start'
function goThatDirection(start, direction) {
  let end = {
    x: start.x + DIR_VECTOR[direction].x,
    y: start.y + DIR_VECTOR[direction].y
  }
  if (end.x < 0 || end.y < 0 || end.x >= nCellX || end.y >= nCellY)
    return null;

  return end;
}



function drawPath() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  //--------------draw background
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#4D4D4D";
  for (var i = 0; i < nCellX; i += 2) {
    for (var j = 0; j < nCellY; j += 2)
      ctx.fillRect(CELL_SIZE * i, CELL_SIZE * j, CELL_SIZE, CELL_SIZE);

    for (var j = 0; j < nCellY; j += 2)
      ctx.fillRect(CELL_SIZE * (i + 1), CELL_SIZE * j + CELL_SIZE, CELL_SIZE, CELL_SIZE);

  }
  //-----------draw path
  ctx.fillStyle = "white";
  for (let row = 0; row < nCellY; row++) {
    for (let col = 0; col < nCellX; col++) {
      let cella = path[row][col];
      switch (cella.direction) {
        case DIR.LEFT:
          ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE + CELL_SIZE / 2 - 2, CELL_SIZE / 2 + 1, 4);
          break;
        case DIR.UP:
          ctx.fillRect(col * CELL_SIZE + CELL_SIZE / 2 - 2, row * CELL_SIZE, 4, CELL_SIZE / 2 + 1);
          break;
        case DIR.RIGHT:
          ctx.fillRect(col * CELL_SIZE + CELL_SIZE / 2 - 1, row * CELL_SIZE + CELL_SIZE / 2 - 2, CELL_SIZE / 2 + 1, 4);
          break;
        case DIR.DOWN:
          ctx.fillRect(col * CELL_SIZE + CELL_SIZE / 2 - 2, row * CELL_SIZE + CELL_SIZE / 2 - 1, 4, CELL_SIZE / 2 + 1);
          break;
      }
      switch (cella.incomingDirection) {
        case DIR.LEFT:
          ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE + CELL_SIZE / 2 - 2, CELL_SIZE / 2 + 1, 4);
          break;
        case DIR.UP:
          ctx.fillRect(col * CELL_SIZE + CELL_SIZE / 2 - 2, row * CELL_SIZE, 4, CELL_SIZE / 2 + 1);
          break;
        case DIR.RIGHT:
          ctx.fillRect(col * CELL_SIZE + CELL_SIZE / 2 - 1, row * CELL_SIZE + CELL_SIZE / 2 - 2, CELL_SIZE / 2 + 1, 4);
          break;
        case DIR.DOWN:
          ctx.fillRect(col * CELL_SIZE + CELL_SIZE / 2 - 2, row * CELL_SIZE + CELL_SIZE / 2 - 1, 4, CELL_SIZE / 2 + 1);
          break;
        case DIR.UNDEFINED: //then this is the start
          ctx.fillStyle = "lime";
          ctx.fillRect(col * CELL_SIZE + 6, row * CELL_SIZE + 6, 8, 8);
          ctx.fillStyle = "white";
          break;
      }
      if (cella.direction === DIR.UNDEFINED) { //then this is the end
        ctx.fillStyle = "red";
        ctx.fillRect(col * CELL_SIZE + CELL_SIZE / 2 - 4, row * CELL_SIZE + CELL_SIZE / 2 - 4, 8, 8);
        ctx.fillStyle = "white";
      }
    }
  }
}

//creates the "standard" hamiltonian cycle. the width must be even. each cell has a direction and an incomingDirection
function createSimpleHamiltonianCycle(nCellX, nCellY) {
  let path = [];
  for (let row = 0; row < nCellY; row++) {
    path[row] = [];
  }
  let row;
  for (let col = 0; col < nCellX;) {
    //go down the column
    for (row = 1; row < nCellY; row++) {
      path[row][col] = {
        direction: (row === nCellY - 1) ? DIR.RIGHT : DIR.DOWN,
        incomingDirection: (row === 1) ? DIR.LEFT : DIR.UP
      }
    }
    col++;
    //go back up
    for (row = nCellY - 1; row > 0; row--) {
      path[row][col] = {
        direction: (row === 1) ? DIR.RIGHT : DIR.UP,
        incomingDirection: (row === nCellY - 1) ? DIR.LEFT : DIR.DOWN
      }
    }
    col++
  }
  //adjust fist and last positions in second row
  path[1][nCellX - 1].direction = DIR.UP;
  path[1][0].incomingDirection = DIR.UP;

  //first row from right to left
  for (let col = nCellX - 1; col >= 0; col--) {
    path[0][col] = {
      direction: (col === 0) ? DIR.DOWN : DIR.LEFT,
      incomingDirection: (col === (nCellX - 1)) ? DIR.DOWN : DIR.RIGHT
    }
  }
  return path;
}