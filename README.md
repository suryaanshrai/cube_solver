# Cube-Solver Version2
#### Video Demo: https://youtu.be/bTjkN2u0OyQ
#### In use: https://youtu.be/9vHTXn2J1tw
#### Live at: [https://gg-cubesolver.onrender.com/](https://suryaanshrai.pythonanywhere.com/)
#### Description:
The Cube-Solver web application allows users to quickly solve a rubik's cube using the Kociemba algorithm.
Following is the description of the project, its files, and some design choices.

## Differences in this and previous version:
- Input is now taken from a single route and a single form
- Better input interface
- Added instructions page

## app.py
#### **import kociemba**
For the solving algorithm I chose to go with an external package instead of making an algorithm of my own as not only it would have been quite
difficult but the algorithm would not have been as efficient as this. This package has just one function, solve(), which takes a string that denotes a valid cube as per the package's documentation and returns a list of moves that would solve the algorithm.

#### **convert(x):**
The function takes in the solution of a cube as a list and converts those strings which contains an inverted comma or a 2 (example F' and U2). These moves are converted to other small letters as denoted in the dictionary inside the function itself.

#### **convertCube(cube):**
The Kociemba package takes the input not as colors but as sides (upper side, front side, etc. and not red, blue or yellow). Thus, the colors need to notated in a fixed manner. This function converts the cube into the notation as required by the kociemba package. It is worth telling that initially I was using another package called **rubik-solver**, which used to take input as colors (i.e. 'Y', 'U', etc.) but it had some compatibilty issues with python 3.10 (as the package was developed in 3.7). The fix was an easy one (by renaming the modules mapping.abc as mapping and iterator.abc as iterator) but I chose to go on and switch the package as the kociemba package was more tested, maintained and generally used. A fixed cube notation (fixing yellow on top and red in front) may seem like a drawback as it won't allow cubes with non-standard coloring, but fixing the sides would make things much easier for the user's experience. Moreover, most cubes seem to have similar coloring.

#### **input route**
This route manages the user input. Each side received as input so far is concatenated into one string. Note that the final cube string is concatenated in a certain way (syellow + sgreen + sred + swhite + sblue + sorange). It is so because the kociemba.solve() function takes the cube mapped in a certain way described in its documentation. This is also the step where a wrong user input might be encountered, mostly probably the user might have missed to follow the instruction and have given the input string in a wrong orientation of the cube. Example: The user would've entered the colors with the blue side in front and the red side not on top. In such cases, an error message will be returned and the user will have to input the cube again. Once the solution is processed, it is returned to the user through a solution page.


## Templates

#### **apology.html**
This file is use only in case the user enters a cube such that the kociemba.solve() function returns any error.

#### **index.html**
Html for the homepage. Contains a cube gif and a greeting message.

#### **input.html**
Page for taking cube input from the user.

#### **instruction.html**
Contains instructions for inputting and solving the cube, in case the UI is not understanble enough for the user.

#### **layout.html**
The standard template for the webapp, this html has the logo on top and the alignment of the body in the middle.

#### **solution.html**
Provides the user with the solution for the unsolved cube and instructions on how to apply them. Also contains script for the left and right buttons, which increment or decrement the move when clicked and also keep the count of the moves left.


## static
#### Contains all the media and a style sheet to be used in the app.

#### input.js
Contains javascript code to implement multi step forms, progress buttons and check side at the input page.

## requirements.txt
#### Contains a list of all the required packages for the app to run.
