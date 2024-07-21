var currentpage = 0; 
document.addEventListener("DOMContentLoaded", function(){
    
    nextPrev(0);

    let peices = document.querySelectorAll(".peice");

    peices.forEach((peice) => {
        peice.addEventListener("click", () => {
            peices.forEach((peice) => {
                peice.classList.remove("active");
            });
            peice.classList.add("active");
            document.querySelectorAll(".palette").forEach((palette) => {
                if (palette.classList.contains("active-color")){
                    peice.style.backgroundColor = palette.style.backgroundColor;
                }
            })
        });
    });

    document.querySelectorAll(".palette").forEach((palette) => {
        palette.addEventListener("click", () => {
            document.querySelectorAll(".palette").forEach((p) => {
                p.classList.remove("active-color");
            });
            palette.classList.add("active-color");
        });
    });
});

function nextPrev(n){
    let pages = document.querySelectorAll(".page");
    if (n == -1 && currentpage == 0){
      return;
    }
    if (n == 1 && currentpage == pages.length - 1){
      document.getElementById('loadScreen').innerHTML="<div class=\"spinner-border text-primary\" role=\"status\"><span class=\"sr-only\"></span></div>";
      document.getElementById('loadText').innerHTML="Loading Solution";
      submitSolution();
      return;
    }
    if (n == -1 && currentpage == pages.length - 1){
      document.querySelector("#nextBtn").innerHTML = "Next";
    }
    for(let page of pages) {
        page.classList.add("hide");
    }
    currentpage+=n;
    pages[currentpage].classList.remove("hide");
  
    if (currentpage == pages.length - 1){
      document.querySelector("#nextBtn").innerHTML = "Submit";
    }
}

function submitSolution() {
    let form = document.createElement("form");
    form.setAttribute("method", "POST");
    form.setAttribute("action", "/input");

    let input = document.createElement("input");
    input.setAttribute("type", "text");
    input.setAttribute("name", "cube");
    let cubeString = "";

    document.querySelectorAll(".peice").forEach((peice) => {
        switch(peice.style.backgroundColor) {
            case "red":
                cubeString += "r";
                break;
            case "green":
                cubeString += "g";
                break;
            case "blue":
                cubeString += "b";
                break;
            case "orange":
                cubeString += "o";
                break;
            case "white":
                cubeString += "w";
                break;
            case "yellow":
                cubeString += "y";
                break;
            default:
                cubeString += "a";
                break;
        }
    });
    input.setAttribute("value", cubeString);
    form.appendChild(input);
    document.body.appendChild(form);
    // console.log(input.value)
    form.submit()
}

