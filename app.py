from flask import Flask, redirect, render_template, request
import kociemba

app = Flask(__name__)

def apology(message):
    return render_template("apology.html", message=message)


def convert(x):
    cmoves = {
            "F":"F", "B":"B", "L":"L", "R":"R","U":"U", "D":"D",
            "F\'":"f","B\'":"b", "L\'":"l", "R\'":"r", "U\'":"u", "D\'":"d",
            "F2":"g", "B2":"c", "L2":"m", "R2":"s", "U2":"v", "D2":"e"
            }
    return cmoves[x]

def convertCube(cube):
    cube = cube.upper()
    converted = ""
    cube_map = {"Y":"U", "B":"L", "R":"F", "G":"R", "O":"B", "W":"D"}
    for i in cube:
        converted += cube_map[i]
    return converted

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/input_old", methods=["GET", "POST"])
def input_old():
    if request.method == "POST":
        try:
            yellow = str(request.form.get("yellow"))
            green = str(request.form.get("green"))
            red = str(request.form.get("red"))
            white = str(request.form.get("white"))
            blue = str(request.form.get("blue"))
            orange = str(request.form.get("orange"))

            cube = yellow + green + red + white + blue + orange
            cube = convertCube(cube)
            soln = kociemba.solve(cube).split()
        except:
            return apology("Input Error. Try inputing the cube again.")
        solnString = ""
        for i in soln:
            solnString += str(convert(str(i)))
        return render_template("solution.html", soln=solnString, len=len(soln), first=str(soln[0]))
    return render_template("input.html")

@app.route("/input", methods=["GET", "POST"])
def input():
    if request.method == "POST":
        try:
            cube = request.form.get("cube")
            cube = convertCube(cube)
            soln = kociemba.solve(cube).split()
        except:
            return render_template("input_v2.html", message="Input error. Please verify your input", cube=request.form.get("cube"))
        solnString = ""
        for i in soln:
            solnString += str(convert(str(i)))
        return render_template("solution.html", soln=solnString, len=len(soln), first=str(soln[0]))
    return render_template("input_v2.html")

@app.route("/instructions")
def instructions():
    return render_template("instruction.html")

@app.route("/testcases")
def testcases():
    return render_template("testcases.html")