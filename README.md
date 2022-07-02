# Cube-Solver
#### Video Demo: https://youtu.be/bTjkN2u0OyQ
#### In use: https://youtu.be/9vHTXn2J1tw
#### Description:
The Cube-Solver web application allows users to quickly solve a rubik's cube using the Kociemba algorithm.
Following is the description of the project, its files, and some design choices.

## app.py
#### **import kociemba**
For the solving algorithm I chose to go with an external package instead of making an algorithm of my own as not only it would have been quite
difficult but the algorithm would not have been as efficient as this. This package has just one function, solve(), which takes a string that denotes a valid cube as per the package's documentation and returns a list of moves that would solve the algorithm.

#### **convert(x):**
The function takes in the solution of a cube as a list and converts those strings which contains an inverted comma or a 2 (example F' and U2). These moves are converted to other small letters as denoted in the dictionary inside the function itself.

#### **convertCube(cube):**
The Kociemba package takes the input not as colors but as sides (upper side, front side, etc. and not red, blue or yellow). Thus, the colors need to notated in a fixed manner. This function converts the cube into the notation as required by the kociemba package. It is worth telling that initially I was using another package called **rubik-solver**, which used to take input as colors (i.e. 'Y', 'U', etc.) but it had some compatibilty issues with python 3.10 (as the package was developed in 3.7). The fix was an easy one (by renaming the modules mapping.abc as mapping and iterator.abc as iterator) but I chose to go on and switch the package as the kociemba package was more tested, maintained and generally used. A fixed cube notation (fixing yellow on top and red in front) may seem like a drawback as it won't allow cubes with non-standard coloring, but fixing the sides would make things much easier for the user's experience. Moreover, most cubes seem to have similar coloring.

#### **/input routes**
All the routes with an 'in' followed by a color name are routes to input each side as a string. In case the given string is syntactically incorrect, an apology page with the appropriate message is returned.
#### Why take multiple routes?
Taking a form for each side may not sound the best idea for inputing the cube, however, if we take a single form for the entire cube with six input elements and a check feature for each side, the interface might not remain as tidy as it might be in the beginning. Another idea might be to implement an actual cube map for the check button which shows the mapping of the puzzle entered by the user. But for someone who is not familiar with cube mapping it might get overwhelming. The idea of the project is to get the cube solved, keeping the interface as simple as possible (at my skill levels).

#### **/solution route**
Each side received as input so far is concatenated into one string. Note that the final cube string is concatenated in a certain way (syellow + sgreen + sred + swhite + sblue + sorange). It is so because the kociemba.solve() function takes the cube mapped in a certain way described in its documentation. This is also the step where a wrong user input might be encountered, mostly probably the user might have missed to follow the instruction and have given the input string in a wrong orientation of the cube. Example: The user would've entered the colors with the blue side in front and the red side not on top. In such cases, an error message will be returned and the user will have to input the cube again.

## Templates

#### **layout.html**
The standard template for the webapp, this html has the logo on top and the alignment of the body in the middle.

#### **index.html**
Html for the homepage. Contains a cube gif and a greeting message.

#### **apology.html**
Contains the error screen for the app with a duck and a message in it.

#### **apologyToHome.html**
This file is use only in case the user enters a cube such that the kociemba.solve() function returns any error.

#### **solution.html**
Provides the user with the solution for the unsolved cube and instructions on how to apply them. Also contains script for the left and right buttons, which increment or decrement the move when clicked and also keep the count of the moves left.

#### **inputLayout.html**
Contains template for the input page, which is nothing but the script for the check side feature.

#### **input colors**
The files with beginning with an "in" followed by a colorname.html contain the form for each color. Only **inwhite.html** varies from the others as it is the last color to be inputted. Hence, instead of next color, the submit button says "Solve" and a rotating ring appears when it is clicked (marking the loading process if the solution takes a lot of time to get processed so that the screen does not looks stuck.)

## static
#### Contains all the media and a style sheet to be used in the app.

## requirements.txt
#### Contains a list of all the required packages for the app to run.