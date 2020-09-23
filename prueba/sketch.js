
 

function addScreenPositionFunction(p5Instance) {
  let p = p5Instance || this;

  // find out which context we're in (2D or WEBGL)
  const R_2D = 0;
  const R_WEBGL = 1;
  let context = getObjectName(p._renderer.drawingContext).search("2D") >= 0 ? R_2D : R_WEBGL;

  // the stack to keep track of matrices when using push and pop
  if (context == R_2D) {
    p._renderer.matrixStack = [new p5.Matrix()];
  }

  // replace all necessary functions to keep track of transformations

  if (p.draw instanceof Function) {
    let drawNative = p.draw;
    p.draw = function(...args) {
      if (context == R_2D) p._renderer.matrixStack = [new p5.Matrix()];
      drawNative.apply(p, args);
    };
  }


  if (p.resetMatrix instanceof Function) {
    let resetMatrixNative = p.resetMatrix;
    p.resetMatrix = function(...args) {
      if (context == R_2D) p._renderer.matrixStack = [new p5.Matrix()];
      resetMatrixNative.apply(p, args);
    };
  }

  if (p.translate instanceof Function) {
    let translateNative = p.translate;
    p.translate = function(...args) {
      if (context == R_2D) last(p._renderer.matrixStack).translate(args);
      translateNative.apply(p, args);
    };
  }

  if (p.rotate instanceof Function) {
    let rotateNative = p.rotate;
    p.rotate = function(...args) {
      if (context == R_2D) {
        let rad = p._toRadians(args[0]);
        last(p._renderer.matrixStack).rotateZ(rad);
      }
      rotateNative.apply(p, args);
    };
  }

  if (p.rotateX instanceof Function) {
    let rotateXNative = p.rotateX;
    p.rotateX = function(...args) {
      if (context == R_2D) {
        let rad = p._toRadians(args[0]);
        last(p._renderer.matrixStack).rotateX(rad);
      }
      rotateXNative.apply(p, args);
    };
  }
  if (p.rotateY instanceof Function) {
    let rotateYNative = p.rotateY;
    p.rotateY = function(...args) {
      if (context == R_2D) {
        let rad = p._toRadians(args[0]);
        last(p._renderer.matrixStack).rotateY(rad);
      }
      rotateYNative.apply(p, args);
    };
  }
  if (p.rotateZ instanceof Function) {
    let rotateZNative = p.rotateZ;
    p.rotateZ = function(...args) {
      if (context == R_2D) {
        let rad = p._toRadians(args[0]);
        last(p._renderer.matrixStack).rotateZ(rad);
      }
      rotateZNative.apply(p, args);
    };
  }

  if (p.scale instanceof Function) {
    let scaleNative = p.scale;
    p.scale = function(...args) {
      if (context == R_2D) {
        let m = last(p._renderer.matrixStack);
        let sx = args[0];
        let sy = args[1] || sx;
        let sz = context == R_2D ? 1 : args[2];
        m.scale([sx, sy, sz]);
      }
      scaleNative.apply(p, args);
    };
  }

  // Help needed: don't know what transformation matrix to use 
  // Solved: Matrix multiplication had to be in reversed order. 
  // Still, this looks like it could be simplified.

  if (p.shearX instanceof Function) {
    let shearXNative = p.shearX;
    p.shearX = function(...args) {
      if (context == R_2D) {
        let rad = p._toRadians(args[0]);
        let stack = p._renderer.matrixStack;
        let m = last(stack);
        let sm = new p5.Matrix();
        sm.mat4[4] = Math.tan(rad);
        sm.mult(m);
        stack[stack.length - 1] = sm;
      }
      shearXNative.apply(p, args);
    };
  }

  if (p.shearY instanceof Function) {
    let shearYNative = p.shearY;
    p.shearY = function(...args) {
      if (context == R_2D) {
        let rad = p._toRadians(args[0]);
        let stack = p._renderer.matrixStack;
        let m = last(stack);
        let sm = new p5.Matrix();
        sm.mat4[1] = Math.tan(rad);
        sm.mult(m);
        stack[stack.length - 1] = sm;
      }
      shearYNative.apply(p, args);
    };
  }


  if (p.applyMatrix instanceof Function) {
    let applyMatrixNative = p.applyMatrix;
    p.applyMatrix = function(...args) {
      if (context == R_2D) {
        let stack = p._renderer.matrixStack;
        let m = last(stack);
        let sm = new p5.Matrix();
        sm.mat4[0] = args[0];
        sm.mat4[1] = args[1];
        sm.mat4[4] = args[2];
        sm.mat4[5] = args[3];
        sm.mat4[12] = args[4];
        sm.mat4[13] = args[5];
        sm.mult(m);
        stack[stack.length - 1] = sm;
      }
      applyMatrixNative.apply(p, args);
    };
  }


  if (p.push instanceof Function) {
    let pushNative = p.push;
    p.push = function(...args) {
      if (context == R_2D) {
        let m = last(p._renderer.matrixStack);
        p._renderer.matrixStack.push(m.copy());
      }
      pushNative.apply(p, args);
    };
  }
  if (p.pop instanceof Function) {
    let popNative = p.pop;
    p.pop = function(...args) {
      if (context == R_2D) p._renderer.matrixStack.pop();
      popNative.apply(p, args);
    };
  }



  p.screenPosition = function(x, y, z) {
    if (x instanceof p5.Vector) {
      let v = x;
      x = v.x;
      y = v.y;
      z = v.z;
    } else if (x instanceof Array) {
      let rg = x;
      x = rg[0];
      y = rg[1];
      z = rg[2] || 0;
    }
    z = z || 0;

    if (context == R_2D) {
      let m = last(p._renderer.matrixStack);
      // probably not needed:
      // let mInv = (new p5.Matrix()).invert(m);

      let v = p.createVector(x, y, z);
      let vCanvas = multMatrixVector(m, v);
      // console.log(vCanvas);
      return vCanvas;

    } else {
      let v = p.createVector(x, y, z);

      // Calculate the ModelViewProjection Matrix.
      let mvp = (p._renderer.uMVMatrix.copy()).mult(p._renderer.uPMatrix);

      // Transform the vector to Normalized Device Coordinate.
      let vNDC = multMatrixVector(mvp, v);

      // Transform vector from NDC to Canvas coordinates.
      let vCanvas = p.createVector();
      vCanvas.x = 0.5 * vNDC.x * p.width;
      vCanvas.y = 0.5 * -vNDC.y * p.height;
      vCanvas.z = 0;

      return vCanvas;
    }

  }


  // helper functions ---------------------------

  function last(arr) {
    return arr[arr.length - 1];
  }

  function getObjectName(obj) {
    var funcNameRegex = /function (.{1,})\(/;
    var results = (funcNameRegex).exec((obj).constructor.toString());
    return (results && results.length > 1) ? results[1] : "";
  };


  /* Multiply a 4x4 homogeneous matrix by a Vector4 considered as point
   * (ie, subject to translation). */
  function multMatrixVector(m, v) {
    if (!(m instanceof p5.Matrix) || !(v instanceof p5.Vector)) {
      print('multMatrixVector : Invalid arguments');
      return;
    }

    var _dest = p.createVector();
    var mat = m.mat4;

    // Multiply in column major order.
    _dest.x = mat[0] * v.x + mat[4] * v.y + mat[8] * v.z + mat[12];
    _dest.y = mat[1] * v.x + mat[5] * v.y + mat[9] * v.z + mat[13];
    _dest.z = mat[2] * v.x + mat[6] * v.y + mat[10] * v.z + mat[14];
    var w = mat[3] * v.x + mat[7] * v.y + mat[11] * v.z + mat[15];

    if (Math.abs(w) > Number.EPSILON) {
      _dest.mult(1.0 / w);
    }

    return _dest;
  }

}




/////////////////////////////////////////////////////////////////////////////////

var easycam1, easycam2;
let graphics1;


var rsz = 50;

let modelo;
let modeloPieza;
let modeloPieza0;


let pg0;
let state = 0;
let gPoint0;
let gPoint2;
let gPoint3;
let gPoint4;
let gPoint8;



let gui;
var penColor = ['red','green','blue','black'];
var pen = false;
var penSize = 1;

var botonSz = 10;

function preload() {
  modelo = loadModel("cnctest.obj");
  modeloPieza = loadModel("cortadorr.obj");
  modeloPieza0 = loadModel("cnctest1.obj");
  camaejey = loadModel("camaejey.obj");
  cosoejey = loadModel("cosoejey.obj");
  cosoejex1 = loadModel("cosoejex1.obj");
  cosoejex2 = loadModel("cosoejexdos.obj");
  cosoejez1 = loadModel("cosoejez1.obj");
  cosoejez2 = loadModel("cosoejez2.obj");
}




function setup() {

  pixelDensity(2);

  var canvas = createCanvas(windowWidth, windowHeight);

  var w = Math.ceil(windowWidth);
  var h = windowHeight;
  
  graphics1 = createGraphics(w, h, WEBGL)
  pg0 = createGraphics(windowWidth,windowHeight);

  addScreenPositionFunction(graphics1);





  easycam1 = new Dw.EasyCam(graphics1._renderer, {distance : 350});
  easycam1.setDistanceMin(10);
  easycam1.setDistanceMax(3000);

  easycam1.attachMouseListeners(this._renderer);


  easycam1.IDX = 0;

  easycam1.setViewport([0,0,w,h]);

  gui = createGui();
  gui.addGlobals('pen','penColor','penSize');


} 



function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  var w = Math.ceil(windowWidth);
  var h = windowHeight;

  easycam1.renderer.resize(w,h);

  easycam1.graphics.width  = w;
  easycam1.graphics.height = h;

  easycam1.setViewport([0,0,w,h]);

}



function draw(){
  background(75);

  displayScene(easycam1);
  displayResult_P2D();


}




function displayResult_P2D(){
  var vp1 = easycam1.getViewport();
  
  image(easycam1.graphics, vp1[0], vp1[1], vp1[2], vp1[3]);


 if(state === 0){






  noStroke();
  push();
  translate(width/2, height/2);
  const gPoint = graphics1.screenPosition(-180, -50, 100);
  fill(255,0,0);
  ellipse(gPoint.x, gPoint.y, botonSz,botonSz);

  var d = dist(gPoint.x, gPoint.y,mouseX-width/2,mouseY-height/2);

  if(d <= botonSz){
    fill(255,0,0,200);
    var sz01 = 250;
    var sz02 = sz01/2;

    strokeWeight(1);
    stroke(0,50);
    rect(width/2-sz01,-height/2+25,sz01-25,sz02+sz01,10);
    textSize(15);
    fill(0);
    textAlign(LEFT);
    text("Control: ",width/2-sz01+5,-height/2+25+5, sz01-25, sz02+sz01);

    fill(255,0,0,200);
  }else{
    fill(200,200);
  }
  
  strokeWeight(1);
  stroke(0,50);
  rect(gPoint.x, gPoint.y,rsz*1.5,rsz/2,15);
  textSize(15);
  fill(0);
  textAlign(LEFT);
  text("Control",gPoint.x+10, gPoint.y+5, rsz, rsz);
  pop();


  push();
  translate(width/2, height/2);
  gPoint0 = graphics1.screenPosition(-110, 0, 60);
  fill(255,0,0);
  ellipse(gPoint0.x, gPoint0.y, botonSz,botonSz);

  var d0 = dist(gPoint0.x, gPoint0.y,mouseX-width/2,mouseY-height/2);

  if(d0 <= botonSz){
    fill(255,0,0,200);
    var sz01 = 250;
    var sz02 = sz01/2;

    strokeWeight(1);
    stroke(0,50);
    rect(width/2-sz01,-height/2+25,sz01-25,sz02+sz01,10);
    textSize(15);
    fill(0);
    textAlign(LEFT);
    text("Spindle: ",width/2-sz01+5,-height/2+25+5, sz01-25, sz02+sz01);

    fill(255,0,0,200);
  }else{
    fill(200,200);
  }

  strokeWeight(1);
  stroke(0,50);
  rect(gPoint0.x, gPoint0.y,rsz*1.5,rsz/2,15);
  textSize(15);
  fill(0);
  textAlign(LEFT);
  text("Spindle",gPoint0.x+10, gPoint0.y+5, rsz, rsz);
  pop();


  push();
  translate(width/2, height/2);
  const gPoint1 = graphics1.screenPosition(0, 15, 0);
  fill(255,0,0);
  ellipse(gPoint1.x, gPoint1.y, botonSz,botonSz);

  var d1 = dist(gPoint1.x, gPoint1.y,mouseX-width/2,mouseY-height/2);

  if(d1 <= botonSz){
    fill(255,0,0,200);
    var sz01 = 250;
    var sz02 = sz01/2;

    strokeWeight(1);
    stroke(0,50);
    rect(width/2-sz01,-height/2+25,sz01-25,sz02+sz01,10);
    textSize(15);
    fill(0);
    textAlign(LEFT);
    text("Cama: ",width/2-sz01+5,-height/2+25+5, sz01-25, sz02+sz01);

    fill(255,0,0,200);
  }else{
    fill(200,200);
  }

  strokeWeight(1);
  stroke(0,50);
  rect(gPoint1.x, gPoint1.y,rsz*1.5,rsz/2,15);
  textSize(15);
  fill(0);
  textAlign(LEFT);
  text("Cama",gPoint1.x+10, gPoint1.y+5, rsz, rsz);
  pop();




  push();
  translate(width/2, height/2);
  gPoint4 = graphics1.screenPosition(-90, 25, 100);
  fill(255,0,0);
  ellipse(gPoint4.x, gPoint4.y, botonSz,botonSz);



  var d2 = dist(gPoint4.x, gPoint4.y,mouseX-width/2,mouseY-height/2);

  if(d2 <= botonSz){
    fill(255,0,0,200);
    var sz01 = 250;
    var sz02 = sz01/2;

    strokeWeight(1);
    stroke(0,50);
    rect(width/2-sz01,-height/2+25,sz01-25,sz02+sz01,10);
    textSize(15);
    fill(0);
    textAlign(LEFT);
    text("Eje Y: ",width/2-sz01+5,-height/2+25+5, sz01-25, sz02+sz01);

    fill(255,0,0,200);
  }else{
    fill(200,200);
  }

  strokeWeight(1);
  stroke(0,50);
  rect(gPoint4.x, gPoint4.y,rsz*1.5,rsz/2,15);
  textSize(15);
  fill(0);
  textAlign(LEFT);
  text("Eje Y",gPoint4.x+10, gPoint4.y+5, rsz, rsz);
  pop();

  push();
  translate(width/2, height/2);
  gPoint3 = graphics1.screenPosition(-90, -25, -25);
  fill(255,0,0);
  ellipse(gPoint3.x, gPoint3.y, botonSz,botonSz);

    var d3 = dist(gPoint3.x, gPoint3.y,mouseX-width/2,mouseY-height/2);

  if(d3 <= botonSz){
    fill(255,0,0,200);
    var sz01 = 250;
    var sz02 = sz01/2;

    strokeWeight(1);
    stroke(0,50);
    rect(width/2-sz01,-height/2+25,sz01-25,sz02+sz01,10);
    textSize(15);
    fill(0);
    textAlign(LEFT);
    text("Eje X: ",width/2-sz01+5,-height/2+25+5, sz01-25, sz02+sz01);

    fill(255,0,0,200);
  }else{
    fill(200,200);
  }
  strokeWeight(1);
  stroke(0,50);
  rect(gPoint3.x, gPoint3.y,rsz*1.5,rsz/2,15);
  textSize(15);
  fill(0);
  textAlign(LEFT);
  text("Eje X",gPoint3.x+10, gPoint3.y+5, rsz, rsz);
  pop();




  push();
  translate(width/2, height/2);
  gPoint8 = graphics1.screenPosition(100, 15, 0);
  fill(255,0,0);
  ellipse(gPoint8.x, gPoint8.y, botonSz,botonSz);

    var d4 = dist(gPoint8.x, gPoint8.y,mouseX-width/2,mouseY-height/2);

  if(d4 <= botonSz){
    fill(255,0,0,200);
    var sz01 = 250;
    var sz02 = sz01/2;

    strokeWeight(1);
    stroke(0,50);
    rect(width/2-sz01,-height/2+25,sz01-25,sz02+sz01,10);
    textSize(15);
    fill(0);
    textAlign(LEFT);
    text("Ejes (x,y,z): ",width/2-sz01+5,-height/2+25+5, sz01-25, sz02+sz01);

    fill(255,0,0,200);
  }else{
    fill(200,200);
  }
  strokeWeight(1);
  stroke(0,50);
  rect(gPoint8.x, gPoint8.y,rsz*1.5,rsz,15);
  textSize(15);
  fill(0);
  textAlign(LEFT);
  text("Ejes (x,y,z)",gPoint8.x+10, gPoint8.y+5, rsz, rsz);
  pop();


}

if(state === 1){

  push();
  translate(width/2, height/2);
  gPoint2 = graphics1.screenPosition(-75, 340, 40);
  fill(255,0,0);
  ellipse(gPoint2.x, gPoint2.y, botonSz,botonSz);

  var d4 = dist(gPoint2.x, gPoint2.y,mouseX-width/2,mouseY-height/2);

  if(d4 <= botonSz){
    fill(255,0,0,200);
    var sz01 = 250;
    var sz02 = sz01/2;

    strokeWeight(1);
    stroke(0,50);
    rect(width/2-sz01,-height/2+25,sz01-25,sz02+sz01,10);
    textSize(15);
    fill(0);
    textAlign(LEFT);
    text("Cortador: ",width/2-sz01+5,-height/2+25+5, sz01-25, sz02+sz01);

    fill(255,0,0,200);
  }else{
    fill(200,200);
  }
  strokeWeight(1);
  stroke(0,50);
  rect(gPoint2.x, gPoint2.y,rsz*1.5,rsz/2,15);
  textSize(15);
  fill(0);
  textAlign(LEFT);
  text("Cortador",gPoint2.x+10, gPoint2.y+5, rsz, rsz);
  pop();



  push();
  translate(width/2, height/2);
  gPoint5 = graphics1.screenPosition(-25, -75, -25);
  fill(255,0,0);
  ellipse(gPoint5.x, gPoint5.y, botonSz,botonSz);

  var d5 = dist(gPoint5.x, gPoint5.y,mouseX-width/2,mouseY-height/2);

  if(d5 <= botonSz){
    fill(255,0,0,200);
    var sz01 = 250;
    var sz02 = sz01/2;

    strokeWeight(1);
    stroke(0,50);
    rect(width/2-sz01,-height/2+25,sz01-25,sz02+sz01,10);
    textSize(15);
    fill(0);
    textAlign(LEFT);
    text("Eje Z: ",width/2-sz01+5,-height/2+25+5, sz01-25, sz02+sz01);

    fill(255,0,0,200);
  }else{
    fill(200,200);
  }

  strokeWeight(1);
  stroke(0,50);
  rect(gPoint5.x, gPoint5.y,rsz*1.5,rsz/2,15);
  textSize(15);
  fill(0);
  textAlign(LEFT);
  text("Eje Z",gPoint5.x+10, gPoint5.y+5, rsz, rsz);
  pop();

}


if(state === 2){
    var sz01 = 250;
    var sz02 = sz01/2;
    push();
    translate(width/2, height/2);
    strokeWeight(1);
    stroke(0,50);
    rect(width/2-sz01,-height/2+25,sz01-25,sz02+sz01,10);
    textSize(15);
    fill(0);
    textAlign(LEFT);
    text("Cortador: ",width/2-sz01+5,-height/2+25+5, sz01-25, sz02+sz01);
    pop();
}


if(state === 3){
    var sz01 = 250;
    var sz02 = sz01/2;
    push();
    translate(width/2, height/2);
    strokeWeight(1);
    stroke(0,50);
    rect(width/2-sz01,-height/2+25,sz01-25,sz02+sz01,10);
    textSize(15);
    fill(0);
    textAlign(LEFT);
    text("Eje Y: ",width/2-sz01+5,-height/2+25+5, sz01-25, sz02+sz01);
    pop();
}

  
if(state === 4){
    var sz01 = 250;
    var sz02 = sz01/2;
    push();
    translate(width/2, height/2);
    strokeWeight(1);
    stroke(0,50);
    rect(width/2-sz01,-height/2+25,sz01-25,sz02+sz01,10);
    textSize(15);
    fill(0);
    textAlign(LEFT);
    text("Eje X: ",width/2-sz01+5,-height/2+25+5, sz01-25, sz02+sz01);
    pop();
}

if(state === 5){
    var sz01 = 250;
    var sz02 = sz01/2;
    push();
    translate(width/2, height/2);
    strokeWeight(1);
    stroke(0,50);
    rect(width/2-sz01,-height/2+25,sz01-25,sz02+sz01,10);
    textSize(15);
    fill(0);
    textAlign(LEFT);
    text("Eje Z: ",width/2-sz01+5,-height/2+25+5, sz01-25, sz02+sz01);
    pop();
}

if(state === 6){
    var sz01 = 250;
    var sz02 = sz01/2;
    push();
    translate(width/2, height/2);
    strokeWeight(1);
    stroke(0,50);
    rect(width/2-sz01,-height/2+25,sz01-25,sz02+sz01,10);
    textSize(15);
    fill(0);
    textAlign(LEFT);
    text("Ejes (x,y,z): ",width/2-sz01+5,-height/2+25+5, sz01-25, sz02+sz01);
    pop();
}


  fill(255,0,0);
  ellipse(20,20,15,15);

        switch(penColor) {
        case 'red':
        colVal = color(255,0,0);
        break;
         case 'green':
        colVal = color(0,255,0);
        break;
         case 'blue':
        colVal = color(0,0,255);
        break;
         case 'black':
        colVal = color(0);
        break;
    }


  if(pen == true){
    if(keyIsPressed){
      if(key === 'd'){
        pg0.background(255,0);
        pg0.strokeWeight(penSize);
        pg0.stroke(colVal);
        pg0.line(mouseX,mouseY,pmouseX,pmouseY);
    }
  }
    image(pg0,0,0);
}else{
    pg0.clear();
}



  if(keyIsPressed){
    if(key === '1'){
      textSize(50);
      textAlign(LEFT);
      fill(0);
      text("vista 1 guardada",width/2,height/2);
    }
      if(key === '2'){
      textSize(50);
      textAlign(LEFT);
      fill(0);
      text("vista 2 guardada",width/2,height/2);
    }
        if(key === '3'){
      textSize(50);
      textAlign(LEFT);
      fill(0);
      text("vista 1 ",width/2,height/2);
    }
      if(key === '4'){
      textSize(50);
      textAlign(LEFT);
      fill(0);
      text("vista 2 ",width/2,height/2);
      textAlign()
    }
  }


  

}


function mousePressed() {


  if (dist(mouseX, mouseY, width/2+gPoint0.x,height/2+gPoint0.y) < botonSz) {
    state = 1;
  }

    if (dist(mouseX, mouseY,  width/2+gPoint2.x,height/2+gPoint2.y) < botonSz) {
    state = 2;
  }

     if (dist(mouseX, mouseY,  width/2+gPoint4.x,height/2+gPoint4.y) < botonSz) {
    state = 3;
  }
     if (dist(mouseX, mouseY,  width/2+gPoint3.x,height/2+gPoint3.y) < botonSz) {
    state = 4;
  }
     if (dist(mouseX, mouseY,  width/2+gPoint5.x,height/2+gPoint5.y) < botonSz) {
    state = 5;
  }
       if (dist(mouseX, mouseY,  width/2+gPoint8.x,height/2+gPoint8.y) < botonSz) {
    state = 6;
  }



    if (dist(mouseX, mouseY, 20,20) < botonSz) {
    state = 0;
  }


}


var states;
var states0;

function keyReleased(){
  if(key == '1') states = easycam1.getState();
  if(key == '3') easycam1.setState(states, 2000);

  if(key == '2') states0 = easycam1.getState();
  if(key == '4') easycam1.setState(states0, 2000);
}







function displayResult_WEBGL(){
  var vp1 = easycam1.getViewport();
 
  resetMatrix();
  ortho(0, width, -height, 0, -Number.MAX_VALUE, +Number.MAX_VALUE);

  texture(easycam1.graphics);
  rect(vp1[0], vp1[1], vp1[2], vp1[3]);
}




function displayScene(cam){



  var pg = cam.graphics;
  
  var w = pg.width;
  var h = pg.height;
  
  var gray = 200;
  
  if(state === 0){
  pg.push();
  pg.translate(0,100,0);
  pg.rotateX(PI);
  pg.rotateY(PI+PI/2);
  pg.noStroke();
  pg.perspective(60 * PI/180, w/h, 1, 5000);
  if(cam.IDX == 0) pg.clear();


  pg.ambientLight(255);
  pg.pointLight(255,255,255,0,-100,100);
  pg.pointLight(255,255,255,0,-100,-100);
  pg.pointLight(255,255,255,0,0,200);
  pg.pointLight(255,255,255,0,0,-200);

  pg.strokeWeight(1);
  pg.stroke(0);
  pg.fill(100);
  pg.noStroke();
  pg.scale(100);
  pg.model(modelo);
  pg.pop();
}

  if(state === 1){
  pg.push();
  pg.translate(0,0,0);
  pg.rotateX(PI);
  pg.rotateY(PI+PI/2);
  pg.noStroke();
  pg.perspective(60 * PI/180, w/h, 1, 5000);
  if(cam.IDX == 0) pg.clear();


  pg.ambientLight(255);
  pg.pointLight(255,255,255,0,-100,100);
  pg.pointLight(255,255,255,0,-100,-100);
  pg.pointLight(255,255,255,0,0,200);
  pg.pointLight(255,255,255,0,0,-200);

  pg.strokeWeight(1);
  pg.stroke(0);
  pg.fill(100);
  pg.noStroke();
  pg.scale(900);
  pg.model(modeloPieza);
  pg.pop();
}  
if(state === 2){
  pg.push();
  pg.translate(0,0,0);
  pg.rotateX(PI);
  pg.rotateY(PI+PI/2);
  pg.noStroke();
  pg.perspective(60 * PI/180, w/h, 1, 5000);
  if(cam.IDX == 0) pg.clear();


  pg.ambientLight(255);
  pg.pointLight(255,255,255,0,-100,100);
  pg.pointLight(255,255,255,0,-100,-100);
  pg.pointLight(255,255,255,0,0,200);
  pg.pointLight(255,255,255,0,0,-200);

  pg.strokeWeight(1);
  pg.stroke(0);
  pg.fill(100);
  pg.noStroke();
  pg.scale(5);
  pg.model(modeloPieza0);
  pg.pop();
}



if(state === 3){
  pg.push();
  pg.translate(0,100,0);
  pg.rotateX(PI);
  pg.rotateY(PI+PI/2);
  pg.noStroke();
  pg.perspective(60 * PI/180, w/h, 1, 5000);
  if(cam.IDX == 0) pg.clear();


  pg.ambientLight(255);
  pg.pointLight(255,255,255,0,-100,100);
  pg.pointLight(255,255,255,0,-100,-100);
  pg.pointLight(255,255,255,0,0,200);
  pg.pointLight(255,255,255,0,0,-200);

  pg.strokeWeight(1);
  pg.stroke(0);
  pg.fill(100);
  pg.noStroke();
  pg.scale(100);
  pg.model(camaejey);

  var value00 = map(sin(frameCount*0.01),-1,1,-0.2,2);

  pg.translate(0,0,-value00);
  pg.model(cosoejey);

  pg.pop();

}

if(state === 4){
  pg.push();
  pg.translate(0,100,0);
  pg.rotateX(PI);
  pg.rotateY(PI+PI/2);
  pg.noStroke();
  pg.perspective(60 * PI/180, w/h, 1, 5000);
  if(cam.IDX == 0) pg.clear();


  pg.ambientLight(255);
  pg.pointLight(255,255,255,0,-100,100);
  pg.pointLight(255,255,255,0,-100,-100);
  pg.pointLight(255,255,255,0,0,200);
  pg.pointLight(255,255,255,0,0,-200);

  pg.strokeWeight(1);
  pg.stroke(0);
  pg.fill(100);
  pg.noStroke();
  pg.scale(100);
  pg.model(camaejey);
  pg.model(cosoejex1);

  var value00 = map(sin(frameCount*0.01),-1,1,-0.1,1);

  pg.translate(value00,0,0);
  pg.model(cosoejex2);

  pg.pop();

}
if(state === 5){
  pg.push();
  pg.translate(0,0,0);
  pg.rotateX(PI);
  pg.rotateY(PI+PI/2);
  pg.noStroke();
  pg.perspective(60 * PI/180, w/h, 1, 5000);
  if(cam.IDX == 0) pg.clear();


  pg.ambientLight(255);
  pg.pointLight(255,255,255,0,-100,100);
  pg.pointLight(255,255,255,0,-100,-100);
  pg.pointLight(255,255,255,0,0,200);
  pg.pointLight(255,255,255,0,0,-200);

  pg.strokeWeight(1);
  pg.stroke(0);
  pg.fill(100);
  pg.noStroke();
  pg.scale(900);
  pg.model(cosoejez1);

  var value00 = map(sin(frameCount*0.01),-1,1,0,0.1);

  pg.translate(0,value00,0);
  pg.model(cosoejez2);
  pg.pop();
}

if(state === 6){
  pg.push();
  pg.translate(0,100,0);
  pg.rotateX(PI);
  pg.rotateY(PI+PI/2);
  pg.noStroke();
  pg.perspective(60 * PI/180, w/h, 1, 5000);
  if(cam.IDX == 0) pg.clear();


  pg.ambientLight(255);
  pg.pointLight(255,255,255,0,-100,100);
  pg.pointLight(255,255,255,0,-100,-100);
  pg.pointLight(255,255,255,0,0,200);
  pg.pointLight(255,255,255,0,0,-200);

  pg.strokeWeight(1);
  pg.stroke(0);
  pg.fill(100);
  pg.noStroke();
  pg.scale(100);
  pg.model(camaejey);

  var value00 = map(sin(frameCount*0.01),-1,1,-0.7,1);
  var value11 = map(sin(frameCount*0.01),-1,1,-0.1,1);
  pg.translate(0,0,-value00);
  pg.model(cosoejex1);
  pg.translate(value11,0,0);
  pg.model(cosoejex2);
  pg.pop();

}


}





