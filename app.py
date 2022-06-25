from flask import Flask, redirect, render_template, request
import cv2 as cv

# The rubik_package is based on an older version of python. The following lines avoid any errors arising from that. 
import collections.abc
collections.Iterable = collections.abc.Iterable
collections.Mapping = collections.abc.Mapping
collections.MutableSet = collections.abc.MutableSet
collections.MutableMapping = collections.abc.MutableMapping

from rubik_solver import utils

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
        

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/inyellow", methods=["GET", "POST"])
def inyellow():
    if request.method == "POST":
        if not request.form.get("yellow") and not request.form.get("syellow"):
            return apology("Atleast one input is required out of image and text")
        if request.form.get("yellow"):
            global yellow
            yellow = cv.imread(request.form.get("yellow"))
        else:
            global syellow
            syellow = request.form.get("syellow").strip()
            if len(syellow) != 9:
                return apology("Not all colors were filled, try submitting again")
            for i in syellow:
                if i not in ['w','W','y','Y','r','R','o','O','b','B','g','G']:
                    return apology("Some colors were not correct, try submitting again")
        return redirect("/inblue")
    return render_template("inyellow.html")


@app.route("/inblue", methods=["GET", "POST"])
def inblue():
    if request.method == "POST":
        if not request.form.get("blue") and not request.form.get("sblue"):
            return apology("Atleast one input is required out of image and text")
        if request.form.get("blue"):
            global blue
            blue = cv.imread(request.form.get("blue"))
        else:
            global sblue
            sblue = request.form.get("sblue").strip()
            if len(sblue) != 9:
                return apology("Not all colors were filled, try submitting again")
            for i in sblue:
                if i not in ['w','W','y','Y','r','R','o','O','b','B','g','G']:
                    return apology("Some colors were not correct, try submitting again")
        return redirect("/inred")
    return render_template("inblue.html")


@app.route("/inred", methods=["GET", "POST"])
def inred():
    if request.method == "POST":
        if not request.form.get("red") and not request.form.get("sred"):
            return apology("Atleast one input is required out of image and text")
        if request.form.get("red"):
            global red
            red = cv.imread(request.form.get("red"))
        else:
            global sred
            sred = request.form.get("sred").strip()
            if len(sred) != 9:
                return apology("Not all colors were filled, try submitting again")
            for i in sred:
                if i not in ['w','W','y','Y','r','R','o','O','b','B','g','G']:
                    return apology("Some colors were not correct, try submitting again")
        return redirect("/ingreen")
    return render_template("inred.html")


@app.route("/ingreen", methods=["GET", "POST"])
def ingreen():
    if request.method == "POST":
        if not request.form.get("green") and not request.form.get("sgreen"):
            return apology("Atleast one input is required out of image and text")
        if request.form.get("green"):
            global green
            green = cv.imread(request.form.get("green"))
        else:
            global sgreen
            sgreen = request.form.get("sgreen").strip()
            if len(sgreen) != 9:
                return apology("Not all colors were filled, try submitting again")
            for i in sgreen:
                if i not in ['w','W','y','Y','r','R','o','O','b','B','g','G']:
                    return apology("Some colors were not correct, try submitting again")
        return redirect("/inorange")
    return render_template("ingreen.html")


@app.route("/inorange", methods=["GET", "POST"])
def inorange():
    if request.method == "POST":
        if not request.form.get("orange") and not request.form.get("sorange"):
            return apology("Atleast one input is required out of image and text")
        if request.form.get("orange"):
            global orange
            orange = cv.imread(request.form.get("orange"))
        else:
            global sorange
            sorange = request.form.get("sorange").strip()
            if len(sorange) != 9:
                return apology("Not all colors were filled, try submitting again")
            for i in sorange:
                if i not in ['w','W','y','Y','r','R','o','O','b','B','g','G']:
                    return apology("Some colors were not correct, try submitting again")
        return redirect("/inwhite")
    return render_template("inorange.html")


@app.route("/inwhite", methods=["GET", "POST"])
def inwhite():
    if request.method == "POST":
        if not request.form.get("white") and not request.form.get("swhite"):
            return apology("Atleast one input is required out of image and text")
        if request.form.get("white"):
            global white
            white = cv.imread(request.form.get("white"))
        else:
            global swhite
            swhite = request.form.get("swhite").strip()
            if len(swhite) != 9:
                return apology("Not all colors were filled, try submitting again")
            for i in swhite:
                if i not in ['w','W','y','Y','r','R','o','O','b','B','g','G']:
                    return apology("Some colors were not correct, try submitting again")
        return redirect("/solution")
    return render_template("inwhite.html")

@app.route("/solution", methods=["GET", "POST"])
def solution():
    try:
        cube = syellow + sblue + sred + sgreen + sorange + swhite
    except:
        return apology("Input Error. Try inputing the cube again.")
    soln = utils.solve(cube, 'Kociemba')
    solnString = ""
    for i in soln:
        solnString += str(convert(str(i)))
    return render_template("solution.html", soln=solnString, len=len(soln), first=str(soln[0]))

    """
    wgyoybwgo
    ryowbwbrb
    goworgoyo
    bobygwgyg
    rwgborrrw
    ybybwrrgy
    """