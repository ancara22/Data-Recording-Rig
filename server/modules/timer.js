let timer;
let rigActive = false;

//Rig status check timer

//Switch rig status to offline
function timerHandler() {
  rigActive = false;
  console.log('Rig is not active!');
}

//Reset the timer
function resetTimer() {
  rigActive = true;
  clearTimeout(timer);
  timer = setTimeout(timerHandler, 5000);
}

//Initiate the timer
timer = setTimeout(timerHandler, 5000);


export { resetTimer, rigActive };
