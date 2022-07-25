var currentTab = 0; 
nextPrev(0);

function nextPrev(n){
  document.querySelector("#error").innerHTML="";
  var tabs = document.querySelectorAll(".tab");
  if (n == -1 && currentTab == 0){
    return;
  }
  if (n == 1 && currentTab == tabs.length - 1){
    document.getElementById('loadScreen').innerHTML="<div class=\"spinner-border text-primary\" role=\"status\"><span class=\"sr-only\"></span></div>";
    document.getElementById('loadText').innerHTML="Loading Solution";
    document.querySelector("#cubeForm").submit();
    return;
  }
  if (n == -1 && currentTab == tabs.length - 1){
    document.querySelector("#nextBtn").innerHTML = "Next";
  }
  tabs[currentTab].style.display = "none";
  clearSide();
  document.querySelectorAll(".step")[currentTab].style.opacity=0.5;
  currentTab+=n;
  tabs[currentTab].style.display = "block";
  document.querySelectorAll(".step")[currentTab].style.opacity=1;

  if (currentTab == tabs.length - 1){
    document.querySelector("#nextBtn").innerHTML = "Submit";
  }
}

function giveColor(x){
  switch(x){
      case 'y':   return "yellow"; break;
      case 'w':   return "white"; break;
      case 'r':   return "red"; break;
      case 'o':   return "orange"; break;
      case 'g':   return "green"; break;
      case 'b':   return "blue"; break;
  }
}

function checkSide(){
  var tabs = document.querySelectorAll(".tab");
  var side = tabs[currentTab].querySelector("input").value;
  side = side.toLowerCase();

  if (side.length != 9){
    document.querySelector("#error").innerHTML="Wrong input";
  }
  else{
    document.querySelector("#error").innerHTML="";
  }

  for(let i = 0; i < 9; i++){
    let id ='p'+(i+1).toString();
    let peice = document.getElementById(id);
    peice.innerHTML=side.substr(i,1);
    peice.setAttribute("style", "border-radius:10px; background-color:"+giveColor(side.substr(i,1))+";height:1.5cm;width:1.5cm");
}
}

function clearSide(){
  for(let i = 0; i < 9; i++){
    let id ='p'+(i+1).toString();
    let peice = document.getElementById(id);
    peice.innerHTML="";
    peice.setAttribute("style", "");
}
}